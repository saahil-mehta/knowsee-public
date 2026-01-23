"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { FileTextIcon, FileIcon, ImageIcon } from "lucide-react";
import { Message, MessageContent, MessageResponse } from "./message";
import { TypingIndicator } from "./typing-indicator";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Generative UI renderer from CopilotKit hooks (useDefaultTool, useFrontendTool, etc.) */
  generativeUI?: () => ReactNode;
};

export type MessageListProps = {
  messages: ChatMessage[];
  isLoading?: boolean;
};

/**
 * Parse user message to extract file attachment info.
 * Messages with attachments have format: "[Uploaded files: file1.pdf, file2.png]\n\n<actual message>"
 */
function parseUserMessage(content: string): {
  files: string[];
  text: string;
} {
  const match = content.match(/^\[Uploaded files: ([^\]]+)\]\n\n?([\s\S]*)$/);
  if (match) {
    const fileNames = match[1].split(", ").map((f) => f.trim());
    return { files: fileNames, text: match[2] };
  }
  return { files: [], text: content };
}

/** Get appropriate icon for file type based on extension */
function getFileIcon(filename: string) {
  const ext = filename.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext || "")) {
    return <ImageIcon className="size-3.5" />;
  }
  if (ext === "pdf") {
    return <FileTextIcon className="size-3.5" />;
  }
  return <FileIcon className="size-3.5" />;
}

/** Render file attachment badges for user messages (inside blue bubble) */
function FileAttachmentBadges({ files }: { files: string[] }) {
  if (files.length === 0) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {files.map((filename) => (
        <span
          key={filename}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-2 py-1 text-xs font-medium text-white"
        >
          {getFileIcon(filename)}
          <span className="max-w-[150px] truncate">{filename}</span>
        </span>
      ))}
    </div>
  );
}

export function MessageList({ messages, isLoading = false }: MessageListProps) {
  // Show typing indicator only when waiting for the first token, not during active streaming.
  // Once an assistant message appears, the streaming text itself provides visual feedback.
  const lastMessage = messages[messages.length - 1];
  const isWaitingForResponse = isLoading && lastMessage?.role !== "assistant";

  return (
    <>
      {messages.map((message, index) => {
        const isUser = message.role === "user";
        const isLastMessage = index === messages.length - 1;
        const isStreaming = isLoading && isLastMessage && !isUser;
        const { files, text } = isUser
          ? parseUserMessage(message.content)
          : { files: [], text: message.content };

        // Reduce gap between consecutive assistant messages (streaming produces multiple)
        const prevMessage = messages[index - 1];
        const isConsecutiveAssistant = !isUser && prevMessage?.role === "assistant";

        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.3,
              delay: isLastMessage ? 0.1 : 0,
            }}
            // Negative margin to counteract container gap-6 for consecutive assistant messages
            className={isConsecutiveAssistant ? "-mt-4" : undefined}
          >
            <Message from={message.role}>
              <MessageContent>
                {isUser ? (
                  <>
                    <FileAttachmentBadges files={files} />
                    {text && <span>{text}</span>}
                  </>
                ) : (
                  <>
                    {/* Render generative UI (tool calls, widgets, etc.) if present */}
                    {message.generativeUI?.()}
                    {/* Render text response */}
                    {text && <MessageResponse isStreaming={isStreaming}>{text}</MessageResponse>}
                  </>
                )}
              </MessageContent>
            </Message>
          </motion.div>
        );
      })}

      {isWaitingForResponse && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <TypingIndicator />
        </motion.div>
      )}
    </>
  );
}
