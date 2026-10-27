// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { CONSUMABLES_SIDEBAR } from './helpers/consumablesCatalog.js';
import {
  columnTexts,
  dataRows,
  expandConsumablesSidebar,
  isInvalid,
  openConsumablesScreen,
  readConsumablesState,
  realSelectLabels,
  skipIfInaccessible,
  toolbarSelect,
  waitForConsumablesReady,
} from './helpers/consumablesScreen.js';
/**
 * Condition-based coverage for every screen under sidebar → Consumables.
 * Add / Restock / Allocate / Delete are opened and validated, never committed.
 */

test.describe('Consumables sidebar', () => {
  test('Consumables group lists master, inventory, and usage', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/dashboard`);
    test.skip(!ready, 'App shell did not finish loading');

    const aside = await expandConsumablesSidebar(page);
    await expect(aside.getByText('Consumables', { exact: true }).first()).toBeVisible();

    const labels = CONSUMABLES_SIDEBAR.map((s) => s.sidebar);
    const visible = [];
    for (const label of labels) {
      const item = aside.getByText(label, { exact: true }).first();
      if (await item.isVisible().catch(() => false)) visible.push(label);
    }
    expect(
      visible.length,
      `Expected at least one Consumables child, saw: ${visible.join(', ') || 'none'}`,
    ).toBeGreaterThan(0);
  });
});

test.describe('Consumables master', () => {
  const screen = CONSUMABLES_SIDEBAR[0];

  test('data loads, stats, columns, UOM and stock filters', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    for (const label of screen.stats) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const col of screen.columns) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }
    await expect(page.getByPlaceholder('Search…')).toBeVisible();

    const data = await readConsumablesState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();

    const uom = toolbarSelect(page, 'Filter by UOM');
    await expect(uom).toBeVisible();
    const uoms = await realSelectLabels(uom);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER UOM — ${uoms.length ? uoms.join(', ') : 'All UOMs only'}`,
    });
    if (uoms.length) {
      await uom.selectOption({ label: uoms[0] });
      const cells = await columnTexts(page, 2);
      if (cells.length) {
        for (const cell of cells) {
          expect(cell, `UOM cell after filter ${uoms[0]}`).toContain(uoms[0]);
        }
      } else {
        await expect(page.getByText('No matching records')).toBeVisible();
      }
      await uom.selectOption({ label: 'All UOMs' });
    }

    const withStock = page.getByRole('button', { name: /With stock/i }).first();
    await withStock.click();
    const afterStock = await readConsumablesState(page, screen.empty);
    if (afterStock.state === 'data') {
      const stockCells = await columnTexts(page, 4);
      for (const cell of stockCells) {
        expect(cell.toLowerCase(), 'With stock still shows No stock').not.toContain('no stock');
      }
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER With stock — ${stockCells.length} rows, all have entries.`,
      });
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER With stock — ${afterStock.state}`,
      });
    }
    await page.getByRole('button', { name: /Total items/i }).first().click();

    if (data.state === 'data') {
      const name = ((await dataRows(page).first().locator('td').first().innerText()) || '')
        .split('\n')
        .pop()
        .trim();
      if (name) {
        await page.getByPlaceholder('Search…').fill(name);
        const found = await columnTexts(page, 1);
        expect(found.length).toBeGreaterThan(0);
        for (const cell of found) {
          expect(cell.toLowerCase()).toContain(name.toLowerCase());
        }
        await page.getByRole('button', { name: 'Clear search' }).click();
        test.info().annotations.push({
          type: 'condition',
          description: `SEARCH "${name}" — ${found.length} matching rows.`,
        });
      }
    }
  });

  test('add form required fields; edit/delete cancelled', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    const add = page.getByRole('button', { name: 'Add consumable' }).first();
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'ADD — no edit access; form not opened.',
      });
      return;
    }

    await add.click();
    const drawer = page.getByRole('heading', { name: 'Add consumable', exact: true });
    await expect(drawer).toBeVisible();
    const form = page.locator('form').last();
    await expect(form.locator('label').filter({ hasText: /^Consumable/ })).toBeVisible();
    await expect(form.locator('label').filter({ hasText: /^Unit of measure/ })).toBeVisible();
    await expect(form.locator('label').filter({ hasText: /^Branch/ })).toBeVisible();

    await form.getByRole('button', { name: 'Add consumable' }).click();
    expect(await isInvalid(page.getByPlaceholder('e.g. Tissue Paper'))).toBeTruthy();
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD — HTML5 required blocked empty submit; nothing saved.',
    });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(drawer).toHaveCount(0);

    const edit = page.getByRole('button', { name: 'Edit' }).first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByRole('heading', { name: /^Edit / })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      test.info().annotations.push({
        type: 'condition',
        description: 'EDIT — drawer opened and cancelled.',
      });
    }

    const del = page.getByRole('button', { name: 'Delete' }).first();
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await expect(page.getByRole('heading', { name: 'Delete consumable' })).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Delete consumable' })).toHaveCount(0);
      test.info().annotations.push({
        type: 'condition',
        description: 'DELETE — confirm opened and cancelled; nothing deleted.',
      });
    }
  });
});

