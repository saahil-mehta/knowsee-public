"""FastAPI server exposing the Knowsee agent via AG-UI protocol.

This server wraps the ADK agent with the AG-UI adapter, enabling integration
with CopilotKit and other AG-UI compatible frontends.

Usage:
    uv run uvicorn main:app --reload --port 8000
    # or
    python main.py

Environment variables for logging:
    LOG_LEVEL: Set logging verbosity (DEBUG, INFO, WARNING, ERROR). Default: INFO
    ADK_LOG_LEVEL: Override log level for ADK internals specifically. Default: uses LOG_LEVEL
"""

# Configure logging before any ADK imports to capture all initialisation logs
from logging_config import configure_logging, get_logging_status

configure_logging()

# Apply monkey patches before importing patched modules
# This must happen BEFORE ag_ui_adk is imported
import json
import logging
import os
from pathlib import Path

from ag_ui.core import RunAgentInput
from ag_ui_adk import ADKAgent, add_adk_fastapi_endpoint
from dotenv import load_dotenv
from fastapi import FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from google.adk.artifacts import GcsArtifactService, InMemoryArtifactService
from google.adk.sessions import DatabaseSessionService
from google.genai import types

import patches  # noqa: F401 - side effect import applies thought tag patch
from agent import root_agent
from converters import convert_file, needs_conversion
from converters.base import ConversionError
from services.events import event_bus
from services.titles import get_titles_bulk
from utils.semantic_tags import (
    THOUGHT_TAG_CLOSE,
    THOUGHT_TAG_OPEN,
    TOOL_RESULT_TAG_CLOSE,
    TOOL_RESULT_TAG_OPEN,
    TOOL_TAG_CLOSE,
    TOOL_TAG_OPEN,
)
from utils.upload_limits import (
    MAX_FILE_SIZE_BYTES,
    MAX_FILES,
    get_supported_types_list,
    is_supported_mime_type,
)


def extract_user_id(input_data: RunAgentInput) -> str:
    """Extract user ID from AG-UI state headers.

    The x-user-id header is:
    1. Set by CopilotKitProvider from Better Auth session (user email)
    2. Forwarded by CopilotKit runtime to ADK backend
    3. Extracted into state.headers.user_id by add_adk_fastapi_endpoint

    Raises:
        ValueError: If user_id is missing. All sessions must be authenticated.
    """
    if isinstance(input_data.state, dict):
        headers = input_data.state.get("headers", {})
        if isinstance(headers, dict):
            user_id = headers.get("user_id")
            if user_id:
                # Normalise to lowercase for case-insensitive matching
                # across auth providers and team membership lookups
                user_id = user_id.strip().lower()
                logging.debug(
                    f"[extract_user_id] authenticated request: user_id={user_id}, "
                    f"thread_id={input_data.thread_id}"
                )
                return user_id

    # No silent fallback - auth is required
    # Log available state for debugging auth flow issues
    available_headers = {}
    if isinstance(input_data.state, dict):
        available_headers = input_data.state.get("headers", {})

    logging.error(
        f"[extract_user_id] Missing user_id in state. "
        f"thread_id={input_data.thread_id}, "
        f"available_headers={list(available_headers.keys()) if available_headers else 'none'}. "
        "Check that Better Auth session is valid and CopilotKit is forwarding x-user-id header."
    )
    raise ValueError(
        "Authentication required: x-user-id header missing. "
        "Ensure user is logged in and page is fully loaded before using chat."
    )


# Load environment variables
# .env.development is committed (defaults), .env.local is gitignored (local overrides)
ENV_DIR = Path(__file__).parent
load_dotenv(ENV_DIR / ".env.development")  # Committed defaults
load_dotenv(ENV_DIR / ".env.local", override=True)  # Local overrides (if exists)


