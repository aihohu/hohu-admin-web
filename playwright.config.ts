import { defineConfig } from '@playwright/test';
import { adminAuthFile } from './tests/e2e/support/auth';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: process.env.AI_E2E_BASE_URL || 'http://localhost:9527',
    channel: 'chrome',
    headless: process.env.PLAYWRIGHT_HEADED !== '1'
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/
    },
    {
      name: 'chrome',
      testIgnore: [/.*\.setup\.ts/, /provider-smoke\.spec\.ts/],
      use: { storageState: adminAuthFile },
      dependencies: ['setup']
    },
    {
      name: 'provider',
      testMatch: /provider-smoke\.spec\.ts/,
      use: { storageState: { cookies: [], origins: [] } }
    }
  ]
});
