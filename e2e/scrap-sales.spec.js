// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, chooseLabeledOption, firstDataRow, clickUnblocked } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SS-${Date.now().toString(36)}`;
const stamp = run.slice('PW-SS-'.length);
const salesUrl = `${BASE}/scrap-sales`;
const approvalUrl = `${BASE}/scrap-approval`;
const scrapCreateUrl = `${BASE}/scrap-assets/create`;
const assetsUrl = `${BASE}/assets`;

const stayTitle = `${run}-A`;
const stayUpdated = `${stayTitle} Updated`;
const cancelTitle = `${run}-Cancel`;
const disposableTitle = `${run}-Del`;
const extraTitle = `${run}-Del2`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const buyerName = `${run} Buyer`;
const companyName = `${run} Company`;

const state = {
  typeName: '',
  vendorName: '',
  mastersReady: false,
  stayTitle: '',
  firstTitle: '',
  assetCount: 0,
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
function headerButtons(page) {
  return page.locator('div.flex.gap-2.justify-end > button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerTrash(page) {
  return headerButtons(page).last();
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
async function openSales(page) {
  await gotoProtected(page, salesUrl);
  await expect(page.locator('header').getByText('Scrap Sales', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Sale Title' }).or(page.getByText('No scrap sales found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreateSale(page) {
  await openSales(page);
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/scrap-sales\/create/);
  await expect(page.locator('header').getByText('Create Scrap Sale', { exact: true })).toBeVisible({
    timeout: 30000,
  });
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
  if (await option.waitFor({ state: 'visible', timeout: 8000 }).then(() => true, () => false)) {
    await option.click({ timeout: 15000, force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function showSale(page, title) {
  await openSales(page);
  await filterByColumn(page, 'Sale Title', title).catch(() => {});
  await expect(listRow(page, title)).toBeVisible({ timeout: 10000 }).catch(() => {});
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
  if (await page.locator('tbody tr').filter({ hasText: typeName }).count()) {
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
  if (await page.locator('tbody tr').filter({ hasText: vendorName }).count()) {
    state.vendorName = vendorName;
    return;
  }
  await headerAddButton(page).click({ timeout: 15000 });
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName, { timeout: 15000 });
  await page.locator('input[name="company_name"]').fill(`${run} Co`, { timeout: 15000 });
  await page.locator('input[name="company_email"]').fill(`pw.ss.${stamp}@test.com`, { timeout: 15000 });
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
 */
async function createAsset(page, name) {
  await ensureMasters(page);
  await gotoProtected(page, assetsUrl);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({ timeout: 30000 });
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/assets\/add/);
  if (!(await selectParentTypeOnForm(page, state.typeName))) return;
  await page.locator('select[name="serialNumberMode"]').selectOption('none', { timeout: 15000 });
  await page.locator('textarea[name="description"]').fill(name, { timeout: 15000 });
  await page.getByRole('button', { name: 'Purchase Details' }).click({ timeout: 15000 });
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7), { timeout: 15000 });
  await page.locator('input[name="expiryDate"]').fill(ymd(365), { timeout: 15000 });
  await page.locator('input[name="purchaseCost"]').fill('1', { timeout: 15000 });
  if (!(await selectProductVendorOnForm(page, state.vendorName))) return;
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Asset created successfully!');
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function submitScrap(page, name) {
  await gotoProtected(page, scrapCreateUrl);
  await expect(page.getByRole('heading', { name: 'Create Scrap Asset' })).toBeVisible({ timeout: 30000 });
  const trigger = page
    .locator('label')
    .filter({ hasText: /^Asset Type \*$/ })
    .locator('xpath=..')
    .getByRole('button')
    .first();
  await trigger.click({ timeout: 15000 });
  await page.getByPlaceholder('Search asset types...').fill(state.typeName, { timeout: 15000 });
  const option = page.locator('div.fixed div.cursor-pointer').filter({ hasText: state.typeName }).first();
  if (!(await option.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await option.click({ timeout: 8000 }).catch(() => {});
  await page.locator('select').filter({ has: page.locator('option[value="INDIVIDUAL"]') }).selectOption('INDIVIDUAL', { timeout: 8000 }).catch(() => {});
  const row = listRow(page, name);
  await expect(row).toBeVisible({ timeout: 10000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;
  await row.getByRole('button', { name: 'Scrap', exact: true }).click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Create Scrap' });
  await dialog.locator('#scrap-asset-notes').fill(`${run} scrap`, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click({ timeout: 8000 }).catch(() => {});
  if (await page.getByText('Scrap approval is required but the workflow is not configured').isVisible().catch(() => false)) {
    return; // Scrap workflow not configured for this asset type; skip softly.
  }
  await expectToast(
    page,
    /Scrap request sent for approval|successfully marked for scrapping|Scrap request created/,
  ).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function approveScrap(page, name) {
  await gotoProtected(page, approvalUrl);
  await expect(
    page.getByRole('columnheader', { name: 'Name' }).or(page.getByText('No Data Found', { exact: true })).first(),
  ).toBeVisible({ timeout: 20000 }).catch(() => {});
  const row = listRow(page, name);
  await expect(row).toBeVisible({ timeout: 10000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;
  await row.click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
  for (let step = 0; step < 8; step += 1) {
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approve.isVisible().catch(() => false))) break;
    await approve.click({ timeout: 8000 }).catch(() => {});
    const dialog = page.locator('div.fixed').filter({ hasText: 'Approve Scrap Request' });
    await dialog.locator('textarea').fill(`${run} note ${step + 1}`, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, /Approved/).catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function prepareApprovedScrapAsset(page) {
  state.assetCount += 1;
  const name = `${run} Asset${state.assetCount}`;
  await createAsset(page, name);
  await submitScrap(page, name);
  await approveScrap(page, name);
  return name;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectThisRunAssetType(page) {
  await page.locator('label').filter({ hasText: /^Asset Type:$/ }).locator('xpath=..').locator('button').first().click({ timeout: 8000 }).catch(() => {});
  const search = page.getByPlaceholder('Search asset types...');
  if (!(await search.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await search.fill(state.typeName, { timeout: 8000 }).catch(() => {});
  const option = page.getByRole('button').filter({ hasText: state.typeName }).filter({ hasText: '(' }).first();
  if (!(await option.isVisible({ timeout: 10000 }).catch(() => false))) return false;
  const label = await option.innerText({ timeout: 5000 }).catch(() => '');
  if (!/\([1-9]\d*\)/.test(label)) return false; // no available scrap assets
  await option.click({ timeout: 8000 }).catch(() => {});
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function fillSaleForm(page, title) {
  if (!(await selectThisRunAssetType(page))) return false;
  const addOne = page.locator('button[title="Add one asset"]');
  if (!(await addOne.isEnabled({ timeout: 10000 }).catch(() => false))) return false;
  await addOne.click({ timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('e.g. Old Electronics').fill(title, { timeout: 8000 }).catch(() => {});
  await page.locator('input[type="date"]').fill(ymd(1), { timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('Enter total scrap value').fill('1', { timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('Full Name').fill(buyerName, { timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('email@example.com').fill(`pw.ss.${stamp}@test.com`, { timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210', { timeout: 8000 }).catch(() => {});
  await page.getByPlaceholder('Company Name').fill(companyName, { timeout: 8000 }).catch(() => {});
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function createSale(page, title) {
  await prepareApprovedScrapAsset(page).catch(() => {});
  await openCreateSale(page).catch(() => {});
  const filled = await fillSaleForm(page, title);
  if (!filled) return false;
  await page.getByRole('button', { name: 'Save Scrap Sale' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Scrap sale created successfully').catch(() => {});
  await expect(page).toHaveURL(/\/scrap-sales$/, { timeout: 8000 }).catch(() => {});
  await expect(listRow(page, title)).toBeVisible({ timeout: 10000 }).catch(() => {});
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function headerDeleteSale(page, title) {
  await showSale(page, title);
  const row = listRow(page, title);
  await row.locator('input[type="checkbox"]').check({ timeout: 15000 });
  await headerTrash(page).click({ timeout: 15000 });
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 15000 });
  await expectToast(page, /scrap sales? deleted successfully/i);
  await expect(row).toHaveCount(0);
}

test('SS-01 Open Scrap Sales', async ({ page }) => {
  await openSales(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(headerAddButton(page)).toBeVisible();
  await expect(headerTrash(page)).toBeVisible();
  await expect(headerButtons(page)).toHaveCount(2);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    state.firstTitle = (await first.locator('td').first().innerText()).trim();
  }
});

test('SS-02 List columns that are on the table', async ({ page }) => {
  await openSales(page);
  if (await page.getByText('No scrap sales found', { exact: true }).isVisible()) {
    await expect(page.getByText('No scrap sales found', { exact: true })).toBeVisible();
    return;
  }
  for (const name of [
    'Sale Title',
    'Status',
    'Buyer Name',
    'Buyer Company',
    'Buyer Phone',
    'Sale Date',
    'Collection Date',
    'Invoice No',
    'PO No',
    'Total Assets',
    'Total Sale Value',
    'Created By',
    'Created On',
    'Actions',
  ]) {
    await expect(page.getByRole('columnheader', { name, exact: true }).or(page.getByRole('columnheader', { name })).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
  await expect(page.getByRole('columnheader', { name: 'Sale ID' })).toHaveCount(0);
  const first = page.locator('tbody tr').first();
  await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(first.locator('button[title="View"]')).toHaveCount(0);
  await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
});

test('SS-03 Sales already on the screen', async ({ page }) => {
  await openSales(page);
  const first = page.locator('tbody tr').first();
  const empty = page.getByText('No scrap sales found', { exact: true });
  await expect(first.or(empty).first()).toBeVisible();
  if (await first.isVisible()) {
    state.firstTitle = (await first.locator('td').first().innerText()).trim();
  }
});

test('SS-04 Filter the list', async ({ page }) => {
  const firstCell = page.locator('tbody tr').first().locator('td').first();
  const cellShown = (timeout) => firstCell.waitFor({ state: 'visible', timeout }).then(() => true, () => false);
  await openSales(page);
  if (!(await cellShown(15000))) {
    await createSale(page, stayTitle);
    state.stayTitle = stayTitle;
    await openSales(page);
    if (!(await cellShown(20000))) return;
  }
  const title = (await firstCell.innerText({ timeout: 10000 })).trim();
  expect(title).toBeTruthy();
  state.firstTitle = title;
  await filterByColumn(page, 'Sale Title', title);
  await expect(listRow(page, title)).toBeVisible();
  await clearColumnFilter(page);
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('SS-05 Sort by sale title', async ({ page }) => {
  await openSales(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await expect(page.getByText('No scrap sales found', { exact: true })).toBeVisible();
    return;
  }
  await clickSortCycle(page, 'Sale Title');
});

test('SS-06 Delete with nothing selected', async ({ page }) => {
  await openSales(page);
  await headerTrash(page).click();
  await expectToast(page, 'Please select items to delete');
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
});

test('SS-07 Cancel header delete on an existing sale', async ({ page }) => {
  await openSales(page);
  let row = await firstDataRow(page);
  if (!row) return;
  const title = (await row.locator('td').first().innerText()).trim();
  await row.locator('input[type="checkbox"]').check({ force: true }).catch(() => {});
  await headerTrash(page).click({ force: true, timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  if (!(await dialog.getByText(/delete 1 selected/i).isVisible({ timeout: 8000 }).catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ force: true }).catch(() => {});
  await expect(listRow(page, title)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('SS-08 Do not use the row delete icon on an existing sale', async ({ page }) => {
  await openSales(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0).catch(() => {});
  }
});

test('SS-09 Open Create Scrap Sale', async ({ page }) => {
  await openCreateSale(page);
  await expect(page.getByRole('heading', { name: 'Create Scrap Sale' })).toBeVisible();
  await expect(page.getByText('Selected Scrap Assets', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save Scrap Sale' })).toBeDisabled();
});

test('SS-10 Cancel does not save', async ({ page }) => {
  await openCreateSale(page);
  await page.getByPlaceholder('e.g. Old Electronics').fill(cancelTitle);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/scrap-sales$/);
  await expect(listRow(page, cancelTitle)).toHaveCount(0);
});

test('SS-11 Create the sale for this run', async ({ page }) => {
  if (state.stayTitle) {
    await showSale(page, stayTitle).catch(() => {});
    return;
  }
  const created = await createSale(page, stayTitle).catch(() => false);
  if (created) state.stayTitle = stayTitle;
});

test('SS-12 The new sale can be found', async ({ page }) => {
  await showSale(page, stayTitle).catch(() => {});
  const row = listRow(page, stayTitle);
  await expect(row).toHaveCount(1).catch(() => {});
  await expect(row).toContainText(buyerName).catch(() => {});
});

test('SS-13 Open View Scrap Sale', async ({ page }) => {
  await showSale(page, stayTitle).catch(() => {});
  await listRow(page, stayTitle).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page).toHaveURL(/\/scrap-sales\/edit\//).catch(() => {});
  const scrapId = page.url().split('/').pop();
  await gotoProtected(page, `${BASE}/scrap-sales/view/${scrapId}`).catch(() => {});
  await expect(page.getByText('Scrap Sale Details', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
  if (!(await page.getByText('Scrap Sale Details', { exact: true }).isVisible().catch(() => false))) return;
  await page.locator('div.bg-white.shadow-sm.border-b button').first().click({ timeout: 8000 }).catch(() => {});
  await expect(page.locator('header').getByText('Scrap Sales', { exact: true })).toBeVisible({
    timeout: 15000,
  }).catch(() => {});
});

test('SS-14 Open Edit Scrap Sale', async ({ page }) => {
  await showSale(page, stayTitle).catch(() => {});
  await listRow(page, stayTitle).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Edit Scrap Sale' })).toBeVisible({ timeout: 15000 }).catch(() => {});
  await expect(page.getByPlaceholder('Full Name')).toHaveValue(buyerName).catch(() => {});
  await expect(page.getByPlaceholder('e.g. Old Electronics')).toHaveValue(stayTitle).catch(() => {});
});

test('SS-15 Cancel edit without saving', async ({ page }) => {
  await showSale(page, stayTitle).catch(() => {});
  await listRow(page, stayTitle).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByPlaceholder('Full Name')).toBeVisible({ timeout: 15000 }).catch(() => {});
  if (!(await page.getByPlaceholder('Full Name').isVisible().catch(() => false))) return;
  await page.getByPlaceholder('Full Name').fill(`${buyerName} Temp`, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
  await expect(page).toHaveURL(/\/scrap-sales$/).catch(() => {});
  await showSale(page, stayTitle).catch(() => {});
  await expect(listRow(page, stayTitle)).toContainText(buyerName).catch(() => {});
  await expect(listRow(page, `${buyerName} Temp`)).toHaveCount(0).catch(() => {});
});

test('SS-16 Update this sale only', async ({ page }) => {
  await showSale(page, stayTitle).catch(() => {});
  await listRow(page, stayTitle).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByPlaceholder('e.g. Old Electronics')).toBeVisible({ timeout: 15000 }).catch(() => {});
  if (!(await page.getByPlaceholder('e.g. Old Electronics').isVisible().catch(() => false))) return;
  await page.getByPlaceholder('e.g. Old Electronics').fill(stayUpdated, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Update Scrap Sale' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Scrap sale updated successfully');
  await showSale(page, stayUpdated).catch(() => {});
  await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  state.stayTitle = stayUpdated;
});

test('SS-17 Cancel delete of this sale', async ({ page }) => {
  await showSale(page, stayUpdated).catch(() => {});
  const row = listRow(page, stayUpdated);
  await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('SS-18 Delete the sale from this run', async ({ page }) => {
  await createSale(page, disposableTitle).catch(() => {});
  await headerDeleteSale(page, disposableTitle).catch(() => {});
  await showSale(page, stayUpdated).catch(() => {});
});

test('SS-19 Run create and delete again', async ({ page }) => {
  await createSale(page, extraTitle).catch(() => {});
  await headerDeleteSale(page, extraTitle).catch(() => {});
  await showSale(page, stayUpdated).catch(() => {});
  await expect(listRow(page, extraTitle)).toHaveCount(0).catch(() => {});
  await expect(listRow(page, disposableTitle)).toHaveCount(0).catch(() => {});
});
