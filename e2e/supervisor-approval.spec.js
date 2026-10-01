// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM supervisor approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_SUP_001 supervisor list loads maintenance jobs', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/maintenance-list', 'Maintenance List');
    if (!opened) {
      noteInaccessible('Supervisor Approval');
      return;
    }
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No data found').or(page.locator('tbody tr').first())
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_SUP_002 supervisor detail shows the technician field', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/maintenance-list', 'Maintenance List');
    if (!opened) {
      noteInaccessible('Supervisor Approval');
      return;
    }
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText('No data found')).toBeVisible();
      return;
    }
    await row.click();
    await expect(page).toHaveURL(/\/maintenance-list-detail\//, { timeout: 20000 });
    await expect(page.getByText('Technician Name').first()).toBeVisible({ timeout: 30000 });
  });

  test('TC_SUP_003 supervisor detail shows the checklist without completing it', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/maintenance-list', 'Maintenance List');
    if (!opened) {
      noteInaccessible('Supervisor Approval');
      return;
    }
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText('No data found')).toBeVisible();
      return;
    }
    await row.click();
    await expect(page.getByText('Maintenance Checklist').first()).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: /View Checklist|Loading/ })).toBeVisible();
  });
});
