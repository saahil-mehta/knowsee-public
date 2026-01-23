"use client";

import { useState, useEffect, useRef } from "react";

interface UseTypewriterOptions {
  /** Text to type out */
  text: string;
  /** Delay between each character in ms (default: 50) */
  speed?: number;
  /** Initial delay before typing starts in ms (default: 0) */
  startDelay?: number;
  /** Whether to show a blinking cursor (default: true) */
  showCursor?: boolean;
  /** Cursor character (default: "|") */
  cursorChar?: string;
}

interface UseTypewriterResult {
  /** The currently displayed text */
  displayedText: string;
  /** Whether typing is complete */
  isComplete: boolean;
  /** Whether typing is in progress */
  isTyping: boolean;
  /** Cursor element (only if showCursor is true) */
  cursor: string | null;
}

export function useTypewriter({
  text,
  speed = 50,
  startDelay = 0,
  showCursor = true,
  cursorChar = "|",
}: UseTypewriterOptions): UseTypewriterResult {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    // Reset state when text changes
    setDisplayedText("");
    setIsComplete(false);
    setIsTyping(false);
    indexRef.current = 0;

    // Start delay timer
    const startTimer = setTimeout(() => {
      setIsTyping(true);
    }, startDelay);

    return () => clearTimeout(startTimer);
  }, [text, startDelay]);

  useEffect(() => {
    if (!isTyping || isComplete) return;

    const typeNext = () => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current += 1;
      } else {
        setIsComplete(true);
        setIsTyping(false);
      }
    };

    const timer = setTimeout(typeNext, speed);
    return () => clearTimeout(timer);
  }, [text, speed, isTyping, isComplete, displayedText]);

  return {
    displayedText,
    isComplete,
    isTyping,
    cursor: showCursor && !isComplete ? cursorChar : null,
  };
}
