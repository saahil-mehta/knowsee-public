"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useCopilotContext, useCopilotChat } from "@copilotkit/react-core";
import { ChatWithHistory } from "@/components/chat-with-history";

/**
 * Chat session page - renders the chat interface for a specific session.
 *
 * This page only handles:
 * 1. Syncing the URL sessionId to CopilotKit's threadId
 * 2. Rendering the ChatWithHistory component
 *
 * The sidebar, header, and persistent UI are managed by the parent layout.
 */
export default function ChatSessionPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const { threadId, setThreadId } = useCopilotContext();
  const { reset } = useCopilotChat();
  const hasInitialised = useRef(false);

  // Sync URL sessionId to CopilotKit threadId on mount and URL change
  useEffect(() => {
    if (sessionId && sessionId !== threadId) {
      // Only reset messages if this is not the initial mount
      // (to avoid clearing messages we're about to load)
      if (hasInitialised.current) {
        reset();
      }
      setThreadId(sessionId);
      hasInitialised.current = true;
    }
  }, [sessionId, threadId, setThreadId, reset]);

  return <ChatWithHistory />;
}
