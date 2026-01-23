import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const agentUrl = process.env.AGENT_URL;

if (!agentUrl) {
  throw new Error(
    "AGENT_URL environment variable is required. Set it in web/.env.development or your deployment environment.",
  );
}

/**
 * GET /api/sessions
 * Proxies to backend to list all chat sessions for the current user.
 * Requires authentication - user ID is extracted from Better Auth session.
 */
export async function GET() {
  // Get authenticated user from Better Auth session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized", sessions: [] }, { status: 401 });
  }

  const userId = session.user.email;

  const response = await fetch(`${agentUrl}/api/sessions?user_id=${encodeURIComponent(userId)}`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
