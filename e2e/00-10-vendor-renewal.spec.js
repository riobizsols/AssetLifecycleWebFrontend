// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

/**
 * @param {import('@playwright/test').Page} page
 */
async function openRenewalQueue(page) {
  const opened = await openTitledScreen(page, '/vendor-renewal-approval', 'Vendor Renewal Approval');
  if (!opened) return false;
  await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });
  const empty = page.getByText('No data found').first();
  const row = page.locator('tbody tr.cursor-pointer').first();
  await expect(empty.or(row)).toBeVisible({ timeout: 20000 });
  return true;
}

test.describe('RIO EAM vendor renewal approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_VREN_001 a pending renewal can be opened without approving it', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openRenewalQueue(page);
    if (!opened) {
      noteInaccessible('Vendor Renewal Approval');
      return;
    }
    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText('No data found').first()).toBeVisible();
      return;
    }
    await row.click();
    await expect(page).toHaveURL(/\/approval-detail\//, { timeout: 20000 });
    const approve = page.getByRole('button', { name: /^Approve$/ });
    if (await approve.isVisible().catch(() => false)) {
      await expect(approve).toBeEnabled();
    }
  });

  test('TC_VREN_002 a pending renewal can be opened without rejecting it', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openRenewalQueue(page);
    if (!opened) {
      noteInaccessible('Vendor Renewal Approval');
      return;
    }
    const row = page.locator('tbody tr.cursor-pointer').first();
    if (!(await row.isVisible().catch(() => false))) {
      await expect(page.getByText('No data found').first()).toBeVisible();
      return;
    }
    await row.click();
    await expect(page).toHaveURL(/\/approval-detail\//, { timeout: 20000 });
    const reject = page.getByRole('button', { name: /^Reject$/ });
    if (await reject.isVisible().catch(() => false)) {
      await expect(reject).toBeEnabled();
    }
  });
});
