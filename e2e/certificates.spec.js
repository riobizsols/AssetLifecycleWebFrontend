// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const MINIMAL_PDF = Buffer.from(
  '%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\nxref\n0 4\n0000000000 65535 f \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF\n'
);

test.describe('RIO EAM certificates', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads technician certificates', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/technician-certificates`);

    const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
    const heading = page.getByRole('heading', { name: /Technician Certificates/i });
    await expect(unauthorized.or(heading).first()).toBeVisible({ timeout: 45000 });
    if (await unauthorized.isVisible().catch(() => false)) return;

    await expect(page.getByText(/Uploaded Certificates/i)).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Loading certificates/i)).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No certificates uploaded yet.');
    const rows = page.locator('table tbody tr');
    if (!(await empty.isVisible()) && (await rows.count()) > 0) {
      await expect(page.getByText('Certificate Date').first()).toBeVisible();
      await expect(page.getByText('Expiry Date').first()).toBeVisible();
      await expect(page.getByText('Status').first()).toBeVisible();
    }
  });

  test('opens the technician certificate upload form', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/technician-certificates`);
    const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
    const heading = page.getByRole('heading', { name: /Technician Certificates/i });
    await expect(unauthorized.or(heading).first()).toBeVisible({ timeout: 45000 });
    if (await unauthorized.isVisible().catch(() => false)) return;

    await page.getByTitle('Add').click();
    await expect(page.getByText('Employee Name')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Certificate Name').first()).toBeVisible();
    await expect(page.getByText('Certificate Date').first()).toBeVisible();
    await expect(page.getByText('Expiry Date').first()).toBeVisible();
    await expect(page.getByText('Upload Certificate File')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upload' })).toBeVisible();
  });

  test('creates a certificate and uploads it for a technician', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/certifications`);
    await expect(page.getByText('Existing Certificates')).toBeVisible({ timeout: 45000 });

    await page.getByTitle('Add').click();
    await expect(page.getByText('Add New Certificate')).toBeVisible({ timeout: 10000 });

    const certName = `PW-E2E-CERT-${Date.now()}`;
    const certNumber = `PW${Date.now().toString().slice(-8)}`;
    await page.getByPlaceholder('Enter certificate name').fill(certName);
    await page.getByPlaceholder('Enter certificate number').fill(certNumber);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/tech-certificates')
    );
    await page.getByRole('button', { name: 'Create' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), `Certificate create failed: ${createResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Certificate created successfully')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(certName)).toBeVisible({ timeout: 15000 });

    await gotoProtected(page, `${BASE}/technician-certificates`);
    await expect(page.getByRole('heading', { name: /Technician Certificates/i })).toBeVisible({
      timeout: 45000,
    });
    await page.getByTitle('Add').click();

    const employeeSelect = page.locator('label', { hasText: /^Employee Name$/ }).locator('xpath=following-sibling::select[1]');
    const certificateSelect = page.locator('label', { hasText: /^Certificate Name$/ }).locator('xpath=following-sibling::select[1]');

    await expect(employeeSelect).toBeVisible({ timeout: 15000 });
    await expect
      .poll(
        async () => employeeSelect.locator('option').count(),
        { timeout: 20000 }
      )
      .toBeGreaterThan(1);

    const employeeValues = await employeeSelect.locator('option').evaluateAll((options) =>
      options.map((option) => option.value).filter(Boolean)
    );
    if (employeeValues.length > 0) {
      await employeeSelect.selectOption(employeeValues[0]);
    } else {
      await employeeSelect.selectOption({ index: 1 });
    }

    // Certificate dropdown stays disabled until an employee is chosen.
    await expect(certificateSelect).toBeEnabled({ timeout: 20000 });
    await expect
      .poll(
        async () => certificateSelect.locator('option').count(),
        { timeout: 20000 }
      )
      .toBeGreaterThan(1);

    const certOption = certificateSelect.locator('option').filter({ hasText: certName });
    if ((await certOption.count()) > 0) {
      await certificateSelect.selectOption({ label: await certOption.first().innerText() });
    } else {
      await certificateSelect.selectOption({ index: 1 });
    }

    const dateInputs = page.locator('input[type="date"]');
    await dateInputs.nth(0).fill('2026-03-01');
    await dateInputs.nth(1).fill('2027-03-01');
    await page.locator('input[type="file"]').setInputFiles({
      name: `${certName}.pdf`,
      mimeType: 'application/pdf',
      buffer: MINIMAL_PDF,
    });

    const uploadResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/employee-tech-certificates')
    );
    await page.getByRole('button', { name: 'Upload' }).click();
    const uploadResponse = await uploadResponsePromise;
    expect(uploadResponse.ok(), `Certificate upload failed: ${uploadResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Certificate uploaded successfully')).toBeVisible({
      timeout: 15000,
    });
  });

  test('loads certification master-data tabs', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/certifications`);

    await expect(page.getByText('Certifications').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Certificate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspection Certificates' })).toBeVisible();
    await expect(page.getByText('Existing Certificates')).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Maintenance Certificate' }).click();
    await expect(page.getByText(/Maintenance Certificate|Asset Type|Available Certificates/).first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'Inspection Certificates' }).click();
    await expect(page.getByText('Inspection Certificates').first()).toBeVisible({ timeout: 15000 });
  });

  test('loads HR certificate approvals and switches tabs', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/tech-cert-approvals`);

    await expect(page.getByRole('heading', { name: 'HR/Manager Approval' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Certificate Approvals' })).toBeVisible();
    await expect(page.getByText(/Loading approvals|No pending approvals|Employee/).first()).toBeVisible({
      timeout: 30000,
    });

    await page.getByRole('button', { name: 'Technician List' }).click();
    await expect(page.getByRole('button', { name: 'Technician List' })).toBeVisible();

    await page.getByRole('button', { name: 'Certificate List' }).click();
    await expect(page.getByRole('button', { name: 'Certificate List' })).toBeVisible();

    await page.getByRole('button', { name: 'Certificate Approvals' }).click();
    const empty = page.getByText('No pending approvals.');
    const rows = page.locator('table tbody tr');
    if (!(await empty.isVisible()) && (await rows.count()) > 0) {
      await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible();
    }
  });
});
