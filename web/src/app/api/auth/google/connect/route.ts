import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { oauthConnections } from "@/lib/schema";
import { getAuthorizationUrl, GOOGLE_DRIVE_PROVIDER } from "@/lib/google-oauth";

/**
 * GET /api/auth/google/connect
 *
 * Initiates Google OAuth flow for Drive access.
 * Returns the authorization URL for the frontend to redirect to.
 */
export async function GET() {
  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a connection (to determine if we need consent)
  const db = createPostgresDb();
  const existing = await db
    .select({ refreshToken: oauthConnections.refreshToken })
    .from(oauthConnections)
    .where(
      and(
        eq(oauthConnections.userId, session.user.id),
        eq(oauthConnections.provider, GOOGLE_DRIVE_PROVIDER),
      ),
    )
    .limit(1);

  // Only force consent if we don't have a refresh token yet
  const needsConsent = existing.length === 0 || !existing[0].refreshToken;

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie (httpOnly, short-lived)
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Generate authorization URL with user's email as hint
  const authUrl = getAuthorizationUrl(state, session.user.email, needsConsent);

  return NextResponse.json({ url: authUrl });
}
