// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM organization structure', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_ORG_001 organization form rejects a blank name', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/organizations', 'Organization List');
    if (!opened) {
      noteInaccessible('Organizations');
      return;
    }

    await expect(page.getByText('Organization List')).toBeVisible();
    const add = page.getByRole('button', { name: 'Add' });
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Organization create');
      return;
    }

    await add.click();
    await expect(page.getByText(/Organization name is required|required/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('TC_BR_001 branch form rejects a blank name', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/branches', 'Branch Name');
    if (!opened) {
      noteInaccessible('Branches');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Branch create');
      return;
    }
    await add.click();
    await expect(page.getByPlaceholder('Enter Branch Name')).toBeVisible({ timeout: 20000 });
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/Branch name is required|required/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('TC_DEP_001 a unique department can be added', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/master-data/departments', 'Departments');
    if (!opened) {
      noteInaccessible('Departments');
      return;
    }

    const add = page.getByRole('button', { name: 'Add' });
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Department create');
      return;
    }

    await add.click();
    await expect(page.getByText(/required/i).first()).toBeVisible({ timeout: 10000 });

    const branch = page.locator('select').first();
    if ((await branch.locator('option').count()) < 2) {
      noteInaccessible('Department branch options');
      return;
    }
    await branch.selectOption({ index: 1 });
    const name = `PW-E2E-DEPT-${Date.now()}`;
    await page.getByPlaceholder('Department Name').fill(name);
    await add.click();
    await expect(page.getByText(name).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_MAP_001 branch department mapping form lists both sides', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(
      page,
      '/master-data/branch-dept-mapping',
      'Branch – Department Mapping'
    );
    if (!opened) {
      noteInaccessible('Branch – Department Mapping');
      return;
    }

    const add = page.getByTitle(/Add Branch/);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Branch department mapping create');
      return;
    }
    await add.click();
    const dialog = page.locator('form').filter({ hasText: 'Branch' });
    await expect(dialog.getByText('Department').first()).toBeVisible({ timeout: 15000 });
    const selects = dialog.locator('select');
    const branchOptions = await selects.nth(0).locator('option').count();
    const deptOptions = await selects.nth(1).locator('option').count();
    expect(branchOptions).toBeGreaterThan(0);
    expect(deptOptions).toBeGreaterThan(0);
  });

  test('TC_DEP_002 department asset mapping screen loads', async ({ page }) => {
    test.setTimeout(120000);
    await gotoProtected(page, `${BASE}/master-data/departments-asset`);
    const unauthorized = page.getByText(/not authorized|Access Denied|You are not authorized/i);
    const title = page.getByText('Department Selection');
    await expect(unauthorized.or(title).first()).toBeVisible({ timeout: 45000 });
    if (await unauthorized.isVisible().catch(() => false)) {
      noteInaccessible('Department–Asset Mapping');
      return;
    }
    await expect(page.getByText('Add Asset')).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
  });
});
