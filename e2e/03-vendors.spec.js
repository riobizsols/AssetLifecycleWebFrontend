// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, headerAddButton, leaveAddScreen } from './helpers/screenAccess.js';

/**
 * One serial chain. The vendor created for this run stays in the playwright tenant.
 * A deletion case creates an extra vendor and deletes only that vendor.
 * A vendor linked to a product stays, because that delete is rejected.
 */
test.describe.configure({ mode: 'serial' });

const run = `PW-VN-${Date.now().toString(36)}`;
const vendorName = `${run} Vendor`;
const companyName = `${run} Company`;
const email = `${run.toLowerCase()}@example.com`;
const updatedName = `${run} Updated`;
const cancelledName = `${run} Cancel`;
const deleteName = `${run} Delete`;
const deleteEmail = `${run.toLowerCase()}.delete@example.com`;
const linkedName = `${run} Linked`;
const linkedEmail = `${run.toLowerCase()}.linked@example.com`;
const productBrand = `${run} Brand`;
const productModel = `${run} Model`;
const contactName = `${run} Contact`;
const phone = '9999900001';

/** @type {string} */
let assetTypeName = '';

test.describe('Vendors', () => {
  test('the list has filter, add, delete, and download, and hides Vendor ID', async ({ page }) => {
    await openList(page);

    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();

    for (const heading of [
      'Vendor Name',
      'Company',
      'Status',
      'GST Number',
      'CIN Number',
      'Company Email',
      'Actions',
    ]) {
      await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Vendor ID', exact: true })).toHaveCount(0);

    await headerTrash(page).click();
    await expect(page.getByText('Please select items to delete')).toBeVisible();
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('add vendor blocks empty fields, a bad email, a short number, and a contract end before the start', async ({ page }) => {
    await openAdd(page);
    await expect(page.getByRole('button', { name: 'Vendor Details' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Attachments' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Product Details' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Service Details' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Spare Supply' })).toHaveCount(0);

    await clickUnblocked(page, 'Save');
    await expect(page.locator('input[name="vendor_name"]')).toHaveClass(/border-red/, { timeout: 10000 });
    await expect(page.locator('[data-rht-toaster] [role="status"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('input[name="contact_person_number"]')).toHaveClass(/border-red/);

    await fillVendor(page, {
      name: cancelledName,
      company: `${cancelledName} Co`,
      email: 'not-an-email',
      contact: contactName,
      phone,
    });
    await clickUnblocked(page, 'Save');
    const emailInput = page.locator('input[name="company_email"]');
    await expect.poll(async () => {
      const nativeInvalid = await emailInput.evaluate((el) => el instanceof HTMLInputElement && !el.validity.valid);
      const marked = /border-red/.test(await emailInput.getAttribute('class') || '');
      const toast = await page.locator('[data-rht-toaster] [role="status"]').first().isVisible().catch(() => false);
      return nativeInvalid || marked || toast;
    }, { timeout: 10000 }).toBeTruthy();
    await expect(page).toHaveURL(/add-vendor/);

    await page.locator('input[name="company_email"]').fill(email);
    await page.locator('input[name="contact_person_number"]').fill('12345');
    await clickUnblocked(page, 'Save');
    await expect.poll(async () => {
      const phoneInput = page.locator('input[name="contact_person_number"]');
      const nativeInvalid = await phoneInput.evaluate((el) => el instanceof HTMLInputElement && !el.validity.valid);
      const marked = /border-red/.test(await phoneInput.getAttribute('class') || '');
      const toast = await page.getByText(/contact number|10 digits|valid/i).first().isVisible().catch(() => false);
      return nativeInvalid || marked || toast;
    }, { timeout: 10000 }).toBeTruthy();
    await expect(page).toHaveURL(/add-vendor/);

    await page.locator('input[name="contact_person_number"]').fill(phone);
    await page.locator('input[name="contract_end_date"]').fill('2026-01-01');
    await page.locator('input[name="contract_start_date"]').fill('2026-06-01');
    await clickUnblocked(page, 'Save');
    await expect(page.locator('[data-rht-toaster] [role="status"]').first()).toBeVisible({ timeout: 10000 });

    await page.locator('input[name="contract_start_date"]').fill('');
    await page.locator('input[name="contract_end_date"]').fill('');
    await leaveAddScreen(page, `${BASE}/master-data/vendors`);
    await expect(vendorRow(page, cancelledName)).toHaveCount(0);
  });

  test('creates the vendor that stays in the tenant', async ({ page }) => {
    await openAdd(page);
    await expect(page.getByRole('checkbox', { name: 'Product Supply' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Service Supply' })).not.toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Spare Supply' })).not.toBeChecked();
    await fillVendor(page, { name: vendorName, company: companyName, email, contact: contactName, phone });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Vendor created successfully!')).toBeVisible({ timeout: 60000 });
    await expect(page).toHaveURL(/\/master-data\/vendors$/, { timeout: 60000 });
    const row = vendorRow(page, vendorName);
    await expect(row).toContainText(companyName);
    await expect(row).toContainText(email);
    await expect(row).toContainText('Active');
    await expect(row.getByTitle('Edit')).toBeVisible();
    await expect(row.getByRole('checkbox')).toBeVisible();
    await expect(row.getByTitle('Delete')).toHaveCount(0);
  });

  test('filters by vendor name and status, then clears the filter', async ({ page }) => {
    await openList(page);
    await addColumnFilter(page, 'Vendor Name', vendorName);
    await expect(vendorRow(page, vendorName)).toBeVisible();
    await clearFilters(page);
    await expect(vendorRow(page, vendorName)).toBeVisible();

    await addColumnFilter(page, 'Status', 'Active');
    await expect(vendorRow(page, vendorName)).toContainText('Active');
    await clearFilters(page);

    await addColumnFilter(page, 'Status', 'Inactive');
    await expect(vendorRow(page, vendorName)).toHaveCount(0);
    await clearFilters(page);
    await expect(vendorRow(page, vendorName)).toBeVisible();

    await page.locator('[data-contentbox-filter-button]').click();
    await page.getByText('Search by Column', { exact: true }).click();
    await page.locator('select').last().selectOption({ label: 'Vendor Name' });
    await page.getByRole('button', { name: 'Select values' }).click();
    const search = page.getByPlaceholder('Search...');
    await search.fill('zzzz-no-vendor');
    const menu = search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]');
    await expect(menu.getByText(vendorName, { exact: true })).toHaveCount(0);
    await page.locator('[data-contentbox-filter-button]').click();
    await expect(vendorRow(page, vendorName)).toBeVisible();
  });

  test('sorts vendor name ascending, descending, then off', async ({ page }) => {
    await openList(page);
    const header = page.getByRole('columnheader', { name: 'Vendor Name', exact: true });
    await header.click();
    await expect(header).toContainText('↑');
    await header.click();
    await expect(header).toContainText('↓');
    await header.click();
    await expect(header).not.toContainText('↑');
    await expect(header).not.toContainText('↓');
  });

  test('downloads the full list and the filtered list', async ({ page }) => {
    await openList(page);
    const allDownload = page.waitForEvent('download');
    await headerDownload(page).click();
    const allFile = await allDownload;
    expect(allFile.suggestedFilename()).toContain('Vendors_List');
    expect(allFile.suggestedFilename()).toContain('.xlsx');
    await expect(page.getByText('Vendors exported successfully')).toBeVisible();

    await addColumnFilter(page, 'Vendor Name', vendorName);
    const filteredDownload = page.waitForEvent('download');
    await headerDownload(page).click();
    const filteredFile = await filteredDownload;
    const workbook = XLSX.readFile(await filteredFile.path());
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    expect(sheet.length).toBeGreaterThan(0);
    expect(sheet.every((row) => row['Vendor Name'] === vendorName)).toBeTruthy();
  });

  test('closing delete leaves the vendor, and the row has no delete icon', async ({ page }) => {
    await openList(page);
    const row = vendorRow(page, vendorName);
    await row.getByRole('checkbox').check();
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
    await expect(dialog).toContainText('Are you sure you want to delete this item?');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(row).toBeVisible();
    await expect(row.getByTitle('Delete')).toHaveCount(0);
  });

  test('edit rejects a blank name, a bad email, a short number, a short pincode, and a reversed contract', async ({ page }) => {
    await openEdit(page, vendorName);
    await expect(page.locator('input[name="vendor_name"]')).toHaveValue(vendorName);
    await expect(page.locator('input[name="company_name"]')).toHaveValue(companyName);
    await expect(page.locator('input[name="company_email"]')).toHaveValue(email);
    await expect(page.getByRole('button', { name: 'Update', exact: true })).toBeVisible();
    await page.locator('#edit-vendor-form').evaluate((form) => {
      form.noValidate = true;
    });

    await page.locator('input[name="vendor_name"]').fill('');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Vendor name, company name and company email are required')).toBeVisible();
    await expect(page.getByText('Edit Vendor', { exact: true })).toBeVisible();

    await page.locator('input[name="vendor_name"]').fill(vendorName);
    await page.locator('input[name="company_email"]').fill('not-an-email');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Please enter a valid company email')).toBeVisible();

    await page.locator('input[name="company_email"]').fill(email);
    await page.locator('input[name="contact_person_number"]').fill('12345');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Contact number should be 10 digits')).toBeVisible();

    await page.locator('input[name="contact_person_number"]').fill(phone);
    await page.locator('input[name="pincode"]').fill('123');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Pincode should be 6 digits')).toBeVisible();
    await page.locator('input[name="pincode"]').fill('');

    await page.locator('input[name="contract_end_date"]').fill('2026-01-01');
    await page.locator('input[name="contract_start_date"]').fill('2026-06-01');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Contract end date cannot be earlier than contract start date')).toBeVisible();
    await page.locator('input[name="contract_start_date"]').fill('');
    await page.locator('input[name="contract_end_date"]').fill('');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(vendorRow(page, vendorName)).toBeVisible();
  });

  test('renames the vendor and sets it inactive, then sets it back to active', async ({ page }) => {
    await openEdit(page, vendorName);
    await page.locator('input[name="vendor_name"]').fill(updatedName);
    await page.locator('select[name="int_status"]').selectOption('0');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Vendor updated successfully')).toBeVisible();
    await expect(page.getByText('Edit Vendor', { exact: true })).toHaveCount(0);
    await expect(vendorRow(page, updatedName)).toContainText('Inactive');

    await openEdit(page, updatedName);
    await page.locator('select[name="int_status"]').selectOption('1');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Vendor updated successfully')).toBeVisible();
    const row = vendorRow(page, updatedName);
    await expect(row).toContainText('Active');
    await expect(row).toContainText(email);
  });

  test('closing edit without Update keeps the saved name', async ({ page }) => {
    await openEdit(page, updatedName);
    await page.locator('input[name="vendor_name"]').fill(`${run} Not Saved`);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(vendorRow(page, updatedName)).toBeVisible();

    await openEdit(page, updatedName);
    await page.locator('input[name="vendor_name"]').fill(`${run} Not Saved`);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(vendorRow(page, updatedName)).toBeVisible();

    await openEdit(page, updatedName);
    await page.locator('input[name="vendor_name"]').fill(`${run} Not Saved`);
    await page.keyboard.press('Escape');
    await expect(page.getByText('Edit Vendor', { exact: true })).toHaveCount(0);
    await expect(vendorRow(page, updatedName)).toBeVisible();

    await openEdit(page, updatedName);
    await page.locator('input[name="vendor_name"]').fill(`${run} Not Saved`);
    await page.locator('div.fixed.inset-0').click({ position: { x: 8, y: 8 } });
    await expect(page.getByText('Edit Vendor', { exact: true })).toHaveCount(0);
    await expect(vendorRow(page, updatedName)).toBeVisible();
    await expect(vendorRow(page, `${run} Not Saved`)).toHaveCount(0);
  });

  test('deletes only an extra vendor', async ({ page }) => {
    await openAdd(page);
    await fillVendor(page, {
      name: deleteName,
      company: `${deleteName} Co`,
      email: deleteEmail,
      contact: contactName,
      phone,
    });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Vendor created successfully!')).toBeVisible({ timeout: 60000 });

    await openEdit(page, deleteName);
    await page.locator('select[name="int_status"]').selectOption('0');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(vendorRow(page, deleteName)).toContainText('Inactive');

    await openEdit(page, deleteName);
    await page.locator('select[name="int_status"]').selectOption('1');
    await page.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(vendorRow(page, deleteName)).toContainText('Active');

    await vendorRow(page, deleteName).getByRole('checkbox').check();
    await headerTrash(page).click();
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('1 vendor(s) deleted successfully')).toBeVisible();
    await expect(vendorRow(page, deleteName)).toHaveCount(0);
    await expect(vendorRow(page, updatedName)).toBeVisible();
  });

  test('a vendor linked to a product cannot be deleted', async ({ page }) => {
    assetTypeName = await reuseOrCreateAssetType(page);
    await createProduct(page, assetTypeName, productBrand, productModel);
    await openAdd(page);
    await fillVendor(page, {
      name: linkedName,
      company: `${linkedName} Co`,
      email: linkedEmail,
      contact: contactName,
      phone,
    });
    await page.getByRole('checkbox', { name: 'Product Supply' }).check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('Vendor created successfully!')).toBeVisible({ timeout: 60000 });
    await linkProduct(page, linkedName, assetTypeName, productBrand, productModel);

    await openList(page);
    await vendorRow(page, linkedName).getByRole('checkbox').check();
    await headerTrash(page).click();
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Cannot delete vendors with associated records')).toBeVisible();
    await expect(page.getByText(new RegExp(`${linkedName}.*products/services`))).toBeVisible();
    await expect(vendorRow(page, linkedName)).toBeVisible();
    await expect(vendorRow(page, updatedName)).toBeVisible();
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(page.getByRole('columnheader', { name: 'Vendor Name', exact: true })).toBeVisible({ timeout: 45000 });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await openList(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/master-data\/add-vendor$/);
  await expect(page.locator('input[name="vendor_name"]')).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  await vendorRow(page, name).getByTitle('Edit').click();
  await expect(page.getByText('Edit Vendor', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function vendorRow(page, name) {
  return page.getByRole('row').filter({ hasText: name });
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
 * @param {{ name: string, company: string, email: string, contact: string, phone: string }} vendor
 */
async function fillVendor(page, vendor) {
  await page.locator('input[name="vendor_name"]').fill(vendor.name);
  await page.locator('input[name="company_name"]').fill(vendor.company);
  await page.locator('input[name="company_email"]').fill(vendor.email);
  await page.locator('input[name="contact_person_name"]').fill(vendor.contact);
  await page.locator('input[name="contact_person_number"]').fill(vendor.phone);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 * @param {string} value
 */
async function addColumnFilter(page, columnLabel, value) {
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  await page.locator('select').last().selectOption({ label: columnLabel });
  await page.getByRole('button', { name: 'Select values' }).click();
  const search = page.getByPlaceholder('Search...');
  await search.fill(value);
  const menu = search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]');
  await menu.getByText(value, { exact: true }).click();
}

/** @param {import('@playwright/test').Page} page */
async function clearFilters(page) {
  const remove = page.locator('div.flex.items-center.border.rounded.bg-gray-50 > button');
  const count = await remove.count();
  for (let i = 0; i < count; i += 1) {
    await remove.first().click();
  }
}

/** @param {import('@playwright/test').Page} page */
async function reuseOrCreateAssetType(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(page.getByRole('columnheader', { name: 'Asset Type Name' })).toBeVisible({ timeout: 45000 });
  const existing = page.getByRole('cell', { name: /PW-(AT|PS)-\S+/ });
  if ((await existing.count()) > 0) {
    return (await existing.first().innerText()).trim();
  }
  const name = `${run} Type`;
  await headerAddButton(page).click();
  await page.getByPlaceholder('Enter asset type name').fill(name);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(`Asset type "${name}" created successfully`)).toBeVisible({ timeout: 60000 });
  return name;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} brand
 * @param {string} model
 */
async function createProduct(page, typeName, brand, model) {
  await gotoProtected(page, `${BASE}/master-data/prod-serv`);
  await expect(page.getByText('Product / Service', { exact: true }).first()).toBeVisible({ timeout: 45000 });
  await page.getByRole('button', { name: 'Select Asset Type', exact: true }).click();
  const search = page.getByPlaceholder('Search Asset Types...');
  await search.fill(typeName);
  await search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]').getByText(typeName, { exact: true }).click();
  await page.getByPlaceholder('Enter Brand').fill(brand);
  await page.getByPlaceholder('Enter Model').fill(model);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText('Product added successfully')).toBeVisible({ timeout: 60000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} typeName
 * @param {string} brand
 * @param {string} model
 */
async function linkProduct(page, name, typeName, brand, model) {
  await openEdit(page, name);
  await page.getByRole('checkbox', { name: 'Product Supply' }).check();
  await page.getByText('Product Details', { exact: true }).click();
  await chooseFixedOption(page, 'Select Asset Type', typeName);
  await chooseFixedOption(page, 'Select Brand', brand);
  await chooseFixedOption(page, 'Select Model', model);
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
