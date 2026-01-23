import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const agentUrl = process.env.AGENT_URL;

if (!agentUrl) {
  throw new Error(
    "AGENT_URL environment variable is required. Set it in web/.env.development or your deployment environment.",
  );
}

interface RouteParams {
  params: Promise<{ sessionId: string }>;
}

/**
 * Helper to get authenticated user ID from Better Auth session.
 * Returns null if not authenticated.
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session?.user?.email ?? null;
}

/**
 * GET /api/sessions/[sessionId]
 * Proxies to backend to get a specific session with its messages.
 * Requires authentication - user ID is extracted from Better Auth session.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const { sessionId } = await params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(
    `${agentUrl}/api/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`,
    {
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}

/**
 * DELETE /api/sessions/[sessionId]
 * Proxies to backend to delete a specific session.
 * Requires authentication - user ID is extracted from Better Auth session.
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { sessionId } = await params;
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const response = await fetch(
    `${agentUrl}/api/sessions/${encodeURIComponent(sessionId)}?user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
