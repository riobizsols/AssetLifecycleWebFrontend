// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM asset creation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Create one live asset only');

  test('creates an asset from the add-asset form', async ({ page }) => {
    test.setTimeout(120000);

    await loginToRioEam(page);
    await page.goto(`${BASE}/assets/add`);

    await expect(page.getByRole('button', { name: 'Configuration' })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('label').filter({ hasText: 'Asset Type' })).toBeVisible();

    await selectLabeledDropdownOption(page, 'Asset Type', '(Parent)');

    if (await page.getByText('Please select a parent asset for this child asset type.').isVisible()) {
      await selectLabeledDropdownOption(page, 'Parent Asset');
    }

    const serialMode = page.locator('select[name="serialNumberMode"]');
    await serialMode.selectOption('generate');
    await page.getByRole('button', { name: 'Generate' }).click();

    const serialInput = page.locator('input[name="serialNumber"]');
    try {
      await expect(serialInput).not.toHaveValue('', { timeout: 15000 });
    } catch {
      await serialMode.selectOption('none');
    }

    const assetName = `PW-E2E-${Date.now()}`;
    await page.locator('textarea[name="description"]').fill(assetName);

    await page.getByRole('button', { name: 'Purchase Details' }).click();
    await page.locator('input[name="purchaseDate"]').fill('2026-03-01');
    await page.locator('input[name="expiryDate"]').fill('2027-03-01');
    await page.locator('input[name="purchaseCost"]').fill('1500');

    await page.getByRole('button', { name: 'Vendor Details' }).click();
    await expect(page.locator('label').filter({ hasText: 'Product Vendor' })).toBeVisible();
    await selectLabeledDropdownOption(page, 'Product Vendor');

    if (await page.locator('label').filter({ hasText: 'Service Vendor' }).isVisible()) {
      await selectLabeledDropdownOption(page, 'Service Vendor');
    }

    await expect(page.getByText('Purchase vendor is required')).toHaveCount(0);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/assets/add') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Save' }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    const body = await createResponse.json();
    expect(body.asset || body.asset_id).toBeTruthy();

    await expect(page.getByText('Asset created successfully!')).toBeVisible({
      timeout: 15000,
    });
    await page.waitForURL(/\/assets\/?$/, { timeout: 20000 });
    await expect(page).not.toHaveURL(/\/assets\/add/);
  });
});

/**
 * Opens a labeled custom dropdown and clicks the first matching option,
 * skipping "+ Create New" footer actions.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} [optionText]
 */
async function selectLabeledDropdownOption(page, label, optionText) {
  const container = page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator('xpath=..');

  const trigger = container.getByRole('button');
  await trigger.click();

  const panel = container.locator('div.absolute').first();
  await expect(panel).toBeVisible({ timeout: 10000 });

  const options = panel
    .locator('div.cursor-pointer')
    .filter({ hasNotText: /^\+\s*Create/ });

  await expect(
    options.first(),
    `No selectable options in the ${label} dropdown`
  ).toBeVisible({ timeout: 15000 });

  const target =
    optionText && (await options.filter({ hasText: optionText }).count()) > 0
      ? options.filter({ hasText: optionText }).first()
      : options.first();

  const selectedText = (await target.innerText()).split('\n')[0].trim();
  await target.click();
  await expect(trigger).not.toHaveText(/^Select$/i, { timeout: 5000 });
  if (selectedText && !selectedText.includes('(')) {
    await expect(trigger).toContainText(selectedText, { timeout: 5000 });
  }
}
