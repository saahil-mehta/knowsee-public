"""Services package for Knowsee backend.

This package contains modular services that can be used across the application:
- titles: Session title generation (retrieval via ADK sessions table)
- events: SSE event bus for real-time updates
- rag/: RAG-related services (corpus_registry, teams)
"""

from services.events import EventType, event_bus
from services.titles import (
    generate_title,
    get_titles_bulk,
)

# RAG services are imported from services.rag subpackage
# Example: from services.rag import corpus_registry, team_service

__all__ = [
    # Events
    "event_bus",
    "EventType",
    # Titles
    "generate_title",
    "get_titles_bulk",
]
