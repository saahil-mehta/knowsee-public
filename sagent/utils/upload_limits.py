"""Upload limits and constraints - single source of truth.

This module defines all upload-related constraints for file attachments.
The frontend fetches these values via /api/upload/config instead of
duplicating them.

Contents:
- MIME types (what file types are accepted)
- MAX_FILE_SIZE_BYTES (per-file size limit)
- MAX_FILES (files per message limit)

File types are split into two categories:
1. Native: Supported by Gemini directly (images, PDF, text)
2. Convertible: Office formats that get converted to Markdown before processing

To add new types:
1. For native types: Add to the appropriate category below
2. For convertible types: Add to CONVERTIBLE_TYPES and implement converter

Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-multimodal-prompts
"""

# =============================================================================
# Native types - Gemini supports these directly
# =============================================================================

# Images - Gemini native support
IMAGE_TYPES = {
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
}

# Documents - Gemini native support
DOCUMENT_TYPES = {
    "application/pdf",
}

# Text - Gemini native support
TEXT_TYPES = {
    "text/plain",
    "text/csv",
    "text/markdown",
    "text/html",
}

# Audio - Gemini native support (optional)
AUDIO_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
}

# Video - Gemini native support (optional)
VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
}

# =============================================================================
# Convertible types - Converted to Markdown before processing
# =============================================================================

# Office documents - converted to Markdown by sagent/converters/
OFFICE_TYPES = {
    # Word documents
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # .docx
    "application/msword",  # .doc
    # Excel spreadsheets
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",  # .xlsx
    "application/vnd.ms-excel",  # .xls
    # PowerPoint presentations
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",  # .pptx
    "application/vnd.ms-powerpoint",  # .ppt
}

# OpenDocument formats - converted to Markdown
OPENDOCUMENT_TYPES = {
    "application/vnd.oasis.opendocument.text",  # .odt
    "application/vnd.oasis.opendocument.spreadsheet",  # .ods
    "application/vnd.oasis.opendocument.presentation",  # .odp
}

# Rich text - converted to Markdown
RICH_TEXT_TYPES = {
    "application/rtf",  # .rtf
    "text/rtf",
}

# All convertible types
CONVERTIBLE_TYPES = OFFICE_TYPES | OPENDOCUMENT_TYPES | RICH_TEXT_TYPES

# =============================================================================
# Combined supported types
# =============================================================================

# Native types that Gemini handles directly
NATIVE_MIME_TYPES = (
    IMAGE_TYPES | DOCUMENT_TYPES | TEXT_TYPES
    # | AUDIO_TYPES  # Uncomment to enable audio
    # | VIDEO_TYPES  # Uncomment to enable video
)

# All supported types (native + convertible)
SUPPORTED_MIME_TYPES = NATIVE_MIME_TYPES | CONVERTIBLE_TYPES

# File size limit (25MB)
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

# Maximum files per message
MAX_FILES = 5


def is_supported_mime_type(mime_type: str) -> bool:
    """Check if a MIME type is supported for upload."""
    return mime_type in SUPPORTED_MIME_TYPES


def get_supported_types_list() -> list[str]:
    """Get sorted list of supported MIME types for error messages."""
    return sorted(SUPPORTED_MIME_TYPES)
