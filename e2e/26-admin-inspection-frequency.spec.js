// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, headerAddButton, toastMessage } from './helpers/screenAccess.js';
import { waitForListData } from './helpers/inspectionScreen.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/inspection-frequency';

async function openFreq(page) {
  const status = await openAdminScreen(page, PATH, { column: 'Frequency' });
  if (skipIfInaccessible(page, 'Inspection Frequency', status)) return false;
  await waitForListData(page);
  return true;
}

test.describe('Inspection Frequency', () => {
  test('columns, data or empty', async ({ page }) => {
    if (!(await openFreq(page))) return;

    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frequency' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maintained By' })).toBeVisible();
    const data = await readAdminState(page, /No data found|No frequencies/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
  });

  test('add modal requires mapping; cancelled', async ({ page }) => {
    if (!(await openFreq(page))) return;

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD — plus hidden.' });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: /Create Inspection Frequency|Add Inspection Frequency/ })).toBeVisible();

    await clickUnblocked(page, 'Save Frequency');
    const mapping = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select Asset Type' }) }).first();
    const native =
      (await mapping.count()) > 0 &&
      (await mapping.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity()));
    if (native) {
      await expect(mapping).toHaveJSProperty('validity.valueMissing', true);
    } else {
      await expect(
        toastMessage(page, /Please select (a )?(mapping|asset type mapping)/i),
      ).toBeVisible({ timeout: 10000 });
    }

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Create Inspection Frequency/ })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD — mapping required; cancelled; nothing created.',
    });
  });
});
