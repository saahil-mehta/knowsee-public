const agentUrl = process.env.AGENT_URL;

if (!agentUrl) {
  throw new Error(
    "AGENT_URL environment variable is required. Set it in web/.env.development or your deployment environment.",
  );
}

/**
 * GET /api/events
 * Proxies SSE events from the backend for real-time updates.
 *
 * This streams Server-Sent Events through to the client, enabling
 * real-time features like title generation notifications.
 *
 * The backend sends periodic heartbeats (every 30s) as SSE comments to
 * prevent proxy timeouts. These are transparent to the frontend - EventSource
 * ignores comment lines (: prefix) per the SSE specification.
 */
export async function GET() {
  const response = await fetch(`${agentUrl}/api/events`, {
    headers: {
      Accept: "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok || !response.body) {
    return new Response("Failed to connect to event stream", {
      status: response.status,
    });
  }

  // Stream the SSE events through to the client
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering if behind reverse proxy
    },
  });
}
