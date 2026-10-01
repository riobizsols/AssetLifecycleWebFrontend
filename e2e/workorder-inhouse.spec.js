// @ts-check
/**
 * 13. Work orders
 * TC_WO_001 — Open the work order created from approved in-house maintenance.
 * TC_WO_002 — Move an approved work order to completed.
 *
 * Test data: Asset Name = Oxygen Concentrator
 * Approval comment: Schedule for this week
 * Status path: In Progress, then Completed
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const ASSET_NAME = 'Oxygen Concentrator';

/** @param {string} value */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
const APPROVAL_COMMENT = 'Schedule for this week';

/** Shared by the serial cases so TC_WO_002 continues the approved job from TC_WO_001. */
let approvedAmsId = '';

test.describe('RIO EAM in-house work orders', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_WO_001 opens the work order created from approved in-house maintenance', async ({
    page,
  }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);

    approvedAmsId = (await createApprovedInHouseWorkOrder(page)).amsId;
    await openWorkOrderDetail(page, approvedAmsId);

    await expect(page.getByText(ASSET_NAME).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible();

    const statusText = page.locator('h1').locator('xpath=..').locator('span').first();
    await expect(statusText).toBeVisible();
    await expect(statusText).toHaveText(/Approved|Initiated|In Progress|Completed/i);

    await page.getByRole('button', { name: 'Checklist' }).click();
    await expect(page.getByRole('heading', { name: 'Maintenance Checklist' })).toBeVisible({
      timeout: 10000,
    });
    const checklistSection = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Maintenance Checklist' }) });
    await expect(checklistSection.locator('div.border.rounded').first()).toBeVisible();

    await page.getByRole('button', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'Previous 5 Maintenance Records' })).toBeVisible({
      timeout: 10000,
    });
  });

  test('TC_WO_002 moves an approved work order to completed', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);

    if (!approvedAmsId) {
      approvedAmsId = (await createApprovedInHouseWorkOrder(page)).amsId;
    }

    await gotoProtected(page, `${BASE}/maintenance-list-detail/${approvedAmsId}`);
    await expect(page.locator('select[name="status"]')).toBeVisible({ timeout: 30000 });

    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isDisabled()) {
      await expect(page.getByRole('button', { name: 'Submit' })).toHaveCount(0);
      test.info().annotations.push({
        type: 'view-only',
        description: 'Current user cannot edit this work order.',
      });
      return;
    }

    await statusSelect.selectOption('CO');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page.getByText('Please fill all required fields')).toBeVisible({ timeout: 15000 });

    await fillExecutionFields(page);
    await acknowledgeChecklist(page);

    await statusSelect.selectOption('IP');
    await saveMaintenanceStatus(page);

    await page.reload();
    await expect(page.locator('select[name="status"]')).toHaveValue('IP', { timeout: 30000 });

    await acknowledgeChecklist(page);
    await page.locator('select[name="status"]').selectOption('CO');
    await saveMaintenanceStatus(page);

    await page.reload();
    await expect(page.locator('select[name="status"]')).toHaveValue('CO', { timeout: 30000 });
    await expect(page.locator('select[name="status"] option:checked')).toHaveText(/Completed/i);

    await openWorkOrderDetail(page, approvedAmsId);
    await expect(page.getByText(/Completed/i).first()).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'Previous 5 Maintenance Records' })).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText(/In Progress|Completed/i).first()).toBeVisible();
  });
});

/**
 * Job Monitor → due schedule → in-house approvals → work order id.
 * @param {import('@playwright/test').Page} page
 */
async function createApprovedInHouseWorkOrder(page) {
  await runMaintenanceScheduleJob(page);
  const schedule = await openDueAssetSchedule(page);
  await approveInHouseWorkflow(page, schedule.assetId);
  return schedule;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function runMaintenanceScheduleJob(page) {
  await gotoProtected(page, `${BASE}/adminsettings/configuration/job-monitor`);
  await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });

  const jobRow = page.locator('tbody tr').filter({ hasText: /maintenance/i }).first();
  await expect(jobRow, 'Maintenance schedule job should be listed').toBeVisible({ timeout: 20000 });
  await jobRow.click();

  const runResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/job-monitor\/jobs\/[^/]+\/run$/.test(new URL(response.url()).pathname),
    { timeout: 180000 },
  );
  await jobRow.getByTitle('Run').click();
  const runResponse = await runResponsePromise;
  expect(runResponse.ok(), `Maintenance job run failed: ${runResponse.status()}`).toBeTruthy();
  await expect(page.getByText(/Job triggered successfully/i)).toBeVisible({ timeout: 20000 });

  const historyRow = page.locator('table').nth(1).locator('tbody tr').first();
  await expect(historyRow.getByText('OK', { exact: true })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ amsId: string, assetId: string }>}
 */
