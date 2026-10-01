// @ts-check
/**
 * 17. Inspection execution and approval
 * TC_INSP_001 raise an inspection
 * TC_INSP_002 pass inside the range
 * TC_INSP_003 failed pressure opens in-house maintenance
 * TC_INSP_004 a wrong qualitative answer fails only that question
 * TC_INSP_005 approve a completed inspection
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const ASSET_ID = 'AST-101';
const LAMP = 'Power lamp is on';
const PRESSURE = 'Output pressure psi';
const APPROVAL_COMMENT = 'Approved after inspection';

/** @type {string} */
let passedInspectionId = '';

test.describe('RIO EAM inspection execution and approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_INSP_001 raises an inspection', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    passedInspectionId = await createInspection(page, ASSET_ID);

    await gotoProtected(page, `${BASE}/inspection-view`);
    await expect(page.locator('tbody tr').filter({ hasText: passedInspectionId }).first()).toBeVisible({
      timeout: 20000,
    });

    await openInspection(page, passedInspectionId);
    await expect(page.getByText(LAMP).first()).toBeVisible();
    await expect(page.getByText(PRESSURE).first()).toBeVisible();
  });

  test('TC_INSP_002 passes an inspection inside the range', async ({ page }) => {
    test.setTimeout(300000);
    await loginToRioEam(page);
    if (!passedInspectionId) passedInspectionId = await createInspection(page, ASSET_ID);

    const maintenanceBefore = await countMaintenanceRows(page, ASSET_ID);
    await openInspection(page, passedInspectionId);
    await recordAnswer(page, LAMP, 'Yes');
    await recordAnswer(page, PRESSURE, '50', { outOfRange: false });
    await page.getByLabel('Trigger Maintenance').uncheck();
    await page.locator('select').last().selectOption('CO');
    await saveInspection(page);

    await gotoProtected(page, `${BASE}/inspection-view`);
    const row = page.locator('tbody tr').filter({ hasText: passedInspectionId }).first();
    await expect(row).toContainText(/Completed|Pass/i);
    expect(await countMaintenanceRows(page, ASSET_ID)).toBe(maintenanceBefore);
  });

  test('TC_INSP_003 a failed pressure check opens in-house maintenance', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const inspectionId = await createInspection(page, ASSET_ID);

    await openInspection(page, inspectionId);
    await recordAnswer(page, LAMP, 'Yes');
    await recordAnswer(page, PRESSURE, '25', { outOfRange: true });
    await page.locator('textarea[name="notes"]').fill('Pressure below the minimum range');
    await page.getByLabel('Trigger Maintenance').check();
    await page.locator('select').last().selectOption('CO');
    await saveInspection(page);

    await gotoProtected(page, `${BASE}/inspection-view`);
    await expect(page.locator('tbody tr').filter({ hasText: inspectionId }).first()).toContainText(/Fail|Completed/i);

    await runMaintenanceScheduleJob(page);
    await gotoProtected(page, `${BASE}/maintenance-list`);
    const maintenanceRow = page.locator('tbody tr').filter({ hasText: ASSET_ID }).first();
    await expect(maintenanceRow).toBeVisible({ timeout: 30000 });

    await approveInHouseWorkflow(page, ASSET_ID);
    await gotoProtected(page, `${BASE}/maintenance-approval`);
    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('tbody tr').filter({ hasText: ASSET_ID })).toHaveCount(0);
  });

  test('TC_INSP_004 a wrong qualitative answer fails only that question', async ({ page }) => {
    test.setTimeout(300000);
    await loginToRioEam(page);
    const maintenanceBefore = await countMaintenanceRows(page, ASSET_ID);
    const inspectionId = await createInspection(page, ASSET_ID);

    await openInspection(page, inspectionId);
    await recordAnswer(page, LAMP, 'No');
    await recordAnswer(page, PRESSURE, '50', { outOfRange: false });

    const lamp = page.locator('div.border').filter({ hasText: LAMP }).first();
    const pressure = page.locator('div.border').filter({ hasText: PRESSURE }).first();
    await expect(lamp).toContainText(/Expected:\s*Yes/i);
    await expect(lamp).toContainText(/Recorded:\s*No/i);
    await expect(pressure).toContainText(/Recorded:\s*50/);
    await expect(pressure.getByText('Value is outside the expected range')).toHaveCount(0);

    await page.getByLabel('Trigger Maintenance').uncheck();
    await page.locator('select').last().selectOption('CO');
    await saveInspection(page);
    expect(await countMaintenanceRows(page, ASSET_ID)).toBe(maintenanceBefore);
  });

  test('TC_INSP_005 approves a completed inspection', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/inspection-approval`);
    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });

    const row = page.locator('tbody tr').filter({ hasText: ASSET_ID }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.locator('td').nth(1).click();
    await page.waitForURL(/\/inspection-approval-detail\//, { timeout: 20000 });

    await expect(page.getByText(LAMP).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(PRESSURE).first()).toBeVisible();

    const viewOnly = page.getByText(/view only|no action required|waiting for/i);
    if (await viewOnly.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: 'Approve', exact: true })).toHaveCount(0);
      return;
    }

    await page.getByRole('button', { name: 'Approve', exact: true }).click();
    await page.locator('textarea').last().fill(APPROVAL_COMMENT);
    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /approve/i.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Approve', exact: true }).last().click();
    expect((await approveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Inspection approved successfully')).toBeVisible({ timeout: 15000 });

    await gotoProtected(page, `${BASE}/inspection-approval`);
    await expect(page.locator('tbody tr').filter({ hasText: passedInspectionId || ASSET_ID })).toHaveCount(0);
  });
});

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 * @returns {Promise<string>}
 */
async function createInspection(page, assetId) {
  await gotoProtected(page, `${BASE}/inspection-view`);
  await expect(page.getByText('Inspection List').first()).toBeVisible({ timeout: 45000 });
  await page.locator('button:has(svg.lucide-plus)').first().click();
  await page.waitForURL(/\/inspection-view\/create/, { timeout: 20000 });
  await page.getByRole('button', { name: 'Scan Asset' }).click();
  await page.getByPlaceholder(/Scan or enter asset ID/i).fill(assetId);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/inspection/create-manual'),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Trigger Inspection' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Create inspection failed: ${createResponse.status()}`).toBeTruthy();
  const body = await createResponse.json();
  const inspectionId = String(body?.data?.ais_id || '');
  expect(inspectionId).toBeTruthy();
  await expect(page.getByText('Inspection created successfully')).toBeVisible({ timeout: 15000 });
  return inspectionId;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} inspectionId
 */
