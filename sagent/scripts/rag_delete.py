#!/usr/bin/env python3
"""Delete a RAG corpus from Vertex AI.

Removes a corpus and optionally its database record.

Usage:
    # Delete by team ID (looks up corpus from database)
    cd sagent && uv run python scripts/rag_delete.py --team core

    # Delete by corpus name directly
    cd sagent && uv run python scripts/rag_delete.py --corpus projects/.../ragCorpora/123

    # Also remove database record
    cd sagent && uv run python scripts/rag_delete.py --team core --remove-db

    # Or via Makefile
    make rag-delete TEAM=core
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


def get_corpus_name(team_id: str) -> str | None:
    """Get corpus name from database by team ID."""
    session = get_session()
    try:
        result = session.execute(
            text("SELECT corpus_name FROM team_corpora WHERE team_id = :team_id"),
            {"team_id": team_id},
        )
        row = result.fetchone()
        return row.corpus_name if row else None
    finally:
        session.close()


def delete_corpus(corpus_name: str) -> None:
    """Delete corpus from Vertex AI."""
    import os

    import vertexai
    from vertexai.preview import rag

    vertexai.init(
        project=os.getenv("GOOGLE_CLOUD_PROJECT"),
        location=os.getenv("GOOGLE_CLOUD_LOCATION"),
    )

    logger.info(f"Deleting corpus: {corpus_name}")
    rag.delete_corpus(name=corpus_name)
    logger.info("Corpus deleted from Vertex AI")


def remove_db_record(team_id: str) -> None:
    """Remove team corpus record from database."""
    session = get_session()
    try:
        # Remove user_teams entries
        session.execute(
            text("DELETE FROM user_teams WHERE team_id = :team_id"),
            {"team_id": team_id},
        )

        # Remove team_corpora entry
        result = session.execute(
            text("DELETE FROM team_corpora WHERE team_id = :team_id"),
            {"team_id": team_id},
        )

        session.commit()

        if result.rowcount > 0:
            logger.info(f"Removed database records for team: {team_id}")
        else:
            logger.warning(f"No database records found for team: {team_id}")
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Delete a RAG corpus")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--team", type=str, help="Team ID to delete corpus for")
    group.add_argument("--corpus", type=str, help="Corpus resource name to delete")

    parser.add_argument(
        "--remove-db",
        action="store_true",
        help="Also remove database records (team_corpora, user_teams)",
    )
    parser.add_argument(
        "--yes",
        "-y",
        action="store_true",
        help="Skip confirmation prompt",
    )

    args = parser.parse_args()

    # Load environment variables
    env_file = Path(__file__).parent.parent / ".env.development"
    load_dotenv(env_file)

    try:
        # Resolve corpus name
        if args.team:
            corpus_name = get_corpus_name(args.team)
            if not corpus_name:
                logger.error(f"No corpus found for team: {args.team}")
                sys.exit(1)
            team_id = args.team
        else:
            corpus_name = args.corpus
            team_id = None

        # Confirmation
        if not args.yes:
            print("\nAbout to delete:")
            print(f"  Corpus: {corpus_name}")
            if args.remove_db and team_id:
                print(f"  Database records for team: {team_id}")
            print()
            confirm = input("Continue? [y/N] ").strip().lower()
            if confirm != "y":
                print("Aborted.")
                sys.exit(0)

        # Delete corpus
        delete_corpus(corpus_name)

        # Remove database records if requested
        if args.remove_db and team_id:
            remove_db_record(team_id)

        logger.info("Delete complete!")

    except Exception as e:
        logger.error(f"Delete failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
