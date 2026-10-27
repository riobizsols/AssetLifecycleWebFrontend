// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton } from './helpers/screenAccess.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { waitForListData } from './helpers/inspectionScreen.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/asset-type-checklist-mapping';
const CREATE = '/adminsettings/configuration/asset-type-checklist-mapping/create';

async function openMapping(page) {
  const status = await openAdminScreen(page, PATH, { column: 'Total Questions' });
  if (skipIfInaccessible(page, 'Asset Type Checklist Mapping', status)) return false;
  await waitForListData(page);
  return true;
}

test.describe('Asset Type - Inspection Checklist Mapping', () => {
  test('columns, data or empty', async ({ page }) => {
    if (!(await openMapping(page))) return;

    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Total Questions' })).toBeVisible();
    const data = await readAdminState(page, /No data found|No mappings/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
  });

  test('create requires asset type; cancelled, nothing saved', async ({ page }) => {
    if (!(await openMapping(page))) return;

    const add = headerAddButton(page);
    if (await add.isVisible().catch(() => false)) {
      await add.click();
    } else {
      const ready = await gotoProtected(page, `${BASE}${CREATE}`);
      test.skip(!ready, 'Create mapping did not load');
    }

    await expect(page.getByText('Create New Asset Type - Checklist Mapping')).toBeVisible({ timeout: 30000 });
    const typeSelect = page.locator('select').filter({
      has: page.locator('option', { hasText: 'Select Asset Type' }),
    }).first();
    await expect(typeSelect).toBeVisible();

    const save = page.getByRole('button', { name: /Save Mapping/ });
    await expect(save).toBeVisible();
    await expect(save).toBeDisabled();

    await page.getByRole('button', { name: 'Cancel', exact: true }).first().click();
    await expect(page).toHaveURL(new RegExp(`${PATH.replace(/\//g, '\\/')}\\/?$`));
    test.info().annotations.push({
      type: 'condition',
      description: 'CREATE — validation; Cancel returned; nothing saved.',
    });
  });
});
