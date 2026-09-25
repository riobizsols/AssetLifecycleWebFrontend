// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM reports', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads reports, previews the register, and generates a PDF', async ({ page }) => {
    test.setTimeout(300000);

    await loginToRioEam(page);

    const registerOk = await openReport(page, '/reports/asset-report', 'Asset Register');
    expect(registerOk, 'Asset Register must be accessible for this smoke test').toBeTruthy();
    await expect(page.getByText('Asset ID').first()).toBeVisible();
    await expect(page.getByText('PO Number').first()).toBeVisible();
    await expect(page.getByText('Asset Name').first()).toBeVisible();
    await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });

    const poInput = page.getByRole('textbox', { name: 'Search...' }).first();
    await expect(poInput).toBeVisible();
    await poInput.fill('PW-E2E-PO');
    await expect(page.getByText('PO Number: PW-E2E-PO')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('PO Number: PW-E2E-PO')).toHaveCount(0);

    await previewReport(page, 'Asset Register');

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'Generate Report' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename(), 'Expected a generated report file').toMatch(
      /\.(pdf|json)$/i
    );

    if (await openReport(page, '/reports/asset-lifecycle-report', /Asset Lifecycle/i)) {
      await expect(page.getByText('Purchase Date').first()).toBeVisible();
      await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });
    }

    if (await openReport(page, '/reports/maintenance-history', 'Maintenance History')) {
      await expect(page.getByText('Work Order ID').first()).toBeVisible();
      await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });
    }

    if (await openReport(page, '/reports/asset-valuation', 'Asset Valuation')) {
      await expect(page.getByText('In-Use Assets Value').first()).toBeVisible({ timeout: 20000 });
      await expect(page.getByText('Total Portfolio Value').first()).toBeVisible();
    }

    if (await openReport(page, '/reports/breakdown-history', 'Breakdown History')) {
      await expect(page.getByText('Breakdown ID').first()).toBeVisible();
      await expect(page.getByRole('link', { name: /Breakdown Reopen Details/ })).toBeVisible();
      await page.getByRole('link', { name: /Breakdown Reopen Details/ }).click();
      await page.waitForURL(/\/reports\/breakdown-reopen-details\/?$/, { timeout: 20000 });
      await expect(page.getByText('Breakdown Reopen Details').first()).toBeVisible({
        timeout: 20000,
      });
      await expect(
        page.getByText('No breakdowns have been reopened.').or(page.getByText('Breakdown ID').first())
      ).toBeVisible({ timeout: 20000 });
    }

    if (await openReport(page, '/reports/sla-report', 'SLA Reports')) {
      await expect(page.getByText('SLA Description').first()).toBeVisible();
      await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });
    }

    await gotoProtected(page, `${BASE}/reports/usage-based-asset`);
    const usageTitle = page.getByText('Usage-Based Asset Report', { exact: true }).first();
    if (await usageTitle.isVisible().catch(() => false)) {
      await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 15000 });
      await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });
    }

    if (await openReport(page, '/reports/asset-workflow-history', 'Asset Workflow History')) {
      await expect(page.getByText('Work Order ID').first()).toBeVisible();
      await expect(page.getByText(/Preview • \d+ rows/)).toBeVisible({ timeout: 30000 });
    }

    if (await openReport(page, '/reports/qa-audit-report', /QA.*Audit/)) {
      await expect(page.getByText('Date Range').first()).toBeVisible();
      await expect(page.getByText('Asset Type').first()).toBeVisible();
    }
  });
});

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 * @returns {Promise<boolean>}
 */
async function openReport(page, path, title) {
  await gotoProtected(page, `${BASE}${path}`);

  const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
  const titleLocator =
    title instanceof RegExp
      ? page.getByText(title).first()
      : page.getByText(title, { exact: true }).first();

  await expect(unauthorized.or(titleLocator).first()).toBeVisible({ timeout: 45000 });
  if (await unauthorized.isVisible().catch(() => false)) {
    return false;
  }

  await expect(titleLocator).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Active Filters')).toBeVisible();
  await expect(page.getByText('Loading asset valuation data...')).toHaveCount(0, {
    timeout: 30000,
  });
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
async function previewReport(page, title) {
  await page.getByRole('button', { name: 'Preview' }).click();
  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: title }),
  });
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.getByText('Total Records').first()).toBeVisible();
  await modal.getByRole('button', { name: 'Applied Filters' }).click();
  await modal.getByRole('button', { name: 'Detailed Data' }).click();
  await modal.locator('button').filter({ hasText: '×' }).click();
  await expect(modal).toBeHidden({ timeout: 10000 });
}
