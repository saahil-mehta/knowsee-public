"""RAG services for corpus and team management.

These services provide:
- Team membership (which teams a user belongs to)
- Corpus registry (which corpora teams have access to)
- Sync service (imports files from GDrive/OneDrive to corpora)

Corpus and team configuration is done via config/rag-corpora.yaml
and bootstrapped with `make rag-bootstrap`.
"""

from services.rag.corpus_registry import CorpusRegistry, corpus_registry
from services.rag.sync import SyncService, sync_service
from services.rag.teams import (
    BetterAuthTeamService,
    TeamMembershipService,
    get_team_service,
    team_service,
)

__all__ = [
    "CorpusRegistry",
    "corpus_registry",
    "SyncService",
    "sync_service",
    "TeamMembershipService",
    "BetterAuthTeamService",
    "get_team_service",
    "team_service",
]
