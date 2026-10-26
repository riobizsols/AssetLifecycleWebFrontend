// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import {
  expandUtilitiesSidebar,
  openUtilityScreen,
  readUtilityState,
  skipIfInaccessible,
  utilityField,
  utilityPanel,
  waitForUtilityReady,
} from './helpers/utilityScreen.js';
import { clickUnblocked, toastMessage } from './helpers/screenAccess.js';

/**
 * Condition-based coverage for every screen under sidebar → Utilities.
 * Create / Map / Save / Delete are validated (required fields) but not committed.
 */

test.describe('Utilities sidebar', () => {
  test('Utilities group lists master, mapping, and record screens', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/dashboard`);
    test.skip(!ready, 'App shell did not finish loading');

    const aside = await expandUtilitiesSidebar(page);
    await expect(aside.getByText('Utilities', { exact: true }).first()).toBeVisible();

    const labels = [
      'Utility Master',
      'Utility – Asset Type Mapping',
      'Record Consumption',
    ];
    const visible = [];
    for (const label of labels) {
      const item = aside.getByText(label, { exact: true }).first();
      if (await item.isVisible().catch(() => false)) visible.push(label);
    }
    expect(
      visible.length,
      `Expected at least one Utilities child, saw: ${visible.join(', ') || 'none'}`,
    ).toBeGreaterThan(0);
  });
});

test.describe('Utility Master', () => {
  test('data loads, create form, editor or empty', async ({ page }) => {
    const status = await openUtilityScreen(page, '/utilities/master', 'Utility Master');
    if (skipIfInaccessible(page, 'Utility Master', status)) return;

    const data = await readUtilityState(page);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.message ? ` [${data.message}]` : ''}`,
    });
    expect(['data', 'empty', 'error'].includes(data.state)).toBeTruthy();

    const create = utilityPanel(page, 'Create utility');
    await expect(create).toBeVisible();
    await expect(utilityField(create, 'Utility name')).toBeVisible();
    await expect(utilityField(create, 'Default UOM')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible();

    const emptyHint = page.getByText('Create a utility above to manage consumption metrics.');
    const editor = utilityPanel(page, 'Consumption metric');
    const hasEditor = await editor.isVisible().catch(() => false);
    const hasEmpty = await emptyHint.isVisible().catch(() => false);
    expect(hasEditor || hasEmpty).toBeTruthy();
  });

  test('create validates name and UOM; does not save', async ({ page }) => {
    const status = await openUtilityScreen(page, '/utilities/master', 'Utility Master');
    if (skipIfInaccessible(page, 'Utility Master', status)) return;

    await clickUnblocked(page, 'Create');
    await expect(toastMessage(page, 'Utility name is required')).toBeVisible({ timeout: 10000 });

    const create = utilityPanel(page, 'Create utility');
    await create.locator('input').first().fill('PW-UTIL-SKIP');
    await clickUnblocked(page, 'Create');
    await expect(toastMessage(page, 'Default UOM is required')).toBeVisible({ timeout: 10000 });
    test.info().annotations.push({
      type: 'condition',
      description: 'CREATE — name and UOM required toasts; utility was not created.',
    });
  });

  test('existing utility: switch name, table columns, add-profile chrome', async ({ page }) => {
    const status = await openUtilityScreen(page, '/utilities/master', 'Utility Master');
    if (skipIfInaccessible(page, 'Utility Master', status)) return;

    const editor = utilityPanel(page, 'Consumption metric');
    if (!(await editor.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'EDITOR — no utilities yet; skip switch/table.',
      });
      return;
    }

    await expect(page.getByRole('columnheader', { name: /Name/ })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Type', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'UOM', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frequency', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maximum Reading', exact: true })).toBeVisible();

    const openList = page.getByRole('button', { name: 'Open utility list' });
    await openList.click();
    const options = page.getByRole('listbox').getByRole('option');
    const count = await options.count();
    test.info().annotations.push({
      type: 'condition',
      description: `UTILITIES — ${count} in the name list.`,
    });
    if (count > 1) {
      await options.nth(1).getByRole('button').click();
      await waitForUtilityReady(page);
      await expect(editor).toBeVisible();
    } else {
      await page.keyboard.press('Escape').catch(() => {});
    }

    const profilesEmpty = page.getByText('No measurement profiles yet');
    const editBtn = page.getByRole('button', { name: 'Edit' }).first();
    const hasRows = await editBtn.isVisible().catch(() => false);
    const empty = await profilesEmpty.isVisible().catch(() => false);
    expect(hasRows || empty).toBeTruthy();

    if (hasRows) {
      await editBtn.click();
      await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      test.info().annotations.push({
        type: 'condition',
        description: 'EDIT — row editor opened and cancelled; nothing saved.',
      });
    }

    await expect(page.getByRole('button', { name: 'Add profile' })).toBeVisible();
  });
});

