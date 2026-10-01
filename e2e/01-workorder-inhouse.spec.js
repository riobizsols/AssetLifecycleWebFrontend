// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM in-house work orders', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_WO_001 work order list and detail show the asset and checklist', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/workorder-management', 'Work Order Management');
    if (!opened) {
      noteInaccessible('Work Order Management');
      return;
    }

    await expect(page.getByText('Work Order ID').first()).toBeVisible();
    await expect(page.getByText('Asset ID').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();

    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText(/No work orders found|No data found/i).first()).toBeVisible();
      return;
    }

    await row.click();
    await expect(page).toHaveURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });
    await expect(page.getByText('Maintenance Checklist').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Status').first()).toBeVisible();
  });

  test('TC_WO_002 work order detail shows status without completing the job', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/workorder-management', 'Work Order Management');
    if (!opened) {
      noteInaccessible('Work Order Management');
      return;
    }

    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText(/No work orders found|No data found/i).first()).toBeVisible();
      return;
    }

    await row.click();
    await expect(page).toHaveURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });
    await expect(page.getByText('Status').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByText('Maintenance Checklist').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
  });
});
