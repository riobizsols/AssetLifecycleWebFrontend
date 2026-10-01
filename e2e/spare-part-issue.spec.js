// @ts-check
/**
 * 20. Spare part request, approval, and issue
 * TC_SPI_001 request a spare after in-house approval
 * TC_SPI_002 approve and issue the spare
 * TC_SPI_003 block an issue above available stock
 * TC_SPI_004 reject a spare request
 * TC_SPI_005 issue a spare for vendor-maintained maintenance
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const ASSET_NAME = 'Oxygen Concentrator';
const PART_NUMBER = 'FLT-IN-01';
const CATEGORY = 'Filters';
const LOT = 'LOT-2401';
const VENDOR = 'CareMaint Pvt Ltd';
const APPROVAL_COMMENT = 'Schedule for this week';
const REJECT_REASON = 'Wrong part for this asset type';

test.describe('RIO EAM spare part request, approval, and issue', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_SPI_001 requests a spare after in-house maintenance is approved', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const job = await approveInHouseMaintenance(page);

    await gotoProtected(page, `${BASE}/workorder-management/workorder-detail/${job.amsId}`);
    await expect(page.getByText(ASSET_NAME).first()).toBeVisible({ timeout: 20000 });

    await requestSpare(page, job.amsId, '1');
    await expect(page.getByText(/Available:\s*20/)).toBeVisible({ timeout: 20000 });
    await submitSpareRequest(page);

    await gotoProtected(page, `${BASE}/spare-part-approval`);
    const pending = page.locator('tbody tr').filter({ hasText: ASSET_NAME }).first();
    await expect(pending).toBeVisible({ timeout: 20000 });
    await expect(pending).toContainText(/Pending Approval/i);
    await pending.locator('td').nth(1).click();
    await page.waitForURL(/\/spare-part-approval-detail\//, { timeout: 20000 });
    await expect(page.getByPlaceholder('Enter required quantity')).toHaveValue('1');
    await expect(
      page.locator('div').filter({ has: page.getByText('Category', { exact: true }) }).locator('input').first(),
    ).toHaveValue(CATEGORY);
    await expectLotQuantity(page, '20');
  });

  test('TC_SPI_002 approves and issues a spare for an in-house job', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const job = await approveInHouseMaintenance(page);
    await requestSpare(page, job.amsId, '1');
    await submitSpareRequest(page);
    await reserveSpare(page, '1');

    await gotoProtected(page, `${BASE}/spare-part-issue`);
    const issueRow = page.locator('tbody tr').filter({ hasText: ASSET_NAME }).first();
    await expect(issueRow).toBeVisible({ timeout: 20000 });
    const issueButton = issueRow.getByRole('button', { name: 'Issue', exact: true });
    if (await issueButton.isVisible().catch(() => false)) {
      const issueResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /\/spare-parts\/maintenance-list\/[^/]+\/issue$/.test(new URL(response.url()).pathname),
        { timeout: 60000 },
      );
      await issueButton.click();
      expect((await issueResponsePromise).ok()).toBeTruthy();
      await expect(page.getByText('Spare part issued successfully')).toBeVisible({ timeout: 15000 });
    }

    await issueRow.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await expect(dialog).toContainText(ASSET_NAME);
    await expect(dialog).toContainText(/1/);
    await expect(dialog.getByText(/Pending Approval/i)).toHaveCount(0);

    await expectLotQuantity(page, '19');
    await gotoProtected(page, `${BASE}/spare-part-approval`);
    await expect(page.locator('tbody tr').filter({ hasText: job.amsId })).toHaveCount(0);
  });

  test('TC_SPI_003 blocks an issue above available stock', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const job = await approveInHouseMaintenance(page);
    await requestSpare(page, job.amsId, '25');
    await page.getByRole('button', { name: 'Request', exact: true }).click();
    await expect(page.getByText(/Insufficient stock/i)).toBeVisible({ timeout: 15000 });
    await expect(page).toHaveURL(new RegExp(`/spare-part-list-detail/${job.amsId}`));
    await expectLotQuantity(page, '19');
    await gotoProtected(page, `${BASE}/spare-part-issue`);
    await expect(page.locator('tbody tr').filter({ hasText: '25' })).toHaveCount(0);
  });

  test('TC_SPI_004 rejects a spare request on an in-house job', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const before = await readLotQuantity(page);
    const job = await approveInHouseMaintenance(page);
    await requestSpare(page, job.amsId, '1');
    await submitSpareRequest(page);

    await gotoProtected(page, `${BASE}/spare-part-approval`);
    const pending = page.locator('tbody tr').filter({ hasText: ASSET_NAME }).first();
    await expect(pending).toBeVisible({ timeout: 20000 });
    await pending.click();
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await page.getByPlaceholder(/reason|comment|note/i).fill(REJECT_REASON);
    await page.getByRole('button', { name: /Confirm|Reject/i }).last().click();
    await expect(page.getByText(/Rejected/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(REJECT_REASON)).toBeVisible();

    await gotoProtected(page, `${BASE}/spare-part-issue`);
    await expect(page.locator('tbody tr').filter({ hasText: job.amsId })).toHaveCount(0);
    expect(await readLotQuantity(page)).toBe(before);
  });

  test('TC_SPI_005 issues a spare for vendor-maintained maintenance', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    await runMaintenanceScheduleJob(page);
    const job = await openDueAssetSchedule(page, { vendor: VENDOR });

    await gotoProtected(page, `${BASE}/maintenance-approval`);
    await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
    await expect(page.locator('tbody tr').filter({ hasText: VENDOR })).toHaveCount(0);

    await gotoProtected(page, `${BASE}/workorder-management/workorder-detail/${job.amsId}`);
    await expect(page.getByText(VENDOR).first()).toBeVisible({ timeout: 20000 });

    await requestSpare(page, job.amsId, '1');
    await submitSpareRequest(page);
    await reserveSpare(page, '1');

    await gotoProtected(page, `${BASE}/spare-part-issue`);
    const issueRow = page.locator('tbody tr').filter({ hasText: VENDOR }).first();
    await expect(issueRow).toBeVisible({ timeout: 20000 });
    const issueButton = issueRow.getByRole('button', { name: 'Issue', exact: true });
    if (await issueButton.isVisible().catch(() => false)) {
      await issueButton.click();
      await expect(page.getByText('Spare part issued successfully')).toBeVisible({ timeout: 15000 });
    }
    await issueRow.click();
    await expect(page.getByRole('dialog')).toContainText(VENDOR);
  });
});

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ amsId: string, assetId: string }>}
 */
