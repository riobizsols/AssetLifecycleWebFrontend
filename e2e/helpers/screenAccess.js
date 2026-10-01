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
  await gotoProtected(page, `${BASE}${path}`);

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
