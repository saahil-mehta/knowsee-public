"use client";

import { createAuthClient } from "better-auth/react";
import { twoFactorClient, emailOTPClient } from "better-auth/client/plugins";

/**
 * Better Auth client instance for React components.
 *
 * Provides hooks and methods for:
 * - Sign in/up with email and password
 * - Session management (useSession hook)
 * - Email OTP verification
 * - Two-factor authentication (TOTP setup and verification)
 *
 * The client communicates with the auth API at /api/auth/*
 */
export const authClient = createAuthClient({
  plugins: [
    // Email OTP for email verification
    emailOTPClient(),
    // Two-factor authentication with TOTP
    twoFactorClient({
      // Redirect to TOTP verification page when 2FA is required
      onTwoFactorRedirect() {
        window.location.href = "/verify-totp";
      },
    }),
  ],
});

// Export commonly used hooks and methods
export const { signIn, signUp, signOut, useSession } = authClient;
