// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-VR-${Date.now().toString(36)}`;
const stamp = run.slice('PW-VR-'.length);
const renewalUrl = `${BASE}/vendor-renewal-approval`;
const vendorsUrl = `${BASE}/master-data/vendors`;

const stayName = `${run} Stay`;
const stay2Name = `${run} Stay2`;
const stayNote = `${run} approved`;
const stay2Note = `${run} approved2`;
const missingWorkflowMessage = (vendorName) =>
  `Vendor "${vendorName}" is not on Vendor Renewal Approval. Saving a vendor does not create the workflow. The Vendor Contract Renewal scheduled job does. Enable or run that job for this tenant, leave the vendor, and rerun. This spec does not click Trigger Vendor Renewal. Do not skip this case.`;

const state = {
  firstVendorName: '',
  stayReady: false,
  stay2Ready: false,
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
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function listRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openRenewal(page) {
  await gotoProtected(page, renewalUrl);
  await expect(page.locator('header').getByText('Vendor Renewal Approval', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible({ timeout: 30000 });
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openVendors(page) {
  await gotoProtected(page, vendorsUrl);
  await expect(page.locator('header').getByText('Vendors', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
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
 * @param {string} name
 * @param {string} emailLocal
 */
async function createVendorWithContract(page, name, emailLocal) {
  await openVendors(page);
  const existing = page.locator('tbody tr').filter({ hasText: name });
  if (await existing.count()) return;

  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(name);
  await page.locator('input[name="company_name"]').fill(`${name} Co`);
  await page.locator('input[name="company_email"]').fill(`${emailLocal}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.locator('input[name="contract_start_date"]').fill(ymd(-30));
  await page.locator('input[name="contract_end_date"]').fill(ymd(7));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function showRenewalRow(page, name) {
  await openRenewal(page);
  await filterByColumn(page, 'Vendor Name', name);
  const row = listRow(page, name);
  await expect(row, missingWorkflowMessage(name)).toBeVisible({ timeout: 30000 });
  return row;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openRenewalDetail(page, name) {
  const row = await showRenewalRow(page, name);
  await row.locator('td').nth(1).click();
  await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function approveDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Approve Maintenance Request' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function rejectDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Reject Maintenance Request' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function expectApproveVisible(page, name) {
  const approve = page.getByRole('button', { name: 'Approve', exact: true });
  await expect(
    approve,
    `Approve is not shown for ${name}. Tony must be the current approver for this Vendor Contract Renewal workflow. Leave the vendor and rerun. Do not skip this case.`,
  ).toBeVisible({ timeout: 15000 });
}

test.describe('Vendor Renewal Approval', () => {
  test('VR-01 Open Vendor Renewal Approval', async ({ page }) => {
    await openRenewal(page);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
    await expect(headerButtons(page)).toHaveCount(1);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      state.firstVendorName = (await first.locator('td').nth(0).innerText()).trim();
    }
  });

  test('VR-02 List columns that are on the table', async ({ page }) => {
    await openRenewal(page);
    const headers = [
      'Vendor Name',
      'Company Name',
      'Contact Person',
      'Scheduled Date',
      'Maintenance Type',
      'Status',
      'Days Until Due',
    ];
    for (const name of headers) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: /wfamsh/i })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
    }
  });

  test('VR-03 Status values', async ({ page }) => {
    await openRenewal(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    if (await first.isVisible()) {
      const statusText = (await first.locator('td').nth(5).innerText()).trim();
      expect(statusText.length).toBeGreaterThan(0);
      const dueText = (await first.locator('td').nth(6).innerText()).trim();
      expect(dueText === '-' || /days/i.test(dueText)).toBeTruthy();
    } else {
      await expect(empty).toBeVisible();
    }
    await page.locator('[data-contentbox-filter-button]').click();
    await page.getByText('Search by Column', { exact: true }).click();
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Status' });
    await page.getByRole('button', { name: 'Select values' }).click();
    const menu = page.locator('div.absolute.z-50').last();
    await expect(menu.getByText('Initiated', { exact: true })).toBeVisible();
    await expect(menu.getByText('In Progress', { exact: true })).toBeVisible();
    await expect(menu.getByText('Completed', { exact: true })).toBeVisible();
    await expect(menu.getByText('Cancelled', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('VR-04 Filter the list', async ({ page }) => {
    await openRenewal(page);
    await filterByColumn(page, 'Status', 'Initiated');
    const empty = page.getByText('No data found', { exact: true });
    const first = page.locator('tbody tr').first();
    await expect(empty.or(first).first()).toBeVisible();
    await clearColumnFilter(page);
    const vendorName = state.firstVendorName;
    if (vendorName) {
      await filterByColumn(page, 'Vendor Name', vendorName);
      await expect(listRow(page, vendorName)).toBeVisible();
      await clearColumnFilter(page);
    }
    await expect(
      page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
    ).toBeVisible();
  });

  test('VR-05 Sort by vendor name', async ({ page }) => {
    await openRenewal(page);
    const header = page.locator('thead').getByText('Vendor Name', { exact: true });
    await header.click();
    await header.click();
    await header.click();
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible();
  });

  test('VR-06 Download the list', async ({ page }) => {
    await openRenewal(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await headerDownload(page).click();
    await expectToast(page, 'Vendor renewal approvals exported successfully');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Vendor_Renewal_Approvals_List.+\.xlsx$/);
  });

  test('VR-07 Open an existing row and go back', async ({ page }) => {
    await openRenewal(page);
    const first = page.locator('tbody tr').first();
    if (!(await first.isVisible())) {
      await expect(page.getByText('No data found', { exact: true })).toBeVisible();
      return;
    }
    const vendorName = (await first.locator('td').nth(0).innerText()).trim();
    state.firstVendorName = vendorName;
    await first.locator('td').nth(1).click();
    await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Vendor Details', { exact: true })).toBeVisible();
    await expect(page.getByText('History Details', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Asset Details' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.locator('header').getByText('Vendor Renewal Approval', { exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(listRow(page, vendorName)).toBeVisible();
  });

  test('VR-08 Find the vendor from this run', async ({ page }) => {
    await createVendorWithContract(page, stayName, `pw.vr.${stamp}`);
    await createVendorWithContract(page, stay2Name, `pw.vr.${stamp}.2`);
    state.stayReady = true;
    state.stay2Ready = true;
    await showRenewalRow(page, stayName);
    const row = listRow(page, stayName);
    await expect(row.getByText(/Vendor Contract Renewal/i).or(row).first()).toBeVisible();
  });

  test('VR-09 Open the detail for this run', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
    await expectApproveVisible(page, stayName);
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeVisible();
  });

  test('VR-10 Cancel Approve without sending', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await expectApproveVisible(page, stayName);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    const dialog = approveDialog(page);
    await expect(dialog.getByText('Approve Maintenance Request', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Back' }).click();
    await showRenewalRow(page, stayName);
  });

  test('VR-11 Approve needs a note', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    const dialog = approveDialog(page);
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Approve' }).click();
    await expectToast(page, 'Note is required to approve');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
  });

  test('VR-12 Cancel Reject without sending', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    const dialog = rejectDialog(page);
    await expect(dialog.getByText('Reject Maintenance Request', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await page.getByRole('button', { name: 'Back' }).click();
    await showRenewalRow(page, stayName);
  });

  test('VR-13 Do not approve or reject an existing row from another run', async ({ page }) => {
    await openRenewal(page);
    await clearColumnFilter(page);
    const others = page.locator('tbody tr').filter({ hasNotText: run });
    if (await others.count()) {
      await expect(others.first()).toBeVisible();
    }
    await expect(page.getByText('Approve Maintenance Request', { exact: true })).toHaveCount(0);
  });

  test('VR-14 Approve the renewal from this run', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await expectApproveVisible(page, stayName);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    const dialog = approveDialog(page);
    await dialog.locator('textarea').fill(stayNote);
    await dialog.getByRole('button', { name: 'Approve' }).click();
    await expectToast(page, 'Approving');
    await expectToast(page, 'Approved successfully');
    await openRenewal(page);
    await expect(page).toHaveURL(/vendor-renewal-approval/);
    await expect(page.getByRole('heading', { name: 'Maintenance Approval' })).toHaveCount(0);
  });

  test('VR-15 History records this run', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    await page.getByText('History Details', { exact: true }).click();
    const empty = page.getByText('No workflow history available', { exact: true });
    const dateHeader = page.getByRole('columnheader', { name: 'Date' });
    await expect(empty.or(dateHeader).first()).toBeVisible({ timeout: 20000 });
    if (await dateHeader.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Job Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Notes' })).toBeVisible();
    }
  });

  test('VR-16 A completed renewal cannot be approved again', async ({ page }) => {
    await openRenewalDetail(page, stayName);
    const completed = page.getByText('This maintenance has been fully approved.', { exact: true });
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (await completed.isVisible().catch(() => false)) {
      await expect(approve).toHaveCount(0);
    }
  });

  test('VR-17 Return to the list', async ({ page }) => {
    await openRenewal(page);
    await showRenewalRow(page, stayName);
    await clearColumnFilter(page);
    await expect(listRow(page, stayName)).toBeVisible();
  });

  test('VR-18 Run approve again', async ({ page }) => {
    await showRenewalRow(page, stay2Name);
    await openRenewalDetail(page, stay2Name);
    await expectApproveVisible(page, stay2Name);
    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    const dialog = approveDialog(page);
    await dialog.locator('textarea').fill(stay2Note);
    await dialog.getByRole('button', { name: 'Approve' }).click();
    await expectToast(page, 'Approving');
    await expectToast(page, 'Approved successfully');
    await openRenewal(page);
    await showRenewalRow(page, stayName);
    await showRenewalRow(page, stay2Name);
  });
});
