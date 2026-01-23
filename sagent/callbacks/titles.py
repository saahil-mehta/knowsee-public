"""Title generation callback for automatic conversation titles."""

import logging

from google.adk.agents.callback_context import CallbackContext
from google.genai import types

from services.events import EventType, event_bus
from services.titles import generate_title

logger = logging.getLogger(__name__)

TITLE_GENERATION_THRESHOLD = 3


async def auto_generate_session_title(
    callback_context: CallbackContext,
) -> types.Content | None:
    """Generate and persist a title after the 3rd message exchange.

    This callback runs after each agent response. It checks:
    1. If a title already exists (skip if so)
    2. If we have enough messages (3+ events)
    3. If conditions met, generates a title and stores it in session state.
       ADK persists session.state to the sessions table automatically.

    Args:
        callback_context: ADK callback context with session and state access.

    Returns:
        None - we never override the agent's response, just add side effects.
    """
    state = callback_context.state

    # Skip if title already exists
    if state.get("title"):
        return None

    # Increment message count (track in state since we can't access events directly)
    message_count = state.get("_message_count", 0) + 1
    state["_message_count"] = message_count

    # Only generate title after threshold
    if message_count < TITLE_GENERATION_THRESHOLD:
        logger.debug(
            f"Message count {message_count} < {TITLE_GENERATION_THRESHOLD}, skipping title generation"
        )
        return None

    # Get session ID from the invocation context
    session_id = callback_context.session.id if callback_context.session else None
    if not session_id:
        logger.warning("No session ID available, skipping title generation")
        return None

    # Get conversation history from session events
    events = callback_context.session.events if callback_context.session else []
    if not events:
        logger.warning("No events in session, skipping title generation")
        return None

    try:
        logger.info(f"Generating title for session {session_id} ({len(events)} events)")

        # Generate title from first 8 events for more context
        # This gives the model more substance to work with
        title = await generate_title(events[:8])

        if title:
            # Store in session state (ADK persists this to sessions.state automatically)
            state["title"] = title

            # Broadcast to connected clients via SSE
            await event_bus.publish(
                EventType.TITLE_GENERATED,
                {"session_id": session_id, "title": title},
            )

            logger.info(f"Generated title for session {session_id}: {title}")
        else:
            logger.warning(f"Title generation returned empty for session {session_id}")

    except Exception as e:
        # Don't fail the agent response if title generation fails
        logger.error(f"Failed to generate title for session {session_id}: {e}")

    # Return None to use the agent's original response
    return None
