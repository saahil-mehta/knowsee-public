"""Grounding metadata callback for capturing Google Search citations.

When the search_agent uses google_search, Gemini returns grounding_metadata
containing source URLs and text segment mappings. This callback captures
that metadata and embeds it in the response using semantic tags.

The frontend parses these tags to render the Sources section with verified links.
"""

import json
import logging

from google.adk.agents.callback_context import CallbackContext
from google.adk.models.llm_response import LlmResponse
from google.genai import types

from utils.response_helpers import append_tag_to_response
from utils.semantic_tags import SOURCES_TAG_CLOSE, SOURCES_TAG_OPEN

logger = logging.getLogger(__name__)


def _serialize_grounding_metadata(metadata: types.GroundingMetadata) -> dict:
    """Convert GroundingMetadata to a JSON-serializable dict.

    Extracts fields for frontend rendering:
    - queries: Search queries used by the model
    - sources: List of {title, uri, domain} from groundingChunks

    Args:
        metadata: The GroundingMetadata from Gemini's response.

    Returns:
        A serializable dict with queries and sources.
    """
    sources = []
    for chunk in metadata.grounding_chunks or []:
        if chunk.web:
            sources.append(
                {
                    "title": chunk.web.title,
                    "uri": chunk.web.uri,
                    "domain": getattr(chunk.web, "domain", None),
                }
            )

    queries = list(metadata.web_search_queries or [])

    return {
        "queries": queries,
        "sources": sources,
    }


async def capture_grounding_metadata(
    callback_context: CallbackContext,
    llm_response: LlmResponse,
) -> LlmResponse | None:
    """Capture grounding metadata and embed in response as semantic tag.

    This callback runs after each model call on the search_agent. When
    grounding_metadata is present (from google_search), it:
    1. Serializes the sources
    2. Wraps in <llm:adk:sources>...</llm:adk:sources> tags
    3. Appends to the response content

    The frontend parses this tag to render the Sources section.

    Args:
        callback_context: ADK callback context.
        llm_response: The LLM response to potentially modify.

    Returns:
        Modified LlmResponse with sources tag appended, or None if unchanged.
    """
    if not llm_response.grounding_metadata:
        return None

    metadata = llm_response.grounding_metadata

    # Skip if no actual sources
    if not metadata.grounding_chunks:
        return None

    try:
        serialized = _serialize_grounding_metadata(metadata)

        # Only emit if we have sources
        if not serialized["sources"]:
            return None

        # Create the semantic tag
        sources_json = json.dumps(serialized, separators=(",", ":"))
        sources_tag = f"{SOURCES_TAG_OPEN}{sources_json}{SOURCES_TAG_CLOSE}"

        if append_tag_to_response(llm_response, sources_tag):
            logger.info(
                f"Embedded {len(serialized['sources'])} grounding sources in response"
            )
            return llm_response

    except Exception as e:
        logger.warning(f"Failed to capture grounding metadata: {e}")

    return None
