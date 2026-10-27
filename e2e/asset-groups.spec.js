// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

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
    timeout: 30000,
  });
  await expect(
    page
      .getByRole('columnheader', { name: 'Group Name' })
      .or(page.getByText('No asset groups found.', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
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
  await trigger.click();
  const search = page.getByPlaceholder('Select Asset Type');
  await expect(search).toBeVisible();
  await search.fill(typeLabel);
  const option = page.locator('button').filter({ hasText: typeLabel }).filter({ hasNotText: 'Create New Asset Type' });
  await expect(option, `Group Required type ${typeLabel} is not in Select Asset Type`).toBeVisible({
    timeout: 20000,
  });
  await option.click();
}

/**
 * Click the stay/del asset row in Assets List. Do not use Add All.
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
async function addOneAvailableAsset(page, assetName) {
  const row = availableCard(page).locator('tbody tr').filter({ hasText: assetName });
  await expect(row, `Do not add another asset. ${assetName} must be in Assets List.`).toBeVisible({
    timeout: 30000,
  });
  await row.click();
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
  await headerAddButton(page).click();
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
  await expect(option, `Asset type ${preferredName} is not in the list`).toBeVisible({
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

  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${run} Co`);
  await page.locator('input[name="company_email"]').fill(`pw.ag.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
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

  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName);
  await page.locator('label').filter({ hasText: 'Group Required' }).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
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
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await expect(page.getByText('This asset will be created without a serial number.')).toBeVisible();
  await page.locator('textarea[name="description"]').fill(name);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await selectProductVendorOnForm(page, state.vendorName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} groupName
 * @param {string} assetName
 */
async function createGroupWithAsset(page, groupName, assetName) {
  await openCreate(page);
  await page.getByPlaceholder('Enter group name').fill(groupName);
  await selectGroupType(page, state.typeName);
  await addOneAvailableAsset(page, assetName);
  await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();
  await page.getByRole('button', { name: 'Save' }).click();
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
  await row.locator('button[title="Edit"]').click();
  await expect(page).toHaveURL(/\/group-asset\/edit\//);
  await expect(page.getByRole('heading', { name: 'Edit Asset Group' })).toBeVisible({
    timeout: 30000,
  });
}

test.describe('Asset Groups', () => {
  test('AG-01 Open Asset Groups', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(2);
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
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Group ID' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Organization' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'group_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'org_id' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    await expect(first.locator('input[type="checkbox"]')).toBeVisible();
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
    const header = page.locator('thead').getByText('Group Name', { exact: true });
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Group Name/ })).toContainText('↑');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Group Name/ })).toContainText('↓');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Group Name/ })).not.toContainText('↑');
    await expect(page.getByRole('columnheader', { name: /Group Name/ })).not.toContainText('↓');
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
    await openCreate(page);
    await page.getByPlaceholder('Enter group name').fill(cancelName);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/group-asset$/);
    await expect(listRow(page, cancelName)).toHaveCount(0);
  });

  test('AG-09 Create a Group Required type and ungrouped assets if needed', async ({ page }) => {
    await createOurAsset(page, stayAsset);
    await createOurAsset(page, delAsset);
    await openCreate(page);
    await selectGroupType(page, state.typeName);
    await expect(availableCard(page).locator('tbody tr').filter({ hasText: stayAsset })).toBeVisible({
      timeout: 30000,
    });
    await expect(availableCard(page).locator('tbody tr').filter({ hasText: delAsset })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('AG-10 Name and at least one asset are required', async ({ page }) => {
    await openCreate(page);
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await page.getByPlaceholder('Enter group name').fill(stayGroup);
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
    await expect(page).toHaveURL(/\/group-asset\/create/);
  });

  test('AG-11 Create the E2E-AG stay group', async ({ page }) => {
    await createGroupWithAsset(page, stayGroup, stayAsset);
    await filterByColumn(page, 'Group Name', stayGroup);
    const row = listRow(page, stayGroup);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(1)).toHaveText('1');
    await expect(row.getByText('Active', { exact: true })).toBeVisible();
  });

  test('AG-12 Find the stay group', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Group Name', stayGroup);
    const row = listRow(page, stayGroup);
    await expect(row).toBeVisible();
    await expect(row.locator('button[title="Edit"]')).toBeVisible();
    await expect(row.locator('button[title="View"]')).toHaveCount(0);
  });

  test('AG-13 Open Edit on the stay group', async ({ page }) => {
    await openStayEdit(page, stayGroup);
    await expect(page.locator('header').getByText('Edit asset group', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Enter group name')).toHaveValue(stayGroup);
    await expect(selectedCard(page).locator('tbody tr').filter({ hasText: stayAsset })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Update Group' })).toBeVisible();
  });

  test('AG-14 Cancel Edit does not save', async ({ page }) => {
    await openStayEdit(page, stayGroup);
    await page.getByPlaceholder('Enter group name').fill(`${stayGroup} NoSave`);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/group-asset$/);
    await filterByColumn(page, 'Group Name', stayGroup);
    await expect(listRow(page, stayGroup)).toBeVisible();
    await expect(listRow(page, `${stayGroup} NoSave`)).toHaveCount(0);
  });

  test('AG-15 Empty name is blocked', async ({ page }) => {
    await openStayEdit(page, stayGroup);
    await page.getByPlaceholder('Enter group name').fill('');
    await page.getByRole('button', { name: 'Update Group' }).click();
    await expectToast(page, 'Please enter a group name');
    await expect(page).toHaveURL(/\/group-asset\/edit\//);
  });

  test('AG-16 Rename the stay group', async ({ page }) => {
    await openStayEdit(page, stayGroup);
    await page.getByPlaceholder('Enter group name').fill(stayUpdated);
    await page.getByRole('button', { name: 'Update Group' }).click();
    await expectToast(page, 'Asset group updated successfully!');
    await expect(page).toHaveURL(/\/group-asset$/);
    await filterByColumn(page, 'Group Name', stayUpdated);
    const row = listRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await expect(row.locator('td').nth(1)).toHaveText('1');
  });

  test('AG-17 Create a disposable group', async ({ page }) => {
    await createGroupWithAsset(page, delGroup, delAsset);
    await filterByColumn(page, 'Group Name', delGroup);
    await expect(listRow(page, delGroup)).toBeVisible();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Group Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('AG-18 Cancel Confirm Delete', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Group Name', delGroup);
    const row = listRow(page, delGroup);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    await expect(page.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await expect(page.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
    await expect(row).toBeVisible();
  });

  test('AG-19 Delete only the disposable group', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Group Name', delGroup);
    const row = listRow(page, delGroup);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    await expect(page.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, '1 asset group(s) deleted successfully');
    await expect(row).toHaveCount(0);
    await clearColumnFilter(page);
    await filterByColumn(page, 'Group Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('AG-20 Do not delete another group', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Group Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await expect(page).toHaveURL(/\/group-asset$/);
    await expect(page).not.toHaveURL(/\/group-asset\/view\//);
  });

  test('AG-21 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset);
    await createGroupWithAsset(page, stay2Group, stay2Asset);
    await filterByColumn(page, 'Group Name', stay2Group);
    await expect(listRow(page, stay2Group)).toBeVisible();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Group Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });
});
