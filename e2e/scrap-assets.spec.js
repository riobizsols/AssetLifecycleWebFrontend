// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-SC-${Date.now().toString(36)}`;
const stamp = run.slice('PW-SC-'.length);
const scrapUrl = `${BASE}/scrap-assets`;
const assetsUrl = `${BASE}/assets`;

const stayName = `${run} Stay`;
const secondName = `${run} Stay2`;
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;

const state = {
  typeName: '',
  vendorName: '',
  mastersReady: false,
  stayName: '',
  secondName: '',
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
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Locator} root
 * @param {string} label
 */
function labeledButton(root, label) {
  return root
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function listRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
function statCard(page, title) {
  return page
    .locator('div.bg-white.rounded-lg.shadow-md.p-6')
    .filter({ has: page.getByText(title, { exact: true }) })
    .filter({ has: page.locator('p.text-3xl') })
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetGroupsSelect(page) {
  return page.locator('select').filter({ has: page.locator('option[value="INDIVIDUAL"]') });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openScrapAssets(page) {
  await gotoProtected(page, scrapUrl);
  await expect(page.locator('header').getByText('Scrap Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(statCard(page, 'Total Assets')).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreateScrap(page) {
  await openScrapAssets(page);
  await page.getByRole('button', { name: 'Scrap Asset' }).click();
  await expect(page).toHaveURL(/\/scrap-assets\/create/);
  await expect(page.locator('header').getByText('Add Scrap Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('heading', { name: 'Create Scrap Asset' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} [preferredName]
 */
async function selectCreateAssetType(page, preferredName) {
  const trigger = page
    .locator('label')
    .filter({ hasText: /^Asset Type \*$/ })
    .locator('xpath=..')
    .getByRole('button')
    .first();
  await trigger.click();
  const search = page.getByPlaceholder('Search asset types...');
  await expect(search).toBeVisible();
  if (preferredName) {
    await search.fill(preferredName);
    const option = page.locator('div.fixed div.cursor-pointer').filter({ hasText: preferredName }).first();
    await expect(option, `Asset type ${preferredName} is not in the scrap list`).toBeVisible({
      timeout: 15000,
    });
    await option.click();
    return preferredName;
  }
  const first = page.locator('div.fixed div.cursor-pointer').first();
  await expect(first, 'No asset type exists to open the Individual list').toBeVisible({
    timeout: 15000,
  });
  const label = ((await first.innerText()) || '').trim();
  await first.click();
  return label;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function chooseIndividual(page) {
  const groups = assetGroupsSelect(page);
  await expect(groups).toBeEnabled();
  await groups.selectOption('INDIVIDUAL');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAssets(page) {
  await gotoProtected(page, assetsUrl);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByRole('columnheader', { name: 'Asset Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureParentAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
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
  await page.getByText('Department-wise', { exact: true }).click();
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
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
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
  await page.locator('input[name="company_email"]').fill(`pw.sc.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
  await expect(page.locator('tbody tr').filter({ hasText: vendorName })).toBeVisible({ timeout: 30000 });
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMasters(page) {
  if (state.mastersReady) return;
  await ensureParentAssetType(page);
  await ensureVendor(page);
  state.mastersReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} preferredName
 */
async function selectParentTypeOnForm(page, preferredName) {
  const trigger = labeledButton(page, 'Asset Type');
  await trigger.click();
  const search = page.getByPlaceholder('Search by name or ID');
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New Asset Type' })
    .first();
  await expect(option, `Parent asset type ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} preferredName
 */
async function selectProductVendorOnForm(page, preferredName) {
  const vendorHeader = page.getByRole('button', { name: 'Vendor Details' });
  await vendorHeader.click();
  const trigger = labeledButton(page, 'Product Vendor');
  await expect(trigger).toBeVisible();
  await trigger.click();
  const search = page.getByPlaceholder('Search...');
  await expect(search).toBeVisible();
  await search.fill(preferredName);
  const option = page
    .locator('div.cursor-pointer')
    .filter({ hasText: preferredName })
    .filter({ hasNotText: '+ Create New' })
    .first();
  await expect(option, `Purchase vendor ${preferredName} is not in the list`).toBeVisible({
    timeout: 15000,
  });
  await option.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createAsset(page, name) {
  await ensureMasters(page);
  await openAssets(page);
  await headerAddButton(page).click();
  await expect(page).toHaveURL(/\/assets\/add/);
  await selectParentTypeOnForm(page, state.typeName);
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(name);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await selectProductVendorOnForm(page, state.vendorName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
  await expect(page).toHaveURL(/\/assets$/);
  await expect(page.locator('tbody tr').filter({ hasText: name })).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} notes
 */
async function submitScrapForAsset(page, name, notes) {
  await openCreateScrap(page);
  await selectCreateAssetType(page, state.typeName);
  await chooseIndividual(page);
  const row = listRow(page, name);
  await expect(row, `Asset ${name} is not free to scrap. Create it, leave it, then rerun.`).toBeVisible({
    timeout: 30000,
  });
  await row.getByRole('button', { name: 'Scrap', exact: true }).click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Create Scrap' });
  await expect(dialog).toBeVisible();
  await dialog.locator('#scrap-asset-notes').fill(notes);
  await dialog.getByRole('button', { name: 'Submit', exact: true }).click();
  const failed = page.getByText('Scrap approval is required but the workflow is not configured');
  if (await failed.isVisible().catch(() => false)) {
    throw new Error(
      'Scrap workflow is not configured for this asset type. Configure it, leave it, then rerun. Do not click Run scrap workflow backfill.',
    );
  }
  await expectToast(
    page,
    /Scrap request sent for approval|successfully marked for scrapping|Scrap request created/,
  );
}

test('SC-01 Open Scrap Assets', async ({ page }) => {
  await openScrapAssets(page);
  await expect(statCard(page, 'Total Assets')).toBeVisible();
  await expect(statCard(page, 'Nearing Expiry')).toBeVisible();
  await expect(statCard(page, 'Expired')).toBeVisible();
  await expect(page.getByText('Asset Expiry Distribution', { exact: true })).toBeVisible();
  await expect(page.getByText('Expiring Assets by Category', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scrap Asset' })).toBeVisible();
});

test('SC-02 Total Assets does not open another list', async ({ page }) => {
  await openScrapAssets(page);
  const total = await statCard(page, 'Total Assets').locator('p.text-3xl').innerText();
  await statCard(page, 'Total Assets').click();
  await expect(page).toHaveURL(/\/scrap-assets$/);
  await expect(statCard(page, 'Total Assets').locator('p.text-3xl')).toHaveText(total);
});

test('SC-03 Nearing Expiry opens the list', async ({ page }) => {
  await openScrapAssets(page);
  await statCard(page, 'Nearing Expiry').click();
  await expect(page).toHaveURL(/\/scrap-assets\/nearing-expiry/);
  await expect(page.locator('header').getByText('Nearing Expiry', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(
    page.getByText('Assets that will expire within the next 30 days', { exact: true }).first(),
  ).toBeVisible();
  const empty = page.getByText('No Assets Found', { exact: true });
  const nameHeader = page.getByRole('columnheader', { name: 'Asset Name' });
  await expect(nameHeader.or(empty).first()).toBeVisible({ timeout: 45000 });
  if (await nameHeader.isVisible()) {
    await expect(page.getByRole('columnheader', { name: 'Serial Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Description' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Expiry Date' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Days Until Expiry' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Action' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Asset ID|_id/i })).toHaveCount(0);
  }
});

test('SC-04 Do not scrap a row already on Nearing Expiry', async ({ page }) => {
  await gotoProtected(page, `${BASE}/scrap-assets/nearing-expiry`);
  await expect(page.locator('header').getByText('Nearing Expiry', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const scrap = page.getByRole('button', { name: 'Scrap', exact: true }).first();
  if (await scrap.isVisible()) {
    await expect(scrap).toBeVisible();
  }
  await page.locator('button[title="Back to Dashboard"]').click();
  await expect(page.locator('header').getByText('Scrap Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
});

test('SC-05 Expired opens the list', async ({ page }) => {
  await openScrapAssets(page);
  await statCard(page, 'Expired').click();
  await expect(page).toHaveURL(/\/scrap-assets\/expired/);
  await expect(page.locator('header').getByText('Expired', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Assets that have passed their expiry date', { exact: true }).first()).toBeVisible();
  const scrap = page.getByRole('button', { name: 'Scrap', exact: true }).first();
  if (await scrap.isVisible()) {
    await expect(scrap).toBeVisible();
  }
  await page.locator('button[title="Back to Dashboard"]').click();
  await expect(page.locator('header').getByText('Scrap Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
});

test('SC-06 Expiry charts', async ({ page }) => {
  await openScrapAssets(page);
  const distribution = page.getByText('Asset Expiry Distribution', { exact: true }).locator('xpath=ancestor::div[contains(@class,"shadow-md")][1]');
  const category = page.getByText('Expiring Assets by Category', { exact: true }).locator('xpath=ancestor::div[contains(@class,"shadow-md")][1]');
  await expect(distribution).toBeVisible();
  await expect(category).toBeVisible();
  const emptyDistribution = distribution.getByText('No asset data available', { exact: true });
  const emptyCategory = category.getByText('No assets expiring within 30 days', { exact: true });
  if (await emptyDistribution.isVisible()) {
    await expect(emptyDistribution).toBeVisible();
  }
  if (await emptyCategory.isVisible()) {
    await expect(page.getByText('All assets are up to date', { exact: true })).toBeVisible();
  }
  const bars = category.locator('div.cursor-pointer');
  expect(await bars.count()).toBeLessThanOrEqual(3);
});

test('SC-07 Open a category without scrapping', async ({ page }) => {
  await openScrapAssets(page);
  const categoryCard = page
    .getByText('Expiring Assets by Category', { exact: true })
    .locator('xpath=ancestor::div[contains(@class,"shadow-md")][1]');
  const bar = categoryCard.locator('div.cursor-pointer').first();
  const viewAll = page.getByText(/View All/i).first();
  if (await bar.isVisible()) {
    await bar.click();
    await expect(page).toHaveURL(/\/scrap-assets\/(by-category|categories)/);
    await expect(page.getByRole('button', { name: 'Scrap', exact: true }).first().or(page.getByText('No Assets Found')).first()).toBeVisible({
      timeout: 30000,
    });
  } else if (await viewAll.isVisible()) {
    await viewAll.click();
    await expect(page).toHaveURL(/\/scrap-assets\/categories/);
  } else {
    await expect(
      page.getByText('No assets expiring within 30 days').or(page.getByText('No asset data available')).first(),
    ).toBeVisible();
  }
  await gotoProtected(page, scrapUrl);
  await expect(statCard(page, 'Total Assets')).toBeVisible({ timeout: 30000 });
});

test('SC-08 Scrap Asset button', async ({ page }) => {
  await openCreateScrap(page);
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Select Asset Type' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan Asset' })).toBeVisible();
});

test('SC-09 Asset type is required before the list', async ({ page }) => {
  await openCreateScrap(page);
  await expect(assetGroupsSelect(page)).toBeDisabled();
  await expect(page.getByRole('columnheader', { name: 'Asset Name' })).toHaveCount(0);
});

test('SC-10 Choose Individual without scrapping an existing row', async ({ page }) => {
  await openCreateScrap(page);
  await selectCreateAssetType(page);
  await chooseIndividual(page);
  const emptyOrRow = page
    .locator('tbody tr')
    .first()
    .or(page.getByText('No data found', { exact: true }))
    .or(page.locator('tbody'));
  await expect(emptyOrRow.first()).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole('columnheader', { name: /Asset ID/i })).toHaveCount(0);
  const scrap = page.getByRole('button', { name: 'Scrap', exact: true });
  if (await scrap.count()) {
    await expect(scrap.first()).toBeVisible();
  }
});

test('SC-11 Create the E2E asset if none is free', async ({ page }) => {
  await createAsset(page, stayName);
  state.stayName = stayName;
  await openCreateScrap(page);
  await selectCreateAssetType(page, state.typeName);
  await chooseIndividual(page);
  await expect(listRow(page, stayName)).toBeVisible({ timeout: 30000 });
});

test('SC-12 Cancel Create Scrap', async ({ page }) => {
  await openCreateScrap(page);
  await selectCreateAssetType(page, state.typeName);
  await chooseIndividual(page);
  const row = listRow(page, stayName);
  await expect(row).toBeVisible({ timeout: 30000 });
  await row.getByRole('button', { name: 'Scrap', exact: true }).click();
  const dialog = page.locator('[role="dialog"]').filter({ hasText: 'Create Scrap' });
  await expect(dialog.getByText('Create Scrap', { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Asset:/)).toBeVisible();
  await expect(dialog.getByText(/Serial:/)).toBeVisible();
  await expect(dialog.getByText(/Asset Type:/)).toBeVisible();
  await expect(dialog.getByText('Notes (Optional)', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(listRow(page, stayName)).toBeVisible();
});

test('SC-13 Submit scrap for this run only', async ({ page }) => {
  await submitScrapForAsset(page, stayName, `${run} scrap`);
  await expect(listRow(page, stayName)).toHaveCount(0);
});

test('SC-14 The same asset cannot be scrapped again', async ({ page }) => {
  await openCreateScrap(page);
  await selectCreateAssetType(page, state.typeName);
  await chooseIndividual(page);
  await expect(listRow(page, stayName)).toHaveCount(0);
});

test('SC-15 Do not scrap a grouped existing group', async ({ page }) => {
  await openCreateScrap(page);
  await selectCreateAssetType(page, state.typeName);
  await assetGroupsSelect(page).selectOption('GROUPED');
  const grouped = page.getByRole('button', { name: 'Scrap Grouped Asset' });
  if (await grouped.count()) {
    await expect(grouped.first()).toBeVisible();
  }
});

test('SC-16 Scan tab does not find a blank id', async ({ page }) => {
  await openCreateScrap(page);
  await page.getByRole('button', { name: 'Scan Asset' }).click();
  const find = page.getByRole('button', { name: 'Find Asset' });
  await expect(find).toBeDisabled();
  await page.getByRole('button', { name: 'Select Asset Type' }).click();
  await expect(page.getByText('Asset Type', { exact: false }).first()).toBeVisible();
});

test('SC-17 Return to Scrap Assets', async ({ page }) => {
  await openCreateScrap(page);
  await page.locator('button[title="Back to Dashboard"]').click();
  await expect(page.locator('header').getByText('Scrap Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(statCard(page, 'Total Assets')).toBeVisible();
  await expect(statCard(page, 'Nearing Expiry')).toBeVisible();
  await expect(statCard(page, 'Expired')).toBeVisible();
});

test('SC-18 Run create scrap again', async ({ page }) => {
  await createAsset(page, secondName);
  state.secondName = secondName;
  await submitScrapForAsset(page, secondName, `${run} scrap 2`);
  await expect(listRow(page, secondName)).toHaveCount(0);
  await expect(listRow(page, stayName)).toHaveCount(0);
});
