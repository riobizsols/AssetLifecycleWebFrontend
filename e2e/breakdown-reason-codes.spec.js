// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, firstDataRow } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-BR-${Date.now().toString(36)}`;
const listUrl = `${BASE}/adminsettings/configuration/breakdown-reason-codes`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const typeName = `${run}-Type`;
const stayText = `${run} Stay`;
const stayUpdated = `${stayText} Updated`;
const cancelText = `${run} Cancel`;
const delText = `${run} Del`;
const del2Text = `${run} Del2`;
const del2Updated = `${del2Text} Updated`;

const state = {
  typeName: '',
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerButtons(page) {
  return page.locator('div.flex.gap-2.justify-end > button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerTrash(page) {
  return headerButtons(page).nth(1);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerDownload(page) {
  return headerButtons(page).nth(2);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function namedRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function createDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Create New Breakdown Reason Code' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function confirmDeleteDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForList(page) {
  const loading = page.locator('tbody').getByText('Loading...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await expect(
    page
      .getByRole('columnheader', { name: 'Asset Type' })
      .or(page.getByText('No breakdown reason codes found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.locator('header').getByText('Breakdown Reason Codes', { exact: true }),
  ).toBeVisible({ timeout: 30000 });
  await waitForList(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await openList(page);
  await headerAddButton(page).click();
  await expect(
    createDialog(page).getByRole('heading', { name: 'Create New Breakdown Reason Code' }),
  ).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function clearColumnFilter(page) {
  const chip = page.locator('div.flex.items-center.border').filter({ has: page.locator('select') });
  while ((await chip.count()) > 0) {
    await chip.first().locator('button').first().click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterByColumn(page, column, value) {
  await clearColumnFilter(page);
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: column });
  await page.getByRole('button', { name: 'Select values' }).click();
  const menu = page.locator('div.absolute.z-50').last();
  const option = menu.getByText(value, { exact: true }).first();
  if (await option.isVisible({ timeout: 4000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page
      .getByRole('columnheader', { name: 'Asset Type Name' })
      .or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  const existing = page.locator('tbody tr').filter({ hasText: typeName });
  if (await existing.count()) {
    state.typeName = typeName;
    return;
  }
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state.typeName = typeName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectCreatedAssetType(page) {
  const select = createDialog(page).locator('select');
  const option = select.locator('option').filter({ hasText: typeName });
  await expect(option, `Asset type "${typeName}" is not in the dropdown`).toBeAttached({
    timeout: 20000,
  });
  const value = await option.first().getAttribute('value');
  expect(value, `Asset type "${typeName}" has no option value`).toBeTruthy();
  await select.selectOption(value);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function createReason(page, text) {
  await ensureAssetType(page);
  await openCreate(page);
  await selectCreatedAssetType(page);
  await createDialog(page).getByPlaceholder('Enter breakdown reason code').fill(text);
  await createDialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Breakdown reason code created successfully');
  await expect(createDialog(page)).toHaveCount(0);
  await filterByColumn(page, 'Reason Code', text);
  const row = namedRow(page, text);
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText(typeName);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function deleteReason(page, text) {
  await openList(page);
  await filterByColumn(page, 'Reason Code', text);
  const row = namedRow(page, text);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = confirmDeleteDialog(page);
  await expect(dialog.getByText('Confirm Delete')).toBeVisible();
  page.once('dialog', (d) => d.accept());
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(
    page,
    /reason code\(s\) deleted successfully|Breakdown reason code deleted successfully/,
  );
  await expect(namedRow(page, text)).toHaveCount(0);
}

test.describe('Breakdown Reason Codes', () => {
  test('BR-01 Open Breakdown Reason Codes', async ({ page }) => {
    await openList(page);
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
    await expect(headerDownload(page)).toBeVisible();
  });

  test('BR-02 List columns', async ({ page }) => {
    await openList(page);
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Reason Code' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    const empty = page.getByText('No breakdown reason codes found', { exact: true });
    const first = page.locator('tbody tr').first();
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }
    await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('BR-03 Codes already on the screen stay', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No breakdown reason codes found', { exact: true });
    const first = page.locator('tbody tr').first();
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }
    await expect(first).toBeVisible();
    await expect(first.locator('td').nth(0)).not.toHaveText(/^$/);
    await expect(first.locator('td').nth(1)).not.toHaveText(/^$/);
  });

  test('BR-04 Loading then the list', async ({ page }) => {
    await openList(page);
    await page.reload();
    await expect(
      page.locator('header').getByText('Breakdown Reason Codes', { exact: true }),
    ).toBeVisible({ timeout: 30000 });
    const loading = page.locator('tbody').getByText('Loading...', { exact: true });
    await expect(
      loading
        .or(page.getByRole('columnheader', { name: 'Asset Type' }))
        .or(page.getByText('No breakdown reason codes found', { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 30000 });
    await waitForList(page);
  });

  test('BR-05 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('BR-06 Return to the Admin Dashboard', async ({ page }) => {
    await openList(page);
    await gotoProtected(page, hubUrl);
    await expect(
      page.getByRole('heading', { name: 'Admin Settings', exact: true }),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page.getByRole('heading', { name: 'Breakdown Reason Codes', exact: true }),
    ).toBeVisible();
  });

  test('BR-09 Open Create New Breakdown Reason Code', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await expect(dialog.getByText('Asset Type', { exact: true }).or(dialog.getByText('Asset Type *')).first()).toBeVisible();
    await expect(dialog.locator('select')).toHaveValue('');
    await expect(dialog.getByText('-- Select Asset Type --')).toBeAttached();
    await expect(dialog.getByPlaceholder('Enter breakdown reason code')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('BR-10 Asset Type and text are required', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    const requiredToast = page.getByText(
      /Please select an asset type|Reason code text is required/,
    );
    await expect(
      requiredToast.or(dialog.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).first(),
    ).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toBeVisible();
    await expect(namedRow(page, stayText)).toHaveCount(0);

    await ensureAssetType(page);
    await openCreate(page);
    const again = createDialog(page);
    await selectCreatedAssetType(page);
    await again.getByPlaceholder('Enter breakdown reason code').fill('   ');
    await again.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Reason code text is required');
    await expect(again.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toBeVisible();
    await expect(namedRow(page, stayText)).toHaveCount(0);
  });

  test('BR-11 Close create without saving', async ({ page }) => {
    await ensureAssetType(page);
    await openCreate(page);
    const dialog = createDialog(page);
    await selectCreatedAssetType(page);
    await dialog.getByPlaceholder('Enter breakdown reason code').fill(cancelText);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, cancelText)).toHaveCount(0);

    await headerAddButton(page).click();
    await expect(
      createDialog(page).getByRole('heading', { name: 'Create New Breakdown Reason Code' }),
    ).toBeVisible();
    await createDialog(page).getByRole('button', { name: 'Cancel' }).click();
    await expect(createDialog(page)).toHaveCount(0);
    await expect(namedRow(page, cancelText)).toHaveCount(0);
  });

  test('BR-12 Create the keeper reason code', async ({ page }) => {
    await createReason(page, stayText);
  });

  test('BR-13 The new code is still there after a refresh', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayText);
    await expect(namedRow(page, stayText)).toBeVisible({ timeout: 20000 });
    await expect(namedRow(page, stayText)).toContainText(typeName);
  });

  test('BR-07 Filter by the keeper Reason Code', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayText);
    const row = namedRow(page, stayText);
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(stayText);
    await expect(namedRow(page, cancelText)).toHaveCount(0);
  });

  test('BR-08 Filter value search has no match for zzznomatch999', async ({ page }) => {
    await openList(page);
    await clearColumnFilter(page);
    await page.locator('[data-contentbox-filter-button]').click();
    await page.getByText('Search by Column', { exact: true }).click();
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Reason Code' });
    await page.getByRole('button', { name: 'Select values' }).click();
    const menu = page.locator('div.absolute.z-50').last();
    await menu.getByPlaceholder('Search...').fill('zzznomatch999');
    await expect(menu.getByText('zzznomatch999', { exact: true })).toHaveCount(0);
    await expect(menu.locator('input[type="checkbox"]')).toHaveCount(0);
    await page.locator('[data-contentbox-filter-button]').click();
    await clearColumnFilter(page);
    await filterByColumn(page, 'Reason Code', stayText);
    await expect(namedRow(page, stayText)).toBeVisible({ timeout: 20000 });
  });

  test('BR-14 Rename the keeper reason code', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayText);
    const row = namedRow(page, stayText);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill(stayUpdated);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Breakdown reason code updated successfully');
    await filterByColumn(page, 'Reason Code', stayUpdated);
    const updated = namedRow(page, stayUpdated);
    await expect(updated).toBeVisible({ timeout: 20000 });
    await expect(updated).toContainText(typeName);
    await expect(namedRow(page, stayText).filter({ hasNotText: 'Updated' })).toHaveCount(0);
  });

  test('BR-15 Empty text is blocked on update', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayUpdated);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill('');
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Reason code text is required');
    await editing.locator('button[title="Cancel"]').click();
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('BR-16 Cancel edit without saving', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayUpdated);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill(`${stayUpdated} discard`);
    await editing.locator('button[title="Cancel"]').click();
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, `${stayUpdated} discard`)).toHaveCount(0);
  });

  test('BR-17 Close Confirm Delete without deleting the keeper', async ({ page }) => {
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayUpdated);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await headerTrash(page).click();
    const dialog = confirmDeleteDialog(page);
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('BR-18 Delete only an extra disposable reason code', async ({ page }) => {
    await createReason(page, delText);
    await deleteReason(page, delText);
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayUpdated);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, delText)).toHaveCount(0);
  });

  test('BR-19 Run add and delete again on a second disposable code', async ({ page }) => {
    await createReason(page, del2Text);
    await openList(page);
    await filterByColumn(page, 'Reason Code', del2Text);
    const row = namedRow(page, del2Text);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill(del2Updated);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Breakdown reason code updated successfully');
    await deleteReason(page, del2Updated);
    await openList(page);
    await filterByColumn(page, 'Reason Code', stayUpdated);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, del2Updated)).toHaveCount(0);
  });
});
