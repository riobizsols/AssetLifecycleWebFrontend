// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM vendor renewal approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads the list, exports Excel, and opens an approval detail', async ({ page }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/vendor-renewal-approval`);

    await expect(page.getByText('Vendor Renewal Approval').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading...')).toHaveCount(0, { timeout: 30000 });

    await expect(page.getByText('Vendor Name').first()).toBeVisible();
    await expect(page.getByText('Company Name').first()).toBeVisible();
    await expect(page.getByText('Contact Person').first()).toBeVisible();
    await expect(page.getByText('Scheduled Date').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByText('Status').first()).toBeVisible();
    await expect(page.getByText('Days Until Due').first()).toBeVisible();

    const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
    await page.getByRole('main').getByRole('button').last().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename(), 'Expected a vendor renewal Excel export').toMatch(
      /Vendor_Renewal_Approvals_List.*\.xlsx/i
    );
    await expect(page.getByText('Vendor renewal approvals exported successfully')).toBeVisible({
      timeout: 15000,
    });

    const empty = page.getByText('No data found');
    const rows = page.locator('tbody tr.cursor-pointer');
    if ((await empty.isVisible()) || (await rows.count()) === 0) {
      return;
    }

    const detailResponsePromise = page.waitForResponse((response) => {
      if (response.request().method() !== 'GET') return false;
      return /\/approval-detail\/workflow\//.test(new URL(response.url()).pathname);
    });

    await rows.first().locator('td').nth(1).click();
    await page.waitForURL(/\/approval-detail\/.+/, { timeout: 20000 });
    expect(page.url()).toMatch(/context=VENDORRENEWALAPPROVAL/);

    const detailResponse = await detailResponsePromise;
    expect(detailResponse.ok(), `Approval detail failed: ${detailResponse.status()}`).toBeTruthy();

    await expect(page.getByRole('button', { name: 'Approval Details' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.getByText('Loading approval details...')).toHaveCount(0, { timeout: 30000 });
    await expect(page.getByText('Alert Type').first()).toBeVisible();
    await expect(page.getByText('Vendor').first()).toBeVisible();

    const vendorTab = page.getByRole('button', { name: 'Vendor Details' });
    if (await vendorTab.isVisible()) {
      await vendorTab.click();
      await expect(
        page.getByText('Company').or(page.getByText('No vendor details available')).first()
      ).toBeVisible({ timeout: 15000 });
    }

    await page.getByRole('button', { name: 'History Details' }).click();
    await expect(
      page
        .getByText('Loading workflow history...')
        .or(page.getByText('No workflow history available'))
        .or(page.getByText(/Approved|Initiated|Rejected|Pending/i))
        .first()
    ).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Approval Details' }).click();

    const approveButton = page.getByRole('button', { name: 'Approve', exact: true });
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await expect(page.getByText('Approve Maintenance Request')).toBeVisible({ timeout: 10000 });
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByText('Approve Maintenance Request')).toHaveCount(0);
    }

    await page.getByRole('button', { name: 'Back' }).click();
    await page.waitForURL(/\/vendor-renewal-approval\/?$/, { timeout: 20000 });
    await expect(page.getByText('Vendor Renewal Approval').first()).toBeVisible({ timeout: 20000 });
  });
});
