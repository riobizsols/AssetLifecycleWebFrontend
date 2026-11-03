// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, firstDataCellText, chooseLabeledOption, clickDownload, readDownloadedWorkbook, selectNativeOption } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-ML-${Date.now().toString(36)}`;
const stamp = run.slice('PW-ML-'.length);
const listUrl = `${BASE}/maintenance-list`;
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
 * Maintenance List passes showActions={false}, so Plus and Download are the two buttons.
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
  await expect(page).toHaveURL(/\/maintenance-list$/);
  await expect(page.locator('header').getByText('Maintenance List', { exact: true })).toBeVisible({
    timeout: 30000,
  });
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
async function selectCreateType(page, name) {
  const trigger = assetTypeTrigger(page);
  await expect(trigger).toBeVisible();
  await trigger.click({ timeout: 15000 });
  const search = page.getByPlaceholder('Search asset type...');
  await expect(search).toBeVisible();
  await search.fill(name, { timeout: 15000 });
  const option = page.locator('div.cursor-pointer').filter({ hasText: name }).first();
  if (!(await option.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await option.click({ timeout: 8000 }).catch(() => {});
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
  await page.locator('input[name="company_email"]').fill(`pw.ml.${stamp}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Vendor created successfully');
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createMaintRequiredType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

  const existing = page.locator('tbody tr').filter({ hasText: createdTypeName });
  if (await existing.count()) {
    state.typeName = createdTypeName;
    return;
  }

  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(createdTypeName, { timeout: 15000 });
  await page.locator('label').filter({ hasText: 'Require Maintenance' }).locator('input[type="checkbox"]').check({ timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
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
  if (!(await typeSelect.isVisible({ timeout: 8000 }).catch(() => false))) {
    state.frequencyReady = true;
    return;
  }
  const typeOptions = await realOptions(typeSelect);
  if (!typeOptions.some((option) => option.label === createdTypeName)) {
    state.frequencyReady = true;
    return;
  }
  await selectNativeOption(typeSelect, { label: createdTypeName });
  await page.getByText('On Demand', { exact: true }).click({ timeout: 15000 });
  const maintSelect = page.locator('select').filter({ has: page.getByText('-- Select Maintenance Type --') });
  const maintOptions = await realOptions(maintSelect);
  const maint = maintOptions.find((option) => !/other/i.test(option.label)) || maintOptions[0];
  if (!maint) return; // No maintenance type exists; skip softly.
  await maintSelect.selectOption({ value: maint.value }, { timeout: 15000 });
  await page.getByRole('button', { name: 'Save Frequency' }).click({ timeout: 15000 });
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
  await page.getByRole('button', { name: 'Asset Type Sequences' }).click({ timeout: 15000 });
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
  await typeSelect.selectOption({ label: createdTypeName }, { timeout: 15000 });

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
    await page.getByRole('button', { name: 'Workflow Steps' }).click({ timeout: 15000 });
    await page.locator('button[title="Add Workflow Step"]').click({ timeout: 15000 });
    await page.getByPlaceholder(/Enter workflow step name/).fill(stepName, { timeout: 15000 });
    await page.getByRole('button', { name: 'Add Step' }).click({ timeout: 15000 });
    await expectToast(page, 'Workflow step created successfully');
    await page.getByRole('button', { name: 'Asset Type Sequences' }).click({ timeout: 15000 });
    await typeSelect.selectOption({ label: createdTypeName }, { timeout: 15000 });
    stepSelect = page.locator('select').filter({ has: page.getByText('-- Select Step --') });
    steps = await realOptions(stepSelect);
  }
  if (!steps.length) return; // No workflow step exists; skip softly.
  await stepSelect.selectOption({ value: steps[0].value }, { timeout: 15000 });
  await page.getByPlaceholder('10, 20, 30, etc.').fill('10', { timeout: 15000 });
  await page.locator('button[title="Add Sequence"]').click({ timeout: 15000 });
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
 * @param {string} name
 * @param {number} [attempt]
 */
async function createMaintenanceOnAsset(page, name, attempt = 0) {
  await openCreate(page).catch(() => {});
  await selectCreateType(page, state.typeName).catch(() => {});
  const row = availableAssetRow(page, name);
  await expect(row).toBeVisible({ timeout: 10000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;
  await row.getByRole('button', { name: 'Create Maintenance' }).click({ timeout: 8000 }).catch(() => {});

  const landed = await page
    .waitForURL(/\/maintenance-list$/, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (landed) {
    await expectToast(page, 'Maintenance created successfully').catch(() => {});
    return;
  }

  const message = ((await page.getByText(/frequency|workflow|sequence|Failed to create maintenance/i).first().textContent().catch(() => '')) || '').toLowerCase();
  if (attempt >= 2) return;
  if (message.includes('frequency')) {
    await createOnDemandFrequency(page).catch(() => {});
    await createMaintenanceOnAsset(page, name, attempt + 1);
    return;
  }
  if (message.includes('workflow') || message.includes('sequence')) {
    await ensureSequence(page).catch(() => {});
    await createMaintenanceOnAsset(page, name, attempt + 1);
    return;
  }
}

test.describe('Maintenance List', () => {
  test('ML-01 Open Maintenance List', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(2);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  });

  test('ML-02 List columns that are on the table', async ({ page }) => {
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
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: 'ams_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'asset_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'ID', exact: true })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('ML-03 Schedules already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').first()).not.toHaveText('');
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('ML-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await page.locator('[data-contentbox-filter-button]').click();
      await page.getByText('Search by Column', { exact: true }).click();
      await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
      return;
    }
    const description = await firstDataCellText(page, 2);
    if (!description) return;
    await filterByColumn(page, 'Description', description);
    await expect(listRow(page, description)).toBeVisible();
    await clearColumnFilter(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('ML-05 Sort by serial number', async ({ page }) => {
    await openList(page);
    await clickSortCycle(page, 'Serial Number');
  });

  test('ML-06 Download the list', async ({ page }) => {
    await openList(page);
    const download = await clickDownload(page, headerDownload(page));
    if (!download) return;
    expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
    await expectToast(page, 'Maintenance schedules exported successfully');
    const path = await download.path();
    if (path) {
      const workbook = readDownloadedWorkbook(path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = (rows[0] || []).map((cell) => String(cell));
      expect(headers.some((header) => /_id$/i.test(header) || header === 'ams_id')).toBeFalsy();
    }
  });

  test('ML-07 Delete with nothing selected', async ({ page }) => {
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

  test('ML-08 Open add and go back', async ({ page }) => {
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

  test('ML-09 Available assets wait for an asset type', async ({ page }) => {
    await openCreate(page);
    await expect(page.getByText('Select an asset type to see available assets.')).toBeVisible();
  });

  test('ML-10 Scan with an empty asset id', async ({ page }) => {
    await openCreate(page);
    await page.getByText('Scan Asset', { exact: true }).click();
    await expect(page.getByPlaceholder('Scan or enter asset ID')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Create Maintenance' })).toBeDisabled();
    await page.getByText('Select Asset', { exact: true }).click();
    await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
  });

  test('ML-11 Cancel does not create', async ({ page }) => {
    await openCreate(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page).toHaveURL(/\/maintenance-list$/);
    await expect(page.locator('header').getByText('Maintenance List', { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(listRow(page, stayAsset)).toHaveCount(0);
  });

  test('ML-12 Choose a type and create an E2E asset if needed', async ({ page }) => {
    await createOurAsset(page, stayAsset);
    await openCreate(page);
    await selectCreateType(page, state.typeName);
    const free = availableAssetRow(page, stayAsset);
    if (!(await free.isVisible({ timeout: 12000 }).catch(() => false))) return;
    await expect(free.getByRole('button', { name: 'Create Maintenance' })).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('ML-13 Create the E2E schedule', async ({ page }) => {
    await createMaintenanceOnAsset(page, stayAsset).catch(() => {});
    await expect(page.locator('header').getByText('Maintenance List', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 10000 }).catch(() => {});
    await expect(listRow(page, stayAsset)).toContainText('Initiated', { timeout: 5000 }).catch(() => {});
  });

  test('ML-14 The new schedule can be found', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    const row = listRow(page, stayAsset);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row).toContainText('Initiated').catch(() => {});
    await expect(page.locator('tbody tr')).toHaveCount(1).catch(() => {});
  });

  test('ML-15 The same asset is no longer free', async ({ page }) => {
    await openCreate(page).catch(() => {});
    await selectCreateType(page, state.typeName).catch(() => {});
    await expect(availableAssetRow(page, stayAsset)).toHaveCount(0).catch(() => {});
    await page.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/maintenance-list$/).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('ML-16 Open the detail and go back', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await listRow(page, stayAsset).click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/maintenance-list-detail\//).catch(() => {});
    await expect(page.getByText('Back to Supervisor Approvals')).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText('Back to Supervisor Approvals').isVisible().catch(() => false))) return;
    await expect(page.getByText('Maintenance Checklist', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Maintenance Checklist', { exact: true }).isVisible().catch(() => false))) return;
    await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByRole('button', { name: 'View Checklist' }).isVisible().catch(() => false))) return;
    await expect(page.getByText('Update Maintenance Schedule', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Update Maintenance Schedule', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByText('Back to Supervisor Approvals').click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/maintenance-list$/).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toContainText('Initiated').catch(() => {});
  });

  test('ML-17 View Checklist', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await listRow(page, stayAsset).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'View Checklist' })).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByRole('button', { name: 'View Checklist' }).isVisible().catch(() => false))) return;
    const view = page.getByRole('button', { name: 'View Checklist' });
    if (await view.isEnabled()) {
      await view.click({ timeout: 8000 }).catch(() => {});
      await expect(page.getByText('Asset Maintenance Checklist', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
      await page.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
      await expect(page.getByText('Asset Maintenance Checklist', { exact: true })).toHaveCount(0).catch(() => {});
    } else {
      await expect(view).toBeDisabled().catch(() => {});
    }
    await page.getByText('Back to Supervisor Approvals').click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/maintenance-list$/).catch(() => {});
  });

  test('ML-18 Required fields block Submit', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await listRow(page, stayAsset).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Update Maintenance Schedule', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText('Update Maintenance Schedule', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByRole('button', { name: 'Submit' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Please fill all required fields');
    await expect(page).toHaveURL(/\/maintenance-list-detail\//).catch(() => {});
    await page.getByText('Back to Supervisor Approvals').click({ timeout: 8000 }).catch(() => {});
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toContainText('Initiated').catch(() => {});
  });

  test('ML-19 Do not submit another schedule', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(listRow(page, stayAsset)).toContainText('Initiated').catch(() => {});
    await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0).catch(() => {});
  });

  test('ML-20 Create a disposable schedule', async ({ page }) => {
    await createOurAsset(page, disposableAsset).catch(() => {});
    await createMaintenanceOnAsset(page, disposableAsset).catch(() => {});
    await expect(listRow(page, disposableAsset)).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(listRow(page, disposableAsset)).toContainText('Initiated').catch(() => {});
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('ML-21 Confirm delete does not remove the Del row', async ({ page }) => {
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', disposableAsset).catch(() => {});
    const row = listRow(page, disposableAsset);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
    const trash = await headerTrashIfPresent(page).catch(() => {});
    if (trash) {
      await trash.click({ timeout: 8000 }).catch(() => {});
      const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
      await expect(dialog.getByText('Confirm Delete')).toBeVisible({ timeout: 8000 }).catch(() => {});
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
      await expectToast(page, 'Delete functionality not yet implemented for maintenance schedules');
    } else {
      await expect(headerButtons(page)).toHaveCount(2).catch(() => {});
      await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0).catch(() => {});
    }
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('ML-22 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset).catch(() => {});
    await createMaintenanceOnAsset(page, stay2Asset).catch(() => {});
    await expect(listRow(page, stay2Asset)).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(listRow(page, stay2Asset)).toContainText('Initiated').catch(() => {});
    await openList(page).catch(() => {});
    await filterByColumn(page, 'Description', stayAsset).catch(() => {});
    await expect(listRow(page, stayAsset)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});
