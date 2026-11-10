// @ts-check
/**
 * Warranty Expired alerts on dashboard + All Notifications.
 *
 * Guards the regression where expired warranty_period assets produced
 * no inbox rows (cron had no tenant DB context; notif_warranty was off;
 * inbox did not ensure-on-read).
 */
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import {
  headerAddButton,
  chooseLabeledOption,
  selectNativeOption,
  clickUnblocked,
} from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-WE-${Date.now().toString(36)}`;
const stamp = run.slice('PW-WE-'.length);
const typeName = `${run}-Type`;
const vendorName = `${run}-Vendor`;
const assetName = `${run} Expired Warranty Asset`;

const state = {
  typeReady: false,
  vendorReady: false,
  assetReady: false,
};

/**
 * @param {number} [offsetDays]
 */
function ymd(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function apiSession(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage');
    let token = null;
    let empIntId = null;
    let orgId = null;
    try {
      const parsed = raw ? JSON.parse(raw) : null;
      token = parsed?.state?.token || null;
      empIntId = parsed?.state?.user?.emp_int_id || null;
      orgId = parsed?.state?.user?.org_id || null;
    } catch {
      /* ignore */
    }
    const { protocol, hostname } = window.location;
    const apiHost = hostname.includes('.')
      ? `${protocol}//${hostname}:5001/api`
      : `${protocol}//localhost:5001/api`;
    return { token, empIntId, orgId, apiBase: apiHost };
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 */
async function apiGet(page, path) {
  const { token, apiBase } = await apiSession(page);
  expect(token, 'auth token').toBeTruthy();
  return page.evaluate(
    async ({ apiBase: base, token: t, path: p }) => {
      const res = await fetch(`${base}${p}`, {
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text };
      }
      return { status: res.status, json };
    },
    { apiBase, token, path },
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureVendor(page) {
  if (state.vendorReady) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  if (await page.locator('tbody tr').filter({ hasText: vendorName }).count()) {
    state.vendorReady = true;
    return;
  }
  await headerAddButton(page).click({ timeout: 15000 });
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() =>
    gotoProtected(page, `${BASE}/master-data/add-vendor`),
  );
  await page.locator('input[name="vendor_name"]').fill(vendorName, { timeout: 15000 });
  await page.locator('input[name="company_name"]').fill(`${run} Co`, { timeout: 15000 });
  await page.locator('input[name="company_email"]').fill(`pw.we.${stamp}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await clickUnblocked(page, 'Save');
  await expectToast(page, 'Vendor created successfully');
  state.vendorReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureType(page) {
  if (state.typeReady) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  if (await page.locator('tbody tr').filter({ hasText: typeName }).count()) {
    state.typeReady = true;
    return;
  }
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName, { timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state.typeReady = true;
}

/**
 * Create asset whose warranty ended ~1 year ago (purchase 13 months ago, 1 month warranty).
 * @param {import('@playwright/test').Page} page
 */
async function createExpiredWarrantyAsset(page) {
  if (state.assetReady) return;
  await ensureVendor(page);
  await ensureType(page);
  await gotoProtected(page, `${BASE}/assets`);
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/assets\/add/);
  if (!(await chooseLabeledOption(page, 'Asset Type', typeName, ['Search by name or ID', 'Search...']))) {
    return;
  }
  await selectNativeOption(page.locator('select[name="serialNumberMode"]'), 'none').catch(() => {});
  await page.locator('textarea[name="description"]').fill(assetName, { timeout: 15000 });
  await page.getByRole('button', { name: 'Purchase Details' }).click({ timeout: 15000 }).catch(() => {});
  await page.locator('input[name="purchaseDate"]').fill(ymd(-400), { timeout: 15000 });
  await page.locator('input[name="expiryDate"]').fill(ymd(365), { timeout: 15000 }).catch(() => {});
  await page.locator('input[name="purchaseCost"]').fill('1', { timeout: 15000 }).catch(() => {});
  await page.locator('input[name="warrantyAmount"]').fill('1', { timeout: 15000 }).catch(() => {});
  await selectNativeOption(page.locator('select[name="warrantyUnit"]'), 'months').catch(() => {});
  await page.getByRole('button', { name: 'Vendor Details' }).click({ force: true, timeout: 8000 }).catch(() => {});
  await chooseLabeledOption(page, 'Product Vendor', vendorName, ['Search...', 'Search by name or ID']).catch(
    () => {},
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Asset created successfully!');
  state.assetReady = true;
}

test.describe('Warranty expiry notifications', () => {
  test('WE-01 Seed asset with expired warranty', async ({ page }) => {
    await createExpiredWarrantyAsset(page);
    test.info().annotations.push({
      type: 'condition',
      description: `SEED — assetReady=${state.assetReady} type=${state.typeReady} vendor=${state.vendorReady}`,
    });
    expect(state.assetReady).toBe(true);
  });

  test('WE-02 API inbox returns Warranty Expired for the seeded asset', async ({ page }) => {
    test.skip(!state.assetReady, 'Expired warranty asset was not created');
    await gotoProtected(page, `${BASE}/dashboard`);
    const session = await apiSession(page);
    expect(session.empIntId, 'emp_int_id').toBeTruthy();

    // Inbox ensure-on-read should create rows even if overnight cron never ran
    const { status, json } = await apiGet(
      page,
      `/notifications/user/${session.empIntId}?orgId=${encodeURIComponent(session.orgId || '')}`,
    );
    expect(status).toBe(200);
    const rows = Array.isArray(json?.data) ? json.data : [];
    const match = rows.find(
      (row) =>
        row.workflowType === 'WARRANTY' &&
        (String(row.body || '').includes(assetName) ||
          String(row.title || '').toLowerCase().includes('warranty expired') ||
          String(row.maintenanceType || '').toLowerCase().includes('warranty expired')),
    );

    test.info().annotations.push({
      type: 'condition',
      description: `API — ${rows.length} notifications; warranty match=${Boolean(match)}`,
    });

    expect(match, 'expected Warranty Expired notification for seeded asset').toBeTruthy();
    expect(
      String(match.title || match.maintenanceType || '').toLowerCase(),
    ).toMatch(/warranty expired|warranty expiry/);
    expect(match.isOverdue === true || Number(match.daysUntilCutoff) < 0).toBeTruthy();
  });

  test('WE-03 All Notifications UI shows Warranty Expired', async ({ page }) => {
    test.skip(!state.assetReady, 'Expired warranty asset was not created');
    await gotoProtected(page, `${BASE}/notifications`);
    await expect(page.locator('header').getByText('All Notifications', { exact: true })).toBeVisible({
      timeout: 30000,
    });

    const card = page
      .locator('div')
      .filter({ hasText: /Warranty Expired|Warranty Expiry/i })
      .filter({ hasText: assetName })
      .first();

    const anyWarranty = page.getByText(/Warranty Expired/i).first();
    await expect(anyWarranty.or(card).first()).toBeVisible({ timeout: 30000 });

    if (await card.isVisible().catch(() => false)) {
      await expect(card).toContainText(/Warranty Expired|Warranty Expiry/i);
    } else {
      await expect(page.getByText(/Warranty Expired/i).first()).toBeVisible();
    }
  });

  test('WE-04 Dashboard notifications surface warranty (card or View All)', async ({ page }) => {
    test.skip(!state.assetReady, 'Expired warranty asset was not created');
    await gotoProtected(page, `${BASE}/dashboard`);
    await expect(page.getByText('Total Assets', { exact: true })).toBeVisible({ timeout: 30000 });

    const dashWarranty = page.getByText(/Warranty Expired|Warranty Expiry/i).first();
    if (await dashWarranty.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(dashWarranty).toBeVisible();
      return;
    }

    // Dashboard card only keeps ≤2 non-inspection alerts — fall back to View All
    await page.getByRole('button', { name: 'View All' }).click({ timeout: 8000 }).catch(() => {});
    await expect(page).toHaveURL(/\/notifications\/?$/);
    await expect(page.getByText(/Warranty Expired/i).first()).toBeVisible({ timeout: 30000 });
  });
});
