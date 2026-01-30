"""OpenDocument format (.odt, .ods, .odp) converters.

Uses odfpy library for parsing OpenDocument files.
"""

from io import BytesIO
from xml.etree import ElementTree as ET
from zipfile import ZipFile

from .base import ConversionError, ConversionResult, strip_extension

# ODF namespace prefixes
NAMESPACES = {
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "draw": "urn:oasis:names:tc:opendocument:xmlns:drawing:1.0",
}


def convert_odt(file_bytes: bytes, filename: str) -> ConversionResult:
    """Convert OpenDocument Text (.odt) to Markdown.

    Args:
        file_bytes: Raw .odt file content
        filename: Original filename

    Returns:
        ConversionResult with Markdown content
    """
    try:
        text_content = _extract_odf_text(file_bytes, "text")
    except Exception as e:
        raise ConversionError(f"Failed to parse ODT file: {e}") from e

    new_filename = f"{strip_extension(filename)}.md"

    return ConversionResult(
        content=text_content.encode("utf-8"),
        mime_type="text/markdown",
        filename=new_filename,
    )


def convert_ods(file_bytes: bytes, filename: str) -> ConversionResult:
    """Convert OpenDocument Spreadsheet (.ods) to Markdown tables.

    Args:
        file_bytes: Raw .ods file content
        filename: Original filename

    Returns:
        ConversionResult with Markdown content
    """
    try:
        with ZipFile(BytesIO(file_bytes)) as zf:
            content_xml = zf.read("content.xml")

        root = ET.fromstring(content_xml)
        body = root.find(".//office:spreadsheet", NAMESPACES)

        if body is None:
            return ConversionResult(
                content=f"# {strip_extension(filename)}\n\n*Empty spreadsheet*".encode(),
                mime_type="text/markdown",
                filename=f"{strip_extension(filename)}.md",
            )

        markdown_sections = []
        for table in body.findall(".//table:table", NAMESPACES):
            table_name = table.get(f"{{{NAMESPACES['table']}}}name", "Sheet")
            md_table = _table_to_markdown(table, table_name)
            if md_table:
                markdown_sections.append(md_table)

        markdown_content = (
            "\n\n".join(markdown_sections)
            if markdown_sections
            else "*Empty spreadsheet*"
        )

    except Exception as e:
        raise ConversionError(f"Failed to parse ODS file: {e}") from e

    new_filename = f"{strip_extension(filename)}.md"

    return ConversionResult(
        content=markdown_content.encode("utf-8"),
        mime_type="text/markdown",
        filename=new_filename,
    )


def convert_odp(file_bytes: bytes, filename: str) -> ConversionResult:
    """Convert OpenDocument Presentation (.odp) to Markdown.

    Args:
        file_bytes: Raw .odp file content
        filename: Original filename

    Returns:
        ConversionResult with Markdown content
    """
    try:
        text_content = _extract_odf_text(file_bytes, "presentation")
    except Exception as e:
        raise ConversionError(f"Failed to parse ODP file: {e}") from e

    new_filename = f"{strip_extension(filename)}.md"

    return ConversionResult(
        content=text_content.encode("utf-8"),
        mime_type="text/markdown",
        filename=new_filename,
    )


def _extract_odf_text(file_bytes: bytes, doc_type: str) -> str:
    """Extract text content from an ODF file."""
    with ZipFile(BytesIO(file_bytes)) as zf:
        content_xml = zf.read("content.xml")

    root = ET.fromstring(content_xml)

    # Find the body element based on document type
    if doc_type == "text":
        body = root.find(".//office:text", NAMESPACES)
    elif doc_type == "presentation":
        body = root.find(".//office:presentation", NAMESPACES)
    else:
        body = root.find(".//office:body", NAMESPACES)

    if body is None:
        return "*Empty document*"

    # Extract all text recursively
    texts = []
    for elem in body.iter():
        if elem.text:
            text = elem.text.strip()
            if text:
                # Check if it's a heading
                tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag
                if tag == "h":
                    level = elem.get(f"{{{NAMESPACES['text']}}}outline-level", "1")
                    texts.append(f"{'#' * int(level)} {text}")
                elif tag == "p":
                    texts.append(text)
                elif tag == "list-item":
                    texts.append(f"- {text}")

    return "\n\n".join(texts) if texts else "*Empty document*"


def _table_to_markdown(table_elem, table_name: str) -> str | None:
    """Convert an ODF table element to Markdown."""
    rows = []
    for row_elem in table_elem.findall(".//table:table-row", NAMESPACES):
        cells = []
        for cell_elem in row_elem.findall("table:table-cell", NAMESPACES):
            # Get cell text
            cell_text = ""
            for p in cell_elem.findall(".//text:p", NAMESPACES):
                if p.text:
                    cell_text += p.text
            cells.append(cell_text.strip().replace("|", "\\|"))
        if cells:
            rows.append(cells)

    if not rows:
        return None

    # Build markdown
    lines = [f"## {table_name}", ""]

    # Normalise column count
    max_cols = max(len(row) for row in rows)
    for row in rows:
        while len(row) < max_cols:
            row.append("")

    # Header
    lines.append("| " + " | ".join(rows[0]) + " |")
    lines.append("| " + " | ".join(["---"] * max_cols) + " |")

    # Data
    for row in rows[1:]:
        lines.append("| " + " | ".join(row) + " |")

    return "\n".join(lines)
