"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, FileTextIcon, ExternalLinkIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Team = {
  teamId: string;
  displayName: string;
  folderUrl: string;
  sourceType: string;
  fileCount: number;
  lastSyncAt: string | null;
};

type SourcesPillProps = {
  className?: string;
};

export function SourcesPill({ className }: SourcesPillProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeams() {
      try {
        const response = await fetch("/api/teams");
        if (!response.ok) {
          throw new Error("Failed to fetch teams");
        }
        const data = await response.json();
        setTeams(data.teams || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTeams();
  }, []);

  // Don't render if loading, error, or no teams
  if (isLoading || error || teams.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full",
            "border border-border/60 bg-background/80 backdrop-blur-sm",
            "px-3 py-1.5 text-sm text-muted-foreground",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-accent/50 hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
            "active:scale-[0.98]",
            className,
          )}
        >
          <FileTextIcon className="size-3.5" />
          <span className="font-medium">Sources</span>
          <ChevronDownIcon className="size-3 opacity-40 transition-all duration-200 group-hover:opacity-70 group-data-[state=open]:rotate-180" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          "min-w-[200px] overflow-hidden rounded-xl p-1.5",
          "border-border/50 bg-popover/95 backdrop-blur-xl",
          "shadow-xl shadow-black/10 dark:shadow-black/30",
        )}
      >
        <div className="px-2.5 py-2 text-xs font-medium tracking-wide text-muted-foreground/70">
          RAG Knowledge Bases
        </div>
        {teams.map((team) => (
          <DropdownMenuItem key={team.teamId} asChild>
            <a
              href={team.folderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group/item flex items-center justify-between gap-3",
                "rounded-lg px-2.5 py-2 text-sm",
                "transition-colors duration-150",
                "hover:bg-accent/50 focus:bg-accent/50",
              )}
            >
              <span className="truncate font-medium">{team.displayName}</span>
              <ExternalLinkIcon
                className={cn(
                  "size-3.5 shrink-0 text-muted-foreground/50",
                  "opacity-0 transition-all duration-150",
                  "group-hover/item:opacity-100 group-focus/item:opacity-100",
                )}
              />
            </a>
          </DropdownMenuItem>
        ))}
        <div className="mt-1 border-t border-border/30 px-2.5 py-2 text-[11px] text-muted-foreground/50">
          Need access? Contact your administrator.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
