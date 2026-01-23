"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowDownIcon } from "lucide-react";
import type { ComponentProps } from "react";
import { createContext, useCallback, useContext, useEffect } from "react";
import { StickToBottom, useStickToBottomContext } from "use-stick-to-bottom";

// Context to pass streaming state down to scroll components
const StreamingContext = createContext(false);

/**
 * Hook to access streaming state within Conversation tree.
 */
export const useStreamingContext = () => useContext(StreamingContext);

export type ConversationProps = ComponentProps<typeof StickToBottom> & {
  isStreaming?: boolean;
};

export const Conversation = ({ className, isStreaming = false, ...props }: ConversationProps) => (
  <StreamingContext.Provider value={isStreaming}>
    <StickToBottom
      className={cn("relative flex-1 overflow-y-hidden", className)}
      initial="smooth"
      resize="smooth"
      role="log"
      {...props}
    />
  </StreamingContext.Provider>
);

export type ConversationContentProps = ComponentProps<typeof StickToBottom.Content>;

export const ConversationContent = ({ className, ...props }: ConversationContentProps) => (
  <StickToBottom.Content
    className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pt-8 pb-4", className)}
    {...props}
  />
);

export type ConversationEmptyStateProps = ComponentProps<"div"> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
};

export const ConversationEmptyState = ({
  className,
  title = "No messages yet",
  description = "Start a conversation to see messages here",
  icon,
  children,
  ...props
}: ConversationEmptyStateProps) => (
  <div
    className={cn(
      "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
      className,
    )}
    {...props}
  >
    {children ?? (
      <>
        {icon && <div className="text-muted-foreground">{icon}</div>}
        <div className="space-y-1">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </>
    )}
  </div>
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  if (isAtBottom) return null;

  return (
    <Button
      className={cn(
        "absolute left-[50%] size-10 translate-x-[-50%] rounded-full border border-input bg-background/20 shadow-lg backdrop-blur-sm hover:bg-accent dark:bg-input/20 dark:hover:bg-input/50",
        className,
      )}
      onClick={handleScrollToBottom}
      size="icon"
      type="button"
      variant="ghost"
      {...props}
    >
      <ArrowDownIcon className="size-4 text-muted-foreground" />
    </Button>
  );
};

/**
 * Auto-scroll component that re-engages sticky mode during streaming.
 * When streaming AND user is at bottom (scroll button hidden), this keeps
 * the view scrolled to bottom as new content arrives.
 *
 * Renders nothing - purely handles scroll behavior.
 */
export const ConversationAutoScroll = () => {
  const isStreaming = useStreamingContext();
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  useEffect(() => {
    // Only engage when streaming and user is at bottom
    if (!isStreaming || !isAtBottom) return;

    // Use RAF loop to keep scrolling as content streams in
    let rafId: number;
    const tick = () => {
      scrollToBottom();
      rafId = requestAnimationFrame(tick);
    };

    // Small delay to let content render before starting scroll loop
    const timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, 50);

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [isStreaming, isAtBottom, scrollToBottom]);

  return null;
};
