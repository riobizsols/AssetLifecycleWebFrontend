// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, toastMessage } from './helpers/screenAccess.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/properties';

async function openProps(page) {
  const status = await openAdminScreen(page, PATH, 'Filter Properties');
  if (skipIfInaccessible(page, 'Properties', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Properties', () => {
  test('list, filter search, data or empty', async ({ page }) => {
    if (!(await openProps(page))) return;

    await expect(page.getByRole('heading', { name: 'Properties' })).toBeVisible();
    await expect(page.getByTitle('Filter Properties')).toBeVisible();

    const data = await readAdminState(page, /No properties created yet|No properties match your search/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
    });

    await page.getByTitle('Filter Properties').click();
    await expect(page.getByText('Search Properties')).toBeVisible();
    const search = page.getByPlaceholder('Search by property name...');
    await expect(search).toBeVisible();

    const nameCell = page.locator('table tbody tr td').first();
    if (await nameCell.isVisible().catch(() => false)) {
      const sample = ((await nameCell.innerText()) || '').trim();
      if (sample) {
        await search.fill(sample);
        await waitForAdminReady(page);
        const names = page.locator('table tbody tr td:first-child, table tbody td').filter({ hasText: /.+/ });
        const n = await page.locator('table tbody tr').count().catch(() => 0);
        const cards = page.getByText(sample);
        await expect(cards.first()).toBeVisible();
        test.info().annotations.push({
          type: 'condition',
          description: `FILTER name="${sample}" → visible; rows~${n}.`,
        });
      }
    } else {
      test.info().annotations.push({ type: 'condition', description: 'FILTER — no properties to sample.' });
    }
  });

  test('create requires property name; cancelled', async ({ page }) => {
    if (!(await openProps(page))) return;

    const add = page.getByTitle('Create Property');
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD — plus hidden (no edit access).' });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    await expect(page.getByPlaceholder('e.g., Material, Color, Brand')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Value' })).toBeVisible();

    await clickUnblocked(page, 'Save Property');
    const name = page.getByPlaceholder('e.g., Material, Color, Brand');
    const native = await name.evaluate((el) => el instanceof HTMLInputElement && !el.checkValidity());
    if (native) {
      await expect(name).toHaveJSProperty('validity.valueMissing', true);
    } else {
      await expect(toastMessage(page, 'Property name is required')).toBeVisible({ timeout: 10000 });
    }

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create New Property' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD — name required; cancelled; nothing created.',
    });
  });
});
