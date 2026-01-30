/**
 * Google OAuth configuration and utilities for Drive access.
 *
 * Handles OAuth flow for Google Drive Picker integration.
 * Tokens are stored in oauth_connections table, separate from app auth.
 */

// OAuth configuration
export const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
  redirectUri: `${process.env.BETTER_AUTH_URL || "http://localhost:3000"}/api/auth/google/callback`,
  scopes: [
    "https://www.googleapis.com/auth/drive.readonly",
    "email", // To get user's email for display
  ],
  tokenEndpoint: "https://oauth2.googleapis.com/token",
  authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
  userInfoEndpoint: "https://www.googleapis.com/oauth2/v2/userinfo",
};

export const GOOGLE_DRIVE_PROVIDER = "google_drive";

/**
 * Generate the Google OAuth authorization URL.
 *
 * @param state - CSRF state token
 * @param loginHint - User's email to pre-fill in Google sign-in
 * @param forceConsent - If true, always show consent screen (needed for refresh token)
 */
export function getAuthorizationUrl(
  state: string,
  loginHint?: string,
  forceConsent: boolean = true,
): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_OAUTH_CONFIG.clientId,
    redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_CONFIG.scopes.join(" "),
    access_type: "offline", // Get refresh token
    state,
  });

  // Pre-fill user's email if provided
  if (loginHint) {
    params.set("login_hint", loginHint);
  }

  // Only force consent on first connection (to get refresh token)
  // Subsequent reconnections can skip consent if user already granted
  if (forceConsent) {
    params.set("prompt", "consent");
  }

  return `${GOOGLE_OAUTH_CONFIG.authEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
}> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: GOOGLE_OAUTH_CONFIG.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to exchange code for tokens");
  }

  return response.json();
}

/**
 * Refresh an access token using a refresh token.
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  expires_in: number;
  scope: string;
}> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.tokenEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_OAUTH_CONFIG.clientId,
      client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to refresh token");
  }

  return response.json();
}

/**
 * Get user info (email) from Google.
 */
export async function getGoogleUserInfo(accessToken: string): Promise<{
  email: string;
  name?: string;
}> {
  const response = await fetch(GOOGLE_OAUTH_CONFIG.userInfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get user info from Google");
  }

  return response.json();
}
