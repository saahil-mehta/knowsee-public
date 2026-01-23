"use client";

import { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCopilotContext, useCopilotChat } from "@copilotkit/react-core";
import { useSSEEvents } from "@/hooks/use-sse-events";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { TrashIcon, PlusIcon } from "@/components/icons";
import { UserMenu } from "@/components/settings";
import type { ChatSession, SessionsResponse } from "@/lib/types";

// Clear draft from localStorage when session is deleted
const clearDraft = (sessionId: string) => {
  if (typeof window !== "undefined") {
    localStorage.removeItem(`knowsee:draft:${sessionId}`);
  }
};

interface SessionSidebarProps {
  onNewChat: () => void;
}

export interface SessionSidebarRef {
  refresh: () => void;
}

export const SessionSidebar = forwardRef<SessionSidebarRef, SessionSidebarProps>(
  function SessionSidebar({ onNewChat }, ref) {
    const router = useRouter();
    const { threadId } = useCopilotContext();
    const { reset } = useCopilotChat();
    const { setOpenMobile } = useSidebar();
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
    const [deleteSessionId, setDeleteSessionId] = useState<string | null>(null);

    // Handle real-time title updates via SSE
    const handleTitleGenerated = useCallback(
      ({ session_id, title }: { session_id: string; title: string }) => {
        setSessions((prev) => {
          // Check if session exists
          const existingSession = prev.find((s) => s.id === session_id);
          if (existingSession) {
            // Update existing session's title
            return prev.map((s) => (s.id === session_id ? { ...s, title } : s));
          } else {
            // New session - add it to the top of the list
            return [{ id: session_id, title, lastUpdated: Date.now() / 1000 }, ...prev];
          }
        });
      },
      [],
    );

    // Subscribe to SSE events for real-time updates
    useSSEEvents({
      onTitleGenerated: handleTitleGenerated,
    });

    const fetchSessions = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/sessions");
        const data: SessionsResponse = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setSessions(data.sessions);
          setError(null);
        }
      } catch (err) {
        setError("Failed to load sessions");
      } finally {
        setLoading(false);
      }
    };

    // Expose refresh method to parent
    useImperativeHandle(ref, () => ({
      refresh: fetchSessions,
    }));

    useEffect(() => {
      fetchSessions();
      // Refresh sessions periodically
      const interval = setInterval(fetchSessions, 30000);
      return () => clearInterval(interval);
    }, []);

    const handleDeleteSession = async (sessionId: string) => {
      try {
        await fetch(`/api/sessions/${sessionId}`, {
          method: "DELETE",
        });
        clearDraft(sessionId); // Clean up persisted draft
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (threadId === sessionId) {
          router.push("/chat/new");
        }
      } catch (err) {
        console.error("Failed to delete session:", err);
      }
      setDeleteSessionId(null);
    };

    const handleDeleteAll = async () => {
      try {
        // Delete all sessions
        await Promise.all(
          sessions.map((session) =>
            fetch(`/api/sessions/${session.id}`, {
              method: "DELETE",
            }),
          ),
        );
        // Clean up all persisted drafts
        sessions.forEach((session) => clearDraft(session.id));
        setSessions([]);
        router.push("/chat/new");
      } catch (err) {
        console.error("Failed to delete all sessions:", err);
      }
      setDeleteAllDialogOpen(false);
    };

    const handleSelectSession = (sessionId: string) => {
      // Don't do anything if clicking the already-active session
      if (sessionId === threadId) {
        setOpenMobile(false); // Still close mobile sidebar
        return;
      }

      reset(); // Clear CopilotChat's messages before switching
      setOpenMobile(false); // Close mobile sidebar after selection
      router.push(`/chat/${sessionId}`); // Navigate - URL change triggers threadId sync
    };

    const formatDate = (timestamp: number) => {
      const date = new Date(timestamp * 1000);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return date.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (diffDays === 1) {
        return "Yesterday";
      } else if (diffDays < 7) {
        return date.toLocaleDateString("en-GB", { weekday: "short" });
      } else {
        return date.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
      }
    };

    return (
      <>
        <Sidebar variant="floating" className="border-r-0">
          {/* Header with title and action icons */}
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex w-full items-center justify-between">
                  <button
                    onClick={() => {
                      setOpenMobile(false);
                      onNewChat();
                    }}
                    className="flex items-center"
                  >
                    <span className="cursor-pointer overflow-visible rounded-md pr-3 pl-2 font-serif text-2xl transition-colors hover:bg-accent">
                      <span className="font-normal">Know</span>
                      <span className="-ml-0.5 font-light italic opacity-70">see.</span>
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    {sessions.length > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => setDeleteAllDialogOpen(true)}
                          >
                            <TrashIcon size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete All Chats</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => {
                            setOpenMobile(false);
                            onNewChat();
                          }}
                        >
                          <PlusIcon size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">New Chat</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Session list */}
          <SidebarContent className="px-2">
            {loading && sessions.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">Loading...</div>
            ) : error ? (
              <div className="px-2 py-4 text-sm text-destructive">{error}</div>
            ) : sessions.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">
                Your conversations will appear here once you start chatting!
              </div>
            ) : (
              <SidebarMenu>
                {sessions.map((session) => (
                  <SidebarMenuItem key={session.id} className="group/session">
                    <SidebarMenuButton
                      isActive={threadId === session.id}
                      onClick={() => handleSelectSession(session.id)}
                      className="h-auto w-full justify-start px-2 py-2 group-hover/session:bg-sidebar-accent group-hover/session:text-sidebar-accent-foreground"
                    >
                      <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-medium">{session.title}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(session.lastUpdated)}
                        </p>
                      </div>
                    </SidebarMenuButton>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSessionId(session.id);
                          }}
                          className="absolute top-1/2 right-1 -translate-y-1/2 rounded-md p-1.5 opacity-0 transition-all duration-200 group-hover/session:opacity-100 hover:bg-sidebar hover:text-destructive"
                        >
                          <TrashIcon size={14} />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">Delete</TooltipContent>
                    </Tooltip>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarContent>

          <SidebarFooter className="p-2">
            <UserMenu />
          </SidebarFooter>
        </Sidebar>

        {/* Delete All Chats Dialog */}
        <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all chats?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your conversations.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAll}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete All
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Single Session Dialog */}
        <AlertDialog
          open={deleteSessionId !== null}
          onOpenChange={(open) => !open && setDeleteSessionId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This conversation will be permanently deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteSessionId && handleDeleteSession(deleteSessionId)}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  },
);
