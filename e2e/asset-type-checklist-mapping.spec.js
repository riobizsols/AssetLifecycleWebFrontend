// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-AM-${Date.now().toString(36)}`;
const stamp = run.slice('PW-AM-'.length);
const listUrl = `${BASE}/adminsettings/configuration/asset-type-checklist-mapping`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const stayDesc = `${run} Stay`;
const delDesc = `${run} Del`;
const questionName = `${run} Q`;

const state = {
  typeName: '',
  vendorName: '',
  questionName: '',
  stayAssetId: '',
  delAssetId: '',
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
async function openMappingList(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.locator('header').getByText('Asset Type - Inspection CheckList mapping', { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await openMappingList(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/asset-type-checklist-mapping\/create$/);
  await expect(page.getByText('Create New Asset Type - Checklist Mapping', { exact: true })).toBeVisible({
    timeout: 20000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetTypeSelect(page) {
  return page
    .locator('label')
    .filter({ hasText: /^Asset Type/ })
    .locator('xpath=..')
    .locator('select');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function specificAssetSelect(page) {
  return page
    .locator('label')
    .filter({ hasText: /^Specific Asset/ })
    .locator('xpath=..')
    .locator('select');
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
  await page.getByPlaceholder('Enter company email').fill(`pw.am.${stamp}@test.com`);
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
 * @param {string} name
 */
async function createAsset(page, name) {
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
  await page.locator('textarea[name="description"]').fill(name);
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
  expect(assetId, `Asset create for ${name} did not return an asset_id`).toBeTruthy();
  await expectToast(page, 'Asset created successfully!');
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
  return String(assetId);
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
    'Inspection Checklists has no response type the app can create. The doc-type API is GET-only.',
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
  await expect(page.locator('tbody tr').filter({ hasText: questionName })).toBeVisible({
    timeout: 20000,
  });
  state.questionName = questionName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function fillSpecificMapping(page, assetId) {
  await expect(page.getByRole('button', { name: 'Select Asset', exact: true })).toBeVisible();
  await selectNativeByLabelPart(assetTypeSelect(page), state.typeName, 'Asset type');
  await expect(page.getByText('Inspection Question Mapping')).toBeVisible();
  await expect(specificAssetSelect(page)).toBeEnabled();
  await selectNativeByLabelPart(specificAssetSelect(page), assetId, 'Specific asset');
  await expect(specificAssetSelect(page)).not.toHaveValue('');
  await page.getByRole('button', { name: 'Add New Row' }).click();
  const question = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Choose Inspection Question --' }),
  });
  await selectNativeByLabelPart(question, state.questionName, 'Inspection question');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function createSpecificMapping(page, assetId) {
  await openCreate(page);
  await fillSpecificMapping(page, assetId);
  await page.getByRole('button', { name: 'Save Mapping' }).click();
  await expectToast(page, 'Mapping saved successfully');
  await expect(page).toHaveURL(/\/asset-type-checklist-mapping$/);
  await filterByColumn(page, 'Asset Type', state.typeName);
  const row = namedRow(page, assetId);
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText('1 Questions');
  await expect(row).not.toContainText('All Assets of this Type');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function deleteMappingForAsset(page, assetId) {
  await openMappingList(page);
  await filterByColumn(page, 'Asset Type', state.typeName);
  const row = namedRow(page, assetId);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByText(/Successfully deleted 1 mapping/)).toBeVisible({ timeout: 20000 });
  await expect(row).toHaveCount(0);
}

test.describe('Asset Type - Inspection Checklist Mapping', () => {
  test('AM-01 AM-02 Open mapping list and columns', async ({ page }) => {
    await openMappingList(page);
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Name (Specific)' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Total Questions' })).toBeVisible();
  });

  test('AM-03 Mappings already on the screen stay', async ({ page }) => {
    await openMappingList(page);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    }
  });

  test('AM-04 Delete with nothing selected', async ({ page }) => {
    await openMappingList(page);
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('AM-05 Return to the Admin Dashboard', async ({ page }) => {
    await openMappingList(page);
    await gotoProtected(page, hubUrl);
    await expect(
      page.getByRole('heading', { name: 'Asset Type - Inspection Checklist Mapping', exact: true }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('AM-06 AM-07 AM-08 AM-09 Create form required fields and cancel', async ({ page }) => {
    await ensureChecklistQuestion(page);
    await ensureAssetType(page);
    await openCreate(page);
    await expect(page.getByRole('button', { name: 'Select Asset', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Asset', exact: true })).toBeVisible();
    await expect(page.getByText('Specific Asset (Optional)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Mapping' })).toBeDisabled();
    await selectNativeByLabelPart(assetTypeSelect(page), state.typeName, 'Asset type');
    await expect(page.getByText('Inspection Question Mapping')).toBeVisible();
    await expect(
      page.getByText('No questions mapped yet. Click "Add New Row" to start configuring inspection items.'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Save Mapping' }).click();
    await expectToast(page, 'Please add at least one question mapping');
    await expect(page.getByText('Create New Asset Type - Checklist Mapping', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/asset-type-checklist-mapping$/);
  });

  test('AM-10 Create the keeper specific-asset mapping', async ({ page }) => {
    await ensureChecklistQuestion(page);
    state.stayAssetId = await createAsset(page, stayDesc);
    await createSpecificMapping(page, state.stayAssetId);
  });

  test('AM-11 Keeper mapping is still there after a refresh', async ({ page }) => {
    await openMappingList(page);
    await filterByColumn(page, 'Asset Type', state.typeName);
    const row = namedRow(page, state.stayAssetId);
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText('1 Questions');
    await expect(row).not.toContainText('All Assets of this Type');
  });

  test('AM-12 AM-13 Open Edit Mapping and leave without saving', async ({ page }) => {
    await openMappingList(page);
    await filterByColumn(page, 'Asset Type', state.typeName);
    const row = namedRow(page, state.stayAssetId);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    await expect(page.getByText('Edit Mapping', { exact: true })).toBeVisible({ timeout: 20000 });
    await expect(assetTypeSelect(page).locator('option:checked')).toContainText(state.typeName);
    await expect(specificAssetSelect(page).locator('option:checked')).toContainText(state.stayAssetId);
    await expect(
      page.locator('select').filter({
        has: page.getByRole('option', { name: '-- Choose Inspection Question --' }),
      }).locator('option:checked'),
    ).toContainText(state.questionName);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/asset-type-checklist-mapping$/);
    await filterByColumn(page, 'Asset Type', state.typeName);
    await expect(namedRow(page, state.stayAssetId)).toContainText('1 Questions');
  });

  test('AM-14 AM-15 Delete only an extra disposable mapping', async ({ page }) => {
    await ensureChecklistQuestion(page);
    state.delAssetId = await createAsset(page, delDesc);
    await createSpecificMapping(page, state.delAssetId);
    await deleteMappingForAsset(page, state.delAssetId);
    await openMappingList(page);
    await filterByColumn(page, 'Asset Type', state.typeName);
    await expect(namedRow(page, state.stayAssetId)).toBeVisible();
    await expect(namedRow(page, state.delAssetId)).toHaveCount(0);
  });
});
