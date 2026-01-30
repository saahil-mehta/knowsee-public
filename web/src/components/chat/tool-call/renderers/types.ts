/**
 * Props passed to all tool renderers.
 */
export type ToolRendererProps = {
  /** Tool arguments/input */
  args: Record<string, unknown>;
  /** Tool result/output */
  output: unknown;
  /** Error message if tool failed */
  error?: string;
};
