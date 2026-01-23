"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useCallback } from "react";
import { useCopilotContext, useCopilotChatHeadless_c } from "@copilotkit/react-core";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";
import { useChatLayout } from "@/contexts/chat-layout-context";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useUploadConfig } from "@/hooks/use-upload-config";
import type { SessionDetailResponse } from "@/lib/types";
import { ChatWindow } from "@/components/chat/chat-window";
import { ToolRenderer } from "@/components/chat/tool-renderer";

export function ChatWithHistory() {
  const { onSessionCreated } = useChatLayout();
  const { threadId } = useCopilotContext();
  const { messages, setMessages, isLoading, sendMessage } = useCopilotChatHeadless_c();
  const { data: session } = useSession();

  const previousThreadId = useRef<string | undefined>(undefined);
  const hasNotifiedNewSession = useRef(false);
  const isNewThread = useRef(true);
  const wasLoading = useRef(false);

  // Upload config from backend (single source of truth)
  const { config: uploadConfig } = useUploadConfig();

  // File upload hook
  const fileUpload = useFileUpload({
    config: uploadConfig,
    sessionId: threadId,
    userId: session?.user?.email,
    onError: (error) => {
      toast.error(error.message);
    },
    onSuccess: (count) => {
      toast.success(count === 1 ? "File uploaded" : `${count} files uploaded`);
    },
  });

  // Clear files when thread changes
  useEffect(() => {
    fileUpload.clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Load and inject history when threadId changes
  useEffect(() => {
    // Skip if threadId hasn't actually changed
    if (threadId === previousThreadId.current) return;
    previousThreadId.current = threadId;
    hasNotifiedNewSession.current = false;
    isNewThread.current = true;

    if (!threadId) {
      setMessages([]);
      return;
    }

    const fetchAndInjectHistory = async () => {
      try {
        const response = await fetch(`/api/sessions/${threadId}`);
        const data: SessionDetailResponse = await response.json();

        if (data.error === "Session not found" || !data.messages?.length) {
          // New thread - clear messages
          setMessages([]);
          isNewThread.current = true;
        } else if (data.messages) {
          // Existing thread - inject history directly into CopilotChat
          const copilotMessages = data.messages.map((msg, idx) => ({
            id: `history-${idx}`,
            role: msg.role === "user" ? ("user" as const) : ("assistant" as const),
            content: msg.content,
          }));

          setMessages(copilotMessages);
          isNewThread.current = false;
        }
      } catch {
        // Fetch failed - assume new thread
        setMessages([]);
        isNewThread.current = true;
      }
    };

    fetchAndInjectHistory();
  }, [threadId, setMessages]);

  // Detect when a message completes on a new thread (loading: true -> false)
  useEffect(() => {
    // When loading finishes and we were loading before
    if (wasLoading.current && !isLoading) {
      // If this is a new thread and we haven't notified yet
      if (
        isNewThread.current &&
        !hasNotifiedNewSession.current &&
        messages &&
        messages.length > 0
      ) {
        hasNotifiedNewSession.current = true;
        // Refresh sidebar with retries to handle backend persistence timing
        const refreshWithRetry = () => {
          onSessionCreated();
          // Retry once more after a delay in case first refresh was too early
          setTimeout(() => onSessionCreated(), 1500);
        };
        setTimeout(refreshWithRetry, 500);
      }
    }
    wasLoading.current = isLoading;
  }, [isLoading, messages, onSessionCreated]);

  // Transform messages for ChatWindow
  // CopilotKit messages can have complex content types - extract string content
  // Preserve generativeUI for tool calls, widgets, and other rendered components
  // Note: We don't merge consecutive assistant messages here because it causes
  // streaming glitches. The backend merge handles history correctly on reload.
  const chatMessages = (messages ?? [])
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => {
      let content = "";

      if (typeof msg.content === "string") {
        content = msg.content;
      } else if (Array.isArray(msg.content)) {
        // Extract text from multipart content
        content = msg.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("");
      }

      // Preserve generativeUI from assistant messages (tool calls, widgets, etc.)
      const generativeUI =
        msg.role === "assistant" && "generativeUI" in msg
          ? (msg.generativeUI as (() => ReactNode) | undefined)
          : undefined;

      return {
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content,
        generativeUI,
      };
    })
    // Filter out empty messages UNLESS they have generativeUI (tool-only responses)
    .filter((msg) => msg.content.trim().length > 0 || msg.generativeUI !== undefined);

  // Stable callbacks for file upload
  const handleAddFiles = useCallback((files: FileList) => fileUpload.addFiles(files), [fileUpload]);

  return (
    <>
      {/* Register tool renderer for backend tool calls */}
      <ToolRenderer />
      <ChatWindow
        messages={chatMessages}
        isLoading={isLoading}
        onSendMessage={sendMessage}
        sessionId={threadId}
        uploadConfig={uploadConfig}
        attachments={fileUpload.files}
        isUploading={fileUpload.isUploading}
        onAddFiles={handleAddFiles}
        onRemoveFile={fileUpload.removeFile}
        onUploadAll={fileUpload.uploadAll}
        onClearFiles={fileUpload.clear}
      />
    </>
  );
}
