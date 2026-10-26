// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { REPORTS_CHILD_SCREENS, REPORTS_SIDEBAR } from './helpers/reportsCatalog.js';
import {
  expandReportsSidebar,
  expectLayoutChrome,
  expectPreviewOrEmpty,
  expectTabs,
  generateReportFile,
  openReportsScreen,
  previewIfEnabled,
  skipIfInaccessible,
} from './helpers/reportScreen.js';

/**
 * Condition-based coverage for every screen under sidebar → Reports.
 * Screens are independent so one denied/failing report does not skip the rest.
 */

test.describe('Reports sidebar', () => {
  test('Reports group is in the sidebar and lists report screens', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/dashboard`);
    test.skip(!ready, 'App shell did not finish loading');

    const aside = await expandReportsSidebar(page);
    await expect(aside.getByText('Reports', { exact: true }).first()).toBeVisible({ timeout: 20000 });

    const labels = [
      'Asset Lifecycle Report',
      'Asset Report',
      'Asset Valuation',
      'Breakdown History',
      'SLA Reports',
      'Audit Reports',
      'Stock & Purchase',
      'Consumables Report',
      'QA Audit Report',
      'Spare Parts Report',
    ];
    const visible = [];
    for (const label of labels) {
      const item = aside.getByText(label, { exact: true }).first();
      if (await item.isVisible().catch(() => false)) visible.push(label);
    }
    expect(
      visible.length,
      `Expected at least one Reports child in the sidebar, saw: ${visible.join(', ') || 'none'}`,
    ).toBeGreaterThan(0);
  });
});

for (const report of REPORTS_SIDEBAR) {
  test.describe(report.name, () => {
    test(`conditions: access, chrome, empty/data, preview, filters (${report.id})`, async ({
      page,
    }) => {
      const status = await openReportsScreen(page, report.path, report.title);
      if (skipIfInaccessible(page, report.name, status)) {
        test.info().annotations.push({
          type: 'condition',
          description: `DENIED — user cannot open ${report.id}. Remaining checks skipped.`,
        });
        return;
      }

      if (report.kind === 'redirect') {
        await expect(page).toHaveURL(report.redirectsTo);
        await expect(page.getByText(report.title, { exact: true }).first()).toBeVisible();
        await expect(page.getByText('Filters', { exact: true })).toBeVisible();
        test.info().annotations.push({
          type: 'condition',
          description: 'REDIRECT — Out of Stock now opens Stock & Purchase.',
        });
        return;
      }

      await expect(page).toHaveURL(new RegExp(`${escapeRe(report.path)}/?$`));

      if (report.kind === 'layout') {
        await expectLayoutChrome(page);
        if (report.generate) {
          await expect(page.getByRole('button', { name: 'Generate Report' })).toBeVisible();
        }
        if (report.hideTable) {
          test.info().annotations.push({
            type: 'condition',
            description: 'NO TABLE — filter/preview chrome only; row strip is hidden.',
          });
        } else {
          await expectPreviewOrEmpty(page);
        }

        if (report.childLink) {
          await expect(
            page.getByRole('link', { name: report.childLink, exact: false }).last(),
          ).toBeVisible();
        }

        if (!report.hideTable) {
          const preview = await previewIfEnabled(page, report.title);
          test.info().annotations.push({
            type: 'condition',
            description: `PREVIEW — ${preview}`,
          });
        }

        const hasFilters = await page.getByText(/^None$/).isVisible().catch(() => false);
        if (!hasFilters) {
          const clear = page.getByRole('button', { name: 'Clear' });
          if (await clear.isVisible().catch(() => false)) {
            await clear.click();
            await expect(page.getByText('Active Filters')).toBeVisible();
          }
        }

        if (report.generate) {
          await generateReportFile(page);
        }
      }

      if (report.kind === 'extras' || report.kind === 'configure' || report.kind === 'consume') {
        if (report.extraText) {
          await expect(page.getByText(report.extraText).first()).toBeVisible({ timeout: 30000 });
        }

        if (report.kind === 'configure') {
          const empty = page.getByText(/No report yet|Configure report|Select an institution/i);
          await expect(empty.first()).toBeVisible({ timeout: 20000 });
          test.info().annotations.push({
            type: 'condition',
            description: 'CONFIGURE — screen waits for period / type / View before rows load.',
          });
        }

        if (report.kind === 'extras') {
          const emptyOrData = page.getByText(
            /Select an institution|No .* for the selected|Assignments|Filters|Overview|Out of stock|SLA compliance/i,
          );
          await expect(emptyOrData.first()).toBeVisible({ timeout: 30000 });
        }

        if (report.tabs?.length) {
          await expectTabs(page, report.tabs);
        }

        const previewHeading =
          report.id === 'WORKFORCEREPORT'
            ? 'Workforce preview'
            : report.id === 'SLAVENDORPERFORMANCE'
              ? 'SLA & Vendor preview'
              : report.id === 'CONSOLIDATEDASSETREPORT'
                ? 'Asset register preview'
                : report.id === 'PURCHASEREQUIREMENTREPORT'
                  ? 'Preview'
                  : report.id === 'CONSUMABLESREPORT'
                    ? /Consumables/
                    : report.title;
        const preview = await previewIfEnabled(page, previewHeading);
        test.info().annotations.push({
          type: 'condition',
          description: `PREVIEW — ${preview}`,
        });
      }
    });
  });
}

for (const child of REPORTS_CHILD_SCREENS) {
  test.describe(child.name, () => {
    test(`child of ${child.parent}: opens from its own route`, async ({ page }) => {
      const status = await openReportsScreen(page, child.path, child.title);
      if (skipIfInaccessible(page, child.name, status)) return;
      await expect(page).toHaveURL(new RegExp(`${escapeRe(child.path)}/?$`));
    });
  });
}

/**
 * @param {string} value
 */
function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
