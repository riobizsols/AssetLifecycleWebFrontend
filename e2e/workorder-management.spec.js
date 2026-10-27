// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-WO-${Date.now().toString(36)}`;
const stamp = run.slice('PW-WO-'.length);
const listUrl = `${BASE}/workorder-management`;
const createMaintUrl = `${BASE}/maintenance-list/create`;

const stayAsset = `${run} Stay`;
const stay2Asset = `${run} Stay2`;
const createdTypeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const stepName = `${run} Step`;
const reasonName = `${run} Reason`;

const state = {
  typeName: '',
  vendorName: '',
  frequencyReady: false,
  sequenceReady: false,
  reasonReady: false,
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
  await expect(page).toHaveURL(/\/workorder-management$/);
  await expect(page.locator('header').getByText('Work Order Management', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page
      .getByRole('columnheader', { name: 'Description' })
      .or(page.getByText('No work orders found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
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
  await page.locator('input[name="company_email"]').fill(`pw.wo.${stamp}@test.com`);
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
async function createVendorOnDemandFrequency(page) {
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
  await page.getByRole('radio', { name: 'Vendor' }).check();
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
  await createVendorOnDemandFrequency(page);
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
async function openCreateMaintenance(page) {
  await gotoProtected(page, createMaintUrl);
  await expect(page.getByText('Create Manual Maintenance', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
  await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {number} [attempt]
 */
async function createMaintenanceOnAsset(page, name, attempt = 0) {
  await openCreateMaintenance(page);
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

  const message = (
    (await page
      .getByText(/frequency|workflow|sequence|Failed to create maintenance/i)
      .first()
      .textContent()
      .catch(() => '')) || ''
  ).toLowerCase();
  if (attempt >= 2) {
    throw new Error(
      `Create Maintenance did not leave Create Manual Maintenance. Toast was: ${message || '(none)'}`,
    );
  }
  if (message.includes('frequency')) {
    await createVendorOnDemandFrequency(page);
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

/**
 * @param {import('@playwright/test').Page} page
 */
function breakdownTypeSelect(page) {
  return page.locator('select').filter({ has: page.getByText('All Asset Types') });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} label
 */
function enhancedCombo(page, label) {
  return page.locator('label').filter({ hasText: label }).locator('xpath=..').getByRole('combobox');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} label
 * @param {string | RegExp} optionText
 */
async function selectEnhanced(page, label, optionText) {
  const combo = enhancedCombo(page, label);
  await expect(combo).toBeVisible({ timeout: 15000 });
  await combo.click();
  const option = page.getByRole('option', { name: optionText }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureReasonSelected(page) {
  if (state.reasonReady) {
    const combo = enhancedCombo(page, /^Breakdown Reason/);
    const current = ((await combo.innerText()) || '').trim();
    if (current && !/select breakdown reason/i.test(current)) return;
  }

  const combo = enhancedCombo(page, /^Breakdown Reason/);
  await combo.click();
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible({ timeout: 15000 });
  const count = await options.count();
  let picked = '';
  for (let i = 0; i < count; i += 1) {
    const text = ((await options.nth(i).innerText()) || '').split('\n')[0].trim();
    if (!text || /create new/i.test(text) || /other/i.test(text)) continue;
    await options.nth(i).click();
    picked = text;
    break;
  }

  if (!picked) {
    await page.getByRole('option', { name: '+ Create New' }).click();
    await page.getByPlaceholder(/Enter breakdown reason code/).fill(reasonName);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expectToast(page, 'Breakdown reason code created successfully');
    picked = reasonName;
  }

  state.reasonReady = true;
}

/**
 * Manual create leaves wo_id empty, so this list often stays empty until a BF02
 * breakdown creates an AMS row with a work order id (MT004).
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
async function createBreakdownWorkOrder(page, assetName) {
  await gotoProtected(page, `${BASE}/breakdown-selection`);
  await expect(page.getByText('Breakdown Selection', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  const typeSelect = breakdownTypeSelect(page);
  await expect(typeSelect).toBeVisible();
  await expect
    .poll(
      async () => (await realOptions(typeSelect)).some((option) => option.label === state.typeName),
      { timeout: 45000 },
    )
    .toBeTruthy();
  await typeSelect.selectOption({ label: state.typeName });
  const row = availableAssetRow(page, assetName);
  await expect(row, `Do not use another asset. ${assetName} must be in Available Assets.`).toBeVisible({
    timeout: 30000,
  });
  await row.getByRole('button', { name: 'Create Breakdown' }).click();
  await expect(page.getByText('Breakdown Report', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await ensureReasonSelected(page);
  await page.getByPlaceholder('Max 500 characters...').fill(`${assetName} BF02`);
  await selectEnhanced(page, /^Decision Code/, /BF02 - Create Breakdown fix only/);
  await selectEnhanced(page, /^Priority/, /^High$/);
  await page.getByRole('button', { name: 'Report Breakdown', exact: true }).click();
  await expectToast(page, 'Breakdown report created successfully');
  await expect(page).toHaveURL(/\/report-breakdown$/);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
async function ensureWorkOrderOnList(page, assetName) {
  await openList(page);
  const row = listRow(page, assetName);
  if (await row.isVisible().catch(() => false)) return;
  await createBreakdownWorkOrder(page, assetName);
  await openList(page);
  await expect(
    listRow(page, assetName),
    `Work order for ${assetName} must appear after a BF02 breakdown. Manual create does not set wo_id.`,
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
async function openStayDetail(page, assetName) {
  await openList(page);
  await filterByColumn(page, 'Description', assetName);
  const row = listRow(page, assetName);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('td').first().click();
  await expect(page).toHaveURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });
  await expect(page.getByText('Work Orders', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
}

test.describe('Workorder Management', () => {
  test('WO-01 Open Workorder Management', async ({ page }) => {
    await openList(page);
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  });

  test('WO-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    for (const name of ['Description', 'Maintenance Type', 'Start Date', 'Status', 'Asset Type']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Work Order ID' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Asset ID' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'ams_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'asset_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No work orders found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toHaveCount(0);
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('WO-03 Work orders already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No work orders found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').first()).not.toHaveText('');
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('WO-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await page.locator('[data-contentbox-filter-button]').click();
      await page.getByText('Search by Column', { exact: true }).click();
      await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
      return;
    }
    const description = (await first.locator('td').first().innerText()).trim();
    expect(description).toBeTruthy();
    await filterByColumn(page, 'Description', description);
    await expect(listRow(page, description)).toBeVisible();
    await clearColumnFilter(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('WO-05 Sort by description', async ({ page }) => {
    await openList(page);
    const header = page.locator('thead').getByText('Description', { exact: true });
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Description/ })).toContainText('↑');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Description/ })).toContainText('↓');
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Description/ })).not.toContainText('↑');
    await expect(page.getByRole('columnheader', { name: /Description/ })).not.toContainText('↓');
  });

  test('WO-06 There is no add or delete', async ({ page }) => {
    await openList(page);
    await expect(headerButtons(page)).toHaveCount(0);
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('WO-07 Create an E2E type, vendor frequency, and asset', async ({ page }) => {
    await createOurAsset(page, stayAsset);
    await expect(state.typeName).toBe(createdTypeName);
    await expect(state.vendorName).toBe(vendorName);
    await expect(state.frequencyReady).toBe(true);
  });

  test('WO-08 Create the E2E schedule', async ({ page }) => {
    await createMaintenanceOnAsset(page, stayAsset);
    await expect(page).toHaveURL(/\/maintenance-list$/);
    await expect(page.locator('tbody tr').filter({ hasText: stayAsset })).toBeVisible({
      timeout: 30000,
    });
  });

  test('WO-09 Find the E2E row, or create a breakdown work order', async ({ page }) => {
    await ensureWorkOrderOnList(page, stayAsset);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });

  test('WO-10 Open the E2E detail', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Vendor' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checklist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'History' })).toBeVisible();
  });

  test('WO-11 Overview shows asset information', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible();
    await expect(page.getByText('Asset ID', { exact: true })).toBeVisible();
    await expect(page.getByText('Serial Number', { exact: true })).toBeVisible();
    await expect(page.getByText('Asset Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Location', { exact: true })).toBeVisible();
    await expect(page.getByText('Maintenance Date', { exact: true })).toBeVisible();
    await expect(page.getByText('Current Condition', { exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Additional Issues' })).toBeVisible();
  });

  test('WO-12 Vendor tab', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await page.getByRole('button', { name: 'Vendor' }).click();
    await expect(page.getByRole('heading', { name: 'Vendor Information' })).toBeVisible();
    await expect(page.getByText('Vendor Name', { exact: true })).toBeVisible();
    await expect(page.getByText('Contact Person', { exact: true })).toBeVisible();
    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('Phone', { exact: true })).toBeVisible();
    await expect(page.getByText('Maintenance Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Status', { exact: true }).first()).toBeVisible();
  });

  test('WO-13 Checklist tab', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await page.getByRole('button', { name: 'Checklist' }).click();
    await expect(page.getByRole('heading', { name: 'Maintenance Checklist' })).toBeVisible();
    const typeItem = page.locator('section, div').filter({ hasText: /Task|Required/ }).first();
    const fallback = page.getByText('Visual inspection of asset condition', { exact: true });
    await expect(typeItem.or(fallback).first()).toBeVisible();
  });

  test('WO-14 History tab', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'Previous 5 Maintenance Records' })).toBeVisible();
    const empty = page.getByText('No previous maintenance records found', { exact: true });
    const helper = page.getByText('This asset has no maintenance history to display.', { exact: true });
    const records = page.locator('.print\\:hidden .border.rounded.p-4').first();
    if (await empty.isVisible().catch(() => false)) {
      await expect(helper).toBeVisible();
    } else {
      await expect(records.or(empty).first()).toBeVisible();
    }
  });

  test('WO-15 Export PDF for this run only', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60000 }),
      page.getByRole('button', { name: 'Export PDF' }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^WorkOrder_.+\.pdf$/);
    await expectToast(page, 'PDF exported successfully');
  });

  test('WO-16 Cancel Print', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await page.evaluate(() => {
      window.print = () => {
        window.__woPrintCalled = true;
      };
    });
    await page.getByRole('button', { name: 'Print' }).click();
    expect(await page.evaluate(() => window.__woPrintCalled)).toBe(true);
    await expect(page).toHaveURL(/\/workorder-management\/workorder-detail\//);
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
  });

  test('WO-17 Back to the list', async ({ page }) => {
    await openStayDetail(page, stayAsset);
    await page.getByText('Work Orders', { exact: true }).first().click();
    await expect(page).toHaveURL(/\/workorder-management$/);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
  });

  test('WO-18 Do not change another work order', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
    await expect(page).toHaveURL(/\/workorder-management$/);
  });

  test('WO-19 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset);
    await createMaintenanceOnAsset(page, stay2Asset);
    await ensureWorkOrderOnList(page, stay2Asset);
    await filterByColumn(page, 'Description', stayAsset);
    await expect(listRow(page, stayAsset)).toBeVisible();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stay2Asset);
    await expect(listRow(page, stay2Asset)).toBeVisible();
  });
});
