// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, toastMessage } from './helpers/screenAccess.js';
import {
  openAdminScreen,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/maintenance-config';

async function openMaint(page) {
  const status = await openAdminScreen(page, PATH, 'Maintenance Details');
  if (skipIfInaccessible(page, 'Maintenance Configuration', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Maintenance Configuration', () => {
  test('outer and inner tabs, workflow steps list', async ({ page }) => {
    if (!(await openMaint(page))) return;

    await expect(page.getByRole('button', { name: 'Maintenance Details', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Frequency', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workflow Steps', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Asset Type Sequences', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Job Role', exact: true })).toBeVisible();

    const empty = page.getByText('No workflow steps created yet');
    const rows = page.locator('table tbody tr').filter({ hasNotText: /No workflow steps created yet/ });
    const n = await rows.count();
    if (n === 0) await expect(empty).toBeVisible();
    test.info().annotations.push({
      type: 'condition',
      description: `WORKFLOW STEPS — ${n} rows.`,
    });
  });

  test('add workflow step requires name; cancelled', async ({ page }) => {
    if (!(await openMaint(page))) return;

    const add = page.getByTitle('Add Workflow Step');
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD STEP — plus hidden.' });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Add Workflow Step' })).toBeVisible();
    await clickUnblocked(page, 'Add Step');
    await expect(toastMessage(page, 'Step name is required')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add Workflow Step' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD STEP — name required; cancelled; nothing created.',
    });
  });

  test('sequences and job role tabs; frequency tab chrome', async ({ page }) => {
    if (!(await openMaint(page))) return;

    await page.getByRole('button', { name: 'Asset Type Sequences', exact: true }).click();
    await waitForAdminReady(page);
    await expect(page.getByTitle('Add Sequence').or(page.getByText(/sequence/i)).first()).toBeVisible();

    await page.getByRole('button', { name: 'Select Job Role', exact: true }).click();
    await waitForAdminReady(page);

    await page.getByRole('button', { name: 'Maintenance Frequency', exact: true }).click();
    await waitForAdminReady(page);
    await expect(page.getByRole('button', { name: 'Maintenance Frequency', exact: true }).nth(1).or(page.getByText(/No maintenance frequencies/i)).first()).toBeVisible();
    await expect(page.getByTitle('Filter').or(page.getByTitle('Create Maintenance Frequency')).first()).toBeVisible();
    test.info().annotations.push({
      type: 'condition',
      description: 'FREQUENCY — chrome shown; create/save not committed.',
    });
  });
});
