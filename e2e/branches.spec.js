// @ts-check
/**
 * Branches screen.
 * Dynamic and safe to run more than once: created rows use a new name and code
 * each run, and the test deletes that row before it finishes.
 *
 * Run from AssetLifecycleWebFrontend:
 *   npx playwright test e2e/branches.spec.js
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const HEADERS = ['Organization', 'Is Active', 'Branch Name', 'City', 'Branch Code', 'Actions'];

function uniqueBranch() {
  const stamp = Date.now().toString(36);
  return {
    name: `E2E Branch ${stamp}`,
    editedName: `E2E Branch ${stamp} Updated`,
    code: `E2E${stamp}`.slice(0, 20),
    city: 'Chennai',
  };
}

/** @param {import('@playwright/test').Page} page */
function rows(page) {
  return page.locator('tbody tr').filter({ has: page.locator('input[type="checkbox"]') });
}

/** @param {import('@playwright/test').Page} page */
function rowByName(page, name) {
  return rows(page).filter({ hasText: name }).first();
}

/** @param {import('@playwright/test').Page} page */
async function openBranches(page) {
  await loginToRioEam(page);
  await gotoProtected(page, `${BASE}/master-data/branches`);
  await expect(page.getByRole('columnheader', { name: 'Branch Name' })).toBeVisible({ timeout: 45000 });
  await expect(page.getByText(/^Loading\.\.\.$/)).toHaveCount(0, { timeout: 30000 });
}

