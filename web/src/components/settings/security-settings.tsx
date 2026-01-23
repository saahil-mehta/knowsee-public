"use client";

import { useState, useEffect } from "react";
import { Loader2, MonitorIcon, SmartphoneIcon } from "lucide-react";
import QRCode from "react-qr-code";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { authClient, useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────────────────────────────────────
 * SettingsRow - Consistent layout component for settings items
 * ───────────────────────────────────────────────────────────────────────────── */
function SettingsRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * PillButton - Rounded pill-style button
 * ───────────────────────────────────────────────────────────────────────────── */
function PillButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full border border-border/50 bg-accent/60 px-5 py-2 text-sm font-medium text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
    >
      {children}
    </button>
  );
}

interface Session {
  id: string;
  token: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: Date;
  expiresAt: Date;
}

export function SecuritySettings() {
  const { data: session, refetch } = useSession();
  const user = session?.user;

  // 2FA state
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [setupStep, setSetupStep] = useState<"password" | "qr" | "verify" | "backup">("password");

  // Sessions state
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);
  const [sessionsDialogOpen, setSessionsDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setTwoFactorEnabled(user.twoFactorEnabled || false);
      fetchSessions();
    }
  }, [user]);

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await authClient.listSessions();
      if (data) {
        setSessions(data as Session[]);
      }
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    if (setupStep === "password") {
      setTwoFactorLoading(true);
      setTwoFactorError(null);
      try {
        const { data, error } = await authClient.twoFactor.enable({
          password: setupPassword,
        });
        if (error) {
          setTwoFactorError(error.message || "Failed to enable 2FA");
          return;
        }
        if (data) {
          setTotpUri(data.totpURI);
          setBackupCodes(data.backupCodes);
          setSetupStep("qr");
        }
      } catch (err) {
        setTwoFactorError(err instanceof Error ? err.message : "Failed to enable 2FA");
      } finally {
        setTwoFactorLoading(false);
      }
    } else if (setupStep === "qr") {
      setSetupStep("verify");
    } else if (setupStep === "verify") {
      setTwoFactorLoading(true);
      setTwoFactorError(null);
      try {
        const { error } = await authClient.twoFactor.verifyTotp({
          code: verifyCode,
        });
        if (error) {
          setTwoFactorError(error.message || "Invalid code");
          return;
        }
        setSetupStep("backup");
        setTwoFactorEnabled(true);
        await refetch();
      } catch (err) {
        setTwoFactorError(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setTwoFactorLoading(false);
      }
    } else if (setupStep === "backup") {
      resetSetupDialog();
    }
  };

  const handleDisable2FA = async () => {
    setTwoFactorLoading(true);
    setTwoFactorError(null);
    try {
      const { error } = await authClient.twoFactor.disable({
        password: disablePassword,
      });
      if (error) {
        setTwoFactorError(error.message || "Failed to disable 2FA");
        return;
      }
      setTwoFactorEnabled(false);
      setShowDisableDialog(false);
      setDisablePassword("");
      await refetch();
    } catch (err) {
      setTwoFactorError(err instanceof Error ? err.message : "Failed to disable 2FA");
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const resetSetupDialog = () => {
    setShowSetupDialog(false);
    setSetupStep("password");
    setSetupPassword("");
    setVerifyCode("");
    setTotpUri(null);
    setBackupCodes([]);
    setTwoFactorError(null);
  };

  const handleRevokeSession = async (token: string) => {
    setRevokeLoading(token);
    try {
      await authClient.revokeSession({ token });
      await fetchSessions();
    } catch (err) {
      console.error("Failed to revoke session:", err);
    } finally {
      setRevokeLoading(null);
    }
  };

  const handleRevokeOtherSessions = async () => {
    setRevokeLoading("all");
    try {
      await authClient.revokeOtherSessions();
      await fetchSessions();
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
    } finally {
      setRevokeLoading(null);
    }
  };

  const parseUserAgent = (ua?: string) => {
    if (!ua) return { device: "Unknown", browser: "Unknown" };

    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    const device = isMobile ? "Mobile" : "Desktop";

    let browser = "Unknown";
    if (ua.includes("Chrome")) browser = "Chrome";
    else if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Safari")) browser = "Safari";
    else if (ua.includes("Edge")) browser = "Edge";

    return { device, browser };
  };

  const isCurrentSession = (s: Session) => {
    return s.token === session?.session?.token;
  };

  if (!user) return null;

  return (
    <div className="space-y-0">
      {/* 2FA Row */}
      <div className="flex items-center justify-between gap-4 py-4">
        <div>
          <p className="text-sm font-medium">Two-factor authentication</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {twoFactorEnabled
              ? "Two-factor authentication is enabled"
              : "Add an extra layer of security to your account"}
          </p>
        </div>
        <Switch
          checked={twoFactorEnabled}
          onCheckedChange={(checked) => {
            if (checked) {
              setShowSetupDialog(true);
            } else {
              setShowDisableDialog(true);
            }
          }}
        />
      </div>

      <div className="border-b border-border/50" />

      {/* Sessions Row */}
      <SettingsRow
        label="Active sessions"
        description={`${sessions.length} active session${sessions.length !== 1 ? "s" : ""}`}
      >
        <PillButton onClick={() => setSessionsDialogOpen(true)}>Manage</PillButton>
      </SettingsRow>

      {/* Sessions Dialog */}
      <Dialog open={sessionsDialogOpen} onOpenChange={setSessionsDialogOpen}>
        <DialogContent className="border-0 sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Active sessions</DialogTitle>
            <DialogDescription>Manage your active sessions across devices</DialogDescription>
          </DialogHeader>

          <div className="py-2">
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {sessions.map((s) => {
                  const { device, browser } = parseUserAgent(s.userAgent);
                  const isCurrent = isCurrentSession(s);
                  const DeviceIcon = device === "Mobile" ? SmartphoneIcon : MonitorIcon;

                  return (
                    <div
                      key={s.id}
                      className={cn(
                        "flex items-center justify-between rounded-lg p-3 transition-colors",
                        "bg-muted/30 hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                          <DeviceIcon className="size-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {device} · {browser}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {isCurrent ? (
                              <span className="text-green-600">Current session</span>
                            ) : (
                              `Last active ${new Date(s.createdAt).toLocaleDateString()}`
                            )}
                          </p>
                        </div>
                      </div>
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeSession(s.token)}
                          disabled={revokeLoading === s.token}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {revokeLoading === s.token ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            "Revoke"
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}

                {sessions.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={handleRevokeOtherSessions}
                    disabled={revokeLoading === "all"}
                  >
                    {revokeLoading === "all" && <Loader2 className="mr-2 size-4 animate-spin" />}
                    Revoke all other sessions
                  </Button>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <AlertDialog open={showSetupDialog} onOpenChange={(open) => !open && resetSetupDialog()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {setupStep === "password" && "Enable two-factor authentication"}
              {setupStep === "qr" && "Scan QR code"}
              {setupStep === "verify" && "Verify code"}
              {setupStep === "backup" && "Save backup codes"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {setupStep === "password" && "Enter your password to continue"}
              {setupStep === "qr" && "Scan this QR code with your authenticator app"}
              {setupStep === "verify" && "Enter the 6-digit code from your authenticator app"}
              {setupStep === "backup" && "Save these backup codes in a secure place"}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            {setupStep === "password" && (
              <div className="space-y-2">
                <Label htmlFor="setup-password">Password</Label>
                <Input
                  id="setup-password"
                  type="password"
                  value={setupPassword}
                  onChange={(e) => setSetupPassword(e.target.value)}
                />
              </div>
            )}

            {setupStep === "qr" && totpUri && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-lg bg-white p-4">
                  <QRCode value={totpUri} size={200} />
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  Can&apos;t scan? Enter this code manually in your app
                </p>
              </div>
            )}

            {setupStep === "verify" && (
              <div className="space-y-2">
                <Label htmlFor="verify-code">Verification code</Label>
                <Input
                  id="verify-code"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
            )}

            {setupStep === "backup" && (
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, i) => (
                  <code key={i} className="rounded bg-muted px-2 py-1 font-mono text-sm">
                    {code}
                  </code>
                ))}
              </div>
            )}

            {twoFactorError && <p className="mt-2 text-sm text-destructive">{twoFactorError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetSetupDialog}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // Prevent dialog from closing until we're on the final step
                if (setupStep !== "backup") {
                  e.preventDefault();
                }
                handleEnable2FA();
              }}
              disabled={twoFactorLoading}
            >
              {twoFactorLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {setupStep === "backup" ? "Done" : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Disable 2FA Dialog */}
      <AlertDialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable two-factor authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. Enter your password to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-4">
            <Label htmlFor="disable-password">Password</Label>
            <Input
              id="disable-password"
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            {twoFactorError && <p className="text-sm text-destructive">{twoFactorError}</p>}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable2FA}
              disabled={twoFactorLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {twoFactorLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
