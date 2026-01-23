"""Shared database engine for backend services.

Provides a single SQLAlchemy engine instance with production-grade pooling.
All services should import from here rather than creating their own engines.

Usage:
    from services.db import get_session

    session = get_session()
    try:
        result = session.execute(text("SELECT 1"))
    finally:
        session.close()
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

# Database engine (lazy initialisation)
_engine = None
_Session = None


def _get_engine():
    """Get or create the database engine with production-grade pooling."""
    global _engine
    if _engine is None:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError(
                "DATABASE_URL environment variable is required. "
                "Run 'make db-up' to start local Postgres."
            )
        _engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=1800,
        )
    return _engine


def get_session():
    """Get a new database session."""
    global _Session
    if _Session is None:
        _Session = sessionmaker(bind=_get_engine())
    return _Session()
