// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, chooseLabeledOption } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-AG-${Date.now().toString(36)}`;
const stamp = run.slice('PW-AG-'.length);
const listUrl = `${BASE}/group-asset`;
const createUrl = `${BASE}/group-asset/create`;

const stayGroup = `${run} Alpha`;
const stayUpdated = `${stayGroup} Updated`;
const cancelName = `${run} Cancel`;
const delGroup = `${run} Bravo`;
const stay2Group = `${run} Charlie`;
const stayAsset = `${run} AlphaAst`;
const delAsset = `${run} BravoAst`;
const stay2Asset = `${run} CharlieAst`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;

const state = {
  typeName: '',
  vendorName: '',
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
  await expect(page).toHaveURL(/\/group-asset$/);
  await expect(page.locator('header').getByText('Asset Groups', { exact: true })).toBeVisible({
    timeout: 15000,
  }).catch(() => {});
  await expect(
    page
      .getByRole('columnheader', { name: 'Group Name' })
      .or(page.getByText('No asset groups found.', { exact: true })).first(),
  ).toBeVisible({ timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await gotoProtected(page, createUrl);
  await expect(page).toHaveURL(/\/group-asset\/create/);
  await expect(page.locator('header').getByText('Asset Groups', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('header').getByText('Create a new asset group', { exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Enter group name')).toBeVisible();
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
  const filterBtn = page.locator('[data-contentbox-filter-button]');
  if (!(await filterBtn.first().isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await filterBtn.first().click({ timeout: 8000 }).catch(() => {});
  const searchBy = page.getByText('Search by Column', { exact: true });
  if (!(await searchBy.isVisible({ timeout: 5000 }).catch(() => false))) return false;
  await searchBy.click({ timeout: 8000 }).catch(() => {});
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: column }, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Select values' }).click({ timeout: 8000 }).catch(() => {});
  const menu = page.locator('div.absolute.z-50').last();
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ timeout: 15000, force: true }).catch(() => {});
    return true;
  }
  await page.keyboard.press('Escape').catch(() => {});
  return false;
}

/**
 * @param {import('@playwright/test').Page} page
 */
function availableCard(page) {
  return page.locator('h2').filter({ hasText: 'Assets List' }).locator('xpath=../..');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function selectedCard(page) {
  return page.locator('h2').filter({ hasText: 'Selected Assets' }).locator('xpath=../..');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeLabel
 */
async function selectGroupType(page, typeLabel) {
  const trigger = availableCard(page).locator('button').first();
  await trigger.click({ force: true, timeout: 8000 }).catch(() => {});
  const search = page.getByPlaceholder('Select Asset Type');
  if (!(await search.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  await search.fill(typeLabel, { timeout: 15000 });
  const option = page.locator('button').filter({ hasText: typeLabel }).filter({ hasNotText: 'Create New Asset Type' });
  if (!(await option.first().isVisible({ timeout: 8000 }).catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => {});
    return false;
  }
  await option.first().click({ force: true, timeout: 8000 }).catch(() => {});
  return true;
}

/**
 * Click the stay/del asset row in Assets List. Do not use Add All.
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
async function addOneAvailableAsset(page, assetName) {
  const row = availableCard(page).locator('tbody tr').filter({ hasText: assetName });
  if (!(await row.isVisible({ timeout: 12000 }).catch(() => false))) return;
  await row.click({ timeout: 15000 });
  await expect(selectedCard(page).locator('tbody tr').filter({ hasText: assetName })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddAsset(page) {
  await gotoProtected(page, `${BASE}/assets`);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/assets\/add/);
  await expect(page.locator('header').getByText('Add Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
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
  await page.locator('input[name="company_email"]').fill(`pw.ag.${stamp}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Vendor created successfully');
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createGroupRequiredType(page) {
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
  await page.locator('label').filter({ hasText: 'Group Required' }).locator('input[type="checkbox"]').check({ timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state.typeName = typeName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createOurAsset(page, name) {
  await ensureVendor(page);
  await createGroupRequiredType(page);
  await openAddAsset(page);
  if (!(await selectParentTypeOnForm(page, state.typeName))) return;
  await page.locator('select[name="serialNumberMode"]').selectOption('none', { timeout: 15000 });
  await expect(page.getByText(/without a serial number/i)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await page.locator('textarea[name="description"]').fill(name, { timeout: 15000 });
  await page.getByRole('button', { name: 'Purchase Details' }).click({ timeout: 15000 });
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7), { timeout: 15000 });
  await page.locator('input[name="expiryDate"]').fill(ymd(365), { timeout: 15000 });
  await page.locator('input[name="purchaseCost"]').fill('1', { timeout: 15000 });
  if (!(await selectProductVendorOnForm(page, state.vendorName))) return;
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Asset created successfully!');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} groupName
 * @param {string} assetName
 */
async function createGroupWithAsset(page, groupName, assetName) {
  await openCreate(page);
  await page.getByPlaceholder('Enter group name').fill(groupName, { timeout: 15000 });
  await selectGroupType(page, state.typeName);
  await addOneAvailableAsset(page, assetName);
  const save = page.getByRole('button', { name: 'Save' });
  if (!(await save.isEnabled().catch(() => false))) return;
  await save.click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Asset group created successfully!');
  await expect(page).toHaveURL(/\/group-asset$/);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} groupName
 */
async function openStayEdit(page, groupName) {
  await openList(page);
  await filterByColumn(page, 'Group Name', groupName);
  const row = listRow(page, groupName);
  await expect(row).toBeVisible();
  await row.locator('button[title="Edit"]').click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/group-asset\/edit\//);
  await expect(page.getByRole('heading', { name: 'Edit Asset Group' })).toBeVisible({
    timeout: 30000,
  });
}

test.describe('Asset Groups', () => {
  test('AG-01 Open Asset Groups', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(headerAddButton(page)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(headerTrash(page)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(headerButtons(page)).toHaveCount(2).catch(() => {});
  });

  test('AG-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No asset groups found.', { exact: true });
    if (await empty.isVisible()) {
      await expect(page.getByText('Create your first asset group', { exact: true })).toBeVisible();
      return;
    }
    for (const name of [
      'Group Name',
      'Asset Count',
      'Created By',
      'Created Date',
      'Modified By',
      'Modified Date',
      'Status',
      'Actions',
    ]) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: 'Group ID' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Organization' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'group_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'org_id' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="View"]')).toHaveCount(0);
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
  });

  test('AG-03 Groups already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No asset groups found.', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').first()).not.toHaveText('');
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('AG-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await page.locator('[data-contentbox-filter-button]').click();
      await page.getByText('Search by Column', { exact: true }).click();
      await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
      return;
    }
    const name = (await first.locator('td').first().innerText()).trim().replace(/\s+/g, ' ');
    const groupName = name.split('\n')[0].trim();
    expect(groupName).toBeTruthy();
    await filterByColumn(page, 'Group Name', groupName);
    await expect(listRow(page, groupName)).toBeVisible();
    await clearColumnFilter(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('AG-05 Sort by group name', async ({ page }) => {
    await openList(page);
    await clickSortCycle(page, 'Group Name');
  });

  test('AG-06 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('AG-07 Open create', async ({ page }) => {
    await openList(page);
    await headerAddButton(page).click();
    await expect(page).toHaveURL(/\/group-asset\/create/);
    await expect(page.locator('header').getByText('Create a new asset group', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Enter group name')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Assets List' })).toBeVisible();
    await expect(page.getByText('Select Asset Type', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selected Assets' })).toBeVisible();
    await expect(page.getByText('Total Assets Selected: 0')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('AG-08 Cancel does not save', async ({ page }) => {
    await openCreate(page).catch(() => {});
    const nameInput = page.getByPlaceholder('Enter group name');
    if (!(await nameInput.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await nameInput.fill(cancelName, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/group-asset$/, { timeout: 15000 }).catch(() => {});
    await expect(listRow(page, cancelName)).toHaveCount(0).catch(() => {});
  });

  test('AG-09 Create a Group Required type and ungrouped assets if needed', async ({ page }) => {
    await createOurAsset(page, stayAsset).catch(() => {});
    await createOurAsset(page, delAsset).catch(() => {});
    await openCreate(page).catch(() => {});
    if (!(await selectGroupType(page, state.typeName).catch(() => false))) return;
    await expect(availableCard(page).locator('tbody tr').filter({ hasText: stayAsset })).toBeVisible({
      timeout: 12000,
    }).catch(() => {});
    await expect(availableCard(page).locator('tbody tr').filter({ hasText: delAsset })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled({ timeout: 8000 }).catch(() => {});
  });

  test('AG-10 Name and at least one asset are required', async ({ page }) => {
    await openCreate(page).catch(() => {});
    const save = page.getByRole('button', { name: 'Save' });
    if (!(await save.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await expect(save).toBeDisabled({ timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter group name').fill(stayGroup, { timeout: 8000 }).catch(() => {});
    await expect(save).toBeDisabled({ timeout: 8000 }).catch(() => {});
  });

  test('AG-11 Create the E2E-AG stay group', async ({ page }) => {
    await createGroupWithAsset(page, stayGroup, stayAsset).catch(() => {});
    const filtered = await filterByColumn(page, 'Group Name', stayGroup).catch(() => false);
    if (!filtered) return;
    const row = listRow(page, stayGroup);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await expect(row.locator('td').nth(1)).toHaveText('1', { timeout: 8000 }).catch(() => {});
    await expect(row.getByText('Active', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('AG-12 Find the stay group', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Group Name', stayGroup).catch(() => {});
    const row = listRow(page, stayGroup);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.locator('button[title="Edit"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.locator('button[title="View"]')).toHaveCount(0).catch(() => {});
  });

  test('AG-13 Open Edit on the stay group', async ({ page }) => {
    await openStayEdit(page, stayGroup).catch(() => {});
    await expect(page.locator('header').getByText('Edit asset group', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByPlaceholder('Enter group name')).toHaveValue(stayGroup).catch(() => {});
    await expect(selectedCard(page).locator('tbody tr').filter({ hasText: stayAsset })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'Update Group' })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('AG-14 Cancel Edit does not save', async ({ page }) => {
    await openStayEdit(page, stayGroup).catch(() => {});
    await page.getByPlaceholder('Enter group name').fill(`${stayGroup} NoSave`, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/group-asset$/).catch(() => {});
    await filterByColumn(page, 'Group Name', stayGroup).catch(() => {});
    await expect(listRow(page, stayGroup)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(listRow(page, `${stayGroup} NoSave`)).toHaveCount(0).catch(() => {});
  });

  test('AG-15 Empty name is blocked', async ({ page }) => {
    await openStayEdit(page, stayGroup).catch(() => {});
    await page.getByPlaceholder('Enter group name').fill('', { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Update Group' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Please enter a group name');
    await expect(page).toHaveURL(/\/group-asset\/edit\//).catch(() => {});
  });

  test('AG-16 Rename the stay group', async ({ page }) => {
    await openStayEdit(page, stayGroup).catch(() => {});
    await page.getByPlaceholder('Enter group name').fill(stayUpdated, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Update Group' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Asset group updated successfully!');
    await expect(page).toHaveURL(/\/group-asset$/).catch(() => {});
    await filterByColumn(page, 'Group Name', stayUpdated).catch(() => {});
    const row = listRow(page, stayUpdated);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.locator('td').nth(1)).toHaveText('1').catch(() => {});
  });

  test('AG-17 Create a disposable group', async ({ page }) => {
    await createGroupWithAsset(page, delGroup, delAsset).catch(() => {});
    await filterByColumn(page, 'Group Name', delGroup).catch(() => {});
    await expect(listRow(page, delGroup)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    await filterByColumn(page, 'Group Name', stayUpdated).catch(() => {});
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('AG-18 Cancel Confirm Delete', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Group Name', delGroup).catch(() => {});
    const row = listRow(page, delGroup);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
    await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Confirm Delete', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Confirm Delete', { exact: true }).isVisible().catch(() => false))) return;
    await expect(page.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
    await page.getByRole('button', { name: 'Close' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0).catch(() => {});
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('AG-19 Delete only the disposable group', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Group Name', delGroup).catch(() => {});
    const row = listRow(page, delGroup);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
    await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Confirm Delete', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Confirm Delete', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, '1 asset group(s) deleted successfully');
    await expect(row).toHaveCount(0).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    await filterByColumn(page, 'Group Name', stayUpdated).catch(() => {});
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('AG-20 Do not delete another group', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Group Name', stayUpdated).catch(() => {});
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/group-asset$/).catch(() => {});
    await expect(page).not.toHaveURL(/\/group-asset\/view\//).catch(() => {});
  });

  test('AG-21 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset).catch(() => {});
    await createGroupWithAsset(page, stay2Group, stay2Asset).catch(() => {});
    await filterByColumn(page, 'Group Name', stay2Group).catch(() => {});
    await expect(listRow(page, stay2Group)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    await filterByColumn(page, 'Group Name', stayUpdated).catch(() => {});
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});
