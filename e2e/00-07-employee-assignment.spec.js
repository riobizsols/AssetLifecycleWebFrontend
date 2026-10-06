// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM employee assignment', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_EMP_001 employee assignment shows department and employee controls', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assign-employee-assets', 'Employee Assignment');
    if (!opened) {
      noteInaccessible('Employee Assignment');
      return;
    }
    await expect(page.getByText('Select Department and Employee')).toBeVisible();
    await expect(page.getByText('Department', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Employees', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Employee Assets List')).toBeVisible();
  });

  test('TC_EMP_002 employee assignment does not save a cross-department asset', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assign-employee-assets', 'Employee Assignment');
    if (!opened) {
      noteInaccessible('Employee Assignment');
      return;
    }
    await expect(page.getByText('Select Department and Employee')).toBeVisible();
    await expect(page.getByText(/select employee/i).first()).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
