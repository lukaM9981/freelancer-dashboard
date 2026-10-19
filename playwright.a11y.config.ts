import { defineConfig } from "@playwright/test";

/**
 * Accessibility checks only (Tech.md §16). The smoke test is `npm run test:e2e`.
 * `npm run test:a11y` starts the server; this file does not.
 */
export default defineConfig({
  testDir: "a11y",
  timeout: 60_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    { name: "screens", testMatch: /screens\.spec\.ts/, dependencies: ["setup"] },
  ],
});
