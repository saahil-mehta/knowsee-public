#!/usr/bin/env python3
"""Bootstrap RAG corpora from configuration.

This script reads config/rag-corpora.yaml and:
1. Creates RAG corpora in Vertex AI (idempotent - skips existing)
2. Populates team_corpora table with corpus mappings
3. Populates user_teams table with member assignments
4. Optionally triggers initial file imports from GDrive

Usage:
    # From project root
    make rag-bootstrap

    # Or directly
    cd sagent && uv run python scripts/bootstrap_rag.py

    # With options
    cd sagent && uv run python scripts/bootstrap_rag.py --skip-import
"""

import argparse
import logging
import os
import re
import sys
import uuid
from email.utils import parseaddr
from pathlib import Path

import yaml
from dotenv import load_dotenv
from sqlalchemy import text

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.db import get_session
from services.rag.config import build_import_kwargs

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def load_config(config_path: Path) -> dict:
    """Load and parse config file with environment variable substitution."""
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    with open(config_path) as f:
        content = f.read()

    # Substitute environment variables: ${VAR_NAME}
    def env_sub(match):
        var_name = match.group(1)
        value = os.getenv(var_name)
        if value is None:
            raise ValueError(f"Environment variable not set: {var_name}")
        return value

    content = re.sub(r"\$\{([A-Z_][A-Z0-9_]*)\}", env_sub, content)

    return yaml.safe_load(content)


def find_corpus_by_display_name(
    display_name: str, project: str, location: str
) -> str | None:
    """Find existing corpus by display name, return corpus resource name or None."""
    try:
        from vertexai.preview import rag

        for corpus in rag.list_corpora():
            if corpus.display_name == display_name:
                return corpus.name
        return None
    except Exception as e:
        logger.warning(f"Failed to list corpora: {e}")
        return None


def create_corpus(
    display_name: str,
    project: str,
    location: str,
    embedding_model: str,
) -> str:
    """Create a new RAG corpus in Vertex AI, return corpus resource name."""
    from vertexai.preview import rag

    logger.info(f"Creating corpus: {display_name}")

    corpus = rag.create_corpus(
        display_name=display_name,
        backend_config=rag.RagVectorDbConfig(
            rag_embedding_model_config=rag.RagEmbeddingModelConfig(
                vertex_prediction_endpoint=rag.VertexPredictionEndpoint(
                    model=embedding_model,
                )
            )
        ),
    )

    logger.info(f"Created corpus: {corpus.name}")
    return corpus.name


def upsert_team_corpus(
    team_id: str,
    corpus_name: str,
    source_type: str,
    folder_url: str,
) -> None:
    """Insert or update team_corpora record."""
    session = get_session()
    try:
        # Check if record exists
        result = session.execute(
            text("SELECT id FROM team_corpora WHERE team_id = :team_id"),
            {"team_id": team_id},
        )
        existing = result.fetchone()

        if existing:
            # Update existing record
            session.execute(
                text("""
                    UPDATE team_corpora
                    SET corpus_name = :corpus_name,
                        source_type = :source_type,
                        folder_url = :folder_url,
                        updated_at = NOW()
                    WHERE team_id = :team_id
                """),
                {
                    "team_id": team_id,
                    "corpus_name": corpus_name,
                    "source_type": source_type,
                    "folder_url": folder_url,
                },
            )
            logger.info(f"Updated team_corpora: {team_id}")
        else:
            # Insert new record
            session.execute(
                text("""
                    INSERT INTO team_corpora (id, team_id, corpus_name, source_type, folder_url)
                    VALUES (:id, :team_id, :corpus_name, :source_type, :folder_url)
                """),
                {
                    "id": str(uuid.uuid4()),
                    "team_id": team_id,
                    "corpus_name": corpus_name,
                    "source_type": source_type,
                    "folder_url": folder_url,
                },
            )
            logger.info(f"Inserted team_corpora: {team_id}")

        session.commit()
    finally:
        session.close()


def validate_email(email: str) -> str:
    """Validate email format and return normalised (lowercase) form.

    Raises:
        ValueError: If email format is invalid.
    """
    _, addr = parseaddr(email.strip())
    if not addr or "@" not in addr:
        raise ValueError(f"Invalid email format: {email}")
    return addr.lower()


