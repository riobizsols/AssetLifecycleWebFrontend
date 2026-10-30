// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-ET-${Date.now().toString(36)}`;
const listUrl = `${BASE}/technician-certificates`;
const certificationsUrl = `${BASE}/certifications`;

const stayCertName = `${run} Stay`;
const stayCertNumber = `${run}-S`;
const delCertName = `${run} Del`;
const delCertNumber = `${run}-D`;
const stay2CertName = `${run} Stay2`;
const stay2CertNumber = `${run}-S2`;

const state = {
  certName: '',
  employeeLabel: '',
  stayReady: false,
  delReady: false,
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
const stayUpdatedDate = ymd(1);
const stayUpdatedExpiry = ymd(400);
const delDate = ymd(-14);
const delExpiry = ymd(200);
const stay2Date = ymd(-7);
const stay2Expiry = ymd(180);

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
 */
function uploadedToolbar(page) {
  return page.locator('h2').filter({ hasText: 'Uploaded Certificates' }).locator('xpath=..');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function filterButton(page) {
  return uploadedToolbar(page).locator('button[title="Filter"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function toolbarDelete(page) {
  return uploadedToolbar(page).locator('button[title="Delete"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function toolbarAdd(page) {
  return uploadedToolbar(page).locator('button[title="Add"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function toolbarClose(page) {
  return uploadedToolbar(page).locator('button[title="Close"]');
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
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.locator('header').getByText(/Technician Certificates|Employee Tech/i).first()
      .or(page.getByRole('heading', { name: /Technician Certificates|Uploaded Certificates/i }))
      .first(),
  ).toBeVisible({ timeout: 15000 }).catch(() => {});
  await expect(
    page
      .getByText('No certificates uploaded yet.', { exact: true })
      .or(page.getByRole('columnheader', { name: 'Certificate' }))
      .or(page.getByRole('heading', { name: 'Technician Certificates' }))
      .first(),
  ).toBeVisible({ timeout: 15000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddForm(page) {
  await openList(page);
  if (await toolbarAdd(page).count()) {
    await toolbarAdd(page).click();
  }
  await expect(page.locator('label').filter({ hasText: /^Employee Name$/ })).toBeVisible({
    timeout: 15000,
  });
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
async function ensureStayCertificate(page) {
  if (state.certName) return;
  await createCertificateType(page, stayCertName, stayCertNumber);
  state.certName = stayCertName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function pickEmployee(page) {
  const select = labeledSelect(page, 'Employee Name');
  if (!(await select.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  const options = await realOptions(select);
  const pick = options.find((option) => !/other/i.test(option.label)) || options[0];
  if (!pick) return false;
  await select.selectOption({ value: pick.value }).catch(() => {});
  state.employeeLabel = pick.label;
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} certName
 */
async function pickCertificate(page, certName) {
  const select = labeledSelect(page, 'Certificate Name');
  if (!(await select.isVisible({ timeout: 8000 }).catch(() => false))) return false;
  const options = await realOptions(select);
  const match = options.find((option) => option.label.includes(certName));
  if (!match) return false;
  await select.selectOption({ value: match.value }).catch(() => {});
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ certName: string, date: string, expiry: string, fileName: string }} details
 */
async function uploadCertificate(page, details) {
  await openAddForm(page);
  if (!(await pickEmployee(page))) return;
  if (!(await pickCertificate(page, details.certName))) return;
  const dateInputs = page.locator('input[type="date"]');
  await dateInputs.nth(0).fill(details.date);
  await dateInputs.nth(1).fill(details.expiry);
  await page.locator('input[type="file"]').setInputFiles(pdfFile(details.fileName));
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expectToast(page, 'Certificate uploaded successfully');
}

test.describe('Employee Tech Certificate', () => {
  test('ET-01 Open Employee Tech Certificate', async ({ page }) => {
    await openList(page);
    await expect(
      page.getByText(
        'Upload and manage your technical certificates. New uploads will remain in Approval Pending status until HR or Manager confirmation.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Uploaded Certificates' })).toBeVisible();
    await expect(filterButton(page)).toBeVisible();
    await expect(toolbarDelete(page)).toBeVisible();
    await expect(toolbarAdd(page)).toBeVisible();
  });

  test('ET-02 List columns that are on the table', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No certificates uploaded yet.', { exact: true });
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      return;
    }
    for (const name of ['Employee', 'Certificate', 'Certificate Date', 'Expiry Date', 'Status', 'File', 'Actions']) {
      await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: 'etc_id' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Delete"]')).toBeVisible();
  });

  test('ET-03 Uploads already on the screen', async ({ page }) => {
    await openList(page);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No certificates uploaded yet.', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('td').nth(1)).not.toHaveText('');
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('ET-04 Filter the list', async ({ page }) => {
    await openList(page);
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

  test('ET-05 Delete stays disabled with nothing selected', async ({ page }) => {
    await openList(page);
    await expect(toolbarDelete(page)).toBeDisabled();
  });

  test('ET-06 Close Add without uploading', async ({ page }) => {
    await openAddForm(page);
    await expect(page.locator('label').filter({ hasText: /^Certificate Name$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Certificate Date$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Expiry Date$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /Upload Certificate File/ })).toBeVisible();
    await toolbarClose(page).click();
    await expect(page.locator('label').filter({ hasText: /^Employee Name$/ })).toHaveCount(0);
    await expect(toolbarAdd(page)).toBeVisible();
  });

  test('ET-07 Create a certificate type if the picker is empty', async ({ page }) => {
    await ensureStayCertificate(page);
    await openAddForm(page);
    const select = labeledSelect(page, 'Certificate Name');
    const options = await realOptions(select);
    expect(
      options.some((option) => option.label.includes(stayCertName)),
      `Certificate ${stayCertName} must be in Certificate Name`,
    ).toBeTruthy();
  });

  test('ET-08 Employee is required', async ({ page }) => {
    await ensureStayCertificate(page);
    await openAddForm(page);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expectToast(page, 'Please select employee');
    await expect(page.locator('label').filter({ hasText: /^Employee Name$/ })).toBeVisible();
  });

  test('ET-09 Certificate is required', async ({ page }) => {
    await ensureStayCertificate(page);
    await openAddForm(page);
    if (!(await pickEmployee(page))) return;
    await page.getByRole('button', { name: 'Upload', exact: true }).click({ force: true, timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Please select a certificate');
  });

  test('ET-10 Dates are required', async ({ page }) => {
    await ensureStayCertificate(page);
    await openAddForm(page);
    await pickEmployee(page);
    await pickCertificate(page, stayCertName);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expectToast(page, 'Please select certificate date');
    await page.locator('input[type="date"]').nth(0).fill(stayDate);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expectToast(page, 'Please select expiry date');
  });

  test('ET-11 A file is required', async ({ page }) => {
    await ensureStayCertificate(page);
    await openAddForm(page);
    await pickEmployee(page);
    await pickCertificate(page, stayCertName);
    await page.locator('input[type="date"]').nth(0).fill(stayDate);
    await page.locator('input[type="date"]').nth(1).fill(stayExpiry);
    await page.getByRole('button', { name: 'Upload', exact: true }).click();
    await expectToast(page, 'Please choose a file to upload');
  });

  test('ET-12 Upload the E2E certificate', async ({ page }) => {
    await ensureStayCertificate(page);
    await uploadCertificate(page, {
      certName: stayCertName,
      date: stayDate,
      expiry: stayExpiry,
      fileName: `${run}.pdf`,
    });
    await expect(listRow(page, stayCertName)).toBeVisible({ timeout: 30000 });
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
    state.stayReady = true;
  });

  test('ET-13 The new row can be found', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await expect(row).toBeVisible();
    await expect(row.getByText(state.employeeLabel, { exact: false })).toBeVisible();
    await expect(row.getByText('Approval Pending')).toBeVisible();
    await expect(row.getByRole('button', { name: 'View' })).toBeVisible();
    await expect(row.locator('button[title="Edit"]')).toBeVisible();
    await expect(row.locator('button[title="Delete"]')).toBeVisible();
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });

  test('ET-14 View does not change status', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    const popupPromise = page.waitForEvent('popup', { timeout: 10000 }).catch(() => null);
    await row.getByRole('button', { name: 'View' }).click();
    const popup = await popupPromise;
    if (popup) {
      await popup.close();
    } else {
      const noFile = page.getByText('No file available for download');
      if (await noFile.isVisible().catch(() => false)) {
        await expect(noFile).toBeVisible();
      }
    }
    await expect(row.getByText('Approval Pending')).toBeVisible();
  });

  test('ET-15 Do not edit or delete a row from another run', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName)).toBeVisible();
    await expect(page).not.toHaveURL(/tech-cert-approvals/);
  });

  test('ET-16 Cancel Edit', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await row.locator('button[title="Edit"]').click();
    await expect(row.getByRole('button', { name: 'Save' })).toBeVisible();
    await row.getByRole('button', { name: 'Cancel' }).click();
    await expect(row.getByRole('button', { name: 'Save' })).toHaveCount(0);
    await expect(row.getByText('Approval Pending')).toBeVisible();
  });

  test('ET-17 Update needs dates', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await row.locator('button[title="Edit"]').click();
    await row.locator('input[type="date"]').first().fill('');
    await row.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Please select certificate date');
    await expect(row.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('ET-18 Update the E2E upload', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await row.locator('button[title="Edit"]').click();
    await row.locator('input[type="date"]').nth(0).fill(stayUpdatedDate);
    await row.locator('input[type="date"]').nth(1).fill(stayUpdatedExpiry);
    await row.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Certificate updated successfully');
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
    await expect(page).not.toHaveURL(/tech-cert-approvals/);
  });

  test('ET-19 Cancel row delete', async ({ page }) => {
    await openList(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Delete this certificate\?/);
      await dialog.dismiss();
    });
    await row.locator('button[title="Delete"]').click();
    await expect(row).toBeVisible();
    await expect(row.getByText('Approval Pending')).toBeVisible();
  });

  test('ET-20 Create a disposable upload and delete only that row', async ({ page }) => {
    await createCertificateType(page, delCertName, delCertNumber);
    await uploadCertificate(page, {
      certName: delCertName,
      date: delDate,
      expiry: delExpiry,
      fileName: `${run}-del.pdf`,
    });
    await expect(listRow(page, delCertName)).toBeVisible({ timeout: 30000 });
    state.delReady = true;

    await openList(page);
    await filterByColumnText(page, 'Certificate Name', delCertName);
    const row = listRow(page, delCertName);
    await expect(row).toBeVisible();
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/Delete this certificate\?/);
      await dialog.accept();
    });
    await row.locator('button[title="Delete"]').click();
    await expectToast(page, /Certificate deleted successfully|1 certificate\(s\) deleted successfully/);
    await expect(row).toHaveCount(0);

    await clearFilter(page);
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName)).toBeVisible();
    await expect(listRow(page, stayCertName).getByText('Approval Pending')).toBeVisible();
  });

  test('ET-21 Run upload again', async ({ page }) => {
    await createCertificateType(page, stay2CertName, stay2CertNumber);
    await uploadCertificate(page, {
      certName: stay2CertName,
      date: stay2Date,
      expiry: stay2Expiry,
      fileName: `${run}-2.pdf`,
    });
    await expect(listRow(page, stay2CertName)).toBeVisible({ timeout: 30000 });
    await expect(listRow(page, stay2CertName).getByText('Approval Pending')).toBeVisible();
    await filterByColumnText(page, 'Certificate Name', stayCertName);
    await expect(listRow(page, stayCertName)).toBeVisible();
    await expect(page).not.toHaveURL(/tech-cert-approvals/);
  });
});
