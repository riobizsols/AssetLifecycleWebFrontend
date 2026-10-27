// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-HA-${Date.now().toString(36)}`;
const approvalsUrl = `${BASE}/tech-cert-approvals`;
const uploadUrl = `${BASE}/technician-certificates`;
const certificationsUrl = `${BASE}/certifications`;

const stayCertName = `${run} Stay`;
const stayCertNumber = `${run}-S`;
const delCertName = `${run} Del`;
const delCertNumber = `${run}-D`;
const approveCertName = `${run} Approve`;
const approveCertNumber = `${run}-A`;
const rejectCertName = `${run} Reject`;
const rejectCertNumber = `${run}-R`;
const stay2CertName = `${run} Stay2`;
const stay2CertNumber = `${run}-S2`;

const state = {
  stayReady: false,
};

/**
 * @param {number} [offsetDays]
 */
function ymd(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const stayDate = ymd(0);
const stayExpiry = ymd(365);
const delDate = ymd(-14);
const delExpiry = ymd(200);
const approveDate = ymd(-21);
const approveExpiry = ymd(180);
const rejectDate = ymd(-30);
const rejectExpiry = ymd(150);
const stay2Date = ymd(-7);
const stay2Expiry = ymd(220);

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
 * @param {string} label
 */
function labeledSelect(page, label) {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .locator('select')
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
 * @param {string} name
 */
function pdfFile(name) {
  return {
    name,
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n'),
  };
}

/**
 * @param {import('@playwright/test').Page} page
 */
function approvalsToolbar(page) {
  return page.locator('div.flex.items-center.justify-end.mb-4');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function filterButton(page) {
  return approvalsToolbar(page).locator('button[title="Filter"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function deleteButton(page) {
  return approvalsToolbar(page).locator('button[title="Delete"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openApprovals(page) {
  await gotoProtected(page, approvalsUrl);
  await expect(page).toHaveURL(/\/tech-cert-approvals$/);
  await expect(page.getByRole('heading', { name: 'HR/Manager Approval' })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page
      .getByRole('columnheader', { name: 'Employee' })
      .or(page.getByText('No pending approvals.', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCertificateApprovalsTab(page) {
  await openApprovals(page);
  await page.getByRole('button', { name: 'Certificate Approvals' }).click();
  await expect(filterButton(page)).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterByColumnText(page, column, value) {
  if (!(await page.getByRole('button', { name: 'Clear', exact: true }).isVisible().catch(() => false))) {
    await filterButton(page).click();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
  }
  const chip = page.locator('div.flex.items-center.gap-2.border').first();
  await chip.locator('select').selectOption({ label: column });
  await chip.locator('input[placeholder="Search value"]').fill(value);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function clearFilter(page) {
  const clear = page.getByRole('button', { name: 'Clear', exact: true });
  if (await clear.isVisible().catch(() => false)) {
    await clear.click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} number
 */
async function createCertificateType(page, name, number) {
  await gotoProtected(page, certificationsUrl);
  await expect(page.locator('header').getByText('Certifications', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Certificate', exact: true }).click();
  await expect(page.getByText('Existing Certificates', { exact: true })).toBeVisible();
  const existing = page.locator('tbody tr').filter({ hasText: name });
  if (await existing.count()) return;
  const toolbar = page.locator('h2').filter({ hasText: 'Existing Certificates' }).locator('xpath=../..');
  await toolbar.locator('button[title="Add"]').click();
  await expect(page.getByText('Add New Certificate', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Enter certificate name').fill(name);
  await page.getByPlaceholder('Enter certificate number').fill(number);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expectToast(page, 'Certificate created successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openUploadForm(page) {
  await gotoProtected(page, uploadUrl);
  await expect(page.getByRole('heading', { name: 'Technician Certificates' })).toBeVisible({
    timeout: 30000,
  });
  const add = page.locator('h2').filter({ hasText: 'Uploaded Certificates' }).locator('xpath=..').locator('button[title="Add"]');
  if (await add.count()) {
    await add.click();
  }
  await expect(page.locator('label').filter({ hasText: /^Employee Name$/ })).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function pickEmployee(page) {
  const select = labeledSelect(page, 'Employee Name');
  await expect
    .poll(async () => (await realOptions(select)).length, { timeout: 30000 })
    .toBeGreaterThan(0);
  const options = await realOptions(select);
  const pick = options.find((option) => !/other/i.test(option.label)) || options[0];
  if (!pick) {
    throw new Error('No employee exists. Create one on Users, leave it, and rerun this file.');
  }
  await select.selectOption({ value: pick.value });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} certName
 */
async function pickCertificate(page, certName) {
  const select = labeledSelect(page, 'Certificate Name');
  await expect
    .poll(
      async () => {
        const options = await realOptions(select);
        return options.some((option) => option.label.includes(certName));
      },
      { timeout: 30000 },
    )
    .toBeTruthy();
  const options = await realOptions(select);
  const match = options.find((option) => option.label.includes(certName));
  if (!match) {
    throw new Error(
      `Certificate ${certName} is not in Certificate Name. Create it on Certifications, leave it, and rerun this file.`,
    );
  }
  await select.selectOption({ value: match.value });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ certName: string, date: string, expiry: string, fileName: string }} details
 */
async function uploadCertificate(page, details) {
  await openUploadForm(page);
  await pickEmployee(page);
  await pickCertificate(page, details.certName);
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill(details.date);
  await dateInputs.nth(1).fill(details.expiry);
  await page.locator('input[type="file"]').setInputFiles(pdfFile(details.fileName));
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expectToast(page, 'Certificate uploaded successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} certName
 */
async function waitForPendingRow(page, certName) {
  await expect
    .poll(
      async () => {
        await openCertificateApprovalsTab(page);
        return listRow(page, certName).isVisible().catch(() => false);
      },
      { timeout: 45000 },
    )
    .toBeTruthy();
}

test.describe('HR/Manager Approval', () => {
  test('HA-01 Open HR/Manager Approval', async ({ page }) => {
    await openApprovals(page);
    await expect(
      page.getByText('Review technician certificates, manage technicians, and monitor activity.', {
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Certificate Approvals' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Certificate List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician Ratings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician Job History' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upcoming Jobs' })).toBeVisible();
    await expect(filterButton(page)).toBeVisible();
    await expect(deleteButton(page)).toBeVisible();
    await expect(approvalsToolbar(page).locator('button[title="Add"]')).toHaveCount(0);
    await expect(headerAddButton(page)).toHaveCount(0);
  });

  test('HA-02 Pending list columns that are on the table', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    const empty = page.getByText('No pending approvals.', { exact: true });
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      await expect(deleteButton(page)).toBeDisabled();
      return;
    }
    for (const name of ['Employee', 'Certificate', 'Certificate Date', 'Expiry Date', 'Status', 'File', 'Action']) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible();
    }
    const first = page.locator('tbody tr').first();
    await expect(first.locator('input[type="checkbox"]')).toBeVisible();
    await expect(first.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Reject' })).toBeVisible();
    await expect(deleteButton(page)).toBeDisabled();
  });

  test('HA-03 Pending rows already on the screen', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No pending approvals.', { exact: true });
    if (await first.isVisible()) {
      await expect(first.getByText(/Approval Pending|Approved|Rejected/)).toBeVisible();
      await expect(first.getByRole('button', { name: 'Approve' })).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('HA-04 Filter the pending list', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await filterButton(page).click();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      const certText = ((await first.locator('td').nth(2).innerText()) || '').split('\n')[0].trim();
      expect(certText).toBeTruthy();
      await filterByColumnText(page, 'Certificate Name', certText.slice(0, Math.min(8, certText.length)));
      await expect(listRow(page, certText)).toBeVisible();
    } else {
      await page.locator('select').filter({ hasText: 'Select column' }).selectOption({ label: 'Certificate Name' });
    }
    await clearFilter(page);
  });

  test('HA-05 Delete stays disabled with nothing selected', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await expect(deleteButton(page)).toBeDisabled();
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('HA-06 This tab is pending only', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    const empty = page.getByText('No pending approvals.', { exact: true });
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      return;
    }
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i).getByText('Approval Pending')).toBeVisible();
    }
  });

  test('HA-07 Technician List. Do not click Block', async ({ page }) => {
    await openApprovals(page);
    await page.getByRole('button', { name: 'Technician List' }).click();
    const empty = page.getByText('No technicians found.', { exact: true });
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      return;
    }
    for (const name of ['Employee', 'Role', 'Status', 'Action']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    const first = page.locator('tbody tr').first();
    await expect(first.getByText('Active', { exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: 'Block' })).toBeVisible();
  });

  test('HA-08 Certificate List', async ({ page }) => {
    await openApprovals(page);
    await page.getByRole('button', { name: 'Certificate List' }).click();
    const empty = page.getByText('No certificates found.', { exact: true });
    if (await empty.isVisible()) {
      await createCertificateType(page, stayCertName, stayCertNumber);
      await openApprovals(page);
      await page.getByRole('button', { name: 'Certificate List' }).click();
    }
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Number' })).toBeVisible();
    await expect(page.locator('tbody tr').first()).toBeVisible();
  });

  test('HA-09 Technician Ratings', async ({ page }) => {
    await openApprovals(page);
    await page.getByRole('button', { name: 'Technician Ratings' }).click();
    await expect(page.getByText('Select a technician to view ratings.', { exact: true })).toBeVisible();
    const select = labeledSelect(page, 'Select Technician');
    const options = await realOptions(select);
    if (!options.length) return;
    await select.selectOption({ value: options[0].value });
    await expect(page.getByText('No ratings available yet for this technician.', { exact: true })).toBeVisible();
  });

  test('HA-10 Technician Job History', async ({ page }) => {
    await openApprovals(page);
    await page.getByRole('button', { name: 'Technician Job History' }).click();
    await expect(page.getByText('Select a technician to view job history.', { exact: true })).toBeVisible();
    const select = labeledSelect(page, 'Select Technician');
    const options = await realOptions(select);
    if (!options.length) return;
    await select.selectOption({ value: options[0].value });
    await expect(
      page
        .getByRole('columnheader', { name: 'Work Order' })
        .or(page.getByText('No job history found for this technician.', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('HA-11 Upcoming Jobs', async ({ page }) => {
    await openApprovals(page);
    await page.getByRole('button', { name: 'Upcoming Jobs' }).click();
    await expect(labeledSelect(page, 'Select Technician')).toBeVisible();
    await expect(
      page
        .getByRole('columnheader', { name: 'Work Order' })
        .or(page.getByText('No upcoming jobs found.', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('HA-12 Upload an E2E-HA certificate if it is missing', async ({ page }) => {
    await createCertificateType(page, stayCertName, stayCertNumber);
    await uploadCertificate(page, {
      certName: stayCertName,
      date: stayDate,
      expiry: stayExpiry,
      fileName: `${run}.pdf`,
    });
    await waitForPendingRow(page, stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
    state.stayReady = true;
  });

  test('HA-13 Find the E2E-HA stay row', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await expect(row).toBeVisible();
    await expect(row.getByText('Approval Pending')).toBeVisible();
    await expect(row.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Reject' })).toBeVisible();
  });

  test('HA-14 View the stay file only', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await expect(row).toBeVisible();
    const view = row.getByRole('button', { name: 'View' });
    if (await view.count()) {
      const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
      await view.click();
      const popup = await popupPromise;
      if (popup) await popup.close();
    } else {
      await expect(row.getByText('-', { exact: true })).toBeVisible();
    }
    await expect(row.getByText('Approval Pending')).toBeVisible();
  });

  test('HA-15 Do not Approve or Reject another row', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
    await expect(page).toHaveURL(/\/tech-cert-approvals$/);
  });

  test('HA-16 Cancel Confirm Delete on an extra row', async ({ page }) => {
    await createCertificateType(page, delCertName, delCertNumber);
    await uploadCertificate(page, {
      certName: delCertName,
      date: delDate,
      expiry: delExpiry,
      fileName: `${run}-del.pdf`,
    });
    await waitForPendingRow(page, delCertName);
    await filterByColumnText(page, 'Certificate Name', delCertName);
    const row = listRow(page, delCertName);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await expect(deleteButton(page)).toBeEnabled();
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Delete 1 selected certificate\(s\)\?/);
      await dialog.dismiss();
    });
    await deleteButton(page).click();
    await expect(row).toBeVisible();
    await clearFilter(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });

  test('HA-17 Delete only the disposable row', async ({ page }) => {
    await openCertificateApprovalsTab(page);
    await filterByColumnText(page, 'Certificate Name', delCertName);
    const row = listRow(page, delCertName);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Delete 1 selected certificate\(s\)\?/);
      await dialog.accept();
    });
    await deleteButton(page).click();
    await expectToast(page, '1 certificate(s) deleted successfully');
    await expect(row).toHaveCount(0);
    await clearFilter(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });

  test('HA-18 Approve only an extra row', async ({ page }) => {
    await createCertificateType(page, approveCertName, approveCertNumber);
    await uploadCertificate(page, {
      certName: approveCertName,
      date: approveDate,
      expiry: approveExpiry,
      fileName: `${run}-approve.pdf`,
    });
    await waitForPendingRow(page, approveCertName);
    await filterByColumnText(page, 'Certificate Name', approveCertName);
    const row = listRow(page, approveCertName);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Approve' }).click();
    await expectToast(page, 'Certificate approved successfully');
    await expect(row).toHaveCount(0);
    await clearFilter(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });

  test('HA-19 Reject only an extra row', async ({ page }) => {
    await createCertificateType(page, rejectCertName, rejectCertNumber);
    await uploadCertificate(page, {
      certName: rejectCertName,
      date: rejectDate,
      expiry: rejectExpiry,
      fileName: `${run}-reject.pdf`,
    });
    await waitForPendingRow(page, rejectCertName);
    await filterByColumnText(page, 'Certificate Name', rejectCertName);
    const row = listRow(page, rejectCertName);
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Reject' }).click();
    await expectToast(page, 'Certificate rejected successfully');
    await expect(row).toHaveCount(0);
    await clearFilter(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });

  test('HA-20 Run upload again', async ({ page }) => {
    await createCertificateType(page, stay2CertName, stay2CertNumber);
    await uploadCertificate(page, {
      certName: stay2CertName,
      date: stay2Date,
      expiry: stay2Expiry,
      fileName: `${run}-2.pdf`,
    });
    await waitForPendingRow(page, stay2CertName);
    await expect(listRow(page, stay2CertName).getByText('Approval Pending')).toBeVisible();
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });
});
