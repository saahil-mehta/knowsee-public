/**
 * Chart colour utilities adapted from Tremor templates.
 * Provides consistent colour mapping for Recharts components.
 */

export type ColorUtility = "bg" | "stroke" | "fill" | "text";

/**
 * Chart colour palette - designed for dark theme.
 * Uses Tailwind colour classes for consistency.
 */
export const chartColors = {
  indigo: {
    bg: "bg-indigo-500",
    stroke: "stroke-indigo-500",
    fill: "fill-indigo-500",
    text: "text-indigo-500",
  },
  cyan: {
    bg: "bg-cyan-500",
    stroke: "stroke-cyan-500",
    fill: "fill-cyan-500",
    text: "text-cyan-500",
  },
  emerald: {
    bg: "bg-emerald-500",
    stroke: "stroke-emerald-500",
    fill: "fill-emerald-500",
    text: "text-emerald-500",
  },
  amber: {
    bg: "bg-amber-500",
    stroke: "stroke-amber-500",
    fill: "fill-amber-500",
    text: "text-amber-500",
  },
  violet: {
    bg: "bg-violet-500",
    stroke: "stroke-violet-500",
    fill: "fill-violet-500",
    text: "text-violet-500",
  },
  pink: {
    bg: "bg-pink-500",
    stroke: "stroke-pink-500",
    fill: "fill-pink-500",
    text: "text-pink-500",
  },
  blue: {
    bg: "bg-blue-500",
    stroke: "stroke-blue-500",
    fill: "fill-blue-500",
    text: "text-blue-500",
  },
  gray: {
    bg: "bg-gray-400 dark:bg-gray-600",
    stroke: "stroke-gray-400 dark:stroke-gray-600",
    fill: "fill-gray-400 dark:fill-gray-600",
    text: "text-gray-400 dark:text-gray-600",
  },
} as const;

export type ChartColorKey = keyof typeof chartColors;

export const chartColorKeys: ChartColorKey[] = Object.keys(chartColors) as ChartColorKey[];

/**
 * Raw hex colours for Recharts (which doesn't use Tailwind classes directly).
 */
export const chartColorValues: Record<ChartColorKey, string> = {
  indigo: "#6366f1",
  cyan: "#06b6d4",
  emerald: "#10b981",
  amber: "#f59e0b",
  violet: "#8b5cf6",
  pink: "#ec4899",
  blue: "#3b82f6",
  gray: "#9ca3af",
};

/**
 * Map categories to colours consistently.
 */
export function constructCategoryColors(
  categories: string[],
  colors: ChartColorKey[] = chartColorKeys,
): Map<string, ChartColorKey> {
  const categoryColors = new Map<string, ChartColorKey>();
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length]);
  });
  return categoryColors;
}

/**
 * Get Tailwind class for a colour and utility type.
 */
export function getColorClassName(color: ChartColorKey, type: ColorUtility): string {
  const fallback = {
    bg: "bg-gray-500",
    stroke: "stroke-gray-500",
    fill: "fill-gray-500",
    text: "text-gray-500",
  };
  return chartColors[color]?.[type] ?? fallback[type];
}

/**
 * Get raw hex colour value.
 */
export function getColorValue(color: ChartColorKey): string {
  return chartColorValues[color] ?? chartColorValues.gray;
}

/**
 * Calculate Y-axis domain.
 */
export function getYAxisDomain(
  autoMinValue: boolean,
  minValue?: number,
  maxValue?: number,
): [number | "auto", number | "auto"] {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0);
  const maxDomain = maxValue ?? "auto";
  return [minDomain, maxDomain];
}

/**
 * Default value formatter for charts.
 */
export function defaultValueFormatter(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    notation: value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: 2,
  }).format(value);
}
