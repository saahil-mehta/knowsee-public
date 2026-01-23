"use client";

import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";

interface TypewriterTextProps {
  /** Text to type out */
  text: string;
  /** Typing speed in ms (default: 50) */
  speed?: number;
  /** Initial delay before typing starts in ms (default: 0) */
  startDelay?: number;
  /** Whether to show cursor (default: true) */
  showCursor?: boolean;
  /** Additional className for the container */
  className?: string;
}

/** Renders text with Knowsee branding and line breaks */
function renderWithBranding(text: string): React.ReactNode {
  // Split by newlines first
  const lines = text.split("\n");

  return lines.map((line, lineIndex) => {
    const knowseeIndex = line.indexOf("Knowsee");

    let content: React.ReactNode;
    if (knowseeIndex === -1) {
      content = line;
    } else {
      const before = line.slice(0, knowseeIndex);
      const knowseeEnd = knowseeIndex + 7; // "Knowsee".length
      const after = line.slice(knowseeEnd);

      // Calculate how much of "Knowsee" is visible
      const visibleKnowsee = line.slice(knowseeIndex, knowseeEnd);
      const knowVisible = visibleKnowsee.slice(0, 4); // "Know"
      const seeVisible = visibleKnowsee.slice(4); // "see"

      content = (
        <>
          {before}
          {knowVisible && <span className="font-normal">{knowVisible}</span>}
          {seeVisible && <span className="-ml-0.5 font-light italic opacity-70">{seeVisible}</span>}
          {after}
        </>
      );
    }

    return (
      <span key={lineIndex}>
        {lineIndex > 0 && <br />}
        {content}
      </span>
    );
  });
}

export function TypewriterText({
  text,
  speed = 50,
  startDelay = 0,
  showCursor = true,
  className,
}: TypewriterTextProps) {
  const { displayedText, cursor } = useTypewriter({
    text,
    speed,
    startDelay,
    showCursor,
  });

  return (
    <span className={cn("inline", className)}>
      {renderWithBranding(displayedText)}
      {cursor && <span className="animate-blink ml-0.5 inline-block">{cursor}</span>}
    </span>
  );
}
