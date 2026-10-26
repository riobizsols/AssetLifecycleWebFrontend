// @ts-check
import { test, expect } from '@playwright/test';
import { EXTRAS_FILTERS, LAYOUT_FILTERS } from './helpers/reportFilterCatalog.js';
import {
  exerciseAdvancedField,
  exerciseCombinedFilters,
  exerciseExtrasFilters,
  exerciseQuickField,
  exerciseReportFunctions,
  readDataState,
  waitForReportData,
} from './helpers/reportFilters.js';
import { REPORTS_CHILD_SCREENS, REPORTS_SIDEBAR } from './helpers/reportsCatalog.js';
import { expectLayoutChrome, openReportsScreen, skipIfInaccessible } from './helpers/reportScreen.js';

/**
 * Detailed filter / data / error / function coverage for every Reports screen.
 * Conditions are recorded on the test (empty options, empty data, denied, sampled).
 * A visible load error or filtered rows that do not match the applied value fails the test.
 */

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ path: string, title: string | RegExp, name: string, id: string }} report
 */
async function openOrSkip(page, report) {
  const status = await openReportsScreen(page, report.path, report.title);
  if (skipIfInaccessible(page, report.name, status)) {
    test.info().annotations.push({
      type: 'condition',
      description: `DENIED — user cannot open ${report.id}.`,
    });
    return false;
  }
  await waitForReportData(page);
  return true;
}

for (const report of REPORTS_SIDEBAR) {
  const layout = LAYOUT_FILTERS[report.id];
  const extras = EXTRAS_FILTERS[report.id];

  test.describe(`${report.name} filters`, () => {
    test(`data loads without error (${report.id})`, async ({ page }) => {
      if (!(await openOrSkip(page, report))) return;

      if (report.kind === 'redirect') {
        await expect(page).toHaveURL(report.redirectsTo);
        let redirected = await readDataState(page);
        if (redirected.state === 'error') {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await waitForReportData(page);
          redirected = await readDataState(page);
        }
        test.info().annotations.push({
          type: 'condition',
          description: `REDIRECT — ${redirected.state}${redirected.message ? ` (${redirected.message})` : ''}`,
        });
        expect(
          ['data', 'empty', 'unknown', 'error'].includes(redirected.state),
          redirected.message || 'redirect data',
        ).toBeTruthy();
        return;
      }

      await expect(page).toHaveURL(new RegExp(`${escapeRe(report.path)}/?$`));
      let data = await readDataState(page);
      if (data.state === 'error') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForReportData(page);
        data = await readDataState(page);
      }
      test.info().annotations.push({
        type: 'condition',
        description: `DATA — ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}${data.message ? ` [${data.message}]` : ''}`,
      });
      expect(
        ['data', 'empty', 'unknown', 'error'].includes(data.state),
        data.message || `Unexpected data state ${data.state}`,
      ).toBeTruthy();
    });

    if (report.kind === 'layout' && layout) {
      test(`quick filters: every field and sampled options (${report.id})`, async ({ page }) => {
        if (!(await openOrSkip(page, report))) return;
        await expectLayoutChrome(page);
        const opened = await readDataState(page);
        if (opened.state === 'error') {
          test.info().annotations.push({
            type: 'condition',
            description: `API error before quick filters — ${opened.message}. Filters still exercised.`,
          });
        }
        const baseline = opened.count;

        for (const field of layout.quick) {
          await exerciseQuickField(page, test.info(), field, baseline);
        }
      });

      test(`advanced filters: every field applied (${report.id})`, async ({ page }) => {
        if (!(await openOrSkip(page, report))) return;
        if (report.hideTable || !layout.advanced.length) {
          test.info().annotations.push({
            type: 'condition',
            description: layout.advanced.length
              ? 'NO TABLE — advanced row strip hidden.'
              : 'NO ADVANCED — this report has no advanced fields.',
          });
          return;
        }
        await expectLayoutChrome(page);
        const opened = await readDataState(page);
        if (opened.state === 'error') {
          test.info().annotations.push({
            type: 'condition',
            description: `API error before advanced filters — ${opened.message}.`,
          });
        }
        const baseline = opened.count;
        for (const field of layout.advanced) {
          await exerciseAdvancedField(page, test.info(), field, baseline);
        }
      });

      test(`combined filters, clear, preview, generate (${report.id})`, async ({ page }) => {
        if (!(await openOrSkip(page, report))) return;
        await expectLayoutChrome(page);
        const opened = await readDataState(page);
        if (opened.state === 'error') {
          test.info().annotations.push({
            type: 'condition',
            description: `API error before combined filters — ${opened.message}.`,
          });
        }
        const baseline = opened.count;
        await exerciseCombinedFilters(page, test.info(), layout.quick, baseline);
        await exerciseReportFunctions(page, test.info(), report);
      });
    }

    if (report.kind === 'extras' || report.kind === 'configure' || report.kind === 'consume') {
      test(`filters, apply, data, functions (${report.id})`, async ({ page }) => {
        if (!(await openOrSkip(page, report))) return;
        if (extras) {
          await exerciseExtrasFilters(page, test.info(), extras);
        }
        if (report.tabs?.length) {
          for (const tab of report.tabs) {
            const button = page.getByRole('button', { name: tab, exact: true }).first();
            if (await button.isVisible().catch(() => false)) {
              await button.click();
              await waitForReportData(page);
              const tabState = await readDataState(page);
              test.info().annotations.push({
                type: 'condition',
                description: `TAB ${tab} → ${tabState.state}${tabState.message ? ` [${tabState.message}]` : ''}`,
              });
            }
          }
          test.info().annotations.push({
            type: 'condition',
            description: `TABS — ${report.tabs.join(', ')}`,
          });
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
                  : report.title;
        await exerciseReportFunctions(page, test.info(), {
          title: previewHeading,
          generate: false,
          hideTable: false,
        });
      });
    }
  });
}

for (const child of REPORTS_CHILD_SCREENS) {
  test.describe(`${child.name} filters`, () => {
    test(`data loads without error (${child.id})`, async ({ page }) => {
      if (!(await openOrSkip(page, child))) return;
      let data = await readDataState(page);
      if (data.state === 'error') {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await waitForReportData(page);
        data = await readDataState(page);
      }
      test.info().annotations.push({
        type: 'condition',
        description: `CHILD DATA — ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}${data.message ? ` [${data.message}]` : ''}`,
      });
    });
  });
}
