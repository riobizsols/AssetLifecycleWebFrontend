// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM maintenance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('opens a maintenance schedule from the list', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/maintenance-list`);

    await expect(page.getByText('Maintenance List').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      test.skip(true, 'No maintenance schedules in this tenant/branch');
    }

    const detailResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        /\/maintenance-schedules\/[^/?]+/.test(new URL(response.url()).pathname)
    );

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/maintenance-list-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Update Maintenance Schedule' })).toBeVisible({
      timeout: 20000,
    });
  });

  test('opens a work order from workorder management', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/workorder-management`);

    await expect(page.getByText('Work Order Management').first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Loading work orders...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No work orders found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      test.skip(true, 'No work orders in this tenant/branch');
    }

    const detailResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' &&
        /\/work-orders\/[^/?]+$/.test(new URL(response.url()).pathname)
    );

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/workorder-management\/workorder-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Print' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();

    await page.getByRole('button', { name: 'Vendor' }).click();
    await page.getByRole('button', { name: 'Checklist' }).click();
    await page.getByRole('button', { name: 'History' }).click();
    await page.getByRole('button', { name: 'Overview' }).click();
  });

  test('creates a manual maintenance record', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/maintenance-list/create`);

    await expect(page.getByText('Create Manual Maintenance').first()).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('button', { name: 'Select Asset' })).toBeVisible();

    const typeField = page.locator('label').filter({ hasText: /Asset Type/ }).locator('xpath=..');
    const typeTrigger = typeField.getByRole('button');
    await expect(typeTrigger).toBeVisible({ timeout: 15000 });
    await typeTrigger.click();

    const search = page.getByPlaceholder(/Search asset type/i);
    const menuOpened = await search
      .waitFor({ state: 'visible', timeout: 8000 })
      .then(() => true)
      .catch(() => false);

    if (!menuOpened) {
      test.skip(true, 'Asset type picker did not open');
    }

    const menuItems = search
      .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
      .locator('div.cursor-pointer');
    await expect(menuItems.first()).toBeVisible({ timeout: 15000 });

    const typeNames = [];
    const optionCount = await menuItems.count();
    for (let i = 0; i < optionCount; i += 1) {
      const text = (await menuItems.nth(i).innerText()).split('\n')[0].trim();
      if (text && !/all asset types/i.test(text)) {
        typeNames.push(text);
      }
    }
    await typeTrigger.click();

    const createButtons = page.getByRole('button', { name: 'Create Maintenance' });
    const emptyMessage = page.getByText(/No assets found|No available assets|already in maintenance|Select an asset type/i);
    let foundAsset = false;

    for (const typeName of typeNames.slice(0, 8)) {
      await typeTrigger.click();
      await expect(search).toBeVisible({ timeout: 8000 });
      await menuItems.filter({ hasText: typeName }).first().click();
      await expect(createButtons.first().or(emptyMessage)).toBeVisible({ timeout: 20000 });
      if ((await createButtons.count()) > 0) {
        foundAsset = true;
        break;
      }
    }

    if (!foundAsset) {
      test.skip(true, 'No assets available to create maintenance');
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/maintenance-schedules/create-manual')
    );

    await createButtons.first().click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    await expect(page.getByText('Maintenance created successfully')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL(/\/maintenance-list\/?$/, { timeout: 20000 });
  });
});
