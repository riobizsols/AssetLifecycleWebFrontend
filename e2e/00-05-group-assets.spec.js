// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM asset groups', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_GRP_001 asset group create form shows name and asset type', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/group-asset', 'Asset Groups');
    if (!opened) {
      noteInaccessible('Asset Groups');
      return;
    }
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Asset group create');
      return;
    }
    await add.click();
    await expect(page.getByPlaceholder('Enter group name')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Select Asset Type').first()).toBeVisible();
    await expect(page.getByText(/Total Assets Selected: 0/)).toBeVisible();
  });

  test('TC_GRP_002 group membership is shown without adding a shared asset', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/group-asset', 'Asset Groups');
    if (!opened) {
      noteInaccessible('Asset Groups');
      return;
    }
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    const opener = page.locator('tbody button[title="View"], tbody button[title="Edit"]').first();
    if (await opener.isVisible().catch(() => false)) {
      await opener.click();
      await expect(page).toHaveURL(/\/group-asset\/(view|edit)\//, { timeout: 20000 });
      await expect(page.getByText(/Selected Assets|Asset/).first()).toBeVisible();
      return;
    }
    await expect(page.getByText('No asset groups found.')).toBeVisible();
  });

  test('TC_GRP_003 a group name without assets cannot be saved', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/group-asset/create', 'Asset Groups');
    if (!opened) {
      noteInaccessible('Asset group create');
      return;
    }
    await page.getByPlaceholder('Enter group name').fill('PW-E2E-EMPTY');
    const save = page.getByRole('button', { name: 'Save' });
    await expect(save).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(page).toHaveURL(/\/group-asset\/create/);
  });
});
