"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  Conversation,
  ConversationAutoScroll,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "./conversation";
import { MessageList, type ChatMessage } from "./message-list";
import { PromptInput } from "./prompt-input";
import { TypewriterText } from "./typewriter-text";
import type { FileAttachment, FileUploadError } from "@/hooks/use-file-upload";
import type { UploadConfig } from "@/hooks/use-upload-config";

export type ChatWindowProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
  onSendMessage: (message: { id: string; role: "user"; content: string }) => void;
  placeholder?: string;
  // Session ID for draft persistence
  sessionId?: string;
  // File upload integration (optional)
  uploadConfig?: UploadConfig | null;
  attachments?: FileAttachment[];
  isUploading?: boolean;
  onAddFiles?: (files: FileList) => void;
  onRemoveFile?: (id: string) => void;
  onUploadAll?: () => Promise<boolean>;
  onClearFiles?: () => void;
  onFileError?: (error: FileUploadError) => void;
};

export function ChatWindow({
  messages,
  isLoading = false,
  onSendMessage,
  placeholder = "Send a message...",
  sessionId,
  uploadConfig,
  attachments,
  isUploading,
  onAddFiles,
  onRemoveFile,
  onUploadAll,
  onClearFiles,
  onFileError,
}: ChatWindowProps) {
  const handleSubmit = useCallback(
    (content: string) => {
      onSendMessage({
        id: Date.now().toString(),
        role: "user",
        content,
      });
    },
    [onSendMessage],
  );

  // Track input container height for scroll button positioning
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [inputHeight, setInputHeight] = useState(128); // Default ~bottom-32

  useEffect(() => {
    const container = inputContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height ?? 128;
      setInputHeight(height);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full flex-col">
      {/* Scrollable message area with padding at bottom for floating input */}
      <Conversation className="min-h-0 flex-1" isStreaming={isLoading}>
        <ConversationContent className="pb-38">
          {isEmpty ? (
            <ConversationEmptyState className="items-start justify-start pt-16">
              <h1 className="font-serif text-4xl text-foreground">
                <TypewriterText
                  text="Hello from Knowsee. How can I help you?"
                  speed={40}
                  startDelay={200}
                />
              </h1>
            </ConversationEmptyState>
          ) : (
            <MessageList messages={messages} isLoading={isLoading} />
          )}
        </ConversationContent>
        <ConversationAutoScroll />
        <ConversationScrollButton style={{ bottom: inputHeight + 20 }} />
      </Conversation>

      {/* Floating input at bottom with gradient fade */}
      <div
        ref={inputContainerRef}
        className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/80 to-transparent px-4 pt-8 pb-4"
      >
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={handleSubmit}
            isLoading={isLoading}
            placeholder={placeholder}
            sessionId={sessionId}
            uploadConfig={uploadConfig}
            attachments={attachments}
            isUploading={isUploading}
            onAddFiles={onAddFiles}
            onRemoveFile={onRemoveFile}
            onUploadAll={onUploadAll}
            onClearFiles={onClearFiles}
            onFileError={onFileError}
          />
        </div>
      </div>
    </div>
  );
}
