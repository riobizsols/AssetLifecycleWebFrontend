// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, openTitledScreen } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-EB-${Date.now().toString(36)}`;
const stamp = run.slice('PW-EB-'.length);
const listUrl = `${BASE}/employee-report-breakdown`;
const selectionUrl = `${BASE}/breakdown-selection2`;

const stayDescription = `${run} Stay`;
const stayUpdated = `${stayDescription} Updated`;
const disposableDescription = `${run} Del`;
const stay2Description = `${run} Stay2`;
const assetName = `${run} Asset`;
const createdTypeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const reasonName = `${run} Reason`;

const state = {
  typeName: '',
  vendorName: '',
  assetReady: false,
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
 * @param {import('@playwright/test').Locator} row
 */
function rowEdit(row) {
  return row.locator('button[title="View/Edit Details"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(page.locator('header').getByText('Employee Report Breakdown', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Description' }).or(page.getByText('No data found', { exact: true })),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openSelection(page) {
  await gotoProtected(page, selectionUrl);
  await expect(page.getByText('Breakdown Selection', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('My Assets', { exact: true })).toBeVisible();
  await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
  await expect(page.getByText('Scan Asset', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openSelectAsset(page) {
  await page.getByRole('button', { name: 'Select Asset', exact: true }).click();
  await expect(page.getByText('Available Assets', { exact: true })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetTypeTrigger(page) {
  return page.locator('label').filter({ hasText: /^Asset Type$/ }).locator('xpath=..').getByRole('button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function typeDropdownPanel(page) {
  return page.locator('div.fixed').filter({ has: page.getByPlaceholder(/Search asset type/i) });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function typeDropdownNames(page) {
  const trigger = assetTypeTrigger(page);
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await trigger.click();
  const panel = typeDropdownPanel(page);
  await expect(panel).toBeVisible();
  const names = await panel.locator('div.cursor-pointer span.truncate').evaluateAll((els) =>
    els.map((el) => (el.textContent || '').trim()).filter(Boolean),
  );
  await trigger.click();
  return names.filter((name) => name && name !== 'All Asset Types');
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
 * @param {RegExp} label
 */
function enhancedCombo(page, label) {
  return page.locator('label').filter({ hasText: label }).locator('xpath=..').getByRole('combobox');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureVendor(page) {
  if (state.vendorName) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })),
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
  await page.getByPlaceholder('Enter company email').fill(`pw.eb.${stamp}@test.com`);
  await page.getByPlaceholder('Enter contact person name').fill(`${run} Contact`);
  await page.getByPlaceholder('Enter contact number').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  state.vendorName = vendorName;
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
async function createOurAsset(page) {
  await openAddAsset(page);
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await expect(page.getByText('This asset will be created without a serial number.')).toBeVisible();
  await page.locator('textarea[name="description"]').fill(assetName);
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
async function createMaintRequiredType(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })),
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
  await gotoProtected(page, `${BASE}/admin-settings/maintenance-frequency/add`);
  await expect(page.getByText('Create Maintenance Frequency', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
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
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForTypeOnSelection(page, label) {
  await expect
    .poll(
      async () => {
        await openSelection(page);
        await openSelectAsset(page);
        const names = await typeDropdownNames(page);
        return names.includes(label);
      },
      { timeout: 45000 },
    )
    .toBeTruthy();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureTypeOnSelection(page) {
  if (state.typeName) return;
  await openSelection(page);
  await openSelectAsset(page);
  const names = await typeDropdownNames(page);
  const existing = names.find((name) => !/other/i.test(name));
  if (existing) {
    state.typeName = existing;
    return;
  }

  await createMaintRequiredType(page);
  await createOnDemandFrequency(page);
  await waitForTypeOnSelection(page, createdTypeName);
  state.typeName = createdTypeName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureOurAsset(page) {
  if (state.assetReady) return;
  await ensureVendor(page);
  await ensureTypeOnSelection(page);
  await createOurAsset(page);
  state.assetReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectOurType(page) {
  const trigger = assetTypeTrigger(page);
  await expect(trigger).toBeVisible();
  await trigger.click();
  const panel = typeDropdownPanel(page);
  await expect(panel).toBeVisible();
  await panel.getByPlaceholder(/Search asset type/i).fill(state.typeName);
  const option = panel
    .locator('div.cursor-pointer')
    .filter({ has: page.locator('span.truncate', { hasText: state.typeName }) })
    .first();
  await expect(option, `Asset type ${state.typeName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function ourAssetRow(page) {
  return page.locator('div.grid').filter({ has: page.locator(`[title="${assetName}"]`) });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreateOnOurAsset(page) {
  await openSelection(page);
  await openSelectAsset(page);
  await selectOurType(page);
  const row = ourAssetRow(page);
  await expect(row, `Do not use another asset. ${assetName} must be in Available Assets.`).toBeVisible({
    timeout: 30000,
  });
  await row.getByRole('button', { name: 'Create Breakdown' }).click();
  await expect(page.getByText('Breakdown Report', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Asset Details', { exact: true })).toBeVisible();
  await expect(page.getByText('Breakdown Details', { exact: true })).toBeVisible();
  await expect(page.getByText('Decision Code', { exact: true })).toHaveCount(0);
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
 * @param {import('@playwright/test').Page} page
 * @param {string} description
 */
async function fillAndSubmitBreakdown(page, description) {
  await ensureReasonSelected(page);
  await page.getByPlaceholder('Max 500 characters...').fill(description);
  await expect(page.getByText('Decision Code', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Report Breakdown', exact: true }).click();
  await expectToast(page, 'Breakdown report created successfully');
  await expect(page).toHaveURL(/\/employee-report-breakdown$/);
}

test.describe('Employee Report Breakdown', () => {
  test('EB-01 Open Employee Report Breakdown', async ({ page }) => {
    await openList(page);
    await expect(page).toHaveURL(/\/employee-report-breakdown/);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(2);
    await expect(page.locator('button').filter({ has: page.locator('svg.lucide-download') })).toHaveCount(0);
  });

  test('EB-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    for (const name of ['Reported By', 'Status', 'Description', 'Actions']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'abr_id' })).toHaveCount(0);
    const first = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible().catch(() => false)) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
      await expect(rowEdit(first)).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('EB-03 Reports already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible().catch(() => false)) {
      await expect(first.locator('td').nth(2)).not.toHaveText('');
      await expect(rowEdit(first)).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('EB-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') }).first();
    if (!(await first.isVisible().catch(() => false))) {
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

  test('EB-05 Sort by description', async ({ page }) => {
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

  test('EB-06 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('EB-07 Open add', async ({ page }) => {
    await openList(page);
    await headerAddButton(page).click();
    await expect(page).toHaveURL(/\/breakdown-selection2/);
    await expect(page.getByText('Breakdown Selection', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('My Assets', { exact: true })).toBeVisible();
    await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
    await expect(page.getByText('Scan Asset', { exact: true })).toBeVisible();
  });

  test('EB-08 My Assets without submitting', async ({ page }) => {
    await openSelection(page);
    await page.getByRole('button', { name: 'My Assets', exact: true }).click();
    await expect(page.getByText('My Assigned Assets', { exact: true })).toBeVisible();
    const empty = page.getByText('No assigned assets found', { exact: true });
    const named = page.getByText('Asset Type Name', { exact: true });
    await expect(empty.or(named)).toBeVisible({ timeout: 30000 });
  });

  test('EB-09 Scan with an empty asset id', async ({ page }) => {
    await openSelection(page);
    await page.getByRole('button', { name: 'Scan Asset', exact: true }).click();
    await expect(page.getByPlaceholder('Scan or enter asset ID')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Create Breakdown' })).toBeDisabled();
    await page.getByRole('button', { name: 'Select Asset', exact: true }).click();
    await expect(assetTypeTrigger(page)).toBeVisible();
  });

  test('EB-10 Create an E2E asset if needed', async ({ page }) => {
    await ensureOurAsset(page);
    await openSelection(page);
    await openSelectAsset(page);
    await selectOurType(page);
    await expect(ourAssetRow(page)).toBeVisible({ timeout: 30000 });
    await expect(ourAssetRow(page).getByRole('button', { name: 'Create Breakdown' })).toBeVisible();
  });

  test('EB-11 Cancel Breakdown Report', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByText('Breakdown Selection', { exact: true }).first()).toBeVisible({
      timeout: 30000,
    });
    await openList(page);
    await expect(listRow(page, stayDescription)).toHaveCount(0);
  });

  test('EB-12 Empty submit is blocked', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await page.getByRole('button', { name: 'Report Breakdown', exact: true }).click();
    await expectToast(
      page,
      /Please select a breakdown code|Please enter a description|No breakdown reason codes available/,
    );
    await expect(page.getByText('Breakdown Report', { exact: true }).first()).toBeVisible();
  });

  test('EB-13 Create a reason code if none exist', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await ensureReasonSelected(page);
    const combo = enhancedCombo(page, /^Breakdown Reason/);
    await expect(combo).not.toHaveText(/Select Breakdown Reason/i);
  });

  test('EB-14 Create the E2E employee report', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await fillAndSubmitBreakdown(page, stayDescription);
    await expect(listRow(page, stayDescription)).toBeVisible({ timeout: 30000 });
  });

  test('EB-15 The new report can be found', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    const row = listRow(page, stayDescription);
    await expect(row).toBeVisible();
    await expect(rowEdit(row)).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('EB-16 Cancel Edit', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await rowEdit(listRow(page, stayDescription)).click();
    await expect(page.getByText('Edit Breakdown Report', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Decision Code', { exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await expect(page).toHaveURL(/\/employee-report-breakdown$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await expect(listRow(page, stayDescription)).toBeVisible();
    await expect(listRow(page, stayUpdated)).toHaveCount(0);
  });

  test('EB-17 Update the E2E report', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await rowEdit(listRow(page, stayDescription)).click();
    await expect(page.getByText('Edit Breakdown Report', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Decision Code', { exact: true })).toHaveCount(0);
    await page.getByPlaceholder('Enter breakdown description').fill(stayUpdated);
    await page.getByRole('button', { name: 'Update Breakdown Report' }).click();
    await expectToast(page, 'Breakdown report updated successfully');
    await expect(page).toHaveURL(/\/employee-report-breakdown$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 30000 });
  });

  test('EB-18 Do not confirm or reopen another report', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await expect(page.getByText('Confirm Resolution')).toHaveCount(0);
    await expect(page.getByText('Reopen Ticket')).toHaveCount(0);
  });

  test('EB-19 Create a disposable employee report', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await fillAndSubmitBreakdown(page, disposableDescription);
    await expect(listRow(page, disposableDescription)).toBeVisible({ timeout: 30000 });
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('EB-20 Delete on this screen may not remove the row', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', disposableDescription);
    const row = listRow(page, disposableDescription);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toBeVisible();
    await headerTrash(page).click();
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toBeVisible();
  });

  test('EB-21 Remove the disposable row from Report Breakdown', async ({ page }) => {
    const opened = await openTitledScreen(page, '/report-breakdown', 'Report Breakdown');
    if (!opened) {
      await openList(page);
      await filterByColumn(page, 'Description', disposableDescription);
      await expect(listRow(page, disposableDescription)).toBeVisible();
      return;
    }

    await expect(page).toHaveURL(/\/report-breakdown$/);
    await filterByColumn(page, 'Description', disposableDescription);
    const row = listRow(page, disposableDescription);
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, 'Successfully deleted 1 breakdown report(s)');
    await expect(row).toHaveCount(0);

    await openList(page);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await expect(listRow(page, disposableDescription)).toHaveCount(0);
  });

  test('EB-22 Run create again', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await fillAndSubmitBreakdown(page, stay2Description);
    await expect(listRow(page, stay2Description)).toBeVisible({ timeout: 30000 });
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stay2Description);
    await expect(listRow(page, stay2Description)).toBeVisible();
  });
});
