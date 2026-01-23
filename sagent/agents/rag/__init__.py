"""Team knowledge agent for document retrieval.

This sub-agent handles document search and browsing via Vertex AI RAG Engine.
It reads user_corpora from session state (set by inject_user_context)
and queries only the corpora the user has access to.

Usage:
    from agents.rag import team_knowledge_agent

    # Wrap as tool for root agent
    from google.adk.tools import AgentTool
    root_agent = LlmAgent(
        tools=[AgentTool(agent=team_knowledge_agent)],
        ...
    )
"""

from agents.rag.agent import team_knowledge_agent

__all__ = ["team_knowledge_agent"]
