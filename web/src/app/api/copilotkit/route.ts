import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

// Use empty adapter since we're routing to a single ADK agent
const serviceAdapter = new ExperimentalEmptyAdapter();

// Backend agent URL - must be configured via AGENT_URL environment variable
const agentUrl = process.env.AGENT_URL;

if (!agentUrl) {
  throw new Error(
    "AGENT_URL environment variable is required. Set it in web/.env.development or your deployment environment.",
  );
}

// Create the CopilotRuntime with AG-UI client connection to the ADK agent
const runtime = new CopilotRuntime({
  agents: {
    knowsee_agent: new HttpAgent({ url: agentUrl }),
  },
});

// Track request count for correlation
let requestCount = 0;

// Next.js App Router API endpoint
export const POST = async (req: NextRequest) => {
  const requestId = ++requestCount;
  const userId = req.headers.get("x-user-id");

  // Log incoming request with auth context
  // Note: threadId is managed by CopilotKit in request body, not as a header
  console.log(`[CopilotKit:route] request #${requestId}:`, {
    auth: userId ? "authenticated" : "anonymous",
    userId: userId ?? "(none)",
  });

  // Warn if request is unauthenticated (likely misconfiguration)
  if (!userId) {
    console.warn(`[CopilotKit:route] request #${requestId}: missing x-user-id header`, {
      hint: "Check CopilotKitProvider auth state - user may not be logged in or session not loaded",
    });
  }

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
