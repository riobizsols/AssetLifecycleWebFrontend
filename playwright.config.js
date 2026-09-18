// @ts-check
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

/**
 * E2E against local Vite FE + Node BE (CI starts both).
 * Credentials: RIO_EMAIL / RIO_PASSWORD
 * Override target: BASE_URL
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 120_000,
  globalTimeout: 60 * 60 * 1000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
