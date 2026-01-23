"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, ChevronRightIcon, CircleIcon, ClockIcon, SearchIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { isValidElement, useState, useRef, useEffect } from "react";
import { Streamdown } from "streamdown";
import { extractGroundingData, GroundingDisplay } from "./grounding-display";

/**
 * CopilotKit tool status values from useDefaultTool/useRenderToolCall
 */
export type ToolStatus = "inProgress" | "executing" | "complete";

export type ToolCallProps = ComponentProps<typeof Collapsible>;

export function ToolCall({ className, ...props }: ToolCallProps) {
  return (
    <Collapsible
      className={cn("mb-1.5 rounded-lg border border-border/50 bg-muted/30", className)}
      {...props}
    />
  );
}

export type ToolCallHeaderProps = {
  name: string;
  status: ToolStatus;
  isOpen?: boolean;
  className?: string;
};

function getStatusIndicator(status: ToolStatus) {
  const icons: Record<ToolStatus, ReactNode> = {
    inProgress: <CircleIcon className="size-3 animate-pulse text-muted-foreground" />,
    executing: <ClockIcon className="size-3 animate-pulse text-primary" />,
    complete: <CheckCircleIcon className="size-3 text-green-600" />,
  };

  const labels: Record<ToolStatus, string> = {
    inProgress: "Pending",
    executing: "Running",
    complete: "Completed",
  };

  return (
    <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
      {icons[status]}
      <span>{labels[status]}</span>
    </span>
  );
}

/**
 * Format tool name for display - converts snake_case to Title Case
 */
