// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';

import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM report breakdown', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads the list, opens selection, and reports a breakdown when possible', async ({ page }) => {
    test.setTimeout(240000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/report-breakdown`);

    await expect(page.getByText('Report Breakdown').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Reported By').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Description').first()).toBeVisible();

    const addButton = page.locator('main button').filter({ has: page.locator('svg.lucide-plus') });
    if ((await addButton.count()) === 0) {
      await openEmployeeReportBreakdown(page);
      return;
    }

    await addButton.click();
    await page.waitForURL(/\/breakdown-selection\/?/, { timeout: 20000 });
    await expect(page.getByText('Breakdown Selection')).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Select Asset' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Scan Asset' })).toBeVisible();
    await expect(page.getByText('Available Assets')).toBeVisible();

    await page.getByRole('button', { name: 'Scan Asset' }).click();
    await expect(page.getByPlaceholder('Scan or enter asset ID')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Breakdown' })).toBeVisible();
    await page.getByRole('button', { name: 'Select Asset' }).click();

    const created = await tryCreateBreakdown(page);
    if (!created) {
      await openEmployeeReportBreakdown(page);
      return;
    }

    await page.waitForURL(/\/report-breakdown\/?$/, { timeout: 20000 });
    await expect(page.getByText('Report Breakdown').first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/PW-E2E-BD-/)).toBeVisible({ timeout: 15000 });

    await openEmployeeReportBreakdown(page);
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openEmployeeReportBreakdown(page) {
  await page.goto(`${BASE}/employee-report-breakdown`);
  const heading = page.getByText('Employee Report Breakdown').first();
  if (!(await heading.isVisible().catch(() => false))) return;
  await expect(heading).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
  await expect(
    page.getByText('No data found').or(page.getByText('Reported By').first())
  ).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function tryCreateBreakdown(page) {
  const assetTypeSelect = page.locator('select').first();
  await expect(assetTypeSelect).toBeVisible({ timeout: 20000 });
  await expect.poll(async () => assetTypeSelect.locator('option').count(), { timeout: 20000 }).toBeGreaterThan(1);

  const optionCount = await assetTypeSelect.locator('option').count();
  const createButtons = page.getByRole('button', { name: 'Create Breakdown' });
  const emptyMessage = page.getByText('No assets found for the selected asset type.');
  let foundAsset = false;

  for (let i = 1; i < Math.min(optionCount, 9); i += 1) {
    await assetTypeSelect.selectOption({ index: i });
    await expect(createButtons.first().or(emptyMessage)).toBeVisible({ timeout: 20000 });
    if ((await createButtons.count()) > 0) {
      foundAsset = true;
      break;
    }
  }

  if (!foundAsset) return false;

  await createButtons.first().click();
  await page.waitForURL(/\/breakdown-details\/?/, { timeout: 20000 });
  await expect(page.getByText('Breakdown Report').first()).toBeVisible({ timeout: 20000 });
  await expect(page.getByText('Asset Details')).toBeVisible();
  await expect(page.getByText('Breakdown Details')).toBeVisible();

  await selectOrCreateReason(page);
  await page.getByPlaceholder('Max 500 characters...').fill(`PW-E2E-BD-${Date.now()}`);

  const decisionTrigger = page.getByText('Select Decision Code', { exact: true });
  if (await decisionTrigger.isVisible().catch(() => false)) {
    await selectEnhancedOption(page, 'Select Decision Code', 'BF03 - Postpone fix to next maintenance');
    await selectEnhancedOption(page, 'Select Priority', 'Medium');
  } else {
    const priorityTrigger = page.getByText('Select Priority', { exact: true });
    if (await priorityTrigger.isVisible().catch(() => false)) {
      await selectEnhancedOption(page, 'Select Priority', 'High');
    }
  }

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/reportbreakdown/create')
  );
  await page.getByRole('button', { name: 'Report Breakdown' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Breakdown create failed: ${createResponse.status()}`).toBeTruthy();
  await expect(page.getByText('Breakdown report created successfully')).toBeVisible({
    timeout: 20000,
  });
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectOrCreateReason(page) {
  const trigger = page.getByText('Select Breakdown Reason', { exact: true });
  await expect(trigger).toBeVisible({ timeout: 20000 });
  await trigger.click();

  const createNew = page.getByText('+ Create New');
  const options = page.locator('div.cursor-pointer').filter({ hasNotText: '+ Create New' });
  const hasExisting = (await options.count()) > 0 && (await options.first().isVisible().catch(() => false));

  if (hasExisting) {
    await options.first().click();
    return;
  }

  await expect(createNew).toBeVisible({ timeout: 10000 });
  await createNew.click();
  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: 'Create New Breakdown Reason Code' }),
  });
  await expect(modal).toBeVisible({ timeout: 10000 });
  await modal
    .getByPlaceholder(/Enter breakdown reason code/i)
    .fill(`PW-E2E-REASON-${Date.now()}`);

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      response.url().includes('/breakdown-reason-codes')
  );
  await modal.getByRole('button', { name: 'Create' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Reason create failed: ${createResponse.status()}`).toBeTruthy();
  await expect(page.getByText('Breakdown reason code created successfully')).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} placeholder
 * @param {string} optionText
 */
async function selectEnhancedOption(page, placeholder, optionText) {
  const trigger = page.getByText(placeholder, { exact: true });
  await expect(trigger).toBeVisible({ timeout: 15000 });
  await trigger.click();
  const option = page.getByText(optionText, { exact: true });
  await expect(option).toBeVisible({ timeout: 10000 });
  await option.click();
}
