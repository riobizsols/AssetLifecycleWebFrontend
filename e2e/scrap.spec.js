// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM scrap', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads the scrap assets dashboard', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-assets`);

    // KPI labels only appear after the summary fetch clears the skeleton.
    await expect(page.getByText('Total Assets')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Nearing Expiry').first()).toBeVisible();
    await expect(page.getByText('Expired').first()).toBeVisible();
    await expect(page.getByText('Asset Expiry Distribution')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scrap Asset' })).toBeVisible();
  });

  test('opens nearing expiry from the scrap dashboard', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-assets`);
    await expect(page.getByText('Total Assets')).toBeVisible({ timeout: 60000 });

    await page.getByRole('paragraph').filter({ hasText: 'Nearing Expiry' }).click();
    await page.waitForURL(/\/scrap-assets\/nearing-expiry\/?$/, { timeout: 20000 });
    await expect(page.getByText('Nearing Expiry').first()).toBeVisible({ timeout: 20000 });
  });

  test('opens scrap sales list and create form', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-sales`);

    await expect(page.getByText('Scrap Sales').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(/Loading scrap sales/i)).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No scrap sales found');
    const rows = page.locator('tbody tr');
    if (!(await empty.isVisible()) && (await rows.count()) > 0) {
      await expect(page.getByText('Sale Title').first()).toBeVisible();
    }

    await gotoProtected(page, `${BASE}/scrap-sales/create`);
    await expect(page).toHaveURL(/\/scrap-sales\/create\/?$/);
    await expect(page.getByText('Create Scrap Sale').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Asset Selection').first()).toBeVisible();
    await expect(page.getByText('Available Assets').first()).toBeVisible();
  });

  test('opens a scrap approval from the list', async ({ page }) => {
    test.setTimeout(90000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-approval`);

    await expect(page.getByText(/Scrap Approval|Workflow ID|Asset Type/).first()).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No Data Found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      test.skip(true, 'No scrap approvals in this tenant/branch');
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      const path = new URL(response.url()).pathname;
      return /\/scrap-maintenance\/workflow\//.test(path);
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/scrap-approval-detail\//, { timeout: 20000 });

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok()).toBeTruthy();

    await expect(page.getByText('Approval Initiated')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Asset Details' })).toBeVisible();
  });

  test('creates a scrap request for an individual asset', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/scrap-assets/create`);
    await expect(page).toHaveURL(/\/scrap-assets\/create\/?$/);
    await expect(page.getByRole('heading', { name: 'Create Scrap Asset' })).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByText('Asset Selection')).toBeVisible();

    const typeTrigger = page
      .locator('label')
      .filter({ hasText: /^Asset Type/ })
      .locator('xpath=following-sibling::*[1]')
      .getByRole('button');
    await expect(typeTrigger).toBeVisible({ timeout: 15000 });
    await typeTrigger.click();

    const search = page.getByPlaceholder(/Search asset types/i);
    await expect(search).toBeVisible({ timeout: 10000 });
    const panel = page.locator('div.fixed').filter({ has: search });
    const menuItems = panel.locator('div.cursor-pointer');
    await expect(menuItems.first()).toBeVisible({ timeout: 15000 });

    const typeNames = [];
    const optionCount = await menuItems.count();
    for (let i = 0; i < optionCount; i += 1) {
      const name = (await menuItems.nth(i).innerText()).split('\n')[0].trim();
      if (name) typeNames.push(name);
    }
    expect(typeNames.length, 'No asset types in the scrap picker').toBeGreaterThan(0);

    const scrapButtons = page.getByRole('button', { name: 'Scrap', exact: true });
    const emptyMessage = page.getByText(/No data found|Select Asset Type to Continue|no assets/i);
    let created = false;
    let createBody = {};

    for (const typeName of typeNames.slice(0, 6)) {
      if (!(await search.isVisible())) {
        await typeTrigger.click({ timeout: 8000 });
        await expect(search).toBeVisible({ timeout: 8000 });
      }

      await search.fill(typeName);
      await menuItems.filter({ hasText: typeName }).first().click();
      await expect(search).toBeHidden({ timeout: 5000 });

      const groupSelect = page.locator('select').filter({ hasText: 'Individual' });
      await expect(groupSelect).toBeEnabled({ timeout: 10000 });
      await groupSelect.selectOption('INDIVIDUAL');

      await expect(scrapButtons.first().or(emptyMessage)).toBeVisible({ timeout: 20000 });
      if ((await scrapButtons.count()) === 0) continue;

      await scrapButtons.first().click();
      const submit = page.getByRole('button', { name: 'Submit' });
      await expect(submit).toBeVisible({ timeout: 10000 });
      await page
        .getByPlaceholder(/Enter any additional notes about this scrap asset/i)
        .fill(`PW-E2E scrap ${Date.now()}`);

      const createResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          response.url().includes('/scrap-maintenance/create'),
        { timeout: 20000 }
      );
      await submit.click();
      const createResponse = await createResponsePromise;
      const rawBody = await createResponse.text();
      try {
        createBody = JSON.parse(rawBody);
      } catch {
        createBody = {};
      }

      if (!createResponse.ok() || !createBody?.success) continue;

      created = true;
      await expect(
        page.getByText(/Scrap request sent for approval|successfully marked for scrapping|Scrap request created/i)
      ).toBeVisible({ timeout: 15000 });
      break;
    }

    expect(created, `Could not create a scrap request: ${JSON.stringify(createBody)}`).toBeTruthy();

    const workflowId = createBody?.wfscrap_h_id;
    if (!workflowId) return;

    await gotoProtected(
      page,
      `${BASE}/scrap-approval-detail/${workflowId}?context=SCRAPMAINTENANCEAPPROVAL`
    );

    const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
    const notFound = page.getByText(/Scrap workflow not found/i);
    const detailReady = page
      .getByText(/Approval Initiated|Workflow ID|Approval Details|Asset Details/i)
      .first();
    await expect(unauthorized.or(notFound).or(detailReady).first()).toBeVisible({ timeout: 45000 });

    // Create already succeeded; detail may lag or be permission-gated.
    if (await unauthorized.isVisible().catch(() => false)) return;
    if (await notFound.isVisible().catch(() => false)) return;

    await expect(
      page.getByRole('button', { name: 'Asset Details' }).or(page.getByText('Approval Initiated')).first()
    ).toBeVisible({ timeout: 20000 });
  });
});
