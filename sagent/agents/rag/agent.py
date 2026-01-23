"""Team knowledge sub-agent for document retrieval.

This agent specialises in searching and browsing team knowledge bases via
Vertex AI RAG. It reads accessible corpora from session state (set by
inject_user_context) and returns document excerpts with citations.

The agent is designed to be used as a sub-agent via AgentTool, allowing
the root agent to delegate knowledge queries and receive structured results.

Architecture:
    Root Agent → AgentTool(team_knowledge_agent) → Vertex AI RAG Engine
                                                          ↓
                                                Document excerpts/file lists
"""

import logging
import os

from google.adk.agents import LlmAgent
from google.adk.tools import ToolContext

from instructions import team_knowledge_instruction

logger = logging.getLogger(__name__)

# RAG configuration from environment
RAG_SIMILARITY_TOP_K = int(os.getenv("RAG_SIMILARITY_TOP_K", "10"))


def _ensure_vertexai_init():
    """Ensure Vertex AI is initialised with correct project and location.

    Must be called before any RAG API calls to ensure the SDK uses the
    correct region (matching where corpora are created).
    """
    import vertexai

    vertexai.init(
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        location=os.getenv("GOOGLE_CLOUD_LOCATION"),
    )


def search_knowledge(query: str, tool_context: ToolContext) -> str:
    """Search team knowledge bases for documents matching the query.

    This tool queries Vertex AI RAG Engine across all corpora accessible
    to the current user. Access is determined by team membership, which
    is loaded into session state by inject_user_context.

    Args:
        query: The search query - what information to look for.
        tool_context: ADK tool context providing access to session state.

    Returns:
        Relevant document excerpts with source citations, or a message
        indicating no relevant information was found.
    """
    # Get user's accessible corpora from session state
    user_corpora = tool_context.state.get("user_corpora", [])

    if not user_corpora:
        # Check if user context was loaded
        if not tool_context.state.get("_user_context_loaded"):
            logger.warning(
                "User context not loaded - inject_user_context may not have run"
            )
            return (
                "Unable to search: user context not initialised. "
                "Please try again or contact support if this persists."
            )

        # User has no team memberships or teams have no corpora
        user_teams = tool_context.state.get("user_teams", [])
        if not user_teams:
            return "No team memberships found. Contact your administrator to be added to a team."
        else:
            return f"Your teams ({', '.join(user_teams)}) don't have knowledge bases configured yet."

    try:
        _ensure_vertexai_init()

        from vertexai import rag
        from vertexai.rag import RagResource, RagRetrievalConfig

        # Build RAG resources for all accessible corpora
        rag_resources = [RagResource(rag_corpus=corpus) for corpus in user_corpora]

        logger.debug(f"Searching {len(rag_resources)} corpora for: {query[:50]}...")

        # Query all accessible corpora
        response = rag.retrieval_query(
            rag_resources=rag_resources,
            text=query,
            rag_retrieval_config=RagRetrievalConfig(top_k=RAG_SIMILARITY_TOP_K),
        )

        # Format results with citations
        if not response.contexts or not response.contexts.contexts:
            return f"No relevant documents found for: {query}"

        results = []
        for i, ctx in enumerate(response.contexts.contexts, 1):
            source = getattr(ctx, "source_uri", "Unknown source")
            text = getattr(ctx, "text", "")
            if text:
                # Extract filename from source URI
                source_name = source.split("/")[-1] if "/" in source else source
                results.append(f"[Source {i}: {source_name}]\n{text}")

        if not results:
            return f"No relevant documents found for: {query}"

        return "\n\n---\n\n".join(results)

    except ImportError as e:
        logger.warning(f"vertexai.rag not available: {e}")
        return (
            "Knowledge search is temporarily unavailable. RAG service not configured."
        )

    except Exception as e:
        logger.exception(f"RAG retrieval failed: {e}")
        return f"Error searching knowledge base: {str(e)}"


