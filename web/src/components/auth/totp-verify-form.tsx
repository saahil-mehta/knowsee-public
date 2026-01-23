"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function TotpVerifyForm() {
  const router = useRouter();
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsLoading(true);

    try {
      const { error: verifyError } = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: true,
      });

      if (verifyError) {
        setError(verifyError.message || "Invalid code");
        setCode("");
      } else {
        toast.success("Signed in successfully");
        router.push("/");
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
    if (code.length === 6 && !isLoading) {
      handleSubmit(new Event("submit") as unknown as React.FormEvent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Two-factor authentication</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
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
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="animate-spin" />}
            Verify
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
