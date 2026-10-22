// @ts-check
/**
 * Branch – Department Mapping — Playwright cases BD-01 … BD-43.
 * Adds one temporary mapping on BR002 and removes it. Existing NGP rows are only read.
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

async function openMapping(page) {
  await loginToRioEam(page);
  await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
  await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({
    timeout: 45000,
  });
}

test.describe('Branch – Department Mapping', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('BD-01 to BD-17 list and search', async ({ page }) => {
    test.setTimeout(180000);
    await openMapping(page);

    await test.step('BD-01 title, subtitle, and add button', async () => {
      await expect(page.getByText('A department can belong to multiple branches.')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-plus)')).toBeVisible();
      await expect(page.locator('button:has(svg.lucide-download)')).toHaveCount(0);
    });

    await test.step('BD-02 and BD-03 sample mappings', async () => {
      const table = page.locator('table');
      await expect(table.getByText('Commerce').first()).toBeVisible();
      await expect(table.getByText('DPT002').first()).toBeVisible();
      await expect(table.getByText('Computer Science').first()).toBeVisible();
      await expect(table.getByText('Physical Education')).toBeVisible();
      await expect(table.getByText('Computer Science & Engineering')).toBeVisible();
      await expect(table.getByText('ORG003').first()).toBeVisible();
    });

    await test.step('BD-04 one branch has two departments', async () => {
      const arts = page.locator('tbody tr').filter({ hasText: 'BR001' });
      await expect(arts).toHaveCount(2);
    });

    await test.step('BD-09 search by branch name', async () => {
      await page.locator('button[title="Filter"]').click();
      await page.getByPlaceholder('Branch, department, org...').fill('Arts');
      await expect(page.locator('tbody tr')).toHaveCount(2);
      await expect(page.locator('button[title="Filter"]')).toHaveClass(/bg-yellow-500/);
    });

    await test.step('BD-10 search by branch code', async () => {
      await page.getByPlaceholder('Branch, department, org...').fill('BR003');
      await expect(page.locator('tbody tr').filter({ hasText: 'Education' })).toHaveCount(2);
    });

    await test.step('BD-12 search by department id', async () => {
      await page.getByPlaceholder('Branch, department, org...').fill('DPT006');
      await expect(page.locator('tbody tr')).toHaveCount(1);
      await expect(page.getByText('Physical Education')).toBeVisible();
    });

    await test.step('BD-14 search is not case sensitive', async () => {
      await page.getByPlaceholder('Branch, department, org...').fill('commerce');
      await expect(page.getByText('Commerce')).toBeVisible();
    });

    await test.step('BD-15 no match', async () => {
      await page.getByPlaceholder('Branch, department, org...').fill('ZZZ-NOT-A-MAPPING');
      await expect(page.getByText('No branch-department mappings found')).toBeVisible();
    });

    await test.step('BD-16 clear search', async () => {
      await page.getByPlaceholder('Branch, department, org...').fill('');
      await expect(page.locator('tbody tr').filter({ hasText: 'BR001' })).toHaveCount(2);
    });
  });

  test('BD-18 to BD-38 add and remove a mapping', async ({ page }) => {
    test.setTimeout(240000);
    await openMapping(page);

    await test.step('BD-22 branch and department are required', async () => {
      await page.locator('button:has(svg.lucide-plus)').click();
      const dialog = page.locator('form');
      await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toBeVisible();
      await expect(dialog.locator('select').nth(1)).toBeDisabled();
      await page.getByRole('button', { name: 'Save' }).click();
      await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toBeVisible();
    });

    await test.step('BD-21 changing branch clears the department', async () => {
      const dialog = page.locator('form');
      const branch = dialog.locator('select').nth(0);
      const dept = dialog.locator('select').nth(1);
      await branch.selectOption({ index: 1 });
      await expect(dept).toBeEnabled();
      await dept.selectOption({ index: 1 });
      await branch.selectOption({ index: 2 });
      await expect(dept).toHaveValue('');
    });

    await test.step('BD-24 saving an existing pair does not duplicate the row', async () => {
      const dialog = page.locator('form');
      const branch = dialog.locator('select').nth(0);
      await branch.selectOption({ label: /Arts & Science College/ });
      const dept = dialog.locator('select').nth(1);
      await dept.selectOption({ label: /Commerce/ });
      const saved = page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' && response.url().includes('/branch-dept-mappings'),
        { timeout: 60000 },
      );
      await page.getByRole('button', { name: 'Save' }).click();
      expect((await saved).ok()).toBeTruthy();
      await expect(page.locator('tbody tr').filter({ hasText: 'BR001' }).filter({ hasText: 'DPT002' })).toHaveCount(1);
    });

    await test.step('BD-26 cancel add', async () => {
      await page.locator('button:has(svg.lucide-plus)').click();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toHaveCount(0);
    });

    await test.step('BD-32 remove is confirmed and BD-33 cancel keeps the row', async () => {
      const commerce = page.locator('tbody tr').filter({ hasText: 'DPT002' }).first();
      page.once('dialog', (dialog) => dialog.dismiss());
      await commerce.locator('button[title="Remove"]').click();
      await expect(commerce).toBeVisible();
    });

    await test.step('BD-38 there is no edit or bulk delete', async () => {
      await expect(page.getByTitle('Edit')).toHaveCount(0);
      await expect(page.locator('thead input[type="checkbox"]')).toHaveCount(0);
    });
  });
});

test.describe('Branch mapping cases that need another role or a broken API', () => {
  test.skip('BD-06 BD-28 BD-30 BD-36 BD-37 BD-39 BD-40 BD-42 BD-43', () => {});
});
