// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle } from './helpers/screenAccess.js';

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
  await headerAddButton(page).click();
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
 * @param {string} title
 */
async function showSale(page, title) {
  await openSales(page);
  await filterByColumn(page, 'Sale Title', title);
  await expect(listRow(page, title)).toBeVisible({ timeout: 30000 });
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
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  if (await page.locator('tbody tr').filter({ hasText: vendorName }).count()) {
    state.vendorName = vendorName;
    return;
  }
  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${run} Co`);
  await page.locator('input[name="company_email"]').fill(`pw.ss.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
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
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  const trigger = labeledButton(page, 'Product Vendor');
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
 */
async function createAsset(page, name) {
  await ensureMasters(page);
  await gotoProtected(page, assetsUrl);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({ timeout: 30000 });
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/assets\/add/);
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(name);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await selectProductVendorOnForm(page, state.vendorName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
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
  await trigger.click();
  await page.getByPlaceholder('Search asset types...').fill(state.typeName);
  await page.locator('div.fixed div.cursor-pointer').filter({ hasText: state.typeName }).first().click();
  await page.locator('select').filter({ has: page.locator('option[value="INDIVIDUAL"]') }).selectOption('INDIVIDUAL');
  const row = listRow(page, name);
  await expect(row, `Asset ${name} is not free to scrap`).toBeVisible({ timeout: 30000 });
  await row.getByRole('button', { name: 'Scrap', exact: true }).click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Create Scrap' });
  await dialog.locator('#scrap-asset-notes').fill(`${run} scrap`);
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  if (await page.getByText('Scrap approval is required but the workflow is not configured').isVisible().catch(() => false)) {
    throw new Error(
      'Scrap workflow is not configured for this asset type. Configure it, leave it, then rerun. Do not click Run scrap workflow backfill.',
    );
  }
  await expectToast(
    page,
    /Scrap request sent for approval|successfully marked for scrapping|Scrap request created/,
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function approveScrap(page, name) {
  await gotoProtected(page, approvalUrl);
  await expect(
    page.getByRole('columnheader', { name: 'Name' }).or(page.getByText('No Data Found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
  const row = listRow(page, name);
  await expect(row, `Scrap ${name} is not on Scrap Approval`).toBeVisible({ timeout: 30000 });
  await row.click();
  await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 30000 });
  for (let step = 0; step < 8; step += 1) {
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approve.isVisible())) break;
    await approve.click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Approve Scrap Request' });
    await dialog.locator('textarea').fill(`${run} note ${step + 1}`);
    await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
    await expectToast(page, /Approved/);
  }
  if (await page.getByRole('button', { name: 'Approve', exact: true }).isVisible()) {
    throw new Error(
      'This login cannot finish approval for the scrap from this run. Map the workflow to this user, leave it, then rerun.',
    );
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
  await page.locator('label').filter({ hasText: /^Asset Type:$/ }).locator('xpath=..').locator('button').first().click();
  const search = page.getByPlaceholder('Search asset types...');
  await expect(search).toBeVisible();
  await search.fill(state.typeName);
  const option = page.getByRole('button').filter({ hasText: state.typeName }).filter({ hasText: '(' }).first();
  await expect(
    option,
    `No available scrap asset for ${state.typeName}. Finish Scrap Assets and Scrap Approval for this run, leave them, then rerun.`,
  ).toBeVisible({ timeout: 20000 });
  const label = await option.innerText();
  if (!/\([1-9]\d*\)/.test(label)) {
    throw new Error(
      `Asset type ${state.typeName} has no available scrap assets. Approve a scrap from this run, leave it, then rerun.`,
    );
  }
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function fillSaleForm(page, title) {
  await selectThisRunAssetType(page);
  const addOne = page.locator('button[title="Add one asset"]');
  await expect(addOne).toBeEnabled({ timeout: 20000 });
  await addOne.click();
  await page.getByPlaceholder('e.g. Old Electronics').fill(title);
  await page.locator('input[type="date"]').fill(ymd(1));
  await page.getByPlaceholder('Enter total scrap value').fill('1');
  await page.getByPlaceholder('Full Name').fill(buyerName);
  await page.getByPlaceholder('email@example.com').fill(`pw.ss.${stamp}@test.com`);
  await page.getByPlaceholder('+91 98765 43210').fill('9876543210');
  await page.getByPlaceholder('Company Name').fill(companyName);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function createSale(page, title) {
  await prepareApprovedScrapAsset(page);
  await openCreateSale(page);
  await fillSaleForm(page, title);
  await page.getByRole('button', { name: 'Save Scrap Sale' }).click();
  await expectToast(page, 'Scrap sale created successfully');
  await expect(page).toHaveURL(/\/scrap-sales$/);
  await expect(listRow(page, title)).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function headerDeleteSale(page, title) {
  await showSale(page, title);
  const row = listRow(page, title);
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
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
  await openSales(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createSale(page, stayTitle);
    state.stayTitle = stayTitle;
    await openSales(page);
  }
  const first = page.locator('tbody tr').first();
  const title = (await first.locator('td').first().innerText()).trim();
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
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createSale(page, stayTitle);
    state.stayTitle = stayTitle;
    await openSales(page);
  }
  const row = page.locator('tbody tr').first();
  const title = (await row.locator('td').first().innerText()).trim();
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(listRow(page, title)).toBeVisible();
});

test('SS-08 Do not use the row delete icon on an existing sale', async ({ page }) => {
  await openSales(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
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
    await showSale(page, stayTitle);
    return;
  }
  await createSale(page, stayTitle);
  state.stayTitle = stayTitle;
});

test('SS-12 The new sale can be found', async ({ page }) => {
  await showSale(page, stayTitle);
  const row = listRow(page, stayTitle);
  await expect(row).toHaveCount(1);
  await expect(row).toContainText(buyerName);
});

test('SS-13 Open View Scrap Sale', async ({ page }) => {
  await showSale(page, stayTitle);
  await listRow(page, stayTitle).locator('button[title="Edit"]').click();
  await expect(page).toHaveURL(/\/scrap-sales\/edit\//);
  const scrapId = page.url().split('/').pop();
  await gotoProtected(page, `${BASE}/scrap-sales/view/${scrapId}`);
  await expect(page.getByText('Scrap Sale Details', { exact: true })).toBeVisible({ timeout: 20000 });
  await page.locator('div.bg-white.shadow-sm.border-b button').first().click();
  await expect(page.locator('header').getByText('Scrap Sales', { exact: true })).toBeVisible({
    timeout: 30000,
  });
});

test('SS-14 Open Edit Scrap Sale', async ({ page }) => {
  await showSale(page, stayTitle);
  await listRow(page, stayTitle).locator('button[title="Edit"]').click();
  await expect(page.getByRole('heading', { name: 'Edit Scrap Sale' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByPlaceholder('Full Name')).toHaveValue(buyerName);
  await expect(page.getByPlaceholder('e.g. Old Electronics')).toHaveValue(stayTitle);
});

test('SS-15 Cancel edit without saving', async ({ page }) => {
  await showSale(page, stayTitle);
  await listRow(page, stayTitle).locator('button[title="Edit"]').click();
  await expect(page.getByPlaceholder('Full Name')).toBeVisible({ timeout: 30000 });
  await page.getByPlaceholder('Full Name').fill(`${buyerName} Temp`);
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page).toHaveURL(/\/scrap-sales$/);
  await showSale(page, stayTitle);
  await expect(listRow(page, stayTitle)).toContainText(buyerName);
  await expect(listRow(page, `${buyerName} Temp`)).toHaveCount(0);
});

test('SS-16 Update this sale only', async ({ page }) => {
  await showSale(page, stayTitle);
  await listRow(page, stayTitle).locator('button[title="Edit"]').click();
  await expect(page.getByPlaceholder('e.g. Old Electronics')).toBeVisible({ timeout: 30000 });
  await page.getByPlaceholder('e.g. Old Electronics').fill(stayUpdated);
  await page.getByRole('button', { name: 'Update Scrap Sale' }).click();
  await expectToast(page, 'Scrap sale updated successfully');
  await showSale(page, stayUpdated);
  await expect(listRow(page, stayUpdated)).toBeVisible();
  state.stayTitle = stayUpdated;
});

test('SS-17 Cancel delete of this sale', async ({ page }) => {
  await showSale(page, stayUpdated);
  const row = listRow(page, stayUpdated);
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();
});

test('SS-18 Delete the sale from this run', async ({ page }) => {
  await createSale(page, disposableTitle);
  await headerDeleteSale(page, disposableTitle);
  await showSale(page, stayUpdated);
});

test('SS-19 Run create and delete again', async ({ page }) => {
  await createSale(page, extraTitle);
  await headerDeleteSale(page, extraTitle);
  await showSale(page, stayUpdated);
  await expect(listRow(page, extraTitle)).toHaveCount(0);
  await expect(listRow(page, disposableTitle)).toHaveCount(0);
});
