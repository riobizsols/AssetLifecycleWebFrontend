// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, headerAddButton } from './helpers/screenAccess.js';

/**
 * One serial chain. The product and service for this run stay in the playwright tenant.
 * A deletion case creates an extra row and deletes only that row.
 * A product linked to a vendor also stays, because that delete is rejected.
 */
test.describe.configure({ mode: 'serial' });

const run = `PW-PS-${Date.now().toString(36)}`;
const brand = `${run} Brand`;
const model = `${run} Model`;
const otherBrand = brand;
const otherModel = model;
const deleteBrand = `${run} Delete Brand`;
const deleteModel = `${run} Delete Model`;
const linkedBrand = `${run} Linked Brand`;
const linkedModel = `${run} Linked Model`;
const serviceDescription = `${run} Service`;
const deleteService = `${run} Delete Service`;
const vendorName = `${run} Vendor`;

/** @type {string} */
let parentType = '';
/** @type {string} */
let otherType = '';

test.describe('Products / Services', () => {
  test('creates a second asset type and reuses a parent when one already exists', async ({ page }) => {
    parentType = await reuseOrCreateAssetType(page, /PW-AT-\S+ Parent/, `${run} Type`);
    otherType = await createAssetType(page, `${run} Other`);
    expect(parentType).not.toEqual(otherType);
  });

  test('product and service screens show the add forms and list headers', async ({ page }) => {
    await openScreen(page);

    await expect(page.getByText('Product / Service', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Product Details', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Enter Brand')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Model')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByText('Product List', { exact: true })).toBeVisible();
    await expect(page.getByText('Actions', { exact: true })).toBeVisible();
    await expect(page.getByTitle('Edit')).toHaveCount(0);
    await expect(page.getByRole('button', { name: /download/i })).toHaveCount(0);
    await expect(page.locator('input[type="checkbox"]')).toHaveCount(0);

    await page.getByText('Service Details', { exact: true }).click();
    await expect(page.getByPlaceholder('Enter Description')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
    await expect(page.getByText('Service List', { exact: true })).toBeVisible();
    await expect(page.getByText('Description', { exact: true }).last()).toBeVisible();
  });

  test('maximize opens each list and then restores it', async ({ page }) => {
    await openScreen(page);
    await toggleMaximize(page, 'Product List');
    await page.getByText('Service Details', { exact: true }).click();
    await toggleMaximize(page, 'Service List');
  });

  test('asset type search keeps a match and drops a word that matches nothing', async ({ page }) => {
    await openScreen(page);
    await searchAssetTypes(page, 'Select Asset Type', parentType);
    await page.getByText('Service Details', { exact: true }).click();
    await searchAssetTypes(page, 'Select Asset Type', parentType);
  });

  test('product add is blocked until asset type, brand, and model are filled', async ({ page }) => {
    await openScreen(page);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByPlaceholder('Enter Brand')).toHaveClass(/border-red-500/);
    await expect(page.getByPlaceholder('Enter Model')).toHaveClass(/border-red-500/);
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toHaveClass(/border-red-500/);
    await expect(productRows(page, brand)).toHaveCount(0);

    await page.getByPlaceholder('Enter Brand').fill(brand);
    await page.getByPlaceholder('Enter Model').fill(model);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toHaveClass(/border-red-500/);
    await expect(productRows(page, brand)).toHaveCount(0);

    await selectFromAbsoluteDropdown(page, 'Select Asset Type', parentType);
    await page.getByPlaceholder('Enter Model').fill('');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByPlaceholder('Enter Model')).toHaveClass(/border-red-500/);
    await expect(productRows(page, brand)).toHaveCount(0);
  });

  test('creates the product that later screens can link', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, brand, model);
    await expect(page.getByText('Product added successfully')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toBeVisible();
    await expect(page.getByPlaceholder('Enter Brand')).toHaveValue('');
    await expect(page.getByPlaceholder('Enter Model')).toHaveValue('');
    const row = productRows(page, brand).filter({ hasText: model });
    await expect(row).toContainText(parentType);
    await expect(row.getByTitle('Delete')).toBeVisible();
  });

  test('rejects the same brand and model on that asset type, including different capital letters', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, brand.toLowerCase(), model.toUpperCase());
    await expect(page.getByText('This brand and model already exist for the selected asset type')).toBeVisible();
    await expect(productRows(page, brand).filter({ hasText: parentType })).toHaveCount(1);
  });

  test('allows that brand and model on the other asset type and keeps the row', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, otherType, otherBrand, otherModel);
    await expect(page.getByText('Product added successfully')).toBeVisible();
    const row = productRows(page, otherBrand).filter({ hasText: otherType });
    await expect(row).toContainText(otherModel);
    await expect(row).toHaveClass(/bg-gray-100|bg-white/);
  });

  test('filters Product List by asset type and then shows every type again', async ({ page }) => {
    await openScreen(page);
    await selectFromAbsoluteDropdown(page, 'All Asset Types', parentType, 'Product List');
    await expect(productRows(page, brand).filter({ hasText: parentType })).toBeVisible();
    await expect(productRows(page, otherBrand).filter({ hasText: otherType })).toHaveCount(0);

    await selectFromAbsoluteDropdown(page, parentType, 'All Asset Types', 'Product List');
    await expect(productRows(page, brand).filter({ hasText: parentType })).toBeVisible();
    await expect(productRows(page, otherBrand).filter({ hasText: otherType })).toBeVisible();
  });

  test('closing delete leaves the extra product in the list', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, deleteBrand, deleteModel);
    const row = productRows(page, deleteBrand);

    await row.getByTitle('Delete').click();
    const dialog = confirmDialog(page);
    await expect(dialog).toContainText(`Are you sure you want to delete product: ${deleteBrand} ${deleteModel}?`);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(row).toBeVisible();

    await row.getByTitle('Delete').click();
    await confirmDialog(page).getByRole('button', { name: '×' }).click();
    await expect(row).toBeVisible();
    await expect(productRows(page, brand).filter({ hasText: parentType })).toBeVisible();
  });

  test('a product linked to a vendor cannot be deleted', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, linkedBrand, linkedModel);
    await createVendor(page);
    await linkProductToVendor(page, parentType, linkedBrand, linkedModel);

    await openScreen(page);
    const row = productRows(page, linkedBrand);
    await row.getByTitle('Delete').click();
    await confirmDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    const blocked = page.locator('div.fixed.inset-0').filter({ hasText: 'Cannot Delete - Dependencies Found' });
    await expect(blocked).toBeVisible();
    await expect(blocked).toContainText(vendorName);
    await blocked.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(row).toBeVisible();
    await expect(productRows(page, brand).filter({ hasText: parentType })).toBeVisible();
  });

  test('deletes only the extra product', async ({ page }) => {
    await openScreen(page);
    const row = productRows(page, deleteBrand);
    await row.getByTitle('Delete').click();
    await confirmDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Product deleted successfully')).toBeVisible();
    await expect(productRows(page, deleteBrand)).toHaveCount(0);
    await expect(productRows(page, brand).filter({ hasText: parentType })).toBeVisible();
    await expect(productRows(page, linkedBrand)).toBeVisible();
  });

  test('service add is blocked until asset type and description are filled', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByPlaceholder('Enter Description')).toHaveClass(/border-red-500/);
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toHaveClass(/border-red-500/);

    await page.getByPlaceholder('Enter Description').fill(serviceDescription);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toHaveClass(/border-red-500/);
    await expect(serviceRows(page, serviceDescription)).toHaveCount(0);
  });

  test('creates the service that stays in the tenant', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await addService(page, parentType, serviceDescription);
    await expect(page.getByText('Service added successfully')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Description')).toHaveValue('');
    await expect(serviceRows(page, serviceDescription)).toContainText(parentType);
  });

  test('saves the same description again because uniqueness is brand and model', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await addService(page, parentType, serviceDescription);
    await expect(page.getByText('Service added successfully')).toBeVisible();
    await expect(serviceRows(page, serviceDescription)).toHaveCount(2);
  });

  test('filters Service List by asset type and then shows every type again', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await selectFromAbsoluteDropdown(page, 'All Asset Types', parentType, 'Service List');
    await expect(serviceRows(page, serviceDescription).first()).toBeVisible();

    await selectFromAbsoluteDropdown(page, parentType, 'All Asset Types', 'Service List');
    await expect(serviceRows(page, serviceDescription)).toHaveCount(2);
  });

  test('closing delete leaves the extra service in the list', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await addService(page, parentType, deleteService);
    const row = serviceRows(page, deleteService);

    await row.getByTitle('Delete').click();
    const dialog = confirmDialog(page);
    await expect(dialog).toContainText(`Are you sure you want to delete service: ${deleteService}?`);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(row).toBeVisible();
    await expect(serviceRows(page, serviceDescription)).toHaveCount(2);
  });

  test('deletes only the extra service', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    const row = serviceRows(page, deleteService);
    await row.getByTitle('Delete').click();
    await confirmDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Service deleted successfully')).toBeVisible();
    await expect(serviceRows(page, deleteService)).toHaveCount(0);
    await expect(serviceRows(page, serviceDescription)).toHaveCount(2);
  });
});

