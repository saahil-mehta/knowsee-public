import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";
import { resolve } from "path";

// Auth state file path (must match auth.setup.ts)
const STORAGE_STATE_PATH = resolve(__dirname, "e2e/.auth/user.json");

// Load environment variables from .env.development
config({ path: resolve(__dirname, ".env.development") });

/**
 * Playwright E2E Test Configuration
 *
 * Run locally with `make test-e2e` (requires `make dev` running separately)
 * Run with UI: `make test-e2e-ui`
 * Debug mode: `make test-e2e-debug`
 */
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/test-results",

  // Run tests in parallel within files, but sequentially between files
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined,

  // Fail fast in CI, allow retries locally
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,

  // Reporter configuration
  reporter: [["html", { outputFolder: "./e2e/playwright-report" }], ["list"]],

  // Global test settings
  use: {
    // Base URL for the frontend
    baseURL: "http://localhost:3000",

    // Collect trace on first retry for debugging
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure (useful for debugging flaky tests)
    video: "on-first-retry",
  },

  // Test timeout (30 seconds default, increase for complex flows)
  timeout: 30_000,

  // Assertion timeout
  expect: {
    timeout: 5_000,
  },

  // Browser projects with authentication setup
  projects: [
    // Setup project - runs once to authenticate and save state
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    // Unauthenticated tests - login forms, registration, smoke tests
    // These run WITHOUT storageState (fresh browser, no cookies)
    {
      name: "unauthenticated",
      use: { ...devices["Desktop Chrome"] },
      testMatch: /\/(auth|smoke|authenticated)\.spec\.ts/,
    },

    // Conversation tests - use saved auth state to avoid re-login each test
    // Depends on setup project to run first
    {
      name: "conversation",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE_PATH,
      },
      dependencies: ["setup"],
      testMatch: /\/conversation\.spec\.ts/,
    },
  ],

  // Web server configuration - expects `make dev` to be running
  // Uncomment to auto-start the dev server (increases test startup time)
  // webServer: {
  //   command: "npm run dev",
  //   url: "http://localhost:3000",
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120_000,
  // },
});
