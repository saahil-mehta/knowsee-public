"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, CircleAlert } from "lucide-react";
import { toast } from "sonner";

import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypewriterText } from "@/components/chat/typewriter-text";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signIn.email(
        { email, password },
        {
          onSuccess: (ctx) => {
            // Check if 2FA is required
            if (ctx.data.twoFactorRedirect) {
              // twoFactorClient plugin handles redirect to /verify-totp
              return;
            }
            toast.success("Signed in successfully");
            router.push("/");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to sign in");
          },
        },
      );
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">
          <TypewriterText
            text={"Knowsee.\nPlease sign in to continue"}
            speed={40}
            startDelay={200}
          />
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <CircleAlert className="size-4 shrink-0" />
              {error}
            </div>
          )}
          <Input
            id="email"
            type="email"
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 rounded-full px-5"
          />
          <Input
            id="password"
            type="password"
            placeholder="Password"
            aria-label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 rounded-full px-5"
          />
        </div>
        <div className="space-y-4">
          <Button
            type="submit"
            className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="animate-spin" />}
            Sign in
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Create account
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
