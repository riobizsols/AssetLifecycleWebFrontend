// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';
import { skipIfInaccessible } from './reportScreen.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;

export { skipIfInaccessible };

/**
 * @param {import('@playwright/test').Page} page
 */
export async function expandConsumablesSidebar(page) {
  const aside = page.getByRole('complementary');
  const group = aside.getByText('Consumables', { exact: true }).first();
  await expect(group).toBeVisible({ timeout: 20000 });
  const child = aside.getByRole('link', { name: /Consumables Inventory|Consumables Usage/ });
  if (!(await child.first().isVisible().catch(() => false))) {
    await group.click();
  }
  await expect(child.first()).toBeVisible({ timeout: 15000 });
  return aside;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string} title
 * @param {string} [readyText]
 * @returns {Promise<'ok' | 'denied' | 'boot'>}
 */
export async function openConsumablesScreen(page, path, title, readyText) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return 'boot';

  const unauthorized = page.getByText(UNAUTHORIZED);
  const heading = page.getByRole('heading', { name: title, exact: true }).first();
  const marker = unauthorized.or(heading).first();
  const seen = await marker
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => true)
    .catch(() => false);
  if (!seen || (await unauthorized.isVisible().catch(() => false))) {
    return 'denied';
  }
  await waitForConsumablesReady(page, readyText);
  return 'ok';
}

/**
 * Loading is a pulse skeleton, not a "Loading…" label.
 * @param {import('@playwright/test').Page} page
 * @param {string} [readyText]
 */
export async function waitForConsumablesReady(page, readyText) {
  const pulse = page.locator('.animate-pulse');
  const marker = readyText
    ? page.getByText(readyText, { exact: true }).first()
    : page.locator('table, [data-rht-toaster]').first();
  await expect
    .poll(
      async () => {
        const pulsing = (await pulse.count()) > 0;
        const shown = await marker.isVisible().catch(() => false);
        return !pulsing && shown;
      },
      { timeout: 45000 },
    )
    .toBeTruthy();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} emptyText
 */
export async function readConsumablesState(page, emptyText) {
  const toastError = page.locator('[data-rht-toaster]').getByText(/Failed to load|Network Error/i);
  if (await toastError.first().isVisible().catch(() => false)) {
    return {
      state: 'error',
      count: 0,
      message: ((await toastError.first().innerText()) || '').trim(),
    };
  }
  const empty = page.getByText(emptyText, { exact: true });
  const matching = page.getByText('No matching records', { exact: true });
  if (await empty.isVisible().catch(() => false)) {
    return { state: 'empty', count: 0, message: emptyText };
  }
  if (await matching.isVisible().catch(() => false)) {
    return { state: 'empty-filter', count: 0, message: 'No matching records' };
  }
  const rows = page.locator('table tbody tr').filter({
    hasNotText: /No consumables yet|No stock recorded|No allocations recorded|No matching records/,
  });
  const count = await rows.count();
  if (count > 0) return { state: 'data', count };
  return { state: 'unknown', count: 0 };
}

/**
 * @param {import('@playwright/test').Page} page
 */
export function dataRows(page) {
  return page.locator('table tbody tr').filter({
    hasNotText: /No consumables yet|No stock recorded|No allocations recorded|No matching records/,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} colIndex 1-based
 */
export async function columnTexts(page, colIndex) {
  const cells = dataRows(page).locator(`td:nth-child(${colIndex})`);
  const n = await cells.count();
  const values = [];
  for (let i = 0; i < n; i += 1) {
    values.push(((await cells.nth(i).innerText()) || '').trim());
  }
  return values;
}

/**
 * Native selects in the table toolbar.
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export function toolbarSelect(page, label) {
  return page.getByRole('combobox', { name: label });
}

/**
 * @param {import('@playwright/test').Locator} select
 */
export async function realSelectLabels(select) {
  const texts = await select.locator('option').allTextContents();
  return texts.map((t) => t.trim()).filter((t) => t && !/^All /i.test(t));
}

/**
 * HTML5 required check — do not fill enough to save.
 * @param {import('@playwright/test').Locator} control
 */
export async function isInvalid(control) {
  return control.evaluate((el) => {
    if (!(el instanceof HTMLInputElement || el instanceof HTMLSelectElement)) return false;
    return !el.checkValidity();
  });
}
