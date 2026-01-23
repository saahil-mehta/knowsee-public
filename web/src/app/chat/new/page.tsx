"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCopilotChat } from "@copilotkit/react-core";

/**
 * New chat page - generates a fresh session ID and redirects.
 *
 * This page is wrapped by the chat layout, so the sidebar remains visible.
 * It quickly generates a UUID and redirects to the new session.
 */
export default function NewChatPage() {
  const router = useRouter();
  const { reset } = useCopilotChat();

  useEffect(() => {
    reset();
    const newSessionId = crypto.randomUUID();
    router.replace(`/chat/${newSessionId}`);
  }, [router, reset]);

  // Brief loading state while redirecting (sidebar remains visible via layout)
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Starting new conversation...</div>
    </div>
  );
}
