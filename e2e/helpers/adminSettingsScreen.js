// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';
import { skipIfInaccessible } from './reportScreen.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;
const LOADING = /Loading admin settings|Loading properties|Loading certificates|Loading checklists|Loading jobs…|Loading jobs\.\.\.|Loading columns|Loading asset types|Loading assets|Fetching mapping data/i;

export { skipIfInaccessible };

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp | { column: string }} marker
 */
export function markerLocator(page, marker) {
  if (marker && typeof marker === 'object' && 'column' in marker) {
    return page.getByRole('columnheader', { name: marker.column }).first();
  }
  if (marker instanceof RegExp) return page.getByText(marker).first();
  return page.getByText(marker, { exact: true }).first();
}

/**
 * Main-app sidebar: Audit Logs / Audit Log Config.
 * @param {import('@playwright/test').Page} page
 */
export async function expandAppAdminSettings(page) {
  const aside = page.getByRole('complementary');
  const group = aside.getByText('Admin Settings', { exact: true }).first();
  await expect(group).toBeVisible({ timeout: 20000 });
  const child = aside.getByRole('link', { name: /Audit Logs|Audit Log Config/ });
  if (!(await child.first().isVisible().catch(() => false))) {
    await group.click();
  }
  await expect(child.first()).toBeVisible({ timeout: 15000 });
  return aside;
}

/**
 * AdminSettingsLayout sidebar: config modules.
 * Call after opening /adminsettings/configuration.
 * @param {import('@playwright/test').Page} page
 */
export async function expandAdminConfigSidebar(page) {
  const aside = page.getByRole('complementary');
  const group = aside.getByText('Admin Settings', { exact: true }).first();
  await expect(group).toBeVisible({ timeout: 20000 });
  const child = aside.getByRole('link', {
    name: /Job Roles|Column Access Config|Job Monitor|Properties|OPC Configuration/,
  });
  if (!(await child.first().isVisible().catch(() => false))) {
    await group.click();
  }
  await expect(child.first()).toBeVisible({ timeout: 15000 });
  return aside;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp | { column: string }} marker
 * @returns {Promise<'ok' | 'denied' | 'boot'>}
 */
export async function openAdminScreen(page, path, marker) {
  let ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) {
    ready = await gotoProtected(page, `${BASE}${path}`);
  }
  if (!ready) return 'boot';

  const unauthorized = page.getByText(UNAUTHORIZED);
  const titleLocator = markerLocator(page, marker);
  const seen = await unauthorized
    .or(titleLocator)
    .first()
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!seen || (await unauthorized.isVisible().catch(() => false))) {
    return 'denied';
  }
  await waitForAdminReady(page);
  return 'ok';
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForAdminReady(page) {
  const loading = page.getByText(LOADING);
  await expect
    .poll(async () => !(await loading.first().isVisible().catch(() => false)), { timeout: 20000 })
    .toBeTruthy()
    .catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp | null} emptyText
 */
export async function readAdminState(page, emptyText) {
  await waitForAdminReady(page);
  const stillLoading = page.getByText(/Loading jobs|Loading properties|Loading certificates/i);
  if (await stillLoading.first().isVisible().catch(() => false)) {
    return {
      state: 'error',
      count: 0,
      message: ((await stillLoading.first().innerText()) || 'Still loading').trim(),
    };
  }
  const navError = page.getByText('Failed to fetch navigation');
  if (await navError.isVisible().catch(() => false)) {
    return { state: 'error', count: 0, message: 'Failed to fetch navigation' };
  }
  const toastError = page.locator('[data-rht-toaster]').getByText(/Failed to (load|fetch|save)|Network Error/i);
  if (await toastError.first().isVisible().catch(() => false)) {
    return {
      state: 'error',
      count: 0,
      message: ((await toastError.first().innerText()) || '').trim(),
    };
  }
  if (emptyText) {
    const empty =
      emptyText instanceof RegExp
        ? page.getByText(emptyText)
        : page.getByText(emptyText, { exact: true });
    if (await empty.first().isVisible().catch(() => false)) {
      return {
        state: 'empty',
        count: 0,
        message: ((await empty.first().innerText()) || '').trim(),
      };
    }
  }
  const matching = page.getByText('No matching records', { exact: true });
  if (await matching.isVisible().catch(() => false)) {
    return { state: 'empty-filter', count: 0 };
  }
  const rows = page.locator('table tbody tr').filter({
    hasNotText: /No .*found|No data|No matching/,
  });
  const count = await rows.count();
  if (count > 0) return { state: 'data', count };
  return { state: 'unknown', count: 0 };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} columns
 */
export async function expectColumns(page, columns) {
  for (const col of columns) {
    await expect(page.getByRole('columnheader', { name: col }).first()).toBeVisible();
  }
}

/**
 * Switch a top tab by visible label. Missing tabs are a condition, not a fail.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {string[]} tabs
 */
export async function exerciseTabs(page, info, tabs) {
  const seen = [];
  for (const label of tabs) {
    const tab = page.getByRole('button', { name: label, exact: true }).first();
    if (await tab.isVisible().catch(() => false)) {
      await tab.click();
      await waitForAdminReady(page);
      seen.push(label);
    }
  }
  info.annotations.push({
    type: 'condition',
    description: `TABS — ${seen.length ? seen.join(' → ') : 'none visible'}`,
  });
}

/**
 * Native or combobox select: pick first real option, record as condition.
 * @param {import('@playwright/test').Locator} select
 */
export async function firstRealOption(select) {
  const texts = await select.locator('option').allTextContents();
  return texts
    .map((t) => t.trim())
    .filter((t) => t && !/^Select /i.test(t) && !/^-- /i.test(t) && !/^All /i.test(t));
}
