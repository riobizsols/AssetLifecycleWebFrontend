// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { selectPortalDropdown } from './helpers/searchableDropdown.js';

import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM serial number print', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads the print queue, opens a label, and generates a PDF', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/serial-number-print`);

    await expect(page.getByRole('heading', { name: 'Serial Number Print' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Manage and print serial number labels for assets')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    await expect(page.getByText('Total Items')).toBeVisible();
    await expect(page.getByText('Filtered')).toBeVisible();
    await expect(page.getByText('Selected')).toBeVisible();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    await expect(page.getByText('Serial Number').first()).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Asset Name').first()).toBeVisible();
    await expect(page.getByText('Reason').first()).toBeVisible();
    await expect(page.getByText('Created Date').first()).toBeVisible();

    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: 'All Asset Types' })).toBeVisible();

    const refreshResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return /\/asset-serial-print\/status\//.test(new URL(response.url()).pathname);
    });
    await page.getByRole('button', { name: 'Refresh' }).click();
    const refreshResponse = await refreshResponsePromise;
    expect(refreshResponse.ok(), `Print queue refresh failed: ${refreshResponse.status()}`).toBeTruthy();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const rows = await queueRowsWithFallback(page);
    if ((await rows.count()) === 0) {
      await expect(page.getByText('No print queue items found')).toBeVisible();
    } else {
      await rows.first().locator('td').nth(1).click();
      await expect(page.getByRole('heading', { name: 'Print Serial Number Label' })).toBeVisible({
        timeout: 20000,
      });
      await expect(page.getByRole('heading', { name: 'Asset Details' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Printer Selection' })).toBeVisible();
      await expect(page.getByText('Serial Number:')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Generate PDF' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Print Label' })).toBeVisible();

      await page.getByRole('button', { name: 'Preview' }).click();
      await expect(page.getByRole('heading', { name: 'Print Preview' })).toBeVisible({ timeout: 15000 });
      await page.getByRole('button', { name: 'Close' }).click();
      await expect(page.getByRole('heading', { name: 'Print Preview' })).toHaveCount(0);

      const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
      await page.getByRole('button', { name: 'Generate PDF' }).click();
      const download = await downloadPromise;
      expect(download.suggestedFilename(), 'Expected a serial number label PDF').toMatch(/label_.*\.pdf/i);
      await expect(page.getByText('PDF generated successfully!')).toBeVisible({ timeout: 15000 });

      await page.getByTitle('Back to List').click();
      await expect(page.getByRole('heading', { name: 'Serial Number Print' })).toBeVisible({
        timeout: 20000,
      });
    }

    await page.goto(`${BASE}/bulk-serial-number-print`);
    const bulkHeading = page.getByRole('heading', { name: 'Bulk Serial Number Print' });
    if (!(await bulkHeading.isVisible().catch(() => false))) {
      await page.goto(`${BASE}/adminsettings/configuration/bulk-serial-number-print`);
    }
    await expect(page.getByRole('heading', { name: 'Bulk Serial Number Print' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('heading', { name: 'Step 1: Select Asset Type' })).toBeVisible();
    await expect(page.getByText('Select asset type...').first()).toBeVisible();
  });
});

/**
 * Default queue is New. If that is empty, try the other status filters.
 *
 * @param {import('@playwright/test').Page} page
 */
async function queueRowsWithFallback(page) {
  const rows = page.locator('tbody tr.cursor-pointer');
  if ((await rows.count()) > 0) return rows;

  for (const status of ['In Progress', 'Completed', 'Cancelled']) {
    await selectPortalDropdown(page, 'Status', { optionText: status });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    if ((await rows.count()) > 0) return rows;
  }

  return rows;
}
