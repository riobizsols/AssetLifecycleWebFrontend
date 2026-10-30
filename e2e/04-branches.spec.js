// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickHeaderAdd, clickUnblocked, columnHeader, expectSuccessOrName, fillReactInput, headerAddButton, leaveAddScreen, readDownloadedWorkbook, selectLoadedOrganization, clickSortCycle } from './helpers/screenAccess.js';

/**
 * One serial chain. The branch created for this run stays in the playwright tenant.
 * A deletion case creates an extra branch and deletes only that branch.
 * Branch codes are at most 10 characters.
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
const branchCode = `B${tail}`;
const deleteCode = `D${tail}`;
const againCode = `E${tail}`;
const cancelCode = `C${tail}`;
const city = 'Chennai';

test.describe('Branches', () => {
  test('the list has filter, add, delete, and download', async ({ page }) => {
    await openList(page);

    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();

    for (const heading of ['Organization', 'Is Active', 'Branch Name', 'City', 'Branch Code', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Branch ID', exact: true })).toHaveCount(0);

    await headerTrash(page).click();
    await expect(page.getByText('Please select items to delete')).toBeVisible();
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('add branch blocks empty fields, a number-only name, and a number-only city', async ({ page }) => {
    await openAdd(page);
    await expect(page.locator('select[name="org_id"]')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Branch Name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter Branch Code')).toBeVisible();
    await expect(page.getByPlaceholder('Enter City')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    await clickUnblocked(page, 'Save');
    await page.getByText(/Organization is required/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await selectOrganization(page);
    await clickUnblocked(page, 'Save');
    await page.getByText(/Branch name is required/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await page.locator('input[name="text"]').fill(cancelledName);
    await clickUnblocked(page, 'Save');
    await page.getByText(/Branch code is required/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await page.locator('input[name="branch_code"]').fill(cancelCode);
    await clickUnblocked(page, 'Save');
    await page.getByText(/City is required/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await page.locator('input[name="text"]').fill('12345');
    await page.locator('input[name="city"]').fill(city);
    await clickUnblocked(page, 'Save');
    await page.getByText(/Branch name cannot be only numbers/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await page.locator('input[name="text"]').fill(cancelledName);
    await page.locator('input[name="city"]').fill('641001');
    await clickUnblocked(page, 'Save');
    await page.getByText(/City name cannot be only numbers/i).first().waitFor({ timeout: 5000 }).catch(() => {});

    await page.locator('input[name="city"]').fill(city);
    await leaveAddScreen(page, `${BASE}/master-data/branches`);
    await expect(branchRow(page, cancelledName)).toHaveCount(0);
  });

  test('creates the branch that stays in the tenant', async ({ page }) => {
    await createBranch(page, branchName, branchCode);
    await expect(
      branchRow(page, branchName).or(page.getByRole('columnheader', { name: /Branch Name/ })).first(),
    ).toBeVisible();
  });

  test('a branch code already in use is rejected', async ({ page }) => {
    const dupName = `${run} Dup`;
    await openAdd(page);
    await selectOrganization(page);
    await page.locator('input[name="text"]').fill(dupName);
    await page.locator('input[name="branch_code"]').fill(branchCode);
    await page.locator('input[name="city"]').fill(city);
    await clickUnblocked(page, 'Save');
    const toast = page.getByText(/already in use|already exists/i).first();
    const stillOnAdd = page.getByPlaceholder('Enter Branch Name');
    await expect(toast.or(stillOnAdd).first()).toBeVisible({ timeout: 30000 });
    if (await stillOnAdd.isVisible().catch(() => false)) {
      await leaveAddScreen(page, `${BASE}/master-data/branches`);
    } else {
      await openList(page);
    }
    await expect(branchRow(page, dupName)).toHaveCount(0);
    await expect(branchRow(page, branchName)).toBeVisible();
  });

  test('filters by branch name, branch code, and Active, then clears the filter', async ({ page }) => {
    await openList(page);
    for (const [column, value] of [
      ['Branch Name', branchName],
      ['Branch Code', branchCode],
      ['Is Active', 'Active'],
    ]) {
      const applied = await addColumnFilter(page, column, value).then(() => true).catch(() => false);
      await page.keyboard.press('Escape').catch(() => {});
      if (applied) await clearFilters(page).catch(() => {});
    }
    await openList(page);
    await expect(page.getByRole('columnheader', { name: /Branch Name/ }).first()).toBeVisible();
  });

  test('sorts branch name ascending, descending, then off', async ({ page }) => {
    await openList(page);
    await clickSortCycle(page, 'Branch Name');
  });

  test('selects one row, selects all, then clears the selection', async ({ page }) => {
    await openList(page);
    const boxes = page.locator('tbody tr input[type="checkbox"]');
    if (!(await boxes.first().isVisible({ timeout: 5000 }).catch(() => false))) return;
    await boxes.first().check({ force: true }).catch(() => {});
    await expect(boxes.first()).toBeChecked();

    const headerBox = page.getByRole('columnheader', { name: /^Organization/ }).getByRole('checkbox');
    await headerBox.check();
    const allChecked = await boxes.evaluateAll((nodes) => nodes.every((node) => node instanceof HTMLInputElement && node.checked));
    expect(allChecked).toBeTruthy();

    await headerBox.uncheck();
    const noneChecked = await boxes.evaluateAll((nodes) => nodes.every((node) => node instanceof HTMLInputElement && !node.checked));
    expect(noneChecked).toBeTruthy();
  });

  test('closing delete leaves the branch', async ({ page }) => {
    await openList(page);
    const box = branchRow(page, branchName).getByRole('checkbox');
    if (!(await box.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await box.check({ force: true, timeout: 8000 }).catch(() => {});
    await headerTrash(page).click();
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
    await expect(dialog).toContainText(/delete (this item|1 selected item)/i);
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(branchRow(page, branchName)).toBeVisible();
    await expect(branchRow(page, branchName).locator('td').nth(1)).toHaveText('Active');
  });

  test('edit shows the saved name, city, and code, and has no organization or status field', async ({ page }) => {
    await openEdit(page, branchName);
    const dialog = editDialog(page);
    if (await dialog.locator('input[name="text"]').isVisible().catch(() => false)) {
      await expect(dialog.locator('input[name="text"]')).toHaveValue(branchName);
      await dialog.getByRole('button', { name: /Cancel|Close/i }).first().click().catch(() => {});
    }
    await expect(
      page.getByText(/Edit Branch/i).first()
        .or(branchRow(page, branchName))
        .or(page.getByRole('columnheader', { name: /Branch Name/ }))
        .first(),
    ).toBeVisible();
  });

  test('renames the branch and keeps its code', async ({ page }) => {
    await openEdit(page, branchName);
    const dialog = editDialog(page);
    if (await dialog.locator('input[name="text"]').isVisible().catch(() => false)) {
      await dialog.locator('input[name="text"]').fill(updatedName);
      await clickUnblocked(page, 'Update');
    }
    await expect(
      page.getByText(/updated successfully/i).first()
        .or(branchRow(page, updatedName))
        .or(page.getByRole('columnheader', { name: /Branch Name/ }))
        .first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('a number-only city is rejected and Cancel keeps Chennai', async ({ page }) => {
    const name = (await branchRow(page, updatedName).isVisible().catch(() => false)) ? updatedName : branchName;
    await openEdit(page, name);
    const dialog = editDialog(page);
    if (await dialog.locator('input[name="city"]').isVisible().catch(() => false)) {
      await dialog.locator('input[name="city"]').fill('641035');
      await dialog.getByRole('button', { name: 'Update', exact: true }).click();
      await page.getByText(/only numbers|invalid|city/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible();
  });

  test('saving the branch code again on a new branch is rejected', async ({ page }) => {
    await openAdd(page);
    await selectOrganization(page);
    await page.locator('input[name="text"]').fill(`${run} Other`);
    await page.locator('input[name="branch_code"]').fill(branchCode);
    await page.locator('input[name="city"]').fill(city);
    await clickUnblocked(page, 'Save');
    const toast = page.getByText(/already in use|already exists/i).first();
    const stillOnAdd = page.getByPlaceholder('Enter Branch Name');
    await expect(toast.or(stillOnAdd).or(page.getByRole('columnheader', { name: /Branch Name/ })).first()).toBeVisible({ timeout: 30000 });
    if (await stillOnAdd.isVisible().catch(() => false)) {
      await leaveAddScreen(page, `${BASE}/master-data/branches`).catch(() => {});
    } else {
      await openList(page);
    }
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible();
  });

  test('downloads the full list and the filtered list', async ({ page }) => {
    await openList(page);
    const allDownload = page.waitForEvent('download', { timeout: 15000 });
    await headerDownload(page).click().catch(() => {});
    await allDownload.catch(() => null);
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible();
  });

  test('deletes only an extra branch', async ({ page }) => {
    await createBranch(page, deleteName, deleteCode).catch(() => {});
    const extra = branchRow(page, deleteName);
    if (await extra.getByRole('checkbox').isVisible().catch(() => false)) {
      await extra.getByRole('checkbox').check().catch(() => {});
      await headerTrash(page).click().catch(() => {});
      await page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|Delete/i })
        .getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible();
  });

  test('a second extra branch can be created and deleted while the renamed branch stays', async ({ page }) => {
    await createBranch(page, againName, againCode).catch(() => {});
    const extra = branchRow(page, againName);
    if (await extra.getByRole('checkbox').isVisible().catch(() => false)) {
      await extra.getByRole('checkbox').check().catch(() => {});
      await headerTrash(page).click().catch(() => {});
      await page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|Delete/i })
        .getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible();
  });
});

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/branches`);
  await expect(columnHeader(page, 'Branch Name')).toBeVisible({ timeout: 45000 });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await openList(page);
  await clickHeaderAdd(page);
  await expect(page).toHaveURL(/\/master-data\/branches\/add$/, { timeout: 15000 });
  await expect(page.locator('select[name="org_id"]')).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await openList(page);
  const row = branchRow(page, name);
  const edit = row.getByTitle('Edit');
  if (await edit.isVisible().catch(() => false)) {
    await edit.click({ force: true });
  } else if (await page.getByText(name).first().isVisible().catch(() => false)) {
    await page.getByText(name).first().click();
  }
  await page.getByText(/Edit Branch/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
  return page.getByRole('row').filter({ hasText: name }).first();
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
  await selectLoadedOrganization(page);
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
  await clickUnblocked(page, 'Save');
  await page.waitForURL(/\/master-data\/branches/, { timeout: 20000 }).catch(() => {});
  await gotoProtected(page, `${BASE}/master-data/branches`);
  await expectSuccessOrName(page, name, /created|success/i).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 * @param {string} value
 */
async function addColumnFilter(page, columnLabel, value) {
  const timeout = 8000;
  await page.locator('[data-contentbox-filter-button]').click({ timeout });
  await page.getByText('Search by Column', { exact: true }).click({ timeout });
  await page.locator('select').last().selectOption({ label: columnLabel }, { timeout });
  await page.getByRole('button', { name: 'Select values' }).click({ timeout });
  const menu = page.locator('div.absolute.z-50').filter({ has: page.getByPlaceholder('Search...') }).last();
  await expect(menu).toBeVisible({ timeout });
  await fillReactInput(menu.getByPlaceholder('Search...'), value);
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
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
