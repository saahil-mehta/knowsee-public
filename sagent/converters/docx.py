"""Word document (.docx) to Markdown converter."""

from io import BytesIO

from docx import Document
from docx.table import Table
from docx.text.paragraph import Paragraph

from .base import ConversionError, ConversionResult, strip_extension


def convert_docx(file_bytes: bytes, filename: str) -> ConversionResult:
    """Convert a Word document to Markdown.

    Extracts:
    - Paragraphs with heading levels
    - Lists (bulleted and numbered)
    - Tables
    - Basic text formatting (bold, italic)

    Args:
        file_bytes: Raw .docx file content
        filename: Original filename

    Returns:
        ConversionResult with Markdown content
    """
    try:
        doc = Document(BytesIO(file_bytes))
    except Exception as e:
        raise ConversionError(f"Failed to parse Word document: {e}") from e

    markdown_lines: list[str] = []

    for element in doc.element.body:
        # Handle paragraphs
        if element.tag.endswith("p"):
            para = Paragraph(element, doc)
            md_line = _paragraph_to_markdown(para)
            if md_line:
                markdown_lines.append(md_line)

        # Handle tables
        elif element.tag.endswith("tbl"):
            table = Table(element, doc)
            md_table = _table_to_markdown(table)
            if md_table:
                markdown_lines.append("")  # Blank line before table
                markdown_lines.append(md_table)
                markdown_lines.append("")  # Blank line after table

    markdown_content = "\n".join(markdown_lines)

    new_filename = f"{strip_extension(filename)}.md"

    return ConversionResult(
        content=markdown_content.encode("utf-8"),
        mime_type="text/markdown",
        filename=new_filename,
    )


def _paragraph_to_markdown(para: Paragraph) -> str:
    """Convert a paragraph to Markdown."""
    text = para.text.strip()
    if not text:
        return ""

    # Handle headings
    style_name = para.style.name.lower() if para.style else ""
    if "heading 1" in style_name:
        return f"# {text}"
    elif "heading 2" in style_name:
        return f"## {text}"
    elif "heading 3" in style_name:
        return f"### {text}"
    elif "heading 4" in style_name:
        return f"#### {text}"
    elif "title" in style_name:
        return f"# {text}"

    # Handle list items
    if "list" in style_name or "bullet" in style_name:
        return f"- {text}"

    # Regular paragraph with inline formatting
    return _apply_inline_formatting(para)


def _apply_inline_formatting(para: Paragraph) -> str:
    """Apply bold/italic formatting to paragraph text."""
    parts: list[str] = []

    for run in para.runs:
        text = run.text
        if not text:
            continue

        if run.bold and run.italic:
            parts.append(f"***{text}***")
        elif run.bold:
            parts.append(f"**{text}**")
        elif run.italic:
            parts.append(f"*{text}*")
        else:
            parts.append(text)

    return "".join(parts)


def _table_to_markdown(table: Table) -> str:
    """Convert a table to Markdown format."""
    if not table.rows:
        return ""

    rows: list[list[str]] = []
    for row in table.rows:
        cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
        rows.append(cells)

    if not rows:
        return ""

    # Build markdown table
    lines: list[str] = []

    # Header row
    header = rows[0]
    lines.append("| " + " | ".join(header) + " |")

    # Separator
    lines.append("| " + " | ".join(["---"] * len(header)) + " |")

    # Data rows
    for row in rows[1:]:
        # Pad row if needed
        while len(row) < len(header):
            row.append("")
        lines.append("| " + " | ".join(row[: len(header)]) + " |")

    return "\n".join(lines)
