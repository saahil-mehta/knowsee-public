"use client";

import { cn } from "@/lib/utils";
import { motion } from "motion/react";
import { memo } from "react";

export type StreamingIndicatorProps = {
  className?: string;
  /** Size in pixels (default: 36) */
  size?: number;
};

/**
 * Newton's Cradle streaming indicator.
 * Shows below streaming text to indicate the response is still in progress.
 * Uses CSS custom properties for sizing to keep the physics proportions correct.
 */
function StreamingIndicatorComponent({ className, size = 36 }: StreamingIndicatorProps) {
  const containerSize = size * 0.51;
  const dotHeight = containerSize * 0.25;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex items-center justify-center py-2", className)}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: containerSize, height: containerSize }}
      >
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "relative flex h-full w-1/4 shrink-0 origin-top items-center",
              i === 0 && "animate-cradle-swing",
              i === 3 && "animate-cradle-swing-reverse",
            )}
          >
            <span
              className="block w-full rounded-full bg-current opacity-50"
              style={{ height: dotHeight }}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export const StreamingIndicator = memo(StreamingIndicatorComponent);