def get_database_url() -> str:
    """Get database URL from environment.

    Both development and production use PostgreSQL:
    - Development: Local Postgres via Docker (make db-up)
    - Production: Cloud SQL PostgreSQL
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        raise ValueError(
            "DATABASE_URL environment variable is required. "
            "Run 'make db-up' to start local Postgres."
        )
    logging.info("Using PostgreSQL for session storage")
    return db_url


def create_session_service() -> DatabaseSessionService:
    """Create session service with error handling for Cloud Run startup.

    Cloud Run may start the container before Cloud SQL is fully ready.
    Connection errors are logged but allowed to propagate - the health check
    will fail and Cloud Run will retry container startup.
    """
    db_url = get_database_url()
    return DatabaseSessionService(db_url=db_url)


# Create persistent session service
session_service = create_session_service()


def create_artifact_service():
    """Create artifact service based on environment.

    Development: InMemoryArtifactService (fast, no GCP dependency, resets on restart)
    Production: GcsArtifactService (persistent, versioned, scalable)
    """
    env = os.getenv("ENVIRONMENT", "development")

    if env == "production":
        bucket = os.getenv("ARTIFACT_BUCKET", "knowsee-artifacts-prod")
        logging.info(f"Using GcsArtifactService with bucket: {bucket}")
        return GcsArtifactService(bucket_name=bucket)
    else:
        logging.info("Using InMemoryArtifactService for development")
        return InMemoryArtifactService()


# Create artifact service for file attachments
artifact_service = create_artifact_service()

# Create FastAPI application
app = FastAPI(
    title="Knowsee Agent API",
    description="Enterprise knowledge assistant powered by ADK and AG-UI",
    version="0.1.0",
)


# Configure CORS based on environment
# With BFF pattern, browser never talks directly to backend, but CORS is still
# useful for development (curl/Postman) and edge cases.
def get_cors_origins() -> list[str]:
    """Get allowed CORS origins based on environment."""
    # Check for explicit CORS origins from environment
    cors_origins = os.getenv("CORS_ORIGINS")
    if cors_origins:
        return [origin.strip() for origin in cors_origins.split(",")]

    # Default to localhost for development
    return [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]


app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Wrap the ADK agent with AG-UI adapter
# session_timeout_seconds: Sessions expire after this many seconds of inactivity.
# Set to 10 years (315360000s) to effectively disable automatic cleanup.
# The DatabaseSessionService persists data to SQLite; this timeout controls
# when the SessionManager's cleanup loop removes inactive sessions.
adk_agent = ADKAgent(
    adk_agent=root_agent,
    user_id_extractor=extract_user_id,  # Dynamic user ID from x-user-id header
    session_service=session_service,
    artifact_service=artifact_service,  # Enable file attachments
    session_timeout_seconds=315360000,  # 10 years - never expire
)

# Register the AG-UI endpoint at root path
# extract_headers pulls x-user-id from HTTP headers into state.headers.user_id
add_adk_fastapi_endpoint(app, adk_agent, path="/", extract_headers=["x-user-id"])


# Constants for session management
APP_NAME = root_agent.name  # ADK uses agent name as app_name


@app.get("/health")
async def health_check():
    """Health check endpoint for container orchestration."""
    return {"status": "healthy", "agent": root_agent.name}


@app.get("/api/upload/config")
async def upload_config():
    """Return upload constraints for frontend validation.

    This is the single source of truth - frontend fetches this
    instead of duplicating the constants.
    """
    return {
        "supported_types": get_supported_types_list(),
        "max_file_size_bytes": MAX_FILE_SIZE_BYTES,
        "max_files": MAX_FILES,
    }


@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Header(..., alias="x-session-id"),
    user_id: str = Header(..., alias="x-user-id"),
):
    """Upload a file as an ADK artifact for use in chat.

    Files are stored using ADK's artifact service and can be referenced
    in subsequent messages. The agent's before_model_callback loads
    pending attachments into the LLM context.

    Args:
        file: The uploaded file (multipart/form-data)
        session_id: Current chat session ID (from header)
        user_id: User identifier (from header, set by auth)

    Returns:
        Artifact metadata including filename, version, and MIME type

    Raises:
        HTTPException 415: Unsupported file type
        HTTPException 413: File too large
        HTTPException 500: Storage error
    """
    # Validate MIME type
    content_type = file.content_type or "application/octet-stream"
    if not is_supported_mime_type(content_type):
        raise HTTPException(
            status_code=415,
            detail={
                "error": "unsupported_file_type",
                "message": f"File type '{content_type}' is not supported",
                "supported_types": get_supported_types_list(),
            },
        )

    # Read file content
    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={
                "error": "file_too_large",
                "message": f"File size ({len(file_bytes)} bytes) exceeds limit ({MAX_FILE_SIZE_BYTES} bytes)",
                "max_size_bytes": MAX_FILE_SIZE_BYTES,
            },
        )

    # Convert non-native formats to Markdown
    filename = file.filename or "upload"
    if needs_conversion(content_type):
        try:
            result = convert_file(file_bytes, content_type, filename)
            file_bytes = result.content
            content_type = result.mime_type
            filename = result.filename
            logger.info(f"Converted {file.filename} to {filename} ({content_type})")
        except ConversionError as e:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": "conversion_failed",
                    "message": f"Failed to convert file: {e}",
                },
            ) from e

    # Create artifact Part
    artifact = types.Part.from_bytes(data=file_bytes, mime_type=content_type)

    try:
        # Save artifact using ADK artifact service
        # Path structure: {app_name}/{user_id}/{session_id}/{filename}_v{N}
        version = await artifact_service.save_artifact(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
            filename=filename,
            artifact=artifact,
        )

        logging.info(
            f"Saved artifact: {filename} v{version} for session {session_id}, "
            f"user_id: {user_id}, app_name: {APP_NAME}"
        )

        return {
            "filename": filename,
            "original_filename": file.filename,
            "version": version,
            "mime_type": content_type,
            "size_bytes": len(file_bytes),
        }

    except Exception as e:
        logging.exception(f"Failed to save artifact {file.filename}: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error": "storage_error",
                "message": "Failed to store file",
            },
        ) from e


@app.get("/api/events")
async def sse_events():
    """SSE endpoint for real-time updates.

    Clients connect here to receive live updates about:
    - Title generation (when a session gets its title)
    - Future: session deletions, agent status, etc.

    Usage (JavaScript):
        const eventSource = new EventSource('/api/events');
        eventSource.addEventListener('title_generated', (e) => {
            const { session_id, title } = JSON.parse(e.data);
            // Update sidebar
        });
    """

    async def event_stream():
        async for event in event_bus.subscribe():
            yield event.to_sse()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        },
    )


@app.get("/api/sessions")
async def list_sessions(user_id: str):
    """List all chat sessions for a user."""
    try:
        response = await session_service.list_sessions(
            app_name=APP_NAME,
            user_id=user_id,
        )

        # Get all session IDs and fetch titles in bulk
        session_ids = [s.id for s in response.sessions]
        titles = get_titles_bulk(session_ids)

        sessions = []
        for session in response.sessions:
            # Use title from database, fall back to "New conversation"
            title = titles.get(session.id, "New conversation")

            sessions.append(
                {
                    "id": session.id,
                    "title": title,
                    "lastUpdated": session.last_update_time,
                }
            )

        # Sort by last updated, newest first
        sessions.sort(key=lambda s: s["lastUpdated"], reverse=True)
        return {"sessions": sessions}
    except Exception as e:
        return {"sessions": [], "error": str(e)}


@app.get("/api/sessions/{session_id}")
async def get_session(session_id: str, user_id: str):
    """Get details of a specific session including messages.

    Parts within each event are concatenated into a single message.
    Structured content is wrapped in semantic tags for frontend rendering:
    - Thought parts: <llm:adk:soch>...</llm:adk:soch>
    - Tool calls: <llm:adk:tool name="..." id="...">args</llm:adk:tool>
    - Tool results: <llm:adk:tool-result id="...">result</llm:adk:tool-result>
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        if not session:
            return {"error": "Session not found"}

        # Collect tool results separately for merging with their calls
        pending_tool_results: dict[str, str] = {}  # tool_id -> result_json

        # First pass: collect all tool results
        for event in session.events:
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, "function_response") and part.function_response:
                        fr = part.function_response
                        result_id = getattr(fr, "id", "")
                        response = fr.response if hasattr(fr, "response") else None
                        result_json = json.dumps(response) if response else "{}"
                        if result_id:
                            pending_tool_results[result_id] = result_json

        # Second pass: build messages grouped by invocation_id
        # Uses event.author (not event.content.role) to correctly group tool results
        # with assistant responses (tool results have role="user" but author=agent)
        invocation_groups: dict[str, dict] = {}  # inv_id -> {user: msg, assistant: msg}
        invocation_order: list[str] = []  # Track insertion order for final output

        for event in session.events:
            if not (event.content and event.content.parts):
                continue

            inv_id = getattr(event, "invocation_id", None) or "unknown"
            author = getattr(event, "author", "")
            is_user_authored = author == "user"

            # Track invocation order
            if inv_id not in invocation_groups:
                invocation_groups[inv_id] = {"user": None, "assistant": None}
                invocation_order.append(inv_id)

            # Build content for this event
            text_parts = []
            has_displayable_content = False

            for part in event.content.parts:
                # Text content (with thought flag check)
                if hasattr(part, "text") and part.text:
                    has_displayable_content = True
                    if getattr(part, "thought", False):
                        text_parts.append(
                            f"{THOUGHT_TAG_OPEN}{part.text}{THOUGHT_TAG_CLOSE}"
                        )
                    else:
                        text_parts.append(part.text)

                # Function call (tool invocation) - merge result inline
                if hasattr(part, "function_call") and part.function_call:
                    has_displayable_content = True
                    fc = part.function_call
                    tool_name = getattr(fc, "name", "unknown")
                    tool_id = getattr(fc, "id", "")
                    args = fc.args if hasattr(fc, "args") and fc.args else {}
                    args_json = json.dumps(dict(args)) if args else "{}"
                    text_parts.append(
                        f"{TOOL_TAG_OPEN.format(name=tool_name, id=tool_id)}"
                        f"{args_json}{TOOL_TAG_CLOSE}"
                    )
                    # Merge the result directly after the call
                    if tool_id and tool_id in pending_tool_results:
                        text_parts.append(
                            f"{TOOL_RESULT_TAG_OPEN.format(id=tool_id)}"
                            f"{pending_tool_results[tool_id]}{TOOL_RESULT_TAG_CLOSE}"
                        )

                # Skip standalone function_response - already merged above

            combined_text = "".join(text_parts)
            if not (combined_text and has_displayable_content):
                continue

            # Group by invocation_id and author type
            msg_key = "user" if is_user_authored else "assistant"
            role = "user" if is_user_authored else "model"

            if invocation_groups[inv_id][msg_key] is None:
                invocation_groups[inv_id][msg_key] = {
                    "role": role,
                    "content": combined_text,
                    "timestamp": getattr(event, "timestamp", None),
                    "invocationId": inv_id,
                }
            else:
                # Append to existing message in same invocation
                invocation_groups[inv_id][msg_key]["content"] += combined_text
                invocation_groups[inv_id][msg_key]["timestamp"] = getattr(
                    event, "timestamp", None
                )

        # Flatten to list maintaining chronological order
        merged_messages = []
        for inv_id in invocation_order:
            group = invocation_groups[inv_id]
            if group["user"]:
                merged_messages.append(group["user"])
            if group["assistant"]:
                merged_messages.append(group["assistant"])

        return {
            "id": session.id,
            "messages": merged_messages,
            "lastUpdated": session.last_update_time,
        }
    except Exception as e:
        return {"error": str(e)}


