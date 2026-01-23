"""Title generation and retrieval service for chat sessions.

Handles automatic title generation using Gemini Flash-Lite.
Titles are stored in ADK's session.state['title'] and retrieved by querying
ADK's sessions table directly (single source of truth).
"""

import logging
import os

from dotenv import load_dotenv
from google import genai
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from utils.title_blocklist import is_generic_title

logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Database engine (lazy initialisation)
_engine = None
_Session = None

# ADK app name (must match root_agent.name)
ADK_APP_NAME = "knowsee_agent"


def _get_engine():
    """Get or create the database engine with production-grade pooling.

    Pool configuration:
    - pool_pre_ping: Validates connections before use (handles Cloud SQL restarts)
    - pool_size: Base connections to maintain (Cloud Run scales instances, not connections)
    - max_overflow: Additional connections under load
    - pool_recycle: Recreate connections after 30 min (Cloud SQL proxy timeout)
    """
    global _engine
    if _engine is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Run 'make db-up' to start local Postgres."
            )
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Verify connection validity before use
            pool_size=5,  # Base pool size per Cloud Run instance
            max_overflow=10,  # Allow up to 15 total connections under load
            pool_recycle=1800,  # Recreate connections every 30 minutes
        )
    return _engine


def _get_session():
    """Get a new database session."""
    global _Session
    if _Session is None:
        _Session = sessionmaker(bind=_get_engine())
    return _Session()


def get_titles_bulk(session_ids: list[str]) -> dict[str, str]:
    """Retrieve titles for multiple sessions by querying ADK's sessions table.

    Queries the JSONB state column directly from ADK's sessions table.
    Returns 'New conversation' for sessions without a title.

    Args:
        session_ids: List of session IDs to fetch titles for.

    Returns:
        Dictionary mapping session_id to title string.
    """
    if not session_ids:
        return {}

    session = _get_session()
    try:
        result = session.execute(
            text("""
                SELECT
                    id,
                    COALESCE(state->>'title', 'New conversation') as title
                FROM sessions
                WHERE app_name = :app_name
                  AND id = ANY(:session_ids)
            """),
            {"app_name": ADK_APP_NAME, "session_ids": session_ids},
        )
        return {row.id: row.title for row in result}
    finally:
        session.close()


# Title generation configuration
TITLE_MODEL = "gemini-2.0-flash-lite"
TITLE_PROMPT = """Generate a specific, descriptive title (2-3 words) for this conversation.

RULES:
- Title Case formatting
- Plain text only (NO markdown, NO asterisks, NO quotes)
- Must be SPECIFIC to this conversation's actual topic
- Must be a substantive topic
- Ignore greetings from your considerations
- NEVER use generic titles like "AI Assistance", "Help Request", "Chat Session", "General Query"
- Focus on the concrete subject matter, not that it's a conversation

EXAMPLES of good titles:
- "Python Import Errors" (for debugging import issues)
- "React Authentication Flow" (for auth implementation discussion)
- "Database Schema Design" (for DB modelling questions)
- "Kubernetes Pod Networking" (for K8s networking help)
- "Sales Report Analysis" (for data analysis requests)

EXAMPLES of bad titles (NEVER generate these):
- "AI Assistance" ❌
- "Help With Code" ❌
- "Technical Question" ❌
- "User Request" ❌
- "Chat Session" ❌
- "Functionality Inquiry" ❌
- "AI Assistant Overview" ❌

Conversation:
{conversation}

Specific title for this conversation:"""


async def generate_title(events: list) -> str:
    """Generate a short title from conversation events using Gemini Flash-Lite.

    Args:
        events: List of ADK Event objects containing the conversation.

    Returns:
        A concise title string (2-3 words, max 50 chars).
    """
    # Extract conversation text from events
    conversation_parts = []
    for event in events:
        if event.content and event.content.parts:
            role = event.content.role
            for part in event.content.parts:
                if hasattr(part, "text") and part.text:
                    # Truncate each message to 300 chars for more context
                    text_content = part.text[:300]
                    conversation_parts.append(f"{role}: {text_content}")
                    break  # Only first text part per event

    conversation = "\n".join(conversation_parts)

    logger.debug(f"Title generation input:\n{conversation}")

    # Generate title using Gemini Flash-Lite via Vertex AI
    client = genai.Client(
        vertexai=True,
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        location=os.getenv("GOOGLE_CLOUD_LOCATION"),
    )

    # Try up to 2 times if we get a generic title
    for attempt in range(2):
        response = await client.aio.models.generate_content(
            model=TITLE_MODEL,
            contents=TITLE_PROMPT.format(conversation=conversation),
        )

        # Clean up and cap the title
        title = response.text.strip()
        title = title.strip("\"'*_`#")  # Remove quotes and markdown formatting
        title = title[:50]  # Cap at 50 chars for safety

        logger.debug(f"Title generation attempt {attempt + 1}: '{title}'")

        if not is_generic_title(title):
            return title

        logger.warning(
            f"Generic title detected: '{title}', retrying with stronger prompt"
        )

    # If still generic after retries, try to extract something from the user's first message
    if conversation_parts:
        first_user_msg = next(
            (p for p in conversation_parts if p.startswith("user:")), None
        )
        if first_user_msg:
            # Take first few words of user's message as fallback
            words = first_user_msg.replace("user:", "").strip().split()[:5]
            fallback = " ".join(words).title()
            if len(fallback) > 3:
                logger.info(f"Using fallback title from user message: '{fallback}'")
                return fallback[:50]

    # Last resort - return the generated title even if generic
    return title
