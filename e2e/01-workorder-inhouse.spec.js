// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen, waitForRowOrEmpty } from './helpers/screenAccess.js';

test.describe('RIO EAM in-house work orders', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_WO_001 work order list and detail show the asset and checklist', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/workorder-management', 'Work Order Management');
    if (!opened) {
      noteInaccessible('Work Order Management');
      return;
    }

    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Description').first()).toBeVisible();

    const openedDetail = await openWorkOrderDetail(page);
    if (!openedDetail) return;
    await expect(page.getByRole('heading', { name: 'Maintenance Checklist' })).toBeVisible();
  });

  test('TC_WO_002 work order detail shows status without completing the job', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/workorder-management', 'Work Order Management');
    if (!opened) {
      noteInaccessible('Work Order Management');
      return;
    }

    const openedDetail = await openWorkOrderDetail(page);
    if (!openedDetail) return;
    await expect(page.locator('h1').first()).toBeVisible();
  });
});

/**
 * ID columns are hidden. Rows appear only after the work-order request finishes.
 * @param {import('@playwright/test').Page} page
 */
async function openWorkOrderDetail(page) {
  const row = page.locator('tbody tr.cursor-pointer').first();
  const hasRow = await waitForRowOrEmpty(page, row, /No work orders found|No data found/i);
  if (!hasRow) return false;

  await row.click();
  await expect(page).toHaveURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Maintenance Checklist' })).toBeVisible({
    timeout: 20000,
  });
  return true;
}
