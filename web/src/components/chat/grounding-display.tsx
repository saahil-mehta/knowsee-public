"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon, SearchIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";

/**
 * Data structure for grounding metadata from Google Search.
 */
export type GroundingData = {
  queries: string[];
  sources: Array<{
    title: string | null;
    uri: string;
    domain: string | null;
  }>;
};

/**
 * Extract grounding data from text containing semantic tags.
 * Handles the case where opening `<` is stripped by HTML processing.
 * Returns the parsed data and the cleaned text with tags removed.
 */
export function extractGroundingData(text: string): {
  data: GroundingData | null;
  cleanedText: string;
} {
  // Find the marker - with or without opening bracket
  const markers = ["<llm:adk:sources>", "llm:adk:sources{"];
  let markerIdx = -1;
  let markerLen = 0;
  let jsonStartOffset = 0;

  for (const marker of markers) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      markerIdx = idx;
      markerLen = marker.length;
      // For stripped bracket version, JSON starts right after "llm:adk:sources"
      jsonStartOffset = marker === "llm:adk:sources{" ? "llm:adk:sources".length : marker.length;
      break;
    }
  }

  if (markerIdx === -1) {
    return { data: null, cleanedText: text };
  }

  // Find the JSON by brace counting (most robust approach)
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

  // Check for and remove trailing close tag
  let afterTag = text.slice(jsonEnd);
  const closeTags = ["</llm:adk:sources>", "&lt;/llm:adk:sources&gt;"];
  for (const closeTag of closeTags) {
    if (afterTag.startsWith(closeTag)) {
      afterTag = afterTag.slice(closeTag.length);
      break;
    }
  }

  const cleanedText = (beforeTag + afterTag).trim();

  // Try standard JSON parse first
  try {
    const parsed = JSON.parse(jsonStr);
    return {
      data: {
        queries: parsed.queries || [],
        sources: parsed.sources || [],
      },
      cleanedText,
    };
  } catch {
    // JSON parse failed - try regex extraction as fallback
    // This handles cases where the JSON has unescaped quotes in text fields
    const queries: string[] = [];
    const sources: GroundingData["sources"] = [];

    // Extract queries array using regex
    const queriesMatch = jsonStr.match(/"queries"\s*:\s*\[([\s\S]*?)\]/);
    if (queriesMatch) {
      const queryStrings = queriesMatch[1].match(/"([^"]+)"/g);
      if (queryStrings) {
        for (const q of queryStrings) {
          queries.push(q.slice(1, -1)); // Remove quotes
        }
      }
    }

    // Extract sources - find each {"title":...,"uri":...,"domain":...} object
    const sourcePattern =
      /\{"title"\s*:\s*"([^"]*)"\s*,\s*"uri"\s*:\s*"([^"]*)"\s*,\s*"domain"\s*:\s*"([^"]*)"\}/g;
    let sourceMatch;
    while ((sourceMatch = sourcePattern.exec(jsonStr)) !== null) {
      sources.push({
        title: sourceMatch[1] || null,
        uri: sourceMatch[2],
        domain: sourceMatch[3] || null,
      });
    }

    // Also try alternate format where title might be null
    const sourcePatternNullTitle =
      /\{"title"\s*:\s*null\s*,\s*"uri"\s*:\s*"([^"]*)"\s*,\s*"domain"\s*:\s*"([^"]*)"\}/g;
    while ((sourceMatch = sourcePatternNullTitle.exec(jsonStr)) !== null) {
      sources.push({
        title: null,
        uri: sourceMatch[1],
        domain: sourceMatch[2] || null,
      });
    }

    if (queries.length > 0 || sources.length > 0) {
      return {
        data: { queries, sources },
        cleanedText,
      };
    }

    return { data: null, cleanedText: text };
  }
}

/**
 * Get favicon URL for a domain using Google's favicon service.
 */
function getFaviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`;
}

export type GroundingDisplayProps = ComponentProps<"div"> & {
  data: GroundingData;
};

/**
 * Display grounding metadata as pills.
 * Shows search queries at top, source links with favicons below.
 */
export function GroundingDisplay({ data, className, ...props }: GroundingDisplayProps) {
  const [showAllSources, setShowAllSources] = useState(false);

  const hasQueries = data.queries.length > 0;
  const hasSources = data.sources.length > 0;

  if (!hasQueries && !hasSources) {
    return null;
  }

  // Deduplicate sources by domain
  const uniqueSources = data.sources.filter(
    (source, index, self) =>
      index === self.findIndex((s) => s.domain === source.domain || s.uri === source.uri),
  );

  // Show first 8 sources by default, with "Show more" toggle
  const visibleSources = showAllSources ? uniqueSources : uniqueSources.slice(0, 8);
  const hasMoreSources = uniqueSources.length > 8;

  return (
    <div className={cn("mt-3 space-y-3", className)} {...props}>
      {/* Search queries section */}
      {hasQueries && (
        <div className="space-y-2">
          <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
            Search Queries
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted">
              <SearchIcon className="size-3 text-muted-foreground" />
            </div>
            {data.queries.map((query, idx) => (
              <Badge
                key={`query-${idx}`}
                variant="secondary"
                className="bg-muted/50 text-muted-foreground hover:bg-muted"
              >
                {query}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Source links with favicons */}
      {hasSources && (
        <div className="space-y-2">
          <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">
            Sources
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            {visibleSources.map((source, idx) => {
              const domain = source.domain || new URL(source.uri).hostname;
              return (
                <a
                  key={`source-${idx}`}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Badge
                    variant="outline"
                    className="gap-1.5 pr-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <img
                      src={getFaviconUrl(domain)}
                      alt=""
                      className="size-3.5 rounded-sm"
                      loading="lazy"
                      onError={(e) => {
                        // Hide broken favicons
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <span className="max-w-[150px] truncate">{domain}</span>
                    <ExternalLinkIcon className="size-2.5 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Badge>
                </a>
              );
            })}
            {hasMoreSources && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="text-[10px] text-muted-foreground hover:text-foreground hover:underline"
              >
                {showAllSources ? "Show less" : `+${uniqueSources.length - 8} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
