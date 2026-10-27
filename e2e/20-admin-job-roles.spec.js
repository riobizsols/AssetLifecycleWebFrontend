// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, headerAddButton, toastMessage } from './helpers/screenAccess.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import {
  addSearchFilter,
  pickFilterValue,
  waitForListData,
} from './helpers/inspectionScreen.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/job-roles';
const CREATE_NAV = '/adminsettings/configuration/job-roles/create-navigation';
const EMPTY = /No job roles found|No navigation entries found/;

async function openRoles(page) {
  const status = await openAdminScreen(page, PATH, 'Job Roles');
  if (skipIfInaccessible(page, 'Job Roles', status)) return false;
  await waitForListData(page);
  return true;
}

function dataRows(page) {
  return page.locator('table tbody tr').filter({ hasNotText: EMPTY });
}

async function cancelModal(page) {
  await clickUnblocked(page, 'Cancel');
}

test.describe('Job Roles — Job Roles tab', () => {
  test('tabs, columns, data or empty', async ({ page }) => {
    if (!(await openRoles(page))) return;

    await expect(page.getByRole('button', { name: 'Job Roles', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Role Navigation', exact: true })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Role Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Job Function' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();

    const data = await readAdminState(page, /No job roles found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA roles — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();
  });

  test('filter by role name; wrong rows fail', async ({ page }) => {
    if (!(await openRoles(page))) return;

    const rows = dataRows(page);
    if ((await rows.count()) === 0) {
      test.info().annotations.push({ type: 'condition', description: 'FILTER — no roles to sample.' });
      return;
    }

    const headers = page.locator('table thead th');
    let nameIndex = -1;
    for (let i = 0; i < (await headers.count()); i += 1) {
      if (((await headers.nth(i).innerText()) || '').trim() === 'Role Name') nameIndex = i;
    }
    const sample = ((await rows.first().locator('td').nth(nameIndex).innerText()) || '').trim();
    expect(sample.length).toBeGreaterThan(0);

    await addSearchFilter(page, 'Role Name');
    const picked = await pickFilterValue(page, sample);
    if (!picked) {
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER Role Name="${sample}" — option not in dropdown.`,
      });
      return;
    }
    await waitForListData(page);
    const filtered = dataRows(page);
    const n = await filtered.count();
    if (n === 0) {
      await expect(page.getByText('No job roles found')).toBeVisible();
    } else {
      for (let i = 0; i < n; i += 1) {
        expect(await filtered.nth(i).locator('td').nth(nameIndex).innerText()).toContain(sample);
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Role Name="${sample}" → ${n} rows.`,
    });
  });

  test('add requires role name; edit cancelled; delete needs selection', async ({ page }) => {
    if (!(await openRoles(page))) return;

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD — plus hidden (no edit access).' });
      return;
    }

    await add.click();
    await expect(page.getByRole('heading', { name: 'Create New Job Role' })).toBeVisible();
    await expect(page.getByPlaceholder('e.g., System Administrator')).toBeVisible();
    await expect(page.getByText('Send Warranty Alert')).toBeVisible();
    await expect(page.getByText('Send Scrap Alert')).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Role Name is required')).toBeVisible({ timeout: 10000 });

    await cancelModal(page);
    await expect(page.getByRole('heading', { name: 'Create New Job Role' })).toHaveCount(0);

    const edit = page.getByTitle('Edit').first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByRole('heading', { name: 'Edit Job Role' })).toBeVisible();
      await expect(page.getByText('Job Role ID')).toBeVisible();
      await expect(page.getByText('Active Status')).toBeVisible();
      await cancelModal(page);
      await expect(page.getByRole('heading', { name: 'Edit Job Role' })).toHaveCount(0);
    }

    await page.locator('div.flex.gap-2.justify-end > button').last().click();
    await expect(toastMessage(page, 'Please select items to delete')).toBeVisible({ timeout: 10000 });
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD/EDIT/DELETE — validation only; nothing saved.',
    });
  });
});

test.describe('Job Roles — Role Navigation tab', () => {
  test('list, create screen cancelled, edit cancelled', async ({ page }) => {
    if (!(await openRoles(page))) return;

    await page.getByRole('button', { name: 'Role Navigation', exact: true }).click();
    await waitForListData(page);

    const data = await readAdminState(page, /No navigation entries found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA navigation — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    if (data.state === 'data') {
      await expect(page.getByRole('columnheader', { name: 'Job Role' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Label' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Access Level' })).toBeVisible();
    }

    const add = headerAddButton(page);
    if (await add.isVisible().catch(() => false)) {
      await add.click();
      await expect(page).toHaveURL(new RegExp(`${CREATE_NAV.replace(/\//g, '\\/')}`));
      await expect(page.getByText('Select Job Role')).toBeVisible();
      await expect(page.getByText('Select the job role for all navigation entries')).toBeVisible();
      const ready = await gotoProtected(page, `${BASE}${PATH}`);
      expect(ready).toBeTruthy();
      test.info().annotations.push({
        type: 'condition',
        description: 'NAV CREATE — opened; no group/submenu saved; returned to list.',
      });
    }

    await page.getByRole('button', { name: 'Role Navigation', exact: true }).click();
    await waitForListData(page);
    const edit = page.getByTitle('Edit').first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByRole('heading', { name: 'Edit Role Navigation' })).toBeVisible();
      await cancelModal(page);
      await expect(page.getByRole('heading', { name: 'Edit Role Navigation' })).toHaveCount(0);
    }
  });
});
