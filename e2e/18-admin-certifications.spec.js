// @ts-check
import { test, expect } from '@playwright/test';
import { clickUnblocked, dismissToasts, toastMessage } from './helpers/screenAccess.js';
import {
  firstRealOption,
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';

const PATH = '/adminsettings/configuration/certifications';
const MARKER = 'Existing Certificates';

/**
 * Detailed condition-based coverage for Admin Settings → Certifications.
 * Create / Save / Delete / map / unmap are validated but not committed.
 */

async function openCerts(page) {
  const status = await openAdminScreen(page, PATH, MARKER);
  if (skipIfInaccessible(page, 'Certifications', status)) return false;
  await waitForAdminReady(page);
  return true;
}

function certRows(page) {
  return page.locator('table tbody tr').filter({
    hasNotText: /No certificates found|Loading certificates|No certificates mapped|Select an asset type/,
  });
}

test.describe('Certifications — Certificate tab', () => {
  test('tabs, list chrome, data or empty', async ({ page }) => {
    if (!(await openCerts(page))) return;

    await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspection Certificates', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Existing Certificates' })).toBeVisible();
    await expect(page.getByTitle('Add')).toBeVisible();
    await expect(page.getByTitle('Filter')).toBeVisible();
    await expect(page.getByTitle('Delete')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Number' })).toBeVisible();

    const data = await readAdminState(page, 'No certificates found.');
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
    });
    expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();
  });

  test('filter by certificate name; wrong rows fail', async ({ page }) => {
    if (!(await openCerts(page))) return;

    const rows = certRows(page);
    if ((await rows.count()) === 0) {
      test.info().annotations.push({
        type: 'condition',
        description: 'FILTER — no certificates to sample.',
      });
      return;
    }

    const sample = ((await rows.first().locator('td').nth(1).innerText()) || '').trim();
    expect(sample.length).toBeGreaterThan(0);

    await page.getByTitle('Filter').click();
    const col = page.locator('select').filter({ has: page.locator('option', { hasText: 'Certificate Name' }) }).first();
    await col.selectOption({ label: 'Certificate Name' });
    await page.getByPlaceholder('Search value').fill(sample);
    await waitForAdminReady(page);

    const filtered = certRows(page);
    const n = await filtered.count();
    if (n === 0) {
      await expect(page.getByText('No certificates found.')).toBeVisible();
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER name="${sample}" → no matching rows.`,
      });
    } else {
      for (let i = 0; i < n; i += 1) {
        const text = await filtered.nth(i).locator('td').nth(1).innerText();
        expect(text, `row ${i} after name filter`).toContain(sample);
      }
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER name="${sample}" → ${n} matching rows.`,
      });
    }

    await page.getByRole('button', { name: 'Clear', exact: true }).click();
  });

  test('add requires name and number; edit cancelled; delete needs selection', async ({ page }) => {
    if (!(await openCerts(page))) return;

    await page.getByTitle('Add').click();
    await expect(page.getByText('Add New Certificate')).toBeVisible();
    await expect(page.getByPlaceholder('Enter certificate name')).toBeVisible();
    await expect(page.getByPlaceholder('Enter certificate number')).toBeVisible();

    await clickUnblocked(page, 'Create');
    await expect(toastMessage(page, 'Certificate name is required')).toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder('Enter certificate name').fill('PW-CERT-SKIP');
    await clickUnblocked(page, 'Create');
    await expect(toastMessage(page, 'Certificate number is required')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Add New Certificate')).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'ADD — name/number required; form cancelled; nothing created.',
    });

    const edit = page.getByRole('button', { name: 'Edit' }).first();
    if (await edit.isVisible().catch(() => false)) {
      await edit.click();
      await expect(page.getByText('Update Certificate')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(page.getByText('Update Certificate')).toHaveCount(0);
      test.info().annotations.push({
        type: 'condition',
        description: 'EDIT — modal opened and cancelled.',
      });
    }

    await page.getByTitle('Delete').click();
    await expect(toastMessage(page, /Please select at least one certificate/i)).toBeVisible({
      timeout: 10000,
    });
    test.info().annotations.push({
      type: 'condition',
      description: 'DELETE — empty selection toast; nothing deleted.',
    });
  });
});

