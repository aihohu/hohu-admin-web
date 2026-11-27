import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'field-policy-preparation.spec.ts',
  workers: 1,
  retries: 0,
  timeout: 90000,
  reporter: [['list']],
  outputDir: process.env.POLICY_BROWSER_OUTPUT ?? '.local/browser/policy-preparation',
  use: {
    baseURL: process.env.POLICY_PREPARATION_URL,
    browserName: 'chromium',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'off',
    video: 'off'
  }
});
