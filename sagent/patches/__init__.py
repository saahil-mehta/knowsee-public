"""Monkey patches for third-party packages.

This module applies patches to external dependencies that cannot be modified directly.
Import this module early in application startup (before the patched modules are used).

Current patches:
- ag_ui_adk.EventTranslator: Preserves thought/reasoning content with semantic tags
"""

from .thought_tags import apply_thought_tag_patch

# Apply all patches on import
apply_thought_tag_patch()
