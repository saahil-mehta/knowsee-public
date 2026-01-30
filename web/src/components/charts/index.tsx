"use client";

/**
 * Chart components adapted from Tremor templates.
 * Built on Recharts with consistent dark theme styling.
 */

import { cn } from "@/lib/utils";
import {
  type ChartColorKey,
  chartColorKeys,
  constructCategoryColors,
  defaultValueFormatter,
  getColorClassName,
  getColorValue,
  getYAxisDomain,
} from "@/lib/chart-utils";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// ─────────────────────────────────────────────────────────────────────────────
// Shared tooltip component
// ─────────────────────────────────────────────────────────────────────────────

interface TooltipRowProps {
  value: string;
  name: string;
  color: ChartColorKey;
}

function TooltipRow({ value, name, color }: TooltipRowProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span
          className={cn("size-2 shrink-0 rounded-sm", getColorClassName(color, "bg"))}
          aria-hidden
        />
        <span className="max-w-32 truncate text-xs text-muted-foreground">{name}</span>
      </div>
      <span className="text-xs font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string }>;
  label?: string | number;
  categoryColors: Map<string, ChartColorKey>;
  valueFormatter: (value: number) => string;
}

function ChartTooltip({
  active,
  payload,
  label,
  categoryColors,
  valueFormatter,
}: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const labelText = label != null ? String(label) : null;

  return (
    <div className="rounded-md border border-border bg-background/95 text-sm shadow-md backdrop-blur-sm">
      {labelText && (
        <div className="border-b border-border px-3 py-2">
          <p className="font-medium text-foreground">{labelText}</p>
        </div>
      )}
      <div className="space-y-1 px-3 py-2">
        {payload.map((item, idx) => (
          <TooltipRow
            key={idx}
            value={valueFormatter(item.value)}
            name={item.name}
            color={categoryColors.get(item.name) ?? "gray"}
          />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bar Chart
// ─────────────────────────────────────────────────────────────────────────────

export interface BarChartProps {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: ChartColorKey[];
  valueFormatter?: (value: number) => string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  showTooltip?: boolean;
  layout?: "horizontal" | "vertical";
  className?: string;
}

export function BarChart({
  data,
  index,
  categories,
  colors = chartColorKeys,
  valueFormatter = defaultValueFormatter,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
  showTooltip = true,
  layout = "horizontal",
  className,
}: BarChartProps) {
  const categoryColors = constructCategoryColors(categories, colors);
  const yAxisDomain = getYAxisDomain(true);

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          {showGridLines && (
            <CartesianGrid
              className="stroke-border/50"
              horizontal={layout === "horizontal"}
              vertical={layout === "vertical"}
              strokeDasharray="3 3"
            />
          )}
          <XAxis
            hide={!showXAxis}
            dataKey={layout === "horizontal" ? index : undefined}
            type={layout === "horizontal" ? "category" : "number"}
            domain={layout === "vertical" ? yAxisDomain : undefined}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={layout === "vertical" ? valueFormatter : undefined}
          />
          <YAxis
            hide={!showYAxis}
            dataKey={layout === "vertical" ? index : undefined}
            type={layout === "vertical" ? "category" : "number"}
            domain={layout === "horizontal" ? yAxisDomain : undefined}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={layout === "horizontal" ? valueFormatter : undefined}
            width={60}
          />
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as ChartTooltipProps["payload"]}
                  label={label}
                  categoryColors={categoryColors}
                  valueFormatter={valueFormatter}
                />
              )}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            />
          )}
          {categories.map((category) => (
            <Bar
              key={category}
              dataKey={category}
              fill={getColorValue(categoryColors.get(category) ?? "indigo")}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Line Chart
// ─────────────────────────────────────────────────────────────────────────────

export interface LineChartProps {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors?: ChartColorKey[];
  valueFormatter?: (value: number) => string;
  showXAxis?: boolean;
  showYAxis?: boolean;
  showGridLines?: boolean;
  showTooltip?: boolean;
  connectNulls?: boolean;
  className?: string;
}

export function LineChart({
  data,
  index,
  categories,
  colors = chartColorKeys,
  valueFormatter = defaultValueFormatter,
  showXAxis = true,
  showYAxis = true,
  showGridLines = true,
  showTooltip = true,
  connectNulls = false,
  className,
}: LineChartProps) {
  const categoryColors = constructCategoryColors(categories, colors);
  const yAxisDomain = getYAxisDomain(true);

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer>
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {showGridLines && (
            <CartesianGrid className="stroke-border/50" strokeDasharray="3 3" vertical={false} />
          )}
          <XAxis
            hide={!showXAxis}
            dataKey={index}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
          />
          <YAxis
            hide={!showYAxis}
            domain={yAxisDomain}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11 }}
            className="fill-muted-foreground"
            tickFormatter={valueFormatter}
            width={60}
          />
          {showTooltip && (
            <Tooltip
              content={({ active, payload, label }) => (
                <ChartTooltip
                  active={active}
                  payload={payload as ChartTooltipProps["payload"]}
                  label={label}
                  categoryColors={categoryColors}
                  valueFormatter={valueFormatter}
                />
              )}
              cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
            />
          )}
          {categories.map((category) => (
            <Line
              key={category}
              dataKey={category}
              stroke={getColorValue(categoryColors.get(category) ?? "indigo")}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={false}
              connectNulls={connectNulls}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pie Chart
// ─────────────────────────────────────────────────────────────────────────────

export interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  colors?: ChartColorKey[];
  valueFormatter?: (value: number) => string;
  showTooltip?: boolean;
  className?: string;
}

export function PieChart({
  data,
  colors = chartColorKeys,
  valueFormatter = defaultValueFormatter,
  showTooltip = true,
  className,
}: PieChartProps) {
  const categoryColors = constructCategoryColors(
    data.map((d) => d.name),
    colors,
  );

  return (
    <div className={cn("h-64 w-full", className)}>
      <ResponsiveContainer>
        <RechartsPieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          {showTooltip && (
            <Tooltip
              content={({ active, payload }) => (
                <ChartTooltip
                  active={active}
                  payload={payload?.map((p) => ({
                    name: p.name as string,
                    value: p.value as number,
                  }))}
                  categoryColors={categoryColors}
                  valueFormatter={valueFormatter}
                />
              )}
            />
          )}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="40%"
            outerRadius="80%"
            paddingAngle={2}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={getColorValue(categoryColors.get(entry.name) ?? "indigo")}
                strokeWidth={0}
              />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Metric Card (for single value display)
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricCardProps {
  value: string | number;
  label?: string;
  className?: string;
}

export function MetricCard({ value, label, className }: MetricCardProps) {
  const formattedValue = typeof value === "number" ? defaultValueFormatter(value) : value;

  return (
    <div className={cn("flex flex-col items-center justify-center py-8", className)}>
      <span className="text-4xl font-bold text-foreground tabular-nums">{formattedValue}</span>
      {label && <span className="mt-2 text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Table (for tabular display)
// ─────────────────────────────────────────────────────────────────────────────

export interface DataTableProps {
  columns: string[];
  rows: unknown[][];
  maxRows?: number;
  className?: string;
}

export function DataTable({ columns, rows, maxRows = 100, className }: DataTableProps) {
  const displayRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  return (
    <div className={cn("overflow-auto", className)}>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className="px-3 py-2 text-left font-medium whitespace-nowrap text-muted-foreground"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-b border-border/50 hover:bg-muted/30">
              {row.map((cell, cellIdx) => (
                <td key={cellIdx} className="px-3 py-2 whitespace-nowrap text-foreground">
                  {cell === null ? (
                    <span className="text-muted-foreground/50">null</span>
                  ) : (
                    String(cell)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {hasMore && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Showing {maxRows} of {rows.length} rows
        </p>
      )}
    </div>
  );
}
