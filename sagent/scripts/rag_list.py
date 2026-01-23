#!/usr/bin/env python3
"""List RAG corpora in Vertex AI.

Shows all corpora in the configured project/location.

Usage:
    cd sagent && uv run python scripts/rag_list.py

    # Or via Makefile
    make rag-list
"""

import sys
from pathlib import Path

from dotenv import load_dotenv


def main():
    # Load environment variables
    env_file = Path(__file__).parent.parent / ".env.development"
    load_dotenv(env_file)

    import os

    import vertexai
    from vertexai.preview import rag

    project = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("GOOGLE_CLOUD_LOCATION")

    vertexai.init(project=project, location=location)

    print(f"Project:  {project}")
    print(f"Location: {location}")
    print()

    corpora = list(rag.list_corpora())

    if not corpora:
        print("No corpora found.")
        return

    print(f"Found {len(corpora)} corpora:\n")
    for corpus in corpora:
        print(f"  {corpus.display_name}")
        print(f"    {corpus.name}")
        print()


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
