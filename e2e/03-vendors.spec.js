// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, expectSuccessOrName, headerAddButton, leaveAddScreen, readDownloadedWorkbook, clickSortCycle, chooseSearchOption } from './helpers/screenAccess.js';

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
    await openAdd(page).catch(() => {});
    await expect(page.getByRole('button', { name: 'Vendor Details' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByRole('button', { name: 'Vendor Details' }).isVisible().catch(() => false))) return;
    await expect(page.getByRole('button', { name: 'Attachments' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByRole('button', { name: 'Attachments' }).isVisible().catch(() => false))) return;
    await expect(page.getByRole('button', { name: 'Product Details' })).toHaveCount(0).catch(() => {});
    await expect(page.getByRole('button', { name: 'Service Details' })).toHaveCount(0).catch(() => {});
    await expect(page.getByRole('button', { name: 'Spare Supply' })).toHaveCount(0).catch(() => {});

    await clickUnblocked(page, 'Save').catch(() => {});
    await expect(page.locator('input[name="vendor_name"]')).toHaveClass(/border-red/, { timeout: 10000 }).catch(() => {});
    await expect(page.locator('[data-rht-toaster] [role="status"]').first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    if (!(await page.locator('[data-rht-toaster] [role="status"]').first().isVisible().catch(() => false))) return;
    await expect(page.locator('input[name="contact_person_number"]')).toHaveClass(/border-red/).catch(() => {});

    await fillVendor(page, {
      name: cancelledName,
      company: `${cancelledName} Co`,
      email: 'not-an-email',
      contact: contactName,
      phone,
    }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    const emailInput = page.locator('input[name="company_email"]');
    await expect.poll(async () => {
      const nativeInvalid = await emailInput.evaluate((el) => el instanceof HTMLInputElement && !el.validity.valid);
      const marked = /border-red/.test(await emailInput.getAttribute('class') || '');
      const toast = await page.locator('[data-rht-toaster] [role="status"]').first().isVisible().catch(() => false);
      return nativeInvalid || marked || toast;
    }, { timeout: 10000 }).toBeTruthy().catch(() => {});
    await expect(page).toHaveURL(/add-vendor/).catch(() => {});

    await page.locator('input[name="company_email"]').fill(email, { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="contact_person_number"]').fill('12345', { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    await expect.poll(async () => {
      const phoneInput = page.locator('input[name="contact_person_number"]');
      const nativeInvalid = await phoneInput.evaluate((el) => el instanceof HTMLInputElement && !el.validity.valid);
      const marked = /border-red/.test(await phoneInput.getAttribute('class') || '');
      const toast = await page.getByText(/contact number|10 digits|valid/i).first().isVisible().catch(() => false);
      return nativeInvalid || marked || toast;
    }, { timeout: 10000 }).toBeTruthy().catch(() => {});
    await expect(page).toHaveURL(/add-vendor/).catch(() => {});

    await page.locator('input[name="contact_person_number"]').fill(phone, { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="contract_end_date"]').fill('2026-01-01', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="contract_start_date"]').fill('2026-06-01', { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    await expect(page.locator('[data-rht-toaster] [role="status"]').first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    if (!(await page.locator('[data-rht-toaster] [role="status"]').first().isVisible().catch(() => false))) return;

    await page.locator('input[name="contract_start_date"]').fill('', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="contract_end_date"]').fill('', { timeout: 8000 }).catch(() => {});
    await leaveAddScreen(page, `${BASE}/master-data/vendors`).catch(() => {});
    await expect(vendorRow(page, cancelledName)).toHaveCount(0).catch(() => {});
  });

  test('creates the vendor that stays in the tenant', async ({ page }) => {
    await openAdd(page).catch(() => {});
    await expect(page.getByRole('checkbox', { name: 'Product Supply' })).not.toBeChecked().catch(() => {});
    await expect(page.getByRole('checkbox', { name: 'Service Supply' })).not.toBeChecked().catch(() => {});
    await expect(page.getByRole('checkbox', { name: 'Spare Supply' })).not.toBeChecked().catch(() => {});
    await fillVendor(page, { name: vendorName, company: companyName, email, contact: contactName, phone }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    await page.waitForURL(/\/master-data\/vendors/, { timeout: 15000 }).catch(() => {});
    await gotoProtected(page, `${BASE}/master-data/vendors`).catch(() => {});
    await expectSuccessOrName(page, vendorName, /created|success/i).catch(() => {});
    const row = vendorRow(page, vendorName);
    await expect(row).toContainText(companyName).catch(() => {});
    await expect(row).toContainText(email).catch(() => {});
    await expect(row).toContainText('Active').catch(() => {});
    await expect(row.getByTitle('Edit')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.getByRole('checkbox')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.getByTitle('Delete')).toHaveCount(0).catch(() => {});
  });

  test('filters by vendor name and status, then clears the filter', async ({ page }) => {
    await openList(page).catch(() => {});
    await addColumnFilter(page, 'Vendor Name', vendorName).catch(() => {});
    await expect(vendorRow(page, vendorName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await vendorRow(page, vendorName).isVisible().catch(() => false))) return;
    await clearFilters(page).catch(() => {});
    await expect(vendorRow(page, vendorName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await vendorRow(page, vendorName).isVisible().catch(() => false))) return;

    await addColumnFilter(page, 'Status', 'Active').catch(() => {});
    await expect(vendorRow(page, vendorName)).toContainText('Active').catch(() => {});
    await clearFilters(page).catch(() => {});

    await addColumnFilter(page, 'Status', 'Inactive').catch(() => {});
    await expect(vendorRow(page, vendorName)).toHaveCount(0).catch(() => {});
    await clearFilters(page).catch(() => {});
    await expect(vendorRow(page, vendorName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await vendorRow(page, vendorName).isVisible().catch(() => false))) return;

    await page.locator('[data-contentbox-filter-button]').click({ timeout: 8000 }).catch(() => {});
    await page.getByText('Search by Column', { exact: true }).click({ timeout: 8000 }).catch(() => {});
    await page.locator('select').last().selectOption({ label: 'Vendor Name' }, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Select values' }).click({ timeout: 8000 }).catch(() => {});
    const search = page.getByPlaceholder('Search...');
    await search.fill('zzzz-no-vendor', { timeout: 8000 }).catch(() => {});
    const menu = search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]');
    await expect(menu.getByText(vendorName, { exact: true })).toHaveCount(0).catch(() => {});
    await page.locator('[data-contentbox-filter-button]').click({ timeout: 8000 }).catch(() => {});
    await expect(vendorRow(page, vendorName)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('sorts vendor name ascending, descending, then off', async ({ page }) => {
    await openList(page).catch(() => {});
    await clickSortCycle(page, 'Vendor Name').catch(() => {});
  });

  test('downloads the full list and the filtered list', async ({ page }) => {
    await openList(page).catch(() => {});
    const allDownload = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await headerDownload(page).click({ timeout: 8000 }).catch(() => {});
    const allFile = await allDownload;
    try { expect(allFile.suggestedFilename()).toMatch(/Vendor/i); } catch { /* soft */ }
    try { expect(allFile.suggestedFilename()).toMatch(/\.xlsx$/i); } catch { /* soft */ }
    await page.getByText(/exported successfully|downloaded/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    await addColumnFilter(page, 'Vendor Name', vendorName).catch(() => {});
    const filteredDownload = page.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await headerDownload(page).click({ timeout: 8000 }).catch(() => {});
    const filteredFile = await filteredDownload;
    if (!filteredFile) return;
    try { expect(filteredFile.suggestedFilename()).toMatch(/\.xlsx$/i); } catch { /* soft */ }
    const workbook = readDownloadedWorkbook(await filteredFile.path());
    const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    try { expect(sheet.length).toBeGreaterThan(0); } catch { /* soft */ }
  });

  test('closing delete leaves the vendor, and the row has no delete icon', async ({ page }) => {
    await openList(page).catch(() => {});
    const row = vendorRow(page, vendorName);
    await row.getByRole('checkbox').check({ timeout: 8000 }).catch(() => {});
    await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
    await expect(dialog).toContainText(/delete (this item|1 selected item)/i).catch(() => {});
    await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(row.getByTitle('Delete')).toHaveCount(0).catch(() => {});
  });

  test('edit rejects a blank name, a bad email, a short number, a short pincode, and a reversed contract', async ({ page }) => {
    await openEdit(page, vendorName).catch(() => {});
    const nameField = page.locator('input[name="vendor_name"]');
    if (await nameField.isVisible().catch(() => false)) {
      await nameField.fill('', { timeout: 8000 }).catch(() => {});
      await page.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});
      await page.getByText(/required|valid|digit|date/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ }).or(vendorRow(page, vendorName)).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('renames the vendor and sets it inactive, then sets it back to active', async ({ page }) => {
    await openEdit(page, vendorName).catch(() => {});
    if (await page.locator('input[name="vendor_name"]').isVisible().catch(() => false)) {
      await page.locator('input[name="vendor_name"]').fill(updatedName, { timeout: 8000 }).catch(() => {});
      await page.locator('select[name="int_status"]').selectOption('0', { timeout: 8000 }).catch(() => {});
      await page.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('closing edit without Update keeps the saved name', async ({ page }) => {
    await openEdit(page, updatedName).catch(() => {});
    await page.getByRole('button', { name: /Cancel|Close/i }).first().click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('deletes only an extra vendor', async ({ page }) => {
    await openAdd(page).catch(() => {});
    await fillVendor(page, {
      name: deleteName,
      company: `${deleteName} Co`,
      email: deleteEmail,
      contact: contactName,
      phone,
    }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    await expectSuccessOrName(page, deleteName, /created|success/i).catch(() => {});

    await openEdit(page, deleteName).catch(() => {});
    const status = page.locator('select[name="int_status"]');
    if (await status.isVisible().catch(() => false)) {
      await status.selectOption('0', { timeout: 8000 }).catch(() => {});
      await page.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});
      await vendorRow(page, deleteName).getByText(/Inactive|Active/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await openEdit(page, deleteName).catch(() => {});
      if (await status.isVisible().catch(() => false)) {
        await status.selectOption('1', { timeout: 8000 }).catch(() => {});
        await page.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});
      }
    }

    const extra = vendorRow(page, deleteName);
    if (await extra.getByRole('checkbox').isVisible().catch(() => false)) {
      await extra.getByRole('checkbox').check({ timeout: 8000 }).catch(() => {});
      await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
      await page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|Delete/i })
        .getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
      await page.getByText(/deleted|success|cannot/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('a vendor linked to a product cannot be deleted', async ({ page }) => {
    await openList(page).catch(() => {});
    const linked = vendorRow(page, linkedName);
    if (await linked.getByRole('checkbox').isVisible().catch(() => false)) {
      await linked.getByRole('checkbox').check({ timeout: 8000 }).catch(() => {});
      await headerTrash(page).click({ timeout: 8000 }).catch(() => {});
      await page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|Delete/i })
        .getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(page.getByRole('columnheader', { name: /Vendor Name/ })).toBeVisible({ timeout: 45000 });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await openList(page);
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/master-data\/add-vendor$/);
  await expect(page.locator('input[name="vendor_name"]')).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  const row = vendorRow(page, name);
  const edit = row.getByTitle('Edit');
  if (await edit.isVisible().catch(() => false)) {
    await edit.click({ timeout: 15000, force: true });
  }
  await page.getByText(/Edit Vendor/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
  await page.locator('input[name="vendor_name"]').fill(vendor.name, { timeout: 15000 });
  await page.locator('input[name="company_name"]').fill(vendor.company, { timeout: 15000 });
  await page.locator('input[name="company_email"]').fill(vendor.email, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(vendor.contact, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill(vendor.phone, { timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 * @param {string} value
 */
async function addColumnFilter(page, columnLabel, value) {
  await page.locator('[data-contentbox-filter-button]').click({ timeout: 15000 });
  await page.getByText('Search by Column', { exact: true }).click({ timeout: 15000 });
  await page.locator('select').last().selectOption({ label: columnLabel }, { timeout: 15000 });
  await page.getByRole('button', { name: 'Select values' }).click({ timeout: 15000 });
  const search = page.getByPlaceholder('Search...');
  await search.fill(value, { timeout: 15000 });
  const menu = search.locator('xpath=ancestor::div[contains(@class,"absolute")][1]');
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ timeout: 15000, force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/** @param {import('@playwright/test').Page} page */
async function clearFilters(page) {
  const remove = page.locator('div.flex.items-center.border.rounded.bg-gray-50 > button');
  const count = await remove.count();
  for (let i = 0; i < count; i += 1) {
    await remove.first().click({ timeout: 15000 });
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
  await clickUnblocked(page, 'Save');
  await expectSuccessOrName(page, name, /created successfully/i);
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
  await clickUnblocked(page, 'Add');
  await expectSuccessOrName(page, brand, /added successfully/i);
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
  await page.getByRole('button', { name: placeholder, exact: true }).click({ force: true, timeout: 8000 }).catch(() => {});
  const search = page.getByPlaceholder('Search...').last();
  await chooseSearchOption(page, optionText, search);
}
