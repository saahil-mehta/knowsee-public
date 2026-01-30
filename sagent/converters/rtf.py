"""Rich Text Format (.rtf) to Markdown converter.

Simple RTF text extraction - strips formatting codes and extracts plain text.
For complex RTF with images/tables, some content may be simplified.
"""

import re

from .base import ConversionError, ConversionResult, strip_extension


def convert_rtf(file_bytes: bytes, filename: str) -> ConversionResult:
    """Convert RTF document to Markdown.

    Extracts text content, preserving paragraph structure.
    RTF formatting codes are stripped.

    Args:
        file_bytes: Raw .rtf file content
        filename: Original filename

    Returns:
        ConversionResult with Markdown content
    """
    try:
        # Decode RTF (usually ASCII/Latin-1 with escape sequences)
        try:
            rtf_text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            rtf_text = file_bytes.decode("latin-1")

        # Extract text content
        text_content = _strip_rtf(rtf_text)

        if not text_content.strip():
            text_content = "*Empty document*"

    except Exception as e:
        raise ConversionError(f"Failed to parse RTF file: {e}") from e

    new_filename = f"{strip_extension(filename)}.md"

    return ConversionResult(
        content=text_content.encode("utf-8"),
        mime_type="text/markdown",
        filename=new_filename,
    )


def _strip_rtf(rtf_text: str) -> str:
    """Strip RTF control codes and extract plain text.

    Based on the RTF specification - handles:
    - Control words (\\word)
    - Control symbols (\\*)
    - Groups ({})
    - Special characters
    """
    # Remove RTF header
    if not rtf_text.startswith("{\\rtf"):
        return rtf_text  # Not actually RTF

    result = []
    i = 0
    skip_group_depth = 0

    while i < len(rtf_text):
        char = rtf_text[i]

        # Track group depth for skipping
        if char == "{":
            # Check if this is a group to skip (images, fonts, etc.)
            rest = rtf_text[i : i + 20]
            if (
                any(
                    skip in rest
                    for skip in [
                        "\\pict",
                        "\\fonttbl",
                        "\\colortbl",
                        "\\stylesheet",
                        "\\*\\",
                    ]
                )
                or skip_group_depth > 0
            ):
                skip_group_depth += 1
            i += 1
            continue

        if char == "}":
            if skip_group_depth > 0:
                skip_group_depth -= 1
            i += 1
            continue

        # Skip content in skipped groups
        if skip_group_depth > 0:
            i += 1
            continue

        # Handle control sequences
        if char == "\\":
            if i + 1 >= len(rtf_text):
                break

            next_char = rtf_text[i + 1]

            # Escaped characters
            if next_char in "\\{}":
                result.append(next_char)
                i += 2
                continue

            # Special characters - hex escape \'xx
            if next_char == "'" and i + 3 < len(rtf_text):
                try:
                    hex_val = rtf_text[i + 2 : i + 4]
                    result.append(chr(int(hex_val, 16)))
                except ValueError:
                    pass
                i += 4
                continue

            # Control word
            match = re.match(r"\\([a-z]+)(-?\d+)?[ ]?", rtf_text[i:])
            if match:
                word = match.group(1)
                # Handle special control words
                if word == "par":
                    result.append("\n\n")
                elif word == "line":
                    result.append("\n")
                elif word == "tab":
                    result.append("\t")
                elif word in ("b", "i", "ul"):  # Bold, italic, underline - skip
                    pass
                i += len(match.group(0))
                continue

            # Unknown control - skip
            i += 1
            continue

        # Regular character
        if char not in "\r\n":  # RTF uses \par for line breaks
            result.append(char)
        i += 1

    # Clean up result
    text = "".join(result)

    # Normalise whitespace
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = text.strip()

    return text
