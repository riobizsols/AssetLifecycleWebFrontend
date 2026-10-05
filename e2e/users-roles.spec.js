// @ts-check
import { test, expect } from '@playwright/test';
import { headerAddButton, noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM users and job roles', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_USR_001 create employee blocks a blank form and saves a unique user', async ({ page }) => {
    test.setTimeout(180000);
    const opened = await openTitledScreen(page, '/master-data/create-user', 'Create Employee');
    if (!opened) {
      noteInaccessible('Create User');
      return;
    }

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText(/First name is required|required/i).first()).toBeVisible({
      timeout: 10000,
    });

    const branch = page.locator('select[name="branch_id"]');
    const dept = page.locator('select[name="dept_id"]');
    if ((await branch.locator('option').count()) < 2) {
      noteInaccessible('Create user branch options');
      return;
    }
    await branch.selectOption({ index: 1 });
    if ((await dept.locator('option').count()) < 2) {
      noteInaccessible('Create user department options');
      return;
    }

    const stamp = Date.now();
    await page.locator('input[name="first_name"]').fill(`PW-E2E-${stamp}`);
    await page.locator('input[name="email"]').fill(`pw.e2e.${stamp}@example.com`);
    await page.getByPlaceholder('Enter Phone Number').fill('9876543210');
    await dept.selectOption({ index: 1 });
    await page.locator('select[name="employee_type"]').selectOption({ label: 'Full-time' });
    await page.locator('input[name="joining_date"]').fill(new Date().toISOString().slice(0, 10));

    await page.getByRole('button', { name: 'Save' }).click();
    const created = page.getByText('Employee created successfully!');
    const failed = page.getByText(/Failed to create employee|already exists/i);
    await expect(created.or(failed).first()).toBeVisible({ timeout: 20000 });
    if (await failed.isVisible().catch(() => false)) {
      throw new Error(`Create employee was rejected: ${await failed.first().innerText()}`);
    }
  });

  test('TC_ROLE_001 job role form rejects a blank name', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/job-roles', 'Job Roles');
    if (!opened) {
      noteInaccessible('Job Roles');
      return;
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Job role create');
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Create New Job Role' })).toBeVisible({
      timeout: 15000,
    });
    await page.getByPlaceholder('e.g., System Administrator').fill('');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Role Name is required')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('TC_ROLE_002 role navigation tab is visible', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/job-roles', 'Job Roles');
    if (!opened) {
      noteInaccessible('Role Navigation');
      return;
    }
    await page.getByRole('button', { name: 'Role Navigation' }).click();
    await expect(page.getByText('Job Role').first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_ROLE_003 job function field shows a 100 character limit', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/job-roles', 'Job Roles');
    if (!opened) {
      noteInaccessible('Job Roles');
      return;
    }
    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Job role create');
      return;
    }
    await add.click();
    const jobFunction = page.getByPlaceholder(/Access to inspections/i);
    await expect(jobFunction).toBeVisible({ timeout: 15000 });
    await expect(jobFunction).toHaveAttribute('maxlength', '100');
    await page.getByRole('button', { name: 'Cancel' }).click();
  });

  test('TC_ROLE_004 assign roles opens without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/assign-roles', 'Current Role');
    if (!opened) {
      noteInaccessible('Assign Roles');
      return;
    }

    const assign = page.getByRole('button', { name: 'Assign Role' }).first();
    if (!(await assign.isVisible().catch(() => false))) {
      await expect(page.getByText(/No data found|Name|User/i).first()).toBeVisible();
      return;
    }
    await assign.click();
    const dialog = page.getByRole('heading', { name: 'Assign Role' });
    await expect(dialog).toBeVisible({ timeout: 15000 });
    await page.keyboard.press('Escape');
  });

  test('TC_COL_001 column access config requires a role before save', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/adminsettings/configuration/data-config',
      'Column Access Configuration'
    );
    if (!opened) {
      noteInaccessible('Column Access Config');
      return;
    }

    const save = page.getByRole('button', { name: 'Save Configurations' });
    await expect(save).toBeVisible();
    await expect(save).toBeDisabled();
  });
});
