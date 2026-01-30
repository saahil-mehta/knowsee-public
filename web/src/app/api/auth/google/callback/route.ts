import { NextRequest, NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { oauthConnections } from "@/lib/schema";
import {
  exchangeCodeForTokens,
  getGoogleUserInfo,
  GOOGLE_DRIVE_PROVIDER,
} from "@/lib/google-oauth";

/**
 * Returns an HTML page that communicates result to opener and closes popup.
 */
function createPopupResponse(success: boolean, message?: string): NextResponse {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Google Drive Connection</title>
</head>
<body>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: 'google-drive-oauth',
        success: ${success},
        message: ${message ? `"${message}"` : "null"}
      }, window.location.origin);
      window.close();
    } else {
      // If no opener (direct navigation), redirect to home
      window.location.href = '/';
    }
  </script>
  <p>${success ? "Connected successfully! This window will close." : `Error: ${message || "Unknown error"}`}</p>
</body>
</html>
  `.trim();

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}

/**
 * GET /api/auth/google/callback
 *
 * Handles OAuth callback from Google.
 * Exchanges code for tokens and stores them in the database.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Handle error from Google (user denied consent)
  if (error) {
    return createPopupResponse(false, error);
  }

  // Validate required parameters
  if (!code || !state) {
    return createPopupResponse(false, "Missing code or state");
  }

  // Validate state token (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get("google_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    return createPopupResponse(false, "Invalid state token");
  }

  // Clear state cookie
  cookieStore.delete("google_oauth_state");

  // Get authenticated user
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return createPopupResponse(false, "Not authenticated");
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get user's Google email for display
    const googleUser = await getGoogleUserInfo(tokens.access_token);

    // Calculate token expiry
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    // Upsert connection in database
    const db = createPostgresDb();

    // Check if connection exists
    const existing = await db
      .select()
      .from(oauthConnections)
      .where(
        and(
          eq(oauthConnections.userId, session.user.id),
          eq(oauthConnections.provider, GOOGLE_DRIVE_PROVIDER),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing connection
      await db
        .update(oauthConnections)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || existing[0].refreshToken,
          tokenExpiry,
          scopes: tokens.scope,
          providerEmail: googleUser.email,
          updatedAt: new Date(),
        })
        .where(eq(oauthConnections.id, existing[0].id));
    } else {
      // Insert new connection
      await db.insert(oauthConnections).values({
        id: crypto.randomUUID(),
        userId: session.user.id,
        provider: GOOGLE_DRIVE_PROVIDER,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry,
        scopes: tokens.scope,
        providerEmail: googleUser.email,
      });
    }

    // Return success page that closes popup
    return createPopupResponse(true);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return createPopupResponse(false, message);
  }
}
