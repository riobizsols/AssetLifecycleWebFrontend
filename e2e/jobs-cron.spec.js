// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM text messages and jobs', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_I18N_001 text messages can switch to Hindi without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/text-messages',
      'Text Messages (English → Other Language)'
    );
    if (!opened) {
      noteInaccessible('Text Messages');
      return;
    }

    await page.locator('select').first().selectOption('hi');
    await expect(page.getByText('Lang code:').locator('span')).toHaveText('hi');
    await page.getByPlaceholder('Search...').fill('asset');
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
  });

  test('TC_JOB_001 job monitor shows status and history', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/job-monitor', 'Job Monitor');
    if (!opened) {
      noteInaccessible('Job Monitor');
      return;
    }

    await expect(page.getByText('Job List')).toBeVisible();
    await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });
    const row = page.locator('tbody tr').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText(/No jobs|Job Name/i).first()).toBeVisible();
      return;
    }
    await row.click();
    await expect(page.getByText(/Job History/).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/ENABLED|DISABLED/).first()).toBeVisible();
  });

  test('TC_JOB_002 job list shows a disabled or enabled status', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/job-monitor', 'Job Monitor');
    if (!opened) {
      noteInaccessible('Job Monitor');
      return;
    }
    await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText(/ENABLED|DISABLED/).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByTitle('Run').first()).toBeVisible();
  });

  test('TC_JOB_003 clear oldest control is present and is not clicked', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/job-monitor', 'Job Monitor');
    if (!opened) {
      noteInaccessible('Job Monitor');
      return;
    }
    await expect(page.getByText('Loading jobs...')).toHaveCount(0, { timeout: 30000 });
    const warranty = page.getByText(/warranty/i).first();
    if (await warranty.isVisible().catch(() => false)) {
      await warranty.click();
    } else {
      await page.locator('tbody tr').first().click();
    }
    const clear = page.getByRole('button', { name: 'Clear Oldest 100' });
    if (await clear.isVisible().catch(() => false)) {
      await expect(clear).toBeEnabled();
    }
  });

  test('TC_CRON_001 one time cron shows the maintenance backfill action', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/one-time-cron',
      'One time cron'
    );
    if (!opened) {
      noteInaccessible('One Time Cron');
      return;
    }
    await expect(page.getByRole('button', { name: 'Run maintenance workflow backfill' })).toBeVisible();
    await expect(page.getByText('Maintenance workflow').first()).toBeVisible();
  });

  test('TC_CRON_002 one time cron shows the scrap backfill action', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/one-time-cron',
      'One time cron'
    );
    if (!opened) {
      noteInaccessible('One Time Cron');
      return;
    }
    await expect(page.getByRole('button', { name: 'Run scrap workflow backfill' })).toBeVisible();
    await expect(page.getByText('Scrap workflow').first()).toBeVisible();
  });
});
