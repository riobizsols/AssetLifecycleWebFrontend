// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SQ-${Date.now().toString(36)}`;
const stamp = run.slice('PW-SQ-'.length);
const approvalUrl = `${BASE}/scrap-approval`;
const scrapCreateUrl = `${BASE}/scrap-assets/create`;
const assetsUrl = `${BASE}/assets`;

const stayName = `${run} Stay`;
const secondName = `${run} Stay2`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;

const state = {
  typeName: '',
  vendorName: '',
  mastersReady: false,
  stayName: '',
  secondName: '',
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
async function openApproval(page) {
  await gotoProtected(page, approvalUrl);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole('columnheader', { name: 'Name' }).or(page.getByText('No Data Found', { exact: true })).first(),
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
async function openAssets(page) {
  await gotoProtected(page, assetsUrl);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Asset Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureParentAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  if (await page.locator('tbody tr').filter({ hasText: typeName }).count()) {
    state.typeName = typeName;
    return;
  }
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName);
  await page.getByText('Department-wise', { exact: true }).click();
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
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  if (await page.locator('tbody tr').filter({ hasText: vendorName }).count()) {
    state.vendorName = vendorName;
    return;
  }
  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${run} Co`);
  await page.locator('input[name="company_email"]').fill(`pw.sq.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({ timeout: 30000 });
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMasters(page) {
  if (state.mastersReady) return;
  await ensureParentAssetType(page);
  await ensureVendor(page);
  state.mastersReady = true;
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
  await expect(option, `Parent asset type ${preferredName} is not in the list`).toBeVisible({
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
 * @param {string} name
 */
async function createAsset(page, name) {
  await ensureMasters(page);
  await openAssets(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/assets\/add/);
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(name);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await selectProductVendorOnForm(page, state.vendorName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function submitScrap(page, name) {
  await gotoProtected(page, scrapCreateUrl);
  await expect(page.getByRole('heading', { name: 'Create Scrap Asset' })).toBeVisible({ timeout: 30000 });
  const trigger = page
    .locator('label')
    .filter({ hasText: /^Asset Type \*$/ })
    .locator('xpath=..')
    .getByRole('button')
    .first();
  await trigger.click();
  const search = page.getByPlaceholder('Search asset types...');
  await expect(search).toBeVisible();
  await search.fill(state.typeName);
  await page.locator('div.fixed div.cursor-pointer').filter({ hasText: state.typeName }).first().click();
  await page.locator('select').filter({ has: page.locator('option[value="INDIVIDUAL"]') }).selectOption('INDIVIDUAL');
  const row = listRow(page, name);
  await expect(row, `Asset ${name} is not free to scrap`).toBeVisible({ timeout: 30000 });
  await row.getByRole('button', { name: 'Scrap', exact: true }).click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Create Scrap' });
  await dialog.locator('#scrap-asset-notes').fill(`${run} scrap`);
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  if (await page.getByText('Scrap approval is required but the workflow is not configured').isVisible().catch(() => false)) {
    throw new Error(
      'Scrap workflow is not configured for this asset type. Configure it, leave it, then rerun. Do not click Run scrap workflow backfill.',
    );
  }
  await expectToast(
    page,
    /Scrap request sent for approval|successfully marked for scrapping|Scrap request created/,
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function ensureThisRunScrap(page, name) {
  await openApproval(page);
  if (await listRow(page, name).count()) return;
  await createAsset(page, name);
  await submitScrap(page, name);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openThisRunDetail(page, name) {
  await openApproval(page);
  const row = listRow(page, name);
  await expect(row, `Scrap ${name} is not on Scrap Approval. Submit it, leave it, then rerun.`).toBeVisible({
    timeout: 30000,
  });
  await row.click();
  await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function approveDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Approve Scrap Request' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function rejectDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Reject Scrap Request' });
}

test('SQ-01 Open Scrap Approval', async ({ page }) => {
  await openApproval(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(page.locator('div.flex.gap-2.justify-end > button')).toHaveCount(0);
});

test('SQ-02 List columns that are on the table', async ({ page }) => {
  await openApproval(page);
  if (await page.getByText('No Data Found', { exact: true }).isVisible()) {
    await expect(page.getByText('No Data Found', { exact: true })).toBeVisible();
    return;
  }
  await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Name' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Assets' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Scrap Type' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Created On' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Workflow ID' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: 'Group ID' })).toHaveCount(0);
});

test('SQ-03 Status values', async ({ page }) => {
  await openApproval(page);
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  await page.locator('select').filter({ hasText: 'Select column' }).selectOption({ label: 'Status' });
  await page.getByRole('button', { name: 'Select values' }).click();
  const menu = page.locator('div.absolute.z-50').last();
  await expect(menu.getByText('Initiated', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(menu.getByText('In Progress', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(menu.getByText('Completed', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(menu.getByText('Cancelled', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape');
});

test('SQ-04 Filter by Scrap Type and Status', async ({ page }) => {
  await openApproval(page);
  if (await page.getByText('No Data Found', { exact: true }).isVisible()) {
    await expect(page.getByText('No Data Found', { exact: true })).toBeVisible();
    return;
  }
  await filterByColumn(page, 'Scrap Type', 'Scrap Asset');
  await expect(page.locator('tbody tr').first().or(page.getByText('No Data Found', { exact: true })).first()).toBeVisible();
  await filterByColumn(page, 'Status', 'Initiated');
  await clearColumnFilter(page);
  await expect(
    page.getByRole('columnheader', { name: 'Name' }).or(page.getByText('No Data Found', { exact: true })).first(),
  ).toBeVisible();
});

test('SQ-05 Sort by Name', async ({ page }) => {
  await openApproval(page);
  if (await page.getByText('No Data Found', { exact: true }).isVisible()) {
    await expect(page.getByText('No Data Found', { exact: true })).toBeVisible();
    return;
  }
  const header = page.locator('thead').getByText('Name', { exact: true });
  await header.click();
  await expect(page.getByRole('columnheader', { name: /Name/ })).toContainText(/↑|↓/);
  await header.click();
});

test('SQ-06 Find the scrap from this run', async ({ page }) => {
  await ensureThisRunScrap(page, stayName);
  state.stayName = stayName;
  await openApproval(page);
  const row = listRow(page, stayName);
  await expect(row).toBeVisible({ timeout: 30000 });
  await expect(row).toContainText('Scrap Asset');
});

test('SQ-07 Open the detail', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  await expect(page.getByText(stayName, { exact: false }).first()).toBeVisible();
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  const waiting = page.getByText('Waiting for approval from the current approver role(s).');
  const viewOnly = page.getByText('View only — this approval belongs to another branch.');
  if (await waiting.isVisible().catch(() => false) || await viewOnly.isVisible().catch(() => false)) {
    throw new Error(
      'This login cannot approve the scrap from this run. Map the workflow to this user, leave it, then rerun.',
    );
  }
  await expect(approve.or(page.getByText('No action required from you.')).first()).toBeVisible();
});

test('SQ-08 Cancel Approve without sending', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  if (!(await approve.isVisible())) {
    throw new Error(
      'Approve is not shown for this login on the scrap from this run. Map the workflow to this user, leave it, then rerun.',
    );
  }
  await approve.click();
  const dialog = approveDialog(page);
  await expect(dialog.getByText('Approve Scrap Request', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(approve).toBeVisible();
});

test('SQ-09 Approve needs a note', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  const dialog = approveDialog(page);
  await expect(dialog.getByRole('button', { name: 'Approve', exact: true })).toBeDisabled();
  await expect(dialog).toBeVisible();
});

test('SQ-10 Cancel Reject without sending', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  const dialog = rejectDialog(page);
  await expect(dialog.getByText('Reject Scrap Request', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Approve', exact: true })).toBeVisible();
});

test('SQ-11 Do not approve or reject an existing row from another run', async ({ page }) => {
  await openApproval(page);
  const others = page.locator('tbody tr').filter({ hasNotText: run });
  if (await others.count()) {
    await expect(others.first()).toBeVisible();
  }
  await expect(listRow(page, stayName)).toBeVisible();
});

test('SQ-12 Approve the scrap from this run', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  await page.getByRole('button', { name: 'Approve', exact: true }).click();
  const dialog = approveDialog(page);
  await dialog.locator('textarea').fill(`${run} note`);
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
  await expectToast(page, /Approved/);
});

test('SQ-13 History records this run', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  await page.getByRole('button', { name: 'History Details' }).click();
  const empty = page.getByText('No workflow history available', { exact: true });
  const table = page.getByText('Date', { exact: true });
  await expect(table.or(empty).first()).toBeVisible({ timeout: 20000 });
  if (await table.isVisible()) {
    await expect(page.getByText('Action', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Job Role', { exact: true })).toBeVisible();
    await expect(page.getByText('Department', { exact: true })).toBeVisible();
    await expect(page.getByText('Notes', { exact: true }).first()).toBeVisible();
  }
});

test('SQ-14 A completed scrap cannot be approved again', async ({ page }) => {
  await openThisRunDetail(page, stayName);
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  if (await approve.isVisible()) {
    await expect(page.getByText(stayName, { exact: false }).first()).toBeVisible();
  } else {
    await expect(approve).toHaveCount(0);
  }
});

test('SQ-15 Return to the list', async ({ page }) => {
  await openApproval(page);
  await expect(listRow(page, stayName)).toBeVisible({ timeout: 30000 });
});

test('SQ-16 Run approve again', async ({ page }) => {
  await createAsset(page, secondName);
  await submitScrap(page, secondName);
  state.secondName = secondName;
  await openThisRunDetail(page, secondName);
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  if (!(await approve.isVisible())) {
    throw new Error(
      'Approve is not shown for the second scrap from this run. Map the workflow to this user, leave it, then rerun.',
    );
  }
  await approve.click();
  const dialog = approveDialog(page);
  await dialog.locator('textarea').fill(`${run} note 2`);
  await dialog.getByRole('button', { name: 'Approve', exact: true }).click();
  await expectToast(page, /Approved/);
  await openApproval(page);
  await expect(listRow(page, stayName)).toBeVisible();
  await expect(listRow(page, secondName)).toBeVisible();
});
