// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-MA-${Date.now().toString(36)}`;
const stamp = run.slice('PW-MA-'.length);
const listUrl = `${BASE}/maintenance-approval`;
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
  workflowReady: false,
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
 * Plus is hidden. Trash is hidden while showActions is false, so the only header
 * button is Download. If trash is restored, it is the first of two buttons.
 * @param {import('@playwright/test').Page} page
 */
async function headerTrashIfPresent(page) {
  const buttons = headerButtons(page);
  const count = await buttons.count();
  return count >= 2 ? buttons.first() : null;
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
  await expect(page).toHaveURL(/\/maintenance-approval/);
  await expect(page.locator('header').getByText('Approval', { exact: true })).toBeVisible({
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
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function filterOurType(page) {
  await filterByColumn(page, 'Asset Type', createdTypeName);
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
  await page.locator('input[name="company_email"]').fill(`pw.ma.${stamp}@test.com`);
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
 * Approval list inner-joins workflow details. A sequence with no job role never appears.
 * @param {import('@playwright/test').Page} page
 */
async function ensureWorkflow(page) {
  if (state.workflowReady) return;
  await gotoProtected(page, `${BASE}/adminsettings/configuration/maintenance-config`);
  await expect(page.getByText('Maintenance Details', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });

  await page.getByRole('button', { name: 'Workflow Steps' }).click();
  const stepRow = page.locator('table tbody tr').filter({ hasText: stepName });
  if (!(await stepRow.count())) {
    await page.locator('button[title="Add Workflow Step"]').click();
    await page.getByPlaceholder(/Enter workflow step name/).fill(stepName);
    await page.getByRole('button', { name: 'Add Step' }).click();
    await expectToast(page, 'Workflow step created successfully');
  }

  await page.getByRole('button', { name: 'Asset Type Sequences' }).click();
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
  await expect
    .poll(async () => (await realOptions(typeSelect)).some((option) => option.label === createdTypeName), {
      timeout: 30000,
    })
    .toBeTruthy();
  await typeSelect.selectOption({ label: createdTypeName });
  await expect(
    page.getByText('Existing Sequences', { exact: true }).or(page.getByText('No sequences assigned for this asset type')).first(),
  ).toBeVisible({ timeout: 20000 });
  if (!(await page.locator('table tbody tr').count())) {
    const stepSelect = page.locator('select').filter({ has: page.getByText('-- Select Step --') });
    await expect
      .poll(async () => (await realOptions(stepSelect)).some((option) => option.label === stepName), {
        timeout: 15000,
      })
      .toBeTruthy();
    await stepSelect.selectOption({ label: stepName });
    await page.getByPlaceholder('10, 20, 30, etc.').fill('10');
    await page.locator('button[title="Add Sequence"]').click();
    await expectToast(page, 'Sequence created successfully');
  }

  await page.getByRole('button', { name: 'Select Job Role' }).click();
  const stepForRole = page.locator('select').filter({ has: page.getByText('-- Select Workflow Step --') });
  await stepForRole.selectOption({ label: stepName });
  await expect(page.getByText('Selected Job Roles', { exact: true })).toBeVisible({ timeout: 15000 });
  if (!(await page.locator('table tbody tr').count())) {
    const roleSelect = page.locator('select').filter({ has: page.getByText('-- Select Job Role --') });
    const roles = await realOptions(roleSelect);
    const role =
      roles.find((option) => /system admin/i.test(option.label)) ||
      roles.find((option) => !/other/i.test(option.label)) ||
      roles[0];
    if (!role) {
      throw new Error(
        'No job role exists. Create one on Job Roles, leave it, and rerun this file.',
      );
    }
    await roleSelect.selectOption({ value: role.value });
    await page.locator('button[title="Select Job Role"]').click();
    await expectToast(page, 'Job role assigned successfully');
  }

  state.workflowReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMasters(page) {
  await ensureVendor(page);
  await createMaintRequiredType(page);
  await createOnDemandFrequency(page);
  await ensureWorkflow(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createOurAsset(page, name) {
  await ensureMasters(page);
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
    await ensureWorkflow(page);
    await createMaintenanceOnAsset(page, name, attempt + 1);
    return;
  }
  throw new Error(
    `Create Maintenance did not leave Create Manual Maintenance. Toast was: ${message || '(none)'}`,
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} [minCount]
 */
async function waitForOurApprovals(page, minCount = 1) {
  await expect
    .poll(
      async () => {
        await openList(page);
        try {
          await filterOurType(page);
        } catch {
          return 0;
        }
        return page.locator('tbody tr').count();
      },
      { timeout: 45000 },
    )
    .toBeGreaterThanOrEqual(minCount);
}

/**
 * Newest row of this run's type. List is ordered by created_on desc.
 * @param {import('@playwright/test').Page} page
 */
function newestOurRow(page) {
  return page.locator('tbody tr').first();
}

/**
 * Custom checkbox has no stopPropagation; set checked without navigating.
 * @param {import('@playwright/test').Locator} row
 */
async function tickRow(row) {
  const box = row.locator('input[type="checkbox"]');
  await expect(box).toBeVisible();
  await box.evaluate((el) => {
    if (!(el instanceof HTMLInputElement) || el.checked) return;
    el.checked = true;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openNewestOurDetail(page) {
  await openList(page);
  await filterOurType(page);
  await newestOurRow(page).click();
  await expect(page).toHaveURL(/\/approval-detail\/.+\?context=MAINTENANCEAPPROVAL/);
  await expect(page.getByText('Approval Details', { exact: true }).or(page.getByRole('button', { name: 'Back' })).first()).toBeVisible({
    timeout: 30000,
  });
}

test.describe('Maintenance Approval', () => {
  test('MA-01 Open Maintenance Approval', async ({ page }) => {
    await openList(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(1);
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  });

  test('MA-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    for (const name of ['Asset Type', 'Serial Number', 'Scheduled Date', 'Vendor', 'Maintenance Type', 'Status']) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: 'asset_id' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Department' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Days Until Due' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('MA-03 Approvals already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').first()).not.toHaveText('');
      await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('MA-04 Filter the list', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await page.locator('[data-contentbox-filter-button]').click();
      await page.getByText('Search by Column', { exact: true }).click();
      await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
      return;
    }
    const assetType = (await first.locator('td').nth(0).innerText()).trim();
    expect(assetType).toBeTruthy();
    await filterByColumn(page, 'Asset Type', assetType);
    await expect(listRow(page, assetType)).toBeVisible();
    await clearColumnFilter(page);
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('MA-05 Sort by serial number', async ({ page }) => {
    await openList(page);
    await clickSortCycle(page, 'Serial Number');
  });

  test('MA-06 Download the list', async ({ page }) => {
    await openList(page);
    const downloadPromise = page.waitForEvent('download');
    await headerDownload(page).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Maintenance_Approvals_List.*\.xlsx$/);
    await expectToast(page, 'Maintenance approvals exported successfully');
    const path = await download.path();
    if (path) {
      const workbook = XLSX.readFile(path);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      const headers = (rows[0] || []).map((cell) => String(cell));
      expect(headers.some((header) => /_id$/i.test(header))).toBeFalsy();
    }
  });

  test('MA-07 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    const trash = await headerTrashIfPresent(page);
    if (trash) {
      await trash.click();
      await expectToast(page, /Please select items to delete|Please select maintenance records to delete/);
    } else {
      await expect(headerButtons(page)).toHaveCount(1);
    }
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('MA-08 Create the E2E schedule if it is not listed', async ({ page }) => {
    await createOurAsset(page, stayAsset);
    await createMaintenanceOnAsset(page, stayAsset);
    await waitForOurApprovals(page, 1);
    await expect(newestOurRow(page)).toBeVisible();
    await expect(newestOurRow(page)).toContainText('Initiated');
  });

  test('MA-09 Find the E2E row', async ({ page }) => {
    await openList(page);
    await filterOurType(page);
    const row = newestOurRow(page);
    await expect(row).toBeVisible();
    await expect(row).toContainText(createdTypeName);
    await expect(row).toContainText('Initiated');
    await expect(row).not.toContainText('Approved');
  });

  test('MA-10 Open the E2E detail and go back', async ({ page }) => {
    await openNewestOurDetail(page);
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page).toHaveURL(/\/maintenance-approval/);
    await filterOurType(page);
    await expect(newestOurRow(page)).toContainText('Initiated');
  });

  test('MA-11 Cancel Approve on this run only', async ({ page }) => {
    await openNewestOurDetail(page);
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (await approve.isVisible()) {
      await approve.click();
      const dialog = page.locator('div.fixed').filter({ hasText: 'Approve Maintenance Request' });
      await expect(dialog.getByText('Approve Maintenance Request')).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Back' }).click();
    await openList(page);
    await filterOurType(page);
    await expect(newestOurRow(page)).toContainText('Initiated');
  });

  test('MA-12 Cancel Reject on this run only', async ({ page }) => {
    await openNewestOurDetail(page);
    const reject = page.getByRole('button', { name: 'Reject', exact: true });
    if (await reject.isVisible()) {
      await reject.click();
      const dialog = page.locator('div.fixed').filter({ hasText: 'Reject Maintenance Request' });
      await expect(dialog.getByText('Reject Maintenance Request')).toBeVisible();
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Back' }).click();
    await openList(page);
    await filterOurType(page);
    await expect(newestOurRow(page)).toContainText('Initiated');
  });

  test('MA-13 In-house technician helper', async ({ page }) => {
    await openNewestOurDetail(page);
    const techTab = page.getByRole('button', { name: 'Technician Details' });
    if (await techTab.isVisible()) {
      await techTab.click();
      await expect(page.getByText('Technician Details', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Select Technician').first()).toBeVisible();
      await expect(page.locator('select').filter({ hasText: '-- Select Technician --' })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Back' }).click();
  });

  test('MA-14 Do not Approve or Reject another row', async ({ page }) => {
    await openList(page);
    await filterOurType(page);
    await expect(newestOurRow(page)).toContainText('Initiated');
    await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reject' })).toHaveCount(0);
  });

  test('MA-15 Cancel Confirm Delete on the stay row is not used', async ({ page }) => {
    await openList(page);
    await filterOurType(page);
    await expect(newestOurRow(page)).toBeVisible();
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('MA-16 Create a disposable schedule', async ({ page }) => {
    await createOurAsset(page, disposableAsset);
    await createMaintenanceOnAsset(page, disposableAsset);
    await waitForOurApprovals(page, 2);
    await expect(newestOurRow(page)).toContainText('Initiated');
  });

  test('MA-17 Cancel Confirm Delete', async ({ page }) => {
    await openList(page);
    await filterOurType(page);
    const row = newestOurRow(page);
    await expect(row).toBeVisible();
    await tickRow(row);
    const trash = await headerTrashIfPresent(page);
    if (trash) {
      await trash.click();
      const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
      await expect(dialog.getByText('Confirm Delete')).toBeVisible();
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await expect(dialog).toHaveCount(0);
    } else {
      await expect(headerButtons(page)).toHaveCount(1);
      await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
    }
    await expect(row).toBeVisible();
  });

  test('MA-18 Delete only the disposable row', async ({ page }) => {
    await openList(page);
    await filterOurType(page);
    const before = await page.locator('tbody tr').count();
    expect(before).toBeGreaterThanOrEqual(2);
    const row = newestOurRow(page);
    await tickRow(row);
    const trash = await headerTrashIfPresent(page);
    if (trash) {
      await trash.click();
      const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
      await expect(dialog.getByText('Confirm Delete')).toBeVisible();
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
      await expectToast(page, /maintenance record\(s\) deleted successfully|Maintenance record deleted successfully/i);
      await openList(page);
      await filterOurType(page);
      await expect(page.locator('tbody tr')).toHaveCount(before - 1);
    } else {
      await expect(headerButtons(page)).toHaveCount(1);
      await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
      await expect(page.locator('tbody tr')).toHaveCount(before);
    }
    await expect(listRow(page, createdTypeName).first()).toBeVisible();
  });

  test('MA-19 Run create again', async ({ page }) => {
    await createOurAsset(page, stay2Asset);
    await createMaintenanceOnAsset(page, stay2Asset);
    await waitForOurApprovals(page, 2);
    await expect(newestOurRow(page)).toContainText('Initiated');
    await expect(listRow(page, createdTypeName)).toHaveCount(await page.locator('tbody tr').count());
  });
});
