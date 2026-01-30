"use client";

import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import {
  BarChart3Icon,
  ChevronDownIcon,
  LineChartIcon,
  PieChartIcon,
  TableIcon,
} from "lucide-react";
import { useState } from "react";
import { BarChart, DataTable, LineChart, MetricCard, PieChart } from "@/components/charts";
import { formatBytes } from "./utils";

/**
 * Widget data structure from backend.
 */
export type WidgetData = {
  id: string;
  query_id: string;
  title: string;
  chart_type: "bar" | "line" | "pie" | "table" | "metric";
  data: {
    columns: string[];
    rows: unknown[][];
  };
  query: string;
  total_rows: number;
  table_display_limit: number;
  bytes_processed: number;
};

/**
 * Extract widget data from text containing semantic tags.
 * Returns the parsed widgets and the cleaned text with tags removed.
 */
export function extractWidgetsData(text: string): {
  widgets: WidgetData[];
  cleanedText: string;
} {
  const widgetsById = new Map<string, WidgetData>();
  let cleanedText = text;

  // Find all widget tags
  const tagOpen = "<llm:data:widget>";
  const tagClose = "</llm:data:widget>";

  let searchStart = 0;
  while (true) {
    const startIdx = cleanedText.indexOf(tagOpen, searchStart);
    if (startIdx === -1) break;

    const jsonStart = startIdx + tagOpen.length;

    // Find matching close by brace counting
    let braceCount = 0;
    let jsonEnd = -1;

    for (let i = jsonStart; i < cleanedText.length; i++) {
      const char = cleanedText[i];
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
      searchStart = startIdx + 1;
      continue;
    }

    const jsonStr = cleanedText.slice(jsonStart, jsonEnd);

    // Find and remove the close tag
    let endIdx = jsonEnd;
    const closeTagStart = cleanedText.indexOf(tagClose, jsonEnd);
    if (closeTagStart !== -1 && closeTagStart - jsonEnd < 10) {
      endIdx = closeTagStart + tagClose.length;
    }

    try {
      const widget = JSON.parse(jsonStr) as WidgetData;
      // Deduplicate by ID - keep the latest version
      widgetsById.set(widget.id, widget);

      // Remove this tag from text
      const before = cleanedText.slice(0, startIdx);
      const after = cleanedText.slice(endIdx);
      cleanedText = (before + after).trim();
      // Don't update searchStart - the text shifted
    } catch {
      // Skip malformed JSON
      searchStart = startIdx + 1;
    }
  }

  return { widgets: Array.from(widgetsById.values()), cleanedText };
}

/**
 * Get icon for chart type.
 */
function ChartTypeIcon({ type }: { type: WidgetData["chart_type"] }) {
  switch (type) {
    case "bar":
      return <BarChart3Icon className="size-3.5" />;
    case "line":
      return <LineChartIcon className="size-3.5" />;
    case "pie":
      return <PieChartIcon className="size-3.5" />;
    case "table":
      return <TableIcon className="size-3.5" />;
    case "metric":
      return <BarChart3Icon className="size-3.5" />;
    default:
      return <TableIcon className="size-3.5" />;
  }
}

/**
 * Render chart based on widget data.
 */
function WidgetChart({ widget }: { widget: WidgetData }) {
  const { chart_type, data, title } = widget;
  const { columns, rows } = data;

  // Transform data for charts
  // First column is typically the category/index, rest are values
  const indexColumn = columns[0];
  const valueColumns = columns.slice(1);

  // For bar/line charts: transform to array of objects
  const chartData = rows.map((row) => {
    const obj: Record<string, unknown> = { [indexColumn]: row[0] };
    valueColumns.forEach((col, idx) => {
      obj[col] = row[idx + 1];
    });
    return obj;
  });

  switch (chart_type) {
    case "metric": {
      // Single value display
      const value = rows[0]?.[0];
      return (
        <MetricCard
          value={typeof value === "number" ? value : String(value ?? "")}
          label={columns[0]}
          className="h-auto"
        />
      );
    }

    case "bar":
      return (
        <BarChart
          data={chartData}
          index={indexColumn}
          categories={valueColumns}
          className="h-48"
          showYAxis={true}
          showXAxis={true}
        />
      );

    case "line":
      return (
        <LineChart
          data={chartData}
          index={indexColumn}
          categories={valueColumns}
          className="h-48"
          showYAxis={true}
          showXAxis={true}
        />
      );

    case "pie": {
      // Transform for pie chart: needs name/value format
      const pieData = rows.map((row) => ({
        name: String(row[0]),
        value: typeof row[1] === "number" ? row[1] : Number(row[1]) || 0,
      }));
      return <PieChart data={pieData} className="h-48" />;
    }

    case "table":
    default:
      return <DataTable columns={columns} rows={rows} maxRows={50} className="max-h-64" />;
  }
}

type WidgetItemProps = {
  widget: WidgetData;
};

function WidgetItem({ widget }: WidgetItemProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showQuery, setShowQuery] = useState(false);

  return (
    <div className="rounded-md border border-border/50 bg-background/30">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30">
          <ChartTypeIcon type={widget.chart_type} />
          <span className="flex-1 truncate text-xs font-medium text-foreground">
            {widget.title}
          </span>
          <Badge variant="secondary" className="h-4 px-1.5 py-0 text-[10px]">
            {widget.total_rows.toLocaleString()} rows
          </Badge>
          <Badge variant="outline" className="h-4 px-1.5 py-0 text-[10px]">
            {formatBytes(widget.bytes_processed)}
          </Badge>
          <ChevronDownIcon
            className={cn(
              "size-3 text-muted-foreground transition-transform",
              isOpen && "rotate-180",
            )}
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-3 pt-1 pb-3">
            <WidgetChart widget={widget} />

            {/* Query toggle */}
            <button
              type="button"
              onClick={() => setShowQuery(!showQuery)}
              className="mt-2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {showQuery ? "Hide query" : "Show query"}
            </button>

            {showQuery && (
              <pre className="mt-2 overflow-auto rounded bg-muted/30 p-2 font-mono text-[10px] whitespace-pre-wrap text-muted-foreground">
                {widget.query}
              </pre>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

type WidgetDisplayProps = {
  widgets: WidgetData[];
  className?: string;
};

/**
 * Display multiple widgets with charts.
 */
export function WidgetDisplay({ widgets, className }: WidgetDisplayProps) {
  if (!widgets.length) return null;

  return (
    <div className={cn("space-y-3", className)}>
      <span className="text-[10px] tracking-wide text-muted-foreground/70 uppercase">Results</span>
      <div className="space-y-2">
        {widgets.map((widget) => (
          <WidgetItem key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  );
}
