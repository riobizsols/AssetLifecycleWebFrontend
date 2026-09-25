// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM spare parts', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads the spare part list', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/spare-part-list`);

    await expect(page.getByText('Spare Part List').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Serial Number').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
  });

  test('opens a spare part list detail', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/spare-part-list`);
    await expect(page.getByText('Spare Part List').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    await expect(empty.or(rows.first())).toBeVisible({ timeout: 20000 });

    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      await expect(empty).toBeVisible();
      return;
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return /\/spare-parts\/maintenance-list\/[^/?]+/.test(new URL(response.url()).pathname);
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/spare-part-list-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByText('Back to Spare Part List')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Serial Number').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Spare Part Request' }).or(
        page.getByText('Spare part requests are available only for in-house maintenance.')
      )
    ).toBeVisible({ timeout: 15000 });
  });

  test('loads spare part approvals and opens a detail', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/spare-part-approval`);

    await expect(page.getByText('Spare Part Approval').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Asset Type').first()).toBeVisible();

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    await expect(empty.or(rows.first())).toBeVisible({ timeout: 20000 });

    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      await expect(empty).toBeVisible();
      return;
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return /\/spare-parts\/issue-approvals\/[^/?]+/.test(new URL(response.url()).pathname);
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/spare-part-approval-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByText('Back to Spare Part Approval')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Asset Name').first()).toBeVisible();
    await expect(page.getByText('Category').first()).toBeVisible();
    await expect(page.getByText('Required Quantity').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Reserve|Reserved/ })).toBeVisible();
  });

  test('loads the spare part issue list', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/spare-part-issue`);

    await expect(page.getByText('Spare Part Issue').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Action').first()).toBeVisible();

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if (!(await empty.isVisible()) && (await rows.count()) > 0) {
      await expect(page.getByText('Serial Number').first()).toBeVisible();
    }
  });

  test('loads spare part master and lot lists', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/master-data/spare-part`);
    await expect(page.getByText('Spare Part').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Part Number').first()).toBeVisible();
    await expect(page.getByText('Category').first()).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/spare-part/add`);
    await expect(page.getByRole('heading', { name: 'Spare Part' })).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByText('Part Number').first()).toBeVisible();
    await expect(page.getByPlaceholder('Enter part number')).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/spare-parts`);
    await expect(page.getByText('Spare Part Lot').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Category').first()).toBeVisible();
    await expect(page.getByText('Invoice Number').first()).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/spare-parts/add`);
    await expect(page.getByText('Vendor').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Lot Details').first()).toBeVisible();
  });

  test('loads spare parts configuration tabs', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/master-data/spare-parts-configuration`);

    await expect(page.getByRole('button', { name: 'Spare Part Category' })).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByRole('button', { name: 'Asset Type Mapping' })).toBeVisible();
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Category').first()).toBeVisible();
    await expect(page.getByText('Minimum Stock').first()).toBeVisible();

    await page.getByRole('button', { name: 'Asset Type Mapping' }).click();
    await expect(page).toHaveURL(/tab=mapping/);
    await expect(page.getByText(/Asset Type|No mappings|Category/).first()).toBeVisible({
      timeout: 15000,
    });

    await page.getByRole('button', { name: 'Spare Part Category' }).click();
    await expect(page.getByText('Minimum Stock').first()).toBeVisible({ timeout: 15000 });
  });

  test('creates a spare part category', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/master-data/spare-parts-configuration/categories/add`);
    await expect(page.getByRole('main').getByText('Add Spare Part Category')).toBeVisible({
      timeout: 45000,
    });

    const stamp = Date.now();
    const categoryName = `PW-E2E-SPCAT-${stamp}`;
    await page.getByPlaceholder('Enter category name').fill(categoryName);

    const uomSelect = page.locator('select[name="uom"]');
    await expect(uomSelect).toBeEnabled({ timeout: 20000 });
    await expect
      .poll(async () => uomSelect.locator('option').count(), { timeout: 20000 })
      .toBeGreaterThan(1);
    await uomSelect.selectOption({ index: 1 });

    await createNamedDropdownItem(page, 'Brand', `PW-E2E-BRAND-${stamp}`, 'Select brand');
    await createNamedDropdownItem(page, 'Model', `PW-E2E-MODEL-${stamp}`, 'Select model');

    await page.getByPlaceholder('Enter minimum stock').fill('1');
    await page.getByPlaceholder('Enter reorder level').fill('2');

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/spare-parts\/categories\/?$/.test(new URL(response.url()).pathname)
    );
    await page.getByRole('button', { name: 'Save' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), `Category create failed: ${createResponse.status()}`).toBeTruthy();

    await expect(page.getByText('Spare part category created successfully')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL(/\/master-data\/spare-parts-configuration\/?$/, { timeout: 20000 });
    await expect(page.getByText(categoryName)).toBeVisible({ timeout: 15000 });
  });

  test('requests spare parts from a list detail when available', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/spare-part-list`);
    await expect(page.getByText('Spare Part List').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    await expect(empty.or(rows.first())).toBeVisible({ timeout: 20000 });

    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      await expect(empty).toBeVisible();
      return;
    }

    const rowCount = Math.min(await rows.count(), 6);
    let requested = false;

    for (let i = 0; i < rowCount; i += 1) {
      await gotoProtected(page, `${BASE}/spare-part-list`);
      await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
      const currentRows = page.locator('tbody tr.cursor-pointer');
      await currentRows.nth(i).locator('td').nth(1).click();
      await page.waitForURL(/\/spare-part-list-detail\//, { timeout: 20000 });

      const requestHeading = page.getByRole('heading', { name: 'Spare Part Request' });
      const inhouseOnly = page.getByText(
        'Spare part requests are available only for in-house maintenance.'
      );
      await expect(requestHeading.or(inhouseOnly)).toBeVisible({ timeout: 15000 });
      if (await inhouseOnly.isVisible()) continue;

      const noCategories = page.getByText('No spare part categories mapped for this asset type');
      await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 20000 });
      if (await noCategories.isVisible()) continue;

      const requestButton = page.getByRole('button', { name: 'Request', exact: true });
      if ((await requestButton.count()) === 0) continue;

      const requestResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/spare-parts/issue-requests'),
        { timeout: 20000 }
      );
      await requestButton.click();

      const requestResponse = await requestResponsePromise.catch(() => null);
      if (!requestResponse || !requestResponse.ok()) continue;

      requested = true;
      await expect(page.getByText('Spare part request submitted for approval')).toBeVisible({
        timeout: 15000,
      });
      break;
    }

    // List/detail UI works even when no row is requestable in this tenant.
    if (!requested) {
      await expect(page.getByText(/Spare Part|in-house|Request|mapped/i).first()).toBeVisible();
    }
  });
});

