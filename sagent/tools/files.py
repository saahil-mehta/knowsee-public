"""File attachment tools for the Knowsee agent.

These tools allow the agent to discover and read files uploaded by users.
Files are stored as ADK artifacts and can be accessed within any session.

Usage flow:
1. User uploads file via /upload endpoint
2. Agent calls list_files() to see available files
3. Agent calls read_file(filename) to load and process content
"""

from google.adk.tools import ToolContext


async def list_files(tool_context: ToolContext) -> list[dict]:
    """List all files uploaded to this conversation.

    Returns a list of available files that can be read using read_file().
    Use this to discover what files the user has shared before reading them.

    Returns:
        List of file metadata dicts with 'filename' key.
        Empty list if no files have been uploaded.
    """
    import logging

    logger = logging.getLogger(__name__)

    try:
        filenames = await tool_context.list_artifacts()
        logger.debug(f"[list_files] found {len(filenames)} artifacts")
        return [{"filename": fname} for fname in filenames]
    except ValueError as e:
        # ArtifactService not configured
        logger.warning(f"[list_files] ArtifactService error: {e}")
        return []
    except Exception as e:
        logger.error(f"[list_files] unexpected error: {e}")
        return []


async def read_file(tool_context: ToolContext, filename: str) -> dict:
    """Read the contents of an uploaded file.

    Use list_files() first to discover available filenames.
    This tool loads the file content so you can analyse, summarise,
    or answer questions about it.

    Args:
        filename: The name of the file to read (from list_files output).

    Returns:
        Dict with file metadata:
        - filename: The requested filename
        - found: Whether the file exists
        - mime_type: The file's MIME type (if found)
        - size_bytes: File size in bytes (if found)
        - text_content: For text files, the decoded text content
        - tool_response_artifact_id: For binary files (images, PDFs),
          the artifact ID that will be injected into context

    Note:
        For text files, content is returned directly in text_content.
        For images and PDFs, the before_model_callback automatically
        injects the binary content into your context so you can see it.
    """
    try:
        artifact = await tool_context.load_artifact(filename=filename)

        if artifact is None:
            return {
                "filename": filename,
                "found": False,
                "error": "File not found. Use list_files() to see available files.",
            }

        # Extract metadata from the artifact
        if artifact.inline_data:
            mime_type = artifact.inline_data.mime_type
            data = artifact.inline_data.data
            size_bytes = len(data) if data else 0

            result = {
                "filename": filename,
                "found": True,
                "mime_type": mime_type,
                "size_bytes": size_bytes,
            }

            # For text files, include the actual text content directly
            if mime_type and mime_type.startswith("text/"):
                try:
                    text_content = data.decode("utf-8")
                    # Truncate very long text to avoid context overflow
                    if len(text_content) > 50000:
                        text_content = text_content[:50000] + "\n... [truncated]"
                    result["text_content"] = text_content
                except UnicodeDecodeError:
                    result["text_content"] = "[Binary content - cannot display as text]"
            else:
                # For binary files (images, PDFs), return artifact ID
                # The before_model_callback will inject the actual content
                result["tool_response_artifact_id"] = filename

            return result
        else:
            return {
                "filename": filename,
                "found": True,
                "mime_type": "unknown",
                "content_loaded": False,
                "error": "File has no inline data",
            }

    except ValueError as e:
        return {
            "filename": filename,
            "found": False,
            "error": f"Artifact service error: {e}",
        }
    except Exception as e:
        return {
            "filename": filename,
            "found": False,
            "error": f"Failed to read file: {e}",
        }
