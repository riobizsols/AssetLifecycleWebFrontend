// @ts-check
/**
 * 15. Breakdown reason codes
 * TC_BRC_001 — Create a reason for an asset type.
 * TC_BRC_002 — Edit, delete, and export reason codes.
 *
 * Test data: Oxygen Concentrator / Compressor failure, then Compressor overload.
 */
import fs from 'fs';
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const ASSET_TYPE = 'Oxygen Concentrator';
const REASON = 'Compressor failure';
const EDITED_REASON = 'Compressor overload';

/** @type {string} */
let deletedReason = '';

test.describe('RIO EAM breakdown reason codes', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_BRC_001 creates a reason for an asset type', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await openReasonCodes(page);

    await page.locator('button:has(svg.lucide-plus)').click();
    const dialogHeading = page.getByRole('heading', { name: 'Create New Breakdown Reason Code' });
    await expect(dialogHeading).toBeVisible();

    const typeSelect = page.locator('select').filter({ hasText: 'Select Asset Type' });
    await typeSelect.selectOption({ label: ASSET_TYPE });
    await page.getByPlaceholder('Enter breakdown reason code').fill(REASON);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/breakdown-reason-codes'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), `Create failed: ${createResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Breakdown reason code created successfully')).toBeVisible({
      timeout: 15000,
    });
    await expect(dialogHeading).toHaveCount(0);

    const createdRow = page.locator('tbody tr').filter({ hasText: REASON }).first();
    await expect(createdRow).toBeVisible({ timeout: 20000 });
    await expect(createdRow).toContainText(ASSET_TYPE);
    await expect(createdRow).toContainText(REASON);

    await openEmployeeReasonList(page, ASSET_TYPE);
    await expect(page.getByRole('option', { name: new RegExp(REASON, 'i') }).first()).toBeVisible();
  });

  test('TC_BRC_002 edits, deletes, and exports reason codes', async ({ page }) => {
    test.setTimeout(300000);
    await loginToRioEam(page);
    await openReasonCodes(page);

    const sourceRow = page.locator('tbody tr').filter({ hasText: REASON }).first();
    await expect(sourceRow).toBeVisible({ timeout: 20000 });
    await sourceRow.getByTitle('Edit').click();
    await sourceRow.locator('input[type="text"]').fill(EDITED_REASON);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'PUT' &&
        /\/breakdown-reason-codes\/[^/]+$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await sourceRow.getByTitle('Save').click();
    const updateResponse = await updateResponsePromise;
    expect(updateResponse.ok(), `Update failed: ${updateResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Breakdown reason code updated successfully')).toBeVisible({
      timeout: 15000,
    });
    await expect(page.locator('tbody tr').filter({ hasText: EDITED_REASON }).first()).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: REASON })).toHaveCount(0);

    const otherRow = page.locator('tbody tr').filter({ hasNotText: EDITED_REASON }).first();
    await expect(otherRow, 'A second reason code is required').toBeVisible();
    deletedReason = (await otherRow.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();
    expect(deletedReason).toBeTruthy();
    await otherRow.locator('input[type="checkbox"]').check();

    page.once('dialog', (dialog) => dialog.accept());
    await page.locator('button:has(svg.lucide-trash-2)').click();
    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().includes('/breakdown-reason-codes/'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    const deleteResponse = await deleteResponsePromise;
    expect(deleteResponse.ok(), `Delete failed: ${deleteResponse.status()}`).toBeTruthy();
    await expect(page.getByText(/deleted successfully/i)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('tbody tr').filter({ hasText: deletedReason })).toHaveCount(0);
    await expect(page.locator('tbody tr').filter({ hasText: EDITED_REASON }).first()).toBeVisible();

    const grid = await readGrid(page);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('button:has(svg.lucide-download)').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/breakdown_reason_codes_.*\.csv/i);
    const csvPath = await download.path();
    expect(csvPath).toBeTruthy();
    const csv = fs.readFileSync(csvPath, 'utf8').trim();
    const [header, ...lines] = csv.split(/\r?\n/);
    expect(header.replace(/"/g, '')).toBe('Asset Type,Reason Code');
    const csvRows = lines.filter(Boolean).map(parseCsvLine);
    expect(csvRows).toEqual(grid);
    expect(csv).toContain(EDITED_REASON);
    expect(csv).not.toContain(`"${deletedReason}"`);
    expect(csv).not.toContain(`"${REASON}"`);

    await openEmployeeReasonList(page, ASSET_TYPE);
    const labels = (await page.getByRole('option').allInnerTexts()).join('\n');
    expect(labels).toMatch(new RegExp(EDITED_REASON, 'i'));
    expect(labels).not.toMatch(new RegExp(`^${escapeRegExp(REASON)}$`, 'm'));
    expect(labels).not.toContain(deletedReason);
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openReasonCodes(page) {
  await gotoProtected(page, `${BASE}/adminsettings/configuration/breakdown-reason-codes`);
  await expect(page.getByText('Breakdown Reason Codes').first()).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
  await expect(page.getByText('Asset Type').first()).toBeVisible();
  await expect(page.getByText('Reason Code').first()).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetType
 */
async function openEmployeeReasonList(page, assetType) {
  await gotoProtected(page, `${BASE}/employee-report-breakdown`);
  await expect(page.getByText('Employee Report Breakdown').first()).toBeVisible({ timeout: 45000 });
  const addButton = page.locator('main button').filter({ has: page.locator('svg.lucide-plus') });
  await addButton.click();
  await page.waitForURL(/\/breakdown-selection2\/?/, { timeout: 20000 });
  await page.getByRole('button', { name: 'Select Asset' }).click();
  await page.getByText('All Asset Types', { exact: true }).click();
  await page.getByPlaceholder(/Search asset type/i).fill(assetType);
  await page.getByText(assetType, { exact: false }).last().click();

  const row = page
    .locator('div.grid')
    .filter({ hasText: assetType })
    .filter({ has: page.getByRole('button', { name: 'Create Breakdown' }) })
    .first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Create Breakdown' }).click();
  await page.waitForURL(/\/breakdown-details2\/?/, { timeout: 20000 });
  await page.getByText('Select Breakdown Reason', { exact: true }).click();
  await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<string[][]>}
 */
async function readGrid(page) {
  const rows = page.locator('tbody tr');
  const count = await rows.count();
  /** @type {string[][]} */
  const grid = [];
  for (let i = 0; i < count; i += 1) {
    const cells = rows.nth(i).locator('td');
    const assetType = (await cells.nth(0).innerText()).replace(/\s+/g, ' ').trim();
    const reason = (await cells.nth(1).innerText()).replace(/\s+/g, ' ').trim();
    if (assetType && reason && !/no breakdown reason codes/i.test(assetType)) {
      grid.push([assetType, reason]);
    }
  }
  return grid;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function parseCsvLine(line) {
  return line.split('","').map((part) => part.replace(/^"|"$/g, ''));
}

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
