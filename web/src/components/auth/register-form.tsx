"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TypewriterText } from "@/components/chat/typewriter-text";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);

    try {
      await signUp.email(
        { email, password, name },
        {
          onSuccess: () => {
            // Mark that OTP was just sent (for fresh signup flow)
            sessionStorage.setItem("knowsee_otp_sent", "true");
            // Redirect to email verification page
            router.push("/verify-email");
          },
          onError: (ctx) => {
            setError(ctx.error.message || "Failed to create account");
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
          <TypewriterText text={"Knowsee.\nCreate your account"} speed={40} startDelay={200} />
        </h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          <Input
            id="name"
            type="text"
            placeholder="Name"
            aria-label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
            className="h-12 rounded-full px-5"
          />
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
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm password"
            aria-label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
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
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-foreground hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}
