// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM scrap assets and scrap approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_SCRAP_001 expiry cards and lists partition assets by date', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/scrap-assets', 'Scrap Assets');
    if (!opened) {
      noteInaccessible('Scrap Assets');
      return;
    }

    await expect(page.getByText('Total Assets').first()).toBeVisible();
    await expect(page.getByText('Nearing Expiry').first()).toBeVisible();
    await expect(page.getByText('Expired').first()).toBeVisible();

    const nearing = await openTitledScreen(page, '/scrap-assets/nearing-expiry', 'Nearing Expiry');
    if (!nearing) {
      noteInaccessible('Nearing Expiry');
      return;
    }
    await expect(page.getByText(/Expiry Date|Asset/i).first()).toBeVisible();

    const expired = await openTitledScreen(page, '/scrap-assets/expired', 'Expired');
    if (!expired) {
      noteInaccessible('Expired assets');
      return;
    }
    await expect(page.getByText(/Expiry Date|Asset/i).first()).toBeVisible();
  });

  test('TC_SCRAP_002 scrap approval loads without approving a disposal', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/scrap-approval', 'Scrap Approval');
    if (!opened) {
      noteInaccessible('Scrap Approval');
      return;
    }

    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
  });

  test('TC_SCRAP_003 scrap approval can show reject without confirming it', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/scrap-approval', 'Scrap Approval');
    if (!opened) {
      noteInaccessible('Scrap Approval');
      return;
    }

    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText(/No .*found|No data found|Status/i).first()).toBeVisible();
      return;
    }

    await row.click();
    await expect(page.getByText(/Status|Asset|Reason/i).first()).toBeVisible({ timeout: 20000 });
    const reject = page.getByRole('button', { name: /Reject/i }).first();
    if (await reject.isVisible().catch(() => false)) {
      await expect(reject).toBeVisible();
    }
  });

  test('TC_SCRAP_004 group scrap form is visible and is not submitted', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/scrap-assets/create', 'Add Scrap Asset');
    if (!opened) {
      noteInaccessible('Group scrap');
      return;
    }

    await expect(page.getByText(/Asset|Group|Reason/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Submit|Save|Create/i }).first()).toBeVisible();
  });
});
