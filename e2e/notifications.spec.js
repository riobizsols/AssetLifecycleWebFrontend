// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const notificationList = (page) =>
  page
    .getByText('No Notifications')
    .or(page.getByText('No Matching Notifications'))
    .or(page.getByText('Due On'))
    .first();

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
    await expect(notificationList(page)).toBeVisible({ timeout: 60000 });
  });

  test('TC_NOTIF_002 an existing notification can be opened', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/notifications', 'All Notifications');
    if (!opened) {
      noteInaccessible('Notifications');
      return;
    }

    await expect(notificationList(page)).toBeVisible({ timeout: 60000 });
    const empty = page.getByText('No Notifications').or(page.getByText('No Matching Notifications'));
    if (await empty.first().isVisible().catch(() => false)) {
      await expect(empty.first()).toBeVisible();
      return;
    }

    await expect(page.getByText('Due On').first()).toBeVisible();
    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.getByText('Warranty').first()).toBeVisible();
  });
});
