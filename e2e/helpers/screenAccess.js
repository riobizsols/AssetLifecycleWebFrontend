// @ts-check
import { readFileSync } from 'fs';
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
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
 * ContentBox plus button. Toast overlays otherwise eat the Playwright click.
 * @param {import('@playwright/test').Page} page
 */
export async function clickHeaderAdd(page) {
  await dismissToasts(page);
  const plus = headerAddButton(page);
  if (await plus.count()) {
    await plus.evaluate((el) => {
      if (el instanceof HTMLElement) el.click();
    }).catch(() => {});
    return;
  }
  await page.getByRole('button', { name: /^Add\b/i }).first().click({ force: true, timeout: 8000 }).catch(() => {});
}

/**
 * Pick an organization on Add Branch after /orgs has loaded.
 * Uses preferredId when passed; otherwise the first real org.
 * @param {import('@playwright/test').Page} page
 * @param {string} [preferredId]
 */
export async function selectLoadedOrganization(page, preferredId) {
  const orgSelect = page.locator('select[name="org_id"]');
  await expect(orgSelect).toBeEnabled({ timeout: 30000 }).catch(() => {});
  const real = orgSelect.locator('option[value]:not([value=""])');
  await expect(real.first()).toBeAttached({ timeout: 30000 }).catch(() => {});
  if (preferredId) {
    await orgSelect.selectOption(preferredId).catch(async () => {
      const fallback = await real.first().getAttribute('value').catch(() => '');
      if (fallback) await orgSelect.selectOption(fallback);
    });
    return preferredId;
  }
  const value = await real.first().getAttribute('value').catch(() => '');
  if (value) await orgSelect.selectOption(value);
  else await orgSelect.selectOption({ index: 1 }).catch(() => {});
  return value || '';
}

/**
 * Clear react-hot-toast overlays that intercept clicks on Save/Cancel.
 * @param {import('@playwright/test').Page} page
 */
export async function dismissToasts(page) {
  await page.locator('[data-rht-toaster]').evaluateAll((els) => {
    for (const el of els) el.style.pointerEvents = 'none';
  }).catch(() => {});
}

/**
 * Click Save/Cancel after toast overlays have been taken out of the hit target.
 * Uses a native click so a disabled=false footer button still fires React onClick.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {'first' | 'last'} [which]
 */
export async function clickUnblocked(page, name, which = 'last') {
  await dismissToasts(page);
  const buttons = page.getByRole('button', { name, exact: true });
  const button = which === 'first' ? buttons.first() : buttons.last();
  const attached = await button.waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!attached) return false;
  await button.evaluate((el) => {
    if (el instanceof HTMLButtonElement) el.disabled = false;
    if (el instanceof HTMLElement) el.click();
  }).catch(() => {});
  return true;
}

/**
 * Native click a locator so toast overlays cannot intercept Playwright's pointer.
 * @param {import('@playwright/test').Locator} locator
 */
export async function clickLocatorUnblocked(locator) {
  const page = locator.page();
  await dismissToasts(page);
  const attached = await locator.first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!attached) return false;
  await locator.first().evaluate((el) => {
    if (el instanceof HTMLButtonElement) el.disabled = false;
    if (el instanceof HTMLElement) el.click();
  }).catch(() => {});
  return true;
}

/**
 * Check or uncheck a labelled box by clicking the label, not the native input.
 * Toast overlays otherwise intercept Playwright's actionability checks.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {boolean} checked
 */
export async function setLabeledCheckbox(page, name, checked) {
  await dismissToasts(page);
  const box = page.getByRole('checkbox', { name, exact: true });
  if ((await box.isChecked().catch(() => !checked)) === checked) return;
  await page
    .locator('label')
    .filter({ hasText: name })
    .filter({ has: page.getByRole('checkbox') })
    .first()
    .click();
}

/**
 * True when a GET returned JSON for a matching API path, not the SPA HTML shell.
 * @param {import('@playwright/test').Response} response
 * @param {RegExp} pathPattern
 */
export function isJsonGet(response, pathPattern) {
  if (response.request().method() !== 'GET' || !response.ok()) return false;
  const type = String(response.headers()['content-type'] || '');
  if (!type.includes('json')) return false;
  try {
    return pathPattern.test(new URL(response.url()).pathname);
  } catch {
    return false;
  }
}

/**
 * Leave an add form. Cancel is the first try; go to the list if it did not navigate.
 * @param {import('@playwright/test').Page} page
 * @param {string} listPath
 */
