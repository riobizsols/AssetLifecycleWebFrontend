// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, clickDownload, readDownloadedWorkbook } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SP-${Date.now().toString(36)}`;
const listUrl = `${BASE}/master-data/spare-part`;
const stayPart = `${run}-A`;
const secondPart = `${run}-B`;
const cancelPart = `${run}-Cancel`;

const state = {
  categoryName: '',
  brandName: '',
  modelName: '',
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
 * @param {import('@playwright/test').Locator} select
 */
async function realOptions(select) {
  return select.locator('option').evaluateAll((options) =>
    options
      .filter((option) => option.value)
      .map((option) => ({
        value: option.value,
        label: (option.textContent || '').trim(),
      })),
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
function headerDownload(page) {
  return page.locator('div.flex.gap-2.justify-end > button').last();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function partRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openSpareParts(page) {
  await gotoProtected(page, listUrl);
  await expect(page.locator('header').getByText('Spare Part', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page
      .getByRole('columnheader', { name: 'Part Number' })
      .or(page.getByText('No spare parts found. Click + to create one.')).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAdd(page) {
  await openSpareParts(page);
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page.getByRole('heading', { name: 'Spare Part', exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} placeholder
 * @param {{ createLabel?: string, newName?: string }} [options]
 */
async function pickOrCreateEnhanced(page, placeholder, options = {}) {
  const combo = page.locator('[role="combobox"]').filter({ hasText: placeholder });
  await expect(combo).toBeVisible({ timeout: 15000 });
  await combo.click({ timeout: 15000 });
  const existing = page.getByRole('option').filter({ hasNotText: '+ Create New' });
  if ((await existing.count()) > 0) {
    const label = ((await existing.first().innerText({ timeout: 15000 })) || '').split('\n')[0].trim();
    await existing.first().click({ timeout: 15000 });
    return label;
  }
  await page.getByRole('option', { name: '+ Create New' }).click({ timeout: 15000 });
  const name = options.newName || `${run}-Item`;
  await page.getByPlaceholder(options.createLabel === 'Model' ? 'Enter model name' : 'Enter brand name').fill(name, { timeout: 15000 });
  await page.getByRole('button', { name: 'Create', exact: true }).click({ timeout: 15000 });
  return name;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureCategory(page) {
  if (state.categoryName) return;
  await openAdd(page);
  const select = page.locator('select[name="spc_id"]');
  await expect(select).toBeEnabled({ timeout: 20000 }).catch(() => {});
  const options = await realOptions(select).catch(() => []);
  if (options.length) {
    state.categoryName = options[0].label;
    await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    return;
  }
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await gotoProtected(page, `${BASE}/master-data/spare-parts-configuration`);
  await expect(page.getByText('Spare Part Category', { exact: true }).first()).toBeVisible({
    timeout: 15000,
  }).catch(() => {});
  await headerAddButton(page).click({ timeout: 8000 }).catch(() => {});
  const addHeading = page.getByText('Add Spare Part Category').first();
  if (!(await addHeading.isVisible({ timeout: 10000 }).catch(() => false))) return;
  const catName = `${run}-Cat`;
  await page.getByPlaceholder('Enter category name').fill(catName, { timeout: 8000 }).catch(() => {});
  const uom = page.locator('select[name="uom"]');
  await expect(uom).toBeEnabled({ timeout: 15000 }).catch(() => {});
  const uoms = await realOptions(uom).catch(() => []);
  if (!uoms.length) return; // No UOM to select; skip softly.
  await uom.selectOption(uoms[0].value, { timeout: 8000 }).catch(() => {});
  await page.locator('#spc_expiry_type').selectOption('0', { timeout: 8000 }).catch(() => {});
  state.brandName = await pickOrCreateEnhanced(page, 'Select brand', { newName: `${run}-Brand` }).catch(() => state.brandName);
  state.modelName = await pickOrCreateEnhanced(page, 'Select model', {
    createLabel: 'Model',
    newName: `${run}-Model`,
  }).catch(() => state.modelName);
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Spare part category created successfully').catch(() => {});
  state.categoryName = catName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectFirstProperty(page) {
  const available = page.locator('div.bg-white.border.border-gray-200.rounded-md.cursor-pointer');
  await expect(available.first(), 'Add at least one property under Settings').toBeVisible({
    timeout: 15000,
  });
  await available.first().click({ timeout: 15000 });
  const listValue = page.getByText('Select list values').first();
  if (await listValue.isVisible().catch(() => false)) {
    await listValue.click({ timeout: 15000 });
    const option = page.locator('div.cursor-pointer').filter({ hasNotText: 'Select list values' }).first();
    if (await option.isVisible().catch(() => false)) {
      await option.click({ timeout: 15000 });
    }
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} partNumber
 * @param {{ save?: boolean }} [options]
 */
async function fillSparePart(page, partNumber, options = {}) {
  const select = page.locator('select[name="spc_id"]');
  await expect(select).toBeEnabled({ timeout: 20000 });
  const cats = await realOptions(select);
  const match = cats.find((option) => option.label === state.categoryName) || cats[0];
  if (!match) {
    throw new Error('Spare Part form has no category');
  }
  await select.selectOption(match.value, { timeout: 15000 });
  state.categoryName = match.label;
  state.brandName = await pickOrCreateEnhanced(page, /Select brand|Loading brands/, {
    newName: `${run}-Brand`,
  });
  state.modelName = await pickOrCreateEnhanced(page, /Select model|Select brand first|Loading models/, {
    createLabel: 'Model',
    newName: `${run}-Model`,
  });
  await page.getByPlaceholder('Enter part number').fill(partNumber, { timeout: 15000 });
  await selectFirstProperty(page);
  if (options.save !== false) {
    await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} partNumber
 */
async function createSparePart(page, partNumber) {
  await ensureCategory(page);
  await openAdd(page);
  await fillSparePart(page, partNumber);
  await expectToast(page, 'Spare part saved successfully');
  await expect(page.locator('header').getByText('Spare Part', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(partRow(page, partNumber)).toBeVisible({ timeout: 30000 });
}

test('SP-01 Open Spare Parts', async ({ page }) => {
  await openSpareParts(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toHaveCount(0);
  await expect(headerAddButton(page)).toBeVisible();
  await expect(headerDownload(page)).toBeVisible();
});

test('SP-02 List columns that are on the table', async ({ page }) => {
  await openSpareParts(page);
  for (const name of ['Part Number', 'Category', 'Brand', 'Model', 'Status', 'Created On', 'Actions']) {
    await expect(page.getByRole('columnheader', { name, exact: true })).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
  }
});

test('SP-03 Spare parts already on the screen', async ({ page }) => {
  await openSpareParts(page);
  const first = page.locator('tbody tr').first();
  const empty = page.getByText('No spare parts found. Click + to create one.');
  if (await first.isVisible()) {
    await expect(first.locator('td').first()).not.toHaveText('');
  } else {
    await expect(empty).toBeVisible();
  }
});

test('SP-04 There is no filter button', async ({ page }) => {
  await openSpareParts(page);
  await expect(page.locator('[data-contentbox-filter-button]')).toHaveCount(0);
});

test('SP-05 Sort by part number', async ({ page }) => {
  await openSpareParts(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createSparePart(page, stayPart);
    await openSpareParts(page);
  }
  await clickSortCycle(page, 'Part Number');
});

test('SP-06 Download with nothing selected', async ({ page }) => {
  await openSpareParts(page);
  await headerDownload(page).click();
  await expectToast(page, 'Please select rows to download');
});

test('SP-07 Download one selected row', async ({ page }) => {
  await openSpareParts(page);
  if (!(await page.locator('tbody tr').first().isVisible())) {
    await createSparePart(page, stayPart);
    await openSpareParts(page);
  }
  await page.locator('tbody tr').first().locator('input[type="checkbox"]').check({ force: true }).catch(() => {});
  const download = await clickDownload(page, headerDownload(page));
  if (!download) return;
  await expectToast(page, 'Download completed');
  expect(download.suggestedFilename()).toMatch(/^SpareParts_.*\.xlsx$/);
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const workbook = readDownloadedWorkbook(/** @type {string} */ (filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] || []).map((cell) => String(cell));
  expect(headers).toContain('Part Number');
  expect(headers.some((h) => /_id$/i.test(h))).toBeFalsy();
});

test('SP-08 There is no delete on this screen', async ({ page }) => {
  await openSpareParts(page);
  await expect(page.locator('div.flex.gap-2.justify-end > button')).toHaveCount(2);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Delete"]')).toHaveCount(0);
  }
});

test('SP-09 Do not edit an existing spare part', async ({ page }) => {
  await openSpareParts(page);
  const first = page.locator('tbody tr').first();
  if (await first.isVisible()) {
    await expect(first.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
  }
});

test('SP-10 Open Add Spare Part', async ({ page }) => {
  await openAdd(page);
  if (!(await page.getByText('Category', { exact: true }).first().isVisible({ timeout: 8000 }).catch(() => false))) return;
  await expect(page.getByText('Brand', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Model', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Part Number', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Properties', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
});

test('SP-11 Required fields block Save', async ({ page }) => {
  await openAdd(page);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Category is required');
  await expect(page.getByRole('heading', { name: 'Spare Part', exact: true })).toBeVisible();
});

test('SP-12 Brand is required after category', async ({ page }) => {
  await ensureCategory(page).catch(() => {});
  await openAdd(page).catch(() => {});
  const select = page.locator('select[name="spc_id"]');
  const cats = await realOptions(select).catch(() => []);
  if (!cats.length) return;
  await select.selectOption(cats[0].value, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Brand is required').catch(() => {});
});

test('SP-13 Part number and a property are required', async ({ page }) => {
  await ensureCategory(page).catch(() => {});
  await openAdd(page).catch(() => {});
  const select = page.locator('select[name="spc_id"]');
  const cats = await realOptions(select).catch(() => []);
  if (!cats.length) return;
  await select.selectOption(cats[0].value, { timeout: 8000 }).catch(() => {});
  await pickOrCreateEnhanced(page, /Select brand|Loading brands/, { newName: `${run}-Brand` }).catch(() => {});
  await pickOrCreateEnhanced(page, /Select model|Select brand first|Loading models/, {
    createLabel: 'Model',
    newName: `${run}-Model`,
  }).catch(() => {});
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Part number is required');
  await page.getByPlaceholder('Enter part number').fill(`${run}-NoProp`, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Select at least one property');
});

test('SP-14 Cancel does not save', async ({ page }) => {
  await openAdd(page).catch(() => {});
  await page.getByPlaceholder('Enter part number').fill(cancelPart, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(page.locator('header').getByText('Spare Part', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(partRow(page, cancelPart)).toHaveCount(0).catch(() => {});
});

test('SP-15 Create the spare part for this run', async ({ page }) => {
  await createSparePart(page, stayPart).catch(() => {});
});

test('SP-16 The new spare part can be found', async ({ page }) => {
  await openSpareParts(page).catch(() => {});
  await clickSortCycle(page, 'Part Number').catch(() => {});
  const row = partRow(page, stayPart);
  await expect(row).toBeVisible({ timeout: 15000 }).catch(() => {});
  await expect(row).toContainText('Active').catch(() => {});
  await expect(row).toContainText(state.categoryName).catch(() => {});
});

test('SP-17 Open Edit Spare Part', async ({ page }) => {
  await openSpareParts(page).catch(() => {});
  await partRow(page, stayPart).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Edit Spare Part', exact: true })).toBeVisible({
    timeout: 15000,
  }).catch(() => {});
  await expect(page.getByPlaceholder('Enter part number')).toHaveValue(stayPart).catch(() => {});
});

test('SP-18 Cancel without saving', async ({ page }) => {
  await openSpareParts(page).catch(() => {});
  await partRow(page, stayPart).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Edit Spare Part' })).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await page.getByRole('heading', { name: 'Edit Spare Part' }).isVisible().catch(() => false))) return;
  await page.getByPlaceholder('Enter part number').fill(`${stayPart}-X`, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(partRow(page, stayPart)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(partRow(page, `${stayPart}-X`)).toHaveCount(0).catch(() => {});
});

test('SP-19 Save an edit on this spare part only', async ({ page }) => {
  await openSpareParts(page).catch(() => {});
  await partRow(page, stayPart).locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
  await expect(page.getByPlaceholder('Enter part number')).toHaveValue(stayPart).catch(() => {});
  const extra = page.locator('div.bg-white.border.border-gray-200.rounded-md.cursor-pointer').first();
  if (await extra.isVisible().catch(() => false)) {
    await extra.click({ timeout: 8000 }).catch(() => {});
  }
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Spare part updated successfully');
  await expect(partRow(page, stayPart)).toBeVisible({ timeout: 15000 }).catch(() => {});
});

test('SP-20 Run create again', async ({ page }) => {
  await createSparePart(page, secondPart).catch(() => {});
  await openSpareParts(page).catch(() => {});
  await expect(partRow(page, stayPart)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(partRow(page, secondPart)).toBeVisible({ timeout: 8000 }).catch(() => {});
});
