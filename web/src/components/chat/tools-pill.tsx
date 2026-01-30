"use client";

import { useEffect, useState } from "react";
import { ChevronDownIcon, SearchIcon, DatabaseIcon, WrenchIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Tool = {
  id: string;
  name: string;
  description: string;
  icon: "search" | "database" | "file-text";
  alwaysAvailable: boolean;
};

type ToolsPillProps = {
  className?: string;
  /** Controlled open state */
  isOpen?: boolean;
  /** Called when open state changes */
  onOpenChange?: (open: boolean) => void;
};

const iconMap = {
  search: SearchIcon,
  database: DatabaseIcon,
  "file-text": WrenchIcon,
} as const;

export function ToolsPill({ className, isOpen, onOpenChange }: ToolsPillProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTools() {
      try {
        const response = await fetch("/api/tools");
        if (!response.ok) {
          throw new Error("Failed to fetch tools");
        }
        const data = await response.json();
        setTools(data.tools || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTools();
  }, []);

  // Don't render if loading, error, or no tools
  if (isLoading || error || tools.length === 0) {
    return null;
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "group inline-flex items-center gap-1.5 rounded-full",
            "border border-border/60 bg-background/80 backdrop-blur-sm",
            "px-3 py-1.5 text-sm text-muted-foreground",
            "transition-all duration-200 ease-out",
            "hover:border-border hover:bg-accent/50 hover:text-foreground",
            "focus-visible:outline-none",
            "active:scale-[0.96]",
            "data-[state=open]:scale-[0.96] data-[state=open]:border-border data-[state=open]:bg-accent/50 data-[state=open]:text-foreground",
            "disabled:pointer-events-none disabled:opacity-40",
            className,
          )}
        >
          <WrenchIcon className="size-3.5 transition-transform duration-200 group-hover:scale-110 group-data-[state=open]:scale-110" />
          <span className="font-medium">Tools</span>
          <ChevronDownIcon className="size-3 opacity-50 transition-all duration-200 group-hover:rotate-90 group-hover:opacity-80 group-data-[state=open]:rotate-180 group-data-[state=open]:opacity-80" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="min-w-[240px] border-border/40 bg-popover/95 shadow-xl backdrop-blur-md"
      >
        <div className="px-2.5 py-2 text-xs font-medium tracking-wide text-muted-foreground/70">
          Available Capabilities
        </div>
        {tools.map((tool) => {
          const IconComponent = iconMap[tool.icon] || WrenchIcon;
          return (
            <div
              key={tool.id}
              className={cn("flex items-start gap-3 px-2.5 py-2.5", "rounded-lg text-sm")}
            >
              <IconComponent className="mt-0.5 size-4 shrink-0 text-muted-foreground/70" />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{tool.name}</span>
                <span className="text-xs text-muted-foreground/70">{tool.description}</span>
              </div>
            </div>
          );
        })}
        <div className="mt-1 border-t border-border/30 px-2.5 py-2 text-[11px] text-muted-foreground/50">
          Tools are used automatically based on your query.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