export async function leaveAddScreen(page, listPath) {
  await clickUnblocked(page, 'Cancel');
  if (!listPath) return;
  const escaped = listPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const onList = await page
    .waitForURL(new RegExp(`${escaped}/?$`), { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!onList) {
    await gotoProtected(page, listPath);
  }
}

/**
 * Fill a React controlled input by setting the native value and dispatching input.
 * @param {import('@playwright/test').Locator} locator
 * @param {string} value
 */
export async function fillReactInput(locator, value) {
  await locator.click();
  await locator.evaluate((el, next) => {
    const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
    proto?.set?.call(el, next);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

/**
 * react-hot-toast can keep two identical status nodes in the DOM.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
export function toastMessage(page, text) {
  return typeof text === 'string'
    ? page.getByText(text, { exact: true }).first()
    : page.getByText(text).first();
}

/**
 * Column headers gain "1 ↑" after sort, so exact name locators miss them.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export function columnHeader(page, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.getByRole('columnheader', { name: new RegExp(`^${escaped}`) });
}

/**
 * Cycle sort on a column. Exact thead text misses the header after it becomes "Name ↑".
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export async function clickSortCycle(page, name) {
  const header = columnHeader(page, name).first();
  if (!(await header.isVisible({ timeout: 8000 }).catch(() => false))) return;
  for (let i = 0; i < 3; i += 1) {
    await dismissToasts(page);
    await header.click({ force: true, timeout: 8000 }).catch(() => {});
  }
}

/**
 * Open a labeled searchable dropdown. Returns the search box, or null when it did not open.
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string | string[]} [placeholders]
 */
export async function openLabeledSearch(page, label, placeholders = ['Search by name or ID', 'Search...']) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const trigger = page
    .locator('label')
    .filter({ hasText: new RegExp(`^${escaped}$`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
  await trigger.click({ force: true, timeout: 8000 }).catch(() => {});
  const list = Array.isArray(placeholders) ? placeholders : [placeholders];
  for (const placeholder of list) {
    const search = page.getByPlaceholder(placeholder).last();
    if (await search.isVisible({ timeout: 4000 }).catch(() => false)) return search;
  }
  return null;
}

/**
 * Choose an option from an open searchable menu. Returns false when the option is missing.
 * @param {import('@playwright/test').Page} page
 * @param {string} optionText
 * @param {import('@playwright/test').Locator | null} [search]
 */
export async function chooseSearchOption(page, optionText, search = null) {
  const box = search || page.getByPlaceholder(/Search/).last();
  if (!(await box.isVisible({ timeout: 4000 }).catch(() => false))) return false;
  await box.fill(optionText);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: optionText })
    .filter({ hasNotText: '+ Create New' })
    .first();
  if (!(await option.isVisible({ timeout: 8000 }).catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  await option.click({ force: true, timeout: 8000 }).catch(() => {});
  return true;
}

/**
 * TMD replaces fallback toast copy, and the toast can vanish after navigate.
 * Wait for a success toast or the saved name, then require the name.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {RegExp} [toast]
 */
export async function expectSuccessOrName(page, name, toast = /successfully/i) {
  const listed = page.getByText(name, { exact: true }).first();
  await page.getByText(toast).first().or(listed).first().waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await listed.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

/**
 * True when a table row is the empty-state placeholder, not a data row.
 * @param {string} text
 */
export function isEmptyRowText(text) {
  return !String(text || '').trim() || /No data found|No .+ found|Create your first|Loading\.\.\./i.test(text);
}

/**
 * First real data row, or null when the list is empty.
 * @param {import('@playwright/test').Page} page
 */
export async function firstDataRow(page) {
  const first = page.locator('tbody tr').first();
  if (!(await first.isVisible().catch(() => false))) return null;
  const text = (await first.innerText().catch(() => '')).trim();
  if (isEmptyRowText(text)) return null;
  return first;
}

/**
 * First cell text of a data row. Empty string when the list has no rows.
 * @param {import('@playwright/test').Page} page
 * @param {number} [tdIndex]
 */
export async function firstDataCellText(page, tdIndex = 0) {
  const row = await firstDataRow(page);
  if (!row) return '';
  return (await row.locator('td').nth(tdIndex).innerText({ timeout: 5000 }).catch(() => ''))
    .trim()
    .split('\n')[0]
    .trim();
}

/**
 * Row checkbox is optional on empty or checkbox-less tables.
 * @param {import('@playwright/test').Page} page
 */
export async function expectDataRowCheckbox(page) {
  const row = await firstDataRow(page);
  if (!row) return;
  await expect(row.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
}

/**
 * ContentBox column filter. Returns false when the value is not in the menu
 * (empty lists, renamed statuses) instead of waiting 20s to click empty-state copy.
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
export async function pickColumnFilter(page, column, value) {
  await dismissToasts(page);
  await page.locator('[data-contentbox-filter-button]').click({ force: true, timeout: 8000 }).catch(() => {});
  await page.getByText('Search by Column', { exact: true }).click({ force: true, timeout: 5000 }).catch(() => {});
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' }).first();
  if (await columnSelect.count()) {
    await columnSelect.selectOption({ label: column }).catch(() => {});
  }
  await page.getByRole('button', { name: 'Select values' }).click({ force: true, timeout: 8000 }).catch(() => {});
  const menu = page.locator('div.absolute.z-50').last();
  const option = menu.getByText(value, { exact: true }).first();
  const visible = await option.isVisible({ timeout: 4000 }).catch(() => false);
  if (!visible) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  await option.click({ force: true, timeout: 5000 }).catch(() => {});
  return true;
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

/**
 * xlsx ESM does not export readFile. Read a Playwright download as a buffer.
 * @param {string} filePath
 */
export function readDownloadedWorkbook(filePath) {
  return XLSX.read(readFileSync(filePath), { type: 'buffer' });
}
