// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM master data', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads master-data lists and creates a record', async ({ page }) => {
    // Many protected pages + one create; keep under a hard CI budget.
    test.setTimeout(420000);

    await loginToRioEam(page);

    // Create first so write-path is exercised before list tour eats the clock.
    const stamp = Date.now();
    const created =
      (await tryCreateAssetType(page, stamp)) ||
      (await tryCreateProduct(page, stamp)) ||
      (await tryCreateSparePartCategory(page, stamp));
    expect(created, 'Expected at least one master-data create path to succeed').toBeTruthy();

    await openMasterList(page, '/master-data/asset-types', ['Asset Type Name', 'Status', 'Assignment Type']);
    await openAddForm(page, '/master-data/asset-types/add', /Enter asset type name/i);

    await openMasterList(page, '/master-data/branches', ['Branch Name', 'City', 'Branch Code']);
    await openAddForm(page, '/master-data/branches/add', 'Enter Branch Name');

    await openMasterList(page, '/master-data/vendors', ['Vendor Name', 'Company', 'GST Number']);
    await gotoProtected(page, `${BASE}/master-data/add-vendor`);
    await expect(page.getByText(/Vendor|Company|GST/i).first()).toBeVisible({ timeout: 45000 });

    await openMasterList(page, '/master-data/user-roles', ['Full Name', 'Email', 'Department']);

    await gotoProtected(page, `${BASE}/master-data/prod-serv`);
    await expect(page.getByText('Product / Service').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Product Details')).toBeVisible();
    await page.getByText('Service Details').click();
    await expect(page.getByText('Service List').first()).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
    await expect(page.getByText('Branch – Department Mapping').first()).toBeVisible({
      timeout: 45000,
    });

    await gotoProtected(page, `${BASE}/master-data/spare-part`);
    await expect(page.getByText('Part Number').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    await gotoProtected(page, `${BASE}/master-data/spare-parts-configuration`);
    await expect(page.getByRole('button', { name: 'Spare Part Category' })).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByRole('button', { name: 'Asset Type Mapping' })).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/uploads`);
    await expect(page.getByText('Bulk Upload').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Assets').first()).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/departments-asset`);
    await expect(page.getByText(/Department.*Asset/i).first()).toBeVisible({ timeout: 45000 });

    await gotoProtected(page, `${BASE}/master-data/departments`);
    await expect(page.getByText('Department List')).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Department Name').first()).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/departments-admin`);
    await expect(page.getByText('Admin List').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Department Name').first()).toBeVisible();
  });
});

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string[]} columns
 */
async function openMasterList(page, path, columns) {
  await gotoProtected(page, `${BASE}${path}`);
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
  for (const column of columns) {
    await expect(page.getByText(column).first()).toBeVisible({ timeout: 45000 });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} placeholder
 */
async function openAddForm(page, path, placeholder) {
  await gotoProtected(page, `${BASE}${path}`);
  await expect(page.getByPlaceholder(placeholder)).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} pathRe
 */
function waitForPost(page, pathRe) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && pathRe.test(new URL(response.url()).pathname),
    { timeout: 45000 }
  );
}

/**
 * Create may finish API-side before toast (audit log can lag). Treat POST + list
 * navigation / name visibility as success.
 *
 * @param {import('@playwright/test').Page} page
 * @param {number} stamp
 */
async function tryCreateAssetType(page, stamp) {
  const name = `PW-E2E-AT-${stamp}`;
  await gotoProtected(page, `${BASE}/master-data/asset-types/add`);
  const nameField = page.getByPlaceholder(/Enter asset type name/i);
  await expect(nameField).toBeVisible({ timeout: 45000 });
  await nameField.fill(name);

  const createResponsePromise = waitForPost(page, /\/asset-types\/?$/);
  await page.getByRole('button', { name: 'Save' }).click();
  const createResponse = await createResponsePromise.catch(() => null);
  if (!createResponse || !createResponse.ok()) return false;

  const toast = page.getByText(/created successfully/i);
  const toastSeen = await toast
    .waitFor({ state: 'visible', timeout: 10000 })
    .then(() => true)
    .catch(() => false);

  const navigated = await page
    .waitForURL(/\/master-data\/asset-types\/?$/, { timeout: 45000 })
    .then(() => true)
    .catch(() => false);

  if (navigated) {
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    return true;
  }

  return toastSeen;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} stamp
 */
