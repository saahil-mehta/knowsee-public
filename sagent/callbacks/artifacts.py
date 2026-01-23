"""Artifact injection callback for multimodal content handling."""

import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.llm_agent import LlmRequest
from google.genai import types

logger = logging.getLogger(__name__)


async def inject_artifact_content(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
) -> types.Content | None:
    """Inject binary artifact content into LLM context before model call.

    This callback implements the ADK multimodal pattern from the codelab:
    1. Tool (read_file) returns tool_response_artifact_id for binary files
    2. This callback detects those responses and loads the actual artifact
    3. The artifact Part is injected into the context so the LLM can see it

    This approach is efficient because:
    - Only artifacts explicitly requested via read_file are loaded
    - The LLM decides when to invoke read_file (not every request)
    - Binary content reaches the model's vision system correctly

    Args:
        callback_context: ADK callback context with artifact access.
        llm_request: The LLM request about to be sent.

    Returns:
        None - we modify llm_request.contents in place.
    """
    if not llm_request.contents:
        return None

    # Track which artifacts we've already injected to avoid duplicates
    injected_artifacts = set()

    for content in llm_request.contents:
        if not content.parts:
            continue

        parts_to_add = []

        for part in content.parts:
            # Check for function_response parts with artifact IDs
            if not part.function_response:
                continue

            response = part.function_response.response
            if not isinstance(response, dict):
                continue

            artifact_id = response.get("tool_response_artifact_id")
            if not artifact_id or artifact_id in injected_artifacts:
                continue

            # Load and inject the artifact
            try:
                artifact = await callback_context.load_artifact(filename=artifact_id)
                if artifact and artifact.inline_data:
                    parts_to_add.append(artifact)
                    injected_artifacts.add(artifact_id)
                    logger.debug(f"Injected artifact: {artifact_id}")
                else:
                    logger.warning(f"Artifact {artifact_id} has no inline_data")
            except Exception as e:
                logger.warning(f"Failed to load artifact {artifact_id}: {e}")

        # Append artifact parts to this content
        if parts_to_add:
            content.parts.extend(parts_to_add)

    if injected_artifacts:
        logger.info(f"Injected {len(injected_artifacts)} artifact(s) into LLM context")

    return None
