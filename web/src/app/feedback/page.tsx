import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { FeedbackForm } from "@/components/feedback/feedback-form";

export default async function FeedbackPage() {
  // Check authentication server-side
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return <FeedbackForm />;
}
