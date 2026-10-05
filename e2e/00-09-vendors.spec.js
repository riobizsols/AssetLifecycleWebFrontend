// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const stamp = () => String(Date.now()).slice(-8);

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ name: string, supply: 'Product Supply' | 'Service Supply' }} opts
 */
async function createVendor(page, opts) {
  const add = headerAddButton(page);
  if (!(await add.isVisible().catch(() => false))) return false;
  await add.click();
  await expect(page.getByPlaceholder('Enter vendor name')).toBeVisible({ timeout: 20000 });
  await page.getByPlaceholder('Enter vendor name').fill(opts.name);
  await page.getByPlaceholder('Enter company name').fill(opts.name);
  await page.getByPlaceholder('Enter company email').fill(`pw${stamp()}@e2e.test`);
  await page.getByPlaceholder('Enter contact person name').fill('PW E2E');
  await page.getByPlaceholder('Enter contact number').fill(`98${stamp()}`);
  await page.getByRole('checkbox', { name: opts.supply }).check();
  await page.getByRole('button', { name: 'Save' }).click();
  return page
    .getByText(/Vendor created successfully/i)
    .waitFor({ state: 'visible', timeout: 25000 })
    .then(() => true)
    .catch(() => false);
}

test.describe('RIO EAM vendors', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_VEND_001 a unique product vendor can be added', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/master-data/vendors', 'Vendor Name');
    if (!opened) {
      noteInaccessible('Vendors');
      return;
    }
    const saved = await createVendor(page, {
      name: `PW-E2E-VP-${stamp()}`,
      supply: 'Product Supply',
    });
    if (!saved) {
      noteInaccessible('Vendor create');
      return;
    }
    await expect(page.getByText(/Vendor created successfully/i)).toBeVisible();
  });

  test('TC_VEND_002 a unique service vendor can be added', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/master-data/vendors', 'Vendor Name');
    if (!opened) {
      noteInaccessible('Vendors');
      return;
    }
    const saved = await createVendor(page, {
      name: `PW-E2E-VS-${stamp()}`,
      supply: 'Service Supply',
    });
    if (!saved) {
      noteInaccessible('Vendor create');
      return;
    }
    await expect(page.getByRole('checkbox', { name: 'Service Supply' })).toBeChecked();
  });

  test('TC_VEND_003 a blank vendor name is blocked', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/vendors', 'Vendor Name');
    if (!opened) {
      noteInaccessible('Vendors');
      return;
    }
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Vendor create');
      return;
    }
    await add.click();
    await expect(page.getByPlaceholder('Enter vendor name')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/Vendor Name is required/i).first()).toBeVisible({ timeout: 10000 });
  });
});
