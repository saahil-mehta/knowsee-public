"""Team membership service for RAG access control (read-only).

Provides a unified interface for determining user team membership,
regardless of the identity provider. Implementations query different
sources based on auth mode:

- BetterAuthTeamService: Queries user_teams table (default)
- GoogleGroupsTeamService: Queries Google Directory API (for Google Workspace)
- AzureADTeamService: Queries Microsoft Graph API (for Azure AD)

Team membership configuration is done manually via the identity provider,
not through APIs.

Usage:
    from services.rag import team_service

    teams = team_service.get_user_teams("user@example.com")
"""

import logging
import os
from abc import ABC, abstractmethod

from sqlalchemy import text

from services.db import get_session

logger = logging.getLogger(__name__)


class TeamMembershipService(ABC):
    """Abstract base class for team membership services.

    Implementations provide read-only user-to-team mappings from different sources.
    """

    @abstractmethod
    def get_user_teams(self, user_id: str) -> list[str]:
        """Get the team IDs a user belongs to.

        Args:
            user_id: User identifier (typically email).

        Returns:
            List of team IDs the user is a member of.
        """
        pass

    @abstractmethod
    def is_user_in_team(self, user_id: str, team_id: str) -> bool:
        """Check if a user is a member of a specific team.

        Args:
            user_id: User identifier.
            team_id: Team identifier.

        Returns:
            True if user is in team, False otherwise.
        """
        pass


class BetterAuthTeamService(TeamMembershipService):
    """Team membership from user_teams database table.

    Used when Better Auth is the identity provider and team membership
    is managed within Knowsee.
    """

    def get_user_teams(self, user_id: str) -> list[str]:
        """Get teams from user_teams table."""
        normalised_id = user_id.strip().lower()
        session = get_session()
        try:
            result = session.execute(
                text(
                    "SELECT team_id FROM user_teams WHERE LOWER(user_id) = :user_id"
                ),
                {"user_id": normalised_id},
            )
            teams = [row.team_id for row in result]
            logger.debug(f"User {normalised_id} teams: {teams}")
            return teams
        finally:
            session.close()

    def is_user_in_team(self, user_id: str, team_id: str) -> bool:
        """Check membership in user_teams table."""
        normalised_id = user_id.strip().lower()
        session = get_session()
        try:
            result = session.execute(
                text("""
                    SELECT 1 FROM user_teams
                    WHERE LOWER(user_id) = :user_id AND team_id = :team_id
                """),
                {"user_id": normalised_id, "team_id": team_id},
            )
            return result.fetchone() is not None
        finally:
            session.close()


class GoogleGroupsTeamService(TeamMembershipService):
    """Team membership from Google Workspace Groups via Directory API.

    Used when users authenticate via Google Workspace SSO.
    Google Groups are mapped to team IDs.

    Requires:
    - Service account with Domain-wide Delegation
    - Admin SDK Directory API enabled
    - groups:read scope
    """

    def __init__(self):
        raise NotImplementedError(
            "GoogleGroupsTeamService not implemented. "
            "Use TEAM_MEMBERSHIP_PROVIDER=better_auth"
        )

    def get_user_teams(self, user_id: str) -> list[str]:
        pass  # Unreachable - __init__ raises

    def is_user_in_team(self, user_id: str, team_id: str) -> bool:
        pass  # Unreachable - __init__ raises


class AzureADTeamService(TeamMembershipService):
    """Team membership from Azure AD Security Groups via Microsoft Graph API.

    Used when users authenticate via Azure AD SSO.
    Security Groups are mapped to team IDs.

    Requires:
    - Azure App Registration with GroupMember.Read.All permission
    - Microsoft Graph API access
    """

    def __init__(self):
        raise NotImplementedError(
            "AzureADTeamService not implemented. "
            "Use TEAM_MEMBERSHIP_PROVIDER=better_auth"
        )

    def get_user_teams(self, user_id: str) -> list[str]:
        pass  # Unreachable - __init__ raises

    def is_user_in_team(self, user_id: str, team_id: str) -> bool:
        pass  # Unreachable - __init__ raises


def get_team_service() -> TeamMembershipService:
    """Get the appropriate team membership service based on environment.

    The service is selected based on the TEAM_MEMBERSHIP_PROVIDER env var:
    - 'better_auth' (default): Use user_teams database table
    - 'google_groups': Use Google Directory API
    - 'azure_ad': Use Microsoft Graph API

    Returns:
        Appropriate TeamMembershipService implementation.
    """
    provider = os.getenv("TEAM_MEMBERSHIP_PROVIDER", "better_auth")

    if provider == "google_groups":
        return GoogleGroupsTeamService()
    elif provider == "azure_ad":
        return AzureADTeamService()
    else:
        return BetterAuthTeamService()


# Default service instance (can be overridden for testing)
team_service = get_team_service()
