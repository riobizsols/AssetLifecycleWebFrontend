// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json');

/**
 * E2E against local Vite FE + Node BE (CI starts both).
 * Credentials: RIO_EMAIL / RIO_PASSWORD
 * Override target: BASE_URL
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 180_000,
  globalTimeout: 60 * 60 * 1000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    storageState: authFile,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Login against remote Postgres can exceed 30s; keep actions generous in CI.
    actionTimeout: 60_000,
    navigationTimeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
