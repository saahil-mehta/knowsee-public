"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";

import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { TypewriterText } from "@/components/chat/typewriter-text";

/**
 * Email verification form with OTP input.
 *
 * This is the "impenetrable wall" - users cannot access the app
 * until they verify their email via OTP.
 *
 * Handles two scenarios:
 * 1. Fresh signup - OTP was auto-sent, user enters it
 * 2. Returning unverified user - must request OTP resend first
 */
export function EmailVerifyForm() {
  const router = useRouter();
  const { data: session } = useSession();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [needsResend, setNeedsResend] = React.useState(false);

  // Check if this is a returning user who needs to request a new OTP
  // We detect this by checking if there's no recent OTP (user closed browser)
  React.useEffect(() => {
    // If user navigated here without a fresh signup, they need to resend
    const isReturningUser = sessionStorage.getItem("knowsee_otp_sent") !== "true";
    if (isReturningUser && session?.user?.email) {
      setNeedsResend(true);
    }
  }, [session?.user?.email]);

  const handleResendOTP = async () => {
    if (!session?.user?.email) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
        email: session.user.email,
        type: "email-verification",
      });

      if (sendError) {
        setError(sendError.message || "Failed to send verification code");
      } else {
        setSuccess("Verification code sent to your email");
        setNeedsResend(false);
        sessionStorage.setItem("knowsee_otp_sent", "true");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!session?.user?.email) {
      setError("Session not found. Please log in again.");
      return;
    }

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const { error: verifyError } = await authClient.emailOtp.verifyEmail({
        email: session.user.email,
        otp: code,
      });

      if (verifyError) {
        if (verifyError.code === "TOO_MANY_ATTEMPTS") {
          setError("Too many attempts. Please request a new code.");
          setNeedsResend(true);
        } else {
          setError(verifyError.message || "Invalid code");
        }
        setCode("");
      } else {
        // Email verified - redirect to app
        sessionStorage.removeItem("knowsee_otp_sent");
        toast.success("Email verified successfully");
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits are entered
  React.useEffect(() => {
    if (code.length === 6 && !isLoading && !needsResend) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const userEmail = session?.user?.email || "your email";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-foreground">
          <TypewriterText text={"Knowsee.\nVerify your email"} speed={40} startDelay={200} />
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {needsResend
            ? "Request a new verification code to continue"
            : `Enter the 6-digit code sent to ${userEmail}`}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400">
              {success}
            </div>
          )}

          {needsResend ? (
            // Returning user - show resend button prominently
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Mail className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Your previous verification code has expired.
                <br />
                Request a new one to continue.
              </p>
              <Button
                type="button"
                onClick={handleResendOTP}
                disabled={isResending}
                className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
              >
                {isResending && <Loader2 className="animate-spin" />}
                Send verification code
              </Button>
            </div>
          ) : (
            // Fresh signup or just resent - show OTP input
            <>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isLoading}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-foreground text-background hover:bg-foreground/90"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="animate-spin" />}
                Verify email
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline disabled:opacity-50"
                >
                  {isResending ? "Sending..." : "Didn't receive the code? Resend"}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
