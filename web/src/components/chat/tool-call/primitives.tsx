"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  CheckCircleIcon,
  ChevronRightIcon,
  CircleIcon,
  ClockIcon,
  DatabaseIcon,
  SearchIcon,
} from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

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

/**
 * Get the appropriate icon for a tool
 */
function getToolIcon(name: string) {
  if (name === "data_analyst_agent") {
    return <DatabaseIcon className="size-3.5" />;
  }
  return <SearchIcon className="size-3.5" />;
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
      {getToolIcon(name)}
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
  const values = Object.values(input);
  const displayValue = values.length === 1 && typeof values[0] === "string" ? values[0] : null;

  if (displayValue) {
    return (
      <div className={cn("py-1", className)} {...props}>
        <span className="italic">&quot;{displayValue}&quot;</span>
      </div>
    );
  }

  return (
    <div className={cn("py-1", className)} {...props}>
      <pre className="overflow-auto font-mono text-xs whitespace-pre-wrap">
        {JSON.stringify(input, null, 2)}
      </pre>
    </div>
  );
}
