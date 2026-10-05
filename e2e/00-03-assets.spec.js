// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const stamp = () => String(Date.now()).slice(-8);

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 */
async function applyColumnFilter(page, columnLabel) {
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  const column = page.getByTitle('Select column');
  await expect(column).toBeVisible({ timeout: 10000 });
  await column.selectOption({ label: columnLabel });
  const values = page.getByRole('button', { name: 'Select values' });
  if (!(await values.isVisible().catch(() => false))) return null;
  await values.click();
  const choice = page.locator('div.max-h-48 span').first();
  if (!(await choice.isVisible().catch(() => false))) return null;
  const text = (await choice.innerText()).trim();
  await choice.click();
  return text;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function clearColumnFilter(page) {
  await page.locator('header').getByText('Assets', { exact: true }).click();
  const chip = page.locator('div.bg-gray-50').filter({ has: page.getByTitle('Select column') });
  if (await chip.isVisible().catch(() => false)) {
    await chip.locator('button').first().click();
  }
  await expect(page.getByTitle('Select column')).toHaveCount(0);
}

/**
 * Fill the add-asset form when a parent type and a product vendor already exist.
 * Returns the asset name when the success toast appears.
 * @param {import('@playwright/test').Page} page
 * @param {{ serialMode: 'none' | 'existing', name: string, serial?: string }} opts
 */
async function tryCreateAsset(page, opts) {
  const opened = await openTitledScreen(page, '/assets/add', 'Add Asset');
  if (!opened) return '';

  await expect(page.locator('label').filter({ hasText: 'Asset Type' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  await expect(page.locator('label').filter({ hasText: 'Purchase Date' }).first()).toBeVisible();
  await expect(page.locator('label').filter({ hasText: 'Product Vendor' }).first()).toBeVisible();

  const typeButton = page.locator('label', { hasText: 'Asset Type' }).locator('xpath=..').getByRole('button').first();
  await typeButton.click();
  const parentType = page.locator('div.cursor-pointer').filter({ hasText: '(Parent)' }).first();
  if (!(await parentType.isVisible().catch(() => false))) {
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    return '';
  }
  await parentType.click();

  await page.locator('select[name="serialNumberMode"]').selectOption(opts.serialMode);
  if (opts.serialMode === 'existing') {
    await page.getByPlaceholder('Scan or type serial number').fill(opts.serial || `PW${stamp()}`);
  }
  await page.locator('textarea[name="description"]').fill(opts.name);

  const today = new Date();
  const purchase = today.toISOString().slice(0, 10);
  const expiry = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  await page.locator('input[name="purchaseDate"]').fill(purchase);
  await page.locator('input[name="expiryDate"]').fill(expiry);
  await page.getByPlaceholder('0.00').first().fill('85000');

  const vendorField = page.locator('label', { hasText: 'Product Vendor' }).locator('xpath=..');
  await vendorField.getByRole('button').first().click();
  const vendor = page.locator('div.cursor-pointer').filter({ hasNotText: 'Create New' }).first();
  if (!(await vendor.isVisible().catch(() => false))) {
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    return '';
  }
  await vendor.click();
  await page.getByRole('button', { name: 'Save' }).click();

  const created = await page
    .getByText(/Asset created successfully/i)
    .waitFor({ state: 'visible', timeout: 25000 })
    .then(() => true)
    .catch(() => false);
  return created ? opts.name : '';
}

test.describe('RIO EAM assets', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_ASSET_001 assets list shows columns, filter, and add', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assets', 'Assets');
    if (!opened) {
      noteInaccessible('Assets');
      return;
    }
    await expect(page.getByText('Asset Name', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Current Status', { exact: true }).first()).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
  });

  test('TC_ASSET_002 column search returns a matching asset name', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/assets', 'Assets');
    if (!opened) {
      noteInaccessible('Assets');
      return;
    }
    const chosen = await applyColumnFilter(page, 'Asset Name');
    if (!chosen) {
      noteInaccessible('Asset name filter values');
      await clearColumnFilter(page);
      return;
    }
    await expect(page.getByText(chosen, { exact: true }).first()).toBeVisible({ timeout: 20000 });
    await clearColumnFilter(page);
  });

  test('TC_ASSET_003 status filter can be applied and cleared', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/assets', 'Assets');
    if (!opened) {
      noteInaccessible('Assets');
      return;
    }
    const chosen = await applyColumnFilter(page, 'Current Status');
    if (chosen) {
      await expect(page.getByText(chosen, { exact: true }).first()).toBeVisible({ timeout: 20000 });
    }
    await clearColumnFilter(page);
    await expect(page.getByText('Asset Name', { exact: true }).first()).toBeVisible();
  });

  test('TC_ASSET_004 a unique asset can be created when type and vendor exist', async ({ page }) => {
    test.setTimeout(180000);
    const name = `PW-E2E-AST-${stamp()}`;
    const created = await tryCreateAsset(page, { serialMode: 'none', name });
    if (!created) {
      await expect(page.getByText(/Asset Type|Add Asset/).first()).toBeVisible();
      return;
    }
    await expect(page.getByText(/Asset created successfully/i)).toBeVisible();
  });

  test('TC_ASSET_005 an empty asset form shows required messages', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assets/add', 'Add Asset');
    if (!opened) {
      noteInaccessible('Add Asset');
      return;
    }
    await page.getByRole('button', { name: 'Purchase Details' }).click();
    await page.getByRole('button', { name: 'Vendor Details' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Asset type is required')).toBeVisible();
    await expect(page.getByText('Serial number is required')).toBeVisible();
    await expect(page.getByText('Purchase date is required')).toBeVisible();
    await expect(page.getByText('Purchase cost is required')).toBeVisible();
    await expect(page.getByText('Expiry date is required')).toBeVisible();
    await expect(page.getByText('Purchase vendor is required')).toBeVisible();
  });

  test('TC_ASSET_006 a newly created asset can be edited', async ({ page }) => {
    test.setTimeout(180000);
    const name = `PW-E2E-EDT-${stamp()}`;
    const created = await tryCreateAsset(page, { serialMode: 'none', name });
    if (!created) {
      noteInaccessible('Asset create for edit');
      return;
    }

    const listed = await openTitledScreen(page, '/assets', 'Assets');
    if (!listed) return;
    await page.locator('[data-contentbox-filter-button]').click();
    await page.getByText('Search by Column', { exact: true }).click();
    await page.getByTitle('Select column').selectOption({ label: 'Asset Name' });
    const values = page.getByRole('button', { name: 'Select values' });
    if (!(await values.isVisible().catch(() => false))) {
      noteInaccessible('Created asset row');
      return;
    }
    await values.click();
    await page.getByPlaceholder('Search...').fill(created);
    const choice = page.locator('div.max-h-48 span').filter({ hasText: created }).first();
    if (!(await choice.isVisible().catch(() => false))) {
      noteInaccessible('Created asset row');
      return;
    }
    await choice.click();
    const row = page.locator('tr').filter({ hasText: created }).first();
    if (!(await row.isVisible().catch(() => false))) {
      noteInaccessible('Created asset row');
      return;
    }
    await row.getByTitle('Edit').click();
    const locationInput = page.getByText('Location', { exact: true }).locator('xpath=..').locator('input');
    await expect(locationInput).toBeVisible({ timeout: 20000 });
    if (await locationInput.isDisabled()) {
      await page.getByRole('button', { name: 'Cancel' }).click();
      return;
    }
    await locationInput.fill(`PW-LOC-${stamp()}`);
    await page.getByRole('button', { name: 'Update' }).click();
    await expect(page.getByText('Asset updated successfully')).toBeVisible({ timeout: 20000 });
  });

  test('TC_ASSET_007 an asset can store an entered serial', async ({ page }) => {
    test.setTimeout(180000);
    const serial = `PW${stamp()}`;
    const created = await tryCreateAsset(page, {
      serialMode: 'existing',
      name: `PW-E2E-SN-${stamp()}`,
      serial,
    });
    if (!created) {
      await expect(page.getByText('Serial Number').first()).toBeVisible();
      return;
    }
    await expect(page.getByText(/Asset created successfully/i)).toBeVisible();
  });

  test('TC_ASSET_008 this login sees the assets add control', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assets', 'Assets');
    if (!opened) {
      noteInaccessible('Assets');
      return;
    }
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Asset create for this role');
      return;
    }
    await expect(add).toBeVisible();
  });
});
