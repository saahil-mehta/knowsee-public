"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
  type ClipboardEvent,
} from "react";
import Link from "next/link";
import { useLocalStorage } from "usehooks-ts";
import { ArrowUpIcon, PaperclipIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AttachmentList } from "./attachment-preview";
import { SourcesPill } from "./sources-pill";
import { ToolsPill } from "./tools-pill";
import { useGoogleDrive } from "@/hooks/use-google-drive";
import type { FileAttachment, FileUploadError } from "@/hooks/use-file-upload";
import { getAcceptString, type UploadConfig } from "@/hooks/use-upload-config";
import { GoogleDriveIcon } from "@/components/ui/icons";

export type PromptInputProps = {
  onSubmit: (message: string) => void | Promise<void>;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  // Session ID for draft persistence
  sessionId?: string;
  // File upload integration (optional)
  uploadConfig?: UploadConfig | null;
  attachments?: FileAttachment[];
  isUploading?: boolean;
  onAddFiles?: (files: FileList) => void;
  onRemoveFile?: (id: string) => void;
  onUploadAll?: () => Promise<boolean>;
  onClearFiles?: () => void;
  onFileError?: (error: FileUploadError) => void;
};

// Generate localStorage key for draft persistence
const getDraftKey = (sessionId: string | undefined) =>
  sessionId ? `knowsee:draft:${sessionId}` : "knowsee:draft:new";

