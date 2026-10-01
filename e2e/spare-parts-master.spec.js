// @ts-check
/**
 * 19. Spare parts master
 * TC_SP_002 create spare category Filters (runs first; TC_SP_001 requires it)
 * TC_SP_001 add spare part FLT-IN-01
 * TC_SP_003 allow Filters on Oxygen Concentrator
 * TC_SP_004 receive lot LOT-2401 with quantity 20
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const PART_NUMBER = 'FLT-IN-01';
const PART_NAME = 'Inlet filter';
const UOM = 'Each';
const CATEGORY = 'Filters';
const ASSET_TYPE = 'Oxygen Concentrator';
const LOT = 'LOT-2401';
const LOT_QTY = '20';

const PARTS = `${BASE}/master-data/spare-part`;
const CATEGORIES = `${BASE}/master-data/spare-parts-configuration`;
const LOTS = `${BASE}/master-data/spare-parts`;
const CHECKLIST = `${BASE}/adminsettings/configuration/maintenance-config`;

test.describe('RIO EAM spare parts master', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_SP_002 creates a spare category', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, CATEGORIES);
    await expect(page.getByRole('button', { name: 'Spare Part Category', exact: true })).toBeVisible({
      timeout: 45000,
    });
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await expect(page.getByText('Add Spare Part Category')).toBeVisible({ timeout: 20000 });

    await page.getByPlaceholder('Enter category name').fill(CATEGORY);
    await page.locator('select[name="uom"]').selectOption({ label: UOM });
    await chooseOrCreate(page, 'Select brand', PART_NAME, 'Enter brand name');
    await chooseOrCreate(page, 'Select model', 'Standard', 'Enter model name');
    await page.locator('select[name="expiry_type"]').selectOption('0');

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/spare-parts\/categories\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const saveResponse = await saveResponsePromise;
    if (saveResponse.ok()) {
      await expect(page.getByText('Spare part category created successfully')).toBeVisible({
        timeout: 15000,
      });
    } else {
      await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 15000 });
    }

    await gotoProtected(page, CATEGORIES);
    const row = page.locator('tbody tr').filter({ hasText: CATEGORY }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(UOM);

    await openChecklistSpareDropdown(page);
    await expect(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'Select category' }) }),
    ).toBeVisible();
  });

  test('TC_SP_001 adds a spare part', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, PARTS);
    await expect(page.getByText('Part Number').first()).toBeVisible({ timeout: 45000 });
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await expect(page.getByRole('heading', { name: 'Spare Part', exact: true })).toBeVisible({
      timeout: 20000,
    });

    await page.locator('select[name="spc_id"]').selectOption({ label: CATEGORY });
    await chooseOrCreate(page, 'Select brand', PART_NAME, 'Enter brand name');
    await chooseOrCreate(page, 'Select model', 'Standard', 'Enter model name');
    await page.getByPlaceholder('Enter part number').fill(PART_NUMBER);
    const nameField = page.getByPlaceholder(/name/i);
    if (await nameField.count()) {
      await nameField.first().fill(PART_NAME);
    }
    const uom = page.locator('select[name="uom"]');
    if (await uom.count()) {
      await uom.selectOption({ label: UOM });
    }
    await selectFirstProperty(page);

    const saveResponsePromise = waitForPartSave(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Spare part saved successfully')).toBeVisible({ timeout: 15000 });

    const row = page.locator('tbody tr').filter({ hasText: PART_NUMBER }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(CATEGORY);

    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.locator('select[name="spc_id"]').selectOption({ label: CATEGORY });
    await chooseOrCreate(page, 'Select brand', PART_NAME, 'Enter brand name');
    await chooseOrCreate(page, 'Select model', 'Standard', 'Enter model name');
    await page.getByPlaceholder('Enter part number').fill(PART_NUMBER);
    await selectFirstProperty(page);
    const duplicateResponsePromise = waitForPartSave(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await duplicateResponsePromise).ok()).toBeFalsy();
    await expect(page.getByText('Part number already exists')).toBeVisible({ timeout: 15000 });
  });

  test('TC_SP_003 allows Filters on Oxygen Concentrator', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, `${CATEGORIES}?tab=mapping`);
    await expect(page.getByRole('button', { name: 'Asset Type Mapping', exact: true })).toBeVisible({
      timeout: 45000,
    });
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.getByRole('button', { name: 'Select asset type' }).click();
    await page.getByPlaceholder('Select asset type').fill(ASSET_TYPE);
    await page.getByRole('button', { name: ASSET_TYPE, exact: true }).click();

    const available = page.locator('div.border').filter({ has: page.getByRole('heading', { name: 'Category' }) }).first();
    await available.locator('tbody tr').filter({ hasText: CATEGORY }).first().click();
    await expect(
      page.locator('div.border').filter({ has: page.getByRole('heading', { name: 'Selected Category' }) }),
    ).toContainText(CATEGORY);

    const mapResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/spare-parts/category-mappings/bulk'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const mapResponse = await mapResponsePromise;
    if (mapResponse.ok()) {
      await expect(page.getByText('Asset type mapping saved successfully')).toBeVisible({ timeout: 15000 });
    } else {
      await expect(page.getByText(/already exists/i)).toBeVisible({ timeout: 15000 });
    }

    await gotoProtected(page, `${CATEGORIES}?tab=mapping`);
    const row = page.locator('tbody tr').filter({ hasText: CATEGORY }).filter({ hasText: ASSET_TYPE }).first();
    await expect(row).toBeVisible({ timeout: 20000 });

    await openChecklistSpareDropdown(page);
    await expect(
      page.locator('select').filter({ has: page.locator('option', { hasText: 'Select category' }) }).locator('option', { hasText: CATEGORY }),
    ).toBeAttached({ timeout: 20000 });
  });

  test('TC_SP_004 receives stock as a lot', async ({ page }) => {
    test.setTimeout(300000);
    await loginToRioEam(page);
    await gotoProtected(page, LOTS);
    await expect(page.getByText('Lot ID').first()).toBeVisible({ timeout: 45000 });
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await expect(page.getByRole('heading', { name: 'Spare Part Lot', exact: true })).toBeVisible({
      timeout: 20000,
    });

    const vendor = page.locator('select[name="vendor_id"]');
    await expect(vendor.locator('option').nth(1)).toBeAttached({ timeout: 20000 });
    await vendor.selectOption({ index: 1 });
    const category = page.locator('select[name="spc_id"]');
    await expect(category.locator('option', { hasText: CATEGORY })).toBeAttached({ timeout: 20000 });
    await category.selectOption({ label: CATEGORY });
    await chooseOrCreate(page, 'Select brand', PART_NAME, 'Enter brand name');
    await chooseOrCreate(page, 'Select model', 'Standard', 'Enter model name');
    await page.getByPlaceholder('Enter part number').fill(PART_NUMBER);
    await page.getByPlaceholder('Enter quantity').fill(LOT_QTY);
    await page.getByPlaceholder('Enter unit price').fill('1');
    await page.getByPlaceholder('Enter invoice number').fill(LOT);
    await page.locator('input[name="lot_purchase_date"]').fill(localIso());
    await page.getByPlaceholder('Enter invoice item number').fill('1');

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/spare-parts\/lots\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Spare part lot saved successfully')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Saved Individual Units' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('table').last().locator('tbody tr')).toHaveCount(Number(LOT_QTY));

    await gotoProtected(page, LOTS);
    const row = page.locator('tbody tr').filter({ hasText: LOT }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(LOT_QTY);

    await gotoProtected(page, PARTS);
    await expect(page.locator('tbody tr').filter({ hasText: PART_NUMBER }).first()).toBeVisible({
      timeout: 20000,
    });
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
function waitForPartSave(page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/spare-parts\/master\/?$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} placeholder
 * @param {string} createdName
 * @param {string} namePlaceholder
 */
