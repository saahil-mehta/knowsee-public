"use client";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { extractGroundingData, GroundingDisplay } from "../../grounding-display";
import type { ToolRendererProps } from "./types";
import { cleanResultText, extractResultText } from "../utils";

/**
 * Web search renderer with grounding pills.
 * Shows search queries and source links extracted from the response.
 */
export function WebSearchRenderer({ output, error }: ToolRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (error) {
    return (
      <div className="mt-2 border-t border-border/30 pt-2">
        <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Error</span>
        <div className="mt-1 text-destructive">{error}</div>
      </div>
    );
  }

  if (!output) {
    return null;
  }

  const resultText = extractResultText(output);

  if (!resultText) {
    return null;
  }

  const escapeCleaned = cleanResultText(resultText);
  const { data: groundingData, cleanedText } = extractGroundingData(escapeCleaned);

  const isLong = cleanedText.length > 300;
  const previewText = isLong ? cleanedText.slice(0, 300) + "..." : cleanedText;

  return (
    <div className="mt-2 border-t border-border/30 pt-2">
      <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Synopsis</span>
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

      {/* Grounding pills (queries + sources) */}
      {groundingData && <GroundingDisplay data={groundingData} />}
    </div>
  );
}
