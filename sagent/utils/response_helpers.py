"""Helpers for modifying LLM responses in callbacks."""

from google.adk.models.llm_response import LlmResponse
from google.genai import types


def append_tag_to_response(llm_response: LlmResponse, tag: str) -> bool:
    """Append a semantic tag to the last non-thought text part of a response.

    Searches backwards through response parts to find the last text part
    that isn't a thought, then appends the tag. If no suitable part exists,
    creates a new text part.

    Args:
        llm_response: The LLM response to modify (mutated in place).
        tag: The semantic tag string to append.

    Returns:
        True if the tag was appended, False if response has no content.
    """
    if not llm_response.content or not llm_response.content.parts:
        return False

    # Find last non-thought text part and append
    for i in range(len(llm_response.content.parts) - 1, -1, -1):
        part = llm_response.content.parts[i]
        if part.text and not getattr(part, "thought", False):
            part.text = part.text + "\n" + tag
            return True

    # No text part found - add as new part
    llm_response.content.parts.append(types.Part.from_text(tag))
    return True
