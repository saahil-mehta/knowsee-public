import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { userTeams, teamCorpora } from "@/lib/schema";

/**
 * GET /api/teams
 * Returns the teams the current user belongs to, with their knowledge base details.
 * Used by the Sources pill to show available team knowledge bases.
 */
export async function GET() {
  // Get authenticated user from Better Auth session
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized", teams: [] }, { status: 401 });
  }

  const userId = session.user.email;

  try {
    const db = createPostgresDb();

    // Get user's teams with their corpus details
    const results = await db
      .select({
        teamId: userTeams.teamId,
        displayName: teamCorpora.teamId, // Will use teamId as display name for now
        folderUrl: teamCorpora.folderUrl,
        sourceType: teamCorpora.sourceType,
        fileCount: teamCorpora.fileCount,
        lastSyncAt: teamCorpora.lastSyncAt,
      })
      .from(userTeams)
      .innerJoin(teamCorpora, eq(userTeams.teamId, teamCorpora.teamId))
      .where(eq(userTeams.userId, userId));

    // Transform to API response format
    const teams = results.map((row) => ({
      teamId: row.teamId,
      displayName: row.displayName || row.teamId,
      folderUrl: row.folderUrl,
      sourceType: row.sourceType,
      fileCount: row.fileCount ?? 0,
      lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    }));

    return NextResponse.json({ teams });
  } catch (error) {
    console.error("Failed to fetch teams:", error);
    return NextResponse.json({ error: "Failed to fetch teams", teams: [] }, { status: 500 });
  }
}
