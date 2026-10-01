// @ts-check
/**
 * 18. Certifications and technician certificates
 * TC_CERT_001 create a certificate
 * TC_CERT_002 require a certificate for preventive maintenance
 * TC_CERT_003 require a certificate to inspect an asset type
 * TC_CERT_004 technician submits a certificate
 * TC_CERT_005 approve a technician certificate, then use it on in-house maintenance
 * TC_CERT_006 reject a technician certificate
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const CERT_NAME = 'Biomedical Safety';
const CERT_NUMBER = 'BMS-01';
const ASSET_TYPE = 'Oxygen Concentrator';
const MAINT_TYPE = 'Preventive';
const TECHNICIAN = 'Ravi Kumar';
const REJECT_REASON = 'Illegible scan';
const APPROVAL_COMMENT = 'Approved after certificate check';
const CERTIFICATIONS = `${BASE}/certifications`;

/** @type {string} */
let rejectedEmployee = '';

test.describe('RIO EAM certifications and technician certificates', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_CERT_001 creates a certificate', async ({ page }) => {
    test.setTimeout(180000);
    await loginToRioEam(page);
    await openCertifications(page);

    await page.getByRole('button', { name: 'Certificate', exact: true }).click();
    await page.getByTitle('Add').first().click();
    await expect(page.getByRole('heading', { name: 'Add New Certificate' })).toBeVisible();
    await page.getByPlaceholder('Enter certificate name').fill(CERT_NAME);
    await page.getByPlaceholder('Enter certificate number').fill(CERT_NUMBER);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/tech-certificates\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    expect((await createResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Certificate created successfully')).toBeVisible({ timeout: 15000 });

    const row = page.locator('tbody tr').filter({ hasText: CERT_NAME }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(CERT_NUMBER);

    await page.getByRole('button', { name: 'Maintenance Certificate', exact: true }).click();
    await page.getByTitle('Add').first().click();
    const available = page
      .locator('div.border')
      .filter({ has: page.getByRole('heading', { name: 'Available Certificates' }) })
      .first();
    await available.getByPlaceholder('Search available certificates...').fill(CERT_NAME);
    await expect(available.locator('tbody tr').filter({ hasText: CERT_NAME }).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(available).toContainText(CERT_NUMBER);
  });

  test('TC_CERT_002 requires a certificate for preventive maintenance', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await openCertifications(page);
    await page.getByRole('button', { name: 'Maintenance Certificate', exact: true }).click();
    await page.getByTitle('Add').first().click();

    const assetSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select asset type' }) });
    await assetSelect.selectOption({ label: ASSET_TYPE });
    const maintSelect = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: 'Select maintenance type' }) });
    await expect(maintSelect.locator('option', { hasText: MAINT_TYPE })).toBeAttached({ timeout: 20000 });
    await maintSelect.selectOption({ label: MAINT_TYPE });

    const available = page
      .locator('div.border')
      .filter({ has: page.getByRole('heading', { name: 'Available Certificates' }) })
      .first();
    await available.getByPlaceholder('Search available certificates...').fill(CERT_NAME);
    await available.locator('tbody tr').filter({ hasText: CERT_NAME }).first().click();
    const selected = page
      .locator('div.border')
      .filter({ has: page.getByRole('heading', { name: 'Selected Certificates' }) })
      .first();
    await expect(selected).toContainText(CERT_NAME);

    const mapResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/maintenance-certificates\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await mapResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Certificates mapped successfully')).toBeVisible({ timeout: 15000 });

    const listAsset = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select Asset Type' }) });
    if ((await listAsset.inputValue()) === '') {
      await listAsset.selectOption({ label: ASSET_TYPE });
    }
    const listMaint = page
      .locator('select')
      .filter({ has: page.locator('option', { hasText: 'Select maintenance type' }) });
    if ((await listMaint.inputValue()) === '') {
      await expect(listMaint.locator('option', { hasText: MAINT_TYPE })).toBeAttached({ timeout: 20000 });
      await listMaint.selectOption({ label: MAINT_TYPE });
    }

    const mapped = page.locator('tbody tr').filter({ hasText: CERT_NAME }).first();
    await expect(mapped).toBeVisible({ timeout: 20000 });
    await expect(mapped).toContainText(ASSET_TYPE);
    await expect(mapped).toContainText(MAINT_TYPE);
    await expect(mapped).toContainText(CERT_NUMBER);

    await gotoProtected(page, `${BASE}/technician-certificates`);
    await expect(page.getByRole('heading', { name: 'Technician Certificates' })).toBeVisible({ timeout: 30000 });
    await expect(
      page.locator('tbody tr').filter({ hasText: CERT_NAME }).filter({ hasText: /Approved/i }),
    ).toHaveCount(0);
  });

  test('TC_CERT_003 requires a certificate to inspect an asset type', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await openCertifications(page);
    await page.getByRole('button', { name: 'Inspection Certificates', exact: true }).click();
    await page.getByTitle('Add').first().click();

    await page.getByRole('button', { name: 'Select Asset Type' }).click();
    await page.getByPlaceholder('Search asset types...').fill(ASSET_TYPE);
    await page.getByRole('button', { name: ASSET_TYPE, exact: true }).click();

    const available = page
      .locator('div.border')
      .filter({ has: page.getByRole('heading', { name: 'Available Certificates' }) })
      .first();
    await available.getByPlaceholder('Search available certificates...').fill(CERT_NAME);
    await available.locator('tbody tr').filter({ hasText: CERT_NAME }).first().click();
    const selected = page
      .locator('div.border')
      .filter({ has: page.getByRole('heading', { name: 'Selected Certificates' }) })
      .first();
    await expect(selected).toContainText(CERT_NAME);

    await page.getByRole('button', { name: 'Add Document' }).click();
    await page.getByRole('button', { name: 'Select Type' }).click();
    await page
      .locator('div.fixed')
      .filter({ has: page.getByPlaceholder('Search types...') })
      .locator('div.cursor-pointer')
      .first()
      .click();
    await page.locator('input[type="file"]').last().setInputFiles(pdfFile('license.pdf'));

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/inspection-certificates\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    const uploadResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/asset-type-docs/upload'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    expect((await uploadResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Inspection certificates added successfully')).toBeVisible({
      timeout: 15000,
    });

    const row = page.locator('tbody tr').filter({ hasText: CERT_NAME }).filter({ hasText: ASSET_TYPE }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(CERT_NUMBER);
    await row.getByTitle('Edit').click();
    await expect(page.getByRole('heading', { name: 'Update Certificate' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter certificate name').last()).toHaveValue(CERT_NAME);
    await expect(page.getByPlaceholder('Enter certificate number').last()).toHaveValue(CERT_NUMBER);
  });

  test('TC_CERT_004 technician submits a certificate', async ({ page }) => {
    test.setTimeout(180000);
    await loginToRioEam(page);
    await submitTechnicianCertificate(page, {
      employee: TECHNICIAN,
      expiry: localIso({ years: 1 }),
      fileName: 'cert.pdf',
    });

    const row = page.locator('tbody tr').filter({ hasText: CERT_NAME }).filter({ hasText: TECHNICIAN }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(/Approval Pending|Pending/i);

    await gotoProtected(page, `${BASE}/tech-cert-approvals`);
    await expect(page.getByRole('heading', { name: 'HR/Manager Approval' })).toBeVisible({ timeout: 30000 });
    const pending = page
      .locator('tbody tr')
      .filter({ hasText: CERT_NAME })
      .filter({ hasText: TECHNICIAN })
      .first();
    await expect(pending).toBeVisible({ timeout: 20000 });
    await expect(pending).toContainText(/Approval Pending|Pending/i);
  });

  test('TC_CERT_005 approves a technician certificate and assigns it', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/tech-cert-approvals`);
    await expect(page.getByRole('heading', { name: 'HR/Manager Approval' })).toBeVisible({ timeout: 30000 });

    const pending = page
      .locator('tbody tr')
      .filter({ hasText: CERT_NAME })
      .filter({ hasText: TECHNICIAN })
      .first();
    await expect(pending).toBeVisible({ timeout: 20000 });
    await expect(pending).toContainText(CERT_NUMBER);
    await expect(pending).toContainText(String(new Date().getFullYear() + 1));
    await expect(pending.getByRole('button', { name: 'View' })).toBeVisible();

    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        /\/employee-tech-certificates\/[^/]+\/status$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await pending.getByRole('button', { name: 'Approve' }).click();
    expect((await approveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Certificate approved successfully')).toBeVisible({ timeout: 15000 });

    await gotoProtected(page, `${BASE}/technician-certificates`);
    const approved = page
      .locator('tbody tr')
      .filter({ hasText: CERT_NAME })
      .filter({ hasText: TECHNICIAN })
      .first();
    await expect(approved).toContainText(/Approved/i);
    await approved.getByTitle('Edit').click();
    const expiryValue = await approved.locator('input[type="date"]').last().inputValue();
    expect(expiryValue > localIso({ days: 0 })).toBeTruthy();
    await approved.getByRole('button', { name: 'Cancel' }).click();

    await runMaintenanceScheduleJob(page);
    const schedule = await openDueAssetSchedule(page);
    await approveInHouseWorkflow(page, schedule.assetId);
  });

  test('TC_CERT_006 rejects a technician certificate', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    rejectedEmployee = await submitTechnicianCertificate(page, {
      employee: '',
      avoid: TECHNICIAN,
      expiry: localIso({ years: 1 }),
      fileName: 'cert.pdf',
    });

    await gotoProtected(page, `${BASE}/tech-cert-approvals`);
    const pending = page
      .locator('tbody tr')
      .filter({ hasText: CERT_NAME })
      .filter({ hasText: rejectedEmployee })
      .filter({ hasText: /Pending/i })
      .first();
    await expect(pending).toBeVisible({ timeout: 20000 });
    await pending.getByRole('button', { name: 'Reject' }).click();

    const reason = page.getByPlaceholder(/reason|comment|note/i);
    if (await reason.isVisible().catch(() => false)) {
      await reason.fill(REJECT_REASON);
      await page.getByRole('button', { name: /Confirm|Reject/i }).last().click();
    }
    await expect(page.getByText('Certificate rejected successfully')).toBeVisible({ timeout: 15000 });

    await gotoProtected(page, `${BASE}/technician-certificates`);
    const rejected = page
      .locator('tbody tr')
      .filter({ hasText: CERT_NAME })
      .filter({ hasText: rejectedEmployee })
      .first();
    await expect(rejected).toContainText(/Rejected/i);
    await expect(rejected).toContainText(REJECT_REASON);

    await gotoProtected(page, `${BASE}/maintenance-approval`);
    const requestRow = page.locator('tbody tr').first();
    if (await requestRow.isVisible().catch(() => false)) {
      await requestRow.locator('td').nth(1).click();
      await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });
      const technicianTab = page.getByRole('button', { name: /Technician/i });
      if (await technicianTab.isVisible().catch(() => false)) {
        await technicianTab.click();
        const technicianSelect = page.locator('select').filter({ hasText: 'Select Technician' });
        await expect(technicianSelect.locator('option', { hasText: rejectedEmployee })).toHaveCount(0);
      }
    }
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCertifications(page) {
  await gotoProtected(page, CERTIFICATIONS);
  await expect(page.getByRole('heading', { name: 'Existing Certificates' })).toBeVisible({ timeout: 45000 });
}

/**
 * @param {{ days?: number, years?: number }} [offset]
 */
function localIso(offset = {}) {
  const date = new Date();
  if (offset.years) date.setFullYear(date.getFullYear() + offset.years);
  if (offset.days) date.setDate(date.getDate() + offset.days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
 * @param {{ employee: string, avoid?: string, expiry: string, fileName: string }} details
 * @returns {Promise<string>}
 */
async function submitTechnicianCertificate(page, details) {
  await gotoProtected(page, `${BASE}/technician-certificates`);
  await expect(page.getByRole('heading', { name: 'Technician Certificates' })).toBeVisible({ timeout: 30000 });
  await page.getByTitle('Add').click();

  const employeeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select employee' }) });
  await expect(employeeSelect.locator('option').nth(1)).toBeAttached({ timeout: 20000 });
  const chosen = await chooseOption(employeeSelect, details.employee, details.avoid || '');
  await employeeSelect.selectOption(chosen.value);

  const certificateSelect = page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Select certificate' }) });
  await expect(certificateSelect.locator('option', { hasText: CERT_NAME })).toBeAttached({ timeout: 20000 });
  const certificate = await chooseOption(certificateSelect, CERT_NAME, '');
  await certificateSelect.selectOption(certificate.value);

  const dates = page.locator('input[type="date"]');
  await dates.nth(0).fill(localIso({ days: 0 }));
  await dates.nth(1).fill(details.expiry);
  await page.locator('input[type="file"]').setInputFiles(pdfFile(details.fileName));

  const uploadResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/employee-tech-certificates\/?$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  expect((await uploadResponsePromise).ok()).toBeTruthy();
  await expect(page.getByText('Certificate uploaded successfully')).toBeVisible({ timeout: 15000 });
  return chosen.text;
}

/**
 * @param {import('@playwright/test').Locator} select
 * @param {string} preferred
 * @param {string} avoid
 */
async function chooseOption(select, preferred, avoid) {
  const options = select.locator('option');
  const count = await options.count();
  /** @type {{ value: string, text: string } | null} */
  let fallback = null;
  for (let index = 0; index < count; index += 1) {
    const option = options.nth(index);
    const value = (await option.getAttribute('value')) || '';
    const text = ((await option.textContent()) || '').trim();
    if (!value || !text) continue;
    if (avoid && text.includes(avoid)) continue;
    if (!fallback) fallback = { value, text };
    if (preferred && text.includes(preferred)) return { value, text };
  }
  expect(fallback, preferred ? `Option containing ${preferred}` : 'Employee option').toBeTruthy();
  return /** @type {{ value: string, text: string }} */ (fallback);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function runMaintenanceScheduleJob(page) {
  await gotoProtected(page, `${BASE}/adminsettings/configuration/job-monitor`);
  await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible({ timeout: 45000 });
  const jobRow = page.locator('tbody tr').filter({ hasText: /maintenance/i }).first();
  await expect(jobRow).toBeVisible({ timeout: 20000 });
  await jobRow.click();
  const runResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/job-monitor\/jobs\/[^/]+\/run$/.test(new URL(response.url()).pathname),
    { timeout: 180000 },
  );
  await jobRow.getByTitle('Run').click();
  expect((await runResponsePromise).ok()).toBeTruthy();
  await expect(page.locator('table').nth(1).locator('tbody tr').first().getByText('OK', { exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ assetId: string }>}
 */
async function openDueAssetSchedule(page) {
  await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  const assetRow = page.locator('tbody tr').filter({ hasText: ASSET_TYPE }).first();
  await expect(assetRow).toBeVisible({ timeout: 30000 });
  await expect(assetRow.getByText(/due|days|overdue/i).first()).toBeVisible();
  const assetId = (await assetRow.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();
  await assetRow.locator('td').nth(1).click();
  await page.waitForURL(/\/maintenance-list-detail\//, { timeout: 20000 });
  return { assetId };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function approveInHouseWorkflow(page, assetId) {
  await gotoProtected(page, `${BASE}/maintenance-approval`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  const requestRow = page
    .locator('tbody tr')
    .filter({ hasText: new RegExp(`${escapeRegExp(assetId)}|${escapeRegExp(ASSET_TYPE)}`) })
    .first();
  await expect(requestRow).toBeVisible({ timeout: 30000 });
  await requestRow.locator('td').nth(1).click();
  await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });

  for (let step = 0; step < 8; step += 1) {
    if (await page.getByText(/fully approved/i).isVisible().catch(() => false)) return;
    const technicianTab = page.getByRole('button', { name: /Technician/i });
    if (await technicianTab.isVisible().catch(() => false)) {
      await technicianTab.click();
      const technicianSelect = page.locator('select').filter({ hasText: 'Select Technician' });
      if (await technicianSelect.isVisible().catch(() => false)) {
        const ravi = technicianSelect.locator('option', { hasText: TECHNICIAN }).first();
        await expect(ravi, `${TECHNICIAN} can be selected`).toBeAttached({ timeout: 20000 });
        if ((await technicianSelect.inputValue()) === '') {
          await technicianSelect.selectOption({ value: (await ravi.getAttribute('value')) || '' });
        }
      }
      await page.getByRole('button', { name: /Approval/i }).first().click();
    }
    const approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approveButton.isVisible().catch(() => false))) break;
    await approveButton.click();
    await page.getByPlaceholder(/approval note/i).fill(APPROVAL_COMMENT);
    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/approval-detail\/[^/]+\/approve$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Approve', exact: true }).last().click();
    expect((await approveResponsePromise).ok()).toBeTruthy();
  }
  await expect(page.getByText(/fully approved/i)).toBeVisible({ timeout: 20000 });
}

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
