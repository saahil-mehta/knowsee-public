"use client";

import { useState, useEffect, useRef } from "react";
import { UserIcon, ShieldIcon, XIcon, LinkIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AccountSettings } from "./account-settings";
import { SecuritySettings } from "./security-settings";
import { ConnectionsSettings } from "./connections-settings";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SettingsTab = "account" | "security" | "connections";

const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "account", label: "Account", icon: UserIcon },
  { id: "security", label: "Security", icon: ShieldIcon },
  { id: "connections", label: "Connections", icon: LinkIcon },
];

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTab, setDisplayedTab] = useState<SettingsTab>("account");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Handle tab transitions with animation
  const handleTabChange = (newTab: SettingsTab) => {
    if (newTab === activeTab || isTransitioning) return;

    setIsTransitioning(true);

    // After fade out, switch content and fade in
    timeoutRef.current = setTimeout(() => {
      setDisplayedTab(newTab);
      setActiveTab(newTab);
      // Small delay before removing transition state for fade-in
      setTimeout(() => setIsTransitioning(false), 20);
    }, 120);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  // Reset to account tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab("account");
      setDisplayedTab("account");
      setIsTransitioning(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-[80vh] max-h-[600px] max-w-3xl gap-0 overflow-hidden border border-sidebar-border bg-sidebar p-0"
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Settings</DialogTitle>

        {/* Close button - top left */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 left-4 z-10 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none"
        >
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </button>

        <div className="flex h-full">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 border-r border-sidebar-border bg-sidebar px-4 pt-14">
            <ul className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <li key={tab.id}>
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ease-out",
                        isActive
                          ? "bg-accent font-medium text-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <Icon className="size-4" />
                      {tab.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Content */}
          <div className="flex flex-1 flex-col bg-background">
            {/* Header with title */}
            <div className="flex h-14 shrink-0 items-center border-b border-border/50 px-6">
              <h2 className="text-lg font-semibold">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div
                className={cn(
                  "transition-all duration-150 ease-out",
                  isTransitioning ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100",
                )}
              >
                {displayedTab === "account" && <AccountSettings />}
                {displayedTab === "security" && <SecuritySettings />}
                {displayedTab === "connections" && <ConnectionsSettings />}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
