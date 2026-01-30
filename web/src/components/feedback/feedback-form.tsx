"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  CircleAlert,
  Bug,
  Lightbulb,
  HelpCircle,
  MessageSquare,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TypewriterText } from "@/components/chat/typewriter-text";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "bug", label: "Bug", icon: Bug },
  { id: "feature_request", label: "Feature", icon: Lightbulb },
  { id: "question", label: "Question", icon: HelpCircle },
  { id: "other", label: "Other", icon: MessageSquare },
] as const;

type CategoryId = (typeof CATEGORIES)[number]["id"];

export function FeedbackForm() {
  const router = useRouter();
  const [category, setCategory] = React.useState<CategoryId | null>(null);
  const [message, setMessage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!category) {
      setError("Please select a category");
      return;
    }

    if (!message.trim()) {
      setError("Please enter your feedback");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to submit feedback");
      }

      toast.success("Feedback submitted — thank you!");
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <Link
          href="/"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="font-serif text-4xl text-foreground">
          <TypewriterText text="Share your feedback" speed={40} startDelay={200} />
        </h1>
        <p className="mt-2 text-muted-foreground">Help us make Knowsee better for everyone.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center justify-center gap-2 text-sm text-destructive">
            <CircleAlert className="size-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Category selector - premium segmented control */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Category</label>
          <div className="grid grid-cols-4 gap-2">
            {CATEGORIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategory(id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                  category === id
                    ? "border-foreground bg-foreground/5"
                    : "border-transparent bg-muted/50 hover:bg-muted",
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    category === id ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "text-xs font-medium",
                    category === id ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message textarea */}
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium text-foreground">
            Your feedback
          </label>
          <Textarea
            id="message"
            placeholder="Tell us what's on your mind..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isLoading}
            className="min-h-32 resize-none rounded-2xl px-4 py-3"
            maxLength={10000}
          />
          <p className="text-right text-xs text-muted-foreground">{message.length}/10000</p>
        </div>

        <Button
          type="submit"
          className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
          disabled={isLoading || !category || !message.trim()}
        >
          {isLoading && <Loader2 className="animate-spin" />}
          Submit feedback
        </Button>
      </form>
    </div>
  );
}
