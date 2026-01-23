"""Monkey patch for AG-UI ADK EventTranslator to preserve thought content.

Problem: ADK emits thought/reasoning content with `part.thought=True`, but the AG-UI
adapter discards this flag and merges all text into one stream. This loses the semantic
distinction between model reasoning and final response.

Solution: Wrap thought content in `<llm:adk:soch>` tags before concatenation. The
frontend can then parse and render thoughts differently (collapsible, styled, etc.).

Why <llm:adk:soch>?
- 'soch' means 'thought' in Hindi
- Three-part namespace makes collision virtually impossible
- Any LLM generating this exact tag in response content is astronomically unlikely
"""

import logging
import uuid
from collections.abc import AsyncGenerator

from ag_ui.core import (
    BaseEvent,
    EventType,
    TextMessageContentEvent,
    TextMessageEndEvent,
    TextMessageStartEvent,
)

logger = logging.getLogger(__name__)

# Semantic tag for thought content - collision-resistant delimiter
THOUGHT_TAG_OPEN = "<llm:adk:soch>"
THOUGHT_TAG_CLOSE = "</llm:adk:soch>"


def apply_thought_tag_patch():
    """Apply the thought tag patch to EventTranslator.

    This replaces EventTranslator._translate_text_content with a version that
    wraps thought parts in semantic tags.

    Must be called BEFORE any EventTranslator instances are created.
    """
    from ag_ui_adk.event_translator import EventTranslator

    # Store reference to original method for potential restoration
    EventTranslator._original_translate_text_content = (
        EventTranslator._translate_text_content
    )

    # Replace with patched version
    EventTranslator._translate_text_content = _patched_translate_text_content

    logger.info("Applied thought tag patch to EventTranslator._translate_text_content")


async def _patched_translate_text_content(
    self, adk_event, thread_id: str, run_id: str
) -> AsyncGenerator[BaseEvent, None]:
    """Translate text content from ADK event to AG-UI text message events.

    This is a patched version that preserves thought content by wrapping it
    in <llm:adk:soch> tags.

    Args:
        adk_event: The ADK event containing text content
        thread_id: The AG-UI thread ID
        run_id: The AG-UI run ID

    Yields:
        Text message events (START, CONTENT, END)
    """
    # Check for is_final_response *before* checking for text.
    # An empty final response is a valid stream-closing signal.
    is_final_response = False
    if hasattr(adk_event, "is_final_response") and callable(
        adk_event.is_final_response
    ):
        is_final_response = adk_event.is_final_response()
    elif hasattr(adk_event, "is_final_response"):
        is_final_response = adk_event.is_final_response

    # ADK streaming flags
    is_partial = getattr(adk_event, "partial", False)
    turn_complete = getattr(adk_event, "turn_complete", False)
    has_finish_reason = bool(getattr(adk_event, "finish_reason", None))

    # Extract text from all parts, wrapping thoughts in semantic tags
    # THIS IS THE KEY CHANGE from the original implementation
    text_parts = []
    for part in adk_event.content.parts:
        if part.text:
            if getattr(part, "thought", False):
                # Wrap thought content in semantic tags
                text_parts.append(f"{THOUGHT_TAG_OPEN}{part.text}{THOUGHT_TAG_CLOSE}")
            else:
                text_parts.append(part.text)

    # If no text AND it's not a final response, we can safely skip.
    if not text_parts and not is_final_response:
        return

    combined_text = "".join(text_parts)

    # Handle is_final_response BEFORE the empty text early return.
    if is_final_response:
        if self._is_streaming and self._streaming_message_id:
            logger.info("Final response event received. Closing active stream.")

            if self._current_stream_text:
                self._last_streamed_text = self._current_stream_text
                self._last_streamed_run_id = run_id
            self._current_stream_text = ""

            end_event = TextMessageEndEvent(
                type=EventType.TEXT_MESSAGE_END, message_id=self._streaming_message_id
            )
            yield end_event

            self._streaming_message_id = None
            self._is_streaming = False
            logger.info("Streaming completed via final response")
            return

        # Skip final response if we already streamed content in this run.
        # ADK sends a consolidated final event after streaming, but the content
        # was already delivered via partial events. The final event has different
        # structure (thoughts wrapped once vs per-chunk), so string comparison fails.
        # Instead, just check if we streamed anything - if so, skip the final event.
        if self._last_streamed_run_id == run_id and self._last_streamed_text:
            # Sanity check: warn if final content differs significantly in length
            # This catches edge cases where final has different/revised content
            streamed_len = len(self._last_streamed_text)
            final_len = len(combined_text)
            if abs(streamed_len - final_len) > max(100, streamed_len * 0.1):
                logger.warning(
                    f"Final response length ({final_len}) differs significantly from "
                    f"streamed ({streamed_len}) - possible content mismatch"
                )
            logger.debug("Skipping final response (content already streamed)")
            self._current_stream_text = ""
            self._last_streamed_text = None
            self._last_streamed_run_id = None
            return

        if not combined_text:
            logger.info("Final response contained no text; nothing to emit")
            self._current_stream_text = ""
            self._last_streamed_text = None
            self._last_streamed_run_id = None
            return

    # Early return for empty text (non-final responses only)
    if not combined_text:
        return

    should_send_end = (
        (turn_complete and not is_partial)
        or (is_final_response and not is_partial)
        or (has_finish_reason and self._is_streaming)
    )

    was_already_streaming = self._is_streaming

    if not self._is_streaming:
        self._streaming_message_id = str(uuid.uuid4())
        self._is_streaming = True
        self._current_stream_text = ""

        start_event = TextMessageStartEvent(
            type=EventType.TEXT_MESSAGE_START,
            message_id=self._streaming_message_id,
            role="assistant",
        )
        yield start_event

    # Emit content with consolidated message detection
    if combined_text:
        if was_already_streaming and not is_partial:
            logger.info(
                "Skipping consolidated text (partial=False during active stream)"
            )
        else:
            self._current_stream_text += combined_text
            content_event = TextMessageContentEvent(
                type=EventType.TEXT_MESSAGE_CONTENT,
                message_id=self._streaming_message_id,
                delta=combined_text,
            )
            yield content_event

    if should_send_end:
        end_event = TextMessageEndEvent(
            type=EventType.TEXT_MESSAGE_END, message_id=self._streaming_message_id
        )
        yield end_event

        if self._current_stream_text:
            self._last_streamed_text = self._current_stream_text
            self._last_streamed_run_id = run_id
        self._current_stream_text = ""
        self._streaming_message_id = None
        self._is_streaming = False
