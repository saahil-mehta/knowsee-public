"""Query attempts callback for capturing BigQuery execution history.

When the data_analyst_agent executes queries, each attempt (success or failure)
is tracked in session state. This callback captures that history and embeds it
in the response using semantic tags.

The frontend parses these tags to render query attempts with status indicators.
"""

import json
import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_response import LlmResponse

from utils.response_helpers import append_tag_to_response
from utils.semantic_tags import QUERIES_TAG_CLOSE, QUERIES_TAG_OPEN

logger = logging.getLogger(__name__)


async def capture_query_attempts(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> LlmResponse | None:
    """Capture query attempts from session state and embed in response.

    This callback runs after each model call on the data_analyst_agent. It:
    1. Reads query_attempts from session state
    2. Wraps in <llm:data:queries>...</llm:data:queries> tags
    3. Appends to the response content
    4. Clears the attempts for next turn

    The frontend parses this tag to render query history.

    Args:
        callback_context: ADK callback context with session state access.
        llm_response: The LLM response to potentially modify.

    Returns:
        Modified LlmResponse with queries tag appended, or None if unchanged.
    """
    # Get attempts from session state
    attempts = callback_context.state.get("query_attempts", [])

    if not attempts:
        return None

    try:
        # Create the semantic tag
        queries_json = json.dumps({"attempts": attempts}, separators=(",", ":"))
        queries_tag = f"{QUERIES_TAG_OPEN}{queries_json}{QUERIES_TAG_CLOSE}"

        if append_tag_to_response(llm_response, queries_tag):
            logger.info(
                f"Embedded {len(attempts)} query attempts in response "
                f"({sum(1 for a in attempts if a['success'])} successful)"
            )
            callback_context.state["query_attempts"] = []
            return llm_response

    except Exception as e:
        logger.warning(f"Failed to capture query attempts: {e}")

    return None
