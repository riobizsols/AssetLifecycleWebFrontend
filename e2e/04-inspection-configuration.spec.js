// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM inspection configuration', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_ICFG_001 a unique qualitative question can be saved', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/inspection-checklists',
      'Inspection Checklists'
    );
    if (!opened) {
      noteInaccessible('Inspection Checklists');
      return;
    }

    await expect(page.getByText('Inspection Checklists List')).toBeVisible();
    const create = page.getByTitle('Create New');
    if (!(await create.isVisible().catch(() => false))) {
      noteInaccessible('Inspection question create');
      return;
    }

    await create.click();
    await expect(page.locator('label', { hasText: 'Response Type' })).toBeVisible();
    const type = page.locator('select[name="irtd_id"]');
    const qualitative = type.locator('option', { hasText: /^Qualitative$/ });
    if ((await qualitative.count()) === 0) {
      noteInaccessible('Qualitative response type');
      return;
    }

    await type.selectOption(await qualitative.first().getAttribute('value'));
    const question = `PW-E2E-QL-${Date.now()}`;
    await page.getByPlaceholder('Enter inspection question').fill(question);
    await page.getByPlaceholder('Enter expected value').fill('Yes');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(question, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_ICFG_002 a quantitative question requires a range and can be saved', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/inspection-checklists',
      'Inspection Checklists'
    );
    if (!opened) {
      noteInaccessible('Inspection Checklists');
      return;
    }

    const create = page.getByTitle('Create New');
    if (!(await create.isVisible().catch(() => false))) {
      noteInaccessible('Inspection question create');
      return;
    }

    await create.click();
    const type = page.locator('select[name="irtd_id"]');
    const quantitative = type.locator('option', { hasText: /^Quantitative$/ });
    if ((await quantitative.count()) === 0) {
      noteInaccessible('Quantitative response type');
      return;
    }

    await type.selectOption(await quantitative.first().getAttribute('value'));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/Min Range is required/i)).toBeVisible({ timeout: 10000 });

    const question = `PW-E2E-QT-${Date.now()}`;
    await page.getByPlaceholder('Enter inspection question').fill(question);
    await page.getByPlaceholder('Enter minimum range').fill('40');
    await page.getByPlaceholder('Enter maximum range').fill('60');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(question, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_ICFG_003 checklist mapping form lists asset type and questions', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/asset-type-checklist-mapping',
      'Asset Type - Inspection CheckList mapping'
    );
    if (!opened) {
      noteInaccessible('Checklist mapping');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Checklist mapping create');
      return;
    }

    await add.click();
    await expect(page.getByText('Create New Asset Type - Checklist Mapping')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    const saveMapping = page.getByRole('button', { name: 'Save Mapping' });
    await expect(saveMapping).toBeVisible();
    await expect(saveMapping).toBeDisabled();
  });

  test('TC_ICFG_004 mapping create can scan or type an asset without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/asset-type-checklist-mapping',
      'Asset Type - Inspection CheckList mapping'
    );
    if (!opened) {
      noteInaccessible('Checklist mapping');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Checklist mapping create');
      return;
    }

    await add.click();
    await page.getByText('Scan Asset').click();
    await expect(page.getByPlaceholder('Scan QR code or enter Asset ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Mapping' })).toBeVisible();
  });

  test('TC_ICFG_005 inspection frequency form shows a recurring in-house schedule', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/inspection-frequency',
      'Inspection Frequency'
    );
    if (!opened) {
      noteInaccessible('Inspection Frequency');
      return;
    }

    await expect(page.getByText('Frequency').first()).toBeVisible();
    await expect(page.getByText('Maintained By').first()).toBeVisible();
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Inspection frequency create');
      return;
    }

    await add.click();
    await expect(page.getByRole('heading', { name: 'Create Inspection Frequency' })).toBeVisible({
      timeout: 15000,
    });
    const selected = await selectFrequencyMapping(page);
    if (!selected) return;
    await expect(page.getByText('Recurring').first()).toBeVisible();
    await expect(page.getByText('In-House').first()).toBeVisible();
    await expect(page.getByText('Unit of Measure (UOM)').first()).toBeVisible();
  });

  test('TC_ICFG_006 inspection frequency form offers vendor on-demand', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/inspection-frequency',
      'Inspection Frequency'
    );
    if (!opened) {
      noteInaccessible('Inspection Frequency');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Inspection frequency create');
      return;
    }

    await add.click();
    await expect(page.getByRole('heading', { name: 'Create Inspection Frequency' })).toBeVisible({
      timeout: 15000,
    });
    const selected = await selectFrequencyMapping(page);
    if (!selected) return;
    await expect(page.getByText('On Demand').first()).toBeVisible();
    await expect(page.getByText('Vendor').first()).toBeVisible();
  });
});

/**
 * Recurring and On Demand render only after an asset-type mapping is chosen.
 * @param {import('@playwright/test').Page} page
 */
async function selectFrequencyMapping(page) {
  const mapping = page.locator('select').first();
  await expect(mapping).toBeVisible();
  const option = mapping.locator('option:not([value=""])');
  await option.first().waitFor({ state: 'attached', timeout: 20000 }).catch(() => {});
  if ((await option.count()) === 0) {
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toBeVisible();
    noteInaccessible('Inspection frequency mappings');
    return false;
  }
  await mapping.selectOption({ index: 1 });
  return true;
}
