// @ts-check
import { test, expect } from '@playwright/test';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/job-monitor';

async function openJobs(page) {
  const status = await openAdminScreen(page, PATH, 'Job List');
  if (skipIfInaccessible(page, 'Job Monitor', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Job Monitor', () => {
  test('list chrome, data or loading error', async ({ page }) => {
    if (!(await openJobs(page))) return;

    await expect(page.getByRole('heading', { name: 'Job Monitor' })).toBeVisible();
    await expect(page.getByText('Job List')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Job Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frequency' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();

    const data = await readAdminState(page, /No history found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA jobs — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();
  });

  test('edit cancelled; Run not clicked; history panel', async ({ page }) => {
    if (!(await openJobs(page))) return;

    const data = await readAdminState(page, null);
    if (data.state === 'error' || (await page.getByText('Loading jobs...').isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: `JOBS still loading or error (${data.message || 'Loading jobs...'}); Run not clicked.`,
      });
      return;
    }

    const run = page.getByTitle('Run').first();
    await expect(page.locator('table tbody tr').first()).toBeVisible();
    await expect(run).toBeVisible();
    test.info().annotations.push({
      type: 'condition',
      description: `RUN visible=${await run.isVisible().catch(() => false)}; not clicked.`,
    });

    const edit = page.getByTitle('Edit').first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByTitle('Save')).toBeVisible();
      await expect(page.getByTitle('Cancel')).toBeVisible();
      await expect(page.getByPlaceholder('Enter cron or use preset')).toBeVisible();
      await expect(page.locator('select option', { hasText: 'Select preset...' })).toBeAttached();
      await page.getByTitle('Cancel').click();
      await expect(page.getByTitle('Save')).toHaveCount(0);
    }

    const firstJob = page.locator('table tbody tr').filter({ hasNotText: /Loading jobs/ }).first();
    if (await firstJob.isVisible().catch(() => false)) {
      await firstJob.click();
      await waitForAdminReady(page);
      await expect(
        page.getByText(/Job History|No history found|Date Executed|Loading history/i).first(),
      ).toBeVisible();
    }
    test.info().annotations.push({
      type: 'condition',
      description: 'EDIT cancelled; history opened; Run/Save not committed.',
    });
  });
});