test.describe('Utility – Asset Type Mapping', () => {
  test('create mapping chrome, filters, table data or empty', async ({ page }) => {
    const status = await openUtilityScreen(
      page,
      '/utilities/asset-type-mapping',
      'Utility – Asset Type Mapping',
    );
    if (skipIfInaccessible(page, 'Utility – Asset Type Mapping', status)) return;

    const data = await readUtilityState(page);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.message ? ` [${data.message}]` : ''}`,
    });

    const create = utilityPanel(page, 'Create mapping');
    await expect(create).toBeVisible();
    await expect(utilityField(create, 'Utility')).toBeVisible();
    await expect(utilityField(create, 'Choose consumption metric')).toBeVisible();
    await expect(utilityField(create, 'Asset type')).toBeVisible();
    const mapBtn = page.getByRole('button', { name: 'Map', exact: true });
    await expect(mapBtn).toBeVisible();

    const utilSelect = utilityField(create, 'Utility').locator('select');
    const metricSelect = utilityField(create, 'Choose consumption metric').locator('select');
    const utilOptions = await utilSelect.locator('option').allTextContents();
    const realUtils = utilOptions.map((o) => o.trim()).filter((o) => o && o !== 'Select utility');
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Utility — ${realUtils.length} options.`,
    });

    if (realUtils.length) {
      await utilSelect.selectOption({ label: realUtils[0] });
      const metricOpts = (await metricSelect.locator('option').allTextContents())
        .map((o) => o.trim())
        .filter(Boolean);
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER metric after ${realUtils[0]} — ${metricOpts.join(', ') || 'none'}`,
      });
    }

    const assetInput = page.getByPlaceholder(/Search or select asset type|No asset types/i);
    await expect(assetInput).toBeVisible();
    if (await assetInput.isEnabled()) {
      await assetInput.click();
      const list = page.getByRole('listbox', { name: 'Asset types' });
      await expect(list).toBeVisible({ timeout: 10000 });
      const items = list.getByRole('option');
      const n = await items.count();
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER asset type — ${n} options.`,
      });
      if (n > 0) {
        await items.first().getByRole('button').click();
      } else {
        await expect(page.getByText('No matches')).toBeVisible();
      }
    }

    await expect(utilityPanel(page, 'Active mappings')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Utility', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Consumption metric', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset type', exact: true })).toBeVisible();

    const empty = page.getByText('No mappings yet');
    const rows = page.locator('table tbody tr').filter({ hasNotText: 'No mappings yet' });
    const rowCount = await rows.count();
    if (rowCount > 0) {
      const firstUtil = ((await rows.first().locator('td').first().innerText()) || '').trim();
      expect(firstUtil.length).toBeGreaterThan(0);
      test.info().annotations.push({
        type: 'condition',
        description: `MAPPINGS — ${rowCount} rows (e.g. ${firstUtil}). Delete not clicked.`,
      });
    } else {
      await expect(empty).toBeVisible();
    }
  });
});

