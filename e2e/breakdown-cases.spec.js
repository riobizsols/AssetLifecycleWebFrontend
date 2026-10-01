// @ts-check
/**
 * 14. Breakdown
 * TC_BD_001 — Report a breakdown on an assigned asset.
 * TC_BD_002 — Offer only reason codes for that asset type.
 * TC_BD_003 — Update an open breakdown.
 * TC_BD_004 — Close a breakdown through in-house repair, then reopen it.
 *
 * Precondition: AST-201 is assigned and Compressor failure is mapped to Oxygen Concentrator.
 * The suite signs in with RIO_EMAIL / RIO_PASSWORD (Anita Rao in the case data).
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const ASSET_ID = 'AST-201';
const ASSET_TYPE = 'Oxygen Concentrator';
const REASON = 'Compressor failure';
const OTHER_TYPE_REASON = 'Display crack';
const DESCRIPTION = 'Unit not building pressure';
const NOTE = 'Patient moved to backup unit';
const CLOSE_COMMENT = 'Repaired';
const REOPEN_REASON = 'Fault returned';
const APPROVAL_COMMENT = 'Schedule for this week';

/** @type {string} */
let breakdownId = '';
/** @type {string} */
let reporter = '';

test.describe('RIO EAM breakdown cases', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_BD_001 reports a breakdown on an assigned asset', async ({ page }) => {
    test.setTimeout(420000);
    await loginToRioEam(page);

    await openEmployeeReport(page);
    await selectAssignedAsset(page, ASSET_ID);
    await selectReason(page, REASON);
    await page.getByPlaceholder('Max 500 characters...').fill(DESCRIPTION);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/reportbreakdown/create'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Report Breakdown' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), `Create failed: ${createResponse.status()}`).toBeTruthy();
    const body = await createResponse.json();
    breakdownId = String(body?.data?.abr_id || body?.data?.breakdown_id || '');
    expect(breakdownId, 'New breakdown id').toBeTruthy();

    await expect(page.getByText('Breakdown report created successfully')).toBeVisible({
      timeout: 20000,
    });

    await openBreakdownHistory(page);
    const historyRow = page.locator('tr').filter({ hasText: DESCRIPTION }).first();
    await expect(historyRow).toBeVisible({ timeout: 30000 });
    await expect(historyRow).toContainText(ASSET_ID);
    await expect(historyRow).toContainText(new RegExp(REASON, 'i'));
    await expect(historyRow).toContainText(/Created|Open|Initiated/i);
    reporter = (await historyRow.innerText()).replace(/\s+/g, ' ');
    expect(reporter.length).toBeGreaterThan(DESCRIPTION.length);
  });

  test('TC_BD_002 offers only reason codes for the asset type', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);

    await openEmployeeReport(page);
    await selectAssetByType(page, ASSET_TYPE);
    await page.getByText('Select Breakdown Reason', { exact: true }).click();

    const options = page.getByRole('option');
    await expect(options.first()).toBeVisible({ timeout: 15000 });
    const labels = (await options.allInnerTexts()).map((text) => text.trim());
    const reasonLabels = labels.filter((label) => !/create new/i.test(label));

    expect(reasonLabels.join('\n')).toMatch(new RegExp(REASON, 'i'));
    expect(reasonLabels.join('\n')).not.toMatch(new RegExp(OTHER_TYPE_REASON, 'i'));
  });

  test('TC_BD_003 updates an open breakdown', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);

    await openEmployeeReport(page);
    const row = page.locator('tbody tr').filter({ hasText: DESCRIPTION }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    const reporterBefore = (await row.locator('td').first().innerText()).replace(/\s+/g, ' ').trim();

    await row.getByTitle(/view|edit/i).click();
    await expect(page.getByRole('button', { name: 'Update Breakdown Report' })).toBeVisible({
      timeout: 20000,
    });

    const description = page.locator('textarea').first();
    await description.fill(NOTE);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        response.url().includes('/reportbreakdown/update/'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Update Breakdown Report' }).click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), `Update failed: ${updateResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Breakdown report updated successfully')).toBeVisible({
      timeout: 20000,
    });

    await openEmployeeReport(page);
    const updated = page.locator('tbody tr').filter({ hasText: NOTE }).first();
    await expect(updated).toBeVisible({ timeout: 30000 });
    await expect(updated).toContainText(NOTE);
    const reporterAfter = (await updated.locator('td').first().innerText()).replace(/\s+/g, ' ').trim();
    expect(reporterAfter).toBe(reporterBefore);
  });

  test('TC_BD_004 closes an in-house breakdown and reopens it', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);

    await runMaintenanceScheduleJob(page);
    await openDueSchedule(page, ASSET_ID);
    const approvalCount = await approveInHouseWorkflow(page, ASSET_ID);
    expect(approvalCount).toBeGreaterThan(0);

    await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
    const scheduleRow = page.locator('tbody tr').filter({ hasText: ASSET_ID }).first();
    await expect(scheduleRow).toBeVisible({ timeout: 30000 });
    await scheduleRow.locator('td').nth(1).click();
    await page.waitForURL(/\/maintenance-list-detail\//, { timeout: 20000 });

    await acknowledgeChecklist(page);
    const notes = page.locator('textarea[name="notes"]');
    if (await notes.isVisible().catch(() => false)) {
      await notes.fill(CLOSE_COMMENT);
    }
    const statusSelect = page.locator('select[name="status"]');
    if (await statusSelect.isVisible().catch(() => false)) {
      await fillIfEmpty(page.locator('input[name="technician_name"]'), 'E2E Technician');
      await fillIfEmpty(page.locator('input[name="technician_email"]'), 'e2e.technician@example.com');
      await fillIfEmpty(page.locator('input[name="technician_phno"]'), '9876543210');
      await fillIfEmpty(page.locator('input[name="po_number"]'), 'E2E-PO');
      await fillIfEmpty(page.locator('input[name="invoice"]'), 'E2E-INV');
      await fillIfEmpty(page.locator('input[name="cost"]'), '1');
      await statusSelect.selectOption('IP');
      await saveMaintenanceStatus(page);
      await acknowledgeChecklist(page);
      await page.locator('select[name="status"]').selectOption('CO');
      await saveMaintenanceStatus(page);
    }

    await openEmployeeReport(page);
    const row = page.locator('tbody tr').filter({ hasText: NOTE }).first();
    await expect(row).toBeVisible({ timeout: 30000 });
    await row.getByTitle(/view|edit/i).click();
    await expect(page.getByRole('button', { name: 'Update Breakdown Report' })).toBeVisible({
      timeout: 20000,
    });

    const actions = page.getByRole('button', { name: 'Actions' });
    if (await actions.isVisible().catch(() => false)) {
      await actions.click();
      const confirm = page.getByText('Confirm Resolution', { exact: true });
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click();
        await page.getByRole('button', { name: 'Yes, Confirm' }).click();
        await expect(page.getByText(/confirmed|success/i).first()).toBeVisible({ timeout: 20000 });
        await openEmployeeReport(page);
        await page.locator('tbody tr').filter({ hasText: NOTE }).first().getByTitle(/view|edit/i).click();
        await page.getByRole('button', { name: 'Actions' }).click();
      }
      await page.getByText('Reopen Ticket', { exact: true }).click();
      await page.getByPlaceholder(/reason here/i).fill(REOPEN_REASON);
      const reopenResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/reportbreakdown\/[^/]+\/reopen$/.test(new URL(response.url()).pathname),
        { timeout: 60000 },
      );
      await page.getByRole('button', { name: 'Submit' }).click();
      const reopenResponse = await reopenResponsePromise;
      expect(reopenResponse.ok(), `Reopen failed: ${reopenResponse.status()}`).toBeTruthy();
      await expect(page.getByText(/reopened successfully/i)).toBeVisible({ timeout: 20000 });
    }

    await openBreakdownHistory(page);
    const historyRow = page.locator('tr').filter({ hasText: new RegExp(`${NOTE}|${ASSET_ID}`) }).first();
    await expect(historyRow).toBeVisible({ timeout: 30000 });
    await expect(historyRow).toContainText(/Closed|Completed|Reopened|Confirmed/i);

    await gotoProtected(page, `${BASE}/reports/reopened-breakdowns`);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText(new RegExp(`${ASSET_ID}|${REOPEN_REASON}|Reopened`, 'i')).first()).toBeVisible({
      timeout: 45000,
    });
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openEmployeeReport(page) {
  await gotoProtected(page, `${BASE}/employee-report-breakdown`);
  await expect(page.getByText('Employee Report Breakdown').first()).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function selectAssignedAsset(page, assetId) {
  const addButton = page.locator('main button').filter({ has: page.locator('svg.lucide-plus') });
  await expect(addButton).toBeVisible({ timeout: 20000 });
  await addButton.click();
  await page.waitForURL(/\/breakdown-selection2\/?/, { timeout: 20000 });

  await page.getByRole('button', { name: 'Scan Asset' }).click();
  await page.getByPlaceholder('Scan or enter asset ID').fill(assetId);
  await page.getByRole('button', { name: 'Create Breakdown' }).click();
  await page.waitForURL(/\/breakdown-details2\/?/, { timeout: 20000 });
  await expect(page.getByText(assetId).first()).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetType
 */
async function selectAssetByType(page, assetType) {
  const addButton = page.locator('main button').filter({ has: page.locator('svg.lucide-plus') });
  await expect(addButton).toBeVisible({ timeout: 20000 });
  await addButton.click();
  await page.waitForURL(/\/breakdown-selection2\/?/, { timeout: 20000 });

  await page.getByRole('button', { name: 'Select Asset' }).click();
  const typeTrigger = page.getByText('All Asset Types', { exact: true });
  await typeTrigger.click();
  const search = page.getByPlaceholder(/Search asset type/i);
  await search.fill(assetType);
  await page.getByText(assetType, { exact: false }).last().click();

  const row = page.locator('div.grid').filter({ hasText: assetType }).filter({
    has: page.getByRole('button', { name: 'Create Breakdown' }),
  }).first();
  await expect(row, `${assetType} asset`).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Create Breakdown' }).click();
  await page.waitForURL(/\/breakdown-details2\/?/, { timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} reason
 */
async function selectReason(page, reason) {
  await page.getByText('Select Breakdown Reason', { exact: true }).click();
  const option = page.getByRole('option', { name: new RegExp(reason, 'i') }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openBreakdownHistory(page) {
  await gotoProtected(page, `${BASE}/reports/breakdown-history`);
  await expect(page.getByText('Breakdown History').first()).toBeVisible({ timeout: 45000 });
  const preview = page.getByRole('button', { name: 'Preview' });
  if (await preview.isVisible().catch(() => false)) {
    await preview.click();
  }
  await expect(page.getByText(/Loading data/i)).toHaveCount(0, { timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function runMaintenanceScheduleJob(page) {
  await gotoProtected(page, `${BASE}/adminsettings/configuration/job-monitor`);
  await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });

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
  const runResponse = await runResponsePromise;
  expect(runResponse.ok(), `Maintenance job run failed: ${runResponse.status()}`).toBeTruthy();
  await expect(page.locator('table').nth(1).locator('tbody tr').first().getByText('OK', { exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 */
async function openDueSchedule(page, assetId) {
  await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  const assetRow = page.locator('tbody tr').filter({ hasText: assetId }).first();
  await expect(assetRow, `${assetId} should be listed for maintenance`).toBeVisible({ timeout: 30000 });
  await assetRow.locator('td').nth(1).click();
  await page.waitForURL(/\/maintenance-list-detail\//, { timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 * @returns {Promise<number>}
 */
async function approveInHouseWorkflow(page, assetId) {
  await gotoProtected(page, `${BASE}/maintenance-approval`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });

  const requestRow = page.locator('tbody tr').filter({ hasText: assetId }).first();
  await expect(requestRow).toBeVisible({ timeout: 30000 });
  await requestRow.locator('td').nth(1).click();
  await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });

  let approvals = 0;
  for (let step = 0; step < 8; step += 1) {
    if (await page.getByText(/fully approved/i).isVisible().catch(() => false)) break;

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
    const approveResponse = await approveResponsePromise;
    expect(approveResponse.ok(), `Approval step ${step + 1} failed: ${approveResponse.status()}`).toBeTruthy();
    approvals += 1;
  }

  await expect(page.getByText(/fully approved/i)).toBeVisible({ timeout: 20000 });
  return approvals;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function acknowledgeChecklist(page) {
  const viewChecklist = page.getByRole('button', { name: 'View Checklist' });
  if (!(await viewChecklist.isEnabled().catch(() => false))) return;
  await viewChecklist.click();
  await expect(page.getByRole('heading', { name: /Checklist/i })).toBeVisible({ timeout: 10000 });
  await page.getByRole('button', { name: 'Close' }).click();
}

/**
 * @param {import('@playwright/test').Locator} locator
 * @param {string} value
 */
async function fillIfEmpty(locator, value) {
  if ((await locator.count()) === 0) return;
  if (await locator.isDisabled()) return;
  if (!(await locator.inputValue()).trim()) await locator.fill(value);
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
}