def upsert_user_team(user_id: str, team_id: str, role: str = "member") -> None:
    """Insert or update user_teams record.

    Emails are normalised to lowercase for case-insensitive matching.
    """
    normalised_id = validate_email(user_id)
    session = get_session()
    try:
        # Upsert using ON CONFLICT (PostgreSQL)
        session.execute(
            text("""
                INSERT INTO user_teams (user_id, team_id, role)
                VALUES (:user_id, :team_id, :role)
                ON CONFLICT (user_id, team_id)
                DO UPDATE SET role = :role
            """),
            {"user_id": normalised_id, "team_id": team_id, "role": role},
        )
        session.commit()
        logger.debug(f"Upserted user_team: {normalised_id} -> {team_id}")
    finally:
        session.close()


def import_files(
    corpus_name: str,
    folder_url: str,
    import_kwargs: dict | None = None,
) -> None:
    """Trigger file import from GDrive folder to corpus."""
    try:
        from vertexai.preview import rag

        logger.info(f"Importing files from {folder_url} to {corpus_name}")

        kwargs: dict = {
            "corpus_name": corpus_name,
            "paths": [folder_url],
            **(import_kwargs or {"chunk_size": 512, "chunk_overlap": 100}),
        }

        rag.import_files(**kwargs)

        logger.info(f"File import triggered for {corpus_name}")
    except Exception as e:
        logger.error(f"File import failed for {corpus_name}: {e}")
        raise


def bootstrap(
    config_path: Path, skip_import: bool = False, dry_run: bool = False
) -> None:
    """Main bootstrap function."""
    logger.info("Loading configuration...")
    config = load_config(config_path)

    vertex_config = config.get("vertex_ai", {})
    project = vertex_config.get("project")
    location = vertex_config.get("location", "global")
    embedding_model = vertex_config.get("embedding_model", "text-embedding-005")

    if not project:
        raise ValueError("vertex_ai.project is required in config")

    # Initialise Vertex AI
    import vertexai

    vertexai.init(project=project, location=location)

    logger.info(f"Vertex AI: project={project}, location={location}")

    # Build import configuration (chunking + optional LLM parser)
    import_kwargs = build_import_kwargs(config)

    corpora = config.get("corpora", [])
    team_members = config.get("team_members", {})

    if not corpora:
        logger.warning("No corpora defined in config")
        return

    # Process each corpus
    for corpus_config in corpora:
        team_id = corpus_config.get("team_id")
        display_name = corpus_config.get("display_name")
        source_type = corpus_config.get("source_type", "gdrive")
        folder_url = corpus_config.get("folder_url")

        if not all([team_id, display_name, folder_url]):
            logger.warning(f"Skipping incomplete corpus config: {corpus_config}")
            continue

        logger.info(f"Processing corpus: {display_name} (team: {team_id})")

        if dry_run:
            logger.info(f"[DRY RUN] Would create/update corpus: {display_name}")
            continue

        # Find or create corpus
        corpus_name = find_corpus_by_display_name(display_name, project, location)
        if corpus_name:
            logger.info(f"Corpus already exists: {corpus_name}")
        else:
            corpus_name = create_corpus(
                display_name, project, location, embedding_model
            )

        # Upsert team_corpora record
        upsert_team_corpus(team_id, corpus_name, source_type, folder_url)

        # Trigger file import unless skipped
        if not skip_import:
            try:
                import_files(corpus_name, folder_url, import_kwargs)
            except Exception as e:
                logger.warning(f"File import failed (continuing): {e}")

    # Process team memberships
    for team_id, members in team_members.items():
        logger.info(f"Processing team members: {team_id}")
        for user_id in members:
            if dry_run:
                logger.info(f"[DRY RUN] Would add {user_id} to {team_id}")
            else:
                upsert_user_team(user_id, team_id)

    logger.info("Bootstrap complete!")


def main():
    parser = argparse.ArgumentParser(description="Bootstrap RAG corpora from config")
    parser.add_argument(
        "--config",
        type=Path,
        default=Path(__file__).parent.parent / "config" / "rag-corpora.yaml",
        help="Path to config file",
    )
    parser.add_argument(
        "--skip-import",
        action="store_true",
        help="Skip file import (create corpus and DB records only)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )

    args = parser.parse_args()

    # Load environment variables (same pattern as main.py)
    env_file = Path(__file__).parent.parent / ".env.development"
    load_dotenv(env_file)

    try:
        bootstrap(args.config, skip_import=args.skip_import, dry_run=args.dry_run)
    except Exception as e:
        logger.error(f"Bootstrap failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
