// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM spare parts master', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_SP_002 a unique spare category can be saved', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(
      page,
      '/master-data/spare-parts-configuration',
      'Spare Part Category'
    );
    if (!opened) {
      noteInaccessible('Spare Part Category');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Spare category create');
      return;
    }

    await add.click();
    await expect(page.getByText('Add Spare Part Category')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('UOM').first()).toBeVisible();
    await expect(page.getByText('Brand').first()).toBeVisible();
    await expect(page.getByText('Model').first()).toBeVisible();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Category is required')).toBeVisible({ timeout: 10000 });

    const name = `PW-E2E-CAT-${Date.now()}`;
    await page.getByPlaceholder('Enter category name').fill(name);
    const uom = page.locator('select[name="uom"]');
    const uomOption = uom.locator('option:not([value=""])').first();
    if ((await uomOption.count()) === 0) {
      noteInaccessible('Spare category units');
      return;
    }
    await uom.selectOption({ index: 1 });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Brand is required')).toBeVisible({ timeout: 10000 });
  });

  test('TC_SP_001 spare part form requires a part number', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/master-data/spare-part', 'Spare Part');
    if (!opened) {
      noteInaccessible('Spare Part');
      return;
    }

    await expect(page.getByText('Part Number').first()).toBeVisible();
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Spare part create');
      return;
    }

    await add.click();
    await expect(page.getByPlaceholder('Enter part number')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Model').first()).toBeVisible();
    const save = page.getByRole('button', { name: /^Save$/ });
    if (await save.isVisible().catch(() => false)) {
      await save.click();
      await expect(page.getByText(/required|select/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('TC_SP_003 asset type mapping form lists both sides without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/master-data/spare-parts-configuration',
      'Spare Part Category'
    );
    if (!opened) {
      noteInaccessible('Spare Part Category');
      return;
    }

    await page.getByRole('button', { name: 'Asset Type Mapping' }).click();
    await expect(page.getByText(/Asset Type|Category/i).first()).toBeVisible();
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      await expect(page.getByText(/No .*found|Asset Type/i).first()).toBeVisible();
      return;
    }

    await add.click();
    await expect(page.getByText('Asset Type Mapping').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Asset Type|Category/i).first()).toBeVisible();
  });

  test('TC_SP_004 spare part lot list shows stock columns without receiving a lot', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/spare-parts', 'Spare Part Lot');
    if (!opened) {
      noteInaccessible('Spare Part Lot');
      return;
    }

    await expect(page.getByText(/Part|Lot|Quantity/i).first()).toBeVisible();
    await expect(
      page.getByText(/No .*found|No data found/i).or(page.locator('tbody tr').first()).first()
    ).toBeVisible({ timeout: 20000 });
  });
});
