"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { CameraIcon } from "lucide-react";

interface GradientAvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  editable?: boolean;
  onImageChange?: (file: File) => void;
}

/**
 * Generates a consistent mesh gradient orb based on the input string.
 * Creates a layered radial gradient effect for a more dynamic appearance.
 */
function generateGradient(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate 3 hues spread across the colour wheel for variety
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 60) % 360;
  const hue3 = (hue1 + 150) % 360;

  // Create layered radial gradients for mesh orb effect
  return [
    `radial-gradient(circle at 30% 30%, hsl(${hue1}, 85%, 65%) 0%, transparent 50%)`,
    `radial-gradient(circle at 70% 70%, hsl(${hue2}, 80%, 55%) 0%, transparent 50%)`,
    `radial-gradient(circle at 70% 20%, hsl(${hue3}, 75%, 60%) 0%, transparent 40%)`,
    `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 75%, 45%) 100%)`,
  ].join(", ");
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-20 text-2xl",
};

export function GradientAvatar({
  name,
  image,
  size = "md",
  editable = false,
  onImageChange,
}: GradientAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (editable && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageChange) {
      onImageChange(file);
    }
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full font-medium text-white select-none",
        sizeClasses[size],
        editable && "cursor-pointer",
      )}
      style={{
        background: image ? undefined : generateGradient(name),
      }}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {image ? (
        <img src={image} alt={name} className="size-full rounded-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}

      {editable && isHovered && (
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
          <CameraIcon className="size-5 text-white" />
        </div>
      )}

      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </div>
  );
}
