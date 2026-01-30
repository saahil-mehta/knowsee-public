"""User context injection callback for RAG access control.

Loads user's team memberships and accessible corpora into session state
before each model call, enabling permission-aware document retrieval.
"""

import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.llm_agent import LlmRequest
from google.genai import types

logger = logging.getLogger(__name__)


async def inject_user_context(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> types.Content | None:
    """Inject user context (teams, corpora) into session state before model call.

    This callback:
    1. Extracts user ID from session
    2. Looks up user's team memberships
    3. Retrieves corpus names for those teams
    4. Stores in session state for RAG agent to access

    The RAG agent can then use this context to query the appropriate corpora.

    Args:
        callback_context: ADK callback context with session and state access.
        llm_request: The LLM request about to be sent.

    Returns:
        None - we modify state, not the request content.
    """
    state = callback_context.state

    # Skip if we've already set up the user context
    if state.get("_user_context_loaded"):
        return None

    # Get user ID from session
    user_id = state.get("user_id")
    if not user_id and callback_context.session:
        # Try to get from session object
        user_id = callback_context.session.user_id
        state["user_id"] = user_id

    if not user_id:
        logger.debug("No user_id in session, skipping user context injection")
        return None

    try:
        # Import here to avoid circular imports
        from services.rag import corpus_registry, team_service

        # Get user's teams
        teams = team_service.get_user_teams(user_id)
        state["user_teams"] = teams

        if teams:
            # Get corpus names for those teams
            corpus_names = corpus_registry.get_corpus_names_for_teams(teams)
            state["user_corpora"] = corpus_names
            logger.debug(
                f"User {user_id} context: teams={teams}, corpora={len(corpus_names)}"
            )
        else:
            state["user_corpora"] = []
            logger.debug(f"User {user_id} has no team memberships")

        state["_user_context_loaded"] = True

    except Exception as e:
        # Don't fail the request if context loading fails
        logger.warning(f"Failed to load user context for {user_id}: {e}")
        state["user_teams"] = []
        state["user_corpora"] = []
        state["_user_context_loaded"] = True

    return None
