import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import { createPostgresDb } from "@/lib/db";
import { feedback, user } from "@/lib/schema";
import { sendEmail } from "@/lib/email";
import { eq } from "drizzle-orm";

const FEEDBACK_CATEGORIES = ["bug", "feature_request", "question", "other"] as const;
type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

const CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: "Bug Report",
  feature_request: "Feature Request",
  question: "Question",
  other: "Other",
};

interface FeedbackRequest {
  category: string;
  message: string;
}

/**
 * POST /api/feedback
 * Submit user feedback. Requires authentication.
 * Stores in database and sends email notification.
 */
export async function POST(request: Request) {
  // Validate authentication
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse and validate request body
  let body: FeedbackRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { category, message } = body;

  if (!category || !FEEDBACK_CATEGORIES.includes(category as FeedbackCategory)) {
    return NextResponse.json(
      { error: "Invalid category. Must be one of: bug, feature_request, question, other" },
      { status: 400 },
    );
  }

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (message.length > 10000) {
    return NextResponse.json({ error: "Message too long (max 10000 characters)" }, { status: 400 });
  }

  try {
    const db = createPostgresDb();

    // Get user details for email
    const [userRecord] = await db.select().from(user).where(eq(user.id, session.user.id)).limit(1);

    // Insert feedback
    const feedbackId = nanoid();
    await db.insert(feedback).values({
      id: feedbackId,
      userId: session.user.id,
      category: category as FeedbackCategory,
      message: message.trim(),
    });

    // Send email notification
    const userName = userRecord?.name || session.user.name || "Unknown";
    const userEmail = userRecord?.email || session.user.email || "Unknown";
    const categoryLabel = CATEGORY_LABELS[category as FeedbackCategory];
    const timestamp = new Date().toISOString();

    await sendEmail({
      to: "feedback@example.com",
      subject: `[Knowsee Feedback] ${categoryLabel} from ${userName}`,
      text: `New feedback submitted on Knowsee

Category: ${categoryLabel}
From: ${userName} (${userEmail})
Time: ${timestamp}

Message:
${message.trim()}

---
Feedback ID: ${feedbackId}`,
    });

    return NextResponse.json({ success: true, id: feedbackId });
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}
