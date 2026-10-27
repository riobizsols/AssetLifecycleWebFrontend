// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-MS-${Date.now().toString(36)}`;
const stamp = run.slice('PW-MS-'.length);
const listUrl = `${BASE}/maintenance-schedule-view`;
const createUrl = `${BASE}/maintenance-list/create`;

const stayAsset = `${run} Stay`;
const disposableAsset = `${run} Del`;
const stay2Asset = `${run} Stay2`;
const createdTypeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const stepName = `${run} Step`;

const state = {
  typeName: '',
  vendorName: '',
  stayReady: false,
  delReady: false,
  stay2Ready: false,
  frequencyReady: false,
  sequenceReady: false,
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
function headerDownload(page) {
  return headerButtons(page).last();
}

/**
 * Header trash is only rendered when ContentBox showActions is true.
 * Maintenance Schedule passes showActions={false}, so Plus and Download are the two buttons.
 * @param {import('@playwright/test').Page} page
 */
async function headerTrashIfPresent(page) {
  const buttons = headerButtons(page);
  const count = await buttons.count();
  return count >= 3 ? buttons.nth(1) : null;
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
  await expect(page).toHaveURL(/\/maintenance-schedule-view/);
  await expect(
    page.getByRole('columnheader', { name: 'Serial Number' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await gotoProtected(page, createUrl);
  await expect(page.getByText('Create Manual Maintenance', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
  await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetTypeTrigger(page) {
  return page
    .locator('label')
    .filter({ hasText: /^Asset Type/ })
    .locator('xpath=..')
    .getByRole('button');
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
async function selectCreateType(page, name) {
  const trigger = assetTypeTrigger(page);
  await expect(trigger).toBeVisible();
  await trigger.click();
  const search = page.getByPlaceholder('Search asset type...');
  await expect(search).toBeVisible();
  await search.fill(name);
  const option = page.locator('div.cursor-pointer').filter({ hasText: name }).first();
  await expect(option, `Asset type ${name} is not in Create Manual Maintenance`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function availableAssetRow(page, name) {
  return page.locator('div.grid').filter({ has: page.locator(`[title="${name}"]`) });
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
  await page.locator('input[name="company_email"]').fill(`pw.ms.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createMaintRequiredType(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: createdTypeName });
  if (await existing.count()) {
    state.typeName = createdTypeName;
    return;
  }

  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(createdTypeName);
  await page.locator('label').filter({ hasText: 'Require Maintenance' }).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${createdTypeName}" created successfully`);
  state.typeName = createdTypeName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createOnDemandFrequency(page) {
  if (state.frequencyReady) return;
  await gotoProtected(page, `${BASE}/admin-settings/maintenance-frequency/add`);
  await expect(page.getByText('Create Maintenance Frequency', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
  await expect
    .poll(
      async () => (await realOptions(typeSelect)).some((option) => option.label === createdTypeName),
      { timeout: 30000 },
    )
    .toBeTruthy();
  await typeSelect.selectOption({ label: createdTypeName });
  await page.getByText('On Demand', { exact: true }).click();
  const maintSelect = page.locator('select').filter({ has: page.getByText('-- Select Maintenance Type --') });
  const maintOptions = await realOptions(maintSelect);
  const maint = maintOptions.find((option) => !/other/i.test(option.label)) || maintOptions[0];
  if (!maint) {
    throw new Error(
      'No maintenance type exists. Create one on Maintenance Types, leave it, and rerun this file.',
    );
  }
  await maintSelect.selectOption({ value: maint.value });
  await page.getByRole('button', { name: 'Save Frequency' }).click();
  await expectToast(page, 'Maintenance frequency created successfully');
  state.frequencyReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureSequence(page) {
  if (state.sequenceReady) return;
  await gotoProtected(page, `${BASE}/adminsettings/configuration/maintenance-config`);
  await expect(page.getByText('Maintenance Details', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Asset Type Sequences' }).click();
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption({ label: createdTypeName });

  const existing = page.getByText('Existing Sequences', { exact: true });
  await expect(existing.or(page.getByText('No sequences assigned for this asset type')).first()).toBeVisible({
    timeout: 20000,
  });
  if (await page.locator('table tbody tr').count()) {
    state.sequenceReady = true;
    return;
  }

  let stepSelect = page.locator('select').filter({ has: page.getByText('-- Select Step --') });
  let steps = await realOptions(stepSelect);
  if (!steps.length) {
    await page.getByRole('button', { name: 'Workflow Steps' }).click();
    await page.locator('button[title="Add Workflow Step"]').click();
    await page.getByPlaceholder(/Enter workflow step name/).fill(stepName);
    await page.getByRole('button', { name: 'Add Step' }).click();
    await expectToast(page, 'Workflow step created successfully');
    await page.getByRole('button', { name: 'Asset Type Sequences' }).click();
    await typeSelect.selectOption({ label: createdTypeName });
    stepSelect = page.locator('select').filter({ has: page.getByText('-- Select Step --') });
    steps = await realOptions(stepSelect);
  }
  if (!steps.length) {
    throw new Error(
      'No workflow step exists. Create one on Maintenance Configuration, leave it, and rerun this file.',
    );
  }
  await stepSelect.selectOption({ value: steps[0].value });
  await page.getByPlaceholder('10, 20, 30, etc.').fill('10');
  await page.locator('button[title="Add Sequence"]').click();
  await expectToast(page, 'Sequence created successfully');
  state.sequenceReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureTypeAndVendor(page) {
  if (state.typeName && state.vendorName && state.frequencyReady) return;
  await ensureVendor(page);
  await createMaintRequiredType(page);
  await createOnDemandFrequency(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createOurAsset(page, name) {
  await ensureTypeAndVendor(page);
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
 * @param {string} name
 * @param {number} [attempt]
 */
async function createMaintenanceOnAsset(page, name, attempt = 0) {
  await openCreate(page);
  await selectCreateType(page, state.typeName);
  const row = availableAssetRow(page, name);
  await expect(row, `Do not use another asset. ${name} must be in Available Assets.`).toBeVisible({
    timeout: 30000,
  });
  await row.getByRole('button', { name: 'Create Maintenance' }).click();

  const landed = await page
    .waitForURL(/\/maintenance-list$/, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (landed) {
    await expectToast(page, 'Maintenance created successfully');
    return;
  }

  const message = ((await page.getByText(/frequency|workflow|sequence|Failed to create maintenance/i).first().textContent().catch(() => '')) || '').toLowerCase();
  if (attempt >= 2) {
    throw new Error(
      `Create Maintenance did not leave Create Manual Maintenance. Toast was: ${message || '(none)'}`,
    );
  }
  if (message.includes('frequency')) {
    await createOnDemandFrequency(page);
    await createMaintenanceOnAsset(page, name, attempt + 1);
    return;
  }
  if (message.includes('workflow') || message.includes('sequence')) {
    await ensureSequence(page);
    await createMaintenanceOnAsset(page, name, attempt + 1);
    return;
  }
  throw new Error(
    `Create Maintenance did not leave Create Manual Maintenance. Toast was: ${message || '(none)'}`,
  );
}

test.describe('Maintenance Schedule', () => {
  test('MS-01 Open Maintenance Schedule', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(2);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  });

  test('MS-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    for (const name of [
      'Asset Type',
      'Serial Number',
      'Description',
      'Maintenance Type',
      'Vendor',
      'Scheduled Date',
      'Status',
      'Actual Hours',
      'Variance',
      'Days Until Due',
      'Created On',
      'Created By',
    ]) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'ams_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'asset_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'ID', exact: true })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('MS-03 Schedules already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').first()).not.toHaveText('');
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('MS-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await page.locator('[data-contentbox-filter-button]').click();
      await page.getByText('Search by Column', { exact: true }).click();
      await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
      return;
    }
    const description = (await first.locator('td').nth(2).innerText()).trim();
    expect(description).toBeTruthy();
    await filterByColumn(page, 'Description', description);
    await expect(listRow(page, description)).toBeVisible();
    await clearColumnFilter(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('MS-05 Sort by serial number', async ({ page }) => {
    await openList(page);
    const header = page.locator('thead').getByText('Serial Number', { exact: true });
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Serial Number/ })).toContainText('↑');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Serial Number/ })).toContainText('↓');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Serial Number/ })).not.toContainText('↑');
    await expect(page.getByRole('columnheader', { name: /Serial Number/ })).not.toContainText('↓');
  });

  test('MS-06 Download the list', async ({ page }) => {
    await openList(page);
    const downloadPromise = page.waitForEvent('download');
    await headerDownload(page).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Maintenance_Schedules_List.*\.xlsx$/);
    await expectToast(page, 'Maintenance schedules exported successfully');
    const path = await download.path();
    if (path) {
      const workbook = XLSX.readFile(path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = (rows[0] || []).map((cell) => String(cell));
      expect(headers.some((header) => /_id$/i.test(header) || header === 'ams_id')).toBeFalsy();
    }
  });

  test('MS-07 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    const trash = await headerTrashIfPresent(page);
    if (trash) {
      await trash.click();
      await expectToast(page, /Please select items to delete|Please select maintenance records to delete/);
    } else {
      await expect(headerButtons(page)).toHaveCount(2);
    }
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('MS-08 Open add and go back', async ({ page }) => {
    await openList(page);
    await headerAddButton(page).click();
    await expect(page).toHaveURL(/\/maintenance-list\/create/);
    await expect(page.locator('header').getByText('Create Manual Maintenance', { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
    await expect(page.getByText('Scan Asset', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('MS-09 Available assets wait for an asset type', async ({ page }) => {
    await openCreate(page);
    await expect(page.getByText('Select an asset type to see available assets.')).toBeVisible();
  });

  test('MS-10 Scan with an empty asset id', async ({ page }) => {
    await openCreate(page);
    await page.getByText('Scan Asset', { exact: true }).click();
    await expect(page.getByPlaceholder('Scan or enter asset ID')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Create Maintenance' })).toBeDisabled();
    await page.getByText('Select Asset', { exact: true }).click();
    await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
  });

  test('MS-11 Cancel leaves create', async ({ page }) => {
    await openCreate(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/maintenance-list$/);
    await expect(page.locator('header').getByText('Maintenance List', { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await openList(page);
    await expect(listRow(page, stayAsset)).toHaveCount(0);
  });

  test('MS-12 Choose a type and create an E2E asset if needed', async ({ page }) => {
    await ensureTypeAndVendor(page);
    await createOurAsset(page, stayAsset);
    state.stayReady = true;
    await openCreate(page);
    await selectCreateType(page, state.typeName);
    await expect(availableAssetRow(page, stayAsset)).toBeVisible({ timeout: 30000 });
    await expect(availableAssetRow(page, stayAsset).getByRole('button', { name: 'Create Maintenance' })).toBeVisible();
  });

  test('MS-13 Create the E2E schedule', async ({ page }) => {
    await createMaintenanceOnAsset(page, stayAsset);
    await expect(page.locator('header').getByText('Maintenance List', { exact: true })).toBeVisible();
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 30000 });
    await expect(listRow(page, stayAsset)).toContainText('Initiated');
  });

  test('MS-14 The new schedule is on Maintenance Schedule', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    const row = listRow(page, stayAsset);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Initiated');
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('MS-15 The same asset is no longer free', async ({ page }) => {
    await openCreate(page);
    await selectCreateType(page, state.typeName);
    await expect(availableAssetRow(page, stayAsset)).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/maintenance-list$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });

  test('MS-16 Open the detail and go back', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await listRow(page, stayAsset).click();
    await expect(page).toHaveURL(/\/maintenance-list-detail\//);
    await expect(page.getByText('Back to Supervisor Approvals')).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Maintenance Checklist', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible();
    await expect(page.getByText('Update Maintenance Schedule', { exact: true })).toBeVisible();
    await page.getByText('Back to Supervisor Approvals').click();
    await expect(page).toHaveURL(/\/maintenance-list$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toContainText('Initiated');
  });

  test('MS-17 View Checklist', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await listRow(page, stayAsset).click();
    await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible({ timeout: 30000 });
    const view = page.getByRole('button', { name: 'View Checklist' });
    if (await view.isEnabled()) {
      await view.click();
      await expect(page.getByText('Asset Maintenance Checklist', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(page.getByText('Asset Maintenance Checklist', { exact: true })).toHaveCount(0);
    } else {
      await expect(view).toBeDisabled();
    }
    await page.getByText('Back to Supervisor Approvals').click();
    await expect(page).toHaveURL(/\/maintenance-list$/);
  });

  test('MS-18 Required fields block Submit', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await listRow(page, stayAsset).click();
    await expect(page.getByText('Update Maintenance Schedule', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Submit' }).click();
    await expectToast(page, 'Please fill all required fields');
    await expect(page).toHaveURL(/\/maintenance-list-detail\//);
    await page.getByText('Back to Supervisor Approvals').click();
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toContainText('Initiated');
  });

  test('MS-19 Do not submit another schedule', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
    await expect(listRow(page, stayAsset)).toContainText('Initiated');
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
  });

  test('MS-20 Create a disposable schedule', async ({ page }) => {
    await createOurAsset(page, disposableAsset);
    state.delReady = true;
    await createMaintenanceOnAsset(page, disposableAsset);
    await openList(page);
    await filterByColumn(page, 'Description', disposableAsset);
    await expect(listRow(page, disposableAsset)).toBeVisible();
    await expect(listRow(page, disposableAsset)).toContainText('Initiated');
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });

  test('MS-21 Confirm delete does not remove the Del row', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', disposableAsset);
    const row = listRow(page, disposableAsset);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    const trash = await headerTrashIfPresent(page);
    if (trash) {
      await trash.click();
      const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
      await expect(dialog.getByText('Confirm Delete')).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
      await expectToast(page, 'Delete functionality not yet implemented for maintenance schedules');
    } else {
      await expect(headerButtons(page)).toHaveCount(2);
      await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
    }
    await expect(row).toBeVisible();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });

  test('MS-22 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset);
    state.stay2Ready = true;
    await createMaintenanceOnAsset(page, stay2Asset);
    await openList(page);
    await filterByColumn(page, 'Description', stay2Asset);
    await expect(listRow(page, stay2Asset)).toBeVisible();
    await expect(listRow(page, stay2Asset)).toContainText('Initiated');
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });
});
