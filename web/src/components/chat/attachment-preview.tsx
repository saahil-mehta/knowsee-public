"use client";

import { XIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { FileAttachment } from "@/hooks/use-file-upload";

export type AttachmentPreviewProps = {
  attachment: FileAttachment;
  onRemove: (id: string) => void;
  className?: string;
};

/**
 * Maps file extension/mime type to display properties
 */
function getFileTypeInfo(file: File): {
  extension: string;
  badgeColor: string;
} {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const mime = file.type.toLowerCase();

  // Markdown
  if (ext === "md" || ext === "markdown" || mime === "text/markdown") {
    return { extension: "MD", badgeColor: "bg-blue-500" };
  }

  // CSV / Spreadsheets
  if (ext === "csv" || mime === "text/csv") {
    return { extension: "CSV", badgeColor: "bg-green-500" };
  }
  if (ext === "xlsx" || ext === "xls" || mime.includes("spreadsheet")) {
    return { extension: ext.toUpperCase(), badgeColor: "bg-green-600" };
  }

  // PDF
  if (ext === "pdf" || mime === "application/pdf") {
    return { extension: "PDF", badgeColor: "bg-red-500" };
  }

  // JSON
  if (ext === "json" || mime === "application/json") {
    return { extension: "JSON", badgeColor: "bg-yellow-500" };
  }

  // Code files
  if (["js", "ts", "tsx", "jsx", "py", "rb", "go", "rs", "java", "cpp", "c", "h"].includes(ext)) {
    return { extension: ext.toUpperCase(), badgeColor: "bg-purple-500" };
  }

  // Text files
  if (ext === "txt" || mime.startsWith("text/")) {
    return { extension: "TXT", badgeColor: "bg-gray-500" };
  }

  // Images (won't use badge, but define for completeness)
  if (mime.startsWith("image/")) {
    return { extension: ext.toUpperCase(), badgeColor: "bg-pink-500" };
  }

  // Default
  return { extension: ext.toUpperCase() || "FILE", badgeColor: "bg-gray-500" };
}

/**
 * Truncates filename smartly - keeps extension visible
 */
function truncateFilename(name: string, maxLength: number = 12): string {
  if (name.length <= maxLength) return name;

  const ext = name.split(".").pop() || "";
  const baseName = name.slice(0, name.length - ext.length - 1);

  if (baseName.length <= maxLength - ext.length - 3) {
    return name;
  }

  const truncatedBase = baseName.slice(0, maxLength - ext.length - 3);
  return `${truncatedBase}...`;
}

/**
 * Displays a single file attachment with preview and remove button.
 * - Images: Shows thumbnail with filename overlay
 * - Files: Shows type icon with extension badge
 */
export function AttachmentPreview({ attachment, onRemove, className }: AttachmentPreviewProps) {
  const { id, file, previewUrl, status, error } = attachment;
  const isImage = file.type.startsWith("image/");
  const isUploading = status === "uploading";
  const isError = status === "error";
  const { extension, badgeColor } = getFileTypeInfo(file);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "group relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted transition-all duration-200",
            isError && "bg-destructive/10 ring-1 ring-destructive/50",
            className,
          )}
        >
          {isImage ? (
            // Image preview - thumbnail fills the card
            <img src={previewUrl} alt={file.name} className="size-full object-cover" />
          ) : (
            // File preview - extension badge only
            <div className="flex size-full items-center justify-center p-2">
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] font-semibold text-white",
                  badgeColor,
                )}
              >
                {extension}
              </span>
            </div>
          )}

          {/* Filename overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1 py-0.5">
            <p className="truncate text-[10px] text-white">{truncateFilename(file.name)}</p>
          </div>

          {/* Uploading overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2Icon className="size-4 animate-spin text-white" />
            </div>
          )}

          {/* Remove button */}
          {!isUploading && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              onClick={() => onRemove(id)}
              className="absolute top-0.5 right-0.5 size-4 rounded-full p-0 opacity-0 transition-opacity group-hover:opacity-100"
              aria-label={`Remove ${file.name}`}
            >
              <XIcon className="size-2.5" />
            </Button>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>{error || file.name}</TooltipContent>
    </Tooltip>
  );
}

export type AttachmentListProps = {
  attachments: FileAttachment[];
  onRemove: (id: string) => void;
  className?: string;
};

/**
 * Displays a horizontal scrollable list of attachment previews.
 */
export function AttachmentList({ attachments, onRemove, className }: AttachmentListProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={cn("flex flex-row gap-2 overflow-x-auto", className)}>
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} onRemove={onRemove} />
      ))}
    </div>
  );
}
