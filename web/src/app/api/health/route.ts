import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint for Cloud Run startup and liveness probes.
 *
 * This endpoint must:
 * - Respond quickly (no external calls)
 * - Not require authentication
 * - Return 2xx status when healthy
 */
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "knowsee-frontend",
    timestamp: new Date().toISOString(),
  });
}
