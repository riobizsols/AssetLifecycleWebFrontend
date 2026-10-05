// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const CARDS = ['Total Assets', 'Assigned Assets', 'Under Maintenance', 'Decommissioned'];

test.describe('RIO EAM dashboard', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_DASH_001 dashboard cards show numeric asset counts', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/dashboard', 'Dashboard');
    if (!opened) {
      noteInaccessible('Dashboard');
      return;
    }

    for (const label of CARDS) {
      const value = page
        .getByText(label, { exact: true })
        .locator('xpath=following::p[contains(@class,"tabular-nums")][1]');
      await expect(value).toHaveText(/^[\d,]+$/, { timeout: 30000 });
    }
  });

  test('TC_DASH_002 dashboard cards render without an endless spinner', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/dashboard', 'Dashboard');
    if (!opened) {
      noteInaccessible('Dashboard');
      return;
    }

    await expect(page.locator('div.min-h-screen p.text-gray-600', { hasText: 'Loading...' })).toHaveCount(0);
    const values = page.locator('p.tabular-nums');
    await expect(values.first()).toHaveText(/^[\d,]+$/, { timeout: 30000 });
    await expect(values.first()).not.toHaveText('...');
    await expect(page.getByText(/blank error|Failed to load dashboard/i)).toHaveCount(0);
  });
});
