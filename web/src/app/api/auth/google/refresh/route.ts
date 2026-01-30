import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { oauthConnections } from "@/lib/schema";
import { refreshAccessToken, GOOGLE_DRIVE_PROVIDER } from "@/lib/google-oauth";

/**
 * POST /api/auth/google/refresh
 *
 * Refreshes the Google Drive access token.
 * Returns the new access token for use with Picker/Drive API.
 */
export async function POST() {
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
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, session.user.id),
          eq(oauthConnections.provider, GOOGLE_DRIVE_PROVIDER),
        ),
      )
      .limit(1);

    if (connections.length === 0) {
      return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 404 });
    }

    const connection = connections[0];

    // Check if token is still valid (with 5 minute buffer)
    const now = new Date();
    const expiryBuffer = 5 * 60 * 1000; // 5 minutes
    const tokenExpiry = connection.tokenExpiry;

    if (tokenExpiry && tokenExpiry.getTime() - now.getTime() > expiryBuffer) {
      // Token is still valid, return it
      return NextResponse.json({
        accessToken: connection.accessToken,
        expiresAt: tokenExpiry.toISOString(),
      });
    }

    // Token expired or expiring soon, refresh it
    if (!connection.refreshToken) {
      return NextResponse.json(
        { error: "No refresh token available. Please reconnect." },
        { status: 400 },
      );
    }

    const tokens = await refreshAccessToken(connection.refreshToken);
    const newExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Update database
    await db
      .update(oauthConnections)
      .set({
        accessToken: tokens.access_token,
        tokenExpiry: newExpiry,
        updatedAt: new Date(),
      })
      .where(eq(oauthConnections.id, connection.id));

    return NextResponse.json({
      accessToken: tokens.access_token,
      expiresAt: newExpiry.toISOString(),
    });
  } catch (err) {
    console.error("Google token refresh error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";

    // If refresh fails, user likely revoked access externally
    return NextResponse.json({ error: message, reconnectRequired: true }, { status: 400 });
  }
}
