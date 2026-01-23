"use client";

import { createContext, useContext } from "react";

interface ChatLayoutContextValue {
  /** Call this when a new session is created to refresh the sidebar */
  onSessionCreated: () => void;
}

const ChatLayoutContext = createContext<ChatLayoutContextValue | null>(null);

export function ChatLayoutProvider({
  children,
  onSessionCreated,
}: {
  children: React.ReactNode;
  onSessionCreated: () => void;
}) {
  return (
    <ChatLayoutContext.Provider value={{ onSessionCreated }}>{children}</ChatLayoutContext.Provider>
  );
}

export function useChatLayout() {
  const context = useContext(ChatLayoutContext);
  if (!context) {
    throw new Error("useChatLayout must be used within a ChatLayoutProvider");
  }
  return context;
}
