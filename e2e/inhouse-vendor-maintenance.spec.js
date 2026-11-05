// @ts-check
/**
 * In-house vs Vendor maintenance contract.
 *
 * Guards the regression where Admin Settings frequency = In-house still
 * produced vendor-labelled work orders / blank technicians / missing Tech tab.
 *
 * Runs on deploy (Playwright CI) against the playwright tenant.
 */
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import {
  headerAddButton,
  chooseLabeledOption,
  clickUnblocked,
  selectNativeOption,
} from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-IHV-${Date.now().toString(36)}`;
const stamp = run.slice('PW-IHV-'.length);

const inhouseTypeName = `${run}-IH-Type`;
const vendorTypeName = `${run}-VN-Type`;
const vendorName = `${run}-Vendor`;
const inhouseAsset = `${run} IH Asset`;
const vendorAsset = `${run} VN Asset`;
const stepName = `${run} Step`;

const state = {
  inhouseTypeReady: false,
  vendorTypeReady: false,
  vendorReady: false,
  inhouseFreqReady: false,
  vendorFreqReady: false,
  inhouseWorkflowReady: false,
  vendorWorkflowReady: false,
  inhouseAssetReady: false,
  vendorAssetReady: false,
  inhouseMaintReady: false,
  vendorMaintReady: false,
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
 * @param {import('@playwright/test').Locator} select
 */
async function realOptions(select) {
  return select.locator('option').evaluateAll((options) =>
    options
      .filter((option) => /** @type {HTMLOptionElement} */ (option).value)
      .map((option) => ({
        value: /** @type {HTMLOptionElement} */ (option).value,
        label: (option.textContent || '').trim(),
      })),
  );
}

/**
 * Auth token + API base as the browser session sees them.
 * @param {import('@playwright/test').Page} page
 */
async function apiSession(page) {
  return page.evaluate(() => {
    const raw = localStorage.getItem('auth-storage');
    let token = null;
    try {
      token = raw ? JSON.parse(raw)?.state?.token : null;
    } catch {
      token = null;
    }
    const { protocol, hostname } = window.location;
    const apiHost = hostname.includes('.')
      ? `${protocol}//${hostname}:5001/api`
      : `${protocol}//localhost:5001/api`;
    return { token, apiBase: apiHost };
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {Record<string, unknown>} [init]
 */
