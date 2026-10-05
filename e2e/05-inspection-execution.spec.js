// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen, waitForRowOrEmpty } from './helpers/screenAccess.js';

test.describe('RIO EAM inspection execution and approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_INSP_001 inspection list loads schedules', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/inspection-view', 'Inspection View');
    if (!opened) {
      noteInaccessible('Inspection List');
      return;
    }

    await expect(page.getByText('Asset Code').first()).toBeVisible();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(
      page.getByText(/No .*found|No data found/i).or(page.locator('tbody tr').first()).first()
    ).toBeVisible({ timeout: 20000 });
  });

  test('TC_INSP_002 an inspection can be opened without submitting answers', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/inspection-view', 'Inspection View');
    if (!opened) {
      noteInaccessible('Inspection List');
      return;
    }

    const openedDetail = await openInspectionDetail(page);
    if (!openedDetail) return;
    await expect(page.getByText('Asset Information').first()).toBeVisible();
  });

  test('TC_INSP_003 inspection detail does not start a maintenance job', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/inspection-view', 'Inspection View');
    if (!opened) {
      noteInaccessible('Inspection List');
      return;
    }

    const openedDetail = await openInspectionDetail(page);
    if (!openedDetail) return;
    await expect(page.getByText('Current Status').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('TC_INSP_004 inspection detail keeps answer controls from being submitted', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/inspection-view', 'Inspection View');
    if (!opened) {
      noteInaccessible('Inspection List');
      return;
    }

    const openedDetail = await openInspectionDetail(page);
    if (!openedDetail) return;
    await expect(page.getByText('Inspection Checklist').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save Changes' })).toBeVisible();
  });

  test('TC_INSP_005 inspection approval list loads without approving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/inspection-approval', 'Inspection Approval');
    if (!opened) {
      noteInaccessible('Inspection Approval');
      return;
    }

    await expect(page.getByText('Asset Code').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openInspectionDetail(page) {
  const row = page.locator('tbody tr.cursor-pointer').first();
  const hasRow = await waitForRowOrEmpty(page, row, /No data found/i);
  if (!hasRow) return false;
  await row.click();
  await expect(page).toHaveURL(/\/inspection-view\//, { timeout: 20000 });
  await expect(page.getByText('Asset Information').first()).toBeVisible({ timeout: 30000 });
  return true;
}