def list_knowledge_files(tool_context: ToolContext) -> str:
    """List files available in the user's team knowledge bases.

    This tool returns a list of documents indexed in the Vertex AI RAG
    corpora accessible to the current user. Use this when users want to
    browse what's available before searching.

    Results are capped at 50 files. For larger knowledge bases, use
    search_knowledge() to find specific documents.

    Args:
        tool_context: ADK tool context providing access to session state.

    Returns:
        A formatted list of available files grouped by team/corpus,
        or a message if no files are available.
    """
    user_corpora = tool_context.state.get("user_corpora", [])
    user_teams = tool_context.state.get("user_teams", [])

    if not user_corpora:
        if not tool_context.state.get("_user_context_loaded"):
            return (
                "Unable to list files: user context not initialised. "
                "Please try again or contact support if this persists."
            )
        if not user_teams:
            return "No team memberships found. Contact your administrator to be added to a team."
        else:
            return f"Your teams ({', '.join(user_teams)}) don't have knowledge bases configured yet."

    try:
        _ensure_vertexai_init()

        from vertexai import rag

        max_files = 50
        total_count = 0
        displayed_count = 0
        corpus_sections = []

        for corpus_name in user_corpora:
            try:
                # Corpus names are like: projects/.../ragCorpora/123
                files = list(rag.list_files(corpus_name=corpus_name))
                corpus_file_count = len(files)
                total_count += corpus_file_count

                if files and displayed_count < max_files:
                    corpus_display = corpus_name.split("/")[-1]
                    file_entries = []

                    for f in files:
                        if displayed_count >= max_files:
                            break
                        name = getattr(f, "display_name", None) or f.name.split("/")[-1]
                        file_entries.append(f"  - {name}")
                        displayed_count += 1

                    corpus_sections.append(
                        f"**Knowledge Base** (corpus {corpus_display}):\n"
                        + "\n".join(file_entries)
                    )

            except Exception as e:
                logger.warning(f"Failed to list files for corpus {corpus_name}: {e}")
                corpus_sections.append(
                    f"**Corpus {corpus_name.split('/')[-1]}**: Unable to list files"
                )

        if total_count == 0:
            return (
                "No files found in your team knowledge bases. Documents may not have been uploaded yet.\n\n"
                "_Note: Only PDF, DOCX, TXT, HTML, Markdown, and JSON files are indexed. "
                "Other formats (CSV, images, etc.) are not included._"
            )

        # Build response with appropriate header
        if displayed_count < total_count:
            header = (
                f"Showing {displayed_count} of {total_count} files in your knowledge bases "
                f"(use search to find specific documents):\n\n"
            )
        else:
            header = (
                f"Found {total_count} file(s) in your accessible knowledge bases:\n\n"
            )

        footer = (
            "\n\n_Note: Only PDF, DOCX, TXT, HTML, Markdown, and JSON files are indexed. "
            "Other formats in GDrive folders are not included._"
        )

        return header + "\n\n".join(corpus_sections) + footer

    except ImportError as e:
        logger.warning(f"vertexai.rag not available: {e}")
        return "Knowledge base browsing is temporarily unavailable. RAG service not configured."

    except Exception as e:
        logger.exception(f"Failed to list knowledge files: {e}")
        return f"Error listing knowledge base files: {str(e)}"


# Create the team knowledge sub-agent
# Named clearly - searches team documents synced from GDrive folders
team_knowledge_agent = LlmAgent(
    name="team_knowledge_agent",
    model="gemini-2.5-flash",
    description=(
        "Searches and browses team knowledge bases (documents synced from team GDrive folders). "
        "Use this agent when users ask about internal documents, policies, procedures, "
        "reports, GDrive files, or want to see what documents are available. "
        "This is the primary source for company knowledge."
    ),
    tools=[search_knowledge, list_knowledge_files],
    instruction=team_knowledge_instruction,
)
