// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';
import { clickUnblocked, toastMessage } from './screenAccess.js';
import { skipIfInaccessible } from './reportScreen.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;

export { skipIfInaccessible };

/**
 * @param {import('@playwright/test').Page} page
 */
export async function expandUtilitiesSidebar(page) {
  const aside = page.getByRole('complementary').or(page.locator('aside')).first();
  const group = page.getByText('Utilities', { exact: true }).first();
  if (!(await group.isVisible({ timeout: 8000 }).catch(() => false))) return aside;
  const child = page.getByText(/Utility Master|Record Consumption|Asset Type Mapping/i);
  if (!(await child.first().isVisible().catch(() => false))) {
    await group.click({ force: true, timeout: 8000 }).catch(() => {});
  }
  await child.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
  return aside;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 * @returns {Promise<'ok' | 'denied' | 'boot'>}
 */
export async function openUtilityScreen(page, path, title) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return 'boot';

  const unauthorized = page.getByText(UNAUTHORIZED);
  const titleLocator =
    title instanceof RegExp
      ? page.getByText(title).first()
      : page.getByText(title, { exact: true }).first();
  const marker = unauthorized.or(titleLocator).first();
  const seen = await marker
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!seen || (await unauthorized.isVisible().catch(() => false))) {
    return 'denied';
  }
  await waitForUtilityReady(page);
  return 'ok';
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForUtilityReady(page) {
  const loading = page.getByText('Loading…');
  await expect
    .poll(async () => !(await loading.isVisible().catch(() => false)), { timeout: 45000 })
    .toBeTruthy();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
export function utilityPanel(page, title) {
  return page.locator('section').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });
}

/**
 * UtilityField wraps the control in a <label>. Match the caption; nested
 * select option text is ignored because hasText is substring-based.
 * @param {import('@playwright/test').Locator | import('@playwright/test').Page} root
 * @param {string} label
 */
export function utilityField(root, label) {
  return root.locator('label').filter({ hasText: label }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readUtilityState(page) {
  await waitForUtilityReady(page);
  const toastError = page.locator('[data-rht-toaster]').getByText(/Failed to load|Network Error/i);
  if (await toastError.first().isVisible().catch(() => false)) {
    return {
      state: 'error',
      message: ((await toastError.first().innerText()) || '').trim(),
    };
  }
  const empty = page.getByText(
    /Create a utility above|No mappings yet|No consumption recorded yet|No measurement profiles yet|No records match/i,
  );
  if (await empty.first().isVisible().catch(() => false)) {
    return { state: 'empty', message: ((await empty.first().innerText()) || '').trim() };
  }
  return { state: 'data' };
}
