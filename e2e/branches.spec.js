// @ts-check
import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

/**
 * Master Data > Branches. One serial chain for this file.
 * The branch created in this run stays on the playwright tenant.
 * Delete cases create extra disposable branches and remove only those.
 * Branch codes stay short so they fit the column.
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const tail = stamp.slice(-7);
const run = `PW-BR-${stamp}`;
const branchName = `${run} Branch`;
const updatedName = `${run} Updated`;
const cancelledName = `${run} Cancel`;
const deleteName = `${run} Delete`;
const againName = `${run} Again`;
const dupName = `${run} Dup`;
const otherName = `${run} Other`;
const branchCode = `B${tail}`;
const deleteCode = `D${tail}`;
const againCode = `E${tail}`;
const cancelCode = `C${tail}`;
const city = 'Chennai';

test.describe('Branches', () => {
  test('opens the list with filter, add, delete, download, and the visible columns', async ({ page }) => {
    await openList(page);

    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();

    for (const heading of ['Organization', 'Is Active', 'Branch Name', 'City', 'Branch Code', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Branch ID', exact: true })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Organization ID', exact: true })).toHaveCount(0);

    await headerTrash(page).click();
    await expect(page.getByText('Please select items to delete')).toBeVisible();
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('the first row shows organization, Active or Inactive, name, city, and code', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No data found', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(headerAddButton(page)).toBeVisible();
      return;
    }

    const row = page.locator('tbody tr').first();
    await expect(row).toBeVisible();
    const cells = row.locator('td');
    await expect(cells.nth(0)).not.toHaveText(/^\s*$/);
    await expect(cells.nth(1)).toHaveText(/^(Active|Inactive)$/);
    await expect(cells.nth(2)).not.toHaveText(/^\s*$/);
    await expect(cells.nth(3)).not.toHaveText(/^\s*$/);
    await expect(cells.nth(4)).not.toHaveText(/^\s*$/);
    await expect(row.getByTitle('Edit')).toBeVisible();
    await expect(row.getByRole('checkbox')).toBeVisible();
  });

  test('empty list would show No data found; this tenant already has branches so that state is not shown', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No data found', { exact: true });
    const hasEmpty = await empty.isVisible().catch(() => false);
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
    if (hasEmpty) {
      await expect(empty).toBeVisible();
    } else {
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await expect(empty).toHaveCount(0);
    }
  });

  test('add branch blocks empty fields, a number-only name, a number-only city, and Cancel does not save', async ({ page }) => {
    await openAdd(page);
    await expect(page.locator('label').filter({ hasText: 'Organization' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Branch Name' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'Branch Code' })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: 'City' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    const save = page.getByRole('button', { name: 'Save', exact: true });
    await save.click();
    await expect(page.getByText('Organization is required').first()).toBeVisible();

    await selectOrganization(page);
    await save.click();
    await expect(page.getByText('Branch name is required').first()).toBeVisible();

    await page.locator('input[name="text"]').fill('   ');
    await save.click();
    await expect(page.getByText('Branch name is required').first()).toBeVisible();

    await page.locator('input[name="text"]').fill(cancelledName);
    await save.click();
    await expect(page.getByText('Branch code is required').first()).toBeVisible();

    await page.locator('input[name="branch_code"]').fill(cancelCode);
    await save.click();
    await expect(page.getByText('City is required').first()).toBeVisible();

    await page.locator('input[name="text"]').fill('12345');
    await page.locator('input[name="city"]').fill(city);
    await save.click();
    await expect(page.getByText('Branch name cannot be only numbers').first()).toBeVisible();

    await page.locator('input[name="text"]').fill(cancelledName);
    await page.locator('input[name="city"]').fill('641001');
    await save.click();
    await expect(page.getByText('City name cannot be only numbers').first()).toBeVisible();

    await page.locator('input[name="city"]').fill(city);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click({ force: true });
    await expect(page).toHaveURL(/\/master-data\/branches$/);
    await expect(branchRow(page, cancelledName)).toHaveCount(0);
  });

  test('creates the branch that stays in the tenant', async ({ page }) => {
    await createBranch(page, branchName, branchCode);
    const row = branchRow(page, branchName);
    await expect(row).toContainText(city);
    await expect(row).toContainText(branchCode);
    await expect(row.locator('td').nth(1)).toHaveText('Active');
    await expect(row.getByTitle('Edit')).toBeVisible();
    await expect(row.getByRole('checkbox')).toBeVisible();
  });

  test('a branch code already in use is rejected', async ({ page }) => {
    await openAdd(page);
    await selectOrganization(page);
    await page.locator('input[name="text"]').fill(dupName);
    await page.locator('input[name="branch_code"]').fill(branchCode);
    await page.locator('input[name="city"]').fill(city);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('This branch code is already in use')).toBeVisible();
    await expect(page).toHaveURL(/\/master-data\/branches\/add$/);

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(branchRow(page, branchName)).toBeVisible();
    await expect(branchRow(page, dupName)).toHaveCount(0);
  });

  test('filters by branch name, branch code, and Active, then clears the filter', async ({ page }) => {
    await openList(page);
    await addColumnFilter(page, 'Branch Name', branchName);
    await expect(branchRow(page, branchName)).toBeVisible();
    await expect(page.locator('tbody tr td:nth-child(3)')).toHaveText([branchName]);
    await clearFilters(page);
    await expect(branchRow(page, branchName)).toBeVisible();

    await addColumnFilter(page, 'Branch Code', branchCode);
    await expect(page.locator('tbody tr td:nth-child(5)')).toHaveText([branchCode]);
    await clearFilters(page);

    await addColumnFilter(page, 'Is Active', 'Active');
    const statuses = await page.locator('tbody tr td:nth-child(2)').allInnerTexts();
    expect(statuses.length).toBeGreaterThan(0);
    expect(statuses.every((status) => status.trim() === 'Active')).toBeTruthy();
    await expect(branchRow(page, branchName)).toBeVisible();
    await clearFilters(page);
  });

  test('sorts branch name ascending, descending, then off', async ({ page }) => {
    await openList(page);
    const header = page.getByRole('columnheader', { name: /^Branch Name/ });
    await header.locator('span').first().click();
    await expect(header).toContainText('↑');
    await expect(await branchNames(page)).toEqual(
      [...(await branchNames(page))].sort((a, b) => a.localeCompare(b)),
    );

    await header.locator('span').first().click();
    await expect(header).toContainText('↓');
    await expect(await branchNames(page)).toEqual(
      [...(await branchNames(page))].sort((a, b) => b.localeCompare(a)),
    );

    await header.locator('span').first().click();
    await expect(header).not.toContainText('↑');
    await expect(header).not.toContainText('↓');
  });

  test('selects one row, selects all, then clears the selection', async ({ page }) => {
    await openList(page);
    const boxes = page.locator('tbody tr input[type="checkbox"]');
    await boxes.first().check();
    await expect(boxes.first()).toBeChecked();

    const headerBox = page.getByRole('columnheader', { name: /^Organization/ }).getByRole('checkbox');
    await headerBox.check();
    const allChecked = await boxes.evaluateAll(
      (nodes) => nodes.every((node) => node instanceof HTMLInputElement && node.checked),
    );
    expect(allChecked).toBeTruthy();

    await headerBox.uncheck();
    const noneChecked = await boxes.evaluateAll(
      (nodes) => nodes.every((node) => node instanceof HTMLInputElement && !node.checked),
    );
    expect(noneChecked).toBeTruthy();
  });

  test('closing delete leaves the branch', async ({ page }) => {
    await openList(page);
    await branchRow(page, branchName).getByRole('checkbox').check();
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
    await expect(dialog).toContainText('Are you sure you want to delete 1 selected item(s)?');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(branchRow(page, branchName)).toBeVisible();
    await expect(branchRow(page, branchName).locator('td').nth(1)).toHaveText('Active');
  });

  test('edit shows the saved name, city, and code, and has no organization or status field', async ({ page }) => {
    await openEdit(page, branchName);
    const dialog = editDialog(page);
    await expect(dialog.locator('input[name="text"]')).toHaveValue(branchName);
    await expect(dialog.locator('input[name="city"]')).toHaveValue(city);
    await expect(dialog.locator('input[name="branch_code"]')).toHaveValue(branchCode);
    await expect(dialog.locator('select')).toHaveCount(0);
    await expect(dialog.getByText('Organization', { exact: true })).toHaveCount(0);
    await expect(dialog.getByText('Is Active', { exact: true })).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(branchRow(page, branchName)).toBeVisible();
  });

  test('renames the branch and keeps its code', async ({ page }) => {
    await openEdit(page, branchName);
    const dialog = editDialog(page);
    await dialog.locator('input[name="text"]').fill(updatedName);
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('Branch updated successfully')).toBeVisible();
    await expect(page.getByText('Edit Branch', { exact: true })).toHaveCount(0);

    const row = branchRow(page, updatedName);
    await expect(row).toContainText(branchCode);
    await expect(row).toContainText(city);
    await expect(branchRow(page, branchName)).toHaveCount(0);
  });

  test('a number-only city is rejected and Cancel keeps Chennai', async ({ page }) => {
    await openEdit(page, updatedName);
    const dialog = editDialog(page);
    await dialog.evaluate((formRoot) => {
      const form = formRoot.querySelector('form');
      if (form) form.noValidate = true;
    });
    await dialog.locator('input[name="city"]').fill('641035');
    await dialog.getByRole('button', { name: 'Update', exact: true }).click();
    await expect(page.getByText('City name cannot be only numbers')).toBeVisible();
    await expect(page.getByText('Edit Branch', { exact: true })).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    const row = branchRow(page, updatedName);
    await expect(row).toContainText(city);
    await expect(row).not.toContainText('641035');
  });

  test('saving the branch code again on a new branch is rejected', async ({ page }) => {
    await openAdd(page);
    await selectOrganization(page);
    await page.locator('input[name="text"]').fill(otherName);
    await page.locator('input[name="branch_code"]').fill(branchCode);
    await page.locator('input[name="city"]').fill(city);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText('This branch code is already in use')).toBeVisible();

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(branchRow(page, updatedName)).toBeVisible();
    await expect(branchRow(page, otherName)).toHaveCount(0);
  });

  test('downloads the full list and the filtered list', async ({ page }) => {
    await openList(page);
    const allDownload = page.waitForEvent('download');
    await headerDownload(page).click();
    const allFile = await allDownload;
    expect(allFile.suggestedFilename()).toContain('Branches_List');
    expect(allFile.suggestedFilename()).toMatch(/\.xlsx$/);
    await expect(page.getByText('Branches exported successfully')).toBeVisible();

    await addColumnFilter(page, 'Branch Name', updatedName);
    const filteredDownload = page.waitForEvent('download');
    await headerDownload(page).click();
    const filteredFile = await filteredDownload;
    const xlsx = XLSX.default ?? XLSX;
    const workbook = xlsx.read(readFileSync(await filteredFile.path()));
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    expect(sheet.length).toBeGreaterThan(0);
    expect(sheet.every((row) => row['Branch Name'] === updatedName)).toBeTruthy();
    expect(sheet[0]).not.toHaveProperty('Branch ID');
    await clearFilters(page);
    await expect(branchRow(page, updatedName)).toBeVisible();
  });

  test('deletes only an extra branch', async ({ page }) => {
    await createBranch(page, deleteName, deleteCode);
    await expect(branchRow(page, deleteName)).toBeVisible();

    await branchRow(page, deleteName).getByRole('checkbox').check();
    await headerTrash(page).click();
    await page
      .locator('div.fixed.inset-0')
      .filter({ hasText: 'Confirm Delete' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await expect(page.getByText(/branch\(es\) deleted successfully/).first()).toBeVisible({ timeout: 60000 });
    await expect(branchRow(page, deleteName)).toHaveCount(0);
    await expect(branchRow(page, updatedName)).toBeVisible();
  });

  test('a second extra branch can be created and deleted while the renamed branch stays', async ({ page }) => {
    await createBranch(page, againName, againCode);
    await branchRow(page, againName).getByRole('checkbox').check();
    await headerTrash(page).click();
    await page
      .locator('div.fixed.inset-0')
      .filter({ hasText: 'Confirm Delete' })
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await expect(page.getByText(/branch\(es\) deleted successfully/).first()).toBeVisible({ timeout: 60000 });
    await expect(branchRow(page, againName)).toHaveCount(0);
    await expect(branchRow(page, updatedName)).toContainText(branchCode);
    await expect(branchRow(page, updatedName)).toContainText(city);
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await gotoProtected(page, `${BASE}/master-data/branches`);
    await expect(page.getByRole('columnheader', { name: 'Branch Name', exact: true })).toBeVisible({
      timeout: 45000,
    });
    const spinner = page.locator('tbody .animate-spin');
    const stillSpinning = await spinner
      .waitFor({ state: 'visible', timeout: 1000 })
      .then(() => true)
      .catch(() => false);
    if (stillSpinning) {
      const gone = await spinner
        .waitFor({ state: 'hidden', timeout: 30000 })
        .then(() => true)
        .catch(() => false);
      if (gone) break;
      continue;
    }
    break;
  }
  const empty = page.getByText('No data found', { exact: true });
  const dataRow = page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
  await expect(dataRow.first().or(empty).first()).toBeVisible({ timeout: 30000 });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await openList(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/master-data\/branches\/add$/, { timeout: 30000 });
  await expect(page.locator('select[name="org_id"]')).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  await branchRow(page, name).getByTitle('Edit').click();
  await expect(page.getByText('Edit Branch', { exact: true })).toBeVisible();
}

/** @param {import('@playwright/test').Page} page */
function editDialog(page) {
  return page.locator('div.fixed.inset-0').filter({ hasText: 'Edit Branch' });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function branchRow(page, name) {
  return page.getByRole('row').filter({ has: page.getByRole('cell', { name, exact: true }) });
}

/** @param {import('@playwright/test').Page} page */
function headerTrash(page) {
  return page.locator('div.flex.gap-2.justify-end > button').nth(1);
}

/** @param {import('@playwright/test').Page} page */
function headerDownload(page) {
  return page.locator('div.flex.gap-2.justify-end > button').nth(2);
}

/** @param {import('@playwright/test').Page} page */
async function selectOrganization(page) {
  const orgSelect = page.locator('select[name="org_id"]');
  const option = orgSelect.locator('option[value]:not([value=""])').first();
  if ((await option.count()) === 0) {
    await page.reload();
    await expect(page.locator('label').filter({ hasText: 'Organization' })).toBeVisible({ timeout: 45000 });
  }
  await expect(option).toBeAttached({
    timeout: 45000,
  });
  const value = await orgSelect.locator('option').evaluateAll((opts) => {
    const match = opts.find((opt) => {
      const id = opt.getAttribute('value') || '';
      if (!id) return false;
      if (id === 'ORG004' || id === 'ORG005') return false;
      const label = (opt.textContent || '').toLowerCase();
      if (label.includes('manufacturing')) return false;
      return true;
    });
    return match ? match.getAttribute('value') : '';
  });
  expect(value, 'Need an organization other than ORG004 or ORG005').toBeTruthy();
  await orgSelect.selectOption(value || '');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} code
 */
async function createBranch(page, name, code) {
  await openAdd(page);
  await selectOrganization(page);
  await page.locator('input[name="text"]').fill(name);
  await page.locator('input[name="branch_code"]').fill(code);
  await page.locator('input[name="city"]').fill(city);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Branch created successfully!')).toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/master-data\/branches$/, { timeout: 60000 });
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
async function branchNames(page) {
  const names = await page.locator('tbody tr td:nth-child(3)').allInnerTexts();
  return names.map((name) => name.trim());
}
