// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected, waitForAppShell } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-OC-${Date.now().toString(36)}`;
const screenUrl = `${BASE}/adminsettings/configuration/one-time-cron`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const maintenanceDesc =
  'Adds default maintenance approval sequence (WFS-06, sequence 10) for each asset type that has no maintenance workflow sequence configured. Scheduled daily at 1:00 AM IST.';
const scrapDesc =
  'Adds one-level scrap approval (WFS-02, sequence 10) for each asset type that has no scrap workflow sequence configured. Scheduled daily at 3:30 AM IST.';

/**
 * Fail the test if a backfill POST is sent. This screen must stay read-only.
 * @param {import('@playwright/test').Page} page
 */
async function forbidBackfillPosts(page) {
  await page.route('**/cron-jobs/one-time/**', async (route) => {
    await route.abort('failed');
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openOneTimeCron(page) {
  await forbidBackfillPosts(page);
  await gotoProtected(page, screenUrl);
  await expect(page.getByRole('heading', { name: 'One time cron', exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function maintenanceRunButton(page) {
  return page.getByRole('button', { name: 'Run maintenance workflow backfill', exact: true });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function scrapRunButton(page) {
  return page.getByRole('button', { name: 'Run scrap workflow backfill', exact: true });
}

test.describe('One Time Cron', () => {
  test('OC-01 Open One Time Cron', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(page.locator('header').getByText('One time cron', { exact: true })).toBeVisible();
    await expect(
      page.getByText(
        'Run workflow backfill jobs manually. The same jobs also run on a daily schedule at different times.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(headerAddButton(page)).toHaveCount(0);
  });

  test('OC-02 Maintenance workflow card', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(page.getByRole('heading', { name: 'Maintenance workflow', exact: true })).toBeVisible();
    await expect(page.getByText(maintenanceDesc, { exact: true })).toBeVisible();
    await expect(maintenanceRunButton(page)).toBeVisible();
    await expect(maintenanceRunButton(page)).toBeEnabled();
  });

  test('OC-03 Scrap workflow card', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(page.getByRole('heading', { name: 'Scrap workflow', exact: true })).toBeVisible();
    await expect(page.getByText(scrapDesc, { exact: true })).toBeVisible();
    await expect(scrapRunButton(page)).toBeVisible();
    await expect(scrapRunButton(page)).toBeEnabled();
  });

  test('OC-04 No result block before a run', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(page.getByText(/^Scanned:/)).toHaveCount(0);
    await expect(page.getByText('Inserted:', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Skipped (missing WF step)', { exact: false })).toHaveCount(0);
    await expect(page.getByText('Maintenance workflow backfill completed')).toHaveCount(0);
    await expect(page.getByText('Scrap workflow backfill completed')).toHaveCount(0);
  });

  test('OC-05 Return to the Admin Dashboard', async ({ page }) => {
    await openOneTimeCron(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'One Time Cron', exact: true })).toBeVisible({
      timeout: 30000,
    });
  });

  test('OC-06 Do not click Run maintenance workflow backfill', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(maintenanceRunButton(page)).toBeEnabled();
    await expect(page.getByText('Running…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Maintenance workflow backfill completed')).toHaveCount(0);
  });

  test('OC-07 Do not click Run scrap workflow backfill', async ({ page }) => {
    await openOneTimeCron(page);
    await expect(scrapRunButton(page)).toBeEnabled();
    await expect(page.getByText('Running…', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Scrap workflow backfill completed')).toHaveCount(0);
  });

  test('OC-08 Refresh leaves the screen unchanged', async ({ page }) => {
    await openOneTimeCron(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppShell(page);
    await expect(page.getByRole('heading', { name: 'One time cron', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('heading', { name: 'Maintenance workflow', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scrap workflow', exact: true })).toBeVisible();
    await expect(maintenanceRunButton(page)).toBeEnabled();
    await expect(scrapRunButton(page)).toBeEnabled();
    await expect(page.getByText(/^Scanned:/)).toHaveCount(0);
  });

  test('OC-09 Open the hub card from Admin Settings again', async ({ page }) => {
    await forbidBackfillPosts(page);
    await gotoProtected(page, hubUrl);
    const card = page.locator('div.cursor-pointer').filter({
      has: page.getByRole('heading', { name: 'One Time Cron', exact: true }),
    });
    await expect(card).toBeVisible({ timeout: 30000 });
    await card.click();
    await expect(page).toHaveURL(/\/adminsettings\/configuration\/one-time-cron$/);
    await expect(page.getByRole('heading', { name: 'One time cron', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maintenance workflow', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scrap workflow', exact: true })).toBeVisible();
    await expect(maintenanceRunButton(page)).toBeEnabled();
    await expect(scrapRunButton(page)).toBeEnabled();
  });
});
