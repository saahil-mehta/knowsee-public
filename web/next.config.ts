import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Standalone output for Docker deployment
  // Creates a minimal .next/standalone folder with server.js
  output: "standalone",
};

export default nextConfig;
