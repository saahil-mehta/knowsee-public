"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckIcon, CopyIcon } from "lucide-react";
import {
  type ComponentProps,
  createContext,
  type HTMLAttributes,
  useContext,
  useState,
} from "react";

type CodeBlockContextType = {
  code: string;
};

const CodeBlockContext = createContext<CodeBlockContextType>({ code: "" });

export type CodeBlockProps = HTMLAttributes<HTMLDivElement> & {
  code: string;
  language?: string;
};

export function CodeBlock({
  code,
  language = "json",
  className,
  children,
  ...props
}: CodeBlockProps) {
  return (
    <CodeBlockContext.Provider value={{ code }}>
      <div
        className={cn(
          "group relative w-full overflow-hidden rounded-md border bg-muted/30 text-foreground",
          className,
        )}
        {...props}
      >
        <div className="relative">
          <pre className="overflow-auto p-3 font-mono text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
          {children && (
            <div className="absolute top-2 right-2 flex items-center gap-2">{children}</div>
          )}
        </div>
      </div>
    </CodeBlockContext.Provider>
  );
}

export type CodeBlockCopyButtonProps = ComponentProps<typeof Button> & {
  onCopy?: () => void;
  onError?: (error: Error) => void;
  timeout?: number;
};

export function CodeBlockCopyButton({
  onCopy,
  onError,
  timeout = 2000,
  children,
  className,
  ...props
}: CodeBlockCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const { code } = useContext(CodeBlockContext);

  const copyToClipboard = async () => {
    if (typeof window === "undefined" || !navigator?.clipboard?.writeText) {
      onError?.(new Error("Clipboard API not available"));
      return;
    }

    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      onCopy?.();
      setTimeout(() => setIsCopied(false), timeout);
    } catch (error) {
      onError?.(error as Error);
    }
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn("shrink-0", className)}
      onClick={copyToClipboard}
      size="icon"
      variant="ghost"
      {...props}
    >
      {children ?? <Icon size={14} />}
    </Button>
  );
}
