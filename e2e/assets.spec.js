// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';
import { selectPortalDropdown } from './helpers/searchableDropdown.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-AS-${Date.now().toString(36)}`;
const stamp = run.slice('PW-AS-'.length);
const assetsUrl = `${BASE}/assets`;

const stayName = `${run} Stay`;
const stayUpdated = `${stayName} Updated`;
const cancelName = `${run} Cancel`;
const disposableName = `${run} Del`;
const extraDisposableName = `${run} Del2`;
const inUseName = `${run} InUse`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;

const state = {
  firstName: '',
  typeName: '',
  vendorName: '',
  mastersReady: false,
};

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
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await expect(toast).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerButtons(page) {
  return page.locator('div.flex.gap-2.justify-end > button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerTrash(page) {
  return headerButtons(page).nth(1);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerDownload(page) {
  return headerButtons(page).last();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function assetsRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAssets(page) {
  await gotoProtected(page, assetsUrl);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Asset Name' }).or(page.getByText('No data found', { exact: true })),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddAsset(page) {
  await openAssets(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/assets\/add/);
  await expect(page.locator('header').getByText('Add Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Asset Details', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Locator} root
 * @param {string} label
 */
function labeledButton(root, label) {
  return root
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
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
  await menu.getByText(value, { exact: true }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function showCreated(page, name) {
  await openAssets(page);
  await filterByColumn(page, 'Asset Type', state.typeName);
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureParentAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: typeName });
  if (await existing.count()) {
    state.typeName = typeName;
    return;
  }

  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName);
  await page.getByText('Department-wise', { exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state.typeName = typeName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureVendor(page) {
  if (state.vendorName) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: vendorName });
  if (await existing.count()) {
    state.vendorName = vendorName;
    return;
  }

  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Vendor', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter vendor name').fill(vendorName);
  await page.getByPlaceholder('Enter company name').fill(`${run} Co`);
  await page.getByPlaceholder('Enter company email').fill(`pw.as.${stamp}@test.com`);
  await page.getByPlaceholder('Enter contact person name').fill(`${run} Contact`);
  await page.getByPlaceholder('Enter contact number').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click();
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({ timeout: 30000 });
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMasters(page) {
  if (state.mastersReady) return;
  await ensureParentAssetType(page);
  await ensureVendor(page);
  state.mastersReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} preferredName
 */
async function selectParentTypeOnForm(page, preferredName) {
  const trigger = labeledButton(page, 'Asset Type');
  await trigger.click();
  const search = page.getByPlaceholder('Search by name or ID');
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New Asset Type' })
    .first();
  await expect(option, `Parent asset type ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} preferredName
 */
async function selectProductVendorOnForm(page, preferredName) {
  const vendorHeader = page.getByRole('button', { name: 'Vendor Details' });
  await vendorHeader.click();
  const trigger = labeledButton(page, 'Product Vendor');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const search = page.getByPlaceholder('Search...');
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New' })
    .first();
  await expect(option, `Purchase vendor ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {{ purchaseDate?: string, expiryDate?: string, save?: boolean }} [options]
 */
async function fillAssetForm(page, name, options = {}) {
  const purchaseDate = options.purchaseDate ?? ymd(-7);
  const expiryDate = options.expiryDate ?? ymd(365);
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await expect(page.getByText('This asset will be created without a serial number.')).toBeVisible();
  await page.locator('textarea[name="description"]').fill(name);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(purchaseDate);
  await page.locator('input[name="expiryDate"]').fill(expiryDate);
  await page.locator('input[name="purchaseCost"]').fill('1');
  await selectProductVendorOnForm(page, state.vendorName);
  if (options.save !== false) {
    await page.getByRole('button', { name: 'Save', exact: true }).click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createAsset(page, name) {
  await ensureMasters(page);
  await openAddAsset(page);
  await fillAssetForm(page, name);
  await expectToast(page, 'Asset created successfully!');
  await expect(page).toHaveURL(/\/assets$/);
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function headerDeleteRow(page, name) {
  await showCreated(page, name);
  const row = assetsRow(page, name);
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, '1 asset(s) deleted successfully');
  await expect(row).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function assignAssetToDepartment(page, name) {
  await gotoProtected(page, `${BASE}/assign-department-assets`);
  await expect(page.locator('header').getByText('Department Assignment', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const branch = page
    .locator('label')
    .filter({ hasText: /^Branch$/ })
    .locator('xpath=..')
    .getByRole('button');
  if (/Select/i.test((await branch.innerText()).trim())) {
    await selectPortalDropdown(page, 'Branch');
  }
  const dept = page
    .locator('label')
    .filter({ hasText: /^Department$/ })
    .locator('xpath=..')
    .getByRole('button');
  if (/Select/i.test((await dept.innerText()).trim())) {
    await selectPortalDropdown(page, 'Department');
  }
  await expect(page.getByRole('button', { name: 'Assign Asset' })).toBeEnabled();
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible({ timeout: 20000 });
  await selectPortalDropdown(page, 'Asset Type', { optionText: state.typeName });
  const row = page.locator('div.grid').filter({ hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Assign Asset' }).click();
  await expectToast(page, 'Asset assigned to department successfully');
}

test('AS-01 Open Assets', async ({ page }) => {
  await openAssets(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerAddButton(page)).toBeVisible();
  await expect(headerTrash(page)).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    state.firstName = (await first.locator('td').nth(2).innerText()).trim();
  }
});

test('AS-02 List columns that are on the table', async ({ page }) => {
  await openAssets(page);
  const headers = [
    'Asset Type',
    'Serial Number',
    'Asset Name',
    'Current Status',
    'Purchase Cost',
    'Purchase Date',
    'Purchase By',
    'Expiry Date',
    'Warranty Period',
    'Group Name',
    'Actions',
  ];
  for (const name of headers) {
    await expect(page.getByRole('columnheader', { name })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'Asset ID' })).toHaveCount(0);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('input[type="checkbox"]')).toBeVisible();
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
  }
});

test('AS-03 Assets already on the screen', async ({ page }) => {
  await openAssets(page);
  const first = page.locator('tbody tr').first();
  const empty = page.getByText('No data found', { exact: true });
  if (await first.isVisible()) {
    await expect(first.locator('td').nth(2)).not.toHaveText('');
    state.firstName = (await first.locator('td').nth(2).innerText()).trim();
  } else {
    await expect(empty).toBeVisible();
  }
});

test('AS-04 Filter the list', async ({ page }) => {
  await openAssets(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createAsset(page, `${run} Seed`);
    await openAssets(page);
  }
  const first = page.locator('tbody tr').first();
  const name = (await first.locator('td').nth(2).innerText()).trim();
  expect(name).toBeTruthy();
  state.firstName = name;
  await filterByColumn(page, 'Asset Name', name);
  await expect(assetsRow(page, name)).toBeVisible();
  await clearColumnFilter(page);
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('AS-05 Sort by asset name', async ({ page }) => {
  await openAssets(page);
  const header = page.locator('thead').getByText('Asset Name', { exact: true });
  await header.click();
  await expect(page.getByRole('columnheader', { name: /Asset Name/ })).toContainText('↑');
  await header.click();
  await expect(page.getByRole('columnheader', { name: /Asset Name/ })).toContainText('↓');
  await header.click();
  await expect(page.getByRole('columnheader', { name: /Asset Name/ })).not.toContainText('↑');
  await expect(page.getByRole('columnheader', { name: /Asset Name/ })).not.toContainText('↓');
});

test('AS-06 Download with nothing selected', async ({ page }) => {
  await openAssets(page);
  await headerDownload(page).click();
  await expectToast(page, 'Please select assets to download');
});

test('AS-07 Download one selected row', async ({ page }) => {
  await openAssets(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createAsset(page, `${run} Seed`);
    await openAssets(page);
  }
  await page.locator('tbody tr').first().locator('input[type="checkbox"]').check();
  const downloadPromise = page.waitForEvent('download');
  await headerDownload(page).click();
  await expectToast(page, 'Assets exported successfully');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^Assets_List_.*\.xlsx$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const workbook = XLSX.readFile(/** @type {string} */ (filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] || []).map((cell) => String(cell));
  expect(headers).toContain('Asset Name');
  expect(headers).not.toContain('Asset ID');
  expect(headers.some((h) => /_id$/i.test(h))).toBeFalsy();
});

test('AS-08 Delete with nothing selected', async ({ page }) => {
  await openAssets(page);
  await headerTrash(page).click();
  await expectToast(page, 'Please select items to delete');
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
});

test('AS-09 Cancel header delete', async ({ page }) => {
  await openAssets(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createAsset(page, `${run} Seed`);
    await openAssets(page);
  }
  const row = page.locator('tbody tr').first();
  const name = (await row.locator('td').nth(2).innerText()).trim();
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(assetsRow(page, name)).toBeVisible();
});

test('AS-10 Do not use the row delete icon on an existing asset', async ({ page }) => {
  await openAssets(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
  }
});

test('AS-11 Open Add Asset', async ({ page }) => {
  await openAddAsset(page);
  await expect(page.getByRole('button', { name: 'Configuration' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Attachments' })).toBeVisible();
  await expect(page.getByText('Asset Details', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
});

test('AS-12 Required fields block Save', async ({ page }) => {
  await openAddAsset(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Please fill all required fields');
  await expect(page).toHaveURL(/\/assets\/add/);
});

test('AS-13 Expiry cannot match purchase date', async ({ page }) => {
  await ensureMasters(page);
  await openAddAsset(page);
  const sameDay = ymd(-1);
  await fillAssetForm(page, `${run} SameDay`, {
    purchaseDate: sameDay,
    expiryDate: sameDay,
    save: true,
  });
  await expectToast(page, 'Expiry date cannot be the same as purchase date');
  await expect(page).toHaveURL(/\/assets\/add/);
});

test('AS-14 Cancel does not save', async ({ page }) => {
  await ensureMasters(page);
  await openAddAsset(page);
  await page.locator('textarea[name="description"]').fill(cancelName);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/assets$/);
  await expect(assetsRow(page, cancelName)).toHaveCount(0);
});

test('AS-15 Create the asset for this run', async ({ page }) => {
  await createAsset(page, stayName);
  await expect(assetsRow(page, stayName)).toBeVisible();
});

test('AS-16 The new asset can be found', async ({ page }) => {
  await showCreated(page, stayName);
  const row = assetsRow(page, stayName);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(state.typeName);
  await expect(row).toContainText('Active');
});

test('AS-17 Open Edit Asset', async ({ page }) => {
  await showCreated(page, stayName);
  await assetsRow(page, stayName).locator('button[title="Edit"]').click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await expect(dialog.getByText('Edit Asset', { exact: true })).toBeVisible();
  await expect(dialog.getByText('(Read Only)')).toBeVisible();
  await expect(dialog.getByPlaceholder('Enter description')).toHaveValue(stayName);
});

test('AS-18 Close without saving', async ({ page }) => {
  await showCreated(page, stayName);
  const row = assetsRow(page, stayName);
  await row.locator('button[title="Edit"]').click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await dialog.getByPlaceholder('Enter description').fill(`${stayName} Temp`);
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await row.locator('button[title="Edit"]').click();
  await expect(dialog.getByPlaceholder('Enter description')).toHaveValue(stayName);
  await page.locator('div.fixed.inset-0').first().click({ position: { x: 4, y: 4 } });
  await expect(dialog).toBeHidden();
  await expect(assetsRow(page, stayName)).toBeVisible();
});

test('AS-19 Rename this asset', async ({ page }) => {
  await showCreated(page, stayName);
  await assetsRow(page, stayName).locator('button[title="Edit"]').click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await dialog.getByPlaceholder('Enter description').fill(stayUpdated);
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset updated successfully');
  await expect(dialog).toBeHidden();
  await showCreated(page, stayUpdated);
  await expect(assetsRow(page, stayUpdated)).toBeVisible();
  await expect(assetsRow(page, stayName).filter({ hasNotText: 'Updated' })).toHaveCount(0);
});

test('AS-20 Cancel delete of this asset', async ({ page }) => {
  await showCreated(page, stayUpdated);
  const row = assetsRow(page, stayUpdated);
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
});

test('AS-21 An asset that is in use cannot be deleted', async ({ page }) => {
  await createAsset(page, inUseName);
  await assignAssetToDepartment(page, inUseName);
  await showCreated(page, inUseName);
  const row = assetsRow(page, inUseName);
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(
    page.getByText(/cannot be deleted|currently assigned|unassign them first/i).first(),
  ).toBeVisible({ timeout: 20000 });
  await expect(row).toBeVisible();
});

test('AS-22 Delete the asset from this run', async ({ page }) => {
  await createAsset(page, disposableName);
  await headerDeleteRow(page, disposableName);
  await showCreated(page, stayUpdated);
});

test('AS-23 Run create and delete again', async ({ page }) => {
  await createAsset(page, extraDisposableName);
  await headerDeleteRow(page, extraDisposableName);
  await showCreated(page, stayUpdated);
  await expect(assetsRow(page, extraDisposableName)).toHaveCount(0);
});
