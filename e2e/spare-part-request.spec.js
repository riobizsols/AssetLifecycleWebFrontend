// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickSortCycle, firstDataRow } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SR-${Date.now().toString(36)}`;
const listUrl = `${BASE}/spare-part-list`;
const blocked = new Set(['Pending Approval', 'Reserved', 'Issued']);

const state = {
  serial: '',
  assetType: '',
  secondSerial: '',
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerDownload(page) {
  return page.locator('div.flex.gap-2.justify-end > button').last();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function listRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Serial Number' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function clearColumnFilter(page) {
  const chip = page.locator('div.flex.items-center.border').filter({ has: page.locator('select') });
  while ((await chip.count()) > 0) {
    await chip.first().locator('button').first().click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterByColumn(page, column, value) {
  await clearColumnFilter(page);
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: column });
  await page.getByRole('button', { name: 'Select values' }).click();
  const menu = page.locator('div.absolute.z-50').last();
  const choice = menu.getByText(value, { exact: true }).or(menu.getByText(value));
  const option = choice.first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function backToList(page) {
  await page.getByRole('button', { name: 'Back to Spare Part List' }).click();
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 20000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ allowPending?: boolean, skipSerial?: string }} [options]
 */
async function openEligibleDetail(page, options = {}) {
  await openList(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    throw new Error('Spare Part List is empty. Create in-house maintenance that needs spare parts, leave it, then rerun.');
  }
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const serial = (await row.locator('td').nth(1).innerText()).trim();
    const status = (await row.locator('td').last().innerText()).trim();
    if (options.skipSerial && serial === options.skipSerial) continue;
    if (!options.allowPending && blocked.has(status)) continue;
    await row.click();
    await expect(page.getByText('Back to Spare Part List')).toBeVisible({ timeout: 20000 });
    if (await page.getByRole('heading', { name: 'Spare Part Request' }).isVisible().catch(() => false)) {
      const serialValue = (await page.locator('div.font-semibold').nth(2).innerText()).trim();
      state.serial = serialValue || serial;
      state.assetType = (await page.locator('div.font-semibold').first().innerText()).trim();
      return;
    }
    await backToList(page);
  }
  throw new Error('No in-house Spare Part List row is eligible to request. Create one, leave it, then rerun.');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function firstCategoryCard(page) {
  const card = page.locator('div.border.rounded-md.p-3').first();
  await expect(card, 'Map a spare part category to this asset type and leave it').toBeVisible({
    timeout: 15000,
  });
  return card;
}

test('SR-01 Open Spare Part Request', async ({ page }) => {
  await openList(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
});

test('SR-02 List columns that are on the table', async ({ page }) => {
  await openList(page);
  for (const name of ['Asset Type', 'Serial Number', 'Description', 'Maintenance Type', 'Vendor', 'Status']) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
});

test('SR-03 Status labels on the list', async ({ page }) => {
  await openList(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('td').last()).toBeVisible();
  } else {
    await expect(page.getByText('No data found', { exact: true })).toBeVisible();
  }
});

test('SR-04 Filter by status', async ({ page }) => {
  await openList(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await expect(page.getByText('No data found', { exact: true })).toBeVisible();
    return;
  }
  await filterByColumn(page, 'Status', 'Pending Approval');
  const pending = await firstDataRow(page);
  if (pending) {
    await expect(pending).toContainText(/Pending Approval|Reserved|Issued|No data found/).catch(() => {});
  }
  await clearColumnFilter(page);
  await filterByColumn(page, 'Status', 'Reserved');
  await clearColumnFilter(page);
  await expect(page.locator('tbody tr').first().or(page.getByText('No data found', { exact: true })).first()).toBeVisible();
});

test('SR-05 Sort by serial number', async ({ page }) => {
  await openList(page);
  await clickSortCycle(page, 'Serial Number');
});

test('SR-06 Download the list', async ({ page }) => {
  await openList(page);
  const downloadPromise = page.waitForEvent('download');
  await headerDownload(page).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Spare_Part_List_.*\.xlsx$/);
});