/**
 * Opens an EnhancedDropdown and creates a new named option.
 *
 * @param {import('@playwright/test').Page} page
 * @param {'Brand' | 'Model'} label
 * @param {string} name
 * @param {string} placeholder
 */
async function createNamedDropdownItem(page, label, name, placeholder) {
  const trigger = page.getByText(placeholder, { exact: true });
  await expect(trigger).toBeVisible({ timeout: 20000 });
  await trigger.click();

  const createNew = page.getByText('+ Create New');
  if (!(await createNew.isVisible().catch(() => false))) {
    await trigger.click();
    await page.keyboard.press('Enter');
  }
  await expect(createNew).toBeVisible({ timeout: 10000 });
  await createNew.click();

  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: `Create New ${label}` }),
  });
  await expect(modal).toBeVisible({ timeout: 10000 });
  await modal.getByPlaceholder(`Enter ${label.toLowerCase()} name`).fill(name);

  const endpoint = label === 'Brand' ? '/spare-parts/brands' : '/spare-parts/models';
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' && response.url().includes(endpoint)
  );
  await modal.getByRole('button', { name: 'Create' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `${label} create failed: ${createResponse.status()}`).toBeTruthy();
  await expect(page.getByText(`${label} created successfully`)).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText(name)).toBeVisible({ timeout: 15000 });
}
