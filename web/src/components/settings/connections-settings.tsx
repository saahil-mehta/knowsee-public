"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { GoogleDriveIcon } from "@/components/ui/icons";

interface ConnectionStatus {
  connected: boolean;
  email?: string;
}

interface ConnectionCardProps {
  name: string;
  icon: React.ReactNode;
  status: ConnectionStatus | null;
  isLoading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  disabled?: boolean;
}

function ConnectionCard({
  name,
  icon,
  status,
  isLoading,
  onConnect,
  onDisconnect,
  disabled = false,
}: ConnectionCardProps) {
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);

  const handleDisconnect = () => {
    setShowDisconnectDialog(false);
    onDisconnect();
  };

  return (
    <>
      <div className="bg-card flex items-center justify-between rounded-lg border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted">{icon}</div>
          <div>
            <p className="font-medium">{name}</p>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Checking...</p>
            ) : status?.connected ? (
              <p className="text-sm text-muted-foreground">{status.email}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </div>
        </div>
        <div>
          {isLoading ? (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          ) : status?.connected ? (
            <Button variant="outline" size="sm" onClick={() => setShowDisconnectDialog(true)}>
              Disconnect
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={onConnect} disabled={disabled}>
              {disabled ? "Coming soon" : "Connect"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will need to reconnect to use {name} features again.
              {status?.email && (
                <span className="mt-2 block text-foreground">
                  Connected account: {status.email}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDisconnect}>Disconnect</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function ConnectionsSettings() {
  const [googleStatus, setGoogleStatus] = useState<ConnectionStatus | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(true);

  // Fetch Google Drive connection status
  const fetchGoogleStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/google/status");
      const data = await response.json();
      if (response.ok) {
        setGoogleStatus({
          connected: data.connected,
          email: data.email,
        });
      }
    } catch (err) {
      console.error("Failed to fetch Google status:", err);
    } finally {
      setIsGoogleLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
  }, [fetchGoogleStatus]);

  // Connect to Google Drive
  const handleGoogleConnect = async () => {
    try {
      setIsGoogleLoading(true);
      const response = await fetch("/api/auth/google/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection");
      }

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        "google-oauth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Poll for popup close
      const pollInterval = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollInterval);
          await fetchGoogleStatus();
        }
      }, 500);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connection failed");
      setIsGoogleLoading(false);
    }
  };

  // Disconnect from Google Drive
  const handleGoogleDisconnect = async () => {
    try {
      setIsGoogleLoading(true);
      const response = await fetch("/api/auth/google/disconnect", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setGoogleStatus({ connected: false });
      toast.success("Google Drive disconnected");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-medium">Connected Accounts</h3>
        <p className="text-sm text-muted-foreground">
          Manage your connections to external services
        </p>
      </div>

      <div className="space-y-3">
        <ConnectionCard
          name="Google Drive"
          icon={<GoogleDriveIcon className="size-5" />}
          status={googleStatus}
          isLoading={isGoogleLoading}
          onConnect={handleGoogleConnect}
          onDisconnect={handleGoogleDisconnect}
        />
      </div>
    </div>
  );
}