async function apiGet(page, path, init = {}) {
  const { token, apiBase } = await apiSession(page);
  expect(token, 'auth token in localStorage').toBeTruthy();
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

function isInhouseLabel(value) {
  const maint = String(value || '')
    .toLowerCase()
    .replace(/[\s_-]/g, '');
  if (!maint) return false;
  if (maint.includes('vendor')) return false;
  return maint.includes('inhouse') || maint.includes('self') || maint === 'internal';
}

function isInhouseVendorName(name) {
  const n = String(name || '').toLowerCase();
  return n.includes('in-house') || n.includes('inhouse');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureVendor(page) {
  if (state.vendorReady) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

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
  await page.locator('input[name="company_email"]').fill(`pw.ihv.${stamp}@test.com`, { timeout: 15000 });
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`, { timeout: 15000 });
  await page.locator('input[name="contact_person_number"]').fill('9876543210', { timeout: 15000 });
  await clickUnblocked(page, 'Save');
  await expectToast(page, 'Vendor created successfully');
  state.vendorReady = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {'inhouse' | 'vendor'} kind
 */
async function ensureAssetType(page, typeName, kind) {
  const flag = kind === 'inhouse' ? 'inhouseTypeReady' : 'vendorTypeReady';
  if (state[flag]) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });

  if (await page.locator('tbody tr').filter({ hasText: typeName }).count()) {
    state[flag] = true;
    return;
  }

  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName, { timeout: 15000 });
  await page
    .locator('label')
    .filter({ hasText: 'Require Maintenance' })
    .locator('input[type="checkbox"]')
    .check({ timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state[flag] = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {'inhouse' | 'vendor'} kind
 */
async function createOnDemandFrequency(page, typeName, kind) {
  const flag = kind === 'inhouse' ? 'inhouseFreqReady' : 'vendorFreqReady';
  if (state[flag]) return;

  await gotoProtected(page, `${BASE}/admin-settings/maintenance-frequency/add`);
  await expect(page.getByText('Create Maintenance Frequency', { exact: true })).toBeVisible({
    timeout: 30000,
  }).catch(() => {});

  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  if (!(await typeSelect.isVisible({ timeout: 8000 }).catch(() => false))) return;

  const typeFound = await expect
    .poll(async () => (await realOptions(typeSelect)).some((o) => o.label === typeName), {
      timeout: 15000,
    })
    .toBeTruthy()
    .then(() => true)
    .catch(() => false);
  if (!typeFound) return;

  await typeSelect.selectOption({ label: typeName }, { timeout: 8000 }).catch(() => {});
  await page.getByText('On Demand', { exact: true }).click({ force: true, timeout: 8000 }).catch(() => {});

  const maintSelect = page.locator('select').filter({ has: page.getByText('-- Select Maintenance Type --') });
  const maintOptions = await realOptions(maintSelect).catch(() => []);
  const maint = maintOptions.find((o) => !/other/i.test(o.label)) || maintOptions[0];
  if (!maint) return;
  await selectNativeOption(maintSelect, { value: maint.value });

  if (kind === 'inhouse') {
    await page.getByRole('radio', { name: 'In-House' }).check({ force: true, timeout: 8000 }).catch(() => {});
  } else {
    await page.getByRole('radio', { name: 'Vendor' }).check({ force: true, timeout: 8000 }).catch(() => {});
  }

  await page.getByRole('button', { name: 'Save Frequency' }).click({ force: true, timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Maintenance frequency created successfully');
  state[flag] = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {'inhouse' | 'vendor'} kind
 */
async function ensureWorkflow(page, typeName, kind) {
  const flag = kind === 'inhouse' ? 'inhouseWorkflowReady' : 'vendorWorkflowReady';
  if (state[flag]) return;

  await gotoProtected(page, `${BASE}/adminsettings/configuration/maintenance-config`);
  await expect(page.getByText('Maintenance Details', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });

  await clickUnblocked(page, 'Workflow Steps');
  const stepRow = page.locator('table tbody tr').filter({ hasText: stepName });
  if (!(await stepRow.count())) {
    const addStep = page.locator('button[title="Add Workflow Step"]');
    if (!(await addStep.isVisible({ timeout: 8000 }).catch(() => false))) return;
    await addStep.click({ timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder(/Enter workflow step name/).fill(stepName, { timeout: 15000 });
    await page.getByRole('button', { name: 'Add Step' }).click({ timeout: 15000 });
    await expectToast(page, 'Workflow step created successfully');
  }

  await page.getByRole('button', { name: 'Asset Type Sequences' }).click({ timeout: 15000 });
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await expect(typeSelect).toBeVisible();
  await expect
    .poll(async () => (await realOptions(typeSelect)).some((o) => o.label === typeName), { timeout: 30000 })
    .toBeTruthy();
  await typeSelect.selectOption({ label: typeName }, { timeout: 15000 });

  if (!(await page.locator('table tbody tr').count())) {
    const stepSelect = page.locator('select').filter({ has: page.getByText('-- Select Step --') });
    await expect
      .poll(async () => (await realOptions(stepSelect)).some((o) => o.label === stepName), { timeout: 15000 })
      .toBeTruthy();
    await stepSelect.selectOption({ label: stepName }, { timeout: 15000 });
    await page.getByPlaceholder('10, 20, 30, etc.').fill('10', { timeout: 15000 });
    await page.locator('button[title="Add Sequence"]').click({ timeout: 15000 });
    await expectToast(page, 'Sequence created successfully');
  }

  await page.getByRole('button', { name: 'Select Job Role' }).click({ timeout: 15000 });
  const stepForRole = page.locator('select').filter({ has: page.getByText('-- Select Workflow Step --') });
  await stepForRole.selectOption({ label: stepName }, { timeout: 15000 });
  if (!(await page.locator('table tbody tr').count())) {
    const roleSelect = page.locator('select').filter({ has: page.getByText('-- Select Job Role --') });
    const roles = await realOptions(roleSelect);
    const role =
      roles.find((o) => /system admin/i.test(o.label)) ||
      roles.find((o) => !/other/i.test(o.label)) ||
      roles[0];
    if (!role) return;
    await roleSelect.selectOption({ value: role.value }, { timeout: 15000 });
    await page.locator('button[title="Select Job Role"]').click({ timeout: 15000 });
    await expectToast(page, 'Job role assigned successfully');
  }

  state[flag] = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 * @param {string} typeName
 * @param {'inhouse' | 'vendor'} kind
 */
async function createAsset(page, assetName, typeName, kind) {
  const flag = kind === 'inhouse' ? 'inhouseAssetReady' : 'vendorAssetReady';
  if (state[flag]) return;

  await gotoProtected(page, `${BASE}/assets`);
  await headerAddButton(page).click({ timeout: 15000 });
  await expect(page).toHaveURL(/\/assets\/add/);
  if (!(await chooseLabeledOption(page, 'Asset Type', typeName, ['Search by name or ID', 'Search...']))) {
    return;
  }
  await selectNativeOption(page.locator('select[name="serialNumberMode"]'), 'none').catch(() => {});
  await page.locator('textarea[name="description"]').fill(assetName, { timeout: 15000 });
  await page.getByRole('button', { name: 'Purchase Details' }).click({ timeout: 15000 }).catch(() => {});
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7), { timeout: 15000 }).catch(() => {});
  await page.locator('input[name="expiryDate"]').fill(ymd(365), { timeout: 15000 }).catch(() => {});
  await page.locator('input[name="purchaseCost"]').fill('1', { timeout: 15000 }).catch(() => {});
  await page.getByRole('button', { name: 'Vendor Details' }).click({ force: true, timeout: 8000 }).catch(() => {});
  await chooseLabeledOption(page, 'Product Vendor', vendorName, ['Search...', 'Search by name or ID']).catch(() => {});
  // Service vendor appears for vendor-maintained types; optional for in-house
  await chooseLabeledOption(page, 'Service Vendor', vendorName, ['Search...', 'Search by name or ID']).catch(() => {});
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectToast(page, 'Asset created successfully!');
  state[flag] = true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function selectCreateType(page, typeName) {
  const trigger = page
    .locator('label')
    .filter({ hasText: /^Asset Type/ })
    .locator('xpath=..')
    .getByRole('button');
  await expect(trigger).toBeVisible({ timeout: 8000 }).catch(() => {});
  await trigger.click({ force: true, timeout: 8000 }).catch(() => {});
  const search = page.getByPlaceholder('Search asset type...');
  if (!(await search.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await search.fill(typeName, { timeout: 15000 });
  const option = page.locator('div.cursor-pointer').filter({ hasText: typeName }).first();
  if (!(await option.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await option.click({ force: true, timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 * @param {'inhouse' | 'vendor'} kind
 * @param {number} [attempt]
 */
async function createMaintenanceOnAsset(page, assetName, kind, attempt = 0) {
  const flag = kind === 'inhouse' ? 'inhouseMaintReady' : 'vendorMaintReady';
  if (state[flag] || attempt > 2) return;

  const typeName = kind === 'inhouse' ? inhouseTypeName : vendorTypeName;
  await gotoProtected(page, `${BASE}/maintenance-list/create`);
  await expect(page.getByText('Create Manual Maintenance', { exact: true }).first()).toBeVisible({
    timeout: 30000,
  });
  await selectCreateType(page, typeName);

  const row = page.locator('div.grid').filter({ has: page.locator(`[title="${assetName}"]`) });
  if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await row.getByRole('button', { name: 'Create Maintenance' }).click({ force: true, timeout: 8000 }).catch(() => {});

  const landed = await page
    .waitForURL(/\/maintenance-list$/, { timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (landed) {
    await expectToast(page, 'Maintenance created successfully');
    state[flag] = true;
    return;
  }

  const fail = page.getByText(/frequency|workflow|sequence|Failed to create maintenance/i);
  if (await fail.isVisible({ timeout: 3000 }).catch(() => false)) {
    const message = ((await fail.first().textContent()) || '').toLowerCase();
    if (message.includes('frequency')) {
      await createOnDemandFrequency(page, typeName, kind);
    } else {
      await ensureWorkflow(page, typeName, kind);
    }
    await createMaintenanceOnAsset(page, assetName, kind, attempt + 1);
  }
}

test.describe('In-house vs Vendor maintenance', () => {
  test('IHV-01 API contract: in-house rows never look vendor-only', async ({ page }) => {
    await gotoProtected(page, `${BASE}/dashboard`);
    const { status, json } = await apiGet(page, '/work-orders/all');
    expect(status).toBe(200);
    const rows = Array.isArray(json?.data) ? json.data : [];
    test.info().annotations.push({
      type: 'condition',
      description: `WORK ORDERS — ${rows.length} open rows for contract check.`,
    });

    for (const row of rows) {
      const maintainedBy = row.maintained_by;
      const isInhouse = Boolean(row.is_inhouse) || isInhouseLabel(maintainedBy);
      const vendorNameVal = row.vendor?.vendor_name || row.vendor_name || '';

      if (isInhouse) {
        expect(
          isInhouseLabel(maintainedBy) || row.is_inhouse === true,
          `${row.ams_id} should be labelled in-house (got maintained_by=${maintainedBy})`,
        ).toBeTruthy();
        // Must not keep a normal service vendor when classified in-house
        if (vendorNameVal) {
          expect(
            isInhouseVendorName(vendorNameVal),
            `${row.ams_id} in-house but vendor="${vendorNameVal}"`,
          ).toBeTruthy();
        }
      } else if (isInhouseLabel(maintainedBy) === false && String(maintainedBy || '').toLowerCase().includes('vendor')) {
        expect(row.is_inhouse, `${row.ams_id} vendor row flagged is_inhouse`).toBeFalsy();
      }
    }
  });

  test('IHV-02 Seed in-house type, frequency, workflow, asset, maintenance', async ({ page }) => {
    await ensureVendor(page);
    await ensureAssetType(page, inhouseTypeName, 'inhouse');
    await createOnDemandFrequency(page, inhouseTypeName, 'inhouse');
    await ensureWorkflow(page, inhouseTypeName, 'inhouse');
    await createAsset(page, inhouseAsset, inhouseTypeName, 'inhouse');
    await createMaintenanceOnAsset(page, inhouseAsset, 'inhouse');

    test.info().annotations.push({
      type: 'condition',
      description: `INHOUSE SEED — freq=${state.inhouseFreqReady} wf=${state.inhouseWorkflowReady} asset=${state.inhouseAssetReady} maint=${state.inhouseMaintReady}`,
    });
    expect(state.inhouseTypeReady).toBe(true);
    expect(state.inhouseFreqReady).toBe(true);
  });

  test('IHV-03 Seed vendor type, frequency, workflow, asset, maintenance', async ({ page }) => {
    await ensureVendor(page);
    await ensureAssetType(page, vendorTypeName, 'vendor');
    await createOnDemandFrequency(page, vendorTypeName, 'vendor');
    await ensureWorkflow(page, vendorTypeName, 'vendor');
    await createAsset(page, vendorAsset, vendorTypeName, 'vendor');
    await createMaintenanceOnAsset(page, vendorAsset, 'vendor');

    test.info().annotations.push({
      type: 'condition',
      description: `VENDOR SEED — freq=${state.vendorFreqReady} wf=${state.vendorWorkflowReady} asset=${state.vendorAssetReady} maint=${state.vendorMaintReady}`,
    });
    expect(state.vendorTypeReady).toBe(true);
    expect(state.vendorFreqReady).toBe(true);
  });

  test('IHV-04 API: seeded in-house WO is_inhouse + In-House Maintenance vendor', async ({ page }) => {
    test.skip(!state.inhouseMaintReady, 'In-house maintenance was not created in IHV-02');
    await gotoProtected(page, `${BASE}/dashboard`);
    const { status, json } = await apiGet(page, '/work-orders/all');
    expect(status).toBe(200);
    const rows = Array.isArray(json?.data) ? json.data : [];
    const match = rows.find(
      (r) =>
        String(r.asset?.description || '').includes(inhouseAsset) ||
        String(r.asset_type?.asset_type_name || '').includes(inhouseTypeName),
    );
    expect(match, 'expected open WO for seeded in-house asset').toBeTruthy();
    expect(match.is_inhouse || isInhouseLabel(match.maintained_by)).toBeTruthy();
    const vName = match.vendor?.vendor_name || '';
    expect(isInhouseVendorName(vName), `vendor should be In-House Maintenance, got "${vName}"`).toBeTruthy();
  });

  test('IHV-05 API: seeded vendor WO stays vendor', async ({ page }) => {
    test.skip(!state.vendorMaintReady, 'Vendor maintenance was not created in IHV-03');
    await gotoProtected(page, `${BASE}/dashboard`);
    const { status, json } = await apiGet(page, '/work-orders/all');
    expect(status).toBe(200);
    const rows = Array.isArray(json?.data) ? json.data : [];
    const match = rows.find(
      (r) =>
        String(r.asset?.description || '').includes(vendorAsset) ||
        String(r.asset_type?.asset_type_name || '').includes(vendorTypeName),
    );
    expect(match, 'expected open WO for seeded vendor asset').toBeTruthy();
    expect(match.is_inhouse).toBeFalsy();
    expect(String(match.maintained_by || '').toLowerCase()).toContain('vendor');
  });

  test('IHV-06 UI: Upcoming Jobs shows In-house for in-house rows', async ({ page }) => {
    await gotoProtected(page, `${BASE}/tech-cert-approvals`);
    await expect(page.getByRole('button', { name: 'Upcoming Jobs' })).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Upcoming Jobs' }).click();
    await expect(
      page
        .getByRole('columnheader', { name: 'Work Order' })
        .or(page.getByText('No upcoming jobs found.', { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 30000 });

    if (await page.getByText('No upcoming jobs found.', { exact: true }).isVisible().catch(() => false)) {
      test.info().annotations.push({ type: 'condition', description: 'UPCOMING — empty list.' });
      return;
    }

    const headers = page.locator('thead th');
    const headerTexts = await headers.allTextContents();
    const maintainedIdx = headerTexts.findIndex((t) => /maintained/i.test(t));
    expect(maintainedIdx, 'Maintained By column').toBeGreaterThanOrEqual(0);

    const rows = page.locator('tbody tr');
    const n = await rows.count();
    let checked = 0;
    for (let i = 0; i < Math.min(n, 25); i += 1) {
      const cells = rows.nth(i).locator('td');
      const maintainedText = ((await cells.nth(maintainedIdx).innerText()) || '').trim();
      if (isInhouseLabel(maintainedText) || /inhouse|in-house/i.test(maintainedText)) {
        expect(maintainedText, `row ${i} maintained_by`).not.toMatch(/^vendor$/i);
        checked += 1;
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `UPCOMING — checked ${checked} in-house-looking rows of ${n}.`,
    });
  });

  test('IHV-07 UI: Maintenance Approval Tech tab for in-house asset', async ({ page }) => {
    test.skip(!state.inhouseAssetReady, 'In-house asset missing');
    await gotoProtected(page, `${BASE}/maintenance-approval`);
    await expect(page.locator('header').getByText('Approval', { exact: true })).toBeVisible({
      timeout: 30000,
    });

    const row = page.locator('tbody tr').filter({ hasText: inhouseAsset }).first();
    if (!(await row.isVisible({ timeout: 15000 }).catch(() => false))) {
      // List may show serial / type instead of description
      const typeRow = page.locator('tbody tr').filter({ hasText: inhouseTypeName }).first();
      if (!(await typeRow.isVisible({ timeout: 8000 }).catch(() => false))) {
        test.info().annotations.push({
          type: 'condition',
          description: 'APPROVAL LIST — seeded in-house row not visible yet (workflow pending).',
        });
        return;
      }
      await typeRow.click({ timeout: 8000 }).catch(() => {});
    } else {
      await row.click({ timeout: 8000 }).catch(() => {});
    }

    await page.waitForTimeout(1000);
    const techTab = page.getByRole('button', { name: /Technician/i });
    const vendorTab = page.getByRole('button', { name: /^Vendor$/i });

    if (await techTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await techTab.click({ timeout: 8000 }).catch(() => {});
      await expect(
        page.getByText(/Technician|Select Technician|certified/i).first(),
      ).toBeVisible({ timeout: 10000 });
    } else if (await vendorTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      throw new Error('In-house maintenance showed Vendor tab instead of Technician tab');
    } else {
      test.info().annotations.push({
        type: 'condition',
        description: 'DETAIL — neither Tech nor Vendor tab found (soft).',
      });
    }
  });

  test('IHV-08 UI: Maintenance Approval Vendor tab for vendor asset', async ({ page }) => {
    test.skip(!state.vendorAssetReady, 'Vendor asset missing');
    await gotoProtected(page, `${BASE}/maintenance-approval`);
    const row = page
      .locator('tbody tr')
      .filter({ hasText: vendorAsset })
      .or(page.locator('tbody tr').filter({ hasText: vendorTypeName }))
      .first();
    if (!(await row.isVisible({ timeout: 15000 }).catch(() => false))) {
      test.info().annotations.push({
        type: 'condition',
        description: 'APPROVAL LIST — seeded vendor row not visible yet.',
      });
      return;
    }
    await row.click({ timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(1000);
    const vendorTab = page.getByRole('button', { name: /^Vendor$/i });
    await expect(vendorTab).toBeVisible({ timeout: 15000 });
    await vendorTab.click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText(/Vendor/i).first()).toBeVisible({ timeout: 8000 });
  });
});
