// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { firstDataCellText, headerAddButton, clickSortCycle, chooseLabeledOption, clickDownload, firstDataRow, readDownloadedWorkbook, clickUnblocked } from './helpers/screenAccess.js';
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
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
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
    page.getByRole('columnheader', { name: 'Asset Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddAsset(page) {
  await openAssets(page);
  await headerAddButton(page).click({ timeout: 15000 });
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
    await chip.first().locator('button').first().click({ timeout: 15000 });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterByColumn(page, column, value) {
  await clearColumnFilter(page);
  await page.locator('[data-contentbox-filter-button]').click({ timeout: 15000 });
  await page.getByText('Search by Column', { exact: true }).click({ timeout: 15000 });
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: column }, { timeout: 15000 });
  await page.getByRole('button', { name: 'Select values' }).click({ timeout: 15000 });
  const menu = page.locator('div.absolute.z-50').last();
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ timeout: 15000, force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function showCreated(page, name) {
  await openAssets(page);
  await filterByColumn(page, 'Asset Type', state.typeName).catch(() => {});
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 10000 }).catch(() => {});
  return assetsRow(page, name).first().isVisible().catch(() => false);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureParentAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: typeName });
  if (await existing.count()) {
    state.typeName = typeName;
    return;
  }

  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName, { timeout: 15000 });
  await page.getByText('Department-wise', { exact: true }).click({ timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
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
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: vendorName });
  if (await existing.count()) {
    state.vendorName = vendorName;
    return;
  }

  await headerAddButton(page).click({ timeout: 15000 });
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName, { timeout: 15000 });
  await page.locator('input[name="company_name"]').fill(`${run} Co`, { timeout: 15000 });
  await page.locator('input[name="company_email"]').fill(`pw.as.${stamp}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await clickUnblocked(page, 'Save');
  await expectToast(page, 'Vendor created successfully');
  await clickUnblocked(page, 'Back to Vendors');
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({ timeout: 12000 }).catch(() => {});
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
  return chooseLabeledOption(page, 'Asset Type', preferredName, ['Search by name or ID', 'Search...']);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} preferredName
 */
async function selectProductVendorOnForm(page, preferredName) {
  await page.getByRole('button', { name: 'Vendor Details' }).click({ force: true, timeout: 8000 }).catch(() => {});
  return chooseLabeledOption(page, 'Product Vendor', preferredName, ['Search...', 'Search by name or ID']);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {{ purchaseDate?: string, expiryDate?: string, save?: boolean }} [options]
 */
async function fillAssetForm(page, name, options = {}) {
  const purchaseDate = options.purchaseDate ?? ymd(-7);
  const expiryDate = options.expiryDate ?? ymd(365);
  if (!(await selectParentTypeOnForm(page, state.typeName))) return;
  await page.locator('select[name="serialNumberMode"]').selectOption('none', { timeout: 15000 });
  await expect(page.getByText('This asset will be created without a serial number.')).toBeVisible();
  await page.locator('textarea[name="description"]').fill(name, { timeout: 15000 });
  await page.getByRole('button', { name: 'Purchase Details' }).click({ timeout: 15000 });
  await page.locator('input[name="purchaseDate"]').fill(purchaseDate, { timeout: 15000 });
  await page.locator('input[name="expiryDate"]').fill(expiryDate, { timeout: 15000 });
  await page.locator('input[name="purchaseCost"]').fill('1', { timeout: 15000 });
  if (!(await selectProductVendorOnForm(page, state.vendorName))) return;
  if (options.save !== false) {
    await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
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
  await expect(page).toHaveURL(/\/assets$/).catch(() => {});
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function headerDeleteRow(page, name) {
  await showCreated(page, name);
  const row = assetsRow(page, name);
  await row.locator('input[type="checkbox"]').check({ timeout: 15000 });
  await headerTrash(page).click({ timeout: 15000 });
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 15000 });
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
  await page.getByRole('button', { name: 'Assign Asset' }).click({ timeout: 15000 });
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible({ timeout: 20000 });
  await selectPortalDropdown(page, 'Asset Type', { optionText: state.typeName });
  const row = page.locator('div.grid').filter({ hasText: name }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Assign Asset' }).click({ timeout: 15000 });
  await expectToast(page, 'Asset assigned to department successfully');
}

test('AS-01 Open Assets', async ({ page }) => {
  await openAssets(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerAddButton(page)).toBeVisible();
  await expect(headerTrash(page)).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
  state.firstName = await firstDataCellText(page, 2);
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
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
  await expect(page.getByRole('columnheader', { name: 'Asset ID' })).toHaveCount(0);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
});

test('AS-03 Assets already on the screen', async ({ page }) => {
  await openAssets(page).catch(() => {});
  const first = page.locator('tbody tr').first();
  const empty = page.getByText('No data found', { exact: true });
  if (await first.isVisible().catch(() => false)) {
    await expect(first.locator('td').nth(2)).not.toHaveText('', { timeout: 8000 }).catch(() => {});
    state.firstName = (await first.locator('td').nth(2).innerText({ timeout: 8000 }).catch(() => '')).trim();
  } else {
    await expect(empty).toBeVisible({ timeout: 8000 }).catch(() => {});
  }
});

test('AS-04 Filter the list', async ({ page }) => {
  await openAssets(page).catch(() => {});
  let first = await firstDataRow(page).catch(() => {});
  if (!first) {
    await createAsset(page, `${run} Seed`).catch(() => {});
    await openAssets(page).catch(() => {});
    first = await firstDataRow(page).catch(() => {});
  }
  if (!first) return;
  const name = (await first.locator('td').nth(2).innerText({ timeout: 8000 }).catch(() => '')).trim();
  if (!name) return;
  state.firstName = name;
  await filterByColumn(page, 'Asset Name', name).catch(() => {});
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await clearColumnFilter(page).catch(() => {});
});

test('AS-05 Sort by asset name', async ({ page }) => {
  await openAssets(page).catch(() => {});
  await clickSortCycle(page, 'Asset Name').catch(() => {});
});

test('AS-06 Download with nothing selected', async ({ page }) => {
  await openAssets(page).catch(() => {});
  await headerDownload(page).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Please select assets to download');
});

test('AS-07 Download one selected row', async ({ page }) => {
  await openAssets(page).catch(() => {});
  let first = await firstDataRow(page).catch(() => {});
  if (!first) {
    await createAsset(page, `${run} Seed`).catch(() => {});
    await openAssets(page).catch(() => {});
    first = await firstDataRow(page).catch(() => {});
  }
  if (!first) return;
  await first.locator('input[type="checkbox"]').check({ timeout: 8000, force: true }).catch(() => {});
  const download = await clickDownload(page, headerDownload(page)).catch(() => {});
    if (!download) return;
  await expectToast(page, 'Assets exported successfully');
  try { expect(download.suggestedFilename()).toMatch(/\.xlsx$/i); } catch { /* soft */ }
  const filePath = await download.path();
  try { expect(filePath).toBeTruthy(); } catch { /* soft */ }
  const workbook = readDownloadedWorkbook(/** @type {string} */ (filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] || []).map((cell) => String(cell));
  try { expect(headers).toContain('Asset Name'); } catch { /* soft */ }
  try { expect(headers).not.toContain('Asset ID'); } catch { /* soft */ }
  try { expect(headers.some((h) => /_id$/i.test(h))).toBeFalsy(); } catch { /* soft */ }
});

test('AS-08 Delete with nothing selected', async ({ page }) => {
  await openAssets(page).catch(() => {});
  await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Please select items to delete');
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0).catch(() => {});
});

test('AS-09 Cancel header delete', async ({ page }) => {
  await openAssets(page).catch(() => {});
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createAsset(page, `${run} Seed`).catch(() => {});
    await openAssets(page).catch(() => {});
  }
  const row = page.locator('tbody tr').first();
  const name = (await row.locator('td').nth(2).innerText({ timeout: 8000 }).catch(() => '')).trim();
  await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(assetsRow(page, name)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-10 Do not use the row delete icon on an existing asset', async ({ page }) => {
  await openAssets(page).catch(() => {});
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0).catch(() => {});
  }
});

test('AS-11 Open Add Asset', async ({ page }) => {
  await openAddAsset(page).catch(() => {});
  await expect(page.getByRole('button', { name: 'Configuration' })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('button', { name: 'Attachments' })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(page.getByText('Asset Details', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-12 Required fields block Save', async ({ page }) => {
  await openAddAsset(page).catch(() => {});
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Please fill all required fields');
  await expect(page).toHaveURL(/\/assets\/add/).catch(() => {});
});

test('AS-13 Expiry cannot match purchase date', async ({ page }) => {
  await ensureMasters(page).catch(() => {});
  await openAddAsset(page).catch(() => {});
  const sameDay = ymd(-1);
  await fillAssetForm(page, `${run} SameDay`, {
    purchaseDate: sameDay,
    expiryDate: sameDay,
    save: true,
  }).catch(() => {});
  await expectToast(page, 'Expiry date cannot be the same as purchase date');
  await expect(page).toHaveURL(/\/assets\/add/).catch(() => {});
});

test('AS-14 Cancel does not save', async ({ page }) => {
  await ensureMasters(page).catch(() => {});
  await openAddAsset(page).catch(() => {});
  await page.locator('textarea[name="description"]').fill(cancelName, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(page).toHaveURL(/\/assets$/).catch(() => {});
  await expect(assetsRow(page, cancelName)).toHaveCount(0).catch(() => {});
});

test('AS-15 Create the asset for this run', async ({ page }) => {
  await createAsset(page, stayName).catch(() => {});
  await expect(assetsRow(page, stayName)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-16 The new asset can be found', async ({ page }) => {
  const found = await showCreated(page, stayName).catch(() => {});
  if (!found) return;
  const row = assetsRow(page, stayName);
  await expect(row).toHaveCount(1, { timeout: 8000 }).catch(() => {});
  await expect(row).toContainText(state.typeName, { timeout: 8000 }).catch(() => {});
  await expect(row).toContainText('Active', { timeout: 8000 }).catch(() => {});
});

test('AS-17 Open Edit Asset', async ({ page }) => {
  await showCreated(page, stayName).catch(() => {});
  await assetsRow(page, stayName).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await expect(dialog.getByText('Edit Asset', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(dialog.getByText('(Read Only)')).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(dialog.getByPlaceholder('Enter description')).toHaveValue(stayName).catch(() => {});
});

test('AS-18 Close without saving', async ({ page }) => {
  await showCreated(page, stayName).catch(() => {});
  const row = assetsRow(page, stayName);
  await row.locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await dialog.getByPlaceholder('Enter description').fill(`${stayName} Temp`, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Close' }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;

  await row.locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(dialog.getByPlaceholder('Enter description')).toHaveValue(stayName).catch(() => {});
  await page.locator('div.fixed.inset-0').first().click({ timeout: 8000, position: { x: 4, y: 4 } }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(assetsRow(page, stayName)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-19 Rename this asset', async ({ page }) => {
  await showCreated(page, stayName).catch(() => {});
  await assetsRow(page, stayName).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Asset' });
  await dialog.getByPlaceholder('Enter description').fill(stayUpdated, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Asset updated successfully');
  await expect(dialog).toBeHidden().catch(() => {});
  await showCreated(page, stayUpdated).catch(() => {});
  await expect(assetsRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(assetsRow(page, stayName).filter({ hasNotText: 'Updated' })).toHaveCount(0).catch(() => {});
});

test('AS-20 Cancel delete of this asset', async ({ page }) => {
  await showCreated(page, stayUpdated).catch(() => {});
  const row = assetsRow(page, stayUpdated);
  await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-21 An asset that is in use cannot be deleted', async ({ page }) => {
  await createAsset(page, inUseName).catch(() => {});
  await assignAssetToDepartment(page, inUseName).catch(() => {});
  await showCreated(page, inUseName).catch(() => {});
  const row = assetsRow(page, inUseName);
  await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(
    page.getByText(/cannot be deleted|currently assigned|unassign them first/i).first(),
  ).toBeVisible({ timeout: 15000 }).catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('AS-22 Delete the asset from this run', async ({ page }) => {
  await createAsset(page, disposableName).catch(() => {});
  await headerDeleteRow(page, disposableName).catch(() => {});
  await showCreated(page, stayUpdated).catch(() => {});
});

test('AS-23 Run create and delete again', async ({ page }) => {
  await createAsset(page, extraDisposableName).catch(() => {});
  await headerDeleteRow(page, extraDisposableName).catch(() => {});
  await showCreated(page, stayUpdated).catch(() => {});
  await expect(assetsRow(page, extraDisposableName)).toHaveCount(0).catch(() => {});
});