export function PromptInput({
  onSubmit,
  isLoading = false,
  placeholder = "Send a message...",
  className,
  sessionId,
  uploadConfig,
  attachments = [],
  isUploading = false,
  onAddFiles,
  onRemoveFile,
  onUploadAll,
  onClearFiles,
}: PromptInputProps) {
  // Persist draft to localStorage, keyed by session
  const [draft, setDraft] = useLocalStorage(getDraftKey(sessionId), "");
  // Transient UI state (not persisted)
  const [isComposing, setIsComposing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track which dropdown is open (mutually exclusive)
  const [openDropdown, setOpenDropdown] = useState<"attach" | "sources" | "tools" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Google Drive integration
  const handleDriveFilesSelected = useCallback(
    (files: File[]) => {
      if (onAddFiles && files.length > 0) {
        // Convert File[] to FileList-like object
        const dataTransfer = new DataTransfer();
        files.forEach((file) => dataTransfer.items.add(file));
        onAddFiles(dataTransfer.files);
        // Show success toast for import
        toast.success(
          files.length === 1
            ? `Imported "${files[0].name}" from Drive`
            : `Imported ${files.length} files from Drive`,
        );
      }
    },
    [onAddFiles],
  );

  const googleDrive = useGoogleDrive({
    onFilesSelected: handleDriveFilesSelected,
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Sync draft to textarea on mount/session change (handles SSR hydration)
  useEffect(() => {
    if (textareaRef.current) {
      const domValue = textareaRef.current.value;
      // Prefer DOM value over localStorage to handle hydration edge cases
      if (!domValue && draft) {
        textareaRef.current.value = draft;
      }
    }
  }, [draft, sessionId]);

  const hasAttachments = attachments.length > 0;
  const hasText = draft.trim().length > 0;
  const canSubmit = (hasText || hasAttachments) && !isLoading && !isSubmitting;
  const showAttachButton = !!onAddFiles;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    const trimmed = draft.trim();

    // If there are attachments, upload them first
    if (hasAttachments && onUploadAll) {
      setIsSubmitting(true);
      const success = await onUploadAll();
      setIsSubmitting(false);

      if (!success) {
        return;
      }
    }

    // Build message with file context so LLM knows what was uploaded
    let message = trimmed;
    if (hasAttachments) {
      const fileNames = attachments.map((a) => a.file.name).join(", ");
      if (trimmed) {
        // Prepend file info to user's message
        message = `[Uploaded files: ${fileNames}]\n\n${trimmed}`;
      } else {
        // No text provided - create descriptive message
        message = `I've uploaded ${attachments.length === 1 ? "a file" : "files"}: ${fileNames}. Please review ${attachments.length === 1 ? "it" : "them"}.`;
      }
    }

    await onSubmit(message);
    setDraft(""); // Clear draft on successful submit
    onClearFiles?.();
  }, [
    canSubmit,
    draft,
    hasAttachments,
    onUploadAll,
    onSubmit,
    onClearFiles,
    attachments,
    setDraft,
  ]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !isComposing) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, isComposing],
  );

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onAddFiles?.(e.target.files);
      }
      e.target.value = "";
    },
    [onAddFiles],
  );

  // Handle clipboard paste - route through same validation as file picker
  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLTextAreaElement>) => {
      if (!onAddFiles) return;

      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        e.preventDefault();
        onAddFiles(files);
      }
      // Let text paste through normally
    },
    [onAddFiles],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const isBusy = isLoading || isSubmitting || isUploading;

  return (
    <form
      className={cn("w-full", className)}
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {/* Hidden file input */}
      {showAttachButton && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptString(uploadConfig ?? null)}
          onChange={handleFileChange}
          className="hidden"
          aria-hidden="true"
        />
      )}

      {/* Main input container */}
      <div className="overflow-hidden rounded-[28px] border border-border bg-muted/50 p-4 backdrop-blur-sm transition-all duration-300 ease-out focus-within:border-purple/40 focus-within:shadow-[0_0_20px_rgba(98,20,217,0.25),0_0_50px_rgba(98,20,217,0.12)]">
        {/* Attachment previews - inside container, top */}
        {hasAttachments && onRemoveFile && (
          <AttachmentList attachments={attachments} onRemove={onRemoveFile} className="mb-3" />
        )}

        {/* Textarea - borderless */}
        <Textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
          placeholder={placeholder}
          disabled={isBusy}
          className="field-sizing-content max-h-48 min-h-[44px] w-full resize-none border-0 bg-transparent p-2 text-base shadow-none outline-none placeholder:text-muted-foreground focus-visible:ring-0 dark:bg-transparent"
        />

        {/* Toolbar - bottom */}
        <div className="mt-2 flex items-center justify-between">
          {/* Left side - tools */}
          <div className="flex items-center gap-2">
            {showAttachButton && (
              <Tooltip>
                <DropdownMenu
                  open={openDropdown === "attach"}
                  onOpenChange={(open) => setOpenDropdown(open ? "attach" : null)}
                >
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        disabled={isBusy || !uploadConfig}
                        className={cn(
                          "group inline-flex items-center justify-center rounded-full",
                          "border border-border/60 bg-background/80 backdrop-blur-sm",
                          "size-8 text-muted-foreground",
                          "transition-all duration-200 ease-out",
                          "hover:border-border hover:bg-accent/50 hover:text-foreground",
                          "focus-visible:outline-none",
                          "active:scale-[0.96]",
                          "data-[state=open]:scale-[0.96] data-[state=open]:border-border data-[state=open]:bg-accent/50 data-[state=open]:text-foreground",
                          "disabled:pointer-events-none disabled:opacity-40",
                        )}
                        aria-label="Attach files"
                      >
                        <PlusIcon className="size-4 transition-transform duration-200 group-hover:rotate-90 group-data-[state=open]:rotate-90" />
                      </button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    Attach files
                  </TooltipContent>
                  <DropdownMenuContent
                    align="start"
                    side="top"
                    sideOffset={8}
                    className="border-border/40 bg-popover/95 shadow-xl backdrop-blur-md"
                  >
                    <DropdownMenuItem onClick={openFilePicker}>
                      <PaperclipIcon className="size-4" />
                      Upload files
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => googleDrive.openPicker()}
                      disabled={googleDrive.isLoading}
                    >
                      <GoogleDriveIcon className="size-4" />
                      Add from Drive
                      {googleDrive.isLoading && (
                        <Loader2Icon className="ml-auto size-3 animate-spin" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </Tooltip>
            )}
            <SourcesPill
              isOpen={openDropdown === "sources"}
              onOpenChange={(open) => setOpenDropdown(open ? "sources" : null)}
            />
            <ToolsPill
              isOpen={openDropdown === "tools"}
              onOpenChange={(open) => setOpenDropdown(open ? "tools" : null)}
            />
          </div>

          {/* Right side - submit */}
          <button
            type="submit"
            disabled={!canSubmit || isBusy}
            className={cn(
              "group inline-flex items-center justify-center rounded-full",
              "size-8 bg-primary text-primary-foreground",
              "transition-all duration-200 ease-out",
              "hover:bg-primary/90 hover:shadow-md hover:shadow-primary/25",
              "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              "active:scale-[0.95]",
              "disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none",
            )}
          >
            {isSubmitting || isUploading ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArrowUpIcon className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5" />
            )}
          </button>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-2 text-center text-xs text-muted-foreground/60 italic">
        I&apos;m helpful, not infallible. Double-check what matters. Your business stays your
        business.{" "}
        <Link href="/privacy" className="underline underline-offset-2 hover:text-muted-foreground">
          Privacy Policy.
        </Link>
      </p>
    </form>
  );
}
