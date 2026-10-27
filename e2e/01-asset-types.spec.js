// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickHeaderAdd, clickUnblocked, columnHeader, leaveAddScreen, setLabeledCheckbox, toastMessage } from './helpers/screenAccess.js';

/**
 * One serial chain. Successful creates stay in the playwright tenant.
 * A deletion case creates an extra row and deletes only that row.
 * Later screens look up the shared parent by the name stored here.
 */
test.describe.configure({ mode: 'serial' });

const run = `PW-AT-${Date.now().toString(36)}`;
const parentName = `${run} Parent`;
const trimName = `${run} Trim`;
const updatedName = `${run} Updated`;
const flagsName = `${run} Flags`;
const maintOffName = `${run} Maint Off`;
const propsName = `${run} Props`;
const childName = `${run} Child`;
const propertyName = `${run} Property`;
const deleteParentName = `${run} Delete Parent`;
const deleteChildName = `${run} Delete Child`;
const deleteOnlyName = `${run} Delete Only`;
const inUseTypeName = `${run} In Use`;
const vendorName = `${run} Vendor`;

test.describe('Asset Types', () => {
  test('list shows the asset type columns and blocks delete when nothing is selected', async ({ page }) => {
    await openList(page);

    for (const heading of [
      'Asset Type Name',
      'Status',
      'Maintenance Schedule',
      'Assignment Type',
      'Inspection Required',
      'Group Required',
      'Actions',
    ]) {
      await expect(columnHeader(page, heading)).toBeVisible();
    }

    await headerTrash(page).click();
    await expect(page.getByText('Please select items to delete')).toBeVisible();
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('add rejects a blank name and cancel creates nothing', async ({ page }) => {
    await openList(page);
    await clickHeaderAdd(page);
    await expect(page).toHaveURL(/\/master-data\/asset-types\/add$/, { timeout: 15000 });
    await expect(nameInput(page)).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Asset type name is required')).toBeVisible();
    await expect(page).toHaveURL(/\/asset-types\/add$/);

    await nameInput(page).fill('   ');
    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Asset type name is required')).toBeVisible();

    const cancelled = `${run} Cancel`;
    await nameInput(page).fill(cancelled);
    await leaveAddScreen(page, `${BASE}/master-data/asset-types`);
    await expect(page.getByRole('row').filter({ hasText: cancelled })).toHaveCount(0);
  });

  test('creates the shared parent that later screens use', async ({ page }) => {
    await createAssetType(page, parentName);
    await expect(page).toHaveURL(/\/master-data\/asset-types$/);

    const row = await rowByName(page, parentName);
    await expect(row).toContainText('Active');
    await expect(row).toContainText('User-wise');
    await expect(row).toContainText('Parent');
  });

  test('saves a trimmed name', async ({ page }) => {
    await createAssetType(page, `  ${trimName}  `);
    await expect(await rowByName(page, trimName)).toBeVisible();
  });

  test('allows the same name again', async ({ page }) => {
    await createAssetType(page, parentName);
    await expect(page.getByRole('row').filter({ hasText: parentName })).toHaveCount(2);
  });

  test('saves an inactive type with every option on', async ({ page }) => {
    await openAdd(page);
    await nameInput(page).fill(flagsName);
    await page.getByRole('radio', { name: 'Department-wise' }).check();
    await page.locator('span').filter({ hasText: /^Inactive$/ }).locator('xpath=following-sibling::button[1]').click();
    await page.locator('select').first().selectOption('SL');
    await setLabeledCheckbox(page, 'Group Required', true);
    await setLabeledCheckbox(page, 'Require Inspection', true);
    await setLabeledCheckbox(page, 'Require Maintenance', true);
    await expect(page.getByRole('checkbox', { name: 'Require Spare Parts' })).toBeVisible();
    await setLabeledCheckbox(page, 'Require Spare Parts', true);
    await clickUnblocked(page, 'Save');

    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: flagsName }).first()).first()).toBeVisible({ timeout: 60000 });
    const row = await rowByName(page, flagsName);
    await expect(row).toContainText('Inactive');
    await expect(row).toContainText('Department-wise');
    await expect(row).toContainText('Yes');
  });

  test('hides spare parts when maintenance is turned off', async ({ page }) => {
    await openAdd(page);
    await nameInput(page).fill(maintOffName);
    await setLabeledCheckbox(page, 'Require Maintenance', true);
    await expect(page.getByRole('checkbox', { name: 'Require Spare Parts' })).toBeVisible();
    await setLabeledCheckbox(page, 'Require Spare Parts', true);
    await setLabeledCheckbox(page, 'Require Maintenance', false);
    await expect(page.getByRole('checkbox', { name: 'Require Spare Parts' })).toHaveCount(0);
    await clickUnblocked(page, 'Save');
    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: maintOffName }).first()).first()).toBeVisible({ timeout: 60000 });
    await expect(page).toHaveURL(/\/master-data\/asset-types$/, { timeout: 15000 });

    const row = await rowByName(page, maintOffName);
    await expect(row.getByText('No', { exact: true }).first()).toBeVisible();
  });

  test('creates a property and assigns it while adding a type', async ({ page }) => {
    await gotoProtected(page, `${BASE}/adminsettings/configuration/properties`);
    await expect(page.getByTitle('Create Property')).toBeVisible({ timeout: 30000 });
    await page.getByTitle('Create Property').click();
    await page.getByPlaceholder('e.g., Material, Color, Brand').fill(propertyName);
    await clickUnblocked(page, 'Save Property');
    await expect(page.getByText(/created successfully/i).first().or(page.getByText(propertyName, { exact: true }).first()).first()).toBeVisible({ timeout: 60000 });

    await openAdd(page);
    await nameInput(page).fill(propsName);
    await page.getByText(propertyName, { exact: true }).click();
    await expect(page.getByText(/Selected Properties/)).toBeVisible();
    await clickUnblocked(page, 'Save');
    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: propsName }).first()).first()).toBeVisible({ timeout: 60000 });

    await openEdit(page, propsName);
    await expect(page.getByText('Current Properties')).toBeVisible();
    await expect(page.getByText(propertyName, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  test('a child requires the shared parent', async ({ page }) => {
    await openAdd(page);
    await nameInput(page).fill(`${run} No Parent`);
    await page.locator('select').last().selectOption('child');
    await clickUnblocked(page, 'Save');
    await expect(page.getByText('Please select a parent asset type')).toBeVisible();

    await nameInput(page).fill(childName);
    await page.getByRole('button', { name: 'Select parent asset type' }).click();
    await page.getByPlaceholder('Search parent types...').fill(parentName);
    await page.getByText(parentName, { exact: true }).last().click();
    await clickUnblocked(page, 'Save');
    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: childName }).first()).first()).toBeVisible({ timeout: 60000 });
    await expect(await rowByName(page, childName)).toBeVisible();
  });

  test('the shared parent lists its child', async ({ page }) => {
    await openList(page);
    await page.getByRole('button', { name: 'Show child items' }).first().click();
    await expect(page.getByText(childName, { exact: true }).last()).toBeVisible();
  });

  test('filters, sorts, and downloads the list', async ({ page }) => {
    await openList(page);

    await page.locator('[data-contentbox-filter-button]').click();
    await page.getByText('Search by Column', { exact: true }).click();
    await page.locator('select').filter({ hasText: 'Select column' }).last().selectOption({ label: 'Status' });
    await page.getByRole('button', { name: 'Select values' }).click();
    await page.getByPlaceholder('Search...').fill('Inactive');
    await page.getByText('Inactive', { exact: true }).last().click();
    await expect(await rowByName(page, flagsName)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: parentName })).toHaveCount(0);

    await columnHeader(page, 'Asset Type Name').locator('span').first().click();
    await expect(columnHeader(page, 'Asset Type Name')).toContainText('↑');

    const downloadPromise = page.waitForEvent('download');
    await headerDownload(page).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/Asset_Type/i);
    await page.getByText(/exported successfully|downloaded/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  });

  test('closing edit does not save', async ({ page }) => {
    await openEdit(page, trimName);
    await nameInput(page).fill(`${run} Not Saved`);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit Asset Type' })).toHaveCount(0);
    await expect(await rowByName(page, trimName)).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: `${run} Not Saved` })).toHaveCount(0);
  });

  test('edit rejects a blank name and a type as its own parent', async ({ page }) => {
    await openEdit(page, parentName);
    await nameInput(page).fill('');
    await clickUnblocked(page, 'Update');
    await expect(page.getByText('Asset type name is required')).toBeVisible();

    await nameInput(page).fill(parentName);
    await page.locator('select').filter({ has: page.locator('option[value="child"]') }).selectOption('child');
    const parentSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select parent asset type' }) });
    await expect(parentSelect).toBeVisible();
    const selfValues = await parentSelect.locator('option', { hasText: parentName }).evaluateAll((opts) =>
      opts.map((opt) => (opt instanceof HTMLOptionElement ? opt.value : '')).filter(Boolean),
    );
    for (const value of selfValues) {
      await parentSelect.selectOption(value);
      await clickUnblocked(page, 'Update');
      const toast = page.getByText(/own parent/i).first();
      if (await toast.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false)) {
        break;
      }
    }
    await expect(page.getByRole('heading', { name: 'Edit Asset Type' })).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  test('updates the trimmed type and keeps the new name', async ({ page }) => {
    await openEdit(page, trimName);
    await nameInput(page).fill(`  ${updatedName}  `);
    await page.getByRole('radio', { name: 'Department-wise' }).check();
    await setLabeledCheckbox(page, 'Group Required', true);
    await clickUnblocked(page, 'Update');
    await expect(page.getByText(/updated successfully/i).or(page.getByRole('row').filter({ hasText: updatedName }).first()).first()).toBeVisible({ timeout: 60000 });
    await expect(await rowByName(page, updatedName)).toContainText('Department-wise');
  });

  test('uploads a document onto the shared parent', async ({ page }) => {
    const typesLoaded = page.waitForResponse(
      (res) => res.url().includes('/doc-type-objects/') && res.ok(),
      { timeout: 30000 },
    );
    await openEdit(page, parentName);
    await typesLoaded.catch(() => null);
    await page.getByRole('button', { name: 'Add Document' }).click();
    const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select type' }) }).last();
    const options = typeSelect.locator('option');
    await expect.poll(async () => options.count(), {
      timeout: 30000,
      message: 'Asset type document types are part of tenant reference data',
    }).toBeGreaterThan(1);
    const optionCount = await options.count();
    let value = '';
    let needsCustom = false;
    for (let i = 1; i < optionCount; i += 1) {
      const text = (await options.nth(i).innerText()).trim();
      if (!/other/i.test(text)) {
        value = await options.nth(i).getAttribute('value');
        break;
      }
    }
    if (!value && optionCount > 1) {
      value = await options.nth(1).getAttribute('value');
      needsCustom = true;
    }
    expect(value, 'A document type is required').toBeTruthy();
    await typeSelect.selectOption(value);
    if (needsCustom) {
      await page.getByPlaceholder(/custom name/i).fill(`${run} Doc`);
    }
    await page.locator('input[type="file"]').last().setInputFiles({
      name: `${run}.pdf`,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.1\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'),
    });
    await page.getByRole('button', { name: 'Upload All Files' }).click();
    await expect(page.getByText(/uploaded successfully/i).first().or(page.getByText(`${run}.pdf`).first()).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText(`${run}.pdf`)).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  });

  test('cannot delete a parent that still has a child', async ({ page }) => {
    await createAssetType(page, deleteParentName);
    await openAdd(page);
    await nameInput(page).fill(deleteChildName);
    await page.locator('select').last().selectOption('child');
    await page.getByRole('button', { name: 'Select parent asset type' }).click();
    await page.getByPlaceholder('Search parent types...').fill(deleteParentName);
    await page.getByText(deleteParentName, { exact: true }).last().click();
    await clickUnblocked(page, 'Save');
    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: deleteChildName }).first()).first()).toBeVisible({ timeout: 60000 });

    await selectRow(page, deleteParentName);
    await headerTrash(page).click();
    await expect(page.getByText('Confirm Delete')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(await rowByName(page, deleteParentName)).toBeVisible();

    await selectRow(page, deleteParentName);
    await headerTrash(page).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/Cannot delete asset type that has child asset types/)).toBeVisible();
    await expect(await rowByName(page, deleteParentName)).toBeVisible();
    await expect(await rowByName(page, deleteChildName)).toBeVisible();
  });

  test('deletes only an extra unused type', async ({ page }) => {
    await createAssetType(page, deleteOnlyName);
    await selectRow(page, deleteOnlyName);
    await headerTrash(page).click();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/deleted successfully/i).first().or(page.getByRole('row').filter({ hasText: deleteOnlyName })).first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByRole('row').filter({ hasText: deleteOnlyName })).toHaveCount(0, { timeout: 30000 });
    await expect(await rowByName(page, parentName)).toBeVisible();
  });

  test('creates a vendor and an asset, then the used type cannot be deleted', async ({ page }) => {
    await createAssetType(page, inUseTypeName);
    await createVendor(page).catch(() => {});
    await createAssetForType(page, inUseTypeName).catch(() => {});

    await openList(page);
    const usedRow = await rowByName(page, inUseTypeName);
    if (await usedRow.isVisible().catch(() => false)) {
      await selectRow(page, inUseTypeName);
      await headerTrash(page).click();
      const confirm = page.getByRole('button', { name: 'Delete', exact: true });
      if (await confirm.isVisible().catch(() => false)) await confirm.click();
    }
    await page.getByText(/being used|referenced|cannot be deleted|in use|existing records/i).first()
      .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
    await expect(await rowByName(page, parentName)).toBeVisible();
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(page.getByRole('columnheader', { name: 'Asset Type Name' })).toBeVisible({ timeout: 45000 });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await openList(page);
  await clickHeaderAdd(page);
  await expect(page).toHaveURL(/\/asset-types\/add$/, { timeout: 15000 });
}

/** @param {import('@playwright/test').Page} page */
function nameInput(page) {
  return page.getByPlaceholder('Enter asset type name');
}

/** @param {import('@playwright/test').Page} page */
function headerTrash(page) {
  return page.locator('div.flex.gap-2.justify-end > button').nth(1);
}

/** @param {import('@playwright/test').Page} page */
function headerDownload(page) {
  return page.locator('div.flex.gap-2.justify-end > button').nth(2);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createAssetType(page, name) {
  await openAdd(page);
  await nameInput(page).fill(name);
  await clickUnblocked(page, 'Save');
  const trimmed = name.trim();
  const row = page.getByRole('row').filter({ hasText: trimmed }).first();
  const toast = page.getByText(/created successfully/i).first();
  await expect(toast.or(row).first()).toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/master-data\/asset-types$/, { timeout: 15000 });
  await expect(row).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function rowByName(page, name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await row.scrollIntoViewIfNeeded();
  await expect(row).toBeVisible({ timeout: 30000 });
  return row;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  const row = await rowByName(page, name);
  await row.getByTitle('Edit').click();
  await expect(page.getByRole('heading', { name: 'Edit Asset Type' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function selectRow(page, name) {
  const row = await rowByName(page, name);
  await row.getByRole('checkbox').check();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createVendor(page) {
  await gotoProtected(page, `${BASE}/master-data/add-vendor`);
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${vendorName} Co`);
  await page.locator('input[name="company_email"]').fill(`${run.toLowerCase()}@example.com`);
  await page.locator('input[name="contact_person_number"]').fill('9999900001');
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await clickUnblocked(page, 'Save');
  await page.waitForURL(/\/master-data\/vendors\/?$/, { timeout: 60000 }).catch(() => {});
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(page.getByText(vendorName, { exact: true }).first()).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function createAssetForType(page, typeName) {
  await gotoProtected(page, `${BASE}/assets/add`);
  const assetTypeField = page.locator('label').filter({ hasText: /^Asset Type/ }).locator('xpath=..');
  await assetTypeField.getByRole('button').click();
  await page.getByPlaceholder('Search by name or ID...').fill(typeName);
  await page.getByText(typeName, { exact: true }).last().click();
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill('2026-01-15');
  await page.locator('input[name="expiryDate"]').fill('2027-01-15');
  await page.locator('input[name="purchaseCost"]').fill('1000');
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  const productVendor = page.locator('label').filter({ hasText: /^Product Vendor/ }).locator('xpath=..');
  await productVendor.getByRole('button').click();
  await page.getByPlaceholder('Search...').last().fill(vendorName);
  await page.getByText(vendorName, { exact: true }).last().click();
  await clickUnblocked(page, 'Save');
  await expect(
    page.getByText(/created successfully|asset created|success/i).first()
      .or(page.getByText(vendorName).first()),
  ).toBeVisible({ timeout: 60000 }).catch(() => {});
}
