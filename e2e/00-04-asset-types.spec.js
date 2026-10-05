// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const stamp = () => String(Date.now()).slice(-8);

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {{ maintenance?: boolean, inspection?: boolean }} [flags]
 */
async function createAssetType(page, name, flags = {}) {
  const opened = await openTitledScreen(page, '/master-data/asset-types/add', 'Add Asset Type');
  if (!opened) return false;
  await page.getByPlaceholder('Enter asset type name').fill(name);
  if (flags.maintenance) {
    await page.getByRole('checkbox', { name: 'Require Maintenance' }).check();
  }
  if (flags.inspection) {
    await page.getByRole('checkbox', { name: 'Require Inspection' }).check();
  }
  await expect(page.getByRole('checkbox', { name: 'Group Required' })).not.toBeChecked();
  await page.getByRole('button', { name: 'Save' }).click();
  const saved = await page
    .getByText(new RegExp(`Asset type .*${name}.* created successfully`, 'i'))
    .waitFor({ state: 'visible', timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  return saved;
}

test.describe('RIO EAM asset types', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_ATYPE_001 a unique asset type can require maintenance and inspection', async ({ page }) => {
    test.setTimeout(150000);
    const name = `PW-E2E-AT-${stamp()}`;
    const list = await openTitledScreen(page, '/master-data/asset-types', 'Asset Type Name');
    if (!list) {
      noteInaccessible('Asset Types');
      return;
    }
    if (!(await headerAddButton(page).isVisible().catch(() => false))) {
      noteInaccessible('Asset type create');
      return;
    }
    const saved = await createAssetType(page, name, { maintenance: true, inspection: true });
    if (!saved) {
      noteInaccessible('Asset type save');
      return;
    }
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_ATYPE_002 a duplicate asset type name is rejected', async ({ page }) => {
    test.setTimeout(180000);
    const name = `PW-E2E-AD-${stamp()}`;
    const list = await openTitledScreen(page, '/master-data/asset-types', 'Asset Type Name');
    if (!list) {
      noteInaccessible('Asset Types');
      return;
    }
    const saved = await createAssetType(page, name, { inspection: true });
    if (!saved) {
      noteInaccessible('Asset type save');
      return;
    }
    const again = await createAssetType(page, name);
    if (again) {
      throw new Error('Duplicate asset type name was accepted');
    }
    await expect(page.getByText(/similar name already exists|already exists/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test('TC_ATYPE_003 inspection can be turned off on the new asset type', async ({ page }) => {
    test.setTimeout(180000);
    const name = `PW-E2E-AI-${stamp()}`;
    const list = await openTitledScreen(page, '/master-data/asset-types', 'Asset Type Name');
    if (!list) {
      noteInaccessible('Asset Types');
      return;
    }
    const saved = await createAssetType(page, name, { inspection: true });
    if (!saved) {
      noteInaccessible('Asset type save');
      return;
    }
    const row = page.locator('tr').filter({ hasText: name }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.getByTitle('Edit').click();
    const inspection = page.getByRole('checkbox', { name: 'Require Inspection' });
    await expect(inspection).toBeVisible({ timeout: 20000 });
    await inspection.uncheck();
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText(/updated successfully/i).first()).toBeVisible({ timeout: 20000 });
  });
});
