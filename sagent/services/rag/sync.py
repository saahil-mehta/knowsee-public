"""RAG corpus sync service.

Handles syncing files from GDrive/OneDrive to Vertex AI RAG corpora.
Called periodically by Cloud Scheduler or manually via API.

Usage:
    from services.rag.sync import sync_service

    # Sync all corpora
    results = await sync_service.sync_all()

    # Sync specific corpus
    result = await sync_service.sync_corpus(corpus_id)
"""

import asyncio
import logging
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum

from sqlalchemy import text

from services.db import get_session
from services.rag.config import build_import_kwargs, load_rag_config

logger = logging.getLogger(__name__)


class SyncStatus(str, Enum):
    """Sync operation status."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class SyncResult:
    """Result of a single corpus sync operation."""

    team_id: str
    corpus_name: str
    status: SyncStatus
    file_count: int | None = None
    error: str | None = None
    duration_seconds: float | None = None


@dataclass
class SyncAllResult:
    """Result of syncing all corpora."""

    total: int
    succeeded: int
    failed: int
    results: list[SyncResult]
    duration_seconds: float


class SyncService:
    """Service for syncing RAG corpora with source folders."""

    def __init__(self):
        self._project = os.getenv("GOOGLE_CLOUD_PROJECT")
        self._location = os.getenv("GOOGLE_CLOUD_LOCATION", "global")
        self._rag_config = load_rag_config()
        self._import_kwargs = build_import_kwargs(self._rag_config)

    def _get_all_corpora(self) -> list[dict]:
        """Get all corpora from database."""
        session = get_session()
        try:
            result = session.execute(
                text("""
                    SELECT id, team_id, corpus_name, source_type, folder_url
                    FROM team_corpora
                """)
            )
            return [
                {
                    "id": row.id,
                    "team_id": row.team_id,
                    "corpus_name": row.corpus_name,
                    "source_type": row.source_type,
                    "folder_url": row.folder_url,
                }
                for row in result
            ]
        finally:
            session.close()

    def _update_sync_status(
        self,
        team_id: str,
        status: SyncStatus,
        file_count: int | None = None,
        error: str | None = None,
    ) -> None:
        """Update sync status in database."""
        session = get_session()
        try:
            params = {
                "team_id": team_id,
                "status": status.value,
                "sync_at": datetime.now(UTC),
            }

            # Build dynamic update
            update_parts = [
                "last_sync_status = :status",
                "last_sync_at = :sync_at",
                "updated_at = NOW()",
            ]

            if file_count is not None:
                update_parts.append("file_count = :file_count")
                params["file_count"] = file_count

            session.execute(
                text(f"""
                    UPDATE team_corpora
                    SET {", ".join(update_parts)}
                    WHERE team_id = :team_id
                """),
                params,
            )
            session.commit()
        finally:
            session.close()

    async def sync_corpus(self, corpus_config: dict) -> SyncResult:
        """Sync a single corpus from its source folder.

        Args:
            corpus_config: Dict with team_id, corpus_name, source_type, folder_url

        Returns:
            SyncResult with status and details
        """
        team_id = corpus_config["team_id"]
        corpus_name = corpus_config["corpus_name"]
        folder_url = corpus_config["folder_url"]

        logger.info(f"Syncing corpus: {team_id} ({corpus_name})")
        start_time = datetime.now(UTC)

        # Mark as in progress
        self._update_sync_status(team_id, SyncStatus.IN_PROGRESS)

        try:
            # Import vertexai lazily to avoid issues when not configured
            import vertexai
            from vertexai.preview import rag

            # Initialise Vertex AI if not already done
            vertexai.init(project=self._project, location=self._location)

            # Import files from source folder
            # This is idempotent - unchanged files are skipped
            import_kwargs = {
                "corpus_name": corpus_name,
                "paths": [folder_url],
                **self._import_kwargs,
            }
            await asyncio.to_thread(
                rag.import_files,
                **import_kwargs,
            )

            # Get file count (approximate - count chunks/files in corpus)
            # Note: Vertex AI doesn't provide easy file count, so we estimate
            file_count = None  # TODO: Implement file counting if needed

            duration = (datetime.now(UTC) - start_time).total_seconds()

            # Mark as completed
            self._update_sync_status(
                team_id, SyncStatus.COMPLETED, file_count=file_count
            )

            logger.info(f"Sync completed: {team_id} ({duration:.1f}s)")

            return SyncResult(
                team_id=team_id,
                corpus_name=corpus_name,
                status=SyncStatus.COMPLETED,
                file_count=file_count,
                duration_seconds=duration,
            )

        except Exception as e:
            duration = (datetime.now(UTC) - start_time).total_seconds()
            error_msg = str(e)

            logger.error(f"Sync failed for {team_id}: {error_msg}")

            # Mark as failed
            self._update_sync_status(team_id, SyncStatus.FAILED)

            return SyncResult(
                team_id=team_id,
                corpus_name=corpus_name,
                status=SyncStatus.FAILED,
                error=error_msg,
                duration_seconds=duration,
            )

    async def sync_all(self) -> SyncAllResult:
        """Sync all configured corpora.

        Returns:
            SyncAllResult with summary and individual results
        """
        start_time = datetime.now(UTC)

        corpora = self._get_all_corpora()

        if not corpora:
            logger.info("No corpora configured - nothing to sync")
            return SyncAllResult(
                total=0,
                succeeded=0,
                failed=0,
                results=[],
                duration_seconds=0,
            )

        logger.info(f"Starting sync for {len(corpora)} corpora")

        # Sync corpora sequentially to avoid rate limits
        # Could be parallelised with semaphore if needed
        results = []
        for corpus_config in corpora:
            result = await self.sync_corpus(corpus_config)
            results.append(result)

        duration = (datetime.now(UTC) - start_time).total_seconds()
        succeeded = sum(1 for r in results if r.status == SyncStatus.COMPLETED)
        failed = sum(1 for r in results if r.status == SyncStatus.FAILED)

        logger.info(
            f"Sync complete: {succeeded}/{len(corpora)} succeeded, "
            f"{failed} failed, {duration:.1f}s total"
        )

        return SyncAllResult(
            total=len(corpora),
            succeeded=succeeded,
            failed=failed,
            results=results,
            duration_seconds=duration,
        )


# Global singleton
sync_service = SyncService()
