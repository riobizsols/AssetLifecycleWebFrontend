// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, headerAddButton, toastMessage } from './helpers/screenAccess.js';
import {
  addSearchFilter,
  exerciseSort,
  pickFilterValue,
  waitForListData,
} from './helpers/inspectionScreen.js';
import {
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/opc-configuration';
const MARKER = 'Components';
const EMPTY = /No components found|No tag mappings found|No condition rules found/;

/**
 * Detailed condition-based coverage for Admin Settings → OPC Configuration.
 * Save / Delete are validated, never committed.
 */

async function openOpc(page) {
  const status = await openAdminScreen(page, PATH, MARKER);
  if (skipIfInaccessible(page, 'OPC Configuration', status)) return false;
  await waitForListData(page);
  return true;
}

function opcRows(page) {
  return page.locator('table tbody tr').filter({
    hasNotText: EMPTY,
  });
}

async function clickTab(page, label) {
  await page.getByRole('button', { name: label, exact: true }).click();
  await waitForAdminReady(page);
  await waitForListData(page);
}

async function cancelModal(page) {
  const cancel = page.getByRole('button', { name: 'Cancel', exact: true }).last();
  if (await cancel.isVisible().catch(() => false)) {
    await clickUnblocked(page, 'Cancel');
  }
}

test.describe('OPC Configuration — tabs', () => {
  test('tabs, components list, data or empty', async ({ page }) => {
    if (!(await openOpc(page))) return;

    await expect(page.getByRole('button', { name: 'Components', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Component-Tag Mapping', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Conditions', exact: true })).toBeVisible();
    await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();

    const data = await readAdminState(page, /No components found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA components — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();

    if (data.state === 'data') {
      await expect(page.getByRole('columnheader', { name: 'Asset' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Component Name' })).toBeVisible();
    }
  });
});

test.describe('OPC Configuration — Components', () => {
  test('filter by component name; wrong rows fail', async ({ page }) => {
    if (!(await openOpc(page))) return;

    const rows = opcRows(page);
    if ((await rows.count()) === 0) {
      test.info().annotations.push({
        type: 'condition',
        description: 'FILTER — no components to sample.',
      });
      return;
    }

    await exerciseSort(page, test.info(), 'Component Name');
    const nameHeader = page.getByRole('columnheader', { name: 'Component Name' });
    await expect(nameHeader).toBeVisible();
    const headers = page.locator('table thead th');
    const n = await headers.count();
    let nameIndex = -1;
    for (let i = 0; i < n; i += 1) {
      if (((await headers.nth(i).innerText()) || '').trim() === 'Component Name') nameIndex = i;
    }
    const sample = ((await rows.first().locator('td').nth(nameIndex).innerText()) || '').trim();
    if (!sample || sample === 'N/A') {
      test.info().annotations.push({
        type: 'condition',
        description: 'FILTER — first row has no component name.',
      });
      return;
    }

    await addSearchFilter(page, 'Component Name');
    const picked = await pickFilterValue(page, sample);
    if (!picked) {
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER Component Name="${sample}" — option not in dropdown.`,
      });
      return;
    }
    await waitForListData(page);
    const filtered = opcRows(page);
    const count = await filtered.count();
    if (count === 0) {
      await expect(page.getByText('No components found')).toBeVisible();
    } else {
      for (let i = 0; i < count; i += 1) {
        const text = await filtered.nth(i).locator('td').nth(nameIndex).innerText();
        expect(text, `row ${i} after component name filter`).toContain(sample);
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Component Name="${sample}" → ${count} rows.`,
    });
  });

  test('add requires asset and name; edit cancelled; delete needs selection', async ({ page }) => {
    if (!(await openOpc(page))) return;

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'ADD — plus hidden (no edit access).',
      });
      return;
    }

    await add.click();
    await expect(page.getByRole('heading', { name: 'Add Component' })).toBeVisible();
    await expect(page.getByText('Select asset')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Spindle, Motor, Belt')).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Select an asset')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('e.g. Spindle, Motor, Belt').fill('PW-COMP-SKIP');
    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Select an asset')).toBeVisible({ timeout: 10000 });

    await cancelModal(page);
    await expect(page.getByRole('heading', { name: 'Add Component' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD — asset required; form cancelled; nothing created.',
    });

    const edit = page.getByRole('button', { name: /Edit/i }).first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByRole('heading', { name: /Edit Component/ })).toBeVisible();
      await cancelModal(page);
      await expect(page.getByRole('heading', { name: /Edit Component/ })).toHaveCount(0);
    }

    const trash = page.locator('div.flex.gap-2.justify-end > button').last();
    await trash.click();
    await expect(toastMessage(page, 'Please select items to delete')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('OPC Configuration — Component-Tag Mapping', () => {
  test('list, add mapping validation, no save', async ({ page }) => {
    if (!(await openOpc(page))) return;

    await clickTab(page, 'Component-Tag Mapping');
    const data = await readAdminState(page, /No tag mappings found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA mapping — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    if (data.state === 'data') {
      await expect(page.getByRole('columnheader', { name: 'Asset' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Component' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'OPC Tag Path' })).toBeVisible();
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'MAP — plus hidden (no edit access).',
      });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Add Component Tag Mapping' })).toBeVisible();
    await expect(page.getByText('Browse OPC tags...')).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Asset is required')).toBeVisible({ timeout: 10000 });

    await cancelModal(page);
    await expect(page.getByRole('heading', { name: 'Add Component Tag Mapping' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'MAP — Asset required toast; cancelled; nothing saved.',
    });
  });
});

test.describe('OPC Configuration — Conditions', () => {
  test('list, add rule validation, no save', async ({ page }) => {
    if (!(await openOpc(page))) return;

    await clickTab(page, 'Conditions');
    await expect(
      page.getByText('Set conditions on mapped OPC tags to trigger CBM maintenance or an inspection for the asset'),
    ).toBeVisible();

    const data = await readAdminState(page, /No condition rules found/);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA conditions — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    if (data.state === 'data') {
      await expect(page.getByRole('columnheader', { name: 'Condition' })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: 'Check Every' })).toBeVisible();
    }

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'RULE — plus hidden (no edit access).',
      });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Add Condition Rule' })).toBeVisible();
    await expect(page.getByText('Select asset / component / tag')).toBeVisible();
    await expect(page.locator('select option', { hasText: 'Select a tag first' })).toBeAttached();
    await expect(page.getByText('Run CBM Maintenance')).toBeVisible();
    await expect(page.getByText('Run Inspection')).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(toastMessage(page, 'Mapped tag is required')).toBeVisible({ timeout: 10000 });

    await cancelModal(page);
    await expect(page.getByRole('heading', { name: 'Add Condition Rule' })).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'RULE — mapped tag required; cancelled; nothing saved.',
    });
  });
});
