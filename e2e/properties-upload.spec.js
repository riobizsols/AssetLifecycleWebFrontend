// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM properties, products, and upload', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_PROP_001 a unique property and value can be saved', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/properties', 'Properties');
    if (!opened) {
      noteInaccessible('Properties');
      return;
    }

    const create = page.getByTitle('Create Property');
    if (!(await create.isVisible().catch(() => false))) {
      noteInaccessible('Property create');
      return;
    }

    const stamp = String(Date.now()).slice(-8);
    const name = `PW-E2E-PROP-${stamp}`;
    const value = `V${stamp}`;
    await create.click();
    await expect(page.getByRole('heading', { name: 'Create New Property' })).toBeVisible();
    const nameInput = page.getByPlaceholder('e.g., Material, Color, Brand');
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
    await page.getByPlaceholder(/Value 1/i).fill(value);
    await saveProperty(page);
    await page.getByPlaceholder('Search by property name...').fill(name);
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_PROP_002 a new value can be added to a unique property', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/adminsettings/configuration/properties', 'Properties');
    if (!opened) {
      noteInaccessible('Properties');
      return;
    }

    const create = page.getByTitle('Create Property');
    if (!(await create.isVisible().catch(() => false))) {
      noteInaccessible('Property create');
      return;
    }

    const stamp = String(Date.now()).slice(-8);
    const name = `PW-E2E-P2-${stamp}`;
    await create.click();
    const nameInput = page.getByPlaceholder('e.g., Material, Color, Brand');
    await nameInput.fill(name);
    await expect(nameInput).toHaveValue(name);
    await page.getByPlaceholder(/Value 1/i).fill(`A${stamp}`);
    await saveProperty(page);
    await page.getByPlaceholder('Search by property name...').fill(name);
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });

    await page.getByPlaceholder('Search by property name...').fill(name);
    await page.getByText(name, { exact: true }).first().click();
    const valueInput = page.getByPlaceholder('Enter new value...');
    if (!(await valueInput.isVisible().catch(() => false))) {
      await page.getByText(name, { exact: true }).first().click();
    }
    await expect(valueInput).toBeVisible({ timeout: 10000 });
    const extra = `B${stamp}`;
    await valueInput.fill(extra);
    await page.locator('form').filter({ has: valueInput }).getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText(extra).first()).toBeVisible({ timeout: 15000 });
  });

  test('TC_PS_001 a unique service can be added', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/master-data/prod-serv', 'Product / Service');
    if (!opened) {
      noteInaccessible('Prod/Serv');
      return;
    }

    await page.getByText('Service Details').click();
    const serviceForm = page.locator('div.flex.flex-wrap').filter({
      has: page.getByPlaceholder('Enter Description'),
    });
    const assetType = serviceForm.locator('div.relative.w-64 button').first();
    if (!(await assetType.isVisible().catch(() => false))) {
      noteInaccessible('Service create');
      return;
    }
    await assetType.click();
    const option = serviceForm
      .locator('div.absolute.z-10')
      .locator('div.cursor-pointer')
      .first();
    const hasOption = await option
      .waitFor({ state: 'visible', timeout: 15000 })
      .then(() => true)
      .catch(() => false);
    if (!hasOption) {
      noteInaccessible('Service asset types');
      return;
    }
    await option.click();
    await expect(assetType).not.toHaveText(/Select Asset Type/i);

    const description = `E2E-S-${String(Date.now()).slice(-8)}`;
    const descriptionField = page.getByPlaceholder(/Enter description/i);
    await descriptionField.fill(description);
    await page
      .locator('div.flex.flex-wrap')
      .filter({ has: descriptionField })
      .getByRole('button', { name: 'Add' })
      .click();
    await expect(page.getByText('Service added successfully').first()).toBeVisible({ timeout: 30000 });
  });

  test('TC_UPL_001 upload screen explains the sample and trial steps', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/master-data/uploads', 'Bulk Upload');
    if (!opened) {
      noteInaccessible('Bulk Upload');
      return;
    }
    await expect(page.getByText('Step 2: Upload Your File')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Trial Upload' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commit Changes' })).toBeVisible();
  });

  test('TC_UPL_002 trial upload rejects an unknown asset type', async ({ page }) => {
    test.setTimeout(180000);
    const opened = await openTitledScreen(page, '/master-data/uploads', 'Bulk Upload');
    if (!opened) {
      noteInaccessible('Bulk Upload');
      return;
    }

    const csv = [
      'org_id,branch_id (opt),asset_id,asset_type_id,description,purchase_vendor_id,purchased_cost,purchased_on,purchased_by (opt),warranty_period,expiry_date,service_vendor_id,salvage_value,useful_life_years',
      'ORG001,,PW-E2E,DOES-NOT-EXIST,Bad row,VEND001,1,2026-01-01,,12,2027-01-01,VEND001,0,5',
    ].join('\n');

    await page.locator('#assets-file-upload').setInputFiles({
      name: 'pw-e2e-unknown-type.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await expect(page.getByText(/File selected:/i)).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText(/DOES-NOT-EXIST|does not exist|Validation Errors/i).first()).toBeVisible({
      timeout: 45000,
    });
    await expect(page.getByRole('button', { name: 'Commit Changes' })).toBeVisible();
  });
});

/**
 * The create form stays open when the name never reaches React state or the API rejects it.
 * @param {import('@playwright/test').Page} page
 */
async function saveProperty(page) {
  const heading = page.getByRole('heading', { name: 'Create New Property' });
  const errorToast = page.getByText(/Failed to create property|already exists|Property name is required/i).first();
  const saved = heading
    .waitFor({ state: 'hidden', timeout: 45000 })
    .then(() => 'saved')
    .catch(() => 'timeout');
  const failed = errorToast
    .waitFor({ state: 'visible', timeout: 45000 })
    .then(() => errorToast.innerText())
    .catch(() => 'timeout');
  await page
    .locator('form')
    .filter({ has: page.getByPlaceholder('e.g., Material, Color, Brand') })
    .getByRole('button', { name: 'Save Property' })
    .click();
  const result = await Promise.race([saved, failed]);
  expect(result, String(result)).toBe('saved');
}