async function openInspection(page, inspectionId) {
  await gotoProtected(page, `${BASE}/inspection-view/${inspectionId}`);
  await expect(page.getByText('Inspection Checklist').first()).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} question
 * @param {string} value
 * @param {{ outOfRange?: boolean }} [options]
 */
async function recordAnswer(page, question, value, options = {}) {
  await page.locator('div.border').filter({ hasText: question }).first().click();
  await expect(page.getByText('Record Value')).toBeVisible({ timeout: 10000 });
  const input = page.getByPlaceholder(/Enter (numeric|text) value/i);
  await input.fill(value);
  const outside = page.getByText('Value is outside the expected range');
  if (options.outOfRange === true) {
    await expect(outside).toBeVisible();
  } else if (options.outOfRange === false) {
    await expect(outside).toHaveCount(0);
  }
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(/saved locally/i)).toBeVisible({ timeout: 10000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function saveInspection(page) {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      ['PUT', 'POST'].includes(response.request().method()) &&
      /inspection/i.test(response.url()),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Save Changes' }).click();
  expect((await saveResponsePromise).ok()).toBeTruthy();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 * @returns {Promise<number>}
 */
async function countMaintenanceRows(page, assetId) {
  await gotoProtected(page, `${BASE}/maintenance-list`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  return page.locator('tbody tr').filter({ hasText: assetId }).count();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function runMaintenanceScheduleJob(page) {
  await gotoProtected(page, `${BASE}/adminsettings/configuration/job-monitor`);
  await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible({ timeout: 45000 });
  const jobRow = page.locator('tbody tr').filter({ hasText: /maintenance/i }).first();
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
 * @param {string} assetId
 */
async function approveInHouseWorkflow(page, assetId) {
  await gotoProtected(page, `${BASE}/maintenance-approval`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  const requestRow = page.locator('tbody tr').filter({ hasText: assetId }).first();
  await expect(requestRow).toBeVisible({ timeout: 30000 });
  await requestRow.locator('td').nth(1).click();
  await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });

  for (let step = 0; step < 8; step += 1) {
    if (await page.getByText(/fully approved/i).isVisible().catch(() => false)) return;
    const technicianTab = page.getByRole('button', { name: /Technician/i });
    if (await technicianTab.isVisible().catch(() => false)) {
      await technicianTab.click();
      const technicianSelect = page.locator('select').filter({ hasText: 'Select Technician' });
      if ((await technicianSelect.isVisible().catch(() => false)) && !(await technicianSelect.inputValue())) {
        if ((await technicianSelect.locator('option').count()) > 1) {
          await technicianSelect.selectOption({ index: 1 });
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
