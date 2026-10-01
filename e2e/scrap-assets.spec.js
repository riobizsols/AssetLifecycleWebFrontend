// @ts-check
/**
 * 21. Scrap assets and scrap approval
 * TC_SCRAP_001 expiry cards match asset dates
 * TC_SCRAP_002 approve scrap until the asset is disposed
 * TC_SCRAP_003 reject a scrap request
 * TC_SCRAP_004 scrap every member of a group
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const EXPIRED_ASSET = 'AST-301';
const GROUP_NAME = 'ICU Oxygen Bank';
const GROUP_MEMBERS = ['AST-101', 'AST-102'];
const SCRAP_REASON = 'End of useful life';
const SCRAP_NOTES = 'Removed from ward';
const REJECT_REASON = 'Asset still in clinical use';
const APPROVAL_NOTE = 'Approved for disposal';

test.describe('RIO EAM scrap assets and scrap approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_SCRAP_001 expiry cards match asset dates', async ({ page }) => {
    test.setTimeout(180000);
    await loginToRioEam(page);

    const nearingResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/assets/expiry/expiring_soon'),
      { timeout: 60000 },
    );
    const expiredResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/assets/expiry/expired') &&
        !response.url().includes('expiring'),
      { timeout: 60000 },
    );
    await gotoProtected(page, `${BASE}/scrap-assets`);
    await expect(page.getByText('Total Assets', { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Nearing Expiry', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Expired', { exact: true }).first()).toBeVisible();

    const nearingAssets = (await (await nearingResponsePromise).json())?.assets || [];
    const expiredAssets = (await (await expiredResponsePromise).json())?.assets || [];
    const nearingIds = new Set(nearingAssets.map((asset) => asset.asset_id));
    const expiredIds = new Set(expiredAssets.map((asset) => asset.asset_id));

    expect(nearingAssets.some((asset) => daysUntil(asset) === 10)).toBeTruthy();
    expect(expiredAssets.some((asset) => daysSince(asset) === 1)).toBeTruthy();
    for (const asset of nearingAssets) {
      const days = daysUntil(asset);
      expect(days).toBeGreaterThan(0);
      expect(days).toBeLessThanOrEqual(30);
      expect(expiredIds.has(asset.asset_id)).toBeFalsy();
    }
    for (const asset of expiredAssets) {
      expect(daysSince(asset)).toBeGreaterThan(0);
      expect(nearingIds.has(asset.asset_id)).toBeFalsy();
    }

    await page.locator('div.cursor-pointer').filter({ hasText: 'Nearing Expiry' }).first().click();
    await page.waitForURL(/\/scrap-assets\/nearing-expiry/, { timeout: 20000 });
    await expect(page.getByText('10 days', { exact: true }).first()).toBeVisible({ timeout: 20000 });
    const tenDayRow = page.locator('tbody tr').filter({ hasText: '10 days' }).first();
    const tenDayName = ((await tenDayRow.locator('td').first().innerText()) || '').trim();

    await gotoProtected(page, `${BASE}/scrap-assets`);
    await page.locator('div.cursor-pointer').filter({ hasText: 'Expired' }).first().click();
    await page.waitForURL(/\/scrap-assets\/expired/, { timeout: 20000 });
    await expect(page.getByText('1 day ago', { exact: true }).first()).toBeVisible({ timeout: 20000 });
    await expect(page.locator('tbody tr').filter({ hasText: tenDayName })).toHaveCount(0);
    await expect(page.getByText(/\d+ year/i)).toHaveCount(0);
  });

  test('TC_SCRAP_002 approves scrap until the asset is disposed', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    const before = await decommissionedCount(page);
    const scrap = await createExpiredScrap(page, EXPIRED_ASSET, `${SCRAP_REASON}\n${SCRAP_NOTES}`);
    await approveScrapWorkflow(page, scrap.label);

    await gotoProtected(page, `${BASE}/asset-detail/${scrap.id}`);
    await expect(page.getByText(/Disposed|Scrapped/i).first()).toBeVisible({ timeout: 20000 });
    await gotoProtected(page, `${BASE}/assets`);
    const assetRow = page.locator('tbody tr').filter({ hasText: EXPIRED_ASSET }).first();
    await expect(assetRow).toContainText(/Disposed|Scrapped/i);
    await gotoProtected(page, `${BASE}/maintenance-schedule-view`);
    await expect(page.locator('tbody tr').filter({ hasText: EXPIRED_ASSET })).toHaveCount(0);
    expect(await decommissionedCount(page)).toBeGreaterThan(before);
  });

  test('TC_SCRAP_003 rejects a scrap request', async ({ page }) => {
    test.setTimeout(300000);
    await loginToRioEam(page);
    const scrap = await createExpiredScrap(page, '', REJECT_REASON);
    await gotoProtected(page, `${BASE}/scrap-approval`);
    const row = page.locator('tbody tr').filter({ hasText: scrap.label }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.locator('td').nth(1).click();
    await page.waitForURL(/\/scrap-approval-detail\//, { timeout: 20000 });
    await page.getByRole('button', { name: 'Reject', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Reject Scrap Request' })).toBeVisible();
    await page.getByPlaceholder('Please provide reason for rejection').fill(REJECT_REASON);
    const rejectResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/scrap-maintenance\/[^/]+\/reject$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Reject', exact: true }).last().click();
    expect((await rejectResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText(REJECT_REASON).first()).toBeVisible({ timeout: 15000 });

    await gotoProtected(page, `${BASE}/asset-detail/${scrap.id}`);
    await expect(page.getByText(/Active|In-Use|In Use/i).first()).toBeVisible({ timeout: 20000 });
    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.locator('tbody tr').filter({ hasText: scrap.label }).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('tbody tr').filter({ hasText: scrap.label }).first()).not.toContainText(
      /Disposed|Scrapped/i,
    );
  });

  test('TC_SCRAP_004 scraps every member of a group', async ({ page }) => {
    test.setTimeout(600000);
    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-assets/create`);
    await expect(page.getByRole('heading', { name: 'Create Scrap Asset' })).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole('button', { name: 'Select an asset type...' }).click();
    await page.getByPlaceholder('Search asset types...').fill('Oxygen Concentrator');
    await page.locator('div.fixed div.cursor-pointer').filter({ hasText: 'Oxygen Concentrator' }).first().click();
    await page.locator('select').filter({ has: page.locator('option', { hasText: 'Grouped assets' }) }).selectOption('GROUPED');

    const groupRow = page.locator('tbody tr').filter({ hasText: GROUP_NAME }).first();
    await expect(groupRow).toBeVisible({ timeout: 20000 });
    await groupRow.getByRole('button', { name: 'Scrap Grouped Asset' }).click();
    await page.waitForURL(/\/scrap-assets\/group-scrap\//, { timeout: 20000 });
    const groupUrl = page.url();
    for (const member of GROUP_MEMBERS) {
      await expect(page.getByText(member).first()).toBeVisible({ timeout: 20000 });
    }
    await page.getByRole('button', { name: 'Scrap Entire Group' }).click();
    await page.getByPlaceholder('Enter notes (optional)...').fill(`${SCRAP_REASON}\n${SCRAP_NOTES}`);
    const submitResponsePromise = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /scrap/i.test(response.url()),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    expect((await submitResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText(/Sent for approval|Scrap created/i)).toBeVisible({ timeout: 15000 });

    await approveScrapWorkflow(page, GROUP_NAME);
    await gotoProtected(page, groupUrl);
    for (const member of GROUP_MEMBERS) {
      await gotoProtected(page, `${BASE}/asset-detail/${member}`);
      await expect(page.getByText(/Disposed|Scrapped/i).first()).toBeVisible({ timeout: 20000 });
    }
    await gotoProtected(page, groupUrl);
    await expect(page.getByText(/Active/i).filter({ hasText: /AST-10/ })).toHaveCount(0);
  });
});

/**
 * @param {Record<string, unknown>} asset
 */
