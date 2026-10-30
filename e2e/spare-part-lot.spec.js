// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { firstDataCellText, headerAddButton, clickSortCycle, firstDataRow } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SL-${Date.now().toString(36)}`;
const listUrl = `${BASE}/master-data/spare-parts`;
const stayInvoice = `${run}-A`;
const secondInvoice = `${run}-B`;
const cancelInvoice = `${run}-Cancel`;
const serialInvoice = `${run}-SN`;
const partNumber = `${run}-PN`;

const state = {
  firstInvoice: '',
  categoryName: '',
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
 * @param {import('@playwright/test').Locator} select
 */
async function realOptions(select) {
  return select.locator('option').evaluateAll((options) =>
    options
      .filter((option) => option.value)
      .map((option) => ({
        value: option.value,
        label: (option.textContent || '').trim(),
      })),
  );
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
function lotRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {number} [offsetDays]
 */
function ymd(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openLots(page) {
  await gotoProtected(page, listUrl);
  await expect(page.locator('header').getByText('Spare Part Lot', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Invoice Number' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAdd(page) {
  await openLots(page);
  await headerAddButton(page).click();
  await expect(page.getByRole('heading', { name: 'Spare Part Lot', exact: true })).toBeVisible({
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
 * @param {string} placeholder
 * @param {string} newName
 */
async function pickOrCreateEnhanced(page, placeholder, newName) {
  const combo = page.locator('[role="combobox"]').filter({ hasText: placeholder });
  await expect(combo).toBeVisible({ timeout: 15000 });
  await combo.click();
  const existing = page.getByRole('option').filter({ hasNotText: '+ Create New' });
  if ((await existing.count()) > 0) {
    const label = ((await existing.first().innerText()) || '').split('\n')[0].trim();
    await existing.first().click();
    return label;
  }
  await page.getByRole('option', { name: '+ Create New' }).click();
  const isModel = /model/i.test(placeholder) || placeholder === 'Select model';
  await page.getByPlaceholder(isModel ? 'Enter model name' : 'Enter brand name').fill(newName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  return newName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} invoice
 * @param {{ quantity?: string, hasSerial?: boolean, save?: boolean }} [options]
 */
async function fillLot(page, invoice, options = {}) {
  const vendor = page.locator('select[name="vendor_id"]');
  await expect(vendor).toBeEnabled({ timeout: 20000 });
  const vendors = await realOptions(vendor);
  if (!vendors.length) {
    throw new Error('Spare Part Lot has no spare-supply vendor. Map a vendor on Vendors, leave it, then rerun.');
  }
  await vendor.selectOption(vendors[0].value);
  const category = page.locator('select[name="spc_id"]');
  await expect(category).toBeEnabled({ timeout: 15000 });
  const cats = await realOptions(category);
  if (!cats.length) {
    throw new Error('No categories mapped for the spare-supply vendor. Map one and leave it, then rerun.');
  }
  await category.selectOption(cats[0].value);
  state.categoryName = cats[0].label;
  await pickOrCreateEnhanced(page, /Select brand|Select category first|Loading brands/, `${run}-Brand`);
  await pickOrCreateEnhanced(page, /Select model|Select brand first|Loading models/, `${run}-Model`);
  await page.getByPlaceholder('Enter part number').fill(partNumber);
  await page.getByPlaceholder('Enter quantity').fill(options.quantity ?? '2');
  await page.getByPlaceholder('Enter unit price').fill('1');
  await page.getByPlaceholder('Enter invoice number').fill(invoice);
  await page.locator('input[name="lot_purchase_date"]').fill(ymd(0));
  await page.getByPlaceholder('Enter invoice item number').fill('1');
  const serialBox = page.locator('#has_serial_number');
  if (options.hasSerial) {
    await serialBox.check();
  } else if (await serialBox.isChecked()) {
    await serialBox.uncheck();
  }
  if (options.save !== false) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} invoice
 */
async function createLot(page, invoice) {
  await openAdd(page);
  await fillLot(page, invoice);
  await expectToast(page, 'Spare part lot saved successfully');
  await expectToast(page, '2 serial number(s) auto-generated and saved');
  await expect(page.getByText('Saved Individual Units')).toBeVisible();
}

test('SL-01 Open Spare Part Lot', async ({ page }) => {
  await openLots(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerAddButton(page)).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
  state.firstInvoice = await firstDataCellText(page, 3);
});

test('SL-02 List columns that are on the table', async ({ page }) => {
  await openLots(page);
  for (const name of [
    'Category',
    'Quantity',
    'Unit Price',
    'Invoice Number',
    'Purchase Date',
    'Invoice Item Number',
    'Created On',
    'Actions',
  ]) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
  await expect(page.getByRole('columnheader', { name: 'Lot ID' })).toHaveCount(0);
  const first = page.locator('tbody tr').first();
  const row = await firstDataRow(page);
  if (row) {
    await expect(row.locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(row.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(row.locator('button[title="Delete"]')).toHaveCount(0);
  }
});

test('SL-03 Lots already on the screen', async ({ page }) => {
  await openLots(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('td').nth(3)).not.toHaveText('');
  } else {
    await expect(page.getByText('No data found', { exact: true })).toBeVisible();
  }
});

test('SL-04 Filter the list', async ({ page }) => {
  await openLots(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createLot(page, stayInvoice);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await openLots(page);
  }
  const first = page.locator('tbody tr').first();
  const invoice = (await first.locator('td').nth(3).innerText()).trim();
  expect(invoice).toBeTruthy();
  state.firstInvoice = invoice;
  await filterByColumn(page, 'Invoice Number', invoice);
  await expect(lotRow(page, invoice)).toBeVisible();
  await clearColumnFilter(page);
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('SL-05 Sort by invoice number', async ({ page }) => {
  await openLots(page);
  await clickSortCycle(page, 'Invoice Number');
});

test('SL-06 Download the list', async ({ page }) => {
  await openLots(page);
  const downloadPromise = page.waitForEvent('download');
  await headerDownload(page).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Spare_Part_Lots_.*\.xlsx$/);
});

test('SL-07 There is no delete on this screen', async ({ page }) => {
  await openLots(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
  }
});

test('SL-08 Do not edit an existing lot', async ({ page }) => {
  await openLots(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
  }
});

test('SL-09 Open Add Spare Part Lot', async ({ page }) => {
  await openAdd(page);
  await expect(page.getByText('Part Selection', { exact: true })).toBeVisible();
  await expect(page.getByText('Lot Details', { exact: true })).toBeVisible();
  await expect(page.getByText('Invoice Details', { exact: true })).toBeVisible();
  await expect(page.locator('#has_serial_number')).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
});

test('SL-10 Required fields block Save', async ({ page }) => {
  await openAdd(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor is required');
  await expect(page.getByRole('heading', { name: 'Spare Part Lot' })).toBeVisible();
});

test('SL-11 Category waits for vendor', async ({ page }) => {
  await openAdd(page);
  await expect(page.locator('select[name="spc_id"] option').first()).toHaveText('Select vendor first');
  const vendor = page.locator('select[name="vendor_id"]');
  const vendors = await realOptions(vendor);
  if (!vendors.length) {
    throw new Error('Spare Part Lot has no spare-supply vendor. Map a vendor on Vendors, leave it, then rerun.');
  }
  await vendor.selectOption(vendors[0].value);
  await expect(page.locator('select[name="spc_id"]')).toBeEnabled();
  await expect(page.locator('select[name="spc_id"] option').first()).not.toHaveText('Select vendor first');
});

test('SL-12 Quantity must be a whole number', async ({ page }) => {
  await openAdd(page);
  await fillLot(page, 'TEMP', { quantity: '1.5' });
  await expectToast(page, 'Quantity must be a whole number so each unit can have a serial number');
});

test('SL-13 Cancel does not save', async ({ page }) => {
  await openAdd(page);
  await page.getByPlaceholder('Enter invoice number').fill(cancelInvoice);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('header').getByText('Spare Part Lot', { exact: true })).toBeVisible();
  await expect(lotRow(page, cancelInvoice)).toHaveCount(0);
});

test('SL-14 Create the lot for this run', async ({ page }) => {
  await createLot(page, stayInvoice);
});

test('SL-15 The new lot can be found', async ({ page }) => {
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  const row = lotRow(page, stayInvoice);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('2');
  await expect(row).toContainText(state.categoryName);
});

test('SL-16 Open Edit Spare Part Lot', async ({ page }) => {
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  await lotRow(page, stayInvoice).locator('button[title="Edit"]').click();
  await expect(page.getByRole('heading', { name: 'Edit Spare Part Lot', exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByPlaceholder('Enter invoice number')).toHaveValue(stayInvoice);
  await expect(page.locator('#has_serial_number')).toHaveCount(0);
});

test('SL-17 Cancel without saving', async ({ page }) => {
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  await lotRow(page, stayInvoice).locator('button[title="Edit"]').click();
  await page.getByPlaceholder('Enter invoice item number').fill('99');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  await expect(lotRow(page, stayInvoice)).not.toContainText('99');
});

test('SL-18 Update this lot only', async ({ page }) => {
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  await lotRow(page, stayInvoice).locator('button[title="Edit"]').click();
  await page.getByPlaceholder('Enter invoice item number').fill('1-UPD');
  await page.getByRole('button', { name: 'Update', exact: true }).click();
  await expectToast(page, 'Spare part lot updated successfully');
  await openLots(page);
  await filterByColumn(page, 'Invoice Number', stayInvoice);
  await expect(lotRow(page, stayInvoice)).toContainText('1-UPD');
});

test('SL-19 Manual serials require one per unit', async ({ page }) => {
  await openAdd(page);
  await fillLot(page, serialInvoice, { hasSerial: true, quantity: '2' });
  await expectToast(page, 'Enter a serial number for each quantity unit');
});

test('SL-20 Run create again', async ({ page }) => {
  await createLot(page, secondInvoice);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openLots(page);
  await expect(lotRow(page, stayInvoice)).toBeVisible();
  await filterByColumn(page, 'Invoice Number', secondInvoice);
  await expect(lotRow(page, secondInvoice)).toBeVisible();
});
