// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-IF-${Date.now().toString(36)}`;
const stamp = run.slice('PW-IF-'.length);
const listUrl = `${BASE}/adminsettings/configuration/inspection-frequency`;
const hubUrl = `${BASE}/adminsettings/configuration`;
const mappingListUrl = `${BASE}/adminsettings/configuration/asset-type-checklist-mapping`;

const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const assetDesc = `${run} Asset`;
const questionName = `${run} Q`;
const stayDesc = `${run} Stay`;
const stayUpdated = `${stayDesc} Updated`;
const delDesc = `${run} Del`;
const del2Desc = `${run} Del2`;

const state = {
  typeName: '',
  vendorName: '',
  questionName: '',
  assetId: '',
  mappingReady: false,
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
 * @param {string} text
 */
function namedRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Locator} root
 * @param {string} label
 */
function labeledButton(root, label) {
  return root
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.locator('header').getByText('Inspection Frequency', { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await openList(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/inspection-frequency\/create$/);
  await expect(page.getByRole('heading', { name: 'Create Inspection Frequency' })).toBeVisible({
    timeout: 20000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function mappingSelect(page) {
  return page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Asset Type --' }),
  });
}

/**
 * @param {import('@playwright/test').Locator} select
 * @param {string} labelPart
 * @param {string} what
 */
async function selectNativeByLabelPart(select, labelPart, what) {
  await expect(select).toBeEnabled({ timeout: 15000 });
  const option = select.locator('option').filter({ hasText: labelPart });
  await expect(option, `${what} "${labelPart}" is not in the dropdown`).toBeAttached({
    timeout: 20000,
  });
  const value = await option.first().getAttribute('value');
  expect(value, `${what} "${labelPart}" has no option value`).toBeTruthy();
  await select.selectOption(value);
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
 * @param {string} label
 * @param {string} preferredName
 * @param {string} searchPlaceholder
 */
async function selectPreferred(page, label, preferredName, searchPlaceholder) {
  const trigger = labeledButton(page, label);
  await trigger.click();
  const search = page.getByPlaceholder(searchPlaceholder);
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New' })
    .first();
  await expect(option, `${label} ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page
      .getByRole('columnheader', { name: 'Asset Type Name' })
      .or(page.getByText('No data found', { exact: true })),
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
    page
      .getByRole('columnheader', { name: 'Vendor Name' })
      .or(page.getByText('No data found', { exact: true })),
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
  await page.getByPlaceholder('Enter company email').fill(`pw.if.${stamp}@test.com`);
  await page.getByPlaceholder('Enter contact person name').fill(`${run} Contact`);
  await page.getByPlaceholder('Enter contact number').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click();
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({
    timeout: 30000,
  });
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Response} response
 */
function isCreateAssetResponse(response) {
  if (response.request().method() !== 'POST') return false;
  let pathname = '';
  try {
    pathname = new URL(response.url()).pathname.replace(/\/$/, '');
  } catch {
    return false;
  }
  return pathname === '/api/assets' && response.status() === 201;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAsset(page) {
  if (state.assetId) return;
  await ensureAssetType(page);
  await ensureVendor(page);
  await gotoProtected(page, `${BASE}/assets`);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await selectPreferred(page, 'Asset Type', state.typeName, 'Search by name or ID');
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(assetDesc);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  await selectPreferred(page, 'Product Vendor', state.vendorName, 'Search...');
  const created = page.waitForResponse(isCreateAssetResponse, { timeout: 30000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await created;
  const body = await response.json();
  const assetId = body?.asset?.asset_id || body?.asset_id || body?.data?.asset_id;
  expect(assetId, `Asset create for ${assetDesc} did not return an asset_id`).toBeTruthy();
  await expectToast(page, 'Asset created successfully!');
  state.assetId = String(assetId);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureChecklistQuestion(page) {
  if (state.questionName) return;
  await gotoProtected(page, `${BASE}/adminsettings/configuration/inspection-checklists`);
  await expect(page.getByText('Inspection Checklists List', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const existing = page.locator('tbody tr').filter({ hasText: questionName });
  if (await existing.count()) {
    state.questionName = questionName;
    return;
  }
  await page.locator('button[title="Create New"]').click();
  await expect(page.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();
  const typeSelect = page.locator('select[name="irtd_id"]');
  await expect(typeSelect).toBeVisible();
  const options = typeSelect.locator('option');
  const count = await options.count();
  let chosen = '';
  for (let i = 1; i < count; i += 1) {
    const label = ((await options.nth(i).innerText()) || '').trim();
    if (!label || /other/i.test(label)) continue;
    chosen = (await options.nth(i).getAttribute('value')) || '';
    if (chosen) break;
  }
  expect(
    chosen,
    'Inspection Checklists has no response type the app can create. The response-type API is GET-only.',
  ).toBeTruthy();
  await typeSelect.selectOption(chosen);
  const selectedLabel = ((await typeSelect.locator('option:checked').innerText()) || '').trim();
  await page.getByPlaceholder('Enter inspection question').fill(questionName);
  if (/quantitative/i.test(selectedLabel)) {
    await page.getByPlaceholder('Enter minimum range').fill('1');
    await page.getByPlaceholder('Enter maximum range').fill('10');
  } else {
    await page.getByPlaceholder('Enter expected value').fill('Pass');
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, /Inspection [Cc]hecklist created successfully|Checklist created successfully/);
  state.questionName = questionName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureChecklistMapping(page) {
  if (state.mappingReady) return;
  await ensureAsset(page);
  await ensureChecklistQuestion(page);
  await gotoProtected(page, mappingListUrl);
  await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible({
    timeout: 30000,
  });
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/asset-type-checklist-mapping\/create$/);
  await expect(page.getByText('Create New Asset Type - Checklist Mapping', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  const typeSelect = page
    .locator('label')
    .filter({ hasText: /^Asset Type/ })
    .locator('xpath=..')
    .locator('select');
  const assetSelect = page
    .locator('label')
    .filter({ hasText: /^Specific Asset/ })
    .locator('xpath=..')
    .locator('select');
  await selectNativeByLabelPart(typeSelect, state.typeName, 'Asset type');
  await expect(page.getByText('Inspection Question Mapping')).toBeVisible();
  await selectNativeByLabelPart(assetSelect, state.assetId, 'Specific asset');
  await expect(assetSelect).not.toHaveValue('');
  await page.getByRole('button', { name: 'Add New Row' }).click();
  const question = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Choose Inspection Question --' }),
  });
  await selectNativeByLabelPart(question, state.questionName, 'Inspection question');
  await page.getByRole('button', { name: 'Save Mapping' }).click();
  await expectToast(page, 'Mapping saved successfully');
  state.mappingReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} description
 */
async function fillOnDemandCreate(page, description) {
  const select = mappingSelect(page);
  await expect
    .poll(async () => select.locator('option').count(), { timeout: 20000 })
    .toBeGreaterThan(1);
  await selectNativeByLabelPart(select, state.typeName, 'Asset type mapping');
  await expect(select).not.toHaveValue('');
  await page.getByText('On Demand', { exact: true }).click();
  await page.getByPlaceholder('Enter inspection frequency details...').fill(description);
  await expect(page.getByRole('radio', { name: 'In-House' })).toBeChecked();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} description
 */
async function createOnDemandFrequency(page, description) {
  await openCreate(page);
  await fillOnDemandCreate(page, description);
  await page.getByRole('button', { name: 'Save Frequency' }).click();
  await expectToast(page, 'Inspection frequency created successfully');
  await expect(page).toHaveURL(/\/inspection-frequency$/);
  await filterByColumn(page, 'Description', description);
  const row = namedRow(page, description);
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText('On Demand');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} description
 */
async function deleteFrequency(page, description) {
  await openList(page);
  await filterByColumn(page, 'Description', description);
  const row = namedRow(page, description);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, /1 frequency item\(s\) deleted|Deleted 1 items/);
  await expect(row).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function editDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Edit Inspection Frequency' });
}

test.describe('Inspection Frequency', () => {
  test('IF-01 IF-02 Open Inspection Frequency and columns', async ({ page }) => {
    await openList(page);
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frequency' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maintained By' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
  });

  test('IF-03 Frequencies already on the screen stay', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    }
  });

  test('IF-04 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('IF-05 Return to the Admin Dashboard', async ({ page }) => {
    await openList(page);
    await gotoProtected(page, hubUrl);
    await expect(
      page.getByRole('heading', { name: 'Inspection Frequency', exact: true }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('IF-06 IF-07 Open create and mapping is required', async ({ page }) => {
    await ensureChecklistMapping(page);
    await openCreate(page);
    await expect(page.getByText('Inspection Frequency Details', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Asset Type', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Asset', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Frequency' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Close' })).toBeVisible();
    const select = mappingSelect(page);
    await expect(select).toHaveValue('');
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    const mappingToast = page.getByText(/Please select an asset type mapping|Please select a mapping/);
    const stayedOnCreate = page.getByRole('heading', { name: 'Create Inspection Frequency' });
    await expect(mappingToast.or(stayedOnCreate).first()).toBeVisible();
    await expect(page).toHaveURL(/\/inspection-frequency\/create$/);
    await expect(namedRow(page, stayDesc)).toHaveCount(0);
  });

  test('IF-08 Close create without saving', async ({ page }) => {
    await ensureChecklistMapping(page);
    await openCreate(page);
    await fillOnDemandCreate(page, stayDesc);
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page).toHaveURL(/\/inspection-frequency$/);
    await expect(namedRow(page, stayDesc)).toHaveCount(0);
  });

  test('IF-09 Create an On Demand keeper frequency', async ({ page }) => {
    await ensureChecklistMapping(page);
    await createOnDemandFrequency(page, stayDesc);
  });

  test('IF-10 The new frequency is still there after a refresh', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDesc);
    await expect(namedRow(page, stayDesc)).toBeVisible({ timeout: 20000 });
    await expect(namedRow(page, stayDesc)).toContainText('On Demand');
  });

  test('IF-11 Edit only the keeper frequency', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDesc);
    const row = namedRow(page, stayDesc);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const dialog = editDialog(page);
    await expect(dialog.getByRole('heading', { name: 'Edit Inspection Frequency' })).toBeVisible();
    await expect(dialog.locator('input[disabled]')).toBeVisible();
    await dialog.getByPlaceholder('Enter description...').fill(stayUpdated);
    await dialog.getByRole('button', { name: 'Save Frequency' }).click();
    await expectToast(page, /Inspection frequency updated|Frequency updated/);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 20000 });
  });

  test('IF-12 Cancel edit without saving', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const dialog = editDialog(page);
    await expect(dialog.getByRole('heading', { name: 'Edit Inspection Frequency' })).toBeVisible();
    await dialog.getByPlaceholder('Enter description...').fill(`${stayUpdated} discard`);
    await dialog.locator('h3').locator('xpath=following-sibling::button').click();
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, `${stayUpdated} discard`)).toHaveCount(0);
  });

  test('IF-13 Delete only an extra disposable frequency', async ({ page }) => {
    await ensureChecklistMapping(page);
    await createOnDemandFrequency(page, delDesc);
    await deleteFrequency(page, delDesc);
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('IF-14 Run add and delete again on a second disposable frequency', async ({ page }) => {
    await ensureChecklistMapping(page);
    await createOnDemandFrequency(page, del2Desc);
    await openList(page);
    await filterByColumn(page, 'Description', del2Desc);
    const row = namedRow(page, del2Desc);
    await row.locator('button[title="Edit"]').click();
    const dialog = editDialog(page);
    await dialog.getByPlaceholder('Enter description...').fill(`${del2Desc} Updated`);
    await dialog.getByRole('button', { name: 'Save Frequency' }).click();
    await expectToast(page, /Inspection frequency updated|Frequency updated/);
    await deleteFrequency(page, `${del2Desc} Updated`);
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, `${del2Desc} Updated`)).toHaveCount(0);
  });
});
