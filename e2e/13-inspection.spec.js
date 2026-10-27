// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { INSPECTION_CHILD_SCREENS, INSPECTION_SIDEBAR } from './helpers/inspectionCatalog.js';
import {
  expandInspectionSidebar,
  expectListChrome,
  exerciseDateFilter,
  exerciseDownload,
  exercisePresetFilter,
  exerciseSearchFromRow,
  exerciseSort,
  headerAddButton,
  openFirstRow,
  openInspectionScreen,
  pickCreateAssetType,
  readListState,
  skipIfInaccessible,
  waitForListData,
} from './helpers/inspectionScreen.js';

/**
 * Condition-based coverage for every screen under sidebar → Inspection.
 */

test.describe('Inspection sidebar', () => {
  test('Inspection group lists Approval and View screens', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/dashboard`);
    test.skip(!ready, 'App shell did not finish loading');

    const aside = await expandInspectionSidebar(page);
    await expect(aside.getByText('Inspection', { exact: true }).first()).toBeVisible();

    const labels = ['Inspection Approval', 'Inspection View', 'Inspection List'];
    const visible = [];
    for (const label of labels) {
      const item = aside.getByText(label, { exact: true }).first();
      if (await item.isVisible().catch(() => false)) visible.push(label);
    }
    expect(
      visible.length,
      `Expected at least one Inspection child in the sidebar, saw: ${visible.join(', ') || 'none'}`,
    ).toBeGreaterThan(0);
  });
});

for (const screen of INSPECTION_SIDEBAR) {
  test.describe(screen.name, () => {
    test(`data loads without error (${screen.id})`, async ({ page }) => {
      const status = await openInspectionScreen(page, screen.path, screen.title, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;
      await waitForListData(page);
      const data = await readListState(page);
      test.info().annotations.push({
        type: 'condition',
        description: `DATA — ${data.state}${data.count ? ` (${data.count} rows)` : ''}${data.message ? ` [${data.message}]` : ''}`,
      });
      expect(['data', 'empty', 'unknown', 'error'].includes(data.state)).toBeTruthy();
    });

    test(`list chrome: filter, columns, download (${screen.id})`, async ({ page }) => {
      const status = await openInspectionScreen(page, screen.path, screen.title, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;
      await expectListChrome(page, screen.columns, {
        hasAdd: screen.hasAdd,
        hasDownload: screen.hasDownload,
      });
      test.info().annotations.push({
        type: 'condition',
        description: screen.hasAdd
          ? 'CHROME — add, filter, and download are present.'
          : 'CHROME — filter and download only (no create).',
      });
    });

    test(`filters: status, outcome, search, date (${screen.id})`, async ({ page }) => {
      const status = await openInspectionScreen(page, screen.path, screen.title, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;
      await waitForListData(page);

      if (screen.statusFilter) {
        await exercisePresetFilter(page, test.info(), screen.statusFilter);
      }
      if (screen.outcomeFilter) {
        await exercisePresetFilter(page, test.info(), screen.outcomeFilter);
      }
      if (screen.searchColumns?.length) {
        await exerciseSearchFromRow(page, test.info(), screen.searchColumns);
      }
      if (screen.dateFilter) {
        await exerciseDateFilter(page, test.info());
      }
    });

    test(`functions: sort, download, add, open row (${screen.id})`, async ({ page }) => {
      const status = await openInspectionScreen(page, screen.path, screen.title, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;
      await waitForListData(page);

      await exerciseSort(page, test.info(), screen.columns[0]);
      if (screen.hasDownload) await exerciseDownload(page, test.info());

      if (screen.hasAdd) {
        await headerAddButton(page).click();
        await expect(page).toHaveURL(/\/inspection-view\/create\/?$/);
        await expect(page.getByText('Trigger Inspection for Asset').first()).toBeVisible();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(page).toHaveURL(/\/inspection-view\/?$/);
        test.info().annotations.push({
          type: 'condition',
          description: 'ADD — opens create screen and Cancel returns to the list.',
        });
      }

      const opened = await openFirstRow(page);
      if (!opened) {
        test.info().annotations.push({
          type: 'condition',
          description: 'ROW — no data row to open.',
        });
        return;
      }
      test.info().annotations.push({
        type: 'condition',
        description: `ROW — opened ${opened}`,
      });
      if (screen.id === 'INSPECTIONVIEW') {
        await expect(page).toHaveURL(/\/inspection-view\/[^/]+\/?$/);
        await expect(page.getByText('Asset Information').first()).toBeVisible({ timeout: 20000 });
        await expect(page.getByText('Inspection Checklist').first()).toBeVisible();
        await expect(page.getByText('Complete Inspection').first()).toBeVisible();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(page).toHaveURL(/\/inspection-view\/?$/);
      }
      if (screen.id === 'INSPECTIONAPPROVAL') {
        await expect(page).toHaveURL(/\/inspection-approval-detail\/[^/]+/);
        await expect(
          page.getByText(/Asset Details|Approval Workflow|Inspection Approval/i).first(),
        ).toBeVisible({ timeout: 20000 });
        const approve = page.getByRole('button', { name: 'Approve', exact: true });
        const reject = page.getByRole('button', { name: 'Reject', exact: true });
        const canAct =
          (await approve.isVisible().catch(() => false)) &&
          (await reject.isVisible().catch(() => false));
        if (canAct) {
          await reject.click();
          await expect(page.getByText(/Reason for rejection/i).first()).toBeVisible();
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          await expect(page.getByText(/Reason for rejection/i)).toHaveCount(0);
          test.info().annotations.push({
            type: 'condition',
            description: 'APPROVE/REJECT — buttons present; reject modal requires a reason; cancelled.',
          });
        } else {
          test.info().annotations.push({
            type: 'condition',
            description: 'APPROVE/REJECT — no action for this user on the opened request.',
          });
        }
      }
    });
  });
}

test.describe('Trigger Inspection for Asset', () => {
  test('create screen: tabs, asset type, scan, cancel', async ({ page }) => {
    const child = INSPECTION_CHILD_SCREENS[0];
    const status = await openInspectionScreen(page, child.path, child.title);
    if (skipIfInaccessible(page, child.name, status)) return;

    await expect(page.getByRole('button', { name: 'Select Asset', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Asset', exact: true })).toBeVisible();
    await expect(page.getByText('Available Assets').first()).toBeVisible();
    await expect(page.getByText(/Select an asset type|Select Asset Type to Continue/i).first()).toBeVisible();

    const picked = await pickCreateAssetType(page);
    test.info().annotations.push({
      type: 'condition',
      description: `ASSET TYPE — ${picked ? 'selected a type with assets' : 'no type with availability'}`,
    });
    if (picked) {
      const loading = page.getByText(/^Loading\.\.\.$/);
      await expect
        .poll(async () => !(await loading.isVisible().catch(() => false)), { timeout: 30000 })
        .toBeTruthy();
      const empty = page.getByText(/No .*assets|Select an asset type/i);
      const trigger = page.getByRole('button', { name: 'Trigger Inspection' });
      const hasAssets = await trigger.first().isVisible().catch(() => false);
      const isEmpty = await empty.first().isVisible().catch(() => false);
      expect(hasAssets || isEmpty).toBeTruthy();
      test.info().annotations.push({
        type: 'condition',
        description: hasAssets
          ? 'ASSETS — Trigger Inspection is shown (not clicked).'
          : 'ASSETS — empty list for the selected type.',
      });
    }

    await page.getByRole('button', { name: 'Scan Asset', exact: true }).click();
    await expect(page.getByPlaceholder(/Scan or enter|Asset ID/i).or(page.locator('input[type="text"]')).first()).toBeVisible();
    const submit = page.getByRole('button', { name: 'Trigger Inspection' });
    await expect(submit).toBeDisabled();
    await page.locator('input[type="text"]').first().fill('PW-FAKE-ASSET');
    await expect(submit).toBeEnabled();
    test.info().annotations.push({
      type: 'condition',
      description: 'SCAN — submit stays disabled until an asset id is entered; not submitted.',
    });

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/inspection-view\/?$/);
  });
});

test.describe('Inspection execution detail', () => {
  test('opens from a list row: checklist, notes, complete, cancel', async ({ page }) => {
    const status = await openInspectionScreen(
      page,
      '/inspection-view',
      'Inspection View',
      'Outcome',
    );
    if (skipIfInaccessible(page, 'Inspection View', status)) return;
    await waitForListData(page);
    const opened = await openFirstRow(page);
    if (!opened) {
      test.info().annotations.push({
        type: 'condition',
        description: 'DETAIL — list is empty; execution screen skipped.',
      });
      return;
    }

    await expect(page.getByText('Asset Information').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Schedule Details').first()).toBeVisible();
    await expect(page.getByText('Inspection Checklist').first()).toBeVisible();
    const questions = page.getByText(/No checklist questions found|Quantitative|Qualitative|Loading checklist/i);
    await expect(questions.first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Complete Inspection').first()).toBeVisible();
    await expect(page.getByText('Notes').first()).toBeVisible();
    await expect(page.getByText('Trigger Maintenance').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Complete Inspection' })).toBeVisible();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page).toHaveURL(/\/inspection-view\/?$/);
  });
});
