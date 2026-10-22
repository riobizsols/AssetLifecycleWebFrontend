// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = (process.env.BASE_URL || 'http://localhost:5173').replace(/\/$/, '');
const authFile = path.join(__dirname, 'e2e', '.auth', 'user.json');

/** True once CI runs on the DB server (GitHub variable E2E_RUNNER). */
const localDb = process.env.E2E_LOCAL_DB === 'true';

function ciWorkerCount() {
  const raw = Number(process.env.E2E_WORKERS || 1);
  if (!Number.isFinite(raw) || raw < 1) return 1;
  return Math.min(Math.floor(raw), 4);
}

const workers = process.env.CI ? ciWorkerCount() : 1;

/**
 * E2E against the CI frontend + Node backend.
 * Credentials: RIO_EMAIL / RIO_PASSWORD
 * Override target: BASE_URL
 * E2E_WORKERS (1–4) and E2E_LOCAL_DB come from the GitHub workflow.
 */
export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/global-setup.js',
  passWithNoTests: true,
  fullyParallel: Boolean(process.env.CI) && workers > 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers,
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
