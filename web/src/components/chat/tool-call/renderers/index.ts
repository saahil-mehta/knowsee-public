import type { ComponentType } from "react";
import type { ToolRendererProps } from "./types";
import { DataAnalystRenderer } from "./data-analyst";
import { DefaultRenderer } from "./default";
import { WebSearchRenderer } from "./web-search";

export type { ToolRendererProps } from "./types";

/**
 * Registry mapping tool names to their renderer components.
 * Add new tools here as they're implemented.
 */
const renderers: Record<string, ComponentType<ToolRendererProps>> = {
  data_analyst_agent: DataAnalystRenderer,
  web_search: WebSearchRenderer,
};

/**
 * Get the renderer component for a tool.
 * Falls back to DefaultRenderer for unknown tools.
 */
export function getRenderer(toolName: string): ComponentType<ToolRendererProps> {
  return renderers[toolName] ?? DefaultRenderer;
}

export { DataAnalystRenderer } from "./data-analyst";
export { DefaultRenderer } from "./default";
export { WebSearchRenderer } from "./web-search";
