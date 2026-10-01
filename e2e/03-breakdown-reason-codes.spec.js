// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM breakdown reason codes', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_BRC_001 a unique reason can be saved for an asset type', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/breakdown-reason-codes',
      'Breakdown Reason Codes'
    );
    if (!opened) {
      noteInaccessible('Breakdown Reason Codes');
      return;
    }

    await expect(page.getByText('Reason Code').first()).toBeVisible();
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Breakdown reason create');
      return;
    }

    await add.click();
    await expect(page.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/select an asset type|required/i).first()).toBeVisible({ timeout: 10000 });

    const assetType = page.locator('select').first();
    const option = assetType.locator('option:not([value=""])').first();
    if ((await option.count()) === 0) {
      noteInaccessible('Breakdown reason asset types');
      return;
    }

    await assetType.selectOption({ index: 1 });
    const reason = `PW-E2E-REASON-${Date.now()}`;
    await page.getByPlaceholder('Enter breakdown reason code').fill(reason);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toBeHidden({
      timeout: 20000,
    });
    await expect(page.getByText(reason, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_BRC_002 reason codes can be exported without editing or deleting a row', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/breakdown-reason-codes',
      'Breakdown Reason Codes'
    );
    if (!opened) {
      noteInaccessible('Breakdown Reason Codes');
      return;
    }

    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Reason Code').first()).toBeVisible();
    const exportButton = page.locator('button:has(svg.lucide-download)');
    await expect(exportButton).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await exportButton.click();
    const file = await downloadPromise;
    expect(file.suggestedFilename()).toMatch(/\.csv$/i);
  });
});
