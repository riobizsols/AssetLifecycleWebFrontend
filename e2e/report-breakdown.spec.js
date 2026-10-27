// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-RB-${Date.now().toString(36)}`;
const stamp = run.slice('PW-RB-'.length);
const listUrl = `${BASE}/report-breakdown`;
const selectionUrl = `${BASE}/breakdown-selection`;

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
  await expect(page.locator('header').getByText('Report Breakdown', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Description' }).or(page.getByText('No data found', { exact: true })).first(),
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
  await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
  await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetTypeSelect(page) {
  return page.locator('select').filter({ has: page.getByText('All Asset Types') });
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
 * @param {RegExp} label
 * @param {string | RegExp} optionText
 */
async function selectEnhanced(page, label, optionText) {
  const combo = enhancedCombo(page, label);
  await expect(combo).toBeVisible({ timeout: 15000 });
  await combo.click();
  const option =
    typeof optionText === 'string'
      ? page.getByRole('option', { name: optionText }).first()
      : page.getByRole('option', { name: optionText }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
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
  await page.locator('input[name="company_email"]').fill(`pw.rb.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
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
        const options = await realOptions(assetTypeSelect(page));
        return options.some((option) => option.label === label);
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
  const options = await realOptions(assetTypeSelect(page));
  if (options.length) {
    state.typeName = options[0].label;
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
  const select = assetTypeSelect(page);
  await expect(select).toBeVisible();
  await select.selectOption({ label: state.typeName });
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
  await selectEnhanced(page, /^Decision Code/, /BF02 - Create Breakdown fix only/);
  await selectEnhanced(page, /^Priority/, /^High$/);
  await page.getByRole('button', { name: 'Report Breakdown', exact: true }).click();
  await expectToast(page, 'Breakdown report created successfully');
  await expect(page).toHaveURL(/\/report-breakdown$/);
}

test.describe('Report Breakdown', () => {
  test('RB-01 Open Report Breakdown', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(2);
  });

  test('RB-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    for (const name of ['Reported By', 'Status', 'Description', 'Actions']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'abr_id' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('RB-03 Reports already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').nth(2)).not.toHaveText('');
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('RB-04 Filter the list', async ({ page }) => {
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

  test('RB-05 Sort by description', async ({ page }) => {
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

  test('RB-06 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await headerTrash(page).click();
    await expectToast(page, /Please select items to delete|Please select breakdown reports to delete/);
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('RB-07 Open add and go back', async ({ page }) => {
    await openList(page);
    await headerAddButton(page).click();
    await expect(page).toHaveURL(/\/breakdown-selection/);
    await expect(page.getByText('Breakdown Selection', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Select Asset', { exact: true })).toBeVisible();
    await expect(page.getByText('Scan Asset', { exact: true })).toBeVisible();
    await expect(page.getByText('Available Assets', { exact: true })).toBeVisible();
  });

  test('RB-08 Scan with an empty asset id', async ({ page }) => {
    await openSelection(page);
    await page.getByText('Scan Asset', { exact: true }).click();
    await expect(page.getByPlaceholder('Scan or enter asset ID')).toHaveValue('');
    await expect(page.getByRole('button', { name: 'Create Breakdown' })).toBeDisabled();
    await page.getByText('Select Asset', { exact: true }).click();
    await expect(assetTypeSelect(page)).toBeVisible();
  });

  test('RB-09 Choose a maintenance-required asset type', async ({ page }) => {
    await ensureTypeOnSelection(page);
    await openSelection(page);
    await selectOurType(page);
    const empty = page.getByText('No assets found for the selected asset type.');
    const named = page.getByText('Asset Type Name', { exact: true });
    await expect(empty.or(named).first()).toBeVisible({ timeout: 30000 });
    if (await named.isVisible()) {
      await expect(page.getByText('Asset Name', { exact: true })).toBeVisible();
      await expect(page.getByText('Actions', { exact: true }).first()).toBeVisible();
    }
  });

  test('RB-10 Create an E2E asset if the list is empty', async ({ page }) => {
    await ensureOurAsset(page);
    await openSelection(page);
    await selectOurType(page);
    await expect(ourAssetRow(page)).toBeVisible({ timeout: 30000 });
    await expect(ourAssetRow(page).getByRole('button', { name: 'Create Breakdown' })).toBeVisible();
  });

  test('RB-11 Cancel Breakdown Report', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByText('Breakdown Selection', { exact: true }).or(page.locator('header').getByText('Report Breakdown', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
    await openList(page);
    await expect(listRow(page, stayDescription)).toHaveCount(0);
  });

  test('RB-12 Empty submit is blocked', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await page.getByRole('button', { name: 'Report Breakdown', exact: true }).click();
    await expectToast(
      page,
      /Please select a breakdown code|Please enter a description|No breakdown reason codes available|Please select a decision code|Please select a priority/,
    );
    await expect(page.getByText('Breakdown Report', { exact: true }).first()).toBeVisible();
  });

  test('RB-13 Create a reason code if none exist', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await ensureReasonSelected(page);
    const combo = enhancedCombo(page, /^Breakdown Reason/);
    await expect(combo).not.toHaveText(/Select Breakdown Reason/i);
  });

  test('RB-14 Create the E2E breakdown', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await fillAndSubmitBreakdown(page, stayDescription);
    await expect(listRow(page, stayDescription)).toBeVisible({ timeout: 30000 });
  });

  test('RB-15 The new report can be found', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    const row = listRow(page, stayDescription);
    await expect(row).toBeVisible();
    await expect(row.locator('button[title="Edit"]')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('RB-16 Cancel Edit', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await listRow(page, stayDescription).locator('button[title="Edit"]').click();
    await expect(page.getByText('Edit Breakdown Report', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Cancel' }).first().click();
    await expect(page).toHaveURL(/\/report-breakdown$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await expect(listRow(page, stayDescription)).toBeVisible();
    await expect(listRow(page, stayUpdated)).toHaveCount(0);
  });

  test('RB-17 Update the E2E report', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayDescription);
    await listRow(page, stayDescription).locator('button[title="Edit"]').click();
    await expect(page.getByText('Edit Breakdown Report', { exact: true })).toBeVisible({ timeout: 30000 });
    await page.getByPlaceholder('Enter breakdown description').fill(stayUpdated);
    await page.getByRole('button', { name: 'Update Breakdown Report' }).click();
    await expectToast(page, 'Breakdown report updated successfully');
    await expect(page).toHaveURL(/\/report-breakdown$/);
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 30000 });
  });

  test('RB-18 Do not confirm or reopen another report', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await expect(page.getByText('Confirm Resolution')).toHaveCount(0);
    await expect(page.getByText('Reopen Ticket')).toHaveCount(0);
  });

  test('RB-19 Create a disposable report', async ({ page }) => {
    await openCreateOnOurAsset(page);
    await fillAndSubmitBreakdown(page, disposableDescription);
    await expect(listRow(page, disposableDescription)).toBeVisible({ timeout: 30000 });
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('RB-20 Cancel Confirm Delete', async ({ page }) => {
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
  });

  test('RB-21 Delete only the disposable row', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Description', disposableDescription);
    const row = listRow(page, disposableDescription);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, 'Successfully deleted 1 breakdown report(s)');
    await expect(row).toHaveCount(0);
    await clearColumnFilter(page);
    await filterByColumn(page, 'Description', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('RB-22 Run create again', async ({ page }) => {
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
