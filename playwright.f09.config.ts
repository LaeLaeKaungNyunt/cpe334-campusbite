import { defineConfig } from '@playwright/test';

const baseURL = 'http://127.0.0.1:4179';

export default defineConfig({
  testDir: 'e2e',
  testMatch: 'orderSearch.spec.ts',
  outputDir: '.cache/playwright/f09',
  use: { baseURL, channel: process.env.PLAYWRIGHT_CHANNEL },
  webServer: {
    command: 'npm --workspace=frontend run dev -- --host 127.0.0.1 --port 4179 --strictPort',
    url: baseURL,
    reuseExistingServer: false,
  },
});
