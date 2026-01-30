"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { isValidElement, useState } from "react";
import { Streamdown } from "streamdown";
import type { ToolRendererProps } from "./types";
import { cleanResultText, extractResultText } from "../utils";

/**
 * Default renderer for tools without a specific renderer.
 * Shows the input and a collapsible output with text or JSON.
 */
export function DefaultRenderer({ output, error }: ToolRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!(output || error)) {
    return null;
  }

  if (error) {
    return (
      <div className="mt-2 border-t border-border/30 pt-2">
        <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Error</span>
        <div className="mt-1 text-destructive">{error}</div>
      </div>
    );
  }

  const resultText = extractResultText(output);

  if (resultText) {
    const cleanedText = cleanResultText(resultText);
    const isLong = cleanedText.length > 300;
    const previewText = isLong ? cleanedText.slice(0, 300) + "..." : cleanedText;

    return (
      <div className="mt-2 border-t border-border/30 pt-2">
        <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Result</span>
        <div className="mt-1 text-xs text-muted-foreground">
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
      </div>
    );
  }

  // Fallback: show JSON for complex objects
  if (typeof output === "object" && !isValidElement(output)) {
    return (
      <div className="mt-2 border-t border-border/30 pt-2">
        <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Result</span>
        <pre className="mt-1 overflow-auto font-mono text-xs whitespace-pre-wrap text-muted-foreground">
          {JSON.stringify(output, null, 2)}
        </pre>
      </div>
    );
  }

  return null;
}