/** @param {import('@playwright/test').Page} page */
async function clearFilter(page) {
  const minus = page.locator('button:has(svg.lucide-minus)').first();
  if (await minus.isVisible().catch(() => false)) await minus.click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 * @param {string} valueText
 */
async function filterByColumn(page, columnLabel, valueText) {
  await clearFilter(page);
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  await page.locator('select').filter({ hasText: 'Select column' }).last().selectOption({ label: columnLabel });
  await page.getByRole('button', { name: /Select values/ }).click();
  await page.getByPlaceholder('Search...').fill(valueText);
  await page.locator('div.cursor-pointer').filter({ hasText: valueText }).first().click();
  await page.keyboard.press('Escape');
}

/** @param {import('@playwright/test').Page} page */
async function chooseFirstOrganization(page) {
  const orgSelect = page.locator('select[name="org_id"]');
  await expect(orgSelect.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 20000 });
  const value = await orgSelect.locator('option[value]:not([value=""])').first().getAttribute('value');
  await orgSelect.selectOption(value);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function deleteBranchNamed(page, name) {
  await openBranches(page);
  const row = rowByName(page, name);
  if (!(await row.isVisible().catch(() => false))) return;
  await row.locator('input[type="checkbox"]').check();
  const deleted = page.waitForResponse(
    (response) =>
      response.request().method() === 'DELETE' &&
      /\/branches\/?$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
  await page.locator('button:has(svg.lucide-trash-2)').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  expect((await deleted).ok()).toBeTruthy();
  await expect(rowByName(page, name)).toHaveCount(0);
}

test.describe('Branches screen', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('list, filter, sort, select, and cancel delete', async ({ page }) => {
    test.setTimeout(240000);
    await openBranches(page);

    await test.step('toolbar and columns are on the screen', async () => {
      await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-plus)')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-trash-2)')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-download)')).toBeVisible();
      for (const header of HEADERS) {
        await expect(page.getByRole('columnheader', { name: header })).toBeVisible();
      }
    });

    const existing = rows(page);
    if ((await existing.count()) > 0) {
      const first = existing.first();
      const branchName = (await first.locator('td').nth(2).innerText()).trim();
      const branchCode = (await first.locator('td').nth(4).innerText()).trim();

      await test.step('filter by the first branch name, then clear it', async () => {
        await filterByColumn(page, 'Branch Name', branchName);
        await expect(rowByName(page, branchName)).toBeVisible();
        await expect(rows(page).filter({ hasNotText: branchName })).toHaveCount(0);
        await clearFilter(page);
        await expect(rows(page).first()).toBeVisible();
      });

      await test.step('filter by that branch code, then clear it', async () => {
        await filterByColumn(page, 'Branch Code', branchCode);
        await expect(rows(page).first()).toContainText(branchCode);
        await clearFilter(page);
      });

      await test.step('filter Active, then clear it', async () => {
        await filterByColumn(page, 'Is Active', 'Active');
        await expect(rows(page).first()).toContainText('Active');
        await clearFilter(page);
      });

      await test.step('sort branch name ascending', async () => {
        await page.locator('thead').getByText('Branch Name', { exact: true }).click();
        await expect(page.locator('thead').getByText('↑')).toBeVisible();
      });

      await test.step('select one row, select all, then clear the selection', async () => {
        await first.locator('input[type="checkbox"]').check();
        await expect(first.locator('input[type="checkbox"]')).toBeChecked();
        await page.locator('thead input[type="checkbox"]').check();
        await expect(rows(page).locator('input[type="checkbox"]').first()).toBeChecked();
        await page.locator('thead input[type="checkbox"]').uncheck();
        await expect(rows(page).locator('input[type="checkbox"]').first()).not.toBeChecked();
      });

      await test.step('cancel delete leaves the row in the list', async () => {
        await first.locator('input[type="checkbox"]').check();
        await page.locator('button:has(svg.lucide-trash-2)').click();
        await page.getByRole('button', { name: 'Close' }).click();
        await expect(rowByName(page, branchName)).toBeVisible();
        await first.locator('input[type="checkbox"]').uncheck();
      });
    } else {
      await expect(page.getByText('No data found')).toBeVisible();
    }

    await test.step('delete with nothing selected does not remove rows', async () => {
      const before = await rows(page).count();
      await page.locator('button:has(svg.lucide-trash-2)').click();
      await expect(page.getByText('Please select items to delete')).toBeVisible();
      await expect(rows(page)).toHaveCount(before);
    });
  });

  test('add validation, create, edit, and delete a new branch', async ({ page }) => {
    test.setTimeout(300000);
    const branch = uniqueBranch();
    let created = false;

    try {
      await openBranches(page);
      const existingCode =
        (await rows(page).count()) > 0
          ? (await rows(page).first().locator('td').nth(4).innerText()).trim()
          : '';

      await page.locator('button:has(svg.lucide-plus)').click();
      await expect(page).toHaveURL(/\/master-data\/branches\/add/);
      await expect(page.getByText('Branch Name', { exact: true })).toBeVisible();

      await test.step('organization, name, code, and city are required', async () => {
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Organization is required')).toBeVisible();
        await chooseFirstOrganization(page);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Branch name is required')).toBeVisible();
        await page.locator('input[name="text"]').fill(branch.name);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Branch code is required')).toBeVisible();
        await page.locator('input[name="branch_code"]').fill(branch.code);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('City is required')).toBeVisible();
      });

      await test.step('name and city cannot be only numbers', async () => {
        await page.locator('input[name="text"]').fill('12345');
        await page.locator('input[name="city"]').fill(branch.city);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Branch name cannot be only numbers')).toBeVisible();
        await page.locator('input[name="text"]').fill(branch.name);
        await page.locator('input[name="city"]').fill('641001');
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('City name cannot be only numbers')).toBeVisible();
      });

      if (existingCode) {
        await test.step('an existing branch code is rejected', async () => {
          await page.locator('input[name="city"]').fill(branch.city);
          await page.locator('input[name="branch_code"]').fill(existingCode);
          await page.getByRole('button', { name: 'Save' }).click();
          await expect(page.getByText(/already in use/i)).toBeVisible();
        });
      }

      await test.step('a new branch is created and listed as Active', async () => {
        await page.locator('input[name="text"]').fill(branch.name);
        await page.locator('input[name="branch_code"]').fill(branch.code);
        await page.locator('input[name="city"]').fill(branch.city);
        const responsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === 'POST' &&
            /\/branches\/?$/.test(new URL(response.url()).pathname),
          { timeout: 60000 },
        );
        await page.getByRole('button', { name: 'Save' }).click();
        expect((await responsePromise).ok()).toBeTruthy();
        created = true;
        await expect(page).toHaveURL(/\/master-data\/branches\/?$/);
        const createdRow = rowByName(page, branch.name);
        await expect(createdRow).toBeVisible({ timeout: 20000 });
        await expect(createdRow).toContainText(branch.code);
        await expect(createdRow).toContainText(branch.city);
        await expect(createdRow).toContainText('Active');
      });

      await test.step('edit changes the name and keeps the same code', async () => {
        await rowByName(page, branch.name).getByTitle('Edit').click();
        await expect(page.getByText('Edit Branch')).toBeVisible();
        await expect(page.locator('input[name="branch_code"]')).toHaveValue(branch.code);
        await page.locator('input[name="text"]').fill(branch.editedName);
        const responsePromise = page.waitForResponse(
          (response) => response.request().method() === 'PUT' && /\/branches\//.test(response.url()),
          { timeout: 60000 },
        );
        await page.getByRole('button', { name: 'Update' }).click();
        expect((await responsePromise).ok()).toBeTruthy();
        await expect(page.getByText(/updated successfully/i)).toBeVisible();
        await expect(rowByName(page, branch.editedName)).toContainText(branch.code);
      });

      await test.step('a number-only city is rejected and cancel keeps the saved city', async () => {
        await rowByName(page, branch.editedName).getByTitle('Edit').click();
        await page.locator('input[name="city"]').fill('641035');
        await page.getByRole('button', { name: 'Update' }).click();
        await expect(page.getByText('City name cannot be only numbers')).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(rowByName(page, branch.editedName)).toContainText(branch.city);
      });

      await test.step('saving another branch with the same code is rejected', async () => {
        await page.locator('button:has(svg.lucide-plus)').click();
        await chooseFirstOrganization(page);
        await page.locator('input[name="text"]').fill(`${branch.name} Copy`);
        await page.locator('input[name="branch_code"]').fill(branch.code);
        await page.locator('input[name="city"]').fill(branch.city);
        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText(/already in use/i)).toBeVisible();
        await page.getByRole('button', { name: 'Cancel' }).click();
        await expect(page).toHaveURL(/\/master-data\/branches\/?$/);
      });
    } finally {
      if (created) {
        await deleteBranchNamed(page, branch.editedName).catch(async () => {
          await deleteBranchNamed(page, branch.name);
        });
      }
    }
  });

  test('download exports the current branch list', async ({ page }) => {
    await openBranches(page);
    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.locator('button:has(svg.lucide-download)').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^Branches_List_.*\.xlsx$/);
    await expect(page.getByText(/exported successfully/i)).toBeVisible();
  });
});
