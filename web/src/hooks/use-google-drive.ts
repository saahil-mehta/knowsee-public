"use client";

import { useState, useCallback, useEffect, useRef } from "react";

// Google Picker API types (local, not extending global to avoid conflicts)
interface GooglePickerBuilder {
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  addView: (view: string | GoogleDocsView) => GooglePickerBuilder;
  addViewGroup: (viewGroup: GoogleViewGroup) => GooglePickerBuilder;
  enableFeature: (feature: string) => GooglePickerBuilder;
  setCallback: (callback: (data: GooglePickerResponse) => void) => GooglePickerBuilder;
  setTitle: (title: string) => GooglePickerBuilder;
  setSize: (width: number, height: number) => GooglePickerBuilder;
  build: () => { setVisible: (visible: boolean) => void };
}

interface GooglePickerResponse {
  action: string;
  docs?: Array<{
    id: string;
    name: string;
    mimeType: string;
    sizeBytes?: number;
  }>;
}

interface GooglePickerApi {
  PickerBuilder: new () => GooglePickerBuilder;
  ViewId: {
    DOCS: string;
    FOLDERS: string;
    RECENTLY_PICKED: string;
    DOCUMENTS: string;
    SPREADSHEETS: string;
    PRESENTATIONS: string;
  };
  ViewGroup: new () => GoogleViewGroup;
  DocsView: new (viewId?: string) => GoogleDocsView;
  DocsUploadView: new () => GoogleDocsView;
  Action: { PICKED: string; CANCEL: string };
  Feature: {
    MULTISELECT_ENABLED: string;
    SUPPORT_DRIVES: string;
    NAV_HIDDEN: string;
    MINE_ONLY: string;
  };
}

interface GoogleViewGroup {
  addView: (view: GoogleDocsView | string) => GoogleViewGroup;
  addLabel: (label: string) => GoogleViewGroup;
}

interface GoogleDocsView {
  setIncludeFolders: (include: boolean) => GoogleDocsView;
  setSelectFolderEnabled: (enabled: boolean) => GoogleDocsView;
  setParent: (folderId: string) => GoogleDocsView;
  setEnableDrives: (enabled: boolean) => GoogleDocsView;
  setMimeTypes: (mimeTypes: string) => GoogleDocsView;
}

interface GapiClient {
  load: (api: string, callback: () => void) => void;
}

// Type-safe access to Google APIs
function getGooglePicker(): GooglePickerApi | undefined {
  const win = window as unknown as { google?: { picker?: GooglePickerApi } };
  return win.google?.picker;
}

function getGapi(): GapiClient | undefined {
  const win = window as unknown as { gapi?: GapiClient };
  return win.gapi;
}

export interface UseGoogleDriveOptions {
  onFilesSelected: (files: File[]) => void;
  onError: (error: Error) => void;
}

export interface UseGoogleDriveReturn {
  isConnected: boolean;
  isLoading: boolean;
  connectionEmail: string | null;
  openPicker: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  checkStatus: () => Promise<void>;
}

// Track if scripts are loaded globally
let pickerScriptLoaded = false;
let pickerScriptLoading = false;

/**
 * Hook for Google Drive file picker integration.
 *
 * Handles OAuth connection, token refresh, and file download.
 */
