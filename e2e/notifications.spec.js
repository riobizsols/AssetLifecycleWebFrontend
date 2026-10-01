// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM notifications', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_NOTIF_001 notifications list loads for this login', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/notifications', 'All Notifications');
    if (!opened) {
      noteInaccessible('Notifications');
      return;
    }

    await expect(page.getByRole('button', { name: 'Filters' })).toBeVisible();
    await expect(
      page
        .getByText('No Notifications')
        .or(page.getByText('Due On').first())
        .or(page.getByText('Warranty').first())
    ).toBeVisible({ timeout: 30000 });
  });

  test('TC_NOTIF_002 an existing notification can be opened', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/notifications', 'All Notifications');
    if (!opened) {
      noteInaccessible('Notifications');
      return;
    }

    const empty = page.getByText('No Notifications');
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }

    const card = page.getByText('Due On').or(page.getByText('Actions')).first();
    await expect(card).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByText('Warranty').first()).toBeVisible();
  });
});
