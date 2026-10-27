// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';
import { fillReactInput, headerAddButton, noteInaccessible } from './screenAccess.js';
import { skipIfInaccessible } from './reportScreen.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;
const ERROR_TEXT = /Failed to fetch|Error loading|Network Error|Failed to load/i;

export { skipIfInaccessible };

/**
 * @param {import('@playwright/test').Page} page
 */
export async function expandInspectionSidebar(page) {
  const aside = page.getByRole('complementary');
  const group = aside.getByText('Inspection', { exact: true }).first();
  await expect(group).toBeVisible({ timeout: 20000 });
  const alreadyOpen = aside.getByText(/Inspection Approval|Inspection View|Inspection List/i);
  if (!(await alreadyOpen.first().isVisible().catch(() => false))) {
    await group.click();
  }
  await expect(alreadyOpen.first()).toBeVisible({ timeout: 15000 });
  return aside;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 * @param {string} [columnMarker]
 * @returns {Promise<'ok' | 'denied' | 'boot'>}
 */
export async function openInspectionScreen(page, path, title, columnMarker) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return 'boot';

  const unauthorized = page.getByText(UNAUTHORIZED);
  const titleLocator = columnMarker
    ? page.getByRole('columnheader', { name: columnMarker, exact: true }).first()
    : title instanceof RegExp
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
  return 'ok';
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForListData(page) {
  const loading = page.getByText(/^Loading\.\.\.$/);
  await expect
    .poll(
      async () => !(await loading.isVisible().catch(() => false)),
      { timeout: 45000 },
    )
    .toBeTruthy();
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readErrorBanner(page) {
  const banner = page.locator('.bg-red-50').filter({ hasText: ERROR_TEXT });
  if (await banner.first().isVisible().catch(() => false)) {
    return ((await banner.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readListState(page) {
  await waitForListData(page);
  const error = await readErrorBanner(page);
  if (error && /Failed to fetch|Error loading data|Network Error/i.test(error)) {
    return { state: 'error', count: 0, message: error };
  }
  const empty = page.getByText('No data found', { exact: true });
  if (await empty.isVisible().catch(() => false)) {
    return { state: 'empty', count: 0 };
  }
  const rows = page.locator('table tbody tr').filter({ hasNotText: 'No data found' });
  const count = await rows.count();
  if (count > 0) return { state: 'data', count };
  return { state: 'unknown', count: 0 };
}

/**
 * @param {import('@playwright/test').Page} page
 */
export function headerDownload(page) {
  return page.locator('div.flex.gap-2.justify-end > button').last();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} columns
 */
export async function expectListChrome(page, columns, opts = {}) {
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible({ timeout: 20000 });
  if (opts.hasDownload) await expect(headerDownload(page)).toBeVisible();
  if (opts.hasAdd) await expect(headerAddButton(page)).toBeVisible();
  for (const heading of columns) {
    await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function clearListFilters(page) {
  const remove = page.locator('div.flex.items-center.border.rounded.bg-gray-50 > button');
  const count = await remove.count();
  for (let i = 0; i < count; i += 1) {
    await remove.first().click({ force: true }).catch(() => {});
  }
  await waitForListData(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 */
export async function addSearchFilter(page, columnLabel) {
  await page.locator('[data-contentbox-filter-button]').click();
  const searchBy = page.getByText('Search by Column', { exact: true });
  await expect(searchBy).toBeVisible({ timeout: 10000 });
  await searchBy.click();
  await page.locator('select').last().selectOption({ label: columnLabel });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function listFilterValues(page) {
  const trigger = page.getByRole('button', { name: 'Select values' });
  if (!(await trigger.isVisible().catch(() => false))) return [];
  await trigger.click();
  const menu = page
    .locator('div.absolute.z-50')
    .filter({ has: page.getByPlaceholder('Search...') })
    .last();
  const opened = await menu.isVisible().catch(() => false);
  if (!opened) return [];
  const items = menu.locator('div.cursor-pointer, label, div').filter({ hasNotText: /^Search/ });
  const count = await items.count();
  const names = [];
  for (let i = 0; i < Math.min(count, 40); i += 1) {
    const text = ((await items.nth(i).innerText()) || '').split('\n')[0].trim();
    if (text && text !== 'Search...' && !/^No /.test(text)) names.push(text);
  }
  await page.keyboard.press('Escape').catch(() => {});
  return [...new Set(names)];
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} value
 */
export async function pickFilterValue(page, value) {
  const trigger = page.getByRole('button', { name: /Select values|\d+ selected/i });
  await expect(trigger).toBeVisible({ timeout: 10000 });
  await trigger.click();
  const menu = page
    .locator('div.absolute.z-50')
    .filter({ has: page.getByPlaceholder('Search...') })
    .last();
  await expect(menu).toBeVisible({ timeout: 10000 });
  const search = menu.getByPlaceholder('Search...');
  if (await search.isVisible().catch(() => false)) {
    await fillReactInput(search, value);
  }
  const option = menu.getByText(value, { exact: true }).first();
  if (!(await option.isVisible().catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  await option.click();
  await page.keyboard.press('Escape').catch(() => {});
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} header
 */
export async function columnValues(page, header) {
  const headers = page.locator('table thead th');
  const n = await headers.count();
  let index = -1;
  for (let i = 0; i < n; i += 1) {
    const text = ((await headers.nth(i).innerText()) || '').trim();
    if (text === header) {
      index = i;
      break;
    }
  }
  if (index < 0) return [];
  const cells = page.locator(`table tbody tr td:nth-child(${index + 1})`);
  const count = Math.min(await cells.count(), 25);
  const values = [];
  for (let i = 0; i < count; i += 1) {
    values.push(((await cells.nth(i).innerText()) || '').trim());
  }
  return values;
}

/**
 * @param {string[]} values
 * @param {string} option
 */
export function valuesMatchFilter(values, option) {
  if (!values.length) return true;
  const needle = String(option).trim().toLowerCase();
  return values.every((cell) => {
    const hay = cell.toLowerCase();
    return hay === '' || hay === 'n/a' || hay.includes(needle) || needle.includes(hay);
  });
}

/**
 * Apply a Search-by-Column filter and check rows (or empty).
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {string} column
 * @param {string} value
 * @param {boolean} [matchColumn]
 */
export async function applyColumnValue(page, info, column, value, matchColumn = true) {
  await clearListFilters(page);
  await addSearchFilter(page, column);
  const picked = await pickFilterValue(page, value);
  if (!picked) {
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${column}="${value}" — option not in dropdown.`,
    });
    await clearListFilters(page);
    return;
  }
  await waitForListData(page);
  const data = await readListState(page);
  if (data.state === 'error') {
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${column}="${value}" → API error (${data.message})`,
    });
    await clearListFilters(page);
    return;
  }
  if (matchColumn && data.state === 'data') {
    const cells = await columnValues(page, column);
    if (cells.length && !valuesMatchFilter(cells, value)) {
      throw new Error(
        `BUG — wrong data after ${column}="${value}". Cells: [${cells.slice(0, 8).join(' | ')}]`,
      );
    }
  }
  info.annotations.push({
    type: 'condition',
    description: `FILTER ${column}="${value}" → ${data.state}${data.count ? ` (${data.count} rows)` : ''}`,
  });
  await clearListFilters(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ column: string, options: string[], matchColumn?: boolean }} spec
 */
export async function exercisePresetFilter(page, info, spec) {
  for (const option of spec.options) {
    await applyColumnValue(page, info, spec.column, option, spec.matchColumn !== false);
  }
}

/**
 * Search using a value from the first data row (when the list has rows).
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {string[]} columns
 */
export async function exerciseSearchFromRow(page, info, columns) {
  const state = await readListState(page);
  if (state.state !== 'data') {
    info.annotations.push({
      type: 'condition',
      description: 'SEARCH — no rows to sample a filter value from.',
    });
    return;
  }
  for (const column of columns.slice(0, 3)) {
    const cells = await columnValues(page, column);
    const sample = cells.find((v) => v && v !== '-' && v !== 'N/A');
    if (!sample) {
      info.annotations.push({
        type: 'condition',
        description: `SEARCH ${column} — no cell value to reuse.`,
      });
      continue;
    }
    await applyColumnValue(page, info, column, sample, true);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 */
export async function exerciseDateFilter(page, info) {
  await clearListFilters(page);
  await page.locator('[data-contentbox-filter-button]').click();
  const dateItem = page.getByText('Expiry Date', { exact: true });
  if (!(await dateItem.isVisible().catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => {});
    info.annotations.push({
      type: 'condition',
      description: 'DATE FILTER — Expiry Date option not in Add Filter menu.',
    });
    return;
  }
  await dateItem.click();
  const from = page.locator('input[type="date"]').first();
  const to = page.locator('input[type="date"]').last();
  await expect(from).toBeVisible({ timeout: 10000 });
  await from.fill('2024-01-01');
  await to.fill('2026-12-31');
  await waitForListData(page);
  const data = await readListState(page);
  info.annotations.push({
    type: 'condition',
    description: `DATE FILTER 2024-01-01..2026-12-31 → ${data.state}${data.count ? ` (${data.count} rows)` : ''}`,
  });
  await clearListFilters(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {string} header
 */
export async function exerciseSort(page, info, header) {
  const th = page.getByRole('columnheader', { name: header, exact: true });
  if (!(await th.isVisible().catch(() => false))) return;
  await th.click();
  await waitForListData(page);
  const data = await readListState(page);
  info.annotations.push({
    type: 'condition',
    description: `SORT ${header} → ${data.state}`,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 */
export async function exerciseDownload(page, info) {
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await headerDownload(page).click();
  const download = await downloadPromise;
  info.annotations.push({
    type: 'condition',
    description: `DOWNLOAD → ${download ? download.suggestedFilename() : 'no file (empty or blocked)'}`,
  });
}

/**
 * Open the first data row. Returns the URL or null.
 * @param {import('@playwright/test').Page} page
 */
export async function openFirstRow(page) {
  const state = await readListState(page);
  if (state.state !== 'data') return null;
  const row = page.locator('table tbody tr').filter({ hasNotText: 'No data found' }).first();
  const previous = page.url();
  await row.locator('td').nth(1).click();
  const moved = await page
    .waitForURL((url) => url.toString() !== previous, { timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  return moved ? page.url() : null;
}

/**
 * Asset Type dropdown on Trigger Inspection for Asset.
 * @param {import('@playwright/test').Page} page
 */
export async function pickCreateAssetType(page) {
  const field = page.locator('label').filter({ hasText: /Asset Type/ }).locator('xpath=..');
  const trigger = field.getByRole('button').first();
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await trigger.click();
  const search = page.getByPlaceholder(/Search asset type/i);
  await expect(search).toBeVisible({ timeout: 10000 });
  const panel = search.locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]');
  const items = panel.locator('div.cursor-pointer');
  const count = await items.count();
  for (let i = 0; i < count; i += 1) {
    const text = await items.nth(i).innerText();
    if (/\([1-9]\d*\)/.test(text) || (count > 1 && i === 1) || count === 1) {
      await items.nth(i).click();
      return true;
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
  return false;
}

export { noteInaccessible, headerAddButton };
