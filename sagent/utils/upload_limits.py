"""Upload limits and constraints - single source of truth.

This module defines all upload-related constraints for file attachments.
The frontend fetches these values via /api/upload/config instead of
duplicating them.

Contents:
- MIME types (what file types are accepted)
- MAX_FILE_SIZE_BYTES (per-file size limit)
- MAX_FILES (files per message limit)

MIME types are file types natively supported by Gemini without preprocessing.
Office formats (Excel, PowerPoint) are NOT supported - they would need
conversion to PDF or text first.

To add new types:
1. Verify Gemini supports the format natively
2. Add to the appropriate category below
3. Test with a sample file

Reference: https://cloud.google.com/vertex-ai/generative-ai/docs/multimodal/send-multimodal-prompts
"""

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
}

# Audio - Gemini native support (optional, can enable if needed)
AUDIO_TYPES = {
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
}

# Video - Gemini native support (optional, can enable if needed)
VIDEO_TYPES = {
    "video/mp4",
    "video/webm",
}

# Combined set of all supported types
# Modify this to include/exclude categories as needed
SUPPORTED_MIME_TYPES = (
    IMAGE_TYPES | DOCUMENT_TYPES | TEXT_TYPES
    # | AUDIO_TYPES  # Uncomment to enable audio
    # | VIDEO_TYPES  # Uncomment to enable video
)

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
