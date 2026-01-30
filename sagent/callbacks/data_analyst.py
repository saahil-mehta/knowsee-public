"""Combined callbacks for the data analyst agent.

Chains multiple after_model_callback functions together to capture
both query attempts and widgets in a single pass.
"""

import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_response import LlmResponse

from callbacks.query_attempts import capture_query_attempts
from callbacks.widgets import capture_widgets

logger = logging.getLogger(__name__)


async def data_analyst_after_model_callback(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> LlmResponse | None:
    """Combined after_model_callback for data analyst agent.

    Chains query attempts and widget capture in sequence.
    Returns the modified response if any callback made changes.

    Args:
        callback_context: ADK callback context with session state access.
        llm_response: The LLM response to potentially modify.

    Returns:
        Modified LlmResponse if any callback made changes, None otherwise.
    """
    modified_response = llm_response
    any_changes = False

    # Capture query attempts first
    result = await capture_query_attempts(callback_context, modified_response)
    if result is not None:
        modified_response = result
        any_changes = True

    # Then capture widgets
    result = await capture_widgets(callback_context, modified_response)
    if result is not None:
        modified_response = result
        any_changes = True

    return modified_response if any_changes else None
