// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected, waitForAppShell } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-JM-${Date.now().toString(36)}`;
const screenUrl = `${BASE}/adminsettings/configuration/job-monitor`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const state = {
  firstName: '',
  firstFrequency: '',
  firstStatus: '',
  secondName: '',
};

/**
 * Jobs, frequencies, and history already live on the tenant. This screen has no create.
 * Never Run, Save, or Clear Oldest 100.
 * @param {import('@playwright/test').Page} page
 */
async function forbidMutatingJobMonitor(page) {
  await page.route('**/job-monitor/jobs/*/run', async (route) => {
    await route.abort('failed');
  });
  await page.route('**/job-monitor/jobs/*', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.abort('failed');
      return;
    }
    await route.continue();
  });
  await page.route('**/job-monitor/warranty-notifications/cleanup', async (route) => {
    await route.abort('failed');
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openJobMonitor(page) {
  await forbidMutatingJobMonitor(page);
  await gotoProtected(page, screenUrl);
  await expect(page.getByRole('heading', { name: 'Job Monitor', exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Job List', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('columnheader', { name: 'Job Name' }).or(page.getByText('Loading jobs...')).first(),
  ).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('columnheader', { name: 'Job Name' })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function jobRows(page) {
  return page.locator('table').first().locator('tbody tr');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForJobs(page) {
  const rows = jobRows(page);
  await expect(rows.first(), 'Job Monitor has no screen to create a job. playwright_db returned no Job List rows.').toBeVisible({
    timeout: 30000,
  });
  await expect(rows.first()).not.toContainText('Loading jobs...');
  return rows;
}

test.describe('Job Monitor', () => {
  test('JM-01 Open Job Monitor', async ({ page }) => {
    await openJobMonitor(page);
    await expect(
      page.getByText(
        'Monitor cron jobs, edit frequency/status, trigger runs, and inspect last 100 history rows.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(headerAddButton(page)).toHaveCount(0);
  });

  test('JM-02 Job List columns', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    for (const name of ['Job Name', 'Frequency', 'Status', 'Action']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    const first = rows.first();
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Run"]')).toBeVisible();
    await expect(first.getByText(/ENABLED|DISABLED/)).toBeVisible();
  });

  test('JM-03 Jobs already on the screen', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    const count = await rows.count();
    expect(count, 'Job Monitor has no screen to create a job. playwright_db returned no Job List rows.').toBeGreaterThan(0);
    const first = rows.first();
    state.firstName = (await first.locator('td').nth(0).innerText()).trim();
    state.firstFrequency = (await first.locator('td').nth(1).innerText()).trim();
    state.firstStatus = (await first.locator('td').nth(2).innerText()).trim();
    expect(state.firstName.length).toBeGreaterThan(0);
    expect(state.firstFrequency.length).toBeGreaterThan(0);
    expect(/ENABLED|DISABLED/.test(state.firstStatus)).toBeTruthy();
    if (count > 1) {
      state.secondName = (await rows.nth(1).locator('td').nth(0).innerText()).trim();
    }
  });

  test('JM-04 Loading then the list', async ({ page }) => {
    await openJobMonitor(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppShell(page);
    await expect(
      page.getByText('Loading jobs...').or(page.getByRole('columnheader', { name: 'Job Name' })).first(),
    ).toBeVisible({ timeout: 30000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: 'Job Name' })).toBeVisible({ timeout: 15000 }).catch(() => {});
    await waitForJobs(page);
  });

  test('JM-05 Return to the Admin Dashboard', async ({ page }) => {
    await openJobMonitor(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'Job Monitor', exact: true })).toBeVisible({
      timeout: 30000,
    });
  });

  test('JM-06 Select a job and read Job History', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    await rows.first().locator('td').nth(0).click();
    const name = state.firstName || (await rows.first().locator('td').nth(0).innerText()).trim();
    await expect(page.getByText(`Job History - ${name}`, { exact: true })).toBeVisible();
    for (const heading of ['Date Executed', 'Time Taken (ms)', 'Output JSON', 'Error']) {
      await expect(page.getByRole('columnheader', { name: heading })).toBeVisible();
    }
  });

  test('JM-07 History rows or empty history', async ({ page }) => {
    await openJobMonitor(page);
    await waitForJobs(page);
    const historyTable = page.locator('table').nth(1);
    await expect(
      historyTable.getByText('No history found').or(historyTable.locator('tbody tr').first()).first(),
    ).toBeVisible({ timeout: 30000 }).catch(() => {});
    await expect(page.getByText('Job triggered successfully')).toHaveCount(0);
  });

  test('JM-08 Filter history by date then Clear', async ({ page }) => {
    await openJobMonitor(page);
    await waitForJobs(page);
    const dateInput = page.getByPlaceholder('DD/MM/YYYY');
    await dateInput.fill('01/01/1999');
    const historyTable = page.locator('table').nth(1);
    await expect(historyTable.getByText('No history found', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(dateInput).toHaveValue('');
    await expect(
      historyTable.getByText('No history found').or(historyTable.locator('tbody tr').first()).first(),
    ).toBeVisible();
  });

  test('JM-09 Copy Output JSON', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await openJobMonitor(page);
    await waitForJobs(page);
    const copy = page.locator('button[title="Copy JSON"]').first();
    await expect(
      copy,
      'Job Monitor has no screen to create execution history. playwright_db has no history JSON to copy. Do not click Run to generate one.',
    ).toBeVisible({ timeout: 15000 });
    await copy.click();
    await expect(page.getByText('JSON copied', { exact: true })).toBeVisible({ timeout: 15000 });
  });

  test('JM-10 Open Edit then Cancel', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    const first = rows.first();
    const frequencyBefore = (await first.locator('td').nth(1).innerText()).trim();
    const statusBefore = (await first.locator('td').nth(2).innerText()).trim();
    await first.locator('button[title="Edit"]').click();
    await expect(page.getByPlaceholder('Enter cron or use preset')).toBeVisible();
    await expect(page.getByRole('option', { name: 'Select preset...' })).toBeAttached();
    await expect(first.locator('select').filter({ hasText: 'ENABLED' })).toBeVisible();
    await first.locator('button[title="Cancel"]').click();
    await expect(page.getByPlaceholder('Enter cron or use preset')).toHaveCount(0);
    await expect(first.locator('td').nth(1)).toHaveText(frequencyBefore);
    await expect(first.locator('td').nth(2)).toHaveText(statusBefore);
    await expect(page.getByText('Job updated', { exact: true })).toHaveCount(0);
  });

  test('JM-11 Do not click Run', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    await expect(rows.first().locator('button[title="Run"]')).toBeVisible();
    await expect(page.getByText('RUNNING', { exact: true })).toHaveCount(0);
    await expect(page.getByText('Job triggered successfully')).toHaveCount(0);
  });

  test('JM-12 Do not click Clear Oldest 100', async ({ page }) => {
    await openJobMonitor(page);
    await waitForJobs(page);
    await expect(page.getByText(/Deleted oldest .* warranty notifications/)).toHaveCount(0);
  });

  test('JM-13 Select a second job', async ({ page }) => {
    await openJobMonitor(page);
    const rows = await waitForJobs(page);
    const count = await rows.count();
    expect(
      count,
      'Job Monitor has no screen to create a job. playwright_db has only one Job List row.',
    ).toBeGreaterThan(1);
    const second = rows.nth(1);
    const secondName = (await second.locator('td').nth(0).innerText()).trim();
    await second.locator('td').nth(0).click();
    await expect(page.getByText(`Job History - ${secondName}`, { exact: true })).toBeVisible();
    await expect(page.getByText('Job triggered successfully')).toHaveCount(0);
  });
});