test.describe('Consumables inventory', () => {
  const screen = CONSUMABLES_SIDEBAR[1];

  test('data loads, status/branch filters, search', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    for (const label of screen.stats) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const col of screen.columns) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }

    const data = await readConsumablesState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });

    const statusSelect = toolbarSelect(page, 'Filter by status');
    await expect(statusSelect).toBeVisible();
    const statuses = await realSelectLabels(statusSelect);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER status — ${statuses.join(', ') || 'All statuses only'}`,
    });
    if (statuses.length) {
      await statusSelect.selectOption({ label: statuses[0] });
      const cells = await columnTexts(page, 7);
      if (cells.length) {
        for (const cell of cells) {
          expect(cell, `Status after ${statuses[0]}`).toContain(statuses[0]);
        }
      } else {
        await expect(page.getByText('No matching records')).toBeVisible();
      }
      await statusSelect.selectOption({ label: 'All statuses' });
    }

    const branch = toolbarSelect(page, 'Filter by branch');
    if (await branch.isVisible().catch(() => false)) {
      const branches = await realSelectLabels(branch);
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER branch — ${branches.join(', ') || 'hidden (one branch)'}`,
      });
      if (branches.length) {
        await branch.selectOption({ label: branches[0] });
        const cells = await columnTexts(page, 2);
        if (cells.length) {
          for (const cell of cells) {
            expect(cell, `Branch after ${branches[0]}`).toContain(branches[0]);
          }
        } else {
          await expect(page.getByText('No matching records')).toBeVisible();
        }
        await branch.selectOption({ label: 'All branches' });
      }
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'FILTER branch — not shown (fewer than two branches).',
      });
    }

    await page.getByRole('button', { name: /Out of stock/i }).first().click();
    const afterOut = await readConsumablesState(page, screen.empty);
    if (afterOut.state === 'data') {
      const statusCells = await columnTexts(page, 7);
      for (const cell of statusCells) {
        expect(cell).toContain('Out of stock');
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `STAT Out of stock — ${afterOut.state}${afterOut.count ? ` (${afterOut.count})` : ''}`,
    });
    await page.getByRole('button', { name: /Stock entries/i }).first().click();
  });

  test('add stock validation, history drawer, refresh — no save', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    await page.getByRole('button', { name: 'Refresh' }).click();
    await waitForConsumablesReady(page, screen.readyText);

    const add = page.getByRole('button', { name: 'Add stock' }).first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await expect(page.getByRole('heading', { name: /Add stock|Restock/ })).toBeVisible();
      await expect(page.getByText('Consumable', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Brand', { exact: true })).toBeVisible();
      await page.locator('form').getByRole('button', { name: /Add stock|Restock/ }).click();
      const consumable = page.locator('form select').first();
      expect(await isInvalid(consumable)).toBeTruthy();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      test.info().annotations.push({
        type: 'condition',
        description: 'ADD STOCK — required blocked empty submit; nothing saved.',
      });
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'ADD STOCK — no edit access.',
      });
    }

    const history = page.getByRole('button', { name: 'Stock history' }).first();
    if (await history.isVisible().catch(() => false)) {
      await history.click();
      await expect(page.getByText('On hand now', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'All', exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Restocks', exact: true }).click();
      await page.getByRole('button', { name: 'Allocations', exact: true }).click();
      await page.getByRole('button', { name: 'Adjustments', exact: true }).click();
      const loading = page.getByText('Loading history…');
      await expect
        .poll(async () => !(await loading.isVisible().catch(() => false)), { timeout: 20000 })
        .toBeTruthy();
      const emptyHist = page.getByText('No movements to show.');
      const failed = page.getByText(/Failed to load stock history/i);
      const movement = page.getByText(/Opening stock|Restocked|Allocated|Adjusted/i);
      const histState = (await failed.isVisible().catch(() => false))
        ? 'error'
        : (await emptyHist.isVisible().catch(() => false))
          ? 'empty'
          : (await movement.first().isVisible().catch(() => false))
            ? 'data'
            : 'unknown';
      test.info().annotations.push({
        type: 'condition',
        description: `HISTORY — ${histState}; closed without changes.`,
      });
      await page.keyboard.press('Escape');
      await expect(page.getByText('On hand now')).toHaveCount(0);
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'HISTORY — no stock rows to open.',
      });
    }
  });
});

