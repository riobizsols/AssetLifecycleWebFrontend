// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, toastMessage } from './helpers/screenAccess.js';
import {
  openAdminScreen,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/bulk-serial-number-print';

/**
 * Bulk Serial Number Print. Proceed to Print posts to the print queue —
 * only clicked when nothing is selected (validation toast).
 */

async function openBulkPrint(page) {
  const status = await openAdminScreen(page, PATH, 'Step 1: Select Asset Type');
  if (skipIfInaccessible(page, 'Bulk Serial Number Print', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Bulk Serial Number Print', () => {
  test('step 1 chrome and asset types', async ({ page }) => {
    if (!(await openBulkPrint(page))) return;

    await expect(page.getByRole('heading', { name: 'Bulk Serial Number Print' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Step 1: Select Asset Type' })).toBeVisible();
    await expect(page.getByText('Select an asset type to begin bulk printing')).toBeVisible();
    await expect(page.getByText('Select asset type...')).toBeVisible();
  });

  test('select type, list or empty, proceed with none selected, no print', async ({ page }) => {
    if (!(await openBulkPrint(page))) return;

    await page.getByRole('button', { name: 'Select asset type...' }).click();
    await expect(page.getByPlaceholder('Search...')).toBeVisible();
    const first = page.locator('div.fixed.z-\\[10050\\] div.cursor-pointer').first();
    if (!(await first.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'STEP1 — no asset types in dropdown.',
      });
      return;
    }
    const label = ((await first.innerText()) || '').trim();
    await first.click();
    await waitForAdminReady(page);

    await expect(page.getByText(new RegExp(`Select assets from ${label}`))).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Asset Type:')).toBeVisible();
    await expect(page.getByRole('button', { name: /Proceed to Print/ })).toBeVisible();

    const empty = page.getByText('No assets found for the selected asset type.');
    const loading = page.getByText('Loading assets...');
    await expect
      .poll(async () => !(await loading.isVisible().catch(() => false)), { timeout: 20000 })
      .toBeTruthy();

    if (await empty.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'condition',
        description: `STEP2 ${label} — no assets; print not started.`,
      });
    } else {
      await expect(page.getByRole('columnheader', { name: 'Asset Name' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Serial Number' })).toBeVisible();
      test.info().annotations.push({
        type: 'condition',
        description: `STEP2 ${label} — assets listed; none selected.`,
      });
    }

    await clickUnblocked(page, 'Proceed to Print (0)');
    await expect(toastMessage(page, 'Please select at least one asset')).toBeVisible({ timeout: 10000 });

    await page.getByTitle('Go Back').click();
    await expect(page.getByRole('heading', { name: 'Step 1: Select Asset Type' })).toBeVisible();
    test.info().annotations.push({
      type: 'condition',
      description: 'PRINT — empty selection toast; queue not written.',
    });
  });
});
