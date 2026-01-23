"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCopilotChat } from "@copilotkit/react-core";
import { ChatLayoutProvider } from "@/contexts/chat-layout-context";
import { SessionSidebar, type SessionSidebarRef } from "@/components/session-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * Chat layout - persists across all /chat/* routes.
 *
 * This layout contains the sidebar and header, which remain mounted
 * when navigating between sessions. Only the page content (children)
 * remounts, eliminating the flicker caused by full page remounts.
 */
export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { reset } = useCopilotChat();
  const sidebarRef = useRef<SessionSidebarRef>(null);

  // Handle new chat - generate UUID and navigate directly
  const handleNewChat = useCallback(() => {
    reset();
    const newSessionId = crypto.randomUUID();
    router.push(`/chat/${newSessionId}`);
  }, [reset, router]);

  // Refresh sidebar when a new session is created (called from page via context)
  const handleSessionCreated = useCallback(() => {
    sidebarRef.current?.refresh();
  }, []);

  return (
    <SidebarProvider>
      <SessionSidebar ref={sidebarRef} onNewChat={handleNewChat} />
      <SidebarInset>
        {/* Header with sidebar toggle and theme toggle */}
        <header className="flex shrink-0 items-center gap-1 px-2 pt-4.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarTrigger />
            </TooltipTrigger>
            <TooltipContent side="bottom">
              Toggle Sidebar <kbd className="ml-2 text-xs opacity-60">⌘B</kbd>
            </TooltipContent>
          </Tooltip>
          <ThemeToggle />
        </header>

        {/* Main content area - only this changes on navigation */}
        <ChatLayoutProvider onSessionCreated={handleSessionCreated}>
          <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
        </ChatLayoutProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
