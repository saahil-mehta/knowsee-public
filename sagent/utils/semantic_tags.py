"""Semantic tags for wrapping structured content in text streams.

These tags allow embedding structured metadata (thoughts, tool calls, etc.) within
text content while maintaining the ability to parse and render them distinctly
in the frontend.

Tag naming convention:
- Namespace: llm:adk (to avoid collision with user content)
- Hindi words used for collision resistance and brevity
- All tags are self-closing pairs: <tag>content</tag>

Currently defined tags:
- soch (thought): Model reasoning/thinking content
- tool: Function call invocation (name, id, args)
- tool-result: Function response (id, result)
- sources: Google Search grounding metadata (queries, sources)
"""

# Re-export thought tags for convenience (defined in patches for historical reasons)
from patches.thought_tags import THOUGHT_TAG_CLOSE, THOUGHT_TAG_OPEN

# Tool call semantic tags - wrap function_call parts in session history
# Format: <llm:adk:tool name="tool_name" id="call_id">{"args": "json"}</llm:adk:tool>
TOOL_TAG_OPEN = '<llm:adk:tool name="{name}" id="{id}">'
TOOL_TAG_CLOSE = "</llm:adk:tool>"

# Tool result semantic tags - wrap function_response parts in session history
# Format: <llm:adk:tool-result id="call_id">{"result": "json"}</llm:adk:tool-result>
TOOL_RESULT_TAG_OPEN = '<llm:adk:tool-result id="{id}">'
TOOL_RESULT_TAG_CLOSE = "</llm:adk:tool-result>"

# Sources semantic tags - wrap Google Search grounding metadata
# Format: <llm:adk:sources>{"queries": [...], "sources": [...]}</llm:adk:sources>
SOURCES_TAG_OPEN = "<llm:adk:sources>"
SOURCES_TAG_CLOSE = "</llm:adk:sources>"

# Query attempts semantic tags - wrap BigQuery query history
# Format: <llm:data:queries>{"attempts": [...]}</llm:data:queries>
QUERIES_TAG_OPEN = "<llm:data:queries>"
QUERIES_TAG_CLOSE = "</llm:data:queries>"

# Widget semantic tags - wrap BigQuery result widgets for chart rendering
# Format: <llm:data:widget>{"id": "...", "chart_type": "...", "data": {...}}</llm:data:widget>
WIDGET_TAG_OPEN = "<llm:data:widget>"
WIDGET_TAG_CLOSE = "</llm:data:widget>"

__all__ = [
    "THOUGHT_TAG_OPEN",
    "THOUGHT_TAG_CLOSE",
    "TOOL_TAG_OPEN",
    "TOOL_TAG_CLOSE",
    "TOOL_RESULT_TAG_OPEN",
    "TOOL_RESULT_TAG_CLOSE",
    "SOURCES_TAG_OPEN",
    "SOURCES_TAG_CLOSE",
    "QUERIES_TAG_OPEN",
    "QUERIES_TAG_CLOSE",
    "WIDGET_TAG_OPEN",
    "WIDGET_TAG_CLOSE",
]
