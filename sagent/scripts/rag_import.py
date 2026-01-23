#!/usr/bin/env python3
"""Import files from GDrive to a RAG corpus.

Triggers file import for a specific team's corpus or all corpora.

Usage:
    # Import files for a specific team
    cd sagent && uv run python scripts/rag_import.py --team core

    # Import files for all teams
    cd sagent && uv run python scripts/rag_import.py --all

    # Or via Makefile
    make rag-import TEAM=core
"""

import argparse
import logging
import sys
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import text

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from services.db import get_session

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def get_corpus_config(team_id: str | None = None) -> list[dict]:
    """Get corpus configuration from database."""
    session = get_session()
    try:
        if team_id:
            result = session.execute(
                text("""
                    SELECT team_id, corpus_name, folder_url
                    FROM team_corpora
                    WHERE team_id = :team_id
                """),
                {"team_id": team_id},
            )
        else:
            result = session.execute(
                text("""
                    SELECT team_id, corpus_name, folder_url
                    FROM team_corpora
                """)
            )
        return [
            {
                "team_id": row.team_id,
                "corpus_name": row.corpus_name,
                "folder_url": row.folder_url,
            }
            for row in result
        ]
    finally:
        session.close()


def import_files(corpus_name: str, folder_url: str) -> None:
    """Import files from GDrive folder to corpus."""
    import os

    import vertexai
    from vertexai.preview import rag

    vertexai.init(
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        location=os.getenv("GOOGLE_CLOUD_LOCATION"),
    )

    logger.info(f"Importing files from {folder_url}")
    logger.info(f"Target corpus: {corpus_name}")

    rag.import_files(
        corpus_name=corpus_name,
        paths=[folder_url],
        chunk_size=512,
        chunk_overlap=100,
    )

    logger.info("Import complete!")


def main():
    parser = argparse.ArgumentParser(description="Import files to RAG corpus")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--team", type=str, help="Team ID to import files for")
    group.add_argument("--all", action="store_true", help="Import for all teams")

    args = parser.parse_args()

    # Load environment variables
    env_file = Path(__file__).parent.parent / ".env.development"
    load_dotenv(env_file)

    try:
        corpora = get_corpus_config(args.team if not args.all else None)

        if not corpora:
            if args.team:
                logger.error(f"No corpus found for team: {args.team}")
            else:
                logger.error("No corpora configured")
            sys.exit(1)

        for config in corpora:
            logger.info(f"Processing team: {config['team_id']}")
            try:
                import_files(config["corpus_name"], config["folder_url"])
            except Exception as e:
                logger.error(f"Import failed for {config['team_id']}: {e}")
                if args.team:
                    sys.exit(1)

        logger.info("All imports complete!")

    except Exception as e:
        logger.error(f"Import failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
