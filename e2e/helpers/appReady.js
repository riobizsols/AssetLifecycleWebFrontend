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
  const timeoutMs = opts.timeoutMs ?? 20000;
  if (page.isClosed()) return false;

  const loader = bootLoadingLocator(page);
  const cleared = await loader
    .first()
    .waitFor({ state: 'hidden', timeout: timeoutMs })
    .then(() => true)
    .catch(() => false);

  if (page.isClosed()) return false;
  if (cleared) return true;
  const remaining = await loader.count().catch(() => 0);
  return remaining === 0;
}

function navWaitMs() {
  return process.env.E2E_LOCAL_DB === 'true' ? 20000 : 45000;
}

/**
 * The menu request and the boot spinner finish together. Waiting for both
 * one after the other adds the second wait onto every screen.
 * @param {import('@playwright/test').Page} page
 */
function watchNavigation(page) {
  return page
    .waitForResponse(
      (response) =>
        response.url().includes('/navigation/user/navigation') &&
        response.request().method() === 'GET',
      { timeout: navWaitMs() }
    )
    .catch(() => null);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {Promise<unknown>} navPromise
 */
async function waitForNavAndShell(page, navPromise) {
  const shellPromise = waitForAppShell(page, { timeoutMs: navWaitMs() });
  await Promise.race([navPromise, shellPromise]);
  return shellPromise;
}

/**
 * Navigate to a protected app path, re-login if session expired, wait for boot loader.
 * @param {import('@playwright/test').Page} page
 * @param {string} url
 */
export async function gotoProtected(page, url) {
  if (page.isClosed()) return false;
  try {
    const navPromise = watchNavigation(page);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });

    let ready;
    if (await isLoginPage(page)) {
      // Don't wait for nav API on the login screen — it never fires.
      await loginToRioEam(page);
      const navPromise2 = watchNavigation(page);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      ready = await waitForNavAndShell(page, navPromise2);
    } else {
      ready = await waitForNavAndShell(page, navPromise);
    }

    if (!ready) return false;

    if (await isLoginPage(page)) {
      return false;
    }
    return true;
  } catch (err) {
    if (page.isClosed() || /has been closed|Target page/i.test(String(err))) return false;
    throw err;
  }
}