test.describe('Record Utility Consumption', () => {
  test('entry form, validation, recent-record filters', async ({ page }) => {
    const status = await openUtilityScreen(
      page,
      '/utilities/consumption',
      'Record Utility Consumption',
    );
    if (skipIfInaccessible(page, 'Record Consumption', status)) return;

    const data = await readUtilityState(page);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.message ? ` [${data.message}]` : ''}`,
    });

    const entry = utilityPanel(page, 'New consumption entry');
    await expect(entry).toBeVisible();
    await expect(utilityField(entry, 'Utility')).toBeVisible();
    await expect(utilityField(entry, 'Choose consumption metric')).toBeVisible();
    await expect(utilityField(entry, 'Asset')).toBeVisible();
    await expect(utilityField(entry, 'Consumption date')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save record' })).toBeVisible();

    const utilSelect = utilityField(entry, 'Utility').locator('select');
    const metricSelect = utilityField(entry, 'Choose consumption metric').locator('select');
    const utilOptions = (await utilSelect.locator('option').allTextContents())
      .map((o) => o.trim())
      .filter((o) => o && o !== 'Select utility');

    if (utilOptions.length) {
      await utilSelect.selectOption({ label: utilOptions[0] });
      const metrics = (await metricSelect.locator('option').allTextContents())
        .map((o) => o.trim())
        .filter((o) => o && !/Choose consumption|Select utility first/i.test(o));
      test.info().annotations.push({
        type: 'condition',
        description: `ENTRY utility=${utilOptions[0]} metrics=${metrics.join(', ') || 'none'}`,
      });
      if (metrics.length) {
        await metricSelect.selectOption({ index: 1 }).catch(() => metricSelect.selectOption({ label: metrics[0] }));
      }
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'ENTRY — no utilities configured.',
      });
    }

    const reading = page.getByPlaceholder('e.g. 250');
    const quantity = page.getByPlaceholder('e.g. 100');
    const meter = await reading.isVisible().catch(() => false);
    const qty = await quantity.isVisible().catch(() => false);
    expect(meter || qty || !utilOptions.length).toBeTruthy();

    const save = page.getByRole('button', { name: 'Save record' });
    if (await save.isEnabled()) {
      await clickUnblocked(page, 'Save record');
      await expect(
        toastMessage(page, /Meter reading is required|Quantity consumed is required|Utility is required|Consumption metric is required|Save failed/i),
      ).toBeVisible({ timeout: 10000 });
      test.info().annotations.push({
        type: 'condition',
        description: 'SAVE — required-field toast; record was not saved.',
      });
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'SAVE — button disabled until utility/metric exist.',
      });
    }

    const records = utilityPanel(page, 'Recent records');
    await expect(records).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Date', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Utility', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Reading', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Qty consumed', exact: true })).toBeVisible();

    const recUtil = utilityField(records, 'Utility').locator('select');
    const recNames = (await recUtil.locator('option').allTextContents())
      .map((o) => o.trim())
      .filter((o) => o && o !== 'All utilities');
    if (recNames.length) {
      await recUtil.selectOption({ label: recNames[0] });
      const cells = records.locator('table tbody tr td:nth-child(2)');
      const n = await cells.count();
      if (n > 0) {
        for (let i = 0; i < n; i += 1) {
          const text = await cells.nth(i).innerText();
          expect(text, `row ${i} utility`).toContain(recNames[0]);
        }
        test.info().annotations.push({
          type: 'condition',
          description: `FILTER records Utility="${recNames[0]}" → ${n} matching rows.`,
        });
      } else {
        await expect(page.getByText('No records match these filters')).toBeVisible();
        test.info().annotations.push({
          type: 'condition',
          description: `FILTER records Utility="${recNames[0]}" → no matching rows.`,
        });
      }
      await recUtil.selectOption({ label: 'All utilities' });
    }

    await utilityField(records, 'From date').locator('input[type="date"]').fill('2024-01-01');
    await utilityField(records, 'To date').locator('input[type="date"]').fill('2026-12-31');
    await utilityField(records, 'Date order').locator('select').selectOption('asc');
    await utilityField(records, 'Date order').locator('select').selectOption('desc');
    const after = await readUtilityState(page);
    test.info().annotations.push({
      type: 'condition',
      description: `DATE FILTER + order → ${after.state}`,
    });
  });
});

test.describe('Utilities report redirect', () => {
  test('/utilities/report opens Utility Consumption Report', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/utilities/report`);
    test.skip(!ready, 'App shell did not finish loading');
    await expect(page).toHaveURL(/\/reports\/utility-consumption\/?$/);
    const title = page.getByText('Utility Consumption Report', { exact: true }).first();
    const denied = page.getByText(/not authorized|Access Denied/i);
    const seen = await title
      .or(denied)
      .first()
      .waitFor({ state: 'visible', timeout: 45000 })
      .then(() => true)
      .catch(() => false);
    test.skip(!seen || (await denied.isVisible().catch(() => false)), 'Report not available');
    await expect(title).toBeVisible();
    test.info().annotations.push({
      type: 'condition',
      description: 'REDIRECT — /utilities/report lands on the Reports utility screen.',
    });
  });
});