async function chooseOrCreate(page, placeholder, createdName, namePlaceholder) {
  const combo = page.getByRole('combobox').filter({ hasText: placeholder }).first();
  await expect(combo).toBeEnabled({ timeout: 20000 });
  await combo.click();
  const options = page.getByRole('option');
  await expect(options.first()).toBeVisible({ timeout: 10000 });
  const count = await options.count();
  for (let index = 0; index < count; index += 1) {
    const text = ((await options.nth(index).textContent()) || '').replace(/\s+/g, ' ').trim();
    if (!text || /create new/i.test(text)) continue;
    if (createdName && text.includes(createdName)) {
      await options.nth(index).click();
      return;
    }
  }
  for (let index = 0; index < count; index += 1) {
    const text = ((await options.nth(index).textContent()) || '').trim();
    if (text && !/create new/i.test(text)) {
      await options.nth(index).click();
      return;
    }
  }
  await page.getByRole('option', { name: /Create New/i }).click();
  await page.getByPlaceholder(namePlaceholder).fill(createdName);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Create New/i })).toHaveCount(0, { timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectFirstProperty(page) {
  const available = page.getByText('Available Properties').locator('xpath=following-sibling::div[1]');
  const property = available.locator('div.cursor-pointer').first();
  await expect(property).toBeVisible({ timeout: 20000 });
  await property.click();
  const listValues = page.getByRole('button', { name: 'Select list values' });
  if (await listValues.isVisible().catch(() => false)) {
    await listValues.click();
    await page.locator('label').filter({ has: page.locator('input[type="checkbox"]') }).first().click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openChecklistSpareDropdown(page) {
  await gotoProtected(page, CHECKLIST);
  await page.getByRole('button', { name: 'Maintenance Frequency', exact: true }).click();
  await page.getByRole('button', { name: 'Checklist', exact: true }).click();
  const asset = page.locator('select').filter({ has: page.locator('option', { hasText: '-- Select Asset Type --' }) });
  await asset.selectOption({ label: ASSET_TYPE });
  const frequency = page.locator('select').filter({ has: page.locator('option', { hasText: '-- Select Frequency --' }) });
  await expect(frequency.locator('option').nth(1)).toBeAttached({ timeout: 20000 });
  await frequency.selectOption({ index: 1 });
  const spareRequired = page.getByTitle('Spare Part Require').first();
  await expect(spareRequired).toBeVisible({ timeout: 20000 });
  if (!(await spareRequired.isChecked())) {
    await spareRequired.check();
  }
}

function localIso() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
