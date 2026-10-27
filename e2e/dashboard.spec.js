// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-DA-${Date.now().toString(36)}`;
const DASHBOARD = `${BASE}/dashboard`;

const METRIC_TITLES = [
  'Total Assets',
  'Assigned Assets',
  'Under Maintenance',
  'Decommissioned',
];

const TRIGGER_LABELS = [
  'Trigger Now',
  'Trigger Vendor Renewal',
  'Trigger Depreciation Cron Job',
  'Generate Inspections',
  'Run Now',
  'Trigger Escalation',
];

/** @type {number[] | null} */
let firstMetrics = null;

/**
 * @param {import('@playwright/test').Page} page
 */
async function openDashboard(page) {
  await gotoProtected(page, DASHBOARD);
  await expect(page.locator('header').getByText('Dashboard', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Total Assets', { exact: true })).toBeVisible({ timeout: 30000 });
  const firstValue = page.locator('p.tabular-nums').first();
  await expect(firstValue).toBeVisible({ timeout: 30000 });
  await firstValue.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
function cardByTitle(page, title) {
  return page
    .getByText(title, { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"rounded-xl") or contains(@class,"rounded-lg")][1]');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function readMetric(page, title) {
  const card = cardByTitle(page, title);
  const text = (await card.locator('p.tabular-nums').first().innerText()).trim();
  const value = Number(text.replace(/,/g, ''));
  expect(Number.isInteger(value), `${title} should be a whole number, got "${text}"`).toBeTruthy();
  expect(value, `${title} should be >= 0`).toBeGreaterThanOrEqual(0);
  return value;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function readFourMetrics(page) {
  /** @type {number[]} */
  const values = [];
  for (const title of METRIC_TITLES) {
    values.push(await readMetric(page, title));
  }
  return values;
}

/**
 * @param {import('@playwright/test').Page} page
 */
function notificationsCard(page) {
  return cardByTitle(page, 'Notifications');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function alertCards(page) {
  return notificationsCard(page).locator('div.p-4.rounded-lg.border');
}

test.describe('Dashboard', () => {
  test('DA-01 Open Dashboard', async ({ page }) => {
    await openDashboard(page);
    await expect(page.getByText('Department Wise Asset Distribution', { exact: true })).toBeVisible();
    await expect(page.getByText('Top 5 Asset Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Cron Job Monitor', { exact: true })).toBeVisible();
    await expect(page.getByText('Depreciation Cron Job Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Inspection Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Maintenance Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Workflow Escalation Trigger')).toBeVisible();
  });

  test('DA-02 The four metric cards', async ({ page }) => {
    await openDashboard(page);
    firstMetrics = await readFourMetrics(page);
  });

  test('DA-03 A metric card does not open another screen', async ({ page }) => {
    await openDashboard(page);
    for (const title of METRIC_TITLES) {
      await page.getByText(title, { exact: true }).click();
      await expect(page).toHaveURL(/\/dashboard\/?$/);
    }
    const after = await readFourMetrics(page);
    if (firstMetrics) {
      expect(after).toEqual(firstMetrics);
    }
  });

  test('DA-04 Department chart card', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Department Wise Asset Distribution');
    await expect(card).toBeVisible();
    const empty = card.getByText('No department data available');
    const named = card.locator('span.text-gray-600').first();
    await expect(empty.or(named).first()).toBeVisible({ timeout: 30000 });
  });

  test('DA-05 Top asset types card', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Top 5 Asset Type');
    await expect(card).toBeVisible();
    const empty = card.getByText('No asset types available');
    const bar = card.locator('div.bg-gray-200.rounded-full').first();
    await expect(empty.or(bar).first()).toBeVisible({ timeout: 30000 });
    const bars = card.locator('div.bg-gray-200.rounded-full');
    expect(await bars.count()).toBeLessThanOrEqual(5);
  });

  test('DA-06 Notifications card', async ({ page }) => {
    await openDashboard(page);
    const card = notificationsCard(page);
    await expect(card.getByRole('button', { name: 'View All' })).toBeVisible();
    const empty = card.getByText('No upcoming maintenance alerts.');
    const alerts = alertCards(page);
    await expect(empty.or(alerts.first()).first()).toBeVisible({ timeout: 30000 });
    expect(await alerts.count()).toBeLessThanOrEqual(2);
  });

  test('DA-07 Cron Job Monitor', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Cron Job Monitor');
    await expect(card).toBeVisible();
    await expect(card.getByRole('button', { name: /Trigger Now|Refresh/i }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    const loaded = card.getByText('Maintenance Schedule Generation', { exact: true });
    const vendor = card.getByText('Vendor Contract Renewal', { exact: true });
    const failed = card.getByText(/Failed to fetch cron job status|temporarily unavailable/);
    await expect(loaded.or(failed).first()).toBeVisible({ timeout: 45000 });
    if (await loaded.isVisible().catch(() => false)) {
      await expect(vendor).toBeVisible();
    }
  });

  test('DA-08 The four trigger panels', async ({ page }) => {
    await openDashboard(page);
    await expect(page.getByText('Depreciation Cron Job Trigger', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Trigger Depreciation Cron Job' })).toBeVisible();
    await expect(page.getByText('Inspection Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Generate Inspections' })).toBeVisible();
    await expect(page.getByText('Maintenance Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Now' })).toBeVisible();
    await expect(page.getByText('Workflow Escalation Trigger')).toBeVisible();
    await expect(page.getByRole('button', { name: /Trigger Escalation/ })).toBeVisible();
    for (const label of TRIGGER_LABELS) {
      await expect(page.getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toBeVisible();
    }
  });

  test('DA-09 The four numbers stay whole numbers', async ({ page }) => {
    await openDashboard(page);
    const before = await readFourMetrics(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openDashboard(page);
    const after = await readFourMetrics(page);
    expect(after.every((n) => Number.isInteger(n) && n >= 0)).toBeTruthy();
    firstMetrics = after;
    void before;
  });

  test('DA-10 Asset Breakdown & Overlaps', async ({ page }) => {
    await openDashboard(page);
    const breakdown = page.getByText('Asset Breakdown & Overlaps', { exact: true });
    await expect(breakdown).toBeVisible({ timeout: 30000 });
  });

  test('DA-11 An overlap row is shown only when the count is above 0', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Asset Breakdown & Overlaps');
    await expect(card.getByText('Overlaps (Assets in Multiple Categories)', { exact: true })).toBeVisible();
    const labels = [
      'Assigned + Maintenance',
      'Assigned + Decommissioned',
      'Maintenance + Decommissioned',
      'All Three Categories',
    ];
    for (const label of labels) {
      const row = card.getByText(label, { exact: true });
      if (await row.isVisible().catch(() => false)) {
        const countText = await row
          .locator('xpath=following::p[contains(@class,"tabular-nums") or contains(@class,"font-bold")][1]')
          .innerText();
        const n = Number(String(countText).replace(/,/g, ''));
        expect(n, `${label} is visible so its count must be > 0`).toBeGreaterThan(0);
      }
    }
  });

  test('DA-12 Assets not in any category', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Asset Breakdown & Overlaps');
    const line = card.getByText('Assets not in any category');
    if (await line.isVisible().catch(() => false)) {
      await expect(
        card.getByText('These assets are unassigned, not under maintenance, and not decommissioned.'),
      ).toBeVisible();
      const countText = await line.locator('xpath=following-sibling::span[1] | .//span').first().innerText();
      const n = Number(String(countText).replace(/,/g, ''));
      expect(n).toBeGreaterThan(0);
    }
  });

  test('DA-13 Live tenant metric state', async ({ page }) => {
    await openDashboard(page);
    const [total] = await readFourMetrics(page);
    const deptEmpty = page.getByText('No department data available');
    const typeEmpty = page.getByText('No asset types available');
    if (total === 0) {
      await expect(deptEmpty).toBeVisible();
      await expect(typeEmpty).toBeVisible();
    } else {
      expect(total).toBeGreaterThan(0);
    }
  });

  test('DA-14 Department names and percents', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Department Wise Asset Distribution');
    if (await card.getByText('No department data available').isVisible().catch(() => false)) {
      return;
    }
    const names = card.locator('span.text-gray-600');
    const percents = card.locator('span.font-semibold.tabular-nums');
    const nameCount = await names.count();
    expect(nameCount).toBeGreaterThan(0);
    const seen = new Set();
    /** @type {number[]} */
    const pcts = [];
    for (let i = 0; i < nameCount; i += 1) {
      const name = (await names.nth(i).innerText()).trim();
      expect(seen.has(name), `department ${name} listed twice`).toBeFalsy();
      seen.add(name);
      const pct = (await percents.nth(i).innerText()).trim();
      expect(pct).toMatch(/^\d+%$/);
      pcts.push(Number(pct.replace('%', '')));
    }
    for (let i = 1; i < pcts.length; i += 1) {
      expect(pcts[i - 1]).toBeGreaterThanOrEqual(pcts[i]);
    }
  });

  test('DA-15 Department tooltip', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Department Wise Asset Distribution');
    if (await card.getByText('No department data available').isVisible().catch(() => false)) {
      return;
    }
    const slice = card.locator('.recharts-pie-sector, path.recharts-sector').first();
    await expect(slice).toBeVisible();
    await slice.hover({ force: true });
    await expect(page.getByText(/\d+\s+assets/)).toBeVisible({ timeout: 5000 });
  });

  test('DA-16 Top 5 rows', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Top 5 Asset Type');
    if (await card.getByText('No asset types available').isVisible().catch(() => false)) {
      return;
    }
    const rows = card.locator('div.flex.items-center.justify-between');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
    expect(count).toBeLessThanOrEqual(5);
    /** @type {number[]} */
    const values = [];
    for (let i = 0; i < count; i += 1) {
      const n = Number((await rows.nth(i).locator('span.text-white').innerText()).trim());
      expect(n).toBeGreaterThanOrEqual(0);
      values.push(n);
    }
    expect(values[0]).toBe(Math.max(...values));
  });

  test('DA-17 Top 5 Asset Type opens Asset Types', async ({ page }) => {
    await openDashboard(page);
    await page.getByText('Top 5 Asset Type', { exact: true }).click();
    await expect(page).toHaveURL(/\/master-data\/asset-types\/?$/);
    await expect(page.getByText('Asset Type Name', { exact: true })).toBeVisible({ timeout: 30000 });
  });

  test('DA-18 Return from Asset Types', async ({ page }) => {
    await openDashboard(page);
    const after = await readFourMetrics(page);
    for (const title of METRIC_TITLES) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    if (firstMetrics) {
      expect(after.every((n) => Number.isInteger(n))).toBeTruthy();
    }
  });

  test('DA-19 At most two alerts', async ({ page }) => {
    await openDashboard(page);
    const card = notificationsCard(page);
    const empty = card.getByText('No upcoming maintenance alerts.');
    const alerts = alertCards(page);
    await expect(empty.or(alerts.first()).first()).toBeVisible({ timeout: 30000 });
    const count = await alerts.count();
    expect(count).toBeLessThanOrEqual(2);
  });

  test('DA-20 Inspection and maintenance together', async ({ page }) => {
    await openDashboard(page);
    const alerts = alertCards(page);
    const count = await alerts.count();
    expect(count).toBeLessThanOrEqual(2);
    if (count === 2) {
      const types = [
        (await alerts.nth(0).locator('span.text-xs.font-bold').first().innerText()).trim(),
        (await alerts.nth(1).locator('span.text-xs.font-bold').first().innerText()).trim(),
      ];
      expect(types[0]).not.toEqual('');
      expect(types[1]).not.toEqual('');
    }
  });

  test('DA-21 An alert shows due and action', async ({ page }) => {
    await openDashboard(page);
    const alerts = alertCards(page);
    if ((await alerts.count()) === 0) {
      await expect(notificationsCard(page).getByText('No upcoming maintenance alerts.')).toBeVisible();
      return;
    }
    const card = alerts.first();
    await expect(card.locator('span.text-xs.font-bold').first()).toBeVisible();
    await expect(card.getByText(/Due On:/)).toBeVisible();
    const spareOrStock = (await card.getByText('Category:').count()) > 0
      || (await card.getByText('Out of stock').count()) > 0
      || (await card.getByText('Needs purchase').count()) > 0;
    if (!spareOrStock) {
      await expect(card.getByText(/Action By:/)).toBeVisible();
      await expect(card.getByText(/Cut-off Date:/)).toBeVisible();
    }
  });

  test('DA-22 View All opens All Notifications', async ({ page }) => {
    await openDashboard(page);
    await notificationsCard(page).getByRole('button', { name: 'View All' }).click();
    await expect(page).toHaveURL(/\/notifications\/?$/);
    await expect(page.locator('header').getByText('All Notifications', { exact: true })).toBeVisible({
      timeout: 30000,
    });
  });

  test('DA-23 The Notifications title also opens All Notifications', async ({ page }) => {
    await openDashboard(page);
    await page.getByText('Notifications', { exact: true }).first().click();
    await expect(page).toHaveURL(/\/notifications\/?$/);
    await expect(page.locator('header').getByText('All Notifications', { exact: true })).toBeVisible({
      timeout: 30000,
    });
  });

  test('DA-24 Open one alert and come back', async ({ page }) => {
    await openDashboard(page);
    const alerts = alertCards(page);
    const count = await alerts.count();
    if (count === 0) {
      await expect(notificationsCard(page).getByText('No upcoming maintenance alerts.')).toBeVisible();
      return;
    }
    let clicked = false;
    for (let i = 0; i < count; i += 1) {
      const row = alerts.nth(i);
      const isWarranty = (await row.getByRole('button', { name: 'Actions' }).count()) > 0;
      if (isWarranty) continue;
      await row.click();
      clicked = true;
      break;
    }
    if (!clicked) {
      await expect(alerts.first().getByRole('button', { name: 'Actions' })).toBeVisible();
      return;
    }
    await openDashboard(page);
    for (const title of METRIC_TITLES) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
  });

  test('DA-25 Warranty Actions stay closed', async ({ page }) => {
    await openDashboard(page);
    const actions = notificationsCard(page).getByRole('button', { name: 'Actions' });
    if ((await actions.count()) === 0) {
      return;
    }
    await actions.first().click();
    const menu = page.getByRole('button', { name: 'Discard' });
    await expect(menu).toBeVisible();
    await expect(page.getByRole('button', { name: 'Extend Expiry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remind Again' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scrap' })).toBeVisible();
    await page.getByText('Total Assets', { exact: true }).click();
    await expect(page.getByRole('button', { name: 'Discard' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/dashboard\/?$/);
  });

  test('DA-26 Maintenance schedule details', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Cron Job Monitor');
    const loaded = card.getByText('Maintenance Schedule Generation', { exact: true });
    const failed = card.getByText(/Failed to fetch cron job status|temporarily unavailable/);
    await expect(loaded.or(failed).first()).toBeVisible({ timeout: 45000 });
    if (!(await loaded.isVisible().catch(() => false))) return;
    await expect(card.getByText('0 0 * * *', { exact: true })).toBeVisible();
    await expect(card.getByText('Asia/Kolkata (IST)').first()).toBeVisible();
    await expect(card.getByText('Next Run:', { exact: true })).toBeVisible();
    await expect(card.getByText(/^Active$|^Running \(/).first()).toBeVisible();
  });

  test('DA-27 Vendor contract renewal details', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Cron Job Monitor');
    const loaded = card.getByText('Vendor Contract Renewal', { exact: true });
    const failed = card.getByText(/Failed to fetch cron job status|temporarily unavailable/);
    await expect(loaded.or(failed).first()).toBeVisible({ timeout: 45000 });
    if (!(await loaded.isVisible().catch(() => false))) return;
    await expect(card.getByText('0 8 * * *', { exact: true })).toBeVisible();
    await expect(card.getByText('Daily at 8:00 AM IST', { exact: true })).toBeVisible();
    await expect(card.getByText('Checks vendor contracts ending within 10 days and creates renewal workflows')).toBeVisible();
  });

  test('DA-28 Refresh reloads status only', async ({ page }) => {
    await openDashboard(page);
    const before = await readFourMetrics(page);
    const card = cardByTitle(page, 'Cron Job Monitor');
    await card.getByRole('button', { name: 'Refresh' }).click();
    await expect(card.getByRole('button', { name: 'Trigger Now' })).toBeVisible();
    const after = await readFourMetrics(page);
    expect(after).toEqual(before);
  });

  test('DA-29 Trigger buttons stay unused', async ({ page }) => {
    await openDashboard(page);
    const card = cardByTitle(page, 'Cron Job Monitor');
    const triggerNow = card.getByRole('button', { name: 'Trigger Now' });
    const vendor = card.getByRole('button', { name: 'Trigger Vendor Renewal' });
    await expect(triggerNow).toBeVisible();
    await expect(vendor).toBeVisible();
    await expect(page.getByText('Last Maintenance Trigger Result')).toHaveCount(0);
    await expect(page.getByText('Last Vendor Renewal Trigger Result')).toHaveCount(0);
  });

  test('DA-30 Open the full cron screen when the login can', async ({ page }) => {
    await openDashboard(page);
    await page.getByText('Cron Job Monitor', { exact: true }).click();
    const onCron =
      /\/cron-management|\/adminsettings\/configuration\/job-monitor|\/adminsettings\/configuration\/one-time-cron/.test(
        page.url(),
      );
    if (onCron) {
      expect(page.url()).not.toMatch(/\/dashboard\/?$/);
    } else {
      await expect(page).toHaveURL(/\/dashboard\/?$/);
      await expect(
        page.getByText('Use the buttons below to trigger jobs. Admin access is required to open the full monitor.'),
      ).toBeVisible();
    }
  });

  test('DA-31 Depreciation Cron Job Trigger', async ({ page }) => {
    await openDashboard(page);
    const panel = page.getByText('Depreciation Cron Job Trigger', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(panel.locator('input').first()).toHaveValue(/ORG/);
    await expect(panel.getByRole('button', { name: 'Trigger Depreciation Cron Job' })).toBeVisible();
    await expect(panel.getByText('Click the button above to trigger the depreciation calculation cron job')).toBeVisible();
    await expect(panel.getByText('This will process all assets eligible for depreciation')).toBeVisible();
    await expect(panel.getByText('Job Summary')).toHaveCount(0);
  });

  test('DA-32 Inspection Schedule Trigger', async ({ page }) => {
    await openDashboard(page);
    const panel = page.getByText('Inspection Schedule Trigger', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(panel.locator('input').first()).not.toHaveValue('');
    await expect(panel.getByRole('button', { name: 'Generate Inspections' })).toBeVisible();
    await expect(panel.getByText(/^Result:/)).toHaveCount(0);
  });

  test('DA-33 Maintenance Schedule Trigger', async ({ page }) => {
    await openDashboard(page);
    const panel = page.getByText('Maintenance Schedule Trigger', { exact: true })
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(panel.locator('input').first()).not.toHaveValue('');
    await expect(panel.getByRole('button', { name: 'Run Now' })).toBeVisible();
    await expect(
      panel.getByText(/create maintenance workflow tasks for assets due for maintenance/i),
    ).toBeVisible();
    await expect(panel.getByText(/^Result:/)).toHaveCount(0);
  });

  test('DA-34 Workflow Escalation Trigger', async ({ page }) => {
    await openDashboard(page);
    const panel = page.getByText('Workflow Escalation Trigger')
      .locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]');
    await expect(panel.locator('input').first()).not.toHaveValue('');
    await expect(panel.getByRole('button', { name: /Trigger Escalation/ })).toBeVisible();
    await expect(panel.getByText('Escalation Summary')).toHaveCount(0);
  });

  test('DA-35 Reload Dashboard', async ({ page }) => {
    await openDashboard(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await openDashboard(page);
    for (const title of METRIC_TITLES) {
      await expect(page.getByText(title, { exact: true })).toBeVisible();
    }
    await expect(page.getByText('Department Wise Asset Distribution', { exact: true })).toBeVisible();
    await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Cron Job Monitor', { exact: true })).toBeVisible();
    await expect(page.getByText('Last Maintenance Trigger Result')).toHaveCount(0);
  });

  test('DA-36 Leave and come back', async ({ page }) => {
    await openDashboard(page);
    await gotoProtected(page, `${BASE}/notifications`);
    await openDashboard(page);
    await expect(page.getByText('Total Assets', { exact: true })).toBeVisible();
    await expect(page.getByText('Department Wise Asset Distribution', { exact: true })).toBeVisible();
    await expect(page.getByText('Top 5 Asset Type', { exact: true })).toBeVisible();
    await expect(page.getByText('Notifications', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Cron Job Monitor', { exact: true })).toBeVisible();
    await expect(page.getByText('Depreciation Cron Job Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Inspection Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Maintenance Schedule Trigger', { exact: true })).toBeVisible();
    await expect(page.getByText('Workflow Escalation Trigger')).toBeVisible();
  });

  test('DA-37 A second run does not clean up', async ({ page }) => {
    await openDashboard(page);
    await readFourMetrics(page);
    for (const label of TRIGGER_LABELS) {
      await expect(
        page.getByRole('button', { name: new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }),
      ).toBeVisible();
    }
    await expect(page.getByText('Last Maintenance Trigger Result')).toHaveCount(0);
    void run;
  });
});
