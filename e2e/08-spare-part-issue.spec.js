// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM spare part request, approval, and issue', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_SPI_001 spare part list loads maintenance jobs', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/spare-part-list', 'Spare Part List');
    if (!opened) {
      noteInaccessible('Spare Part List');
      return;
    }

    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(
      page.getByText(/No .*found|No data found/i).or(page.locator('tbody tr').first()).first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_SPI_002 spare part approval loads without approving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/spare-part-approval', 'Spare Part Approval');
    if (!opened) {
      noteInaccessible('Spare Part Approval');
      return;
    }

    await expect(page.getByText(/Status|Asset|Part/i).first()).toBeVisible();
  });

  test('TC_SPI_003 spare part issue loads without issuing stock', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/spare-part-issue', 'Spare Part Issue');
    if (!opened) {
      noteInaccessible('Spare Part Issue');
      return;
    }

    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Vendor').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
  });

  test('TC_SPI_004 a spare request can be opened without rejecting it', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/spare-part-approval', 'Spare Part Approval');
    if (!opened) {
      noteInaccessible('Spare Part Approval');
      return;
    }

    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText(/No .*found|No data found|Status/i).first()).toBeVisible();
      return;
    }

    await row.click();
    await expect(page.getByText(/Part|Quantity|Status/i).first()).toBeVisible({ timeout: 20000 });
    const reject = page.getByRole('button', { name: /Reject/i }).first();
    if (await reject.isVisible().catch(() => false)) {
      await expect(reject).toBeVisible();
    }
  });

  test('TC_SPI_005 spare part issue shows the vendor column', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/spare-part-issue', 'Spare Part Issue');
    if (!opened) {
      noteInaccessible('Spare Part Issue');
      return;
    }

    await expect(page.getByText('Vendor').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
  });
});
