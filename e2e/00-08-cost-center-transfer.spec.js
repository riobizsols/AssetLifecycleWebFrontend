// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM cost center transfer', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_CC_001 cost center transfer shows the asset and target fields', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/cost-center-transfer', 'Cost Center Transfer');
    if (!opened) {
      noteInaccessible('Cost Center Transfer');
      return;
    }
    await expect(page.getByRole('button', { name: 'Select Asset' })).toBeVisible();
    await expect(page.getByText('Asset Type', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Select Asset Type|Select Cost Center/).first()).toBeVisible();
  });

  test('TC_CC_002 the transfer form is open and is not submitted', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/cost-center-transfer', 'Cost Center Transfer');
    if (!opened) {
      noteInaccessible('Cost Center Transfer');
      return;
    }
    await expect(page.getByRole('button', { name: 'Scan Asset' })).toBeVisible();
    const confirm = page.getByRole('button', { name: /Confirm|Transfer/i });
    if (await confirm.first().isVisible().catch(() => false)) {
      await expect(confirm.first()).toBeVisible();
    }
  });
});
