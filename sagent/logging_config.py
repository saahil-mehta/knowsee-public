"""Logging configuration for Knowsee ADK backend.

This module configures comprehensive logging for the ADK framework and application.
Must be imported before any ADK modules to capture all initialisation logs.

Environment variables:
    LOG_LEVEL: Set logging verbosity (DEBUG, INFO, WARNING, ERROR). Default: INFO
    ADK_LOG_LEVEL: Override log level for ADK internals specifically. Default: uses LOG_LEVEL

Usage:
    # At the very top of main.py, before other imports:
    from logging_config import configure_logging
    configure_logging()

    # Then import ADK modules
    from google.adk.agents import LlmAgent
"""

import logging
import os
import sys

# ADK logger namespaces that expose internal operations
ADK_LOGGER_NAMES = [
    "google.adk",  # Core ADK framework
    "google.adk.agents",  # Agent lifecycle and execution
    "google.adk.models",  # LLM request/response (includes full prompts at DEBUG)
    "google.adk.sessions",  # Session management
    "google.adk.tools",  # Tool execution
    "google_genai",  # Google GenAI SDK (model calls)
    "google_adk",  # Alternative namespace used by some ADK modules
]

# Noisy third-party loggers to suppress unless explicitly debugging
NOISY_LOGGERS = [
    "httpx",
    "httpcore",
    "uvicorn.access",
]

# Log format for development - timestamp, level, source, message
LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

VALID_LOG_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}


def get_log_level(env_var: str, default: str = "INFO") -> str:
    """Get and validate log level from environment variable."""
    level = os.getenv(env_var, default).upper()
    if level not in VALID_LOG_LEVELS:
        return default
    return level


def configure_logging() -> None:
    """Configure comprehensive logging for ADK and application.

    Log levels and what they reveal:
    - DEBUG: Full LLM prompts/responses, tool calls, internal state transitions
    - INFO: Agent lifecycle, session events, tool execution summaries
    - WARNING: Recoverable errors, deprecation notices
    - ERROR: Failed operations, unhandled exceptions

    Call this function before importing any ADK modules.
    """
    log_level = get_log_level("LOG_LEVEL", "INFO")
    adk_log_level = get_log_level("ADK_LOG_LEVEL", log_level)

    # Configure root logger
    logging.basicConfig(
        level=getattr(logging, log_level),
        format=LOG_FORMAT,
        datefmt=DATE_FORMAT,
        stream=sys.stdout,
        force=True,  # Override any existing configuration
    )

    # Configure ADK-specific loggers for detailed agent inspection
    adk_level = getattr(logging, adk_log_level)
    for logger_name in ADK_LOGGER_NAMES:
        logging.getLogger(logger_name).setLevel(adk_level)

    # Reduce noise from chatty libraries (unless explicitly debugging)
    if log_level != "DEBUG":
        for logger_name in NOISY_LOGGERS:
            logging.getLogger(logger_name).setLevel(logging.WARNING)

    # Log startup configuration
    startup_logger = logging.getLogger("knowsee.startup")
    startup_logger.info(f"Logging configured: app={log_level}, adk={adk_log_level}")
    if adk_log_level == "DEBUG":
        startup_logger.info("DEBUG mode: Full LLM prompts and responses will be logged")


def get_logging_status() -> dict:
    """Get current logging configuration status.

    Returns a dict suitable for JSON serialisation in debug endpoints.
    """
    return {
        "root_level": logging.getLevelName(logging.getLogger().level),
        "adk_loggers": {
            name: logging.getLevelName(logging.getLogger(name).level)
            for name in ADK_LOGGER_NAMES
        },
        "env": {
            "LOG_LEVEL": os.getenv("LOG_LEVEL", "INFO (default)"),
            "ADK_LOG_LEVEL": os.getenv("ADK_LOG_LEVEL", "uses LOG_LEVEL"),
        },
    }
