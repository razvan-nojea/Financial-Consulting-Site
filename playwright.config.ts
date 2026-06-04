import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Run both the existing e2e suite and the new playwright/ bot specs
  testDir: ".",
  testMatch: [
    "e2e/**/*.spec.ts",
    "playwright/**/*.spec.ts",
  ],
  fullyParallel: false,
  retries: 1,
  timeout: 60_000,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Ignore self-signed certificate errors for HTTPS dev server
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
