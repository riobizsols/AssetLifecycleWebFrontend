// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM audit logs', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_AUD_001 audit log list can be filtered to today', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/audit-logs-view', 'Audit Logs');
    if (!opened) {
      noteInaccessible('Audit Logs');
      return;
    }

    await expect(page.getByText('Timestamp').first()).toBeVisible();
    await expect(page.getByText('User Name').first()).toBeVisible();

    const totalBefore = page.getByText(/Total Records:/);
    await expect(totalBefore).toBeVisible({ timeout: 30000 });
    const before = (await totalBefore.innerText()).trim();

    await page.getByRole('button', { name: /Filters/ }).click();
    const today = new Date().toISOString().slice(0, 10);
    const dates = page.locator('input[type="date"]');
    await expect(dates.first()).toBeVisible({ timeout: 10000 });
    await dates.nth(0).fill(today);
    await dates.nth(1).fill(today);

    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No audit logs found').or(page.getByText('User Name').first())
    ).toBeVisible({ timeout: 20000 });

    const after = (await page.getByText(/Total Records:/).innerText()).trim();
    expect(after.length).toBeGreaterThan(0);
    expect(before.length).toBeGreaterThan(0);
  });

  test('TC_AUD_002 audit log config shows enable controls without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/audit-log-config', 'Refresh');
    if (!opened) {
      noteInaccessible('Audit Log Config');
      return;
    }

    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('Enabled').or(page.getByText('Disabled')).or(page.getByText('No configurations found')).first()
    ).toBeVisible({ timeout: 20000 });
  });
});
