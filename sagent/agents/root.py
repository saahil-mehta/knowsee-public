"""Root Knowsee agent definition.

This is the main agent that users interact with. It orchestrates:
- File tools (list_files, read_file) for uploaded documents
- Web search via AgentTool delegation to the search agent
- Team knowledge retrieval via AgentTool delegation to the team knowledge agent
"""

from google.adk.agents import LlmAgent
from google.adk.agents.callback_context import CallbackContext
from google.adk.agents.llm_agent import LlmRequest
from google.adk.planners import BuiltInPlanner
from google.adk.tools.agent_tool import AgentTool
from google.genai.types import ThinkingConfig

from agents.data_analyst import data_analyst_agent
from agents.rag import team_knowledge_agent
from agents.search import search_agent
from callbacks import (
    auto_generate_session_title,
    inject_artifact_content,
    inject_user_context,
)
from instructions import root_instruction
from tools import list_files, read_file


async def combined_before_model_callback(
    callback_context: CallbackContext,
    llm_request: LlmRequest,
):
    """Combined before_model_callback that runs multiple callbacks.

    Chains:
    1. inject_user_context - Sets up user teams and corpora in state
    2. inject_artifact_content - Injects binary artifacts into LLM context

    TODO: Refactor to ADK Plugin when ag-ui-adk supports plugins.
    ADK's Plugin system handles callback chaining elegantly, but the current
    ag-ui-adk.ADKAgent middleware doesn't expose the plugins parameter.
    """
    # Run user context injection first
    await inject_user_context(callback_context, llm_request)

    # Then run artifact injection
    await inject_artifact_content(callback_context, llm_request)

    return None


root_agent = LlmAgent(
    name="knowsee_agent",
    model="gemini-2.5-pro",
    description="Enterprise knowledge assistant that answers questions from internal documents and data.",
    tools=[
        list_files,
        read_file,
        AgentTool(agent=search_agent),
        AgentTool(agent=team_knowledge_agent),
        AgentTool(agent=data_analyst_agent),
    ],
    before_model_callback=combined_before_model_callback,
    after_agent_callback=auto_generate_session_title,
    planner=BuiltInPlanner(
        thinking_config=ThinkingConfig(
            include_thoughts=True,
            thinking_budget=2048,
        )
    ),
    instruction=root_instruction,
)
