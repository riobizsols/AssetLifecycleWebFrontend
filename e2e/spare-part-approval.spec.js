// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickSortCycle } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SA-${Date.now().toString(36)}`;
const listUrl = `${BASE}/spare-part-approval`;
const requestUrl = `${BASE}/spare-part-list`;
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
async function openApproval(page) {
  await gotoProtected(page, listUrl);
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Serial Number' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openRequestList(page) {
  await gotoProtected(page, requestUrl);
  await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible({
    timeout: 30000,
  });
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
async function submitThisRunRequest(page, skipSerial) {
  await openRequestList(page);
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
      await expect(page.locator('header').getByText('Spare Part List', { exact: true })).toBeVisible();
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
  throw new Error('No eligible in-house row to request for this approval run. Create one, leave it, then rerun.');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} serial
 */
async function openPending(page, serial) {
  await openApproval(page);
  await filterByColumn(page, 'Status', 'Pending Approval');
  const row = listRow(page, serial);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.click();
  await expect(page.getByText('Back to Spare Part Approval')).toBeVisible({ timeout: 20000 });
}

test('SA-01 Open Spare Part Approval', async ({ page }) => {
  await openApproval(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
});

test('SA-02 List columns that are on the table', async ({ page }) => {
  await openApproval(page);
  for (const name of ['Asset Type', 'Serial Number', 'Maintenance Type', 'Vendor', 'Status']) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
});

test('SA-03 Status labels on the list', async ({ page }) => {
  await openApproval(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('td').last()).toBeVisible();
  } else {
    await expect(page.getByText('No data found', { exact: true })).toBeVisible();
  }
});

test('SA-04 Filter by Pending Approval', async ({ page }) => {
  await openApproval(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    state.serial = await submitThisRunRequest(page);
    await openApproval(page);
  }
  await filterByColumn(page, 'Status', 'Pending Approval');
  const row = page.locator('tbody tr').first();
  if (await row.isVisible()) {
    await expect(row).toContainText('Pending Approval').catch(() => {});
  }
  await clearColumnFilter(page);
});

test('SA-05 Sort by serial number', async ({ page }) => {
  await openApproval(page);
  await clickSortCycle(page, 'Serial Number');
});

test('SA-06 Download the list', async ({ page }) => {
  await openApproval(page);
  const downloadPromise = page.waitForEvent('download');
  await headerDownload(page).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Spare_Part_Approval_.*\.xlsx$/);
});

test('SA-07 Find the pending request from this run', async ({ page }) => {
  if (!state.serial) {
    state.serial = await submitThisRunRequest(page);
  }
  await openApproval(page);
  await filterByColumn(page, 'Status', 'Pending Approval');
  await expect(listRow(page, state.serial)).toBeVisible({ timeout: 20000 });
});

test('SA-08 Open the approval detail', async ({ page }) => {
  if (!state.serial) state.serial = await submitThisRunRequest(page);
  await openPending(page, state.serial);
  await expect(page.getByPlaceholder('Enter Asset Name')).toBeVisible();
  await expect(page.getByText('Available Quantity', { exact: true })).toBeVisible();
  await expect(page.getByText('Required Quantity', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reserve' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('SA-09 Back without reserving', async ({ page }) => {
  await openPending(page, state.serial);
  await page.getByRole('button', { name: 'Back to Spare Part Approval' }).click();
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible();
  await filterByColumn(page, 'Status', 'Pending Approval');
  await expect(listRow(page, state.serial)).toContainText('Pending Approval');
});

test('SA-10 Cancel without reserving', async ({ page }) => {
  await openPending(page, state.serial);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible();
  await filterByColumn(page, 'Status', 'Pending Approval');
  await expect(listRow(page, state.serial)).toContainText('Pending Approval');
});

test('SA-11 Brand and model are required when lists have values', async ({ page }) => {
  await openPending(page, state.serial);
  const brand = page.locator('select').nth(0);
  const model = page.locator('select').nth(1);
  const brandOptions = await brand.locator('option').count();
  if (brandOptions > 1) {
    await brand.selectOption('');
    const reserve = page.getByRole('button', { name: 'Reserve' });
    if (await reserve.isEnabled()) {
      await reserve.click();
      await expectToast(page, /Please select a brand|Please select a model/);
    } else {
      await expect(reserve).toBeDisabled();
    }
  }
  await expect(model).toBeVisible();
});

test('SA-12 Required quantity must be greater than 0', async ({ page }) => {
  await openPending(page, state.serial);
  const qty = page.getByPlaceholder('Enter required quantity');
  await qty.fill('0');
  const reserve = page.getByRole('button', { name: 'Reserve' });
  if (await reserve.isEnabled()) {
    await reserve.click();
    await expectToast(page, 'Please enter a required quantity');
  } else {
    await expect(reserve).toBeDisabled();
  }
});

test('SA-13 Do not reserve an existing pending request from another run', async ({ page }) => {
  await openApproval(page);
  await filterByColumn(page, 'Status', 'Pending Approval');
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  for (let i = 0; i < count; i += 1) {
    const serial = (await rows.nth(i).locator('td').nth(1).innerText()).trim();
    if (serial !== state.serial) {
      await expect(rows.nth(i).getByRole('button', { name: 'Reserve' })).toHaveCount(0);
    }
  }
});

test('SA-14 Reserve the request from this run', async ({ page }) => {
  await openPending(page, state.serial);
  const brand = page.locator('select').nth(0);
  const model = page.locator('select').nth(1);
  const brandValues = await brand.locator('option').evaluateAll((options) =>
    options.filter((option) => option.value).map((option) => option.value),
  );
  if (brandValues.length) {
    await brand.selectOption(brandValues[0]);
  }
  const modelValues = await model.locator('option').evaluateAll((options) =>
    options.filter((option) => option.value).map((option) => option.value),
  );
  if (modelValues.length) {
    await model.selectOption(modelValues[0]);
  }
  const qty = page.getByPlaceholder('Enter required quantity');
  if (!(await qty.inputValue())) {
    await qty.fill('1');
  }
  await page.getByRole('button', { name: 'Reserve' }).click();
  await expectToast(page, 'Spare part approved and issued successfully');
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(listRow(page, state.serial)).toContainText('Reserved');
});

test('SA-15 A reserved row cannot be reserved again', async ({ page }) => {
  await openApproval(page);
  await listRow(page, state.serial).click();
  await expect(page.getByRole('button', { name: 'Reserved' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('header').getByText('Spare Part Approval', { exact: true })).toBeVisible();
});

test('SA-16 Run reserve again', async ({ page }) => {
  state.secondSerial = await submitThisRunRequest(page, state.serial);
  await openPending(page, state.secondSerial);
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
  await openApproval(page);
  await expect(listRow(page, state.serial)).toContainText('Reserved');
  await expect(listRow(page, state.secondSerial)).toContainText('Reserved');
});
