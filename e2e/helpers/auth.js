// @ts-check
import { expect } from '@playwright/test';
import { BASE } from './baseUrl.js';

/** Login against remote DB often takes 30s+ (tenant resolve + nav sync). */
const LOGIN_RESPONSE_TIMEOUT_MS = 120_000;

export function getRioCredentials() {
  const email = process.env.RIO_EMAIL;
  const password = process.env.RIO_PASSWORD;

  if (!email || !password) {
    throw new Error('RIO_EMAIL and RIO_PASSWORD must be set');
  }

  return { email, password };
}

/**
 * Vite can briefly go down mid-suite (HMR crash). Retry until the FE answers.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
async function gotoWithRetry(page, path, attempts = 8) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      await page.goto(`${BASE}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000,
      });
      return;
    } catch (err) {
      lastError = err;
      if (page.isClosed()) throw err;
      await page.waitForTimeout(2000 * (i + 1));
    }
  }
  throw lastError;
}

/**
 * Login lives at `/` and `/login` (ProtectedRoute sends unauthenticated users to `/`).
 * @param {string | URL} url
 */
export function isLoginPath(url) {
  const path = typeof url === 'string' ? new URL(url, BASE).pathname : new URL(url).pathname;
  return path === '/' || /^\/login(\/|$)/.test(path);
}

function isAppPath(url) {
  const path = new URL(url).pathname;
  return /\/(dashboard|change-password|adminsettings|assets|assign-|spare-|maintenance|group-asset|master-data|workorder|scrap|inspection|certif|tech-cert|report|serial|vendor)(\/|$)/i.test(
    path
  );
}

/**
 * Wait until React has painted either the login form or an authenticated shell.
 * Avoids treating a pre-hydration `/dashboard` as "already logged in".
 * @param {import('@playwright/test').Page} page
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<'login' | 'app'>}
 */
async function waitForLoginOrApp(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 45000;
  const loginMarker = page
    .locator('#email')
    .or(page.getByRole('heading', { name: 'Welcome back!' }));
  const appMarker = page
    .getByText('Total Assets')
    .or(page.getByRole('heading', { name: 'Change Password' }))
    .or(page.locator('nav, aside').getByText(/RIO|Dashboard|Assets/i).first());

  const outcome = await Promise.race([
    loginMarker
      .first()
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => /** @type {const} */ ('login')),
    appMarker
      .first()
      .waitFor({ state: 'visible', timeout: timeoutMs })
      .then(() => /** @type {const} */ ('app')),
  ]).catch(() => null);

  if (outcome === 'app' && !isLoginPath(page.url())) return 'app';
  if (outcome === 'login' || isLoginPath(page.url()) || (await page.locator('#email').count()) > 0) {
    return 'login';
  }
  if (outcome === 'app') return 'app';

  // Last resort: URL-based guess after timeout
  return isLoginPath(page.url()) || isAppPath(page.url()) === false ? 'login' : 'app';
}

/**
 * Ensure an authenticated session. Skips UI login when storageState already logged in.
 * @param {import('@playwright/test').Page} page
 */
export async function loginToRioEam(page) {
  await gotoWithRetry(page, '/dashboard');

  const gate = await waitForLoginOrApp(page);
  // Already authenticated via storageState (or prior login in this test).
  if (gate === 'app') return;

  await gotoWithRetry(page, '/login');

  const gateAfterLoginNav = await waitForLoginOrApp(page);
  if (gateAfterLoginNav === 'app') return;

  const welcome = page.getByRole('heading', { name: 'Welcome back!' });
  const badGateway = page.getByRole('heading', { name: '502 Bad Gateway' });
  const emailField = page.locator('#email');

  for (let attempt = 0; attempt < 5; attempt += 1) {
    if (await welcome.isVisible().catch(() => false)) break;
    if (await emailField.isVisible().catch(() => false)) break;

    const settled = await waitForLoginOrApp(page, { timeoutMs: 10000 }).catch(() => 'login');
    if (settled === 'app') return;

    if ((await badGateway.isVisible().catch(() => false)) || attempt < 4) {
      await page.waitForTimeout(2000 * (attempt + 1));
      await gotoWithRetry(page, '/login', 3);
      if ((await waitForLoginOrApp(page, { timeoutMs: 15000 })) === 'app') return;
    }
  }

  // Prefer the heading; both heading + #email are on the login page (do not use .or() —
  // Playwright strict mode fails when both match).
  if (!(await welcome.isVisible().catch(() => false))) {
    await expect(emailField).toBeVisible({ timeout: 20000 });
  } else {
    await expect(welcome).toBeVisible({ timeout: 5000 });
  }

  const { email, password } = getRioCredentials();
  await emailField.fill(email);
  await page.locator('#password').fill(password);

  let loginResponse;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/auth/login') &&
        response.request().method() === 'POST',
      { timeout: LOGIN_RESPONSE_TIMEOUT_MS }
    );

    await page.getByRole('button', { name: 'Login' }).click();

    try {
      loginResponse = await loginResponsePromise;
    } catch (err) {
      if (attempt === 2) throw err;
      if (page.isClosed()) throw err;
      await page.waitForTimeout(2000);
      await page.locator('#password').fill(password);
      continue;
    }

    if (loginResponse.ok()) break;

    const rateLimited = await page
      .getByText(/Too many login attempts/i)
      .isVisible()
      .catch(() => false);
    if (!rateLimited || attempt === 2) break;

    await page.waitForTimeout(15000 * (attempt + 1));
    await page.locator('#password').fill(password);
  }

  expect(loginResponse?.ok()).toBeTruthy();

  // `/` is the login page — do not treat it as a post-login success URL.
  await page.waitForURL((url) => isAppPath(url) && !isLoginPath(url), {
    timeout: 60000,
  });

  await expect(page.locator('#email')).toHaveCount(0, { timeout: 15000 });
}
