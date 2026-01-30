"""Data analyst sub-agent for BigQuery queries.

This agent handles data exploration and visualisation requests.
It is wrapped as an AgentTool for use by the root agent.

Architecture:
    Root Agent → AgentTool(data_analyst_agent) → BigQuery
                                                     ↓
                                          Query results + widgets

Query attempts are tracked in session state and embedded in responses
via the capture_query_attempts callback for frontend display.
"""

from google.adk.agents import LlmAgent

from agents.data_analyst.tools import describe_table, list_datasets, query_data
from callbacks.data_analyst import data_analyst_after_model_callback
from instructions import data_analyst_instruction

data_analyst_agent = LlmAgent(
    name="data_analyst_agent",
    model="gemini-2.5-pro",  # Pro for better SQL generation
    description=(
        "Queries BigQuery datasets and creates data visualisations. "
        "Use this agent when users ask about data, metrics, analytics, "
        "charts, dashboards, or want to explore business data. "
        "Results appear as interactive charts in the dashboard."
    ),
    tools=[query_data, list_datasets, describe_table],
    instruction=data_analyst_instruction,
    after_model_callback=data_analyst_after_model_callback,
)
