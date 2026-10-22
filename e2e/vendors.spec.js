// @ts-check
/**
 * Vendors screen — Playwright cases VN-01 … VN-79.
 * Read-only checks use the NGP vendor list. Creates use a PW-E2E vendor and delete it.
 * Cases that need a second role, a forced API failure, or a language pack are skipped.
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clearColumnFilters, dataRows, downloadList, filterByColumn, rowByText } from './helpers/contentBox.js';

const SAMPLE = 'Lakshmi Meters';

test.describe('Vendors screen', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/master-data/vendors`);
    await expect(page.getByRole('columnheader', { name: /Vendor Name/i })).toBeVisible({ timeout: 45000 });
  });

  test('VN-01 to VN-15 list, filter, and sort', async ({ page }) => {
    test.setTimeout(240000);

    await test.step('VN-01 list loads with toolbar', async () => {
      await expect(page.locator('button:has(svg.lucide-plus)')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-trash-2)')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-download)')).toBeVisible();
      await expect(rowByText(page, SAMPLE)).toBeVisible();
    });

    await test.step('VN-04 columns match the screen', async () => {
      for (const header of ['Vendor Name', 'Company', 'Status', 'GST Number', 'CIN Number', 'Company Email', 'Actions']) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });

    await test.step('VN-05 status is Active or Inactive text', async () => {
      await expect(rowByText(page, SAMPLE)).toContainText('Active');
      await expect(rowByText(page, 'NGP Lab Instruments')).toContainText('Inactive');
    });

    await test.step('VN-07 filter by vendor name', async () => {
      await filterByColumn(page, 'Vendor Name', SAMPLE);
      await expect(rowByText(page, SAMPLE)).toBeVisible();
      await expect(dataRows(page)).toHaveCount(1);
      await clearColumnFilters(page);
    });

    await test.step('VN-08 filter by company', async () => {
      await filterByColumn(page, 'Company', 'Petu Solutions');
      await expect(rowByText(page, 'Petu')).toBeVisible();
      await clearColumnFilters(page);
    });

    await test.step('VN-09 filter by status', async () => {
      await filterByColumn(page, 'Status', 'Inactive');
      await expect(rowByText(page, 'Petu')).toBeVisible();
      await expect(rowByText(page, SAMPLE)).toHaveCount(0);
      await clearColumnFilters(page);
    });

    await test.step('VN-10 filter by company email', async () => {
      await filterByColumn(page, 'Company Email', 'lakshmi@gmail.com');
      await expect(rowByText(page, SAMPLE)).toBeVisible();
      await clearColumnFilters(page);
    });

    await test.step('VN-13 clear filters returns the full list', async () => {
      await filterByColumn(page, 'Vendor Name', SAMPLE);
      await clearColumnFilters(page);
      await expect(rowByText(page, 'Petu')).toBeVisible();
      await expect(rowByText(page, SAMPLE)).toBeVisible();
    });

    await test.step('VN-15 sort vendor name', async () => {
      await page.locator('thead').getByText('Vendor Name', { exact: true }).click();
      await expect(page.locator('thead').getByText('↑')).toBeVisible();
    });
  });

  test('VN-16 to VN-20 row selection', async ({ page }) => {
    await test.step('VN-16 select one row', async () => {
      const row = rowByText(page, SAMPLE);
      await row.locator('input[type="checkbox"]').check();
      await expect(row.locator('input[type="checkbox"]')).toBeChecked();
    });

    await test.step('VN-18 select all', async () => {
      await page.locator('thead input[type="checkbox"]').check();
      const boxes = dataRows(page).locator('input[type="checkbox"]');
      await expect(boxes.first()).toBeChecked();
    });

    await test.step('VN-19 clear selection', async () => {
      await page.locator('thead input[type="checkbox"]').uncheck();
      await expect(dataRows(page).locator('input[type="checkbox"]').first()).not.toBeChecked();
    });

    await test.step('VN-63 delete with nothing selected', async () => {
      await page.locator('button:has(svg.lucide-trash-2)').click();
      await expect(page.getByText('Please select items to delete')).toBeVisible();
    });
  });

  test('VN-22 to VN-31 add validation', async ({ page }) => {
    test.setTimeout(180000);
    await page.locator('button:has(svg.lucide-plus)').click();
    await expect(page).toHaveURL(/\/master-data\/add-vendor/);

    await test.step('VN-25 required fields block save', async () => {
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(/Vendor Name is required/i)).toBeVisible();
    });

    await test.step('VN-26 invalid company email', async () => {
      await page.locator('input[name="vendor_name"]').fill('PW Vendor');
      await page.locator('input[name="company_name"]').fill('PW Company');
      await page.locator('input[name="company_email"]').fill('not-an-email');
      await page.locator('input[name="contact_person_name"]').fill('QA Contact');
      await page.locator('input[name="contact_person_number"]').fill('9876543210');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(/valid email address/i)).toBeVisible();
    });

    await test.step('VN-27 invalid contact email', async () => {
      await page.locator('input[name="company_email"]').fill('pw.vendor@example.com');
      await page.locator('input[name="contact_person_email"]').fill('bad-contact');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(/valid contact person email/i)).toBeVisible();
    });

    await test.step('VN-28 invalid contact number', async () => {
      await page.locator('input[name="contact_person_email"]').fill('');
      await page.locator('input[name="contact_person_number"]').fill('12345');
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByText(/contact number/i)).toBeVisible();
    });

    await test.step('VN-31 cancel add', async () => {
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page).toHaveURL(/\/master-data\/vendors/);
      await expect(rowByText(page, 'PW Vendor')).toHaveCount(0);
    });
  });

  test('VN-23 VN-33 to VN-47 VN-62 create, edit, and delete a vendor', async ({ page }) => {
    test.setTimeout(300000);
    const stamp = Date.now();
    const name = `PW-E2E-Vendor-${stamp}`;
    const company = `PW Company ${stamp}`;
    const email = `pw.vendor.${stamp}@example.com`;

    await test.step('VN-23 create with required fields', async () => {
      await page.locator('button:has(svg.lucide-plus)').click();
      await page.locator('input[name="vendor_name"]').fill(name);
      await page.locator('input[name="company_name"]').fill(company);
      await page.locator('input[name="company_email"]').fill(email);
      await page.locator('input[name="contact_person_name"]').fill('QA Contact');
      await page.locator('input[name="contact_person_number"]').fill('9876543210');
      const created = page.waitForResponse(
        (response) => response.request().method() === 'POST' && response.url().includes('/create-vendor'),
        { timeout: 60000 },
      );
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      const response = await created;
      expect(response.ok(), `Create failed: ${response.status()}`).toBeTruthy();
      await page.getByRole('button', { name: /Cancel|Back to Vendors/ }).click();
      await expect(page).toHaveURL(/\/master-data\/vendors/);
      await expect(rowByText(page, name)).toBeVisible({ timeout: 20000 });
    });

    await test.step('VN-33 open edit', async () => {
      await rowByText(page, name).getByTitle('Edit').click();
      await expect(page.locator('input[name="vendor_name"]')).toHaveValue(name);
    });

    await test.step('VN-34 rename and save', async () => {
      await page.locator('input[name="vendor_name"]').fill(`${name} Edited`);
      const updated = page.waitForResponse(
        (response) => response.request().method() === 'PUT' && response.url().includes('/update/'),
        { timeout: 60000 },
      );
      await page.getByRole('button', { name: /Update|Save/ }).click();
      expect((await updated).ok()).toBeTruthy();
      await expect(page.getByText(/updated successfully/i)).toBeVisible();
    });

    await test.step('VN-45 invalid pincode on edit', async () => {
      await rowByText(page, `${name} Edited`).getByTitle('Edit').click();
      await page.locator('input[name="pincode"]').fill('5600');
      await page.getByRole('button', { name: /Update|Save/ }).click();
      await expect(page.getByText(/6 digits/i)).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
    });

    await test.step('VN-47 close edit without saving', async () => {
      await rowByText(page, `${name} Edited`).getByTitle('Edit').click();
      await page.locator('input[name="vendor_name"]').fill('Should Not Save');
      await page.locator('button[aria-label="Close"], button:has(svg.lucide-x)').first().click();
      await expect(rowByText(page, 'Should Not Save')).toHaveCount(0);
    });

    await test.step('VN-62 delete the unused vendor', async () => {
      await rowByText(page, `${name} Edited`).locator('input[type="checkbox"]').check();
      await page.locator('button:has(svg.lucide-trash-2)').click();
      const deleted = page.waitForResponse(
        (response) => response.request().method() === 'DELETE' && response.url().includes('/delete-vendors'),
        { timeout: 60000 },
      );
      await page.getByRole('button', { name: 'Delete', exact: true }).click();
      expect((await deleted).ok()).toBeTruthy();
      await expect(rowByText(page, `${name} Edited`)).toHaveCount(0);
    });
  });

  test('VN-64 cancel delete leaves the row', async ({ page }) => {
    await rowByText(page, SAMPLE).locator('input[type="checkbox"]').check();
    await page.locator('button:has(svg.lucide-trash-2)').click();
    await page.getByRole('button', { name: /Close|Cancel/ }).click();
    await expect(rowByText(page, SAMPLE)).toBeVisible();
  });

  test('VN-72 download the vendor list', async ({ page }) => {
    const download = await downloadList(page);
    expect(download.suggestedFilename()).toMatch(/Vendors_List/i);
    await expect(page.getByText(/exported successfully/i)).toBeVisible();
  });
});

test.describe('Vendors cases that need another role or a broken API', () => {
  test.skip('VN-03 VN-32 VN-49 VN-50 VN-68 VN-70 VN-74 to VN-79', () => {
    // Display-only, no-access, German, and forced API failures are not available
    // from the single Write login used by this suite.
  });
});