/** @param {import('@playwright/test').Page} page */
async function openScreen(page) {
  await gotoProtected(page, `${BASE}/master-data/prod-serv`);
  await expect(page.getByText('Product / Service', { exact: true }).first()).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} existingPattern
 * @param {string} fallbackName
 */
async function reuseOrCreateAssetType(page, existingPattern, fallbackName) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(page.getByRole('columnheader', { name: 'Asset Type Name' })).toBeVisible({ timeout: 45000 });
  const existing = page.getByRole('cell', { name: existingPattern });
  if ((await existing.count()) > 0) {
    return (await existing.first().innerText()).trim();
  }
  return createAssetType(page, fallbackName);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createAssetType(page, name) {
  const onList = /\/master-data\/asset-types$/.test(page.url());
  if (!onList) {
    await gotoProtected(page, `${BASE}/master-data/asset-types`);
  }
  await expect(page.getByRole('columnheader', { name: 'Asset Type Name' })).toBeVisible({ timeout: 45000 });
  await headerAddButton(page).click();
  await page.getByPlaceholder('Enter asset type name').fill(name);
  await clickUnblocked(page, 'Save');
  await expect(page).toHaveURL(/\/master-data\/asset-types\/?$/, { timeout: 60000 });
  await expect(page.getByRole('row').filter({ hasText: name }).first()).toBeVisible({ timeout: 30000 });
  return name;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} listTitle
 */
