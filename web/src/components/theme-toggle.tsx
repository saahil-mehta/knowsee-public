"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const themes = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
] as const;

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon-xs" disabled>
        <MonitorIcon className="size-4" />
      </Button>
    );
  }

  // Show the resolved theme icon (what's actually displayed)
  const displayIcon = resolvedTheme === "dark" ? MoonIcon : SunIcon;
  const DisplayIcon = theme === "system" ? MonitorIcon : displayIcon;

  const themeLabel = theme === "system" ? "System" : theme === "dark" ? "Dark" : "Light";

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="transition-transform duration-150 active:scale-95"
            >
              <DisplayIcon className="size-4" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        {!open && <TooltipContent side="bottom">{themeLabel} theme</TooltipContent>}
      </Tooltip>
      <DropdownMenuContent align="start" className="w-36 border-0">
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {themes.map(({ value, label, icon: Icon }) => (
            <DropdownMenuRadioItem key={value} value={value} className="gap-3">
              <Icon className="size-4 text-muted-foreground" />
              <span>{label}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
