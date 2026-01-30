"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { CheckCircle2Icon, ChevronDownIcon, XCircleIcon } from "lucide-react";
import { useState } from "react";
import { formatBytes } from "./utils";

/**
 * Single query attempt from the data analyst agent.
 */
export type QueryAttempt = {
  query: string;
  success: boolean;
  error: string | null;
  bytes_processed: number;
  row_count: number;
};

/**
 * Data structure for query attempts metadata.
 */
export type QueryAttemptsData = {
  attempts: QueryAttempt[];
};

/**
 * Extract query attempts data from text containing semantic tags.
 * Returns the parsed data and the cleaned text with tags removed.
 */
export function extractQueryAttemptsData(text: string): {
  data: QueryAttemptsData | null;
  cleanedText: string;
} {
  const markers = ["<llm:data:queries>", "llm:data:queries{"];
  let markerIdx = -1;
  let jsonStartOffset = 0;

  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      markerIdx = idx;
      jsonStartOffset = marker === "llm:data:queries{" ? "llm:data:queries".length : marker.length;
      break;
    }
  }

  if (markerIdx === -1) {
    return { data: null, cleanedText: text };
  }

  // Find the JSON by brace counting
  const jsonStart = markerIdx + jsonStartOffset;
  let braceCount = 0;
  let jsonEnd = -1;

  for (let i = jsonStart; i < text.length; i++) {
    const char = text[i];
    if (char === "{") {
      braceCount++;
    } else if (char === "}") {
      braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }
  }

  if (jsonEnd === -1) {
    return { data: null, cleanedText: text };
  }

  const jsonStr = text.slice(jsonStart, jsonEnd);
  const beforeTag = text.slice(0, markerIdx);

  // Remove trailing close tag
  let afterTag = text.slice(jsonEnd);
  const closeTags = ["</llm:data:queries>", "&lt;/llm:data:queries&gt;"];
  for (const closeTag of closeTags) {
    if (afterTag.startsWith(closeTag)) {
      afterTag = afterTag.slice(closeTag.length);
      break;
    }
  }

  const cleanedText = (beforeTag + afterTag).trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return {
      data: {
        attempts: parsed.attempts || [],
      },
      cleanedText,
    };
  } catch {
    return { data: null, cleanedText: text };
  }
}

type QueryAttemptItemProps = {
  attempt: QueryAttempt;
  index: number;
  isLast: boolean;
};

function QueryAttemptItem({ attempt, index, isLast }: QueryAttemptItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="-mx-2 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-muted/30">
        {attempt.success ? (
          <CheckCircle2Icon className="size-3.5 shrink-0 text-green-500" />
        ) : (
          <XCircleIcon className="size-3.5 shrink-0 text-red-500" />
        )}
        <span className="text-[11px] text-muted-foreground">Query {index + 1}</span>
        {attempt.success && (
          <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
            {formatBytes(attempt.bytes_processed)} · {attempt.row_count.toLocaleString()} rows
          </Badge>
        )}
        {!attempt.success && (
          <Badge variant="destructive" className="h-4 px-1.5 py-0 text-[10px]">
            Failed
          </Badge>
        )}
        {isLast && attempt.success && (
          <Badge className="h-4 bg-green-600 px-1.5 py-0 text-[10px]">Final</Badge>
        )}
        <ChevronDownIcon
          className={cn(
            "ml-auto size-3 text-muted-foreground transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pb-2 pl-5">
          <pre className="mt-1 overflow-auto rounded bg-background/50 p-2 font-mono text-[11px] whitespace-pre-wrap text-muted-foreground">
            {attempt.query}
          </pre>
          {attempt.error && (
            <p className="mt-1.5 text-[11px] text-red-400">
              {attempt.error.length > 200 ? attempt.error.slice(0, 200) + "..." : attempt.error}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

type QueryAttemptsDisplayProps = {
  data: QueryAttemptsData;
  className?: string;
};

/**
 * Display query attempts with status indicators.
 * Shows each query attempt (failed and successful) with expandable SQL.
 */
export function QueryAttemptsDisplay({ data, className }: QueryAttemptsDisplayProps) {
  if (!data.attempts.length) {
    return null;
  }

  const successCount = data.attempts.filter((a) => a.success).length;
  const totalBytes = data.attempts.reduce((sum, a) => sum + a.bytes_processed, 0);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
          Query History
        </span>
        <span className="text-[10px] text-muted-foreground">
          {data.attempts.length} {data.attempts.length === 1 ? "query" : "queries"} · {successCount}{" "}
          succeeded · {formatBytes(totalBytes)} total
        </span>
      </div>
      <div className="space-y-0.5">
        {data.attempts.map((attempt, idx) => (
          <QueryAttemptItem
            key={idx}
            attempt={attempt}
            index={idx}
            isLast={idx === data.attempts.length - 1}
          />
        ))}
      </div>
    </div>
  );
}