async function toggleMaximize(page, listTitle) {
  const header = page.locator('div').filter({ hasText: new RegExp(`^${listTitle}$`) }).filter({ has: page.getByRole('button') });
  const panel = page.locator('div.fixed.inset-0').filter({ hasText: listTitle });
  await header.getByRole('button').click();
  await expect(panel).toBeVisible();
  await header.getByRole('button').click();
  await expect(panel).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} openerName
 * @param {string} typeName
 */
async function searchAssetTypes(page, openerName, typeName) {
  const { search, menu } = await openAssetTypeMenu(page, openerName);
  await search.fill(typeName);
  await expect(menu.getByText(typeName, { exact: true })).toBeVisible();
  await search.fill('zzzz-no-such-type');
  await expect(menu.getByText(typeName, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: openerName }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} openerName
 * @param {string} [panelTitle]
 */
async function openAssetTypeMenu(page, openerName, panelTitle) {
  const root = panelTitle
    ? page.locator('div.bg-white.rounded.shadow').filter({ hasText: panelTitle }).first()
    : page;
  await root.getByRole('button', { name: openerName, exact: true }).click();
  const search = root.getByPlaceholder('Search Asset Types...');
  await expect(search).toBeVisible();
  const menu = root.locator('div.absolute').filter({ has: search }).first();
  await expect(menu).toBeVisible();
  return { search, menu };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} openerName
 * @param {string} optionText
 * @param {string} [panelTitle]
 */
async function selectFromAbsoluteDropdown(page, openerName, optionText, panelTitle) {
  const { search, menu } = await openAssetTypeMenu(page, openerName, panelTitle);
  await search.fill(optionText === 'All Asset Types' ? '' : optionText);
  const option = menu.locator('div.cursor-pointer').filter({ hasText: optionText }).first();
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} productBrand
 * @param {string} productModel
 */
async function addProduct(page, typeName, productBrand, productModel) {
  const opener = (await page.getByRole('button', { name: 'Select Asset Type' }).count()) > 0
    ? 'Select Asset Type'
    : typeName;
  await selectFromAbsoluteDropdown(page, opener, typeName);
  await page.getByPlaceholder('Enter Brand').fill(productBrand);
  await page.getByPlaceholder('Enter Model').fill(productModel);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} description
 */
async function addService(page, typeName, description) {
  await selectFromAbsoluteDropdown(page, 'Select Asset Type', typeName);
  await page.getByPlaceholder('Enter Description').fill(description);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} productBrand
 */
function productRows(page, productBrand) {
  return page.locator('div.grid.grid-cols-4').filter({ hasText: productBrand });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} description
 */
function serviceRows(page, description) {
  return page.locator('div.grid.grid-cols-3').filter({ hasText: description });
}

/** @param {import('@playwright/test').Page} page */
function confirmDialog(page) {
  return page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
}

/** @param {import('@playwright/test').Page} page */
async function createVendor(page) {
  await gotoProtected(page, `${BASE}/master-data/add-vendor`);
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${vendorName} Co`);
  await page.locator('input[name="company_email"]').fill(`${run.toLowerCase()}@example.com`);
  await page.locator('input[name="contact_person_number"]').fill('9999900001');
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.getByRole('checkbox', { name: 'Product Supply' }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Vendor created successfully!')).toBeVisible({ timeout: 60000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} productBrand
 * @param {string} productModel
 */
async function linkProductToVendor(page, typeName, productBrand, productModel) {
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(page.getByRole('columnheader', { name: 'Vendor Name' })).toBeVisible({ timeout: 45000 });
  const row = page.getByRole('row').filter({ hasText: vendorName }).first();
  await row.getByTitle('Edit').click();
  await expect(page.getByText('Edit Vendor', { exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: 'Product Supply' }).check();
  await page.getByText('Product Details', { exact: true }).click();
  await chooseFixedOption(page, 'Select Asset Type', typeName);
  await chooseFixedOption(page, 'Select Brand', productBrand);
  await chooseFixedOption(page, 'Select Model', productModel);
  await page.getByRole('button', { name: 'Add Product' }).click();
  await expect(page.getByText('Product linked successfully')).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} placeholder
 * @param {string} optionText
 */
async function chooseFixedOption(page, placeholder, optionText) {
  await page.getByRole('button', { name: placeholder, exact: true }).click();
  const search = page.getByPlaceholder('Search...').last();
  await search.fill(optionText);
  const menu = search.locator('xpath=ancestor::div[contains(@class,"fixed")][1]');
  await menu.getByText(optionText, { exact: true }).click();
}
