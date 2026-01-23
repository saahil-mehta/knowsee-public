import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth API route handler.
 *
 * This catch-all route handles all authentication endpoints:
 * - POST /api/auth/sign-in/email     - Email/password sign in
 * - POST /api/auth/sign-up/email     - Email/password sign up
 * - POST /api/auth/sign-out          - Sign out
 * - GET  /api/auth/session           - Get current session
 * - POST /api/auth/two-factor/*      - 2FA operations (enable, verify, etc.)
 *
 * All routes are automatically handled by Better Auth's handler.
 */
export const { GET, POST } = toNextJsHandler(auth.handler);
