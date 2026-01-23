"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { UploadConfig } from "./use-upload-config";

export type FileAttachment = {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "uploaded" | "error";
  error?: string;
};

export type FileUploadError = {
  code: "max_files" | "max_file_size" | "invalid_type" | "upload_failed";
  message: string;
  file?: File;
};

export type UseFileUploadOptions = {
  config: UploadConfig | null;
  sessionId: string | undefined;
  userId: string | undefined;
  onError?: (error: FileUploadError) => void;
  onSuccess?: (count: number) => void;
};

export type UseFileUploadReturn = {
  files: FileAttachment[];
  isUploading: boolean;
  addFiles: (files: FileList | File[]) => void;
  removeFile: (id: string) => void;
  uploadAll: () => Promise<boolean>;
  clear: () => void;
};

/**
 * Hook for managing file attachments with upload to backend.
 *
 * Handles:
 * - File validation (type, size, count)
 * - Blob URL management for previews
 * - Upload to /upload endpoint with session/user headers
 * - Upload state tracking per file
 */
export function useFileUpload({
  config,
  sessionId,
  userId,
  onError,
  onSuccess,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Track blob URLs for cleanup
  const blobUrlsRef = useRef<Set<string>>(new Set());

  // Cleanup blob URLs on unmount
  useEffect(() => {
    const urls = blobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      if (!config) {
        onError?.({
          code: "upload_failed",
          message: "Upload config not loaded. Please try again.",
        });
        return;
      }

      const supportedTypes = new Set(config.supported_types);
      const fileArray = Array.from(newFiles);

      setFiles((current) => {
        const remainingSlots = config.max_files - current.length;

        if (remainingSlots <= 0) {
          onError?.({
            code: "max_files",
            message: `Maximum ${config.max_files} files allowed`,
          });
          return current;
        }

        const filesToAdd = fileArray.slice(0, remainingSlots);
        const validFiles: FileAttachment[] = [];

        for (const file of filesToAdd) {
          // Validate MIME type
          if (!supportedTypes.has(file.type)) {
            onError?.({
              code: "invalid_type",
              message: `File type "${file.type || "unknown"}" is not supported`,
              file,
            });
            continue;
          }

          // Validate file size
          if (file.size > config.max_file_size_bytes) {
            const maxMB = Math.round(config.max_file_size_bytes / (1024 * 1024));
            onError?.({
              code: "max_file_size",
              message: `File "${file.name}" exceeds ${maxMB}MB limit`,
              file,
            });
            continue;
          }

          // Create preview URL and track for cleanup
          const previewUrl = URL.createObjectURL(file);
          blobUrlsRef.current.add(previewUrl);

          validFiles.push({
            id: crypto.randomUUID(),
            file,
            previewUrl,
            status: "pending",
          });
        }

        if (fileArray.length > remainingSlots) {
          onError?.({
            code: "max_files",
            message: `Only ${remainingSlots} more file(s) can be added`,
          });
        }

        return [...current, ...validFiles];
      });
    },
    [config, onError],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((current) => {
      const file = current.find((f) => f.id === id);
      if (file) {
        URL.revokeObjectURL(file.previewUrl);
        blobUrlsRef.current.delete(file.previewUrl);
      }
      return current.filter((f) => f.id !== id);
    });
  }, []);

  const clear = useCallback(() => {
    setFiles((current) => {
      current.forEach((f) => {
        URL.revokeObjectURL(f.previewUrl);
        blobUrlsRef.current.delete(f.previewUrl);
      });
      return [];
    });
  }, []);

  const uploadAll = useCallback(async (): Promise<boolean> => {
    if (!sessionId || !userId) {
      onError?.({
        code: "upload_failed",
        message: "Session not ready. Please try again.",
      });
      return false;
    }

    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return true;

    setIsUploading(true);

    // Mark all as uploading
    setFiles((current) =>
      current.map((f) => (f.status === "pending" ? { ...f, status: "uploading" as const } : f)),
    );

    let allSucceeded = true;

    // Upload files in parallel
    await Promise.all(
      pendingFiles.map(async (attachment) => {
        try {
          const formData = new FormData();
          formData.append("file", attachment.file);

          const response = await fetch("/api/upload", {
            method: "POST",
            headers: {
              "x-session-id": sessionId,
              "x-user-id": userId,
            },
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.detail || `Upload failed: ${response.status}`);
          }

          setFiles((current) =>
            current.map((f) =>
              f.id === attachment.id ? { ...f, status: "uploaded" as const } : f,
            ),
          );
        } catch (err) {
          allSucceeded = false;
          const message = err instanceof Error ? err.message : "Upload failed";

          setFiles((current) =>
            current.map((f) =>
              f.id === attachment.id ? { ...f, status: "error" as const, error: message } : f,
            ),
          );

          onError?.({
            code: "upload_failed",
            message: `Failed to upload "${attachment.file.name}": ${message}`,
            file: attachment.file,
          });
        }
      }),
    );

    setIsUploading(false);

    if (allSucceeded && pendingFiles.length > 0) {
      onSuccess?.(pendingFiles.length);
    }

    return allSucceeded;
  }, [files, sessionId, userId, onError, onSuccess]);

  return {
    files,
    isUploading,
    addFiles,
    removeFile,
    uploadAll,
    clear,
  };
}
