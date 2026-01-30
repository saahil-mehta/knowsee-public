"use client";

import { useEffect, useRef, useState } from "react";
import {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallInput,
  type ToolStatus,
} from "./primitives";
import { getRenderer } from "./renderers";

// Re-export primitives for direct use
export {
  ToolCall,
  ToolCallContent,
  ToolCallHeader,
  ToolCallInput,
  type ToolCallContentProps,
  type ToolCallHeaderProps,
  type ToolCallInputProps,
  type ToolCallProps,
  type ToolStatus,
} from "./primitives";

/**
 * Composed ToolCall component for easy use with CopilotKit's useDefaultTool.
 * Uses the renderer registry to display tool-specific output.
 *
 * Behaviour:
 * - Stays open while streaming
 * - web_search: starts collapsed (avoids flicker)
 * - Other tools: collapse when complete
 * - Respects user interaction
 */
export type ToolCallDisplayProps = {
  name: string;
  status: ToolStatus;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  isStreaming?: boolean;
};

export function ToolCallDisplay({
  name,
  status,
  args,
  result,
  error,
  isStreaming = false,
}: ToolCallDisplayProps) {
  const isWebSearch = name === "web_search";

  // web_search starts collapsed to avoid flicker during streaming
  const [isOpen, setIsOpen] = useState(!isWebSearch);
  const userInteractedRef = useRef(false);

  const handleOpenChange = (open: boolean) => {
    userInteractedRef.current = true;
    setIsOpen(open);
  };

  useEffect(() => {
    if (userInteractedRef.current) return;

    // web_search stays collapsed (user can manually open)
    if (isWebSearch) return;

    // While streaming, ensure we're open
    if (isStreaming) {
      setIsOpen(true);
      return;
    }

    // Streaming ended - collapse when complete
    if (status === "complete") {
      setIsOpen(false);
    }
  }, [isStreaming, isWebSearch, status]);

  // Hide input for web_search when complete (grounding pills show queries)
  const shouldHideInput = name === "web_search" && status === "complete";

  // Get the appropriate renderer for this tool
  const Renderer = getRenderer(name);

  return (
    <ToolCall open={isOpen} onOpenChange={handleOpenChange}>
      <ToolCallHeader name={name} status={status} isOpen={isOpen} />
      <ToolCallContent>
        {!shouldHideInput && <ToolCallInput input={args} />}
        {status === "complete" && <Renderer args={args} output={result} error={error} />}
      </ToolCallContent>
    </ToolCall>
  );
}
