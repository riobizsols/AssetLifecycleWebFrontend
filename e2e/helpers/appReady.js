// @ts-check
import { expect } from '@playwright/test';
import { isLoginPath, loginToRioEam } from './auth.js';

/**
 * Full-page boot spinner from ProtectedRoute while navigation permissions load.
 * @param {import('@playwright/test').Page} page
 */
export function bootLoadingLocator(page) {
  return page.locator('div.min-h-screen').filter({
    has: page.locator('p.text-gray-600', { hasText: /^Loading\.\.\.$/ }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function isLoginPage(page) {
  if (isLoginPath(page.url())) return true;
  return (await page.locator('#email').count().catch(() => 0)) > 0;
}

/**
 * Wait out ProtectedRoute "Loading..." (nav fetch). Reload once if stuck.
 * @param {import('@playwright/test').Page} page
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function waitForAppShell(page, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 90000;
  if (page.isClosed()) return;

  const loader = bootLoadingLocator(page);

  const cleared = await loader
    .first()
    .waitFor({ state: 'hidden', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);

  if (page.isClosed()) return;

  const remaining = await loader.count().catch(() => 0);
  if (cleared || remaining === 0) {
    return;
  }

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  if (page.isClosed()) return;
  await expect(loader).toHaveCount(0, { timeout: timeoutMs });
}

/**
 * Navigate to a protected app path, re-login if session expired, wait for boot loader.
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
export async function gotoProtected(page, url) {
  const navPromise = page
    .waitForResponse(
      (response) =>
        response.url().includes('/navigation/user/navigation') &&
        response.request().method() === 'GET',
      { timeout: 90000 }
    )
    .catch(() => null);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  if (await isLoginPage(page)) {
    // Don't wait for nav API on the login screen — it never fires.
    await loginToRioEam(page);
    const navPromise2 = page
      .waitForResponse(
        (response) =>
          response.url().includes('/navigation/user/navigation') &&
          response.request().method() === 'GET',
        { timeout: 90000 }
      )
      .catch(() => null);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await navPromise2;
  } else {
    await navPromise;
  }

  await waitForAppShell(page);

  if (await isLoginPage(page)) {
    throw new Error(`Still on login after navigating to ${url}`);
  }
}