function formatToolName(name: string): string {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function ToolCallHeader({
  className,
  name,
  status,
  isOpen = false,
  ...props
}: ToolCallHeaderProps) {
  return (
    <CollapsibleTrigger
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      {...props}
    >
      <ChevronRightIcon
        className={cn("size-3.5 transition-transform duration-200", isOpen && "rotate-90")}
      />
      <SearchIcon className="size-3.5" />
      <span>{formatToolName(name)}</span>
      {getStatusIndicator(status)}
    </CollapsibleTrigger>
  );
}

export type ToolCallContentProps = ComponentProps<typeof CollapsibleContent>;

export function ToolCallContent({ className, ...props }: ToolCallContentProps) {
  return (
    <CollapsibleContent
      className={cn(
        "data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down overflow-hidden border-t border-border/50 px-3 py-2 text-xs text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export type ToolCallInputProps = ComponentProps<"div"> & {
  input: Record<string, unknown>;
};

export function ToolCallInput({ className, input, ...props }: ToolCallInputProps) {
  // Extract the main value for compact display
  const values = Object.values(input);
  const displayValue = values.length === 1 && typeof values[0] === "string" ? values[0] : null;

  if (displayValue) {
    // Compact single-value display
    return (
      <div className={cn("py-1", className)} {...props}>
        <span className="italic">&quot;{displayValue}&quot;</span>
      </div>
    );
  }

  // Full JSON display for complex inputs
  return (
    <div className={cn("py-1", className)} {...props}>
      <pre className="overflow-auto font-mono text-xs whitespace-pre-wrap">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  );
}

export type ToolCallOutputProps = ComponentProps<"div"> & {
  output: unknown;
  error?: string;
};

/**
 * Extract displayable text from tool output.
 * Handles common patterns like {result: "..."} and cleans up escape sequences.
 */
function extractResultText(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (typeof output === "object" && output !== null && !isValidElement(output)) {
    const obj = output as Record<string, unknown>;
    // Common patterns: {result: "..."} or {response: "..."} or {content: "..."}
    const textKey = ["result", "response", "content", "text", "message"].find(
      (key) => typeof obj[key] === "string",
    );
    if (textKey) {
      return obj[textKey] as string;
    }
  }

  return null;
}

/**
 * Clean up escape sequences for display.
 */
function cleanResultText(text: string): string {
  return text
    .replace(/\\n/g, "\n") // Escaped newlines
    .replace(/\\"/g, '"') // Escaped quotes
    .replace(/\\t/g, "\t"); // Escaped tabs
}

export function ToolCallOutput({ className, output, error, ...props }: ToolCallOutputProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!(output || error)) {
    return null;
  }

  let displayContent: ReactNode;
  let groundingContent: ReactNode = null;

  if (error) {
    displayContent = <span className="text-destructive">{error}</span>;
  } else {
    const resultText = extractResultText(output);

    if (resultText) {
      // Clean escape sequences first
      const escapeCleaned = cleanResultText(resultText);

      // Extract grounding data (queries + sources) and get text without semantic tags
      const { data: groundingData, cleanedText } = extractGroundingData(escapeCleaned);

      const isLong = cleanedText.length > 300;
      const previewText = isLong ? cleanedText.slice(0, 300) + "..." : cleanedText;

      displayContent = (
        <div className="text-xs text-muted-foreground">
          {isLong ? (
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
              <CollapsibleContent>
                <Streamdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {cleanedText}
                </Streamdown>
              </CollapsibleContent>
              {!isExpanded && (
                <Streamdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                  {previewText}
                </Streamdown>
              )}
              <CollapsibleTrigger className="mt-2 text-[10px] text-primary hover:underline">
                {isExpanded ? "Show less" : "Show more"}
              </CollapsibleTrigger>
            </Collapsible>
          ) : (
            <Streamdown className="prose prose-sm prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              {cleanedText}
            </Streamdown>
          )}
        </div>
      );

      // Render grounding pills if data was extracted
      if (groundingData) {
        groundingContent = <GroundingDisplay data={groundingData} />;
      }
    } else if (typeof output === "object" && !isValidElement(output)) {
      // Fallback: show JSON for complex objects
      displayContent = (
        <pre className="overflow-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {JSON.stringify(output, null, 2)}
        </pre>
      );
    } else {
      displayContent = <span className="text-muted-foreground">{output as ReactNode}</span>;
    }
  }

  return (
    <div className={cn("mt-2 border-t border-border/30 pt-2", className)} {...props}>
      <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
        {error ? "Error" : "Synopsis"}
      </span>
      <div className="mt-1">{displayContent}</div>
      {groundingContent}
    </div>
  );
}

/**
 * Composed ToolCall component for easy use with CopilotKit's useDefaultTool
 * Matches the subtle style of ThoughtBlock - compact, no heavy borders
 * - Stays open while streaming
 * - web_search: collapses 4s after streaming ends (response final)
 * - Other tools: collapse immediately when complete
 * - Respects user interaction: if user toggles, stops auto-managing
 */
export type ToolCallDisplayProps = {
  name: string;
  status: ToolStatus;
  args: Record<string, unknown>;
  result?: unknown;
  error?: string;
  /** Whether the overall response is still streaming */
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
  // (state changes from open→closed caused re-render artifacts)
  const [isOpen, setIsOpen] = useState(!isWebSearch);
  const userInteractedRef = useRef(false);

  const handleOpenChange = (open: boolean) => {
    userInteractedRef.current = true;
    setIsOpen(open);
  };

  // Collapse logic:
  // - web_search: always collapsed (avoids flicker, user can expand manually)
  // - Other tools: stay open while streaming, collapse when complete
  useEffect(() => {
    if (userInteractedRef.current) return;

    // web_search stays collapsed (user can manually open)
    if (isWebSearch) return;

    // While streaming, ensure we're open
    if (isStreaming) {
      setIsOpen(true);
      return;
    }

    // Streaming ended - collapse immediately when complete
    if (status === "complete") {
      setIsOpen(false);
    }
  }, [isStreaming, isWebSearch, status]);

  // Hide input for web_search only when complete (grounding pills show queries instead)
  // During execution, always show input so user sees what's being searched
  const shouldHideInput = name === "web_search" && status === "complete";

  return (
    <ToolCall open={isOpen} onOpenChange={handleOpenChange}>
      <ToolCallHeader name={name} status={status} isOpen={isOpen} />
      <ToolCallContent>
        {!shouldHideInput && <ToolCallInput input={args} />}
        {status === "complete" && <ToolCallOutput output={result} error={error} />}
      </ToolCallContent>
    </ToolCall>
  );
}
