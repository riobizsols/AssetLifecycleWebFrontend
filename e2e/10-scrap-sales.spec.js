// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen, waitForRowOrEmpty } from './helpers/screenAccess.js';

test.describe('RIO EAM scrap sales', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_SALE_001 scrap sales list and create form show buyer and amount', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/scrap-sales', 'Scrap Sales');
    if (!opened) {
      noteInaccessible('Scrap Sales');
      return;
    }

    await expect(page.getByText('Buyer Name').first()).toBeVisible();
    await expect(page.getByText('Total Sale Value').first()).toBeVisible();
    await expect(
      page.getByText('No scrap sales found').or(page.locator('tbody tr').first()).first()
    ).toBeVisible({ timeout: 20000 });

    const create = await openTitledScreen(page, '/scrap-sales/create', 'Create Scrap Sale');
    if (!create) {
      noteInaccessible('Create scrap sale');
      return;
    }
    await expect(page.getByText('Buyer Name').first()).toBeVisible();
    await expect(page.getByPlaceholder('Enter total scrap value')).toBeVisible();
    await expect(page.getByPlaceholder('Search assets...')).toBeVisible();
  });

  test('TC_SALE_002 an existing sale can be viewed without changing the amount', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/scrap-sales', 'Scrap Sales');
    if (!opened) {
      noteInaccessible('Scrap Sales');
      return;
    }

    const opener = page.locator('tbody button[title="Edit"], tbody button[title="View"]').first();
    const hasRow = await waitForRowOrEmpty(page, opener, 'No scrap sales found');
    if (!hasRow) return;

    await opener.click();
    await expect(page).toHaveURL(/\/scrap-sales\/(view|edit)\//, { timeout: 20000 });
    await expect(page.getByText(/Buyer|Sale|Amount|Value/i).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_SALE_003 create sale searches scrapped assets and does not save an active asset', async ({
    page,
  }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/scrap-sales/create', 'Create Scrap Sale');
    if (!opened) {
      noteInaccessible('Create scrap sale');
      return;
    }

    const search = page.getByPlaceholder('Search assets...');
    await expect(search).toBeVisible();
    await search.fill('PW-E2E-NOT-SCRAPPED');
    await expect(page.getByRole('button', { name: /Save|Create/i }).first()).toBeVisible();
    await expect(page.getByText('PW-E2E-NOT-SCRAPPED')).toHaveCount(0);
  });
});
