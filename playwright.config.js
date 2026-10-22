// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadLocalCredentials } from './e2e/helpers/loadCredentials.js';

loadLocalCredentials();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || 'http://playwright.localhost:5173').replace(/\/$/, '');
const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json');

/** True once CI runs on the DB server (GitHub variable E2E_RUNNER). */
const localDb = process.env.E2E_LOCAL_DB === 'true';

/**
 * E2E against the playwright tenant (playwright.localhost) on playwright_db.
 * Login comes from RIO_EMAIL and RIO_PASSWORD.
 * Override target: BASE_URL
 * E2E_LOCAL_DB comes from the GitHub workflow.
 * Specs run one file at a time, in filename order, because each file leaves
 * records the next file uses.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  passWithNoTests: true,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: localDb ? 120_000 : 180_000,
  globalTimeout: 180 * 60 * 1000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: BASE_URL,
    storageState: authFile,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    // Remote Postgres through the SSH tunnel is slow. Tighten only on the DB server.
    actionTimeout: localDb ? 20_000 : 60_000,
    navigationTimeout: localDb ? 30_000 : 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
