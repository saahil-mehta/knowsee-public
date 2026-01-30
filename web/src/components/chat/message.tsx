"use client";

import { cn } from "@/lib/utils";
import type { HTMLAttributes, ComponentProps } from "react";
import { memo, useMemo, useState, useEffect, useRef } from "react";
import { Streamdown } from "streamdown";
import { ChevronRightIcon } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToolCallDisplay } from "./tool-call";
import { StreamingIndicator } from "./streaming-indicator";

// Semantic tag constants - must match backend (sagent/utils/semantic_tags.py)
const THOUGHT_TAG_OPEN = "<llm:adk:soch>";
const THOUGHT_TAG_CLOSE = "</llm:adk:soch>";
const TOOL_TAG_OPEN_PATTERN = /<llm:adk:tool name="([^"]*)" id="([^"]*)">/;
const TOOL_TAG_CLOSE = "</llm:adk:tool>";
const TOOL_RESULT_TAG_OPEN_PATTERN = /<llm:adk:tool-result id="([^"]*)">/;
const TOOL_RESULT_TAG_CLOSE = "</llm:adk:tool-result>";

type ToolCallData = {
  name: string;
  id: string;
  args: Record<string, unknown>;
};

type ToolResultData = {
  id: string;
  result: unknown;
};

type ContentSegment =
  | { type: "thought"; content: string; isComplete: boolean }
  | { type: "response"; content: string; isComplete: boolean }
  | { type: "tool-call"; data: ToolCallData; isComplete: boolean }
  | { type: "tool-result"; data: ToolResultData; isComplete: boolean };

/**
 * Find the next semantic tag in the content string.
 * Returns the tag type, position, and match data, or null if no tags found.
 */
function findNextTag(content: string): {
  type: "thought" | "tool" | "tool-result";
  index: number;
  match: RegExpMatchArray | null;
} | null {
  const thoughtIdx = content.indexOf(THOUGHT_TAG_OPEN);
  const toolMatch = content.match(TOOL_TAG_OPEN_PATTERN);
  const toolResultMatch = content.match(TOOL_RESULT_TAG_OPEN_PATTERN);

  const candidates: {
    type: "thought" | "tool" | "tool-result";
    index: number;
    match: RegExpMatchArray | null;
  }[] = [];

  if (thoughtIdx !== -1) {
    candidates.push({ type: "thought", index: thoughtIdx, match: null });
  }
  if (toolMatch?.index !== undefined) {
    candidates.push({ type: "tool", index: toolMatch.index, match: toolMatch });
  }
  if (toolResultMatch?.index !== undefined) {
    candidates.push({ type: "tool-result", index: toolResultMatch.index, match: toolResultMatch });
  }

  if (candidates.length === 0) return null;

  // Return the earliest tag
  return candidates.reduce((a, b) => (a.index < b.index ? a : b));
}

/**
 * Parse message content into segments of thoughts, tool calls, tool results, and responses.
 * Handles both complete and streaming (incomplete) blocks.
 * Merges consecutive thought chunks into single blocks for consistent display.
 */
