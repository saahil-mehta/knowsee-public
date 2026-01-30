"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SettingsIcon, LogOutIcon, BadgeCheck, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GradientAvatar } from "./gradient-avatar";
import { SettingsDialog } from "./settings-dialog";
import { signOut, useSession } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const { data: session } = useSession();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            toast.success("Signed out successfully");
            router.push("/login");
          },
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
      toast.error("Failed to sign out");
      setIsLoggingOut(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  const user = session.user;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-accent">
            <GradientAvatar name={user.name || user.email} image={user.image} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium">
                <span className="truncate">{user.name || "User"}</span>
                {user.emailVerified && (
                  <BadgeCheck className="-mt-0.5 size-3.5 shrink-0 text-green-500" />
                )}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 border-0 bg-background shadow-lg">
          <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
            <SettingsIcon className="mr-2 size-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/feedback")}>
            <MessageSquareText className="mr-2 size-4" />
            Feedback
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-destructive focus:text-destructive"
          >
            <LogOutIcon className="mr-2 size-4" />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