test.describe('Consumables usage', () => {
  const screen = CONSUMABLES_SIDEBAR[2];

  test('data loads, department/consumable/month filters', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    for (const label of screen.stats) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    for (const col of screen.columns) {
      await expect(page.getByRole('columnheader', { name: col })).toBeVisible();
    }

    const data = await readConsumablesState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });

    const dept = toolbarSelect(page, 'Filter by department');
    await expect(dept).toBeVisible();
    const depts = await realSelectLabels(dept);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER department — ${depts.length ? depts.join(', ') : 'All departments only'}`,
    });
    if (depts.length) {
      await dept.selectOption({ label: depts[0] });
      const cells = await columnTexts(page, 2);
      if (cells.length) {
        for (const cell of cells) {
          expect(cell, `Department after ${depts[0]}`).toContain(depts[0]);
        }
      } else {
        await expect(page.getByText('No matching records')).toBeVisible();
      }
      await dept.selectOption({ label: 'All departments' });
    }

    const item = toolbarSelect(page, 'Filter by consumable');
    const items = await realSelectLabels(item);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER consumable — ${items.length ? items.join(', ') : 'All consumables only'}`,
    });
    if (items.length) {
      await item.selectOption({ label: items[0] });
      const cells = await columnTexts(page, 1);
      if (cells.length) {
        for (const cell of cells) {
          expect(cell, `Consumable after ${items[0]}`).toContain(items[0]);
        }
      } else {
        await expect(page.getByText('No matching records')).toBeVisible();
      }
      await item.selectOption({ label: 'All consumables' });
    }

    await page.getByRole('button', { name: /This month/i }).first().click();
    const month = await readConsumablesState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `STAT This month — ${month.state}${month.count ? ` (${month.count})` : ''}`,
    });
    await page.getByRole('button', { name: /Allocations/i }).first().click();
  });

  test('allocate form required fields; cancel — no save', async ({ page }) => {
    const status = await openConsumablesScreen(page, screen.path, screen.title, screen.readyText);
    if (skipIfInaccessible(page, screen.name, status)) return;

    const allocate = page.getByRole('button', { name: 'Allocate', exact: true }).first();
    if (!(await allocate.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'ALLOCATE — no edit access.',
      });
      return;
    }

    await allocate.click();
    await expect(page.getByRole('heading', { name: 'Allocate to department' })).toBeVisible();
    const form = page.locator('form').last();
    await expect(form.locator('label').filter({ hasText: /^Consumable/ })).toBeVisible();
    await expect(form.locator('label').filter({ hasText: /^Item/ })).toBeVisible();
    await expect(form.locator('label').filter({ hasText: /^Department/ })).toBeVisible();

    await form.getByRole('button', { name: 'Allocate', exact: true }).click();
    expect(await isInvalid(form.locator('select').first())).toBeTruthy();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Allocate to department' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ALLOCATE — required blocked empty submit; nothing saved.',
    });
  });
});
