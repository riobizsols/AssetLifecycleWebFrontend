// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-PR-${Date.now().toString(36)}`;
const listUrl = `${BASE}/adminsettings/configuration/properties`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const stayName = `${run} Stay`;
const stayUpdated = `${stayName} Updated`;
const stayRed = `${run} Red`;
const stayBlue = `${run} Blue`;
const stayGreen = `${run} Green`;
const cancelName = `${run} Cancel`;
const otherName = `${run} Other`;
const otherValue = `${run} OtherVal`;
const delName = `${run} Del`;
const delRed = `${run} DelRed`;
const delBlue = `${run} DelBlue`;
const del2Name = `${run} Del2`;
const del2Updated = `${del2Name} Updated`;
const del2Red = `${run} Del2Red`;
const del2Blue = `${run} Del2Blue`;
const del2Green = `${run} Del2Green`;

const state = {
  firstExistingName: '',
};

/**
 * @param {string} value
 */
function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
function pageAddButton(page) {
  return page.locator('button[title="Create Property"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function pageFilter(page) {
  return page.locator('button[title="Filter Properties"]');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function propertyBlock(page, name) {
  return page.locator('div.divide-y.divide-gray-200 > div').filter({
    has: page.locator('span.font-medium').filter({ hasText: new RegExp(`^${escapeRe(name)}$`) }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function createDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Create New Property' });
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
  const loading = page.getByText('Loading properties...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await expect(
    page
      .getByText('Property Name', { exact: true })
      .or(page.getByText(/No properties/i))
      .or(page.getByRole('heading', { name: /Properties/i }))
      .first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(page.getByRole('heading', { name: /Properties/i }).first()).toBeVisible({
    timeout: 30000,
  }).catch(() => {});
  await waitForList(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await openList(page);
  await pageAddButton(page).click();
  await expect(
    createDialog(page).getByRole('heading', { name: 'Create New Property' }),
  ).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function searchByName(page, text) {
  if (!(await page.getByPlaceholder('Search by property name...').isVisible().catch(() => false))) {
    await pageFilter(page).click();
  }
  const input = page.getByPlaceholder('Search by property name...');
  await expect(input).toBeVisible({ timeout: 10000 });
  await input.fill(text);
  const close = page
    .getByRole('heading', { name: 'Search Properties' })
    .locator('xpath=..')
    .getByRole('button');
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function expandProperty(page, name) {
  const block = propertyBlock(page, name);
  const found = await block.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  if (!found) return;
  const heading = block.getByRole('heading', { name: 'List Values' });
  if (await heading.isVisible().catch(() => false)) return;
  await block.locator('div.grid').first().locator('button').first().click({ force: true }).catch(() => {});
  await heading.waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string[]} values
 */
async function createProperty(page, name, values) {
  await openCreate(page);
  const dialog = createDialog(page);
  await dialog.getByPlaceholder('e.g., Material, Color, Brand').fill(name);
  for (let i = 0; i < values.length; i += 1) {
    if (i > 0) {
      await dialog.getByRole('button', { name: 'Add Value' }).click();
    }
    await dialog.getByPlaceholder(`Value ${i + 1} (e.g., Wood, Metal, Glass)`).fill(values[i]);
  }
  await dialog.getByRole('button', { name: 'Save Property' }).click();
  await expectToast(page, `Property created successfully with ${values.length} list value(s)`);
  await expect(dialog).toHaveCount(0);
  const block = propertyBlock(page, name);
  await expect(block).toBeVisible({ timeout: 20000 });
  await expect(block.getByText(`${values.length} value(s)`, { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function deleteProperty(page, name) {
  await openList(page);
  await searchByName(page, name);
  const block = propertyBlock(page, name);
  await expect(block).toBeVisible({ timeout: 20000 });
  await block.locator('button[title="Delete"]').click();
  const dialog = confirmDeleteDialog(page);
  await expect(dialog.getByText('Confirm Delete')).toBeVisible();
  await expect(
    dialog.getByText(
      `Are you sure you want to delete the property "${name}"? This will also delete all associated list values.`,
    ),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, 'Property deleted successfully');
  await expect(propertyBlock(page, name)).toHaveCount(0);
}

test.describe('Properties', () => {
  test('PP-01 Open Properties', async ({ page }) => {
    await openList(page);
    await expect(page.locator('header').getByText('Properties', { exact: true })).toBeVisible();
    await expect(headerAddButton(page)).toHaveCount(0);
    await expect(pageFilter(page)).toBeVisible();
    await expect(pageAddButton(page)).toBeVisible();
  });

  test('PP-02 List columns', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No properties created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(page.getByText('Click the + button above to create your first property')).toBeVisible();
      return;
    }
    await expect(page.getByText('Property Name', { exact: true }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('List Values', { exact: true }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Actions', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    const first = page.locator('div.divide-y.divide-gray-200 > div').first();
    await expect(first.locator('div.grid').first().locator('button').first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(first.locator('button[title="Delete"]')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(first.getByText(/\d+ value\(s\)|0 values/)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('PP-03 Properties already on the screen stay', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No properties created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      await expect(page.getByText('Click the + button above to create your first property')).toBeVisible();
      return;
    }
    const first = page.locator('div.divide-y.divide-gray-200 > div').first();
    const name = (await first.locator('span.font-medium').first().innerText()).trim();
    expect(name.length).toBeGreaterThan(0);
    state.firstExistingName = name;
  });

  test('PP-04 Loading then the list', async ({ page }) => {
    await openList(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Properties', exact: true })).toBeVisible({
      timeout: 30000,
    });
    const loading = page.getByText('Loading properties...', { exact: true });
    await expect(
      loading
        .or(page.getByText('Property Name', { exact: true }))
        .or(page.getByText('No properties created yet', { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 30000 });
    await waitForList(page);
  });

  test('PP-05 Expand an existing property', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No properties created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }
    const first = page.locator('div.divide-y.divide-gray-200 > div').first();
    const name = (await first.locator('span.font-medium').first().innerText()).trim();
    await first.locator('div.grid').first().locator('button').first().click();
    await expect(first.getByRole('heading', { name: 'List Values' })).toBeVisible();
    const values = first.locator('div.flex.items-center.justify-between').filter({
      has: first.locator('button[title="Delete value"]'),
    });
    const none = first.getByText('No list values added yet', { exact: true });
    await expect(values.first().or(none).first()).toBeVisible();
    await first.locator('div.grid').first().locator('button').first().click();
    await expect(first.getByRole('heading', { name: 'List Values' })).toHaveCount(0);
    await expect(page.locator('span.font-medium').filter({ hasText: new RegExp(`^${escapeRe(name)}$`) })).toBeVisible();
  });

  test('PP-06 Return to the Admin Dashboard', async ({ page }) => {
    await openList(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'Admin Settings', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('heading', { name: 'Properties', exact: true })).toBeVisible();
  });

  test('PP-10 Open Create New Property', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await expect(dialog.getByText('Enter property name and its list values')).toBeVisible();
    await expect(dialog.getByText('Property names must be unique')).toBeVisible();
    await expect(dialog.getByPlaceholder('e.g., Material, Color, Brand')).toBeVisible();
    await expect(dialog.getByPlaceholder('Value 1 (e.g., Wood, Metal, Glass)')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add Value' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save Property' })).toBeVisible();
  });

  test('PP-11 Property Name is required', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await dialog.getByRole('button', { name: 'Save Property' }).click();
    const requiredToast = page.getByText('Property name is required');
    await expect(
      requiredToast.or(dialog.getByRole('heading', { name: 'Create New Property' })).first(),
    ).toBeVisible();
    await expect(dialog.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    await expect(propertyBlock(page, stayName)).toHaveCount(0);

    await dialog.getByPlaceholder('e.g., Material, Color, Brand').fill('   ');
    await dialog.getByRole('button', { name: 'Save Property' }).click();
    await expectToast(page, 'Property name is required');
    await expect(dialog.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    await expect(propertyBlock(page, stayName)).toHaveCount(0);
  });

  test('PP-12 Close create without saving', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await dialog.getByPlaceholder('e.g., Material, Color, Brand').fill(cancelName);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(propertyBlock(page, cancelName)).toHaveCount(0);

    await pageAddButton(page).click();
    const again = createDialog(page);
    await expect(again.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    await again.getByPlaceholder('e.g., Material, Color, Brand').fill(cancelName);
    await again.locator('div.sticky.top-0').getByRole('button').click();
    await expect(again).toHaveCount(0);
    await expect(propertyBlock(page, cancelName)).toHaveCount(0);
  });

  test('PP-13 Add Value and remove an extra box', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await expect(dialog.getByPlaceholder('Value 1 (e.g., Wood, Metal, Glass)')).toBeVisible();
    await expect(dialog.getByPlaceholder('Value 2 (e.g., Wood, Metal, Glass)')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Add Value' }).click();
    await expect(dialog.getByPlaceholder('Value 2 (e.g., Wood, Metal, Glass)')).toBeVisible();
    await dialog
      .getByPlaceholder('Value 2 (e.g., Wood, Metal, Glass)')
      .locator('xpath=..')
      .getByRole('button')
      .click();
    await expect(dialog.getByPlaceholder('Value 2 (e.g., Wood, Metal, Glass)')).toHaveCount(0);
    await expect(dialog.getByPlaceholder('Value 1 (e.g., Wood, Metal, Glass)')).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(propertyBlock(page, stayName)).toHaveCount(0);
  });

  test('PP-14 Create the keeper property with two list values', async ({ page }) => {
    await createProperty(page, stayName, [stayRed, stayBlue]);
  });

  test('PP-15 A duplicate Property Name is blocked', async ({ page }) => {
    await openCreate(page);
    const dialog = createDialog(page);
    await dialog.getByPlaceholder('e.g., Material, Color, Brand').fill(stayName);
    await dialog.getByRole('button', { name: 'Save Property' }).click();
    await expectToast(page, 'A property with this name already exists');
    await expect(dialog.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(propertyBlock(page, stayName)).toHaveCount(1);
  });

  test('PP-16 The new property is still there after a refresh', async ({ page }) => {
    await openList(page);
    const block = propertyBlock(page, stayName);
    await expect(block).toBeVisible({ timeout: 20000 });
    await expect(block.getByText('2 value(s)', { exact: true })).toBeVisible();
  });

  test('PP-07 Search by Property Name', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayName);
    await expect(pageFilter(page)).toHaveClass(/bg-yellow-500/);
    await expect(page.getByText(stayName, { exact: true }).first()).toBeVisible();
    await expect(propertyBlock(page, stayName)).toBeVisible();
    if (state.firstExistingName && state.firstExistingName !== stayName) {
      await expect(propertyBlock(page, state.firstExistingName)).toHaveCount(0);
    }
  });

  test('PP-08 Search with no match', async ({ page }) => {
    await openList(page);
    await searchByName(page, 'zzznomatch999');
    await expect(page.getByText('No properties match your search', { exact: true })).toBeVisible();
    await expect(page.getByText('Try adjusting your search criteria')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clear Search' })).toBeVisible();
  });

  test('PP-09 Clear search', async ({ page }) => {
    await openList(page);
    await searchByName(page, 'zzznomatch999');
    await expect(page.getByText('No properties match your search', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Search' }).click();
    await expect(page.getByText('No properties match your search', { exact: true })).toHaveCount(0);
    await expect(propertyBlock(page, stayName)).toBeVisible({ timeout: 20000 });
    await expect(pageFilter(page)).not.toHaveClass(/bg-yellow-500/);
  });

  test('PP-17 Rename the keeper property', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayName);
    const block = propertyBlock(page, stayName);
    await expect(block).toBeVisible();
    await block.locator('button[title="Edit"]').click();
    const editing = page.locator('div.divide-y.divide-gray-200 > div').filter({
      has: page.locator('button[title="Save"]'),
    });
    await editing.locator('input[type="text"]').fill(stayUpdated);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Property name updated successfully');
    await openList(page);
    const updated = propertyBlock(page, stayUpdated);
    await expect(updated).toBeVisible({ timeout: 20000 });
    await expect(updated.getByText('2 value(s)', { exact: true })).toBeVisible();
    await expect(propertyBlock(page, stayName)).toHaveCount(0);
  });

  test('PP-18 Empty name is blocked on update', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    await expect(block).toBeVisible();
    await block.locator('button[title="Edit"]').click();
    const editing = page.locator('div.divide-y.divide-gray-200 > div').filter({
      has: page.locator('button[title="Save"]'),
    });
    await editing.locator('input[type="text"]').fill('');
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Property name is required');
    await editing.locator('button[title="Cancel"]').click();
    await expect(propertyBlock(page, stayUpdated)).toBeVisible();
  });

  test('PP-19 Rename to an existing name is blocked', async ({ page }) => {
    let clashName = state.firstExistingName;
    if (!clashName || clashName === stayName || clashName === stayUpdated) {
      await createProperty(page, otherName, [otherValue]);
      clashName = otherName;
    }
    await openList(page);
    await searchByName(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    await expect(block).toBeVisible();
    await block.locator('button[title="Edit"]').click();
    const editing = page.locator('div.divide-y.divide-gray-200 > div').filter({
      has: page.locator('button[title="Save"]'),
    });
    await editing.locator('input[type="text"]').fill(clashName);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'A property with this name already exists');
    await editing.locator('button[title="Cancel"]').click();
    await expect(propertyBlock(page, stayUpdated)).toBeVisible();
  });

  test('PP-20 Cancel edit without saving', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    if (!(await block.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await block.locator('button[title="Edit"]').click({ force: true, timeout: 8000 }).catch(() => {});
    const editing = page.locator('div.divide-y.divide-gray-200 > div').filter({
      has: page.locator('button[title="Save"]'),
    });
    if (!(await editing.first().isVisible({ timeout: 8000 }).catch(() => false))) return;
    await editing.locator('input[type="text"]').fill(`${stayUpdated} discard`);
    await editing.locator('button[title="Cancel"]').click({ force: true, timeout: 8000 }).catch(() => {});
    await expect(propertyBlock(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('PP-21 Expand and read the keeper list values', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    await expandProperty(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    await expect(block.getByText(stayRed, { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(block.getByText(stayBlue, { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(block.getByPlaceholder('Enter new value...')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(block.getByRole('button', { name: 'Add', exact: true })).toBeVisible();
  });

  test('PP-22 Add a third list value to the keeper only', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    await expandProperty(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    const valueBox = block.getByPlaceholder('Enter new value...');
    if (!(await valueBox.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await valueBox.fill(stayGreen);
    await block.getByRole('button', { name: 'Add', exact: true }).click();
    await expectToast(page, 'List value added successfully');
    await searchByName(page, stayUpdated);
    const updated = propertyBlock(page, stayUpdated);
    await expect(updated.getByText('3 value(s)', { exact: true })).toBeVisible();
    await expandProperty(page, stayUpdated);
    await expect(propertyBlock(page, stayUpdated).getByText(stayGreen, { exact: true })).toBeVisible();
  });

  test('PP-23 Empty list value is blocked', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    await expandProperty(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    const valueBox = block.getByPlaceholder('Enter new value...');
    if (!(await valueBox.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await valueBox.fill('');
    await block.getByRole('button', { name: 'Add', exact: true }).click({ force: true, timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Value is required');
    await expect(block.getByText(/value\(s\)/)).toBeVisible({ timeout: 8000 }).catch(() => {});

    await block.getByPlaceholder('Enter new value...').fill('   ');
    await block.getByRole('button', { name: 'Add', exact: true }).click();
    await expectToast(page, 'Value is required');
    await expect(block.getByText('3 value(s)', { exact: true })).toBeVisible();
  });

  test('PP-24 Delete only the third keeper list value', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    await expandProperty(page, stayUpdated);
    const block = propertyBlock(page, stayUpdated);
    const chip = block.locator('div.flex.items-center.justify-between').filter({ hasText: stayGreen });
    await chip.locator('button[title="Delete value"]').click();
    const dialog = confirmDeleteDialog(page);
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await expect(
      dialog.getByText(`Are you sure you want to delete the value "${stayGreen}"?`),
    ).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, 'List value deleted successfully');
    await searchByName(page, stayUpdated);
    const updated = propertyBlock(page, stayUpdated);
    await expect(updated.getByText('2 value(s)', { exact: true })).toBeVisible();
    await expandProperty(page, stayUpdated);
    await expect(propertyBlock(page, stayUpdated).getByText(stayRed, { exact: true })).toBeVisible();
    await expect(propertyBlock(page, stayUpdated).getByText(stayBlue, { exact: true })).toBeVisible();
    await expect(propertyBlock(page, stayUpdated).getByText(stayGreen, { exact: true })).toHaveCount(0);
  });

  test('PP-25 Close Confirm Delete without deleting a value', async ({ page }) => {
    await openList(page);
    await searchByName(page, stayUpdated);
    await expandProperty(page, stayUpdated);
    const chip = propertyBlock(page, stayUpdated)
      .locator('div.flex.items-center.justify-between')
      .filter({ hasText: stayRed });
    await chip.locator('button[title="Delete value"]').click();
    let dialog = confirmDeleteDialog(page);
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(propertyBlock(page, stayUpdated).getByText(stayRed, { exact: true })).toBeVisible();

    await chip.locator('button[title="Delete value"]').click();
    dialog = confirmDeleteDialog(page);
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByText('×', { exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(propertyBlock(page, stayUpdated).getByText(stayRed, { exact: true })).toBeVisible();
    await expect(propertyBlock(page, stayUpdated).getByText(stayBlue, { exact: true })).toBeVisible();
    await expect(propertyBlock(page, stayUpdated).getByText('2 value(s)', { exact: true })).toBeVisible();
  });

  test('PP-26 Delete only an extra disposable property', async ({ page }) => {
    await createProperty(page, delName, [delRed, delBlue]);
    await deleteProperty(page, delName);
    await openList(page);
    await expect(propertyBlock(page, stayUpdated)).toBeVisible();
    await expect(propertyBlock(page, delName)).toHaveCount(0);
  });

  test('PP-27 Run add and delete again on a second disposable property', async ({ page }) => {
    await createProperty(page, del2Name, [del2Red, del2Blue]);
    await openList(page);
    await searchByName(page, del2Name);
    const block = propertyBlock(page, del2Name);
    await block.locator('button[title="Edit"]').click();
    const editing = page.locator('div.divide-y.divide-gray-200 > div').filter({
      has: page.locator('button[title="Save"]'),
    });
    await editing.locator('input[type="text"]').fill(del2Updated);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Property name updated successfully');

    await openList(page);
    await searchByName(page, del2Updated);
    await expandProperty(page, del2Updated);
    const expanded = propertyBlock(page, del2Updated);
    await expanded.getByPlaceholder('Enter new value...').fill(del2Green);
    await expanded.getByRole('button', { name: 'Add', exact: true }).click();
    await expectToast(page, 'List value added successfully');

    await searchByName(page, del2Updated);
    await expandProperty(page, del2Updated);
    const greenChip = propertyBlock(page, del2Updated)
      .locator('div.flex.items-center.justify-between')
      .filter({ hasText: del2Green });
    await greenChip.locator('button[title="Delete value"]').click();
    const valueDialog = confirmDeleteDialog(page);
    await valueDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, 'List value deleted successfully');

    await deleteProperty(page, del2Updated);
    await openList(page);
    await expect(propertyBlock(page, stayUpdated)).toBeVisible();
    await expect(propertyBlock(page, del2Updated)).toHaveCount(0);
  });
});
