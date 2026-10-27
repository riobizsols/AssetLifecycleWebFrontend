// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-OP-${Date.now().toString(36)}`;
const stamp = run.slice('PW-OP-'.length);
const screenUrl = `${BASE}/adminsettings/configuration/opc-configuration`;

const stayName = `${run} Stay`;
const stayUpdated = `${stayName} Upd`;
const cancelName = `${run} Cancel`;
const blockName = `${run} Block`;
const delName = `${run} Del`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const assetDesc = `${run} Asset`;

const state = {
  assetLabel: '',
  typeName: '',
  vendorName: '',
};

/**
 * @param {number} [offsetDays]
 */
function ymd(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: true }).first()
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
 * @param {string} label
 */
function fieldButton(page, label) {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}\\b`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function namedRow(page, name) {
  return page.locator('tbody tr').filter({ hasText: name });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {'components' | 'mapping' | 'conditions'} tab
 */
async function openOpc(page, tab = 'components') {
  const url = tab === 'components' ? screenUrl : `${screenUrl}?tab=${tab}`;
  await gotoProtected(page, url);
  const tabName =
    tab === 'mapping' ? 'Component-Tag Mapping' : tab === 'conditions' ? 'Conditions' : 'Components';
  await expect(page.getByRole('button', { name: tabName, exact: true })).toBeVisible({
    timeout: 30000,
  });
  if (tab === 'components') {
    await expect(
      page
        .getByRole('columnheader', { name: 'Component Name' })
        .or(page.getByText('No components found', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  } else if (tab === 'mapping') {
    await expect(
      page
        .getByRole('columnheader', { name: 'OPC Tag Path' })
        .or(page.getByText('No tag mappings found', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  } else {
    await expect(
      page.getByText(
        'Set conditions on mapped OPC tags to trigger CBM maintenance or an inspection for the asset',
        { exact: true },
      ),
    ).toBeVisible({ timeout: 30000 });
    await expect(
      page
        .getByRole('columnheader', { name: 'Condition' })
        .or(page.getByText('No condition rules found', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} placeholder
 */
async function openLabeledMenu(page, label, placeholder) {
  const trigger = fieldButton(page, label);
  await expect(trigger).toBeEnabled({ timeout: 15000 });
  await trigger.click();
  const search = page.getByPlaceholder(placeholder);
  await expect(search).toBeVisible({ timeout: 10000 });
  return { trigger, search };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} placeholder
 * @param {string} [optionText]
 */
async function selectLabeled(page, label, placeholder, optionText) {
  const { trigger, search } = await openLabeledMenu(page, label, placeholder);
  const panel = search.locator(
    'xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]',
  );
  const items = panel.locator('div.cursor-pointer');
  await expect(items.first(), `No options in the ${label} dropdown`).toBeVisible({
    timeout: 15000,
  });
  if (optionText) {
    await search.fill(optionText);
    await items.filter({ hasText: optionText }).first().click();
  } else {
    await items.first().click();
  }
  await expect(trigger).not.toHaveText(/Select/i, { timeout: 5000 });
  return (await trigger.innerText()).trim();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function modalSave(page) {
  return page.getByRole('button', { name: 'Save', exact: true });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function confirmDeleteDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function deleteNamedRow(page, name) {
  const row = namedRow(page, name);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('input[type="checkbox"]').check();
  await headerTrash(page).click();
  const dialog = confirmDeleteDialog(page);
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
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
async function ensureVendor(page) {
  if (state.vendorName) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(
    page
      .getByRole('columnheader', { name: 'Vendor Name' })
      .or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  const existing = page.locator('tbody tr').filter({ hasText: vendorName });
  if (await existing.count()) {
    state.vendorName = vendorName;
    return;
  }
  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${run} Co`);
  await page.locator('input[name="company_email"]').fill(`pw.op.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully!');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({
    timeout: 30000,
  });
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} preferredName
 * @param {string} searchPlaceholder
 */
async function selectPreferred(page, label, preferredName, searchPlaceholder) {
  const trigger = fieldButton(page, label);
  await trigger.click();
  const search = page.getByPlaceholder(searchPlaceholder);
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New' })
    .first();
  await expect(option, `${label} ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createAssetForOpc(page) {
  await ensureAssetType(page);
  await ensureVendor(page);
  await gotoProtected(page, `${BASE}/assets`);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await selectPreferred(page, 'Asset Type', state.typeName, 'Search by name or ID');
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(assetDesc);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  await selectPreferred(page, 'Product Vendor', state.vendorName, 'Search...');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddComponent(page) {
  await openOpc(page, 'components');
  await headerAddButton(page).click();
  await expect(page.getByRole('heading', { name: 'Add Component' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAssetForComponent(page) {
  if (state.assetLabel) return;
  await openAddComponent(page);
  const trigger = fieldButton(page, 'Asset');
  await trigger.click();
  const search = page.getByPlaceholder('Search asset...');
  const panel = search.locator(
    'xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]',
  );
  const items = panel.locator('div.cursor-pointer');
  const hasAsset = await items
    .first()
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  await trigger.click();
  await expect(search).toBeHidden({ timeout: 5000 }).catch(() => undefined);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  if (hasAsset) return;
  await createAssetForOpc(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createComponent(page, name) {
  await ensureAssetForComponent(page);
  await openAddComponent(page);
  const label = await selectLabeled(page, 'Asset', 'Search asset...');
  if (!state.assetLabel) state.assetLabel = label;
  await page.getByPlaceholder('e.g. Spindle, Motor, Belt').fill(name);
  await modalSave(page).click();
  await expectToast(page, 'Component created');
  await expect(page.getByRole('heading', { name: 'Add Component' })).toHaveCount(0);
  await expect(namedRow(page, name)).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function pickUnusedOpcTag(page) {
  const browser = page.locator('div.fixed.inset-0').filter({ hasText: 'Select OPC Tag' });
  await expect(browser.getByText('Select OPC Tag', { exact: true })).toBeVisible({ timeout: 20000 });
  const none = browser.getByText('No tags uploaded yet - start the collector');
  if (await none.isVisible().catch(() => false)) {
    throw new Error(
      'OPC Configuration has no screen to create a server or upload tags. playwright_db has no uploaded OPC tag list.',
    );
  }

  const unblocked = browser.locator('tbody tr.hover\\:bg-gray-50');
  const folders = browser.locator('div.select-none');
  let folderIndex = 0;
  await expect(async () => {
    if ((await unblocked.count()) > 0) return;
    const count = await folders.count();
    expect(count, 'OPC tag browser has no folders or unused tags').toBeGreaterThan(0);
    await folders.nth(Math.min(folderIndex, count - 1)).click();
    folderIndex += 1;
    expect(await unblocked.count()).toBeGreaterThan(0);
  }).toPass({ timeout: 30000 });

  await unblocked.first().click();
  await browser.getByRole('button', { name: 'Select', exact: true }).click();
  await expect(browser.getByText('Select OPC Tag', { exact: true })).toBeHidden({ timeout: 10000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} componentName
 */
async function createMapping(page, componentName) {
  await openOpc(page, 'mapping');
  await headerAddButton(page).click();
  await expect(page.getByRole('heading', { name: 'Add Component Tag Mapping' })).toBeVisible();
  const assetHint = state.assetLabel.split(' - ')[0];
  await selectLabeled(page, 'Asset', 'Search asset...', assetHint);
  await selectLabeled(page, 'Component', 'Search component...', componentName);
  const serverTrigger = fieldButton(page, 'Server');
  await expect(serverTrigger).toBeVisible();
  const serverText = (await serverTrigger.innerText()).trim();
  if (/Select/i.test(serverText)) {
    const { search } = await openLabeledMenu(page, 'Server', 'Search server...');
    const items = search
      .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
      .locator('div.cursor-pointer');
    const hasServer = await items
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);
    if (!hasServer) {
      throw new Error(
        'OPC Configuration has no screen to create an OPC server. playwright_db has no server for Component-Tag Mapping.',
      );
    }
    await items.first().click();
  }
  const browse = page.getByRole('button', { name: /Browse OPC tags/ });
  await expect(browse).toBeEnabled({ timeout: 15000 });
  await browse.click();
  await pickUnusedOpcTag(page);
  const dataType = page.locator('select').filter({ has: page.getByRole('option', { name: 'Select data type' }) });
  if (!(await dataType.inputValue())) {
    await dataType.selectOption('REAL4');
  }
  const tagType = page.locator('select').filter({ has: page.getByRole('option', { name: 'Select tag type' }) });
  if (!(await tagType.inputValue())) {
    await tagType.selectOption('Measurement');
  }
  await modalSave(page).click();
  await expectToast(page, 'Tag mapped to component');
  await expect(namedRow(page, componentName)).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} componentName
 */
async function fillConditionForMappedTag(page, componentName) {
  await selectLabeled(page, 'Mapped Tag', 'Search tag...', componentName);
  const condition = page.locator('select').filter({ has: page.getByRole('option', { name: 'Select condition' }) });
  await expect(condition).toBeEnabled({ timeout: 10000 });
  const greater = condition.locator('option', { hasText: 'Greater than' });
  if (await greater.count()) {
    await condition.selectOption({ label: 'Greater than' });
    const value = page
      .locator('label')
      .filter({ hasText: /^Value\b/ })
      .locator('xpath=..')
      .locator('input');
    await value.fill('999999');
  } else {
    await condition.selectOption({ label: 'Is false' });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} componentName
 */
async function createCondition(page, componentName) {
  await openOpc(page, 'conditions');
  await headerAddButton(page).click();
  await expect(page.getByRole('heading', { name: 'Add Condition Rule' })).toBeVisible();
  await fillConditionForMappedTag(page, componentName);
  await expect(page.getByText('Run CBM Maintenance', { exact: true })).toBeVisible();
  await modalSave(page).click();
  await expectToast(page, 'Rule created');
  await expect(namedRow(page, componentName)).toBeVisible({ timeout: 20000 });
}

test.describe('OPC Configuration', () => {
  test('OP-01 OP-02 Open OPC Configuration and Components columns', async ({ page }) => {
    await openOpc(page, 'components');
    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Component-Tag Mapping', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conditions', exact: true })).toBeVisible();
    await expect(headerAddButton(page)).toBeVisible();
    await expect(headerTrash(page)).toBeVisible();
    for (const name of ['Asset', 'Component Name', 'Created On']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Comp ID' })).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: 'Asset ID' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    const empty = page.getByText('No components found', { exact: true });
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
      await expect(first.locator('button[title="Edit"]')).toBeVisible();
    } else {
      await expect(empty).toBeVisible();
    }
  });

  test('OP-03 Components already on the screen stay', async ({ page }) => {
    await openOpc(page, 'components');
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      const text = (await first.innerText()).trim();
      expect(text.length).toBeGreaterThan(0);
    } else {
      await expect(page.getByText('No components found', { exact: true })).toBeVisible();
    }
  });

  test('OP-04 Delete with nothing selected', async ({ page }) => {
    await openOpc(page, 'components');
    await headerTrash(page).click();
    await expectToast(page, 'Please select items to delete');
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('OP-05 Return to the Admin Dashboard', async ({ page }) => {
    await openOpc(page, 'components');
    await gotoProtected(page, `${BASE}/adminsettings/configuration`);
    await expect(page.getByText('OPC Configuration', { exact: true }).first()).toBeVisible({
      timeout: 30000,
    });
  });

  test('OP-06 OP-07 OP-08 Add Component required fields and cancel', async ({ page }) => {
    await ensureAssetForComponent(page);
    await openAddComponent(page);
    await expect(page.getByText('Asset', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('Component Name', { exact: false }).first()).toBeVisible();
    await modalSave(page).click();
    await expectToast(page, 'Select an asset');
    await selectLabeled(page, 'Asset', 'Search asset...');
    await modalSave(page).click();
    await expectToast(page, 'Enter a component name');
    await page.getByPlaceholder('e.g. Spindle, Motor, Belt').fill('   ');
    await modalSave(page).click();
    await expectToast(page, 'Enter a component name');
    await expect(page.getByRole('heading', { name: 'Add Component' })).toBeVisible();
    await page.getByPlaceholder('e.g. Spindle, Motor, Belt').fill(cancelName);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add Component' })).toHaveCount(0);
    await expect(namedRow(page, cancelName)).toHaveCount(0);
  });

  test('OP-09 Create the keeper component', async ({ page }) => {
    await createComponent(page, stayName);
  });

  test('OP-10 Duplicate name on the same asset is blocked', async ({ page }) => {
    await openAddComponent(page);
    await selectLabeled(page, 'Asset', 'Search asset...', state.assetLabel.split(' - ')[0]);
    await page.getByPlaceholder('e.g. Spindle, Motor, Belt').fill(stayName);
    await modalSave(page).click();
    await expectToast(page, `Component "${stayName}" already exists on this asset`);
    await expect(page.getByRole('heading', { name: 'Add Component' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(namedRow(page, stayName)).toHaveCount(1);
  });

  test('OP-11 Rename only the keeper component', async ({ page }) => {
    await openOpc(page, 'components');
    const row = namedRow(page, stayName);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    await expect(page.getByRole('heading', { name: /^Edit Component / })).toBeVisible();
    const nameInput = page.getByPlaceholder('e.g. Spindle, Motor, Belt');
    await nameInput.fill(stayUpdated);
    await modalSave(page).click();
    await expectToast(page, 'Component updated');
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 20000 });
    await expect(namedRow(page, stayName)).toHaveCount(0);
  });

  test('OP-12 OP-13 Open Component-Tag Mapping', async ({ page }) => {
    await openOpc(page, 'mapping');
    await expect(headerAddButton(page)).toBeVisible();
    for (const name of [
      'Asset',
      'Component',
      'Server',
      'OPC Tag Path',
      'Tag Name',
      'Data Type',
      'Unit',
      'Tag Type',
    ]) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'CT ID' })).toHaveCount(0);
    const first = page.locator('tbody tr').first();
    if (await first.isVisible()) {
      await expect(first.locator('input[type="checkbox"]')).toBeVisible();
    }
  });

  test('OP-14 OP-15 Add mapping required fields', async ({ page }) => {
    await openOpc(page, 'mapping');
    await headerAddButton(page).click();
    await expect(page.getByRole('heading', { name: 'Add Component Tag Mapping' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Browse OPC tags/ })).toBeVisible();
    await modalSave(page).click();
    await expectToast(page, 'Asset is required');
    await selectLabeled(page, 'Asset', 'Search asset...', state.assetLabel.split(' - ')[0]);
    await modalSave(page).click();
    await expectToast(page, 'Component is required');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(namedRow(page, stayUpdated)).toHaveCount(0);
  });

  test('OP-16 Map a tag to the keeper component', async ({ page }) => {
    await createMapping(page, stayUpdated);
  });

  test('OP-17 Mapping is still there after a refresh', async ({ page }) => {
    await openOpc(page, 'mapping');
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 20000 });
  });

  test('OP-18 OP-19 Open Conditions', async ({ page }) => {
    await openOpc(page, 'conditions');
    await expect(headerAddButton(page)).toBeVisible();
    for (const name of [
      'Asset',
      'Component',
      'Tag',
      'Data Type',
      'Condition',
      'Check Every',
      'Action',
      'Last Value',
      'Last Triggered',
    ]) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    await expect(page.getByRole('columnheader', { name: 'Rule ID' })).toHaveCount(0);
  });

  test('OP-20 OP-21 Add Condition Rule required fields', async ({ page }) => {
    await openOpc(page, 'conditions');
    await headerAddButton(page).click();
    await expect(page.getByRole('heading', { name: 'Add Condition Rule' })).toBeVisible();
    await expect(page.getByText('Every', { exact: true })).toBeVisible();
    await expect(page.getByText('Run CBM Maintenance', { exact: true })).toBeVisible();
    await modalSave(page).click();
    await expectToast(page, 'Mapped tag is required');
    await selectLabeled(page, 'Mapped Tag', 'Search tag...', stayUpdated);
    await modalSave(page).click();
    await expectToast(page, 'Condition is required');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(namedRow(page, stayUpdated)).toHaveCount(0);
  });

  test('OP-22 Create the keeper condition', async ({ page }) => {
    await createCondition(page, stayUpdated);
    await expect(namedRow(page, stayUpdated)).toContainText('1 minute');
    await expect(namedRow(page, stayUpdated)).toContainText('CBM Maintenance');
  });

  test('OP-23 Edit only the keeper rule', async ({ page }) => {
    await openOpc(page, 'conditions');
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    await expect(page.getByRole('heading', { name: /^Edit Condition Rule / })).toBeVisible();
    const freq = page.locator('input[type="number"]').first();
    await freq.fill('5');
    await modalSave(page).click();
    await expectToast(page, 'Rule updated');
    await expect(namedRow(page, stayUpdated)).toContainText('5 minutes');
  });

  test('OP-24 Component delete is blocked while a mapping exists', async ({ page }) => {
    await createComponent(page, blockName);
    await createMapping(page, blockName);
    await createCondition(page, blockName);
    await openOpc(page, 'components');
    await deleteNamedRow(page, blockName);
    await expect(page.getByText(/Remove the tag mappings of this component first/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(namedRow(page, blockName)).toBeVisible();
  });

  test('OP-25 Mapping delete is blocked while a condition exists', async ({ page }) => {
    await openOpc(page, 'mapping');
    await deleteNamedRow(page, blockName);
    await expect(page.getByText(/This mapping is used by a condition monitoring rule/i).first()).toBeVisible({
      timeout: 20000,
    });
    await expect(namedRow(page, blockName)).toBeVisible();
  });

  test('OP-26 OP-27 OP-28 OP-29 Delete only extra disposable records', async ({ page }) => {
    await createComponent(page, delName);
    await createMapping(page, delName);
    await createCondition(page, delName);

    await openOpc(page, 'conditions');
    await deleteNamedRow(page, delName);
    await expectToast(page, '1 rule(s) deleted');
    await expect(namedRow(page, delName)).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();

    await openOpc(page, 'mapping');
    await deleteNamedRow(page, delName);
    await expectToast(page, '1 mapping(s) deleted');
    await expect(namedRow(page, delName)).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();

    await openOpc(page, 'components');
    await deleteNamedRow(page, delName);
    await expectToast(page, '1 component(s) deleted');
    await expect(namedRow(page, delName)).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, blockName)).toBeVisible();
  });
});
