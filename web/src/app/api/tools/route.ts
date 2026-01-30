import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Tool definition for the capabilities API.
 * Describes an agent/tool available to the user.
 */
type Tool = {
  id: string;
  name: string;
  description: string;
  icon: "search" | "database" | "file-text";
  /** Whether this tool is always available or requires configuration */
  alwaysAvailable: boolean;
};

/**
 * Static tool definitions.
 * In future, this could be fetched from backend or filtered by user permissions.
 */
const AVAILABLE_TOOLS: Tool[] = [
  {
    id: "web_search",
    name: "Web Search",
    description: "Searches the web for current information, news, and facts",
    icon: "search",
    alwaysAvailable: true,
  },
  {
    id: "data_analyst",
    name: "Data Analyst",
    description: "Queries BigQuery datasets and creates visualisations",
    icon: "database",
    alwaysAvailable: true,
  },
];

/**
 * GET /api/tools
 * Returns the tools/agents available to the current user.
 * Used by the Tools pill to show available capabilities.
 */
export async function GET() {
  // Verify user is authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized", tools: [] }, { status: 401 });
  }

  // For now, return all tools. Later this could filter based on:
  // - User permissions
  // - Organisation settings
  // - Feature flags
  return NextResponse.json({ tools: AVAILABLE_TOOLS });
}
