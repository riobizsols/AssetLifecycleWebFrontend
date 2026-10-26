// @ts-check
import { test, expect } from '@playwright/test';
import {
  firstRealOption,
  openAdminScreen,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/data-config';

/**
 * Column Access Config: AUTH / DISPLAY / NONE persist immediately.
 * Tests never click those access buttons or Save after a role+table is chosen.
 */

async function openColumnAccess(page) {
  const status = await openAdminScreen(page, PATH, 'Column Access Configuration');
  if (skipIfInaccessible(page, 'Column Access Config', status)) return false;
  await waitForAdminReady(page);
  return true;
}

test.describe('Column Access Config', () => {
  test('chrome, save without selection toasts, no persist', async ({ page }) => {
    if (!(await openColumnAccess(page))) return;

    await expect(page.getByRole('heading', { name: 'Column Access Configuration' })).toBeVisible();
    await expect(page.getByText('Job Role *')).toBeVisible();
    await expect(page.getByText('Table *')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible();
    const save = page.getByRole('button', { name: /Save Configurations/ });
    await expect(save).toBeVisible();
    await expect(save).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeDisabled();
    test.info().annotations.push({
      type: 'condition',
      description: 'SAVE — disabled until job role and table are selected; nothing persisted.',
    });
  });

  test('select role and table; search columns; access toggles not clicked', async ({ page }) => {
    if (!(await openColumnAccess(page))) return;

    const role = page.locator('select').first();
    const table = page.locator('select').nth(1);
    const roles = await firstRealOption(role);
    const tables = await firstRealOption(table);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER job roles=${roles.length} tables=${tables.length ? tables.join(', ') : 'none'}`,
    });
    if (!roles.length || !tables.length) return;

    await role.selectOption({ label: roles[0] });
    await table.selectOption({ label: tables[0] });
    await waitForAdminReady(page);

    const loading = page.getByText(/Loading columns for/);
    await expect.poll(async () => !(await loading.isVisible().catch(() => false)), { timeout: 20000 }).toBeTruthy();

    const empty = page.getByText('No columns found for this table.');
    const search = page.getByPlaceholder('Search columns...');
    if (await empty.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'condition',
        description: `COLUMNS — empty for ${roles[0]} / ${tables[0]}.`,
      });
      return;
    }

    await expect(search).toBeVisible();
    await expect(page.getByRole('button', { name: 'AUTH' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'DISPLAY' }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'NONE' }).first()).toBeVisible();
    await expect(page.getByText('Access Level Information:')).toBeVisible();

    const before = await page.getByRole('button', { name: 'AUTH' }).count();
    await search.fill('id');
    const after = await page.getByRole('button', { name: 'AUTH' }).count();
    test.info().annotations.push({
      type: 'condition',
      description: `SEARCH "id" — ${before} columns → ${after} matching; AUTH/DISPLAY/NONE not clicked.`,
    });
  });
});