function daysUntil(asset) {
  const value = asset.days_until_expiry;
  if (value && typeof value === 'object' && 'days' in value) return Number(value.days);
  if (value != null && value !== '') return Number(value);
  const expiry = new Date(String(asset.expiry_date || ''));
  return Math.ceil((expiry.getTime() - Date.now()) / 86400000);
}

/**
 * @param {Record<string, unknown>} asset
 */
function daysSince(asset) {
  const value = asset.days_expired;
  if (value && typeof value === 'object' && 'days' in value) return Number(value.days);
  if (value != null && value !== '') return Number(value);
  const expiry = new Date(String(asset.expiry_date || ''));
  return Math.floor((Date.now() - expiry.getTime()) / 86400000);
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<number>}
 */
async function decommissionedCount(page) {
  await gotoProtected(page, `${BASE}/dashboard`);
  const card = page.locator('div').filter({ has: page.getByText('Decommissioned', { exact: true }) }).first();
  await expect(card).toBeVisible({ timeout: 30000 });
  const match = ((await card.innerText()) || '').match(/\d+/);
  return Number(match?.[0] || 0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetId
 * @param {string} notes
 * @returns {Promise<{ id: string, label: string }>}
 */
async function createExpiredScrap(page, assetId, notes) {
  const expiredResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/assets/expiry/expired') && !response.url().includes('expiring'),
    { timeout: 60000 },
  );
  await gotoProtected(page, `${BASE}/scrap-assets/expired`);
  const assets = (await (await expiredResponsePromise).json())?.assets || [];
  const asset = assetId
    ? assets.find((item) => [item.asset_id, item.serial_number, item.text].includes(assetId))
    : assets.find((item) => item.asset_id !== EXPIRED_ASSET);
  expect(asset, assetId ? `${assetId} should be expired` : 'Another expired asset').toBeTruthy();
  const visible = String(asset.text || asset.serial_number || asset.asset_id || '');
  const assetKey = String(asset.asset_id || visible);
  const row = page.locator('tbody tr').filter({ hasText: visible }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Scrap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create Scrap' })).toBeVisible();
  await page.getByPlaceholder('Enter any additional notes about this scrap asset...').fill(notes);
  const saveResponsePromise = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url().includes('/scrap-assets'),
    { timeout: 60000 },
  );
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  expect((await saveResponsePromise).ok()).toBeTruthy();
  await expect(page.getByText(/sent for approval|marked for scrapping|scrap request created/i)).toBeVisible({
    timeout: 15000,
  });
  return { id: assetKey, label: visible };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
async function approveScrapWorkflow(page, label) {
  await gotoProtected(page, `${BASE}/scrap-approval`);
  const row = page.locator('tbody tr').filter({ hasText: label }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('td').nth(1).click();
  await page.waitForURL(/\/scrap-approval-detail\//, { timeout: 20000 });

  for (let step = 0; step < 8; step += 1) {
    const approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    if (!(await approveButton.isVisible().catch(() => false))) break;
    await approveButton.click();
    await page.getByPlaceholder('Please provide approval note').fill(APPROVAL_NOTE);
    const approveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/scrap-maintenance\/[^/]+\/approve$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Approve', exact: true }).last().click();
    expect((await approveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText(/Approved/i).first()).toBeVisible({ timeout: 15000 });
  }
}
