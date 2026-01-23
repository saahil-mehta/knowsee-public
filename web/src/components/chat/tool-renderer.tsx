"use client";

import { useDefaultTool } from "@copilotkit/react-core";
import { useStreamingContext } from "./conversation";
import { ToolCallDisplay, type ToolStatus } from "./tool-call";

/**
 * Registers a default tool renderer for all backend tool calls.
 *
 * This component uses CopilotKit's useDefaultTool hook to catch all tool calls
 * from the ADK backend and render them with the ToolCallDisplay component.
 *
 * Must be rendered inside the CopilotKit provider and Conversation context.
 */
export function ToolRenderer() {
  const isStreaming = useStreamingContext();

  useDefaultTool({
    render: ({ name, args, status, result }) => (
      <ToolCallDisplay
        name={name}
        status={status as ToolStatus}
        args={args as Record<string, unknown>}
        result={result}
        isStreaming={isStreaming}
      />
    ),
  });

  return null;
}
