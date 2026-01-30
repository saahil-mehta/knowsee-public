"""RAG configuration loader.

Loads and parses config/rag-corpora.yaml with environment variable
substitution. Used by both the bootstrap script and sync service.
"""

import logging
import os
import re
from pathlib import Path

import yaml

logger = logging.getLogger(__name__)

# Default config path relative to sagent/
_DEFAULT_CONFIG_PATH = Path(__file__).parent.parent.parent / "config" / "rag-corpora.yaml"


def load_rag_config(config_path: Path | None = None) -> dict:
    """Load RAG config with environment variable substitution.

    Args:
        config_path: Path to YAML config. Defaults to config/rag-corpora.yaml.

    Returns:
        Parsed config dictionary.
    """
    path = config_path or _DEFAULT_CONFIG_PATH
    if not path.exists():
        logger.warning(f"RAG config not found: {path}")
        return {}

    with open(path) as f:
        content = f.read()

    def env_sub(match):
        var_name = match.group(1)
        value = os.getenv(var_name)
        if value is None:
            raise _MissingEnvVar(var_name)
        return value

    try:
        content = re.sub(r"\$\{([A-Z_][A-Z0-9_]*)\}", env_sub, content)
    except _MissingEnvVar as e:
        logger.warning(
            f"RAG config skipped: environment variable not set: {e.var_name}. "
            "Using defaults."
        )
        return {}

    return yaml.safe_load(content)


class _MissingEnvVar(Exception):
    """Internal exception for missing environment variables during config loading."""

    def __init__(self, var_name: str):
        self.var_name = var_name


def build_import_kwargs(config: dict) -> dict:
    """Build keyword arguments for rag.import_files() from config.

    Returns a dict with 'transformation_config' and optionally 'llm_parser'
    keys, ready to be spread into rag.import_files(**kwargs).

    If config is empty or missing, returns legacy chunk_size/chunk_overlap
    kwargs for backwards compatibility.
    """
    vertex_config = config.get("vertex_ai", {})
    chunk_size = vertex_config.get("chunk_size", 512)
    chunk_overlap = vertex_config.get("chunk_overlap", 100)

    try:
        from vertexai.preview import rag
    except ImportError:
        logger.warning("vertexai not available, using legacy import kwargs")
        return {"chunk_size": chunk_size, "chunk_overlap": chunk_overlap}

    kwargs: dict = {
        "transformation_config": rag.TransformationConfig(
            chunking_config=rag.ChunkingConfig(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
            ),
        ),
    }

    parser_config = config.get("llm_parser", {})
    if parser_config.get("enabled"):
        project = vertex_config.get("project")
        location = vertex_config.get("location", "global")
        model = parser_config.get("model", "gemini-2.0-flash-lite")
        model_name = (
            f"projects/{project}/locations/{location}"
            f"/publishers/google/models/{model}"
        )
        max_rpm = parser_config.get("max_parsing_requests_per_min")

        kwargs["llm_parser"] = rag.LlmParserConfig(
            model_name=model_name,
            max_parsing_requests_per_min=max_rpm,
        )
        logger.info(f"LLM parser enabled: model={model}, max_rpm={max_rpm}")

    return kwargs