@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str, user_id: str):
    """Delete a specific session (ADK cascades deletion to events and state)."""
    try:
        await session_service.delete_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ============================================================================
# INTERNAL ENDPOINTS - Called by Cloud Scheduler or admin tools
# ============================================================================


@app.post("/api/internal/sync")
async def internal_sync(trigger: dict | None = None):
    """Sync all RAG corpora from their source folders.

    Called by:
    - Cloud Scheduler (every 15 min) with {"trigger": "scheduled"}
    - Manual trigger via `make rag-sync` with {"trigger": "manual"}

    This endpoint:
    1. Reads all corpora from team_corpora table
    2. Calls rag.import_files() for each corpus
    3. Updates last_sync_at and last_sync_status in database

    Returns:
        Summary of sync results for all corpora.
    """
    from services.rag import sync_service

    trigger_type = trigger.get("trigger", "unknown") if trigger else "unknown"
    logging.info(f"RAG sync triggered: {trigger_type}")

    try:
        result = await sync_service.sync_all()

        return {
            "success": True,
            "trigger": trigger_type,
            "summary": {
                "total": result.total,
                "succeeded": result.succeeded,
                "failed": result.failed,
                "duration_seconds": round(result.duration_seconds, 2),
            },
            "results": [
                {
                    "team_id": r.team_id,
                    "status": r.status.value,
                    "file_count": r.file_count,
                    "error": r.error,
                    "duration_seconds": round(r.duration_seconds, 2)
                    if r.duration_seconds
                    else None,
                }
                for r in result.results
            ],
        }
    except Exception as e:
        logging.exception("RAG sync failed")
        return {
            "success": False,
            "trigger": trigger_type,
            "error": str(e),
        }