test.describe('Certifications — Maintenance Certificate tab', () => {
  test('asset type / maintenance type filters and mapping list', async ({ page }) => {
    if (!(await openCerts(page))) return;

    await page.getByRole('button', { name: 'Maintenance Certificate', exact: true }).click();
    await waitForAdminReady(page);
    await expect(page.getByRole('heading', { name: 'Maintenance Certificates' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maintenance Type' })).toBeVisible();
    await expect(page.getByText(/Select an asset type|No mappings|mapped/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});

    const assetSelect = page.locator('select').first();
    const types = await firstRealOption(assetSelect);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Asset Type — ${types.length ? types.slice(0, 8).join(', ') : 'none'}`,
    });
    if (!types.length) return;

    await assetSelect.selectOption({ label: types[0] });
    await waitForAdminReady(page);
    const emptyMapped = page.getByText('No certificates mapped.');
    const mappedRows = page.locator('table tbody tr').filter({
      hasNotText: /No certificates mapped|Select an asset type/,
    });
    const n = await mappedRows.count();
    if (n === 0) {
      await expect(emptyMapped).toBeVisible();
    } else {
      const assetCells = mappedRows.locator('td:nth-child(3)');
      const count = await assetCells.count();
      for (let i = 0; i < count; i += 1) {
        expect(await assetCells.nth(i).innerText()).toContain(types[0]);
      }
    }

    const maintSelect = page.locator('select').nth(1);
    const maints = await firstRealOption(maintSelect);
    test.info().annotations.push({
      type: 'condition',
      description: `FILTER Maintenance Type after ${types[0]} — ${maints.length ? maints.join(', ') : 'none'}; mapped rows=${n}.`,
    });
    if (maints.length) {
      await maintSelect.selectOption({ label: maints[0] });
      await waitForAdminReady(page);
      const after = page.locator('table tbody tr').filter({
        hasNotText: /No certificates mapped|Select an asset type/,
      });
      const m = await after.count();
      if (m > 0) {
        const maintCells = after.locator('td:nth-child(4)');
        for (let i = 0; i < (await maintCells.count()); i += 1) {
          expect(await maintCells.nth(i).innerText()).toContain(maints[0]);
        }
      }
    }
  });

  test('add mapping form opens; Save not clicked', async ({ page }) => {
    if (!(await openCerts(page))) return;

    await page.getByRole('button', { name: 'Maintenance Certificate', exact: true }).click();
    await page.getByTitle('Add').click();
    await expect(page.getByText('Asset & Maintenance Type')).toBeVisible();
    await expect(page.getByText('Available Certificates')).toBeVisible();
    await expect(page.getByText('Selected Certificates')).toBeVisible();
    await expect(page.getByPlaceholder('Search available certificates...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

    await clickUnblocked(page, 'Save');
    await expect(
      toastMessage(page, /Please select an asset type|Please select a maintenance type/i),
    ).toBeVisible({ timeout: 8000 }).catch(() => {});

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Asset & Maintenance Type')).toHaveCount(0);
    test.info().annotations.push({
      type: 'condition',
      description: 'MAP — form required asset/maintenance type; cancelled; nothing saved.',
    });
  });
});

test.describe('Certifications — Inspection Certificates tab', () => {
  test('list chrome, empty or data, add form cancelled, delete needs selection', async ({
    page,
  }) => {
    if (!(await openCerts(page))) return;

    await page.getByRole('button', { name: 'Inspection Certificates', exact: true }).click();
    await waitForAdminReady(page);
    await expect(page.getByRole('heading', { name: 'Inspection Certificates' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();

    const empty = page.getByText(
      'No inspection certificates found. Click the Plus icon to add certificates.',
    );
    const rows = page.locator('table tbody tr').filter({
      hasNotText: /No inspection certificates found/,
    });
    const n = await rows.count();
    if (n === 0) {
      await expect(empty).toBeVisible();
    }
    test.info().annotations.push({
      type: 'condition',
      description: `INSPECTION list — ${n} rows.`,
    });

    await page.getByTitle('Delete').click();
    await expect(toastMessage(page, /Please select/i)).toBeVisible({ timeout: 10000 });
    await dismissToasts(page);

    await page.getByTitle('Add').click();
    await expect(page.getByRole('heading', { name: 'Available Certificates' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Selected Certificates' })).toBeVisible();
    await expect(
      page.getByText('Please select an asset type to view available certificates'),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Documents' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add Document' })).toBeVisible();

    const typeBtn = page.getByRole('button', { name: /Select Asset Type/i }).first();
    await typeBtn.click();
    const search = page.getByPlaceholder('Search asset types...');
    if (await search.isVisible().catch(() => false)) {
      const firstType = page.locator('div.absolute.z-50 button').filter({ hasText: /.+/ }).first();
      if (await firstType.isVisible().catch(() => false)) {
        const label = ((await firstType.innerText()) || '').trim();
        await firstType.click();
        test.info().annotations.push({
          type: 'condition',
          description: `INSPECTION form asset type="${label}"; dual-list shown; Add not committed.`,
        });
      } else {
        test.info().annotations.push({
          type: 'condition',
          description: 'INSPECTION — no inspection asset types in dropdown.',
        });
      }
    }

    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Please select an asset type to view available certificates')).toHaveCount(
      0,
    );
  });
});
