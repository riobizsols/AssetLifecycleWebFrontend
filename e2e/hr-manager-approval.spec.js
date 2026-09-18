// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';

import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM HR/Manager approval', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads approvals, switches tabs, and approves an E2E certificate when present', async ({
    page,
  }) => {
    test.setTimeout(180000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/tech-cert-approvals`);

    await expect(page.getByRole('heading', { name: 'HR/Manager Approval' })).toBeVisible({
      timeout: 20000,
    });
    await expect(
      page.getByText('Review technician certificates, manage technicians, and monitor activity.')
    ).toBeVisible();

    await expect(page.getByRole('button', { name: 'Certificate Approvals' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Certificate List' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician Ratings' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technician Job History' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upcoming Jobs' })).toBeVisible();

    await expect(page.getByText('Loading approvals...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No pending approvals.').or(page.getByText('Employee').first())
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Filter', exact: true }).click();
    await expect(page.getByPlaceholder('Search value')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('select').filter({ hasText: 'Select column' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('button', { name: 'Filter', exact: true }).click();

    const emptyApprovals = page.getByText('No pending approvals.');
    if (!(await emptyApprovals.isVisible())) {
      await expect(page.getByText('Certificate Date').first()).toBeVisible();
      await expect(page.getByText('Expiry Date').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Approve' }).first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Reject' }).first()).toBeVisible();

      const e2eRow = page.locator('tbody tr').filter({ hasText: /PW-E2E/ });
      if ((await e2eRow.count()) > 0) {
        const approveResponsePromise = page.waitForResponse(
          (response) =>
            response.request().method() === 'PUT' &&
            /\/employee-tech-certificates\/[^/]+\/status/.test(new URL(response.url()).pathname)
        );
        await e2eRow.first().getByRole('button', { name: 'Approve' }).click();
        const approveResponse = await approveResponsePromise;
        expect(approveResponse.ok(), `Approve failed: ${approveResponse.status()}`).toBeTruthy();
        await expect(page.getByText('Certificate approved successfully')).toBeVisible({
          timeout: 15000,
        });
      }
    }

    await page.getByRole('button', { name: 'Technician List' }).click();
    await expect(page.getByText('Loading technicians...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No technicians found.').or(page.getByText('Role').first())
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Certificate List' }).click();
    await expect(page.getByText('Loading certificate list...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No certificates found.').or(page.getByText('Certificate Name').first())
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Technician Ratings' }).click();
    await expect(page.getByText('Select a technician to view ratings.')).toBeVisible();
    await selectFirstTechnician(page);

    await page.getByRole('button', { name: 'Technician Job History' }).click();
    await expect(page.getByText('Loading job history...')).toHaveCount(0, { timeout: 30000 });
    await selectFirstTechnician(page);
    await expect(page.getByText('Loading job history...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page
        .getByText('Select a technician to view job history.')
        .or(page.getByText('No job history found for this technician.'))
        .or(page.getByText('Work Order').first())
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Upcoming Jobs' }).click();
    await expect(page.getByText('Loading upcoming jobs...')).toHaveCount(0, { timeout: 30000 });
    await expect(
      page.getByText('No upcoming jobs found.').or(page.getByText('Work Order').first())
    ).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Certificate Approvals' }).click();
    await expect(page.getByRole('button', { name: 'Certificate Approvals' })).toBeVisible();
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectFirstTechnician(page) {
  const techSelect = page.locator('select').first();
  await expect(techSelect).toBeVisible({ timeout: 10000 });
  const optionCount = await techSelect.locator('option').count();
  if (optionCount > 1) {
    await techSelect.selectOption({ index: 1 });
  }
}
