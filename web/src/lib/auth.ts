import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { twoFactor, emailOTP } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { sendOTPEmail } from "./email";
import { createPostgresDb } from "./db";
// Explicit imports prevent tree-shaking from removing table definitions
import { user, session, account, verification, twoFactor as twoFactorTable } from "./schema";

/**
 * Better Auth server instance.
 *
 * Phase 1: Email/Password + TOTP 2FA
 * Phase 2: Will add Google OAuth, Azure AD OAuth
 *
 * Database: PostgreSQL via Drizzle
 * - Development: Local Postgres via Docker (make db-up)
 * - Production: Cloud SQL PostgreSQL
 */

// PostgreSQL database configuration via Drizzle
function getDatabaseConfig() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL environment variable is required. Run 'make db-up' to start local Postgres.",
    );
  }
  const db = createPostgresDb();
  return drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification, twoFactor: twoFactorTable },
  });
}

export const auth = betterAuth({
  appName: "Knowsee",

  // Base URL from environment (set via BETTER_AUTH_URL in Cloud Run)
  baseURL: process.env.BETTER_AUTH_URL,

  // Trusted origins for CORS validation in production
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ["http://localhost:3000"],

  // Database configuration (PostgreSQL via Drizzle)
  database: getDatabaseConfig(),

  // Email and password authentication
  emailAndPassword: {
    enabled: true,
    // Email verification is enforced via proxy, not here
    // This allows unverified users to sign in and get a session,
    // then proxy redirects them to /verify-email (the "wall")
    requireEmailVerification: false,
  },

  // Session configuration
  session: {
    // Cookie settings for cross-origin requests
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },

  // Production cookie and security settings
  advanced: {
    // Ensure cookies are secure in production (HTTPS only)
    useSecureCookies: process.env.NODE_ENV === "production",
  },

  plugins: [
    // Email OTP for email verification
    emailOTP({
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
      sendVerificationOnSignUp: true,
      async sendVerificationOTP({ email, otp, type }) {
        // Only send OTP for email verification (not sign-in or password reset)
        if (type === "email-verification") {
          await sendOTPEmail(email, otp);
        }
      },
    }),
    // Two-factor authentication with TOTP
    twoFactor({
      issuer: "Knowsee",
    }),
    // Next.js cookie handling for server actions (must be last)
    nextCookies(),
  ],
});

// Export types for use in components
export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;
