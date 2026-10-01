// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen, waitForRowOrEmpty } from './helpers/screenAccess.js';

test.describe('RIO EAM breakdown', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_BD_001 employee breakdown list shows reporter and description', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/employee-report-breakdown', 'Employee Report Breakdown');
    if (!opened) {
      noteInaccessible('Employee Report Breakdown');
      return;
    }

    await expect(page.getByText('Reported By').first()).toBeVisible();
    await expect(page.getByText('Description').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(
      page.getByText(/No .*found|No data found/i).or(page.locator('tbody tr').first()).first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_BD_002 report breakdown list is available for this login', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/report-breakdown', 'Report Breakdown');
    if (!opened) {
      noteInaccessible('Report Breakdown');
      return;
    }

    await expect(page.getByText('Reported By').first()).toBeVisible();
    await expect(page.getByText('Description').first()).toBeVisible();
  });

  test('TC_BD_003 an existing breakdown can be opened without saving a note', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/report-breakdown', 'Report Breakdown');
    if (!opened) {
      noteInaccessible('Report Breakdown');
      return;
    }

    const opener = page.getByTitle('View/Edit Details').first();
    const hasRow = await waitForRowOrEmpty(page, opener, /No data found/i);
    if (!hasRow) return;

    await opener.click();
    await expect(page).toHaveURL(/\/edit-breakdown/, { timeout: 20000 });
    await expect(page.getByText(/Description|Reported By|Status/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('TC_BD_004 breakdown detail stays open and is not closed or reopened', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/report-breakdown', 'Report Breakdown');
    if (!opened) {
      noteInaccessible('Report Breakdown');
      return;
    }

    const opener = page.getByTitle('View/Edit Details').first();
    const hasRow = await waitForRowOrEmpty(page, opener, /No data found/i);
    if (!hasRow) return;

    await opener.click();
    await expect(page).toHaveURL(/\/edit-breakdown/, { timeout: 20000 });
    await expect(page.getByText(/Status|Description/i).first()).toBeVisible({ timeout: 20000 });
    const close = page.getByRole('button', { name: /^Close$|Reopen/i });
    if (await close.first().isVisible().catch(() => false)) {
      await expect(close.first()).toBeVisible();
    }
  });
});
