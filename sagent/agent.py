"""Re-export root agent for main.py compatibility.

The actual agent definition lives in agents/root.py.
"""

from agents import root_agent

__all__ = ["root_agent"]
