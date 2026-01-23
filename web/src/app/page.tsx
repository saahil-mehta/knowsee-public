import { redirect } from "next/navigation";

/**
 * Root page - redirects to new chat.
 *
 * The main chat interface lives at /chat/[sessionId].
 * Visiting the root starts a new conversation.
 */
export default function HomePage() {
  redirect("/chat/new");
}
