"use client";

import { useState, useEffect } from "react";

export type UploadConfig = {
  supported_types: string[];
  max_file_size_bytes: number;
  max_files: number;
};

// Module-level cache - survives component unmounts
let cachedConfig: UploadConfig | null = null;
let fetchPromise: Promise<UploadConfig | null> | null = null;

async function fetchConfig(): Promise<UploadConfig | null> {
  if (cachedConfig) return cachedConfig;

  // Dedupe concurrent fetches
  if (!fetchPromise) {
    fetchPromise = fetch("/api/upload")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        cachedConfig = data;
        return data;
      })
      .catch((err) => {
        console.error("Failed to fetch upload config:", err);
        return null;
      })
      .finally(() => {
        fetchPromise = null;
      });
  }

  return fetchPromise;
}

/**
 * Hook to get upload configuration from backend.
 * Fetches once on first use, then returns cached config.
 */
export function useUploadConfig() {
  const [config, setConfig] = useState<UploadConfig | null>(cachedConfig);
  const [isLoading, setIsLoading] = useState(!cachedConfig);

  useEffect(() => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setIsLoading(false);
      return;
    }

    fetchConfig().then((cfg) => {
      setConfig(cfg);
      setIsLoading(false);
    });
  }, []);

  return { config, isLoading };
}

/**
 * Get the accept string for file inputs.
 */
export function getAcceptString(config: UploadConfig | null): string {
  if (!config || config.supported_types.length === 0) return "";
  return config.supported_types.join(",");
}