function parseContentSegments(content: string): ContentSegment[] {
  const rawSegments: ContentSegment[] = [];
  let remaining = content;

  while (remaining.length > 0) {
    const nextTag = findNextTag(remaining);

    if (!nextTag) {
      // No more tags - rest is response
      if (remaining.trim()) {
        rawSegments.push({ type: "response", content: remaining, isComplete: true });
      }
      break;
    }

    // Add any response content before this tag
    if (nextTag.index > 0) {
      const before = remaining.slice(0, nextTag.index);
      if (before.trim()) {
        rawSegments.push({ type: "response", content: before, isComplete: true });
      }
    }

    if (nextTag.type === "thought") {
      // Parse thought tag
      const afterOpen = remaining.slice(nextTag.index + THOUGHT_TAG_OPEN.length);
      const closeIdx = afterOpen.indexOf(THOUGHT_TAG_CLOSE);

      if (closeIdx === -1) {
        rawSegments.push({ type: "thought", content: afterOpen, isComplete: false });
        break;
      }

      rawSegments.push({
        type: "thought",
        content: afterOpen.slice(0, closeIdx),
        isComplete: true,
      });
      remaining = afterOpen.slice(closeIdx + THOUGHT_TAG_CLOSE.length);
    } else if (nextTag.type === "tool" && nextTag.match) {
      // Parse tool call tag: <llm:adk:tool name="..." id="...">args</llm:adk:tool>
      const [fullMatch, name, id] = nextTag.match;
      const afterOpen = remaining.slice(nextTag.index + fullMatch.length);
      const closeIdx = afterOpen.indexOf(TOOL_TAG_CLOSE);

      if (closeIdx === -1) {
        // Incomplete tool tag - skip for now (streaming edge case)
        remaining = afterOpen;
        continue;
      }

      const argsJson = afterOpen.slice(0, closeIdx);
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(argsJson);
      } catch {
        // Invalid JSON - use empty args
      }

      rawSegments.push({
        type: "tool-call",
        data: { name, id, args },
        isComplete: true,
      });
      remaining = afterOpen.slice(closeIdx + TOOL_TAG_CLOSE.length);
    } else if (nextTag.type === "tool-result" && nextTag.match) {
      // Parse tool result tag: <llm:adk:tool-result id="...">result</llm:adk:tool-result>
      const [fullMatch, id] = nextTag.match;
      const afterOpen = remaining.slice(nextTag.index + fullMatch.length);
      const closeIdx = afterOpen.indexOf(TOOL_RESULT_TAG_CLOSE);

      if (closeIdx === -1) {
        // Incomplete result tag - skip
        remaining = afterOpen;
        continue;
      }

      const resultJson = afterOpen.slice(0, closeIdx);
      let result: unknown = null;
      try {
        result = JSON.parse(resultJson);
      } catch {
        // Invalid JSON - use raw string
        result = resultJson;
      }

      rawSegments.push({
        type: "tool-result",
        data: { id, result },
        isComplete: true,
      });
      remaining = afterOpen.slice(closeIdx + TOOL_RESULT_TAG_CLOSE.length);
    }
  }

  // Merge consecutive thought segments into single blocks
  // This handles per-chunk tagging during streaming
  const merged: ContentSegment[] = [];
  for (const segment of rawSegments) {
    const last = merged[merged.length - 1];
    if (last?.type === "thought" && segment.type === "thought") {
      // Merge: combine content, inherit streaming state from latest
      last.content += "\n\n" + segment.content;
      last.isComplete = segment.isComplete;
    } else {
      merged.push({ ...segment });
    }
  }

  // Pair tool calls with their results for combined display
  return mergeToolCallsWithResults(merged);
}

/**
 * Merge tool-call segments with their corresponding tool-result segments.
 * This creates a single display unit showing both the call and its result.
 */
function mergeToolCallsWithResults(segments: ContentSegment[]): ContentSegment[] {
  const result: ContentSegment[] = [];
  const pendingResults = new Map<string, ToolResultData>();

  // First pass: collect all results by ID
  for (const segment of segments) {
    if (segment.type === "tool-result") {
      pendingResults.set(segment.data.id, segment.data);
    }
  }

  // Second pass: merge calls with results, skip standalone results
  for (const segment of segments) {
    if (segment.type === "tool-result") {
      // Skip - will be merged with corresponding call
      continue;
    }

    if (segment.type === "tool-call") {
      const matchingResult = pendingResults.get(segment.data.id);
      if (matchingResult) {
        // Attach result to the tool call data
        result.push({
          type: "tool-call",
          data: {
            ...segment.data,
            result: matchingResult.result,
          } as ToolCallData & { result?: unknown },
          isComplete: true,
        });
      } else {
        result.push(segment);
      }
    } else {
      result.push(segment);
    }
  }

  return result;
}

/**
 * Collapsible thought block component using Radix primitives.
 * - Auto-opens while streaming
 * - Auto-collapses immediately when complete
 * - Respects user interaction: if user toggles, stops auto-managing
 */
