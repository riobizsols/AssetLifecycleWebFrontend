// @ts-check
import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loginToRioEam } from './helpers/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, '.auth');
const authFile = path.join(authDir, 'user.json');

/**
 * Log in once and reuse session cookies/localStorage across the suite.
 */
export default async function globalSetup() {
  fs.mkdirSync(authDir, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await loginToRioEam(page);
  await page.context().storageState({ path: authFile });
  await browser.close();
}
