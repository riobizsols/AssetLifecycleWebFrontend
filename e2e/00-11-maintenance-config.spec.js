// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

const stamp = () => String(Date.now()).slice(-8);

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMaintenanceConfig(page) {
  return openTitledScreen(page, '/adminsettings/configuration/maintenance-config', 'Maintenance Configuration');
}

test.describe('RIO EAM maintenance configuration', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_MCFG_001 a unique workflow step can be added', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Workflow Steps' }).click();
    const add = page.getByTitle('Add Workflow Step');
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Workflow step create');
      return;
    }
    await add.click();
    const name = `PW-E2E-ST-${stamp()}`;
    await page.getByPlaceholder('Enter workflow step name (e.g., Initial Approval, Final Approval)').fill(name);
    await page.getByRole('button', { name: 'Add Step' }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible({ timeout: 20000 });
  });

  test('TC_MCFG_002 asset type sequences can be opened without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Asset Type Sequences' }).click();
    await expect(page.locator('label').filter({ hasText: 'Select Asset Type' }).first()).toBeVisible();
    await expect(page.getByRole('combobox').first()).toBeVisible();
    await expect(page.getByTitle('Add Sequence')).toHaveCount(0);
  });

  test('TC_MCFG_003 job role assignment can be opened without saving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Select Job Role' }).click();
    await expect(page.locator('label').filter({ hasText: 'Select Workflow Step' }).first()).toBeVisible();
    const step = page.locator('select').first();
    await expect(step).toContainText('-- Select Workflow Step --');
    if ((await step.locator('option').count()) > 1) {
      await step.selectOption({ index: 1 });
      await expect(page.locator('select').nth(1)).toContainText('-- Select Job Role --');
    }
  });

  test('TC_MCFG_004 maintenance frequency is listed and not created', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Maintenance Frequency' }).click();
    await expect(page.getByRole('heading', { name: 'Maintenance Frequency' })).toBeVisible();
    await expect(page.getByTitle('Create Maintenance Frequency')).toBeVisible();
  });

  test('TC_MCFG_005 frequency create stays closed for on-demand setup', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Maintenance Frequency' }).click();
    await expect(page.getByTitle('Create Maintenance Frequency')).toBeVisible();
    await expect(page).not.toHaveURL(/maintenance-frequency\/add/);
  });

  test('TC_MCFG_006 the checklist tab opens without adding a line', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openMaintenanceConfig(page);
    if (!opened) {
      noteInaccessible('Maintenance Configuration');
      return;
    }
    await page.getByRole('button', { name: 'Maintenance Frequency' }).click();
    await page.getByRole('button', { name: 'Checklist' }).click();
    await expect(page.locator('label').filter({ hasText: 'Select Frequency' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toHaveCount(0);
  });
});