export function useGoogleDrive({
  onFilesSelected,
  onError,
}: UseGoogleDriveOptions): UseGoogleDriveReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionEmail, setConnectionEmail] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(null);

  // Check connection status on mount
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/google/status");
      const data = await response.json();

      if (response.ok) {
        setIsConnected(data.connected);
        setConnectionEmail(data.email || null);
      }
    } catch (err) {
      console.error("Failed to check Google Drive status:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Load Google Picker script
  const loadPickerScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (pickerScriptLoaded && getGooglePicker()) {
        resolve();
        return;
      }

      if (pickerScriptLoading) {
        // Wait for existing load
        const checkInterval = setInterval(() => {
          if (pickerScriptLoaded && getGooglePicker()) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 100);
        return;
      }

      pickerScriptLoading = true;

      const script = document.createElement("script");
      script.src = "https://apis.google.com/js/api.js";
      script.onload = () => {
        getGapi()?.load("picker", () => {
          pickerScriptLoaded = true;
          pickerScriptLoading = false;
          resolve();
        });
      };
      script.onerror = () => {
        pickerScriptLoading = false;
        reject(new Error("Failed to load Google Picker script"));
      };
      document.body.appendChild(script);
    });
  }, []);

  // Get fresh access token
  const getAccessToken = useCallback(async (): Promise<string> => {
    const response = await fetch("/api/auth/google/refresh", {
      method: "POST",
    });

    if (!response.ok) {
      const data = await response.json();
      if (data.reconnectRequired) {
        setIsConnected(false);
        setConnectionEmail(null);
      }
      throw new Error(data.error || "Failed to get access token");
    }

    const data = await response.json();
    accessTokenRef.current = data.accessToken;
    return data.accessToken;
  }, []);

  // Download file from Drive
  const downloadFile = useCallback(
    async (
      fileId: string,
      fileName: string,
      mimeType: string,
      accessToken: string,
    ): Promise<File> => {
      // Handle Google Docs/Sheets/Slides - export as PDF
      const googleDocsMimeTypes: Record<string, string> = {
        "application/vnd.google-apps.document": "application/pdf",
        "application/vnd.google-apps.spreadsheet": "application/pdf",
        "application/vnd.google-apps.presentation": "application/pdf",
      };

      let url: string;
      let finalMimeType = mimeType;

      if (googleDocsMimeTypes[mimeType]) {
        // Export Google Docs as PDF
        finalMimeType = googleDocsMimeTypes[mimeType];
        url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(finalMimeType)}`;
      } else {
        // Download binary file
        url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      }

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const blob = await response.blob();

      // Adjust filename for exported files
      let finalFileName = fileName;
      if (googleDocsMimeTypes[mimeType] && !fileName.endsWith(".pdf")) {
        finalFileName = `${fileName}.pdf`;
      }

      return new File([blob], finalFileName, { type: finalMimeType });
    },
    [],
  );

  // Connect to Google Drive
  const connect = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/google/connect");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate connection");
      }

      // Open OAuth popup
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.url,
        "google-oauth",
        `width=${width},height=${height},left=${left},top=${top}`,
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups for this site.");
      }

      // Listen for message from popup
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        if (event.data?.type !== "google-drive-oauth") return;

        window.removeEventListener("message", handleMessage);

        if (event.data.success) {
          await checkStatus();
        } else {
          onError(new Error(event.data.message || "Connection failed"));
        }
        setIsLoading(false);
      };

      window.addEventListener("message", handleMessage);

      // Also poll for popup close (in case message fails)
      const pollInterval = setInterval(async () => {
        if (popup.closed) {
          clearInterval(pollInterval);
          window.removeEventListener("message", handleMessage);
          // Give a moment for message to arrive before checking status
          setTimeout(async () => {
            await checkStatus();
            setIsLoading(false);
          }, 500);
        }
      }, 500);
    } catch (err) {
      setIsLoading(false);
      onError(err instanceof Error ? err : new Error("Connection failed"));
    }
  }, [checkStatus, onError]);

  // Disconnect from Google Drive
  const disconnect = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/google/disconnect", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect");
      }

      setIsConnected(false);
      setConnectionEmail(null);
      accessTokenRef.current = null;
    } catch (err) {
      onError(err instanceof Error ? err : new Error("Disconnect failed"));
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  // Open Google Picker
  const openPicker = useCallback(async () => {
    try {
      setIsLoading(true);

      // Connect if not connected
      if (!isConnected) {
        await connect();
        return; // connect() will trigger re-render, user needs to click again
      }

      // Load Picker script
      await loadPickerScript();

      // Get access token
      const accessToken = await getAccessToken();

      // Extract app ID from client ID (format: xxx.apps.googleusercontent.com)
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      const appId = clientId.split(".")[0];

      // Create and show picker
      const pickerApi = getGooglePicker();
      if (!pickerApi) {
        throw new Error("Google Picker API not loaded");
      }

      // Supported MIME types - match backend upload_limits.py
      // Backend converts Office formats to Markdown for LLM consumption
      const supportedMimeTypes = [
        // Images
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
        // Documents
        "application/pdf",
        // Google Workspace (exported to PDF)
        "application/vnd.google-apps.document",
        "application/vnd.google-apps.spreadsheet",
        "application/vnd.google-apps.presentation",
        // Microsoft Office (converted to Markdown)
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "application/vnd.openxmlformats-officedocument.presentationml.presentation", // .pptx
        "application/msword", // .doc
        "application/vnd.ms-excel", // .xls
        "application/vnd.ms-powerpoint", // .ppt
        // OpenDocument (converted to Markdown)
        "application/vnd.oasis.opendocument.text", // .odt
        "application/vnd.oasis.opendocument.spreadsheet", // .ods
        "application/vnd.oasis.opendocument.presentation", // .odp
        // Text
        "text/plain",
        "text/csv",
        "text/markdown",
        "text/html",
        // Rich text
        "application/rtf",
      ].join(",");

      // Create views with MIME type filter
      // My Drive view
      const myDriveView = new pickerApi.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(false)
        .setMimeTypes(supportedMimeTypes);

      // Shared drives view
      const sharedDrivesView = new pickerApi.DocsView()
        .setEnableDrives(true)
        .setIncludeFolders(true)
        .setMimeTypes(supportedMimeTypes);

      // Recent files view
      const recentView = new pickerApi.DocsView(pickerApi.ViewId.RECENTLY_PICKED).setMimeTypes(
        supportedMimeTypes,
      );

      const picker = new pickerApi.PickerBuilder()
        .setOAuthToken(accessToken)
        .setAppId(appId)
        .addView(recentView) // Recent
        .addView(myDriveView) // My Drive
        .addView(sharedDrivesView) // Shared drives
        .enableFeature(pickerApi.Feature.MULTISELECT_ENABLED)
        .enableFeature(pickerApi.Feature.SUPPORT_DRIVES)
        .setTitle("Select files from Google Drive")
        .setCallback(async (data: GooglePickerResponse) => {
          if (data.action === pickerApi.Action.PICKED && data.docs) {
            try {
              // Download all selected files
              const files = await Promise.all(
                data.docs.map((doc) => downloadFile(doc.id, doc.name, doc.mimeType, accessToken)),
              );
              onFilesSelected(files);
            } catch (err) {
              onError(err instanceof Error ? err : new Error("Failed to download files"));
            }
          }
          setIsLoading(false);
        })
        .build();

      picker.setVisible(true);
    } catch (err) {
      setIsLoading(false);
      onError(err instanceof Error ? err : new Error("Failed to open picker"));
    }
  }, [
    isConnected,
    connect,
    loadPickerScript,
    getAccessToken,
    downloadFile,
    onFilesSelected,
    onError,
  ]);

  return {
    isConnected,
    isLoading,
    connectionEmail,
    openPicker,
    connect,
    disconnect,
    checkStatus,
  };
}
