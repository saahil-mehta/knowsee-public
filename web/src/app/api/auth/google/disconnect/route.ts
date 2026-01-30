import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { oauthConnections } from "@/lib/schema";
import { GOOGLE_DRIVE_PROVIDER } from "@/lib/google-oauth";

/**
 * DELETE /api/auth/google/disconnect
 *
 * Removes the Google Drive connection for the current user.
 * Deletes tokens from the database.
 */
export async function DELETE() {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = createPostgresDb();

    // Delete connection for this user
    const result = await db
      .delete(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, session.user.id),
          eq(oauthConnections.provider, GOOGLE_DRIVE_PROVIDER),
        ),
      )
      .returning({ id: oauthConnections.id });

    if (result.length === 0) {
      return NextResponse.json({ error: "No Google Drive connection found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Google disconnect error:", err);
    return NextResponse.json({ error: "Failed to disconnect Google Drive" }, { status: 500 });
  }
}
