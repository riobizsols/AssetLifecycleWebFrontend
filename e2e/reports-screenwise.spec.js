// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible } from './helpers/screenAccess.js';
import {
  expectPreviewOrEmpty,
  generateReportFile,
  openReport,
} from './helpers/reportScreen.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM reports screenwise', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_RPT_001 asset report filters and export', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/asset-report', 'Asset Register');
    if (!opened) {
      noteInaccessible('Asset Report');
      return;
    }

    await expect(page.getByText('Asset ID').first()).toBeVisible();
    await expect(page.getByText('PO Number').first()).toBeVisible();
    await expectPreviewOrEmpty(page);

    const poInput = page.getByRole('textbox', { name: 'Search...' }).first();
    await expect(poInput).toBeVisible();
    await poInput.fill('PW-E2E-PO');
    await expect(page.getByText('PO Number: PW-E2E-PO')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(page.getByText('PO Number: PW-E2E-PO')).toHaveCount(0);

    await generateReportFile(page);
  });

  test('TC_RPT_002 asset lifecycle report loads history columns', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/asset-lifecycle-report', /Asset Lifecycle/i);
    if (!opened) {
      noteInaccessible('Asset Lifecycle Report');
      return;
    }
    await expect(page.getByText('Purchase Date').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_003 asset valuation shows portfolio values', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/asset-valuation', 'Asset Valuation');
    if (!opened) {
      noteInaccessible('Asset Valuation');
      return;
    }
    await expect(page.getByText('In-Use Assets Value').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Total Portfolio Value').first()).toBeVisible();
    await page.getByRole('button', { name: 'Generate Report' }).click();
    const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
    await page.getByRole('button', { name: 'PDF Report' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('TC_RPT_004 asset workflow history lists work orders', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/asset-workflow-history', 'Asset Workflow History');
    if (!opened) {
      noteInaccessible('Asset Workflow History');
      return;
    }
    await expect(page.getByText('Work Order ID').first()).toBeVisible();
    await expect(page.getByText('Workflow Step').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_005 maintenance history lists work orders', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/maintenance-history', 'Maintenance History');
    if (!opened) {
      noteInaccessible('Maintenance History');
      return;
    }
    await expect(page.getByText('Work Order ID').first()).toBeVisible();
    await expect(page.getByText('Work Order Status').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_006 breakdown history shows breakdown columns', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/breakdown-history', 'Breakdown History');
    if (!opened) {
      noteInaccessible('Breakdown History');
      return;
    }
    await expect(page.getByText('Breakdown ID').first()).toBeVisible();
    await expect(page.getByText('Reported By').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_007 reopened breakdowns lists reopen history', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/reopened-breakdowns', 'Reopened Breakdowns');
    if (!opened) {
      noteInaccessible('Reopened Breakdowns');
      return;
    }
    await expect(page.getByText('Reopen Count (RO)').first()).toBeVisible();
    await expectPreviewOrEmpty(page);

    const historyLink = page.locator('tbody a[href*="/reports/reopened-breakdowns/"]').first();
    if (await historyLink.isVisible().catch(() => false)) {
      await historyLink.click();
      await expect(page.getByText(/Reopen|History|Breakdown/i).first()).toBeVisible({
        timeout: 20000,
      });
    }
  });

  test('TC_RPT_008 usage-based asset report lists readings', async ({ page }) => {
    test.setTimeout(150000);
    await gotoProtected(page, `${BASE}/reports/usage-based-asset`);
    const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
    const title = page.getByText('Usage-Based Asset Report', { exact: true }).first();
    await expect(unauthorized.or(title).first()).toBeVisible({ timeout: 45000 });
    if (await unauthorized.isVisible().catch(() => false)) {
      noteInaccessible('Usage-Based Asset Report');
      return;
    }
    await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Usage Counter').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_009 SLA report lists vendor SLA rows', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/sla-report', 'SLA Reports');
    if (!opened) {
      noteInaccessible('SLA Reports');
      return;
    }
    await expect(page.getByText('SLA Description').first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });

  test('TC_RPT_010 QA audit report shows date and asset type filters', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/qa-audit-report', /QA.*Audit/);
    if (!opened) {
      noteInaccessible('QA Audit Report');
      return;
    }
    await expect(page.getByText('Date Range').first()).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await generateReportFile(page);
  });

  test('TC_RPT_011 spare parts report shows stock columns', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openReport(page, '/reports/spare-parts-report', 'Spare Parts Report');
    if (!opened) {
      noteInaccessible('Spare Parts Report');
      return;
    }
    await expect(page.getByText(/Part|On Hand|Quantity/i).first()).toBeVisible();
    await expectPreviewOrEmpty(page);
    await generateReportFile(page);
  });
});
