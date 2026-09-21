// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { BASE } from './helpers/baseUrl.js';
import { selectAssetTypeWithAvailability } from './helpers/searchableDropdown.js';

/**
 * Click the SearchableDropdown button under a field label.
 * @param {import('@playwright/test').Page} page
 * @param {RegExp} labelRe
 */
function fieldButton(page, labelRe) {
  return page
    .locator('label')
    .filter({ hasText: labelRe })
    .locator('xpath=..')
    .getByRole('button')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} trigger
 */
async function pickFirstDropdownOption(page, trigger) {
  await trigger.click();
  const search = page.getByPlaceholder(/Search/i);
  await expect(search).toBeVisible({ timeout: 10000 });
  const opts = search
    .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
    .locator('div.cursor-pointer');
  await expect(opts.first()).toBeVisible({ timeout: 15000 });
  await opts.first().click();
}

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
    if ((await unassignButtons.count()) > 0) {
      await unassignButtons.first().click();
      await expect(page.getByText('Do you want to unassign this asset?')).toBeVisible();
      await page.getByRole('button', { name: 'Unassign' }).last().click();
      await page
        .getByText(/unassigned successfully|successfully/i)
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => {});
    }

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
      page.getByText(/Asset assigned to department successfully/i)
    ).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/assign-department-assets/, { timeout: 20000 });
    await expect(page.getByText('Department Assets List')).toBeVisible();
  });

  test('assigns an asset to an employee', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/assign-employee-assets`);
    await expect(page.getByText('Select Department and Employee')).toBeVisible({
      timeout: 20000,
    });

    const branchBtn = fieldButton(page, /^Branch$/i);
    const deptBtn = fieldButton(page, /^Department$/i);
    await expect(branchBtn).toBeVisible({ timeout: 20000 });
    await expect(deptBtn).toBeVisible({ timeout: 20000 });

    // ACM often pre-fills Branch/Department (button text is the name, not "Select …").
    const branchText = ((await branchBtn.innerText()) || '').trim();
    if (/^Select Branch/i.test(branchText) && !(await branchBtn.isDisabled())) {
      await pickFirstDropdownOption(page, branchBtn);
    }

    await expect(async () => {
      const deptText = ((await deptBtn.innerText()) || '').trim();
      if (/^Select Department/i.test(deptText) && !(await deptBtn.isDisabled())) {
        await pickFirstDropdownOption(page, deptBtn);
      }
      const employeeBtn = fieldButton(page, /^(Employee|Employees)$/i);
      await expect(employeeBtn).toBeVisible({ timeout: 5000 });
    }).toPass({ timeout: 45000 });

    const employeeBtn = fieldButton(page, /^(Employee|Employees)$/i);
    await expect(employeeBtn).toBeEnabled({ timeout: 20000 });
    await pickFirstDropdownOption(page, employeeBtn);

    const assignCta = page.getByRole('button', { name: 'Assign Asset' });
    await expect(assignCta).toBeEnabled({ timeout: 15000 });

    const unassignButtons = page.getByRole('button', { name: 'Unassign' });
    if ((await unassignButtons.count()) > 0) {
      await unassignButtons.first().click();
      await expect(page.getByText('Do you want to unassign this asset?')).toBeVisible();
      await page.getByRole('button', { name: 'Unassign' }).last().click();
      await page
        .getByText(/unassigned successfully|successfully/i)
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .catch(() => {});
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
      page.getByText(/Asset assigned to employee successfully/i)
    ).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/\/assign-employee-assets/, { timeout: 20000 });
    await expect(page.getByText('Employee Assets List')).toBeVisible();
  });
});
