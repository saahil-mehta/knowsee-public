"""Blocklist of generic titles to reject during title generation.

These titles are too vague to be useful and should trigger a retry
or fallback to extracting keywords from the user's message.
"""

GENERIC_TITLES = frozenset(
    {
        # AI/Assistant references
        "ai assistance",
        "ai help",
        "ai chat",
        "assistant help",
        "assistance request",
        # Generic help
        "help request",
        "help needed",
        "need help",
        "help with code",
        "coding help",
        "programming help",
        # Generic session/chat
        "chat session",
        "new chat",
        "conversation",
        "new conversation",
        # Generic query/question
        "general query",
        "technical question",
        "user request",
        "user query",
        "question",
        "query",
        "request",
        # Generic topics
        "code review",
        "code help",
        "debugging help",
        "development help",
        "software help",
    }
)


def is_generic_title(title: str) -> bool:
    """Check if a title is too generic and should be rejected.

    Args:
        title: The generated title to check.

    Returns:
        True if the title is generic and should be rejected.
    """
    normalised = title.lower().strip()
    return normalised in GENERIC_TITLES or len(normalised) < 3
