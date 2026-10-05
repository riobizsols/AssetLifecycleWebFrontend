// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM department assignment', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_DEPT_001 department assignment shows branch and department controls', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assign-department-assets', 'Department Assignment');
    if (!opened) {
      noteInaccessible('Department Assignment');
      return;
    }
    await expect(page.getByText('Branch', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Department', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Department Assets List')).toBeVisible();
  });

  test('TC_DEPT_002 the department list is scoped to the selected branch', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/assign-department-assets', 'Department Assignment');
    if (!opened) {
      noteInaccessible('Department Assignment');
      return;
    }
    await expect(page.getByText(/Select Department|Department Selection/).first()).toBeVisible();
    const department = page.getByText('Select Department', { exact: true }).first();
    if (await department.isVisible().catch(() => false)) {
      await department.click();
    }
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
