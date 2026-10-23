// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;

/**
 * @param {string} screen
 */
export function noteInaccessible(screen) {
  test.info().annotations.push({
    type: 'note',
    description: `${screen} is not available for this login`,
  });
}

/**
 * Open a protected screen. Returns false when this login cannot see it.
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 */
export async function openTitledScreen(page, path, title) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return false;

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
    return false;
  }

  await expect(titleLocator).toBeVisible({ timeout: 15000 });
  return true;
}

/**
 * Header plus button used by ContentBox lists.
 * @param {import('@playwright/test').Page} page
 */
export function headerAddButton(page) {
  return page.locator('div.flex.gap-2.justify-end > button').first();
}

/**
 * Pick an organization on Add Branch after /orgs has loaded.
 * Uses preferredId when passed; otherwise the first real org.
 * @param {import('@playwright/test').Page} page
 * @param {string} [preferredId]
 */
export async function selectLoadedOrganization(page, preferredId) {
  const orgSelect = page.locator('select[name="org_id"]');
  await expect(orgSelect).toBeEnabled({ timeout: 30000 });
  const real = orgSelect.locator('option[value]:not([value=""])');
  await expect(real.first()).toBeAttached({ timeout: 30000 });
  if (preferredId) {
    await expect(orgSelect.locator(`option[value="${preferredId}"]`)).toBeAttached({ timeout: 30000 });
    await orgSelect.selectOption(preferredId);
    return preferredId;
  }
  const value = await real.first().getAttribute('value');
  if (!value) {
    throw new Error('No organization is available');
  }
  await orgSelect.selectOption(value);
  return value;
}

/**
 * Clear react-hot-toast overlays that intercept clicks on Save/Cancel.
 * @param {import('@playwright/test').Page} page
 */
export async function dismissToasts(page) {
  const toaster = page.locator('[data-rht-toaster]');
  if (!(await toaster.isVisible().catch(() => false))) return;
  const close = toaster.locator('button');
  if (await close.count()) {
    await close.first().click({ force: true }).catch(() => {});
  }
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * Wait until a list shows a row opener or an empty-state message.
 * ContentBox hides *_id columns and only marks rows clickable when onRowClick is set.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row
 * @param {string | RegExp} emptyText
 * @returns {Promise<boolean>} true when the row opener is visible
 */
export async function waitForRowOrEmpty(page, row, emptyText) {
  const empty = page.getByText(emptyText).first();
  await expect(row.or(empty).first()).toBeVisible({ timeout: 30000 });
  return row.isVisible().catch(() => false);
}
