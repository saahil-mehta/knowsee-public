import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { headers } from "next/headers";

// NOTE: auth is dynamically imported below to prevent module-level database
// connection attempts, which would crash health checks and other excluded routes.

/**
 * Proxy for route protection (Next.js 16+).
 *
 * Enforces the "impenetrable wall" for email verification:
 * - Unauthenticated users → /login
 * - Authenticated but unverified users → /verify-email (cannot escape)
 * - Verified users → full app access
 *
 * Note: x-user-id header injection happens in the BFF API routes,
 * not in proxy, because Next.js proxy cannot modify headers
 * that reach server components.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const isPublicRoute = pathname.startsWith("/api/auth");
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Dynamic import to avoid module-level database connection
  const { auth } = await import("./lib/auth");

  // Get full session with user data (includes emailVerified)
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Auth routes for unauthenticated users
  const isUnauthenticatedRoute = pathname.startsWith("/login") || pathname.startsWith("/register");

  // Email verification route (the "wall")
  const isVerifyEmailRoute = pathname.startsWith("/verify-email");

  // TOTP verification route (for 2FA)
  const isTotpRoute = pathname.startsWith("/verify-totp");

  // No session - must login (unless already on login/register)
  if (!session) {
    if (isUnauthenticatedRoute) {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Has session but email not verified - THE WALL
  // User cannot go anywhere except /verify-email
  if (!session.user.emailVerified) {
    if (isVerifyEmailRoute) {
      return NextResponse.next();
    }
    // Force to verification page - no escape
    return NextResponse.redirect(new URL("/verify-email", request.url));
  }

  // Verified user trying to access auth routes - redirect to app
  if (isUnauthenticatedRoute || isVerifyEmailRoute) {
    return NextResponse.redirect(new URL("/chat/new", request.url));
  }

  // TOTP route is allowed for verified users who need 2FA
  if (isTotpRoute) {
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  // Match all routes except static files and API routes (except auth check)
  // Note: Next.js 16 proxy always runs on Node.js runtime
  matcher: [
    "/((?!_next/static|_next/image|icon|apple-icon|favicon.ico|api/copilotkit|api/sessions|api/events|api/health).*)",
  ],
};
