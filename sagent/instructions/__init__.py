"""Instruction providers for ADK agents.

This module provides InstructionProvider functions that load instructions
from markdown files and inject dynamic context (current date, user info).
"""

from datetime import datetime
from pathlib import Path

from google.adk.agents.readonly_context import ReadonlyContext

INSTRUCTIONS_DIR = Path(__file__).parent


def _load_template(filename: str) -> str:
    """Load instruction template from markdown file."""
    return (INSTRUCTIONS_DIR / filename).read_text(encoding="utf-8")


def _inject_context(template: str, context: ReadonlyContext) -> str:
    """Replace placeholders with dynamic values.

    Placeholders:
        {{current_date}} -> "14 January 2026"
        {{current_year}} -> "2026"
        {{user_name}}    -> User's name from state, or empty string
    """
    now = datetime.now()

    replacements = {
        "{{current_date}}": now.strftime("%d %B %Y"),
        "{{current_year}}": str(now.year),
        "{{user_name}}": context.state.get("user:name", ""),
    }

    result = template
    for placeholder, value in replacements.items():
        result = result.replace(placeholder, value)

    return result


def root_instruction(context: ReadonlyContext) -> str:
    """InstructionProvider for the root Knowsee agent."""
    template = _load_template("main.md")
    return _inject_context(template, context)


def search_instruction(context: ReadonlyContext) -> str:
    """InstructionProvider for the web search agent."""
    template = _load_template("search_agent.md")
    return _inject_context(template, context)


def team_knowledge_instruction(context: ReadonlyContext) -> str:
    """InstructionProvider for the team knowledge (RAG) agent."""
    template = _load_template("team_knowledge_agent.md")
    return _inject_context(template, context)


def data_analyst_instruction(context: ReadonlyContext) -> str:
    """InstructionProvider for the data analyst (BigQuery) agent."""
    template = _load_template("data_analyst.md")
    return _inject_context(template, context)
