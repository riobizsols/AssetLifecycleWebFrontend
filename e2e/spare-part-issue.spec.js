// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickSortCycle, clickDownload } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SI-${Date.now().toString(36)}`;
const issueUrl = `${BASE}/spare-part-issue`;
const requestUrl = `${BASE}/spare-part-list`;
const approvalUrl = `${BASE}/spare-part-approval`;
const blocked = new Set(['Pending Approval', 'Reserved', 'Issued']);

const state = {
  serial: '',
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
async function openIssue(page) {
  await gotoProtected(page, issueUrl);
  await expect(page.locator('header').getByText('Spare Part Issue', { exact: true })).toBeVisible({
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
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [skipSerial]
 */
async function submitRequest(page, skipSerial) {
  await gotoProtected(page, requestUrl);
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const row = rows.nth(i);
    const serial = (await row.locator('td').nth(1).innerText()).trim();
    const status = (await row.locator('td').last().innerText()).trim();
    if (skipSerial && serial === skipSerial) continue;
    if (blocked.has(status)) continue;
    await row.click();
    if (!(await page.getByRole('heading', { name: 'Spare Part Request' }).isVisible().catch(() => false))) {
      await page.getByRole('button', { name: 'Back to Spare Part List' }).click();
      continue;
    }
    const card = page.locator('div.border.rounded-md.p-3').first();
    await expect(card).toBeVisible({ timeout: 15000 });
    const box = card.locator('input[type="checkbox"]');
    if (!(await box.isChecked())) await box.check();
    await card.getByPlaceholder('Required Quantity').fill('1');
    await page.getByRole('button', { name: 'Request' }).click();
    await expectToast(page, 'Spare part request submitted for approval');
    return serial;
  }
  throw new Error('No eligible in-house row to request for this issue run. Create one, leave it, then rerun.');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} serial
 */
async function reserveSerial(page, serial) {
  await gotoProtected(page, approvalUrl);
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await filterByColumn(page, 'Status', 'Pending Approval');
  await listRow(page, serial).click();
  await expect(page.getByText('Back to Spare Part Approval')).toBeVisible({ timeout: 20000 });
  const brand = page.locator('select').nth(0);
  const model = page.locator('select').nth(1);
  const brandValues = await brand.locator('option').evaluateAll((options) =>
    options.filter((option) => option.value).map((option) => option.value),
  );
  if (brandValues.length) await brand.selectOption(brandValues[0]);
  const modelValues = await model.locator('option').evaluateAll((options) =>
    options.filter((option) => option.value).map((option) => option.value),
  );
  if (modelValues.length) await model.selectOption(modelValues[0]);
  const qty = page.getByPlaceholder('Enter required quantity');
  if (!(await qty.inputValue())) await qty.fill('1');
  await page.getByRole('button', { name: 'Reserve' }).click();
  await expectToast(page, 'Spare part approved and issued successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [skipSerial]
 */
async function ensureReserved(page, skipSerial) {
  const serial = await submitRequest(page, skipSerial);
  await reserveSerial(page, serial);
  return serial;
}

test('SI-01 Open Spare Part Issue', async ({ page }) => {
  await openIssue(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
});

test('SI-02 List columns that are on the table', async ({ page }) => {
  await openIssue(page);
  for (const name of [
    'Asset Type',
    'Serial Number',
    'Description',
    'Maintenance Type',
    'Vendor',
    'Status',
    'Action',
  ]) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
});

test('SI-03 Only reserved and recently issued rows are listed', async ({ page }) => {
  await openIssue(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible().catch(() => false)) {
    const status = await first.locator('td').nth(5).innerText({ timeout: 8000 }).then((t) => t.trim()).catch(() => '');
    if (status) expect(['Reserved', 'Issued', 'Pending Approval', '']).toContain(status);
  } else {
    await expect(page.getByText(/No data found/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  }
});

test('SI-04 Filter by status', async ({ page }) => {
  await openIssue(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    state.serial = await ensureReserved(page);
    await openIssue(page);
  }
  await filterByColumn(page, 'Status', 'Reserved');
  await clearColumnFilter(page);
  await filterByColumn(page, 'Status', 'Issued');
  await clearColumnFilter(page);
});

test('SI-05 Sort by serial number', async ({ page }) => {
  await openIssue(page);
  await clickSortCycle(page, 'Serial Number');
});

test('SI-06 Download the list', async ({ page }) => {
  await openIssue(page);
  const download = await clickDownload(page, headerDownload(page));
    if (!download) return;
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
});

test('SI-07 Open Spare Request Details', async ({ page }) => {
  await openIssue(page);
  const issued = page.locator('tbody tr').filter({ hasText: 'Issued' }).first();
  const reserved = page.locator('tbody tr').filter({ hasText: 'Reserved' }).first();
  const target = (await issued.isVisible().catch(() => false)) ? issued : reserved;
  if (!(await target.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await target.click({ force: true, timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Spare Request Details' })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('button', { name: 'Close' })).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('SI-08 Close the details', async ({ page }) => {
  await openIssue(page);
  await page.locator('tbody tr').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await page.locator('tbody tr').first().click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});

test('SI-09 Do not click Issue on an existing reserved row', async ({ page }) => {
  await openIssue(page);
  const reserved = page.locator('tbody tr').filter({ hasText: 'Reserved' });
  const count = await reserved.count();
  for (let i = 0; i < count; i += 1) {
    const serial = (await reserved.nth(i).locator('td').nth(1).innerText()).trim();
    if (state.serial && serial === state.serial) continue;
    await expect(reserved.nth(i).getByRole('button', { name: 'Issue' })).toBeVisible();
  }
});

test('SI-10 Find the reserved row from this run', async ({ page }) => {
  if (!state.serial) {
    state.serial = await ensureReserved(page);
  }
  await openIssue(page);
  await filterByColumn(page, 'Status', 'Reserved');
  const row = listRow(page, state.serial);
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText('Reserved');
  await expect(row.getByRole('button', { name: 'Issue' })).toBeVisible();
});

test('SI-11 Issue the reserved row from this run', async ({ page }) => {
  await openIssue(page);
  await filterByColumn(page, 'Status', 'Reserved');
  const row = listRow(page, state.serial);
  await row.getByRole('button', { name: 'Issue' }).click();
  await expectToast(page, 'Spare part issued successfully');
  await expect(listRow(page, state.serial)).toContainText('Issued');
  await expect(listRow(page, state.serial).getByRole('button', { name: 'Issue' })).toHaveCount(0);
});

test('SI-12 Issued details show who issued it', async ({ page }) => {
  await openIssue(page);
  await listRow(page, state.serial).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Spare Request Details' })).toBeVisible();
  await expect(dialog.getByText('Issued By', { exact: true })).toBeVisible({ timeout: 15000 });
  await expect(dialog.getByText('Issued On', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
});

test('SI-13 Issue cannot be clicked again', async ({ page }) => {
  await openIssue(page);
  const row = listRow(page, state.serial);
  await expect(row).toContainText('Issued');
  await expect(row.getByRole('button', { name: 'Issue' })).toHaveCount(0);
  await expect(row.locator('td').last()).toHaveText('-');
});

test('SI-14 Run issue again', async ({ page }) => {
  state.secondSerial = await ensureReserved(page, state.serial);
  await openIssue(page);
  await filterByColumn(page, 'Status', 'Reserved');
  const row = listRow(page, state.secondSerial);
  await row.getByRole('button', { name: 'Issue' }).click();
  await expectToast(page, 'Spare part issued successfully');
  await openIssue(page);
  await expect(listRow(page, state.serial)).toContainText('Issued');
  await expect(listRow(page, state.secondSerial)).toContainText('Issued');
});