# ============================================================================
# DEBUG ENDPOINTS - For inspecting sessions, events, and state
# ============================================================================

logger = logging.getLogger("knowsee.debug")


def serialize_event(event) -> dict:
    """Serialize an ADK event to a JSON-compatible dict."""
    result = {
        "id": getattr(event, "id", None),
        "author": getattr(event, "author", None),
        "invocation_id": getattr(event, "invocation_id", None),
        "timestamp": getattr(event, "timestamp", None),
    }

    # Serialize content
    if event.content:
        result["content"] = {
            "role": event.content.role,
            "parts": [],
        }
        for part in event.content.parts or []:
            part_data = {}
            if hasattr(part, "text") and part.text:
                part_data["text"] = part.text
            if hasattr(part, "function_call") and part.function_call:
                fc = part.function_call
                part_data["function_call"] = {
                    "name": getattr(fc, "name", None),
                    "args": dict(fc.args) if hasattr(fc, "args") and fc.args else {},
                    "id": getattr(fc, "id", None),
                }
            if hasattr(part, "function_response") and part.function_response:
                fr = part.function_response
                part_data["function_response"] = {
                    "name": getattr(fr, "name", None),
                    "response": fr.response if hasattr(fr, "response") else None,
                    "id": getattr(fr, "id", None),
                }
            if part_data:
                result["content"]["parts"].append(part_data)

    # Serialize actions (state changes, artifacts)
    if hasattr(event, "actions") and event.actions:
        actions = event.actions
        result["actions"] = {
            "state_delta": dict(actions.state_delta)
            if hasattr(actions, "state_delta") and actions.state_delta
            else {},
            "artifact_delta": dict(actions.artifact_delta)
            if hasattr(actions, "artifact_delta") and actions.artifact_delta
            else {},
        }

    return result


