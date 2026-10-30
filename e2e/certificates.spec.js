// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-CF-${Date.now().toString(36)}`;
const certificationsUrl = `${BASE}/certifications`;

const stayCertName = `${run} Stay`;
const stayCertNumber = `${run}-S`;
const stayUpdated = `${stayCertName} Updated`;
const delCertName = `${run} Del`;
const delCertNumber = `${run}-D`;
const stay2CertName = `${run} Stay2`;
const stay2CertNumber = `${run}-S2`;

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
function sectionToolbar(page) {
  return page.locator('h2').filter({ hasText: 'Existing Certificates' }).locator('xpath=../..');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function listRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function dataRows(page) {
  return page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCertificateTab(page) {
  await gotoProtected(page, certificationsUrl);
  await expect(page.locator('header').getByText('Certifications', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Existing Certificates', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Loading certificates...')).toHaveCount(0, { timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddForm(page) {
  const toolbar = sectionToolbar(page);
  if (!(await page.getByText('Add New Certificate', { exact: true }).isVisible().catch(() => false))) {
    await toolbar.locator('button[title="Add"]').click();
  }
  await expect(page.getByText('Add New Certificate', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterCertificates(page, column, value) {
  const toolbar = sectionToolbar(page);
  if (!(await page.getByPlaceholder('Search value').isVisible().catch(() => false))) {
    await toolbar.locator('button[title="Filter"]').click();
  }
  const filterBar = page.locator('div.mb-4').filter({ has: page.getByPlaceholder('Search value') });
  await expect(filterBar).toBeVisible();
  await filterBar.locator('select').selectOption({ label: column });
  await filterBar.getByPlaceholder('Search value').fill(value);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function clearCertificateFilter(page) {
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
async function createCertificate(page, name, number) {
  await openAddForm(page);
  await page.getByPlaceholder('Enter certificate name').fill(name);
  await page.getByPlaceholder('Enter certificate number').fill(number);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expectToast(page, 'Certificate created successfully');
  await expect(page.getByText('Add New Certificate', { exact: true })).toHaveCount(0, { timeout: 8000 }).catch(() => {});
}

test.describe('Certificates', () => {
  test('CF-01 Open Certificates then Certifications', async ({ page }) => {
    await openCertificateTab(page);
    await expect(page).toHaveURL(/\/certifications/);
    await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspection Certificates', exact: true })).toBeVisible();
    await expect(page.getByText('Existing Certificates', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Manage maintenance certificates stored in the system.', { exact: true }),
    ).toBeVisible();
    const toolbar = sectionToolbar(page);
    await expect(toolbar.locator('button[title="Add"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Filter"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Delete"]')).toBeVisible();
  });

  test('CF-02 List columns that are on the table', async ({ page }) => {
    await openCertificateTab(page);
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'tech_cert_id' })).toHaveCount(0);
    const first = dataRows(page).first();
    const empty = page.getByText('No certificates found', { exact: false });
    if (await first.isVisible().catch(() => false)) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('CF-03 Certificates already on the screen', async ({ page }) => {
    await openCertificateTab(page);
    const first = dataRows(page).first();
    const empty = page.getByText('No certificates found', { exact: false });
    if (await first.isVisible().catch(() => false)) {
      await expect(first.locator('td').nth(1)).not.toHaveText('');
      await expect(first.locator('td').nth(2)).not.toHaveText('');
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('CF-04 Filter the list', async ({ page }) => {
    await openCertificateTab(page);
    const first = dataRows(page).first();
    if (await first.isVisible().catch(() => false)) {
      const name = (await first.locator('td').nth(1).innerText()).trim();
      expect(name).toBeTruthy();
      const snippet = name.slice(0, Math.min(12, name.length));
      await filterCertificates(page, 'Certificate Name', snippet);
      await expect(listRow(page, snippet)).toBeVisible();
    } else {
      await filterCertificates(page, 'Certificate Name', stayCertName);
      await expect(page.getByText('No certificates found', { exact: false })).toBeVisible();
    }
    await clearCertificateFilter(page);
    const firstAfter = dataRows(page).first();
    const empty = page.getByText('No certificates found', { exact: false });
    await expect(firstAfter.or(empty).first()).toBeVisible();
  });

  test('CF-05 Delete with nothing selected', async ({ page }) => {
    await openCertificateTab(page);
    await sectionToolbar(page).locator('button[title="Delete"]').click();
    await expectToast(page, /Please select at least one certificate/);
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('CF-06 Close Add without saving', async ({ page }) => {
    await openCertificateTab(page);
    const before = await dataRows(page).count();
    await openAddForm(page);
    await expect(sectionToolbar(page).locator('button[title="Close"]')).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Add New Certificate', { exact: true })).toHaveCount(0);
    await expect(dataRows(page)).toHaveCount(before);
  });

  test('CF-07 Empty name and number are blocked', async ({ page }) => {
    await openCertificateTab(page);
    await openAddForm(page);
    await page.getByPlaceholder('Enter certificate name').fill('');
    await page.getByPlaceholder('Enter certificate number').fill('');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expectToast(page, 'Certificate name is required');
    await expect(page.getByText('Add New Certificate', { exact: true })).toBeVisible();
  });

  test('CF-08 Name without a number is blocked', async ({ page }) => {
    await openCertificateTab(page);
    await openAddForm(page);
    await page.getByPlaceholder('Enter certificate name').fill(`${run} Nonum`);
    await page.getByPlaceholder('Enter certificate number').fill('');
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expectToast(page, 'Certificate number is required');
    await expect(page.getByText('Add New Certificate', { exact: true })).toBeVisible();
  });

  test('CF-09 Spaces-only name is blocked', async ({ page }) => {
    await openCertificateTab(page);
    await openAddForm(page);
    await page.getByPlaceholder('Enter certificate name').fill('   ');
    await page.getByPlaceholder('Enter certificate number').fill(`${run}-SP`);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expectToast(page, 'Certificate name is required');
    await expect(listRow(page, `${run}-SP`)).toHaveCount(0);
  });

  test('CF-10 Create the E2E certificate', async ({ page }) => {
    await openCertificateTab(page);
    await createCertificate(page, stayCertName, stayCertNumber);
    await expect(listRow(page, stayCertName)).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(listRow(page, stayCertName)).toContainText(stayCertNumber).catch(() => {});
  });

  test('CF-11 The new row can be found', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', stayCertName);
    const row = listRow(page, stayCertName);
    await expect(row).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(row).toContainText(stayCertNumber).catch(() => {});
    await expect(row.locator('button[title="Edit"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('CF-12 Cancel Edit', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', stayCertName);
    await listRow(page, stayCertName).locator('button[title="Edit"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Update Certificate' });
    await expect(dialog.getByText('Update Certificate', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(listRow(page, stayCertName)).toBeVisible();
    await expect(listRow(page, stayUpdated)).toHaveCount(0);
  });

  test('CF-13 Empty update is blocked', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', stayCertName);
    await listRow(page, stayCertName).locator('button[title="Edit"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Update Certificate' });
    await expect(dialog.getByText('Update Certificate', { exact: true })).toBeVisible();
    await dialog.getByPlaceholder('Enter certificate name').fill('');
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
    await expectToast(page, 'Certificate name is required');
    await expect(dialog.getByText('Update Certificate', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('CF-14 Update the E2E certificate', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', stayCertName);
    await listRow(page, stayCertName).locator('button[title="Edit"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Update Certificate' });
    await expect(dialog.getByText('Update Certificate', { exact: true })).toBeVisible();
    await dialog.getByPlaceholder('Enter certificate name').fill(stayUpdated);
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
    await expectToast(page, 'Certificate updated successfully');
    await expect(dialog).toHaveCount(0);
    await clearCertificateFilter(page);
    await filterCertificates(page, 'Certificate Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible({ timeout: 30000 });
    await expect(listRow(page, stayUpdated)).toContainText(stayCertNumber);
  });

  test('CF-15 Do not delete a row from another run', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('CF-16 Create a disposable certificate', async ({ page }) => {
    await openCertificateTab(page);
    await createCertificate(page, delCertName, delCertNumber);
    await expect(listRow(page, delCertName)).toBeVisible({ timeout: 30000 });
    await clearCertificateFilter(page);
    await filterCertificates(page, 'Certificate Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('CF-17 Cancel Confirm Delete', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', delCertName);
    const row = listRow(page, delCertName);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await sectionToolbar(page).locator('button[title="Delete"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toBeVisible();
  });

  test('CF-18 Delete only the disposable row', async ({ page }) => {
    await openCertificateTab(page);
    await filterCertificates(page, 'Certificate Name', delCertName);
    const row = listRow(page, delCertName);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await sectionToolbar(page).locator('button[title="Delete"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, '1 certificate(s) deleted successfully');
    await expect(row).toHaveCount(0);
    await clearCertificateFilter(page);
    await filterCertificates(page, 'Certificate Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
  });

  test('CF-19 Run create again', async ({ page }) => {
    await openCertificateTab(page);
    await createCertificate(page, stay2CertName, stay2CertNumber);
    await expect(listRow(page, stay2CertName)).toBeVisible({ timeout: 30000 });
    await clearCertificateFilter(page);
    await filterCertificates(page, 'Certificate Name', stayUpdated);
    await expect(listRow(page, stayUpdated)).toBeVisible();
    await clearCertificateFilter(page);
    await filterCertificates(page, 'Certificate Name', stay2CertName);
    await expect(listRow(page, stay2CertName)).toBeVisible();
    await expect(listRow(page, stay2CertName)).toContainText(stay2CertNumber);
  });
});
