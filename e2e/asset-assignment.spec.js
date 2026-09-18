// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { BASE } from './helpers/baseUrl.js';
import { selectAssetTypeWithAvailability } from './helpers/searchableDropdown.js';

test.describe('RIO EAM asset assignment', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Assign once on live data');
  test.describe.configure({ mode: 'serial' });

  test('assigns an asset to a department', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/assign-department-assets`);
    await expect(page.getByText('Department Selection')).toBeVisible({ timeout: 20000 });

    const assignCta = page.getByRole('button', { name: 'Assign Asset' });
    await expect(assignCta).toBeEnabled({ timeout: 20000 });

    const unassignButtons = page.getByRole('button', { name: 'Unassign' });
    await expect(unassignButtons.first()).toBeVisible({ timeout: 20000 });
    await unassignButtons.first().click();
    await expect(page.getByText('Do you want to unassign this asset?')).toBeVisible();
    await page.getByRole('button', { name: 'Unassign' }).last().click();
    await expect(page.getByText('Asset unassigned successfully')).toBeVisible({
      timeout: 15000,
    });

    await assignCta.click();
    await page.waitForURL(/\/asset-selection/, { timeout: 20000 });
    await expect(page.getByText('Asset Selection')).toBeVisible();

    const pickedType = await selectAssetTypeWithAvailability(page);
    expect(pickedType, 'No unassigned department asset available').toBeTruthy();

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        /\/asset-assignments\/?$/.test(new URL(response.url()).pathname)
    );

    await page.getByRole('button', { name: 'Assign Asset' }).first().click();
    const assignResponse = await assignResponsePromise;
    expect(assignResponse.ok()).toBeTruthy();

    await expect(
      page.getByText('Asset assigned to department successfully')
    ).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/assign-department-assets/, { timeout: 20000 });
    await expect(page.getByText('Department Assets List')).toBeVisible();
  });

  test('assigns an asset to an employee', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/assign-employee-assets`);
    await expect(page.getByText('Select Department and Employee')).toBeVisible({
      timeout: 20000,
    });

    const employeeTrigger = page.getByRole('button', { name: 'Select Employee' });
    await expect(employeeTrigger).toBeVisible({ timeout: 15000 });
    await employeeTrigger.click();

    const employeeSearch = page.getByPlaceholder(/Search/i);
    const menuOpened = await employeeSearch
      .waitFor({ state: 'visible', timeout: 5000 })
      .then(() => true)
      .catch(() => false);

    if (!menuOpened) {
      test.skip(true, 'No employees available in the selected department');
    }

    const employeeOptions = employeeSearch
      .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
      .locator('div.cursor-pointer');
    await expect(employeeOptions.first()).toBeVisible({ timeout: 15000 });
    await employeeOptions.first().click();

    const assignCta = page.getByRole('button', { name: 'Assign Asset' });
    await expect(assignCta).toBeEnabled({ timeout: 15000 });

    const unassignButtons = page.getByRole('button', { name: 'Unassign' });
    if ((await unassignButtons.count()) > 0) {
      await unassignButtons.first().click();
      await expect(page.getByText('Do you want to unassign this asset?')).toBeVisible();
      await page.getByRole('button', { name: 'Unassign' }).last().click();
      await expect(page.getByText('Asset unassigned successfully')).toBeVisible({
        timeout: 15000,
      });
    }

    await assignCta.click();
    await page.waitForURL(/\/asset-selection/, { timeout: 20000 });
    await expect(page.getByText('Asset Selection')).toBeVisible();

    const pickedType = await selectAssetTypeWithAvailability(page);
    expect(pickedType, 'No unassigned employee asset available').toBeTruthy();

    const assignResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/asset-assignments/employee')
    );

    await page.getByRole('button', { name: 'Assign Asset' }).first().click();
    const assignResponse = await assignResponsePromise;
    expect(assignResponse.ok()).toBeTruthy();

    await expect(
      page.getByText('Asset assigned to employee successfully')
    ).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/assign-employee-assets/, { timeout: 20000 });
    await expect(page.getByText('Employee Assets List')).toBeVisible();
  });
});