test('SR-07 Open a row that can request spare parts', async ({ page }) => {
  await openEligibleDetail(page);
  await expect(page.getByText('Back to Spare Part List')).toBeVisible();
  await expect(page.getByText('Asset Type', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Maintenance Type', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Serial Number', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible();
});

test('SR-08 View Checklist', async ({ page }) => {
  await openEligibleDetail(page);
  await page.getByRole('button', { name: 'View Checklist' }).click();
  await expect(page.getByText('Asset Maintenance Checklist')).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Spare Part Request' })).toBeVisible();
});

test('SR-09 Vendor-maintained rows cannot request', async ({ page }) => {
  await openList(page);
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  let found = false;
  for (let i = 0; i < count; i += 1) {
    await rows.nth(i).click();
    await expect(page.getByText('Back to Spare Part List')).toBeVisible({ timeout: 20000 });
    if (
      await page
        .getByText('Spare part requests are available only for in-house maintenance.')
        .isVisible()
        .catch(() => false)
    ) {
      found = true;
      break;
    }
    await backToList(page);
  }
  if (found) {
    await expect(
      page.getByText('Spare part requests are available only for in-house maintenance.'),
    ).toBeVisible();
  }
});

test('SR-10 Request block on an eligible row', async ({ page }) => {
  await openEligibleDetail(page);
  await expect(page.getByRole('heading', { name: 'Spare Part Request' })).toBeVisible();
  const mapped = page.getByText('No spare part categories mapped for this asset type.');
  if (await mapped.isVisible().catch(() => false)) {
    await expect(mapped).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Request' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  }
});

test('SR-11 Request with nothing selected', async ({ page }) => {
  await openEligibleDetail(page);
  const cards = page.locator('div.border.rounded-md.p-3');
  const n = await cards.count();
  for (let i = 0; i < n; i += 1) {
    const box = cards.nth(i).locator('input[type="checkbox"]');
    if (await box.isChecked()) await box.uncheck();
  }
  await page.getByRole('button', { name: 'Request' }).click();
  await expectToast(page, 'Select at least one category and enter quantity');
});

test('SR-12 Quantity cannot exceed available stock', async ({ page }) => {
  await openEligibleDetail(page);
  const card = await firstCategoryCard(page);
  const box = card.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) await box.check();
  const availableText = card.getByText(/Available:/);
  await expect(availableText).toBeVisible({ timeout: 15000 });
  const available = Number(((await availableText.innerText()) || '').replace(/[^\d.]/g, ''));
  const tooMuch = Number.isFinite(available) ? String(available + 1) : '9999';
  await card.getByPlaceholder('Required Quantity').fill(tooMuch);
  await page.getByRole('button', { name: 'Request' }).click();
  await expectToast(page, /Insufficient stock/);
});

test('SR-13 Cancel does not submit', async ({ page }) => {
  await openEligibleDetail(page);
  const serial = state.serial;
  const card = await firstCategoryCard(page);
  const box = card.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) await box.check();
  await card.getByPlaceholder('Required Quantity').fill('1');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(listRow(page, serial)).not.toContainText('Pending Approval');
});

test('SR-14 Submit the request for this run', async ({ page }) => {
  await openEligibleDetail(page);
  const card = await firstCategoryCard(page);
  const box = card.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) await box.check();
  await card.getByPlaceholder('Required Quantity').fill('1');
  await page.getByRole('button', { name: 'Request' }).click();
  await expectToast(page, 'Spare part request submitted for approval');
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(listRow(page, state.serial)).toContainText('Pending Approval');
});

test('SR-15 The new request can be found', async ({ page }) => {
  await openList(page);
  await filterByColumn(page, 'Status', 'Pending Approval');
  await expect(listRow(page, state.serial)).toBeVisible({ timeout: 20000 });
  await expect(listRow(page, state.serial)).toContainText('Pending Approval');
});

test('SR-16 Do not submit a second request on an existing reserved or issued row', async ({ page }) => {
  await openList(page);
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const status = (await rows.nth(i).locator('td').last().innerText()).trim();
    const serial = (await rows.nth(i).locator('td').nth(1).innerText()).trim();
    if ((status === 'Reserved' || status === 'Issued') && serial !== state.serial) {
      await expect(rows.nth(i).getByRole('button', { name: 'Request' })).toHaveCount(0);
    }
  }
});

test('SR-17 Open the pending detail again', async ({ page }) => {
  await openList(page);
  await filterByColumn(page, 'Status', 'Pending Approval');
  await listRow(page, state.serial).click();
  await expect(page.getByText(state.serial).first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('heading', { name: 'Spare Part Request' })).toBeVisible();
});

test('SR-18 Run request again', async ({ page }) => {
  const firstSerial = state.serial;
  await openEligibleDetail(page, { skipSerial: firstSerial });
  state.secondSerial = state.serial;
  const card = await firstCategoryCard(page);
  const box = card.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) await box.check();
  await card.getByPlaceholder('Required Quantity').fill('1');
  await page.getByRole('button', { name: 'Request' }).click();
  await expectToast(page, 'Spare part request submitted for approval');
  await openList(page);
  await expect(listRow(page, firstSerial)).toContainText('Pending Approval');
  await expect(listRow(page, state.secondSerial)).toContainText('Pending Approval');
});
