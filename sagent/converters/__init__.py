"""File converters for non-native LLM formats.

Converts documents to LLM-friendly Markdown:
- .docx, .doc, .odt, .rtf → Markdown (preserves structure)
- .xlsx, .xls, .ods → Markdown tables (all sheets preserved)
- .pptx, .ppt, .odp → Markdown (text + speaker notes)

Usage:
    from converters import convert_file, needs_conversion

    if needs_conversion(mime_type):
        result = convert_file(file_bytes, mime_type, filename)
        # result.content = converted bytes
        # result.mime_type = "text/markdown"
        # result.filename = "original.md"
"""

from .base import ConversionResult, needs_conversion
from .docx import convert_docx
from .odf import convert_odp, convert_ods, convert_odt
from .pptx import convert_pptx
from .rtf import convert_rtf
from .xlsx import convert_xlsx

# MIME type to converter mapping
_CONVERTERS = {
    # Microsoft Office - Modern (OpenXML)
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": convert_docx,  # .docx
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": convert_xlsx,  # .xlsx
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": convert_pptx,  # .pptx
    # Microsoft Office - Legacy (limited support via same converters)
    "application/msword": convert_docx,  # .doc
    "application/vnd.ms-excel": convert_xlsx,  # .xls
    "application/vnd.ms-powerpoint": convert_pptx,  # .ppt
    # OpenDocument formats
    "application/vnd.oasis.opendocument.text": convert_odt,  # .odt
    "application/vnd.oasis.opendocument.spreadsheet": convert_ods,  # .ods
    "application/vnd.oasis.opendocument.presentation": convert_odp,  # .odp
    # Rich text
    "application/rtf": convert_rtf,  # .rtf
    "text/rtf": convert_rtf,
}


def convert_file(
    file_bytes: bytes,
    mime_type: str,
    filename: str,
) -> ConversionResult:
    """Convert a file to an LLM-friendly format.

    Args:
        file_bytes: Raw file content
        mime_type: Original MIME type
        filename: Original filename (for context)

    Returns:
        ConversionResult with converted content and new MIME type

    Raises:
        ValueError: If no converter exists for the MIME type
        ConversionError: If conversion fails
    """
    converter = _CONVERTERS.get(mime_type)
    if not converter:
        raise ValueError(f"No converter for MIME type: {mime_type}")

    return converter(file_bytes, filename)


__all__ = [
    "convert_file",
    "needs_conversion",
    "ConversionResult",
]