function ThoughtBlock({
  content,
  isComplete,
  isStreaming = false,
}: {
  content: string;
  isComplete: boolean;
  isStreaming?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const userInteractedRef = useRef(false);

  // Track user interaction to stop auto-management
  const handleOpenChange = (open: boolean) => {
    userInteractedRef.current = true;
    setIsOpen(open);
  };

  // Auto-open during streaming, auto-collapse when complete (unless user interacted)
  useEffect(() => {
    if (userInteractedRef.current) return;

    if (isStreaming) {
      setIsOpen(true);
    } else if (isComplete) {
      setIsOpen(false);
    }
  }, [isStreaming, isComplete]);

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={handleOpenChange}
      className="mb-1.5 rounded-lg border border-border/50 bg-muted/30"
    >
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRightIcon
          className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-90")}
        />
        <span>{isStreaming ? "Thinking..." : "Thought process"}</span>
        {isStreaming && <span className="ml-auto size-1.5 animate-pulse rounded-full bg-primary" />}
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down overflow-hidden border-t border-border/50 px-3 py-2 text-xs text-muted-foreground italic">
        <Streamdown className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0">{content}</Streamdown>
      </CollapsibleContent>
    </Collapsible>
  );
}

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: "user" | "assistant";
};

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    data-role={from}
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto justify-end" : "is-assistant",
      className,
    )}
    {...props}
  />
);

export type MessageContentProps = HTMLAttributes<HTMLDivElement>;

export const MessageContent = ({ children, className, ...props }: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit max-w-full min-w-0 flex-col text-sm",
      // User bubble: blue iMessage style with tail on bottom-right
      "group-[.is-user]:ml-auto group-[.is-user]:gap-2 group-[.is-user]:rounded-[20px_20px_4px_20px] group-[.is-user]:bg-bubble-user group-[.is-user]:px-4 group-[.is-user]:py-3 group-[.is-user]:text-bubble-user-foreground",
      // Assistant: no container, content flows naturally (tool/thought blocks have their own borders)
      "group-[.is-assistant]:text-foreground",
      className,
    )}
    {...props}
  >
    {children}
  </div>
);

export type MessageResponseProps = ComponentProps<typeof Streamdown> & {
  isStreaming?: boolean;
};

export const MessageResponse = memo(
  ({ className, children, isStreaming = false, ...props }: MessageResponseProps) => {
    // Parse content into thought blocks and response segments
    const segments = useMemo(
      () => (typeof children === "string" ? parseContentSegments(children) : []),
      [children],
    );

    // If no segments (non-string children), render directly
    if (segments.length === 0 && typeof children !== "string") {
      return (
        <Streamdown
          className={cn("size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0", className)}
          {...props}
        >
          {children}
        </Streamdown>
      );
    }

    return (
      <div className={cn("size-full", className)}>
        {segments.map((segment, idx) => {
          if (segment.type === "thought") {
            return (
              <ThoughtBlock
                key={`thought-${idx}`}
                content={segment.content}
                isComplete={segment.isComplete}
                isStreaming={isStreaming}
              />
            );
          }

          if (segment.type === "tool-call") {
            const { name, id, args } = segment.data;
            const result = (segment.data as ToolCallData & { result?: unknown }).result;
            return (
              <ToolCallDisplay
                key={`tool-${id}-${idx}`}
                name={name}
                status="complete"
                args={args}
                result={result}
              />
            );
          }

          // Response segment
          if (segment.type === "response") {
            return (
              <Streamdown
                key={`response-${idx}`}
                className="[&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                {...props}
              >
                {segment.content}
              </Streamdown>
            );
          }

          return null;
        })}

        {/* Newton's Cradle indicator - shows below streaming text */}
        {isStreaming && <StreamingIndicator size={36} />}
      </div>
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children && prevProps.isStreaming === nextProps.isStreaming,
);

MessageResponse.displayName = "MessageResponse";

export type MessageActionsProps = ComponentProps<"div">;

export const MessageActions = ({ className, children, ...props }: MessageActionsProps) => (
  <div className={cn("flex items-center gap-1", className)} {...props}>
    {children}
  </div>
);

export type MessageToolbarProps = ComponentProps<"div">;

export const MessageToolbar = ({ className, children, ...props }: MessageToolbarProps) => (
  <div className={cn("mt-4 flex w-full items-center justify-between gap-4", className)} {...props}>
    {children}
  </div>
);
