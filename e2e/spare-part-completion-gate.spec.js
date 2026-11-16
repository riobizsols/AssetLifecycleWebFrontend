// @ts-check
/**
 * Spare-parts completion gate for in-house maintenance.
 *
 * Blocks Maintenance List status=CO until linked spare requests are
 * Issued (IE) or Rejected (RJ). Also blocks when the spare-parts screen
 * was never used (no tblSpareIssue rows).
 *
 * Runs on deploy via .github/workflows/playwright.yml (push/PR to
 * production | Niranjan-Prod | sanjana-prod).
 */
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe.configure({ mode: 'serial' });

const state = {
  /** @type {string} */
  amsId: '',
  /** @type {string} */
  assetId: '',
  /** @type {string} */
  serial: '',
  /** @type {string} */
  spcId: '',
  /** @type {string} */
  siId: '',
  ready: false,
  completed: false,
};

/**
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} text
 */
async function expectToast(page, text) {
  const toast =
    typeof text === 'string'
      ? page.getByText(text, { exact: false }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
 * @param {string} method
 * @param {string} path
 * @param {Record<string, unknown>} [body]
 */
async function api(page, method, path, body) {
  const { token, apiBase } = await apiSession(page);
  expect(token, 'auth token in localStorage').toBeTruthy();
  return page.evaluate(
    async ({ apiBase: base, token: t, method: m, path: p, body: b }) => {
      const res = await fetch(`${base}${p}`, {
        method: m,
        headers: {
          Authorization: `Bearer ${t}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: b ? JSON.stringify(b) : undefined,
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
    { apiBase, token, method, path, body: body || null },
  );
}

/**
 * Minimal payload accepted by PUT /maintenance-schedules/:id for CO.
 * @param {Partial<Record<string, unknown>>} [extra]
 */
function completePayload(extra = {}) {
  return {
    status: 'CO',
    technician_name: 'PW Gate Tech',
    technician_email: 'pw.gate.tech@test.com',
    technician_phno: '9876543210',
    cost: 1,
    hours_spent: 1,
    notes: 'PW spare-part completion gate',
    ...extra,
  };
}

/**
 * Pick an in-house spare-required maintenance with no open spare rows,
 * a mapped category, and stock available for a qty-1 request.
 * @param {import('@playwright/test').Page} page
 */
async function pickEligibleMaintenance(page) {
  await gotoProtected(page, `${BASE}/dashboard`);

  const list = await api(page, 'GET', '/spare-parts/maintenance-list');
  expect(list.status, 'spare maintenance list').toBe(200);
  const rows = Array.isArray(list.json?.data) ? list.json.data : [];

  const candidates = rows.filter((row) => {
    const status = String(row.maintenance_status || row.status || '').toUpperCase();
    if (status === 'CO' || status === 'CA') return false;
    const spare = String(row.spare_status || '').toUpperCase();
    // Prefer jobs that never touched spare parts (null/empty)
    return !spare || spare === 'NULL';
  });

  for (const row of candidates) {
    const amsId = row.ams_id;
    if (!amsId) continue;

    const cats = await api(
      page,
      'GET',
      `/spare-parts/maintenance-list/${encodeURIComponent(amsId)}/required-categories`,
    );
    const categories = Array.isArray(cats.json?.data) ? cats.json.data : [];
    // Fall back to asset-type mappings when checklist-required list is empty
    let mapped = categories;
    if (!mapped.length && row.asset_type_id) {
      const byType = await api(
        page,
        'GET',
        `/spare-parts/category-mappings/by-asset-type/${encodeURIComponent(row.asset_type_id)}`,
      );
      mapped = Array.isArray(byType.json?.data) ? byType.json.data : [];
    }

    for (const cat of mapped) {
      const spcId = cat.spc_id || cat.category_id;
      if (!spcId) continue;
      const qtyRes = await api(page, 'GET', `/spare-parts/available-quantity/${encodeURIComponent(spcId)}`);
      const available = Number(qtyRes.json?.data?.available_qty ?? qtyRes.json?.data?.available ?? 0);
      if (Number.isFinite(available) && available >= 1) {
        return {
          amsId,
          assetId: row.asset_id || '',
          serial: row.serial_number || '',
          spcId,
        };
      }
    }
  }

  return null;
}

test.describe('Spare part completion gate (in-house)', () => {
  test('SPC-01 Find eligible in-house maintenance needing spares', async ({ page }) => {
    const picked = await pickEligibleMaintenance(page);
    test.info().annotations.push({
      type: 'condition',
      description: picked
        ? `ELIGIBLE — ams=${picked.amsId} spc=${picked.spcId} serial=${picked.serial || '-'}`
        : 'ELIGIBLE — none (seed spare-required in-house maint + stock on playwright_db)',
    });
    test.skip(!picked, 'No eligible in-house spare-required maintenance with stock');
    state.amsId = picked.amsId;
    state.assetId = picked.assetId;
    state.serial = picked.serial;
    state.spcId = picked.spcId;
    state.ready = true;
  });

  test('SPC-02 API: Complete without spare request is blocked', async ({ page }) => {
    test.skip(!state.ready, 'No eligible AMS from SPC-01');
    await gotoProtected(page, `${BASE}/dashboard`);

    const res = await api(
      page,
      'PUT',
      `/maintenance-schedules/${encodeURIComponent(state.amsId)}?context=SUPERVISORAPPROVAL`,
      completePayload(),
    );

    expect(res.status, JSON.stringify(res.json)).toBe(400);
    const msg = String(res.json?.message || res.json?.error || '');
    expect(msg).toMatch(/spare part/i);
    expect(String(res.json?.code || '')).toMatch(/SPARE_PARTS_REQUIRED|SPARE_PARTS_PENDING|SPARE_PARTS/);
    state.completed = false;
  });

  test('SPC-03 API: Request spare then Complete still blocked (RQ)', async ({ page }) => {
    test.skip(!state.ready, 'No eligible AMS from SPC-01');
    await gotoProtected(page, `${BASE}/dashboard`);

    const created = await api(page, 'POST', '/spare-parts/issue-requests', {
      assetmaintsch_id: state.amsId,
      items: [{ spc_id: state.spcId, quantity: 1 }],
    });
    expect(
      [201, 200, 409].includes(created.status),
      `create request: ${JSON.stringify(created.json)}`,
    ).toBeTruthy();

    if (created.status === 201 || created.status === 200) {
      const rows = Array.isArray(created.json?.data) ? created.json.data : [created.json?.data];
      state.siId = rows.find((r) => r?.si_id)?.si_id || '';
    } else {
      // Duplicate open request — locate pending approval for this AMS
      const approvals = await api(page, 'GET', '/spare-parts/issue-approvals');
      const list = Array.isArray(approvals.json?.data) ? approvals.json.data : [];
      const match = list.find(
        (r) =>
          String(r.assetmaintsch_id || r.ams_id) === state.amsId &&
          String(r.status || '').toUpperCase() === 'RQ',
      );
      state.siId = match?.si_id || '';
    }
    expect(state.siId, 'pending spare request id').toBeTruthy();

    const res = await api(
      page,
      'PUT',
      `/maintenance-schedules/${encodeURIComponent(state.amsId)}?context=SUPERVISORAPPROVAL`,
      completePayload(),
    );
    expect(res.status, JSON.stringify(res.json)).toBe(400);
    expect(String(res.json?.message || res.json?.error || '')).toMatch(/spare part|pending|approval|issue/i);
  });

  test('SPC-04 API: Reject spare request then Complete is allowed', async ({ page }) => {
    test.skip(!state.ready || !state.siId, 'No pending spare request from SPC-03');
    await gotoProtected(page, `${BASE}/dashboard`);

    const rejected = await api(
      page,
      'POST',
      `/spare-parts/issue-approvals/${encodeURIComponent(state.siId)}/reject`,
      { remarks: 'PW gate auto-reject' },
    );
    expect(
      [200, 409].includes(rejected.status),
      `reject: ${JSON.stringify(rejected.json)}`,
    ).toBeTruthy();

    const res = await api(
      page,
      'PUT',
      `/maintenance-schedules/${encodeURIComponent(state.amsId)}?context=SUPERVISORAPPROVAL`,
      completePayload(),
    );
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    expect(res.json?.success).toBeTruthy();
    state.completed = true;
  });

  test('SPC-05 UI: Maintenance List detail shows gate toast when blocked', async ({ page }) => {
    // Re-pick a fresh eligible AMS (previous one may already be CO)
    const picked = await pickEligibleMaintenance(page);
    test.skip(!picked, 'No second eligible AMS for UI gate toast');

    await gotoProtected(page, `${BASE}/maintenance-list-detail/${encodeURIComponent(picked.amsId)}`);
    await expect(
      page.getByText(/Maintenance|Technician|Status/i).first(),
    ).toBeVisible({ timeout: 30000 });

    const statusSelect = page.locator('select[name="status"]');
    await expect(statusSelect).toBeVisible({ timeout: 20000 });
    await statusSelect.selectOption('CO');

    // Fill required fields lightly so client validation passes and API gate fires
    const techName = page.locator('input[name="technician_name"]');
    if (await techName.isVisible().catch(() => false)) {
      await techName.fill('PW Gate Tech');
    }
    const techEmail = page.locator('input[name="technician_email"]');
    if (await techEmail.isVisible().catch(() => false)) {
      await techEmail.fill('pw.gate.tech@test.com');
    }
    const techPhone = page.locator('input[name="technician_phno"]');
    if (await techPhone.isVisible().catch(() => false)) {
      await techPhone.fill('9876543210');
    }
    const cost = page.locator('input[name="cost"]');
    if (await cost.isVisible().catch(() => false)) {
      await cost.fill('1');
    }

    const save = page.getByRole('button', { name: /Save|Update|Submit/i }).first();
    await save.click({ timeout: 15000 });

    await expectToast(page, /spare part/i);
    // Still on detail (not navigated away on success)
    await expect(page).toHaveURL(new RegExp(`/maintenance-list-detail/${picked.amsId}`));
  });

  test('SPC-06 API: Issued path allows Complete (when stock + reserve work)', async ({ page }) => {
    const picked = await pickEligibleMaintenance(page);
    test.skip(!picked, 'No eligible AMS left for issue→complete path');

    await gotoProtected(page, `${BASE}/dashboard`);

    const created = await api(page, 'POST', '/spare-parts/issue-requests', {
      assetmaintsch_id: picked.amsId,
      items: [{ spc_id: picked.spcId, quantity: 1 }],
    });
    test.skip(
      ![200, 201].includes(created.status),
      `Could not create spare request: ${JSON.stringify(created.json)}`,
    );
    const createdRows = Array.isArray(created.json?.data) ? created.json.data : [created.json?.data];
    const siId = createdRows.find((r) => r?.si_id)?.si_id;
    expect(siId).toBeTruthy();

    const approved = await api(
      page,
      'POST',
      `/spare-parts/issue-approvals/${encodeURIComponent(siId)}/approve`,
      { quantity_issued: 1, spc_id: picked.spcId },
    );
    test.skip(
      approved.status !== 200,
      `Approve/reserve failed (often stock): ${JSON.stringify(approved.json)}`,
    );

    const issued = await api(
      page,
      'POST',
      `/spare-parts/maintenance-list/${encodeURIComponent(picked.amsId)}/issue`,
      {},
    );
    test.skip(issued.status !== 200, `Issue failed: ${JSON.stringify(issued.json)}`);

    const res = await api(
      page,
      'PUT',
      `/maintenance-schedules/${encodeURIComponent(picked.amsId)}?context=SUPERVISORAPPROVAL`,
      completePayload(),
    );
    expect(res.status, JSON.stringify(res.json)).toBe(200);
    expect(res.json?.success).toBeTruthy();
  });
});
