"""Widget callback for capturing BigQuery result visualisations.

When the data_analyst_agent executes successful queries, widgets are created
with chart data and stored in session state. This callback captures those
widgets and embeds them in the response using semantic tags.

The frontend parses these tags to render interactive charts.
"""

import json
import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_response import LlmResponse

from utils.response_helpers import append_tag_to_response
from utils.semantic_tags import WIDGET_TAG_CLOSE, WIDGET_TAG_OPEN

logger = logging.getLogger(__name__)


async def capture_widgets(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> LlmResponse | None:
    """Capture pending widgets from session state and embed in response.

    This callback runs after each model call on the data_analyst_agent. It:
    1. Reads pending_widgets from session state
    2. Wraps each widget in <llm:data:widget>...</llm:data:widget> tags
    3. Appends to the response content
    4. Clears the pending widgets for next turn

    The frontend parses these tags to render charts.

    Args:
        callback_context: ADK callback context with session state access.
        llm_response: The LLM response to potentially modify.

    Returns:
        Modified LlmResponse with widget tags appended, or None if unchanged.
    """
    # Get pending widgets from session state
    widgets = callback_context.state.get("pending_widgets", [])

    if not widgets:
        return None

    try:
        # Create semantic tags for each widget
        widget_tags = []
        for widget in widgets:
            widget_json = json.dumps(widget, separators=(",", ":"))
            widget_tags.append(f"{WIDGET_TAG_OPEN}{widget_json}{WIDGET_TAG_CLOSE}")

        combined_tags = "\n".join(widget_tags)

        if append_tag_to_response(llm_response, combined_tags):
            logger.info(f"Embedded {len(widgets)} widgets in response")
            callback_context.state["pending_widgets"] = []
            return llm_response

    except Exception as e:
        logger.warning(f"Failed to capture widgets: {e}")

    return None