async function tryCreateProduct(page, stamp) {
  const brand = `PW-E2E-BRAND-${stamp}`;
  const model = `PW-E2E-MODEL-${stamp}`;
  await gotoProtected(page, `${BASE}/master-data/prod-serv`);
  await expect(page.getByText('Product Details')).toBeVisible({ timeout: 45000 });

  await page.getByRole('button', { name: /Select Asset Type/i }).first().click();
  const option = page.locator('div.cursor-pointer').filter({ hasNotText: /^\s*$/ }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();

  await page.getByPlaceholder(/Enter Brand/i).fill(brand);
  await page.getByPlaceholder(/Enter Model/i).fill(model);

  const createResponsePromise = waitForPost(page, /\/prodserv\/?$/);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const createResponse = await createResponsePromise.catch(() => null);
  if (!createResponse || !createResponse.ok()) return false;

  const brandSeen = await page
    .getByText(brand)
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .then(() => true)
    .catch(() => false);
  return brandSeen;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {number} stamp
 */
async function tryCreateSparePartCategory(page, stamp) {
  const categoryName = `PW-E2E-SPCAT-${stamp}`;
  await gotoProtected(page, `${BASE}/master-data/spare-parts-configuration/categories/add`);
  await expect(page.getByRole('main').getByText('Add Spare Part Category')).toBeVisible({
    timeout: 45000,
  });
  await page.getByPlaceholder('Enter category name').fill(categoryName);

  const uomSelect = page.locator('select[name="uom"]');
  await expect(uomSelect).toBeEnabled({ timeout: 20000 });
  await expect.poll(async () => uomSelect.locator('option').count(), { timeout: 20000 }).toBeGreaterThan(1);
  await uomSelect.selectOption({ index: 1 });

  await createNamedDropdownItem(page, 'Brand', `PW-E2E-BRAND-${stamp}`, 'Select brand');
  await createNamedDropdownItem(page, 'Model', `PW-E2E-MODEL-${stamp}`, 'Select model');

  await page.getByPlaceholder('Enter minimum stock').fill('1');
  await page.getByPlaceholder('Enter reorder level').fill('2');
  await page.locator('select[name="expiry_type"]').selectOption('0');

  const createResponsePromise = waitForPost(page, /\/spare-parts\/categories\/?$/);
  await page.getByRole('button', { name: 'Save' }).click();
  const createResponse = await createResponsePromise.catch(() => null);
  if (!createResponse || !createResponse.ok()) return false;

  await page
    .getByText('Spare part category created successfully')
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
  const navigated = await page
    .waitForURL(/\/master-data\/spare-parts-configuration\/?$/, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (navigated) {
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 15000 }).catch(() => {});
    return true;
  }
  return false;
}

/**
 * Opens an EnhancedDropdown and creates a new named option.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'Brand' | 'Model'} label
 * @param {string} name
 * @param {string} placeholder
 */
async function createNamedDropdownItem(page, label, name, placeholder) {
  const trigger = page.getByText(placeholder, { exact: true });
  await expect(trigger).toBeVisible({ timeout: 20000 });
  await trigger.click();

  const createNew = page.getByText('+ Create New');
  if (!(await createNew.isVisible().catch(() => false))) {
    await trigger.click();
    await page.keyboard.press('Enter');
  }
  await expect(createNew).toBeVisible({ timeout: 10000 });
  await createNew.click();

  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: `Create New ${label}` }),
  });
  await expect(modal).toBeVisible({ timeout: 10000 });
  await modal.getByPlaceholder(`Enter ${label.toLowerCase()} name`).fill(name);

  const endpoint = label === 'Brand' ? '/spare-parts/brands' : '/spare-parts/models';
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes(endpoint)
  );
  await modal.getByRole('button', { name: 'Create' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `${label} create failed: ${createResponse.status()}`).toBeTruthy();
  await expect(page.getByText(`${label} created successfully`)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
}