@app.get("/api/debug/sessions/{session_id}")
async def debug_session(session_id: str, user_id: str):
    """Get full session details including all events and state.

    This endpoint exposes the complete ADK session for debugging:
    - All events (user messages, model responses, tool calls)
    - Current session state
    - Event metadata (timestamps, invocation IDs)

    Usage:
        curl "http://localhost:8000/api/debug/sessions/{session_id}?user_id={user_id}"
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        if not session:
            return {"error": "Session not found"}

        # Serialize all events with full detail
        events = [serialize_event(event) for event in session.events]

        return {
            "id": session.id,
            "app_name": session.app_name,
            "user_id": session.user_id,
            "state": dict(session.state) if session.state else {},
            "last_update_time": session.last_update_time,
            "event_count": len(events),
            "events": events,
        }
    except Exception as e:
        logger.exception(f"Error fetching debug session {session_id}")
        return {"error": str(e)}


@app.get("/api/debug/sessions/{session_id}/events")
async def debug_session_events(
    session_id: str,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
):
    """Get paginated events for a session.

    Useful for inspecting long sessions without loading everything at once.

    Usage:
        curl "http://localhost:8000/api/debug/sessions/{session_id}/events?user_id={user_id}&limit=10"
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        if not session:
            return {"error": "Session not found"}

        total = len(session.events)
        events = [
            serialize_event(event) for event in session.events[offset : offset + limit]
        ]

        return {
            "session_id": session_id,
            "total_events": total,
            "offset": offset,
            "limit": limit,
            "events": events,
        }
    except Exception as e:
        logger.exception(f"Error fetching events for session {session_id}")
        return {"error": str(e)}


@app.get("/api/debug/sessions/{session_id}/state")
async def debug_session_state(session_id: str, user_id: str):
    """Get only the current state for a session.

    Faster than full session fetch when you only need state inspection.

    Usage:
        curl "http://localhost:8000/api/debug/sessions/{session_id}/state?user_id={user_id}"
    """
    try:
        session = await session_service.get_session(
            app_name=APP_NAME,
            user_id=user_id,
            session_id=session_id,
        )
        if not session:
            return {"error": "Session not found"}

        return {
            "session_id": session_id,
            "state": dict(session.state) if session.state else {},
        }
    except Exception as e:
        logger.exception(f"Error fetching state for session {session_id}")
        return {"error": str(e)}


@app.get("/api/debug/sessions")
async def debug_list_sessions(user_id: str):
    """List all sessions for a user with their IDs for debugging.

    Use this to discover session IDs before inspecting individual sessions.

    Usage:
        curl "http://localhost:8000/api/debug/sessions?user_id={user_id}"
    """
    try:
        response = await session_service.list_sessions(
            app_name=APP_NAME,
            user_id=user_id,
        )

        sessions = [
            {
                "id": s.id,
                "last_update_time": s.last_update_time,
            }
            for s in response.sessions
        ]

        # Sort by last updated, newest first
        sessions.sort(key=lambda s: s["last_update_time"], reverse=True)

        return {
            "user_id": user_id,
            "session_count": len(sessions),
            "sessions": sessions,
        }
    except Exception as e:
        logger.exception(f"Error listing sessions for user {user_id}")
        return {"error": str(e)}


@app.get("/api/debug/logging")
async def debug_logging_config():
    """Get current logging configuration.

    Useful for verifying log levels are set correctly.
    """
    return get_logging_status()


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    print(f"Starting Knowsee agent server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