async function approveInHouseMaintenance(page) {
  await runMaintenanceScheduleJob(page);
  const job = await openDueAssetSchedule(page, { vendor: '' });
  await approveInHouseWorkflow(page, job.assetId);
  return job;
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
  await expect(page.getByText(/Job triggered successfully/i)).toBeVisible({ timeout: 20000 });
  await expect(page.locator('table').nth(1).locator('tbody tr').first().getByText('OK', { exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ vendor: string }} options
 * @returns {Promise<{ amsId: string, assetId: string }>}
 */
async function openDueAssetSchedule(page, options) {
  await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
  await expect(page.getByText(/Loading/i)).toHaveCount(0, { timeout: 30000 });
  let rows = page.locator('tbody tr').filter({ hasText: ASSET_NAME });
  rows = options.vendor
    ? rows.filter({ hasText: options.vendor })
    : rows.filter({ hasNotText: /vendor|CareMaint/i });
  const assetRow = rows.first();
  await expect(assetRow).toBeVisible({ timeout: 30000 });
  await expect(assetRow.getByText(/due|days|overdue/i).first()).toBeVisible();
  const assetId = (await assetRow.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();
  await assetRow.locator('td').nth(1).click();
  await page.waitForURL(/\/maintenance-list-detail\/([^/?]+)/, { timeout: 20000 });
  const amsId = page.url().match(/\/maintenance-list-detail\/([^/?]+)/)?.[1] || '';
  expect(amsId).toBeTruthy();
  return { amsId, assetId };
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
  await expect(requestRow).toBeVisible({ timeout: 30000 });
  await requestRow.locator('td').nth(1).click();
  await page.waitForURL(/\/approval-detail\//, { timeout: 20000 });

  for (let step = 0; step < 8; step += 1) {
    if (await page.getByText(/fully approved/i).isVisible().catch(() => false)) return;
    const technicianTab = page.getByRole('button', { name: /Technician/i });
    if (await technicianTab.isVisible().catch(() => false)) {
      await technicianTab.click();
      const technicianSelect = page.locator('select').filter({ hasText: 'Select Technician' });
      if (
        (await technicianSelect.isVisible().catch(() => false)) &&
        !(await technicianSelect.inputValue()) &&
        (await technicianSelect.locator('option').count()) > 1
      ) {
        await technicianSelect.selectOption({ index: 1 });
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
 * @param {import('@playwright/test').Page} page
 * @param {string} amsId
 * @param {string} quantity
 */
async function requestSpare(page, amsId, quantity) {
  await gotoProtected(page, `${BASE}/spare-part-list`);
  await expect(page.getByText('Spare Part List').first()).toBeVisible({ timeout: 30000 });
  await gotoProtected(page, `${BASE}/spare-part-list-detail/${amsId}`);
  await expect(page.getByRole('heading', { name: 'Spare Part Request' })).toBeVisible({ timeout: 30000 });
  const card = page.locator('div.border').filter({ hasText: CATEGORY }).first();
  await expect(card).toBeVisible({ timeout: 20000 });
  await expect(card).toContainText(new RegExp(`${CATEGORY}|${PART_NUMBER}`));
  const checkbox = card.locator('input[type="checkbox"]');
  if (!(await checkbox.isChecked())) await checkbox.check();
  await card.getByPlaceholder('Required Quantity').fill(quantity);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function submitSpareRequest(page) {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/spare-parts/issue-requests'),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Request', exact: true }).click();
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(page.getByText('Spare part request submitted for approval')).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} quantity
 */
async function reserveSpare(page, quantity) {
  await gotoProtected(page, `${BASE}/spare-part-approval`);
  const pending = page.locator('tbody tr').filter({ hasText: ASSET_NAME }).first();
  await expect(pending).toBeVisible({ timeout: 20000 });
  await pending.click();
  await page.waitForURL(/\/spare-part-approval-detail\//, { timeout: 20000 });
  const brand = page.locator('select').nth(0);
  await expect(brand.locator('option').nth(1)).toBeAttached({ timeout: 20000 });
  await brand.selectOption({ index: 1 });
  const model = page.locator('select').nth(1);
  await expect(model.locator('option').nth(1)).toBeAttached({ timeout: 20000 });
  await model.selectOption({ index: 1 });
  await page.getByPlaceholder('Enter required quantity').fill(quantity);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/spare-parts\/issue-approvals\/[^/]+\/approve$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Reserve', exact: true }).click();
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(page.getByText('Spare part approved and issued successfully')).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} quantity
 */
async function expectLotQuantity(page, quantity) {
  expect(await readLotQuantity(page)).toBe(quantity);
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string>}
 */
async function readLotQuantity(page) {
  await gotoProtected(page, `${BASE}/master-data/spare-parts`);
  const row = page.locator('tbody tr').filter({ hasText: LOT }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  const headers = page.locator('thead th');
  const headerCount = await headers.count();
  let quantityIndex = -1;
  for (let index = 0; index < headerCount; index += 1) {
    const label = ((await headers.nth(index).innerText()) || '').trim();
    if (/^quantity$/i.test(label)) quantityIndex = index;
  }
  if (quantityIndex >= 0) {
    return ((await row.locator('td').nth(quantityIndex).innerText()) || '').trim();
  }
  return ((await row.innerText()) || '').replace(/\s+/g, ' ').trim();
}

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
