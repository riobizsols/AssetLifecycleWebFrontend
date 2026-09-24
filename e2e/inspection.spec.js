// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM inspection', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('opens an inspection from the list', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/inspection-view`);

    await expect(page.getByText('Inspection View').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      test.skip(true, 'No inspection schedules visible for this user');
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      const path = new URL(response.url()).pathname;
      return (
        /\/inspection\/[^/]+$/.test(path) &&
        !/\/inspection\/(list|create-manual|generate)/.test(path)
      );
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/inspection-view\/(?!create)[^/]+\/?$/, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('heading', { name: 'Inspection Checklist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('triggers a manual inspection and opens the record', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/inspection-view/create`);
    await expect(page).toHaveURL(/\/inspection-view\/create\/?$/);
    await expect(page.getByText('Trigger Inspection for Asset').first()).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByText('Select an asset type to see available assets.')).toBeVisible();

    const typeTrigger = page
      .locator('label')
      .filter({ hasText: /^Asset Type/ })
      .locator('xpath=following-sibling::*[1]')
      .getByRole('button');
    await expect(typeTrigger).toBeVisible({ timeout: 15000 });
    await typeTrigger.click();

    const search = page.getByPlaceholder(/Search asset type/i);
    await expect(search).toBeVisible({ timeout: 10000 });
    const panel = search.locator(
      'xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]'
    );
    const menuItems = panel.locator('div.cursor-pointer');
    await expect(menuItems.first()).toBeVisible({ timeout: 15000 });
    // Do not wait on aria-label="Loading" — SearchableDropdown puts that on every
    // option while secondary fields load, so count never reaches 0.

    const typesToTry = [];
    const optionCount = await menuItems.count();
    for (let i = 0; i < optionCount; i += 1) {
      const text = await menuItems.nth(i).innerText();
      const name = text.split('\n')[0].trim();
      if (!name || /all asset types/i.test(name) || !/\([1-9]\d*\)/.test(text)) continue;
      typesToTry.push({ index: i, name });
    }
    typesToTry.sort((a, b) => {
      const rank = (name) => {
        if (/^ac unit$/i.test(name)) return 0;
        if (/fisptest/i.test(name)) return 1;
        return 2;
      };
      return rank(a.name) - rank(b.name);
    });
    // No creatable assets in this ACM scope — page + type picker smoke is enough.
    if (typesToTry.length === 0) {
      await typeTrigger.click().catch(() => {});
      await expect(page.getByText('Trigger Inspection for Asset').first()).toBeVisible();
      await expect(typeTrigger).toBeVisible();
      return;
    }

    const chosen = typesToTry[0];
    await search.fill(chosen.name);
    await menuItems.filter({ hasText: chosen.name }).first().click();
    await expect(search).toBeHidden({ timeout: 5000 });
    await expect(page).toHaveURL(/\/inspection-view\/create\/?$/);

    const triggerButtons = page.getByRole('button', { name: 'Trigger Inspection' });
    const noAssets = page.getByText(/No assets|Select an asset type|already/i);
    await expect(triggerButtons.first().or(noAssets.first())).toBeVisible({ timeout: 20000 });
    if ((await triggerButtons.count()) === 0) {
      await expect(page.getByText('Trigger Inspection for Asset').first()).toBeVisible();
      return;
    }

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/inspection/create-manual'),
      { timeout: 20000 }
    );
    await triggerButtons.first().click();
    const createResponse = await createResponsePromise;
    const rawBody = await createResponse.text();
    let body = {};
    try {
      body = JSON.parse(rawBody);
    } catch {
      body = {};
    }
    const aisId = body?.data?.ais_id || body?.ais_id || '';
    const workflowId = body?.data?.wfaiish_id || '';
    expect(
      createResponse.ok(),
      `create-manual failed (${createResponse.status()}): ${rawBody.slice(0, 500)}`
    ).toBeTruthy();
    expect(
      aisId || workflowId,
      `create-manual response missing schedule id: ${rawBody.slice(0, 500)}`
    ).toBeTruthy();

    await expect(page.getByText('Inspection created successfully')).toBeVisible({
      timeout: 15000,
    });

    if (workflowId && !aisId) {
      await page.goto(
        `${BASE}/inspection-approval-detail/${workflowId}`
      );
      await page.waitForURL(
        new RegExp(`/inspection-approval-detail/${workflowId}`),
        { timeout: 20000 }
      );
      await expect(page.getByText('Approval Initiated')).toBeVisible({ timeout: 20000 });
      await expect(page.getByRole('button', { name: 'Asset Details' })).toBeVisible();
      return;
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return new URL(response.url()).pathname.includes(`/inspection/${aisId}`);
    });

    await page.goto(`${BASE}/inspection-view/${aisId}`);
    await page.waitForURL(new RegExp(`/inspection-view/${aisId}`), { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByRole('heading', { name: 'Asset Information' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByRole('heading', { name: 'Inspection Checklist' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });
});
