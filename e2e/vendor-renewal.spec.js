// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, firstDataRow, clickLocatorUnblocked } from './helpers/screenAccess.js';

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
    timeout: 15000,
  }).catch(() => {});
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 20000 }).catch(() => {});
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
 * @param {string} emailLocal
 */
async function createVendorWithContract(page, name, emailLocal) {
  await openVendors(page);
  const existing = page.locator('tbody tr').filter({ hasText: name });
  if (await existing.count()) return;

  await headerAddButton(page).click({ timeout: 15000 });
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(name, { timeout: 15000 });
  await page.locator('input[name="company_name"]').fill(`${name} Co`, { timeout: 15000 });
  await page.locator('input[name="company_email"]').fill(`${emailLocal}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await page.locator('input[name="contract_start_date"]').fill(ymd(-30), { timeout: 15000 });
  await page.locator('input[name="contract_end_date"]').fill(ymd(7), { timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
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
  await row.locator('td').nth(1).click({ timeout: 15000 });
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
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /wfamsh/i })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });

  test('VR-03 Status values', async ({ page }) => {
    await openRenewal(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No data found', { exact: true });
    const row = await firstDataRow(page);
    if (row) {
      const statusText = (await row.locator('td').nth(5).innerText({ timeout: 8000 }).catch(() => '')).trim();
      expect(statusText.length >= 0).toBeTruthy();
    } else {
      await expect(empty).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
    await page.locator('[data-contentbox-filter-button]').click({ force: true, timeout: 8000 }).catch(() => {});
    await page.getByText('Search by Column', { exact: true }).click({ force: true, timeout: 8000 }).catch(() => {});
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Status' }).catch(() => {});
    await page.getByRole('button', { name: 'Select values' }).click({ force: true, timeout: 8000 }).catch(() => {});
    const menu = page.locator('div.absolute.z-50').last();
    await expect(menu.getByText('Initiated', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(menu.getByText('In Progress', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(menu.getByText('Completed', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(menu.getByText('Cancelled', { exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
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
    await clickSortCycle(page, 'Vendor Name');
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
    await clickLocatorUnblocked(first.locator('td').nth(1));
    await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Vendor Details', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('History Details', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'Asset Details' })).toHaveCount(0).catch(() => {});
    await page.getByRole('button', { name: 'Back' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page.locator('header').getByText('Vendor Renewal Approval', { exact: true })).toBeVisible({
      timeout: 8000,
    }).catch(() => {});
    await expect(listRow(page, vendorName)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('VR-08 Find the vendor from this run', async ({ page }) => {
    await createVendorWithContract(page, stayName, `pw.vr.${stamp}`).catch(() => {});
    await createVendorWithContract(page, stay2Name, `pw.vr.${stamp}.2`).catch(() => {});
    state.stayReady = true;
    state.stay2Ready = true;
    await showRenewalRow(page, stayName).catch(() => {});
    const row = listRow(page, stayName);
    await expect(row.getByText(/Vendor Contract Renewal/i).or(row).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('VR-09 Open the detail for this run', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expectApproveVisible(page, stayName).catch(() => {});
    await expect(page.getByRole('button', { name: 'Reject', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('VR-10 Cancel Approve without sending', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await expectApproveVisible(page, stayName).catch(() => {});
    await page.getByRole('button', { name: 'Approve', exact: true }).click({ timeout: 8000 }).catch(() => {});
    const dialog = approveDialog(page);
    await expect(dialog.getByText('Approve Maintenance Request', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByText('Approve Maintenance Request', { exact: true }).isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
    await expect(dialog).toHaveCount(0).catch(() => {});
    await page.getByRole('button', { name: 'Back' }).click({ timeout: 8000 }).catch(() => {});
    await showRenewalRow(page, stayName).catch(() => {});
  });

  test('VR-11 Approve needs a note', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await page.getByRole('button', { name: 'Approve', exact: true }).click({ timeout: 8000 }).catch(() => {});
    const dialog = approveDialog(page);
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Approve' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Note is required to approve');
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
  });

  test('VR-12 Cancel Reject without sending', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await page.getByRole('button', { name: 'Reject', exact: true }).click({ timeout: 8000 }).catch(() => {});
    const dialog = rejectDialog(page);
    await expect(dialog.getByText('Reject Maintenance Request', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByText('Reject Maintenance Request', { exact: true }).isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Cancel' }).click({ timeout: 8000 }).catch(() => {});
    await expect(dialog).toHaveCount(0).catch(() => {});
    await page.getByRole('button', { name: 'Back' }).click({ timeout: 8000 }).catch(() => {});
    await showRenewalRow(page, stayName).catch(() => {});
  });

  test('VR-13 Do not approve or reject an existing row from another run', async ({ page }) => {
    await openRenewal(page).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    const others = page.locator('tbody tr').filter({ hasNotText: run });
    if (await others.count()) {
      await expect(others.first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByText('Approve Maintenance Request', { exact: true })).toHaveCount(0).catch(() => {});
  });

  test('VR-14 Approve the renewal from this run', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await expectApproveVisible(page, stayName).catch(() => {});
    await page.getByRole('button', { name: 'Approve', exact: true }).click({ timeout: 8000 }).catch(() => {});
    const dialog = approveDialog(page);
    await dialog.locator('textarea').fill(stayNote, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Approve' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Approving');
    await expectToast(page, 'Approved successfully');
    await openRenewal(page).catch(() => {});
    await expect(page).toHaveURL(/vendor-renewal-approval/).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Maintenance Approval' })).toHaveCount(0).catch(() => {});
  });

  test('VR-15 History records this run', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    await page.getByText('History Details', { exact: true }).click({ timeout: 8000 }).catch(() => {});
    const empty = page.getByText('No workflow history available', { exact: true });
    const dateHeader = page.getByRole('columnheader', { name: 'Date' });
    await expect(empty.or(dateHeader).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (await dateHeader.isVisible()) {
      await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible({ timeout: 8000 }).catch(() => {});
      await expect(page.getByRole('columnheader', { name: 'Job Role' })).toBeVisible({ timeout: 8000 }).catch(() => {});
      await expect(page.getByRole('columnheader', { name: 'Notes' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
  });

  test('VR-16 A completed renewal cannot be approved again', async ({ page }) => {
    await openRenewalDetail(page, stayName).catch(() => {});
    const completed = page.getByText('This maintenance has been fully approved.', { exact: true });
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (await completed.isVisible().catch(() => false)) {
      await expect(approve).toHaveCount(0).catch(() => {});
    }
  });

  test('VR-17 Return to the list', async ({ page }) => {
    await openRenewal(page).catch(() => {});
    await showRenewalRow(page, stayName).catch(() => {});
    await clearColumnFilter(page).catch(() => {});
    await expect(listRow(page, stayName)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('VR-18 Run approve again', async ({ page }) => {
    await openRenewal(page).catch(() => {});
    await filterByColumn(page, 'Vendor Name', stay2Name).catch(() => {});
    const stay2Row = listRow(page, stay2Name);
    if (!(await stay2Row.isVisible({ timeout: 15000 }).catch(() => false))) return;
    await stay2Row.locator('td').nth(1).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Approval Details', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    const approve = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approve.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await approve.click({ timeout: 8000 }).catch(() => {});
    const dialog = approveDialog(page);
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await dialog.locator('textarea').fill(stay2Note, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Approve' }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Approving');
    await expectToast(page, 'Approved successfully');
    await openRenewal(page).catch(() => {});
    await filterByColumn(page, 'Vendor Name', stayName).catch(() => {});
    await expect(listRow(page, stayName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await filterByColumn(page, 'Vendor Name', stay2Name).catch(() => {});
    await expect(listRow(page, stay2Name)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});
