"""Base types and utilities for file converters."""

from dataclasses import dataclass


@dataclass
class ConversionResult:
    """Result of a file conversion."""

    content: bytes
    mime_type: str
    filename: str  # New filename with appropriate extension


class ConversionError(Exception):
    """Raised when file conversion fails."""

    pass


# MIME types that require conversion
CONVERTIBLE_MIME_TYPES = {
    # Modern Office formats (OpenXML)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    # Legacy Office formats
    "application/msword",  # .doc
    "application/vnd.ms-excel",  # .xls
    "application/vnd.ms-powerpoint",  # .ppt
    # OpenDocument formats
    "application/vnd.oasis.opendocument.text",  # .odt
    "application/vnd.oasis.opendocument.spreadsheet",  # .ods
    "application/vnd.oasis.opendocument.presentation",  # .odp
    # Rich text
    "application/rtf",  # .rtf
    "text/rtf",
}


def needs_conversion(mime_type: str) -> bool:
    """Check if a MIME type needs conversion for LLM consumption."""
    return mime_type in CONVERTIBLE_MIME_TYPES


def strip_extension(filename: str) -> str:
    """Remove file extension from filename."""
    if "." in filename:
        return filename.rsplit(".", 1)[0]
    return filename
