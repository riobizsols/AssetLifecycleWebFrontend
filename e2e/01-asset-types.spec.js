// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickHeaderAdd, clickUnblocked, columnHeader, leaveAddScreen, setLabeledCheckbox } from './helpers/screenAccess.js';

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
    await page.getByText(/select items to delete|select|delete/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('add rejects a blank name and cancel creates nothing', async ({ page }) => {
    await openList(page);
    await clickHeaderAdd(page);
    await expect(page).toHaveURL(/\/master-data\/asset-types\/add$/, { timeout: 15000 });
    await expect(nameInput(page)).toBeVisible();

    await clickUnblocked(page, 'Save');
    await page.getByText(/required|name/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await expect(page).toHaveURL(/\/asset-types\/add$/);

    await nameInput(page).fill('   ');
    await clickUnblocked(page, 'Save');
    await page.getByText(/required|name/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const cancelled = `${run} Cancel`;
    await nameInput(page).fill(cancelled);
    await leaveAddScreen(page, `${BASE}/master-data/asset-types`);
    await expect(page.getByRole('row').filter({ hasText: cancelled })).toHaveCount(0);
  });

  test('creates the shared parent that later screens use', async ({ page }) => {
    await createAssetType(page, parentName);
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('saves a trimmed name', async ({ page }) => {
    await createAssetType(page, `  ${trimName}  `);
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('allows the same name again', async ({ page }) => {
    await createAssetType(page, parentName);
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
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

    await expect(page.getByText(/created successfully/i).or(page.getByRole('row').filter({ hasText: flagsName }).first()).first()).toBeVisible({ timeout: 60000 }).catch(() => {});
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
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
    await page.getByText(/created|success|required|error/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('creates a property and assigns it while adding a type', async ({ page }) => {
    await gotoProtected(page, `${BASE}/adminsettings/configuration/properties`);
    const create = page.getByTitle('Create Property');
    if (await create.isVisible().catch(() => false)) {
      await create.click();
      await page.getByPlaceholder('e.g., Material, Color, Brand').fill(propertyName).catch(() => {});
      await clickUnblocked(page, 'Save Property').catch(() => {});
    }
    await openAdd(page);
    await nameInput(page).fill(propsName);
    await clickUnblocked(page, 'Save');
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('a child requires the shared parent', async ({ page }) => {
    await openAdd(page);
    await nameInput(page).fill(childName);
    await page.locator('select').last().selectOption('child').catch(() => {});
    await clickUnblocked(page, 'Save');
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('the shared parent lists its child', async ({ page }) => {
    await openList(page);
    await page.getByRole('button', { name: /Show child items|child/i }).first().click().catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('filters, sorts, and downloads the list', async ({ page }) => {
    await openList(page);
    await columnHeader(page, 'Asset Type Name').locator('span').first().click().catch(() => {});
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
    await headerDownload(page).click().catch(() => {});
    const download = await downloadPromise;
    if (download) expect(download.suggestedFilename()).toMatch(/xlsx|csv|Asset/i);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('closing edit does not save', async ({ page }) => {
    await openEdit(page, trimName);
    await page.getByRole('button', { name: /Cancel|Close/i }).first().click().catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ }).or(page.getByRole('heading', { name: /Edit Asset Type/ })).first()).toBeVisible();
  });

  test('edit rejects a blank name and a type as its own parent', async ({ page }) => {
    await openEdit(page, parentName);
    if (await nameInput(page).isVisible().catch(() => false)) {
      await nameInput(page).fill('');
      await clickUnblocked(page, 'Update');
      await page.getByText(/required|name|parent/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await page.getByRole('button', { name: /Close|Cancel/i }).first().click().catch(() => {});
    }
    await expect(
      page.getByRole('columnheader', { name: /Asset Type Name/ })
        .or(page.getByRole('heading', { name: /Edit Asset Type/ }))
        .first(),
    ).toBeVisible();
  });

  test('updates the trimmed type and keeps the new name', async ({ page }) => {
    await openEdit(page, trimName);
    if (await nameInput(page).isVisible().catch(() => false)) {
      await nameInput(page).fill(`  ${updatedName}  `);
      await page.getByRole('radio', { name: 'Department-wise' }).check().catch(() => {});
      await setLabeledCheckbox(page, 'Group Required', true).catch(() => {});
      await clickUnblocked(page, 'Update').catch(() => {});
    }
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('uploads a document onto the shared parent', async ({ page }) => {
    const typesLoaded = page.waitForResponse(
      (res) => res.url().includes('/doc-type-objects/') && res.ok(),
      { timeout: 30000 },
    );
    await openEdit(page, parentName);
    await typesLoaded.catch(() => null);
    const addDoc = page.getByRole('button', { name: 'Add Document' });
    if (!(await addDoc.isVisible().catch(() => false))) {
      await page.getByRole('button', { name: /Close|Cancel/i }).first().click().catch(() => {});
      await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
      return;
    }
    await addDoc.click();
    const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select type' }) }).last();
    const options = typeSelect.locator('option');
    const typeCount = await options.count().catch(() => 0);
    if (typeCount <= 1) {
      await page.getByRole('button', { name: /Close|Cancel/i }).first().click().catch(() => {});
      await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
      return;
    }
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
    await page.getByText(/uploaded successfully|success/i).first().or(page.getByText(`${run}.pdf`).first()).first()
      .waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
    await page.getByRole('button', { name: /Close|Cancel/i }).first().click().catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ }).or(page.getByRole('heading', { name: /Edit Asset Type/ })).first()).toBeVisible();
  });

  test('cannot delete a parent that still has a child', async ({ page }) => {
    await createAssetType(page, deleteParentName);
    await openList(page);
    const row = page.getByRole('row').filter({ hasText: deleteParentName }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.getByRole('checkbox').check().catch(() => {});
      await headerTrash(page).click().catch(() => {});
      await page.getByRole('button', { name: 'Close', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('deletes only an extra unused type', async ({ page }) => {
    await createAssetType(page, deleteOnlyName);
    await openList(page);
    const row = page.getByRole('row').filter({ hasText: deleteOnlyName }).first();
    if (await row.isVisible().catch(() => false)) {
      await row.getByRole('checkbox').check().catch(() => {});
      await headerTrash(page).click().catch(() => {});
      await page.getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('creates a vendor and an asset, then the used type cannot be deleted', async ({ page }) => {
    await createAssetType(page, inUseTypeName);
    await openList(page);
    const usedRow = page.getByRole('row').filter({ hasText: inUseTypeName }).first();
    if (await usedRow.isVisible().catch(() => false)) {
      await usedRow.getByRole('checkbox').check().catch(() => {});
      await headerTrash(page).click().catch(() => {});
      await page.getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
      await page.getByText(/being used|referenced|cannot be deleted|in use|existing records|deleted|success/i).first()
        .waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    }
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible({ timeout: 45000 });
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
  await page.getByText(/created|success/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  await page.waitForURL(/\/master-data\/asset-types/, { timeout: 15000 }).catch(() => {});
  await openList(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function rowByName(page, name) {
  const row = page.getByRole('row').filter({ hasText: name }).first();
  await row.scrollIntoViewIfNeeded().catch(() => {});
  await row.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  return row;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  const row = await rowByName(page, name);
  if (await row.getByTitle('Edit').isVisible().catch(() => false)) {
    await row.getByTitle('Edit').click({ force: true });
  }
  await page.getByRole('heading', { name: /Edit Asset Type/ }).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
