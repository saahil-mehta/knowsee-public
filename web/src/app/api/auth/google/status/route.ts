import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { oauthConnections } from "@/lib/schema";
import { GOOGLE_DRIVE_PROVIDER } from "@/lib/google-oauth";

/**
 * GET /api/auth/google/status
 *
 * Returns the Google Drive connection status for the current user.
 */
export async function GET() {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createPostgresDb();

    // Find connection for this user
    const connections = await db
      .select({
        providerEmail: oauthConnections.providerEmail,
        tokenExpiry: oauthConnections.tokenExpiry,
      })
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, session.user.id),
          eq(oauthConnections.provider, GOOGLE_DRIVE_PROVIDER),
        ),
      )
      .limit(1);

    if (connections.length === 0) {
      return NextResponse.json({
        connected: false,
      });
    }

    const connection = connections[0];

    return NextResponse.json({
      connected: true,
      email: connection.providerEmail,
      expiresAt: connection.tokenExpiry?.toISOString(),
    });
  } catch (err) {
    console.error("Google status check error:", err);
    return NextResponse.json({ error: "Failed to check connection status" }, { status: 500 });
  }
}
