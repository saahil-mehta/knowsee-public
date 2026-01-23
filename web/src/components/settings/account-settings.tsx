"use client";

import { useState } from "react";
import { Loader2, BadgeCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GradientAvatar } from "./gradient-avatar";
import { authClient, useSession } from "@/lib/auth-client";

/* ─────────────────────────────────────────────────────────────────────────────
 * SettingsRow - Consistent layout component for settings items
 * Uses a two-column grid with fixed label width for perfect alignment
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
 * PillButton - Rounded pill-style button matching the reference design
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

/* ─────────────────────────────────────────────────────────────────────────────
 * ChangePasswordDialog - Modal for password change form
 * ───────────────────────────────────────────────────────────────────────────── */
function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) resetForm();
        onOpenChange(isOpen);
      }}
    >
      <DialogContent className="border-0 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change password</DialogTitle>
          <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">New password</label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm new password</label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Confirm new password"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Update password
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * AccountSettings - Main component
 * ───────────────────────────────────────────────────────────────────────────── */
export function AccountSettings() {
  const { data: session, refetch } = useSession();
  const user = session?.user;

  // Profile state
  const [name, setName] = useState(user?.name || "");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password dialog state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const handleProfileSubmit = async () => {
    setProfileLoading(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await authClient.updateUser({ name });
      await refetch();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleImageChange = async (file: File) => {
    // TODO: Implement image upload to storage service
    console.log("Image upload not yet implemented:", file.name);
  };

  if (!user) return null;

  return (
    <div className="space-y-0">
      {/* Profile Header - Centred */}
      <div className="flex flex-col items-center py-6">
        <GradientAvatar
          name={user.name || user.email}
          image={user.image}
          size="lg"
          editable
          onImageChange={handleImageChange}
        />
        <div className="mt-3 text-center">
          <p className="text-lg font-medium">{user.name || "User"}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      <div className="border-b border-border/40" />

      {/* Display Name */}
      <SettingsRow label="Display name" description="Knowsee will know you by this name">
        <div className="flex items-center">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-9 w-44 rounded-r-none border-r-0 text-sm focus-visible:z-10"
          />
          <Button
            size="sm"
            onClick={handleProfileSubmit}
            disabled={profileLoading || name === user.name}
            className="h-9 rounded-l-none px-4"
          >
            {profileLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : profileSuccess ? (
              "Saved"
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </SettingsRow>
      {profileError && <p className="-mt-3 pb-2 text-sm text-destructive">{profileError}</p>}

      <div className="border-b border-border/40" />

      {/* Email */}
      <SettingsRow label="Email" description="Your account identifier. Cannot be changed.">
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{user.email}</p>
          {user.emailVerified && (
            <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-green-500">
              <BadgeCheck className="size-3" />
              Verified
            </p>
          )}
        </div>
      </SettingsRow>

      <div className="border-b border-border/40" />

      {/* Password */}
      <SettingsRow label="Password" description="Secure your account">
        <PillButton onClick={() => setPasswordDialogOpen(true)}>Manage</PillButton>
      </SettingsRow>

      {/* Password Change Dialog */}
      <ChangePasswordDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
    </div>
  );
}
