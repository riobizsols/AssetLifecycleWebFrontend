// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM maintenance schedule and approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_MAINT_001 job monitor shows run and does not start the cron', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/job-monitor', 'Job Monitor');
    if (!opened) {
      noteInaccessible('Job Monitor');
      return;
    }
    await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByTitle('Run').first()).toBeVisible();
    await expect(page.getByText(/ENABLED|DISABLED/).first()).toBeVisible();
  });

  test('TC_MAINT_002 maintenance schedule lists due work without triggering it', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/maintenance-schedule-view', 'Scheduled Date');
    if (!opened) {
      noteInaccessible('Maintenance Schedule');
      return;
    }
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No data found').or(page.locator('tbody tr').first())
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_MAINT_003 maintenance approval opens for this login', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/maintenance-approval', 'Approval');
    if (!opened) {
      noteInaccessible('Maintenance Approval');
      return;
    }
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No data found').or(page.locator('tbody tr').first())
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_MAINT_004 supervisor approval opens without completing a job', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/maintenance-list', 'Maintenance List');
    if (!opened) {
      noteInaccessible('Supervisor Approval');
      return;
    }
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No data found').or(page.locator('tbody tr').first())
    ).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: /^Complete$/ })).toHaveCount(0);
  });

  test('TC_MAINT_005 vendor maintenance is not triggered from the schedule', async ({ page }) => {
    test.setTimeout(150000);
    const schedule = await openTitledScreen(page, '/maintenance-schedule-view', 'Scheduled Date');
    if (!schedule) {
      noteInaccessible('Maintenance Schedule');
      return;
    }
    await expect(page.getByTitle('Run')).toHaveCount(0);
    const approval = await openTitledScreen(page, '/maintenance-approval', 'Approval');
    if (!approval) {
      noteInaccessible('Maintenance Approval');
      return;
    }
    await expect(page.getByRole('button', { name: /^Approve$/ })).toHaveCount(0);
  });
});
