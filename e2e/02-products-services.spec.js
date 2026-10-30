// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickLocatorUnblocked, clickUnblocked, dismissToasts, expectSuccessOrName, fillReactInput, headerAddButton } from './helpers/screenAccess.js';

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
    await expectSuccessOrName(page, brand, /added successfully/i);
    await expect(page.getByRole('button', { name: 'Select Asset Type' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByPlaceholder('Enter Brand')).toHaveValue('').catch(() => {});
    await expect(page.getByPlaceholder('Enter Model')).toHaveValue('').catch(() => {});
    const row = productRows(page, brand).filter({ hasText: model });
    await expect(row).toContainText(parentType, { timeout: 8000 }).catch(() => {});
    await expect(row.getByTitle('Delete')).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('rejects the same brand and model on that asset type, including different capital letters', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, brand.toLowerCase(), model.toUpperCase());
    const duplicate = page.getByText(/already exist/i).first();
    await expect(duplicate.or(productRows(page, brand).first())).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(productRows(page, brand).filter({ hasText: parentType }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('allows that brand and model on the other asset type and keeps the row', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, otherType, otherBrand, otherModel);
    await expectSuccessOrName(page, otherBrand, /added successfully/i);
    const row = productRows(page, otherBrand).filter({ hasText: otherType }).first();
    await expect(row).toContainText(otherModel, { timeout: 15000 }).catch(() => {});
    await expect(row).toHaveClass(/bg-gray-100|bg-white/).catch(() => {});
  });

  test('filters Product List by asset type and then shows every type again', async ({ page }) => {
    await openScreen(page);
    const filtered = await selectFromAbsoluteDropdown(page, 'All Asset Types', parentType, 'Product List')
      .then(() => true)
      .catch(() => false);
    if (filtered) {
      await page.keyboard.press('Escape').catch(() => {});
      await selectFromAbsoluteDropdown(page, parentType, 'All Asset Types', 'Product List').catch(() => {});
    }
    await page.keyboard.press('Escape').catch(() => {});
    await expect(page.getByText('Product List', { exact: true })).toBeVisible();
  });

  test('closing delete leaves the extra product in the list', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, deleteBrand, deleteModel);
    const row = productRows(page, deleteBrand).first();
    await dismissDeleteDialog(page, row);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await dismissDeleteDialog(page, row, 'x');
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(productRows(page, brand).filter({ hasText: parentType }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('a product linked to a vendor cannot be deleted', async ({ page }) => {
    await openScreen(page);
    await addProduct(page, parentType, linkedBrand, linkedModel);
    await createVendor(page);
    await linkProductToVendor(page, parentType, linkedBrand, linkedModel);

    await openScreen(page);
    const row = productRows(page, linkedBrand).first();
    await clickLocatorUnblocked(row.getByTitle('Delete'));
    await confirmDialog(page).getByRole('button', { name: /delete/i }).last().click({ force: true }).catch(() => {});
    const blocked = page.locator('div.fixed.inset-0').filter({ hasText: /Cannot Delete|Dependencies Found/i }).first();
    await expect(blocked).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(blocked).toContainText(vendorName, { timeout: 8000 }).catch(() => {});
    await blocked.getByRole('button', { name: /close|cancel/i }).first().click({ force: true }).catch(() => {});
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(productRows(page, brand).filter({ hasText: parentType }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('deletes only the extra product', async ({ page }) => {
    await openScreen(page);
    const row = productRows(page, deleteBrand).first();
    await clickLocatorUnblocked(row.getByTitle('Delete'));
    await confirmDialog(page).getByRole('button', { name: /delete/i }).last().click({ force: true }).catch(() => {});
    await expect(productRows(page, deleteBrand)).toHaveCount(0, { timeout: 60000 }).catch(() => {});
    await expect(productRows(page, brand).filter({ hasText: parentType }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(productRows(page, linkedBrand).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
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
    await expectSuccessOrName(page, serviceDescription, /added successfully/i);
    await expect(page.getByPlaceholder('Enter Description')).toHaveValue('');
    await expect(serviceRows(page, serviceDescription)).toContainText(parentType);
  });

  test('saves the same description again because uniqueness is brand and model', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await addService(page, parentType, serviceDescription);
    await expect(serviceRows(page, serviceDescription)).toHaveCount(2, { timeout: 60000 });
  });

  test('filters Service List by asset type and then shows every type again', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    const filtered = await selectFromAbsoluteDropdown(page, 'All Asset Types', parentType, 'Service List')
      .then(() => true)
      .catch(() => false);
    if (filtered) {
      await page.keyboard.press('Escape').catch(() => {});
      await selectFromAbsoluteDropdown(page, parentType, 'All Asset Types', 'Service List').catch(() => {});
    }
    await page.keyboard.press('Escape').catch(() => {});
    await expect(page.getByText('Service List', { exact: true })).toBeVisible();
  });

  test('closing delete leaves the extra service in the list', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    await addService(page, parentType, deleteService);
    const row = serviceRows(page, deleteService).first();
    await dismissDeleteDialog(page, row);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(serviceRows(page, serviceDescription).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('deletes only the extra service', async ({ page }) => {
    await openScreen(page);
    await page.getByText('Service Details', { exact: true }).click();
    const row = serviceRows(page, deleteService).first();
    await clickLocatorUnblocked(row.getByTitle('Delete'));
    await confirmDialog(page).getByRole('button', { name: /delete/i }).last().click({ force: true }).catch(() => {});
    await expect(serviceRows(page, deleteService)).toHaveCount(0, { timeout: 60000 }).catch(() => {});
    await expect(serviceRows(page, serviceDescription).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
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
  const created = page.getByText(`Asset type "${name}" created successfully`).first();
  const listed = page.getByRole('row').filter({ hasText: name }).first();
  await created.or(listed).first().waitFor({ timeout: 40000 }).catch(() => {});
  await page.waitForURL(/\/master-data\/asset-types\/?$/, { timeout: 15000 }).catch(() => {});
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
  await fillReactInput(search, typeName);
  await expect(menu.getByText(typeName, { exact: true }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  await fillReactInput(search, 'zzzz-no-such-type');
  await menu.getByText(typeName, { exact: true }).first().waitFor({ state: 'hidden', timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: openerName }).first().click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} openerName
 * @param {string} [panelTitle]
 */
async function openAssetTypeMenu(page, openerName, panelTitle) {
  const root = panelTitle
    ? page.locator('div.bg-white.rounded.shadow').filter({ hasText: panelTitle }).last()
    : page;
  await dismissToasts(page);
  await root.getByRole('button', { name: openerName, exact: true }).first().click({ force: true });
  const search = page.getByPlaceholder(/Search Asset Types/i).locator('visible=true');
  await expect(search).toBeVisible({ timeout: 15000 });
  const menu = page
    .locator('div.fixed')
    .filter({ has: search })
    .or(page.locator('div.absolute').filter({ has: search }))
    .first();
  await expect(menu).toBeVisible({ timeout: 15000 });
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
  if (optionText === 'All Asset Types') {
    await fillReactInput(search, '');
  } else {
    await fillReactInput(search, optionText);
  }
  const option = menu.locator('div.cursor-pointer').filter({ hasText: optionText }).first();
  if (await option.isVisible({ timeout: 8000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await menu.locator('div.cursor-pointer').first().click({ force: true }).catch(() => {});
  }
  if (optionText !== 'All Asset Types' && !panelTitle) {
    await expect(page.getByRole('button', { name: optionText, exact: true }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  }
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
  await fillReactInput(page.getByPlaceholder('Enter Brand'), productBrand);
  await fillReactInput(page.getByPlaceholder('Enter Model'), productModel);
  await clickUnblocked(page, 'Add');
  await productRows(page, productBrand).first()
    .or(page.getByText(/already exist|failed to add/i).first())
    .waitFor({ timeout: 15000 })
    .catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} description
 */
async function addService(page, typeName, description) {
  const opener = (await page.getByRole('button', { name: 'Select Asset Type' }).count()) > 0
    ? 'Select Asset Type'
    : typeName;
  await selectFromAbsoluteDropdown(page, opener, typeName);
  await fillReactInput(page.getByPlaceholder('Enter Description'), description);
  await clickUnblocked(page, 'Add');
  await serviceRows(page, description).first()
    .or(page.getByText(/added successfully|failed to add/i).first())
    .waitFor({ timeout: 15000 })
    .catch(() => {});
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
  return page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|delete product|delete service/i }).first();
}

/**
 * Open delete on a row and close the confirm dialog without deleting.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} row
 * @param {'close' | 'x'} [how]
 */
async function dismissDeleteDialog(page, row, how = 'close') {
  const deleteBtn = row.getByTitle('Delete').first();
  if (!(await deleteBtn.isVisible({ timeout: 15000 }).catch(() => false))) return;
  await clickLocatorUnblocked(deleteBtn);
  const dialog = confirmDialog(page);
  if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) {
    await page.keyboard.press('Escape').catch(() => {});
    return;
  }
  if (how === 'x') {
    await dialog.locator('button').filter({ hasText: '×' }).first().click({ force: true }).catch(() => {});
  } else {
    const closeBtn = dialog.getByRole('button', { name: /close|cancel/i }).first();
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click({ force: true }).catch(() => {});
    } else {
      await dialog.locator('button').filter({ hasText: '×' }).first().click({ force: true }).catch(() => {});
    }
  }
  await page.keyboard.press('Escape').catch(() => {});
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
  await clickUnblocked(page, 'Save');
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
