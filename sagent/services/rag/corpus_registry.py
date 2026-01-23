"""Corpus registry service for team RAG corpora (read-only).

Provides read-only access to team-corpus mappings. Corpus configuration
is done manually via Terraform/DB, not through APIs.

Usage:
    from services.rag import corpus_registry

    # Get corpus names for user's teams
    corpus_names = corpus_registry.get_corpus_names_for_teams(team_ids)
"""

import logging

from sqlalchemy import text

from services.db import get_session

logger = logging.getLogger(__name__)


class CorpusRegistry:
    """Read-only registry for team RAG corpora.

    Provides methods to query team-corpus mappings. Configuration is
    done manually via Terraform/DB.
    """

    def get_corpus_names_for_teams(self, team_ids: list[str]) -> list[str]:
        """Get corpus resource names for teams.

        This is the primary method used for RAG queries - returns the
        Vertex AI corpus resource paths for the user's teams.

        Args:
            team_ids: List of team identifiers.

        Returns:
            List of corpus resource paths.
        """
        if not team_ids:
            return []

        session = get_session()
        try:
            result = session.execute(
                text(
                    "SELECT corpus_name FROM team_corpora WHERE team_id = ANY(:team_ids)"
                ),
                {"team_ids": team_ids},
            )
            return [row.corpus_name for row in result]
        finally:
            session.close()


# Global singleton instance
corpus_registry = CorpusRegistry()
