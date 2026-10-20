import { defineConfig } from '@playwright/test';

/** Browser tests (SPEC.md section 7, tests 1–3 and 8). Uses the installed Chrome; no browser download. */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 300_000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    channel: 'chrome',
    viewport: { width: 1280, height: 800 },
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
