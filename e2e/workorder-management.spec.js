// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';

import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM workorder management', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads work orders, opens a detail, and exports a PDF', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/workorder-management`);

    await expect(page.getByText('Work Order Management').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading work orders...')).toHaveCount(0, { timeout: 30000 });

    await expect(page.getByText('Description').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByText('Start Date').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();

    const empty = page.getByText('No work orders found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      test.skip(true, 'No work orders in this tenant/branch');
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return /\/work-orders\/[^/?]+$/.test(new URL(response.url()).pathname);
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok(), `Work order detail failed: ${detailResponse.status()}`).toBeTruthy();

    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Asset Information' }).locator('xpath=..').getByText('Serial Number')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Additional Issues' })).toBeVisible();

    await page.getByRole('button', { name: 'Vendor' }).click();
    await expect(page.getByRole('heading', { name: 'Vendor Information' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Vendor Information' }).locator('xpath=..').getByText('Vendor Name')).toBeVisible();

    await page.getByRole('button', { name: 'Checklist' }).click();
    await expect(page.getByRole('heading', { name: 'Maintenance Checklist' })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'History' }).click();
    await expect(page.getByRole('heading', { name: 'Previous 5 Maintenance Records' })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: 'Overview' }).click();
    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible();

    await page.evaluate(() => {
      window.__printCalled = false;
      window.print = () => {
        window.__printCalled = true;
      };
    });
    await page.getByRole('button', { name: 'Print' }).click();
    expect(await page.evaluate(() => window.__printCalled)).toBeTruthy();

    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('button', { name: 'Export PDF' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename(), 'Expected a work order PDF').toMatch(/WorkOrder_.*\.pdf/i);
    await expect(page.getByText('PDF exported successfully')).toBeVisible({ timeout: 15000 });

    await page.locator('nav').getByText('Work Orders', { exact: true }).click();
    await page.waitForURL(/\/workorder-management\/?$/, { timeout: 20000 });
    await expect(page.getByText('Work Order Management').first()).toBeVisible({ timeout: 20000 });
  });
});
