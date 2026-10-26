// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, toastMessage } from './helpers/screenAccess.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/inspection-checklists';

async function openChecklists(page) {
  const status = await openAdminScreen(page, PATH, 'Inspection Checklists List');
  if (skipIfInaccessible(page, 'Inspection Checklists', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Inspection Checklists', () => {
  test('list chrome, data or empty, filter panel', async ({ page }) => {
    if (!(await openChecklists(page))) return;

    await expect(page.getByText('Inspection Checklists List')).toBeVisible();
    const data = await readAdminState(page, /No inspection checklists found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    if (data.state === 'data') {
      await expect(page.getByRole('columnheader', { name: 'Question' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Response Type' })).toBeVisible();
    }

    const filter = page.getByTitle('Filter');
    if (await filter.isVisible().catch(() => false)) {
      await filter.click();
      await expect(page.locator('select').filter({ has: page.locator('option', { hasText: 'Select column' }) }).first()).toBeVisible();
    }
  });

  test('create requires question; cancelled; delete needs selection', async ({ page }) => {
    if (!(await openChecklists(page))) return;

    const add = page.getByTitle('Create New');
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD — Create New hidden.' });
      return;
    }
    await add.click();
    await expect(page.getByText('Create Inspection Checklist')).toBeVisible();
    await clickUnblocked(page, 'Save');
    await expect(
      toastMessage(page, /Inspection Question is required|Please enter inspection question/i),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Create Inspection Checklist')).toHaveCount(0);

    const del = page.getByTitle('Delete Selected');
    if (await del.isVisible().catch(() => false)) {
      await del.click();
      await expect(toastMessage(page, /Please select at least one item to delete/i)).toBeVisible({
        timeout: 10000,
      });
    }
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD/DELETE — validation only; nothing saved.',
    });
  });
});
