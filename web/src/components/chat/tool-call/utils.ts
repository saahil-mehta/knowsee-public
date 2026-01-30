import { isValidElement } from "react";

/**
 * Extract displayable text from tool output.
 * Handles common patterns like {result: "..."} and cleans up escape sequences.
 */
export function extractResultText(output: unknown): string | null {
  if (typeof output === "string") {
    return output;
  }

  if (typeof output === "object" && output !== null && !isValidElement(output)) {
    const obj = output as Record<string, unknown>;
    const textKey = ["result", "response", "content", "text", "message"].find(
      (key) => typeof obj[key] === "string",
    );
    if (textKey) {
      return obj[textKey] as string;
    }
  }

  return null;
}

/**
 * Clean up escape sequences for display.
 */
export function cleanResultText(text: string): string {
  return text.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\t/g, "\t");
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 2 : 1)} ${units[i]}`;
}

/**
 * Format row count with commas
 */
export function formatRowCount(count: number): string {
  return count.toLocaleString();
}
