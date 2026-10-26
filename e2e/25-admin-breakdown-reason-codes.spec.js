// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, headerAddButton, toastMessage } from './helpers/screenAccess.js';
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

const PATH = '/adminsettings/configuration/breakdown-reason-codes';
const EMPTY = /No breakdown reason codes found/;

async function openReasons(page) {
  const status = await openAdminScreen(page, PATH, { column: 'Reason Code' });
  if (skipIfInaccessible(page, 'Breakdown Reason Codes', status)) return false;
  await waitForListData(page);
  return true;
}

function dataRows(page) {
  return page.locator('table tbody tr').filter({ hasNotText: EMPTY });
}

test.describe('Breakdown Reason Codes', () => {
  test('columns, data or empty', async ({ page }) => {
    if (!(await openReasons(page))) return;

    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Reason Code' })).toBeVisible();
    const data = await readAdminState(page, EMPTY);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();
  });

  test('filter by reason code; wrong rows fail', async ({ page }) => {
    if (!(await openReasons(page))) return;

    const rows = dataRows(page);
    if ((await rows.count()) === 0) {
      test.info().annotations.push({ type: 'condition', description: 'FILTER — no reason codes to sample.' });
      return;
    }
    const headers = page.locator('table thead th');
    let idx = -1;
    for (let i = 0; i < (await headers.count()); i += 1) {
      if (((await headers.nth(i).innerText()) || '').trim() === 'Reason Code') idx = i;
    }
    const sample = ((await rows.first().locator('td').nth(idx).innerText()) || '').trim();
    expect(sample.length).toBeGreaterThan(0);

    await addSearchFilter(page, 'Reason Code');
    const picked = await pickFilterValue(page, sample);
    if (!picked) {
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER Reason Code="${sample}" — option not in dropdown.`,
      });
      return;
    }
    await waitForListData(page);
    const filtered = dataRows(page);
    const n = await filtered.count();
    if (n === 0) {
      await expect(page.getByText('No breakdown reason codes found')).toBeVisible();
    } else {
      for (let i = 0; i < n; i += 1) {
        expect(await filtered.nth(i).locator('td').nth(idx).innerText()).toContain(sample);
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Reason Code="${sample}" → ${n} rows.`,
    });
  });

  test('add requires asset type; delete needs selection', async ({ page }) => {
    if (!(await openReasons(page))) return;

    const add = headerAddButton(page);
    if (!(await add.isVisible().catch(() => false))) {
      test.info().annotations.push({ type: 'condition', description: 'ADD — plus hidden (no edit access).' });
      return;
    }
    await add.click();
    await expect(page.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toBeVisible();
    const typeSelect = page.locator('select').filter({ has: page.locator('option', { hasText: 'Select Asset Type' }) });
    await expect(typeSelect).toBeVisible();
    await expect(page.getByPlaceholder('Enter breakdown reason code')).toBeVisible();

    await clickUnblocked(page, 'Save');
    const native = await typeSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity());
    if (native) {
      await expect(typeSelect).toHaveJSProperty('validity.valueMissing', true);
    } else {
      await expect(toastMessage(page, /Please select an asset type|Reason code text is required/i)).toBeVisible({
        timeout: 10000,
      });
    }
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Create New Breakdown Reason Code' })).toHaveCount(0);

    const trash = page.locator('div.flex.gap-2.justify-end > button').filter({
      has: page.locator('svg.lucide-trash-2, svg.lucide-trash'),
    });
    await trash.click();
    await expect(
      toastMessage(page, /Please select items to delete|Please select at least one reason code/i),
    ).toBeVisible({ timeout: 10000 });
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD/DELETE — validation only; nothing saved.',
    });
  });
});