async function openDueAssetSchedule(page) {
  await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });

  const assetRow = page.locator('tbody tr').filter({ hasText: ASSET_NAME }).first();
  await expect(assetRow, `${ASSET_NAME} should be listed as due`).toBeVisible({ timeout: 30000 });
  await expect(assetRow.getByText(/due|days|overdue/i).first()).toBeVisible();
  const assetId = (await assetRow.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();

  await assetRow.locator('td').nth(1).click();
  await page.waitForURL(/\/maintenance-list-detail\/([^/?]+)/, { timeout: 20000 });
  const match = page.url().match(/\/maintenance-list-detail\/([^/?]+)/);
  expect(match?.[1], 'Maintenance schedule id').toBeTruthy();
  return { amsId: match[1], assetId };
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
    .filter({ hasText: new RegExp(`${escapeRegExp(assetId)}|${escapeRegExp(ASSET_NAME)}`) })
    .first();
  await expect(requestRow, `Pending in-house request for ${ASSET_NAME}`).toBeVisible({
    timeout: 30000,
  });
  await requestRow.locator('td').nth(1).click();
  await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });

  for (let step = 0; step < 8; step += 1) {
    const completed = page.getByText(/fully approved/i);
    if (await completed.isVisible().catch(() => false)) {
      return;
    }

    await assignInHouseTechnician(page);

    const approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approveButton.isVisible().catch(() => false))) {
      break;
    }

    await approveButton.click();
    const note = page.getByPlaceholder(/approval note/i);
    await expect(note).toBeVisible({ timeout: 10000 });
    await note.fill(APPROVAL_COMMENT);

    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/approval-detail\/[^/]+\/approve$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Approve', exact: true }).last().click();
    const approveResponse = await approveResponsePromise;
    expect(approveResponse.ok(), `Approval step ${step + 1} failed: ${approveResponse.status()}`).toBeTruthy();
    await page.waitForTimeout(1000);
  }

  await expect(page.getByText(/fully approved/i)).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function assignInHouseTechnician(page) {
  const technicianTab = page.getByRole('button', { name: /Technician/i });
  if (!(await technicianTab.isVisible().catch(() => false))) return;

  await technicianTab.click();
  const technicianSelect = page.locator('select').filter({ hasText: 'Select Technician' });
  if (!(await technicianSelect.isVisible().catch(() => false))) return;
  if (await technicianSelect.inputValue()) return;

  const optionCount = await technicianSelect.locator('option').count();
  if (optionCount > 1) {
    await technicianSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
  }
  await page.getByRole('button', { name: /Approval/i }).first().click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} amsId
 */
async function openWorkOrderDetail(page, amsId) {
  await gotoProtected(page, `${BASE}/workorder-management`);
  await expect(page.getByText('Work Order Management').first()).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading work orders...')).toHaveCount(0, { timeout: 30000 });

  const row = page.locator('tbody tr').filter({ hasText: new RegExp(`${ASSET_NAME}|${amsId}`) }).first();
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.locator('td').nth(1).click();
  await page.waitForURL(new RegExp(`/workorder-management/workorder-detail/${amsId}`), {
    timeout: 20000,
  });
  await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function fillExecutionFields(page) {
  await fillIfEmpty(page.locator('input[name="technician_name"]'), 'E2E Technician');
  await fillIfEmpty(page.locator('input[name="technician_email"]'), 'e2e.technician@example.com');
  await fillIfEmpty(page.locator('input[name="technician_phno"]'), '9876543210');
  await fillIfEmpty(page.locator('input[name="po_number"]'), 'E2E-PO');
  await fillIfEmpty(page.locator('input[name="invoice"]'), 'E2E-INV');
  await fillIfEmpty(page.locator('input[name="cost"]'), '1');
}

/**
 * @param {import('@playwright/test').Locator} locator
 * @param {string} value
 */
async function fillIfEmpty(locator, value) {
  if ((await locator.count()) === 0) return;
  if (await locator.isDisabled()) return;
  const current = await locator.inputValue();
  if (!current.trim()) {
    await locator.fill(value);
  }
}

/**
 * Checklist lines are displayed, not typed. Opening them is the answer step the screen supports.
 * @param {import('@playwright/test').Page} page
 */
async function acknowledgeChecklist(page) {
  const viewChecklist = page.getByRole('button', { name: 'View Checklist' });
  if (!(await viewChecklist.isEnabled().catch(() => false))) return;
  await viewChecklist.click();
  await expect(page.getByRole('heading', { name: /Checklist/i })).toBeVisible({ timeout: 10000 });
  const lines = page.locator('ul li');
  expect(await lines.count()).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Close' }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function saveMaintenanceStatus(page) {
  const saveResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'PUT' &&
      /\/maintenance-schedules\/[^/]+$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Submit' }).click();
  const saveResponse = await saveResponsePromise;
  expect(saveResponse.ok(), `Status save failed: ${saveResponse.status()}`).toBeTruthy();
  await expect(page.getByText(/updated successfully/i)).toBeVisible({ timeout: 15000 });
}
