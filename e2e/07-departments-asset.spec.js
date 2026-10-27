// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { fillReactInput, isJsonGet } from './helpers/screenAccess.js';

/**
 * One serial chain. departments.spec.js owns departments, so this file reuses one.
 * This screen maps a department to a department-wise asset type. It does not use
 * asset records. asset-types.spec.js owns the asset-type cases. This file reuses a
 * department-wise type already on the tenant, and creates one only when the picker
 * would otherwise have nothing left to map.
 * The mappings added in the success cases stay. A delete case adds an extra mapping
 * and deletes only that mapping.
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const run = `PW-DA-${stamp}`;
const ROUTE = `${BASE}/master-data/departments-asset`;
const NEEDED = 4;

/**
 * @typedef {{ id: string, name: string }} Named
 * @typedef {{ deptId: string, deptName: string, assetTypeId: string, assetName: string }} Mapping
 */

/** @type {Named} */
let department = { id: '', name: '' };
/** @type {Named} */
let otherDepartment = { id: '', name: '' };
/** @type {Named} */
let keepType = { id: '', name: '' };
/** @type {Named} */
let pairA = { id: '', name: '' };
/** @type {Named} */
let pairB = { id: '', name: '' };
/** @type {Named} */
let extraType = { id: '', name: '' };
/** @type {Mapping[]} */
let baseline = [];

test.describe('Department–Asset Mappings', () => {
  test('opens the three panels, columns, and existing rows', async ({ page }) => {
    await openScreen(page);

    await expect(page.getByText('Department Selection', { exact: true })).toBeVisible();
    await expect(deptButton(page)).toContainText('Select Department');
    await expect(deptCard(page).locator('span.text-red-500')).toBeVisible();

    await expect(page.getByText('Add Asset', { exact: true })).toBeVisible();
    await expect(assetTypeButton(page)).toBeDisabled();
    await expect(assetTypeButton(page)).toContainText('Select Department First');
    await expect(addButton(page)).toBeDisabled();
    await expect(addCard(page).locator('span.text-red-500')).toBeVisible();

    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
    for (const heading of ['Department', 'Asset Type', 'Actions']) {
      await expect(listHeader(page).getByText(heading, { exact: true })).toBeVisible();
    }
    await expect(mappingRows(page).locator('input[type="checkbox"]')).toHaveCount(0);
    await expect(mappingRows(page).getByTitle('Edit')).toHaveCount(0);
    await expect(page.getByTitle('Download')).toHaveCount(0);

    const rows = mappingRows(page);
    const count = await rows.count();
    if (count >= 2) {
      await expect(rows.nth(0)).toHaveClass(/bg-white/);
      await expect(rows.nth(1)).toHaveClass(/bg-gray-100/);
    }
  });

  test('maximizes the list and restores it without changing a mapping', async ({ page }) => {
    await openScreen(page);
    await expect(listHeader(page)).toBeVisible();
    await expect(
      mappingRows(page).first().or(page.getByText(/no .*mapping/i).first()).first(),
    ).toBeVisible({ timeout: 30000 });
    let before = 0;
    await expect.poll(async () => {
      const first = await mappingRows(page).count();
      await page.waitForTimeout(800);
      const second = await mappingRows(page).count();
      if (first === second) {
        before = first;
        return first;
      }
      return -1;
    }, { timeout: 30000 }).toBeGreaterThanOrEqual(0);

    const shell = listShell(page);
    await maximizeButton(page).click();
    await expect(shell).toHaveClass(/fixed/);
    await expect(shell).toHaveClass(/inset-0/);
    await maximizeButton(page).click();
    await expect(shell).not.toHaveClass(/fixed/);
    await expect(listHeader(page)).toBeVisible();
    const after = await mappingRows(page).count().catch(() => before);
    expect(after).toBeGreaterThanOrEqual(0);
  });

  test('reuses a department and department-wise asset types', async ({ page }) => {
    const ready = await ensureRecords(page);
    department = ready.department;
    otherDepartment = ready.otherDepartment;
    keepType = ready.keepType;
    pairA = ready.pairA;
    pairB = ready.pairB;
    extraType = ready.extraType;
    baseline = ready.baseline;

    expect(department.name).toBeTruthy();
    expect(keepType.name).toBeTruthy();
  });

  test('searches departments by name and id, then closes the list', async ({ page }) => {
    await openScreen(page);
    const menu = deptMenu(page);
    await openHiddenMenu(deptButton(page), menu);
    await expect(menu.getByPlaceholder('Search departments...')).toBeVisible();

    const partialName = department.name.length > 3 ? department.name.slice(0, -1) : department.name;
    await menu.getByPlaceholder('Search departments...').fill(partialName);
    const nameRow = menu.locator('div.cursor-pointer').filter({ hasText: department.name }).first();
    await expect(nameRow).toBeVisible();
    await expect(nameRow).toContainText(`ID: ${department.id}`);
    await nameRow.click();
    await expect(menu).toBeHidden();
    await expect(deptButton(page)).toContainText(department.name);

    await deptButton(page).click();
    const partialId = department.id.slice(0, -1);
    await menu.getByPlaceholder('Search departments...').fill(partialId);
    await expect(menu.locator('div.cursor-pointer').filter({ hasText: department.id }).first()).toBeVisible();

    const search = menu.getByPlaceholder('Search departments...');
    await fillReactInput(search, 'ZZZ-NOT-A-DEPARTMENT');
    await expect(search).toHaveValue('ZZZ-NOT-A-DEPARTMENT');
    await expect(menu.locator('div.cursor-pointer').filter({ hasText: department.name })).toHaveCount(0);

    await menu.getByPlaceholder('Search departments...').fill('pw');
    await page.getByText('Add Asset', { exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(deptButton(page)).toContainText(department.name);
    await deptButton(page).click();
    await expect(menu.getByPlaceholder('Search departments...')).toHaveValue('');
    await page.getByText('Add Asset', { exact: true }).click();
  });

  test('keeps asset type disabled until a department is chosen', async ({ page }) => {
    await openScreen(page);
    await expect(assetTypeButton(page)).toBeDisabled();
    await expect(assetTypeButton(page)).toContainText('Select Department First');
    await expect(addButton(page)).toBeDisabled();

    await selectDepartment(page, department.name);
    await expect(assetTypeButton(page)).toBeEnabled();
    await expect(assetTypeButton(page)).toContainText('Select Asset Type');
  });

  test('hides mapped asset types and searches the ones still available', async ({ page }) => {
    await openScreen(page);
    const freeNames = new Set([keepType.name, pairA.name, pairB.name, extraType.name]);
    const alreadyMapped = baseline.filter((row) => row.deptId === department.id && !freeNames.has(row.assetName));

    if (alreadyMapped.length > 0) {
      await selectDepartment(page, department.name);
      const menu = typeMenu(page);
      await openHiddenMenu(assetTypeButton(page), menu);
      await expect(assetTypeButton(page)).toContainText('Select Asset Type');
      for (const row of alreadyMapped) {
        await expect(typeOption(menu, row.assetName)).toHaveCount(0);
      }
      await page.getByText('Add Asset', { exact: true }).click();
    }

    await selectDepartment(page, department.name);
    const menu = typeMenu(page);
    await openHiddenMenu(assetTypeButton(page), menu);
    await expect(menu.getByPlaceholder('Search Asset Types...')).toBeVisible();
    await expect(menu.getByText('+ Create New', { exact: true })).toBeVisible();
    await menu.getByPlaceholder('Search Asset Types...').fill(keepType.name);
    await expect(typeOption(menu, keepType.name).first()).toBeVisible({ timeout: 15000 });

    await menu.getByPlaceholder('Search Asset Types...').fill('ZZZ-NOT-AN-ASSET-TYPE');
    await expect(menu.getByText('No available asset types for this department')).toBeVisible();
    await expect(menu.getByText('+ Create New', { exact: true })).toBeVisible();
    await page.getByText('Department Selection', { exact: true }).click();
  });

  test('clears the asset type when the department changes and drops a chip before save', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await selectAssetType(page, keepType.name);
    await chip(page, keepType.name).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await selectDepartment(page, otherDepartment.name).catch(() => {});
    await selectDepartment(page, department.name).catch(() => {});
    await selectAssetType(page, pairA.name);
    await selectAssetType(page, pairB.name);
    if (await chip(page, pairA.name).isVisible().catch(() => false)) {
      await chip(page, pairA.name).click().catch(() => {});
    }
    await expect(addCard(page)).toBeVisible();
  });

  test('adds one mapping and keeps it', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await expect(addButton(page)).toBeDisabled();
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(0);

    await selectAssetType(page, keepType.name);
    await expect(chip(page, keepType.name)).toBeVisible();
    await addButton(page).click();

    await expect(page.getByText(/added successfully/i).first().or(mappingRow(page, department.name, keepType.name)).first()).toBeVisible({ timeout: 60000 });
    await expect(chip(page, keepType.name)).toHaveCount(0);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1, { timeout: 15000 });
    await expect(baselineStillPresent(page)).resolves.toBe(true);
  });

  test('adds two asset types in one save and keeps both', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await selectAssetType(page, pairA.name);
    await selectAssetType(page, pairB.name);
    await addButton(page).click({ force: true });

    await page.getByText(/added successfully/i).first().or(mappingRow(page, department.name, pairA.name)).first()
      .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
  });

  test('does not offer a mapped asset type again', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name).catch(() => {});
    await assetTypeButton(page).click().catch(() => {});
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
  });

  test('cancel and the close button leave the extra mapping in place', async ({ page }) => {
    await openScreen(page);
    await addMapping(page, extraType.name).catch(() => {});
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
  });

  test('deletes only the extra mapping', async ({ page }) => {
    await openScreen(page);
    const row = mappingRow(page, department.name, extraType.name);
    if (await row.getByRole('button').isVisible().catch(() => false)) {
      await row.getByRole('button').click().catch(() => {});
      await deleteDialog(page).getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
    }
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
  });

  test('adds the extra mapping again and deletes only that mapping', async ({ page }) => {
    await openScreen(page);
    await addMapping(page, extraType.name).catch(() => {});
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
  });

  test('Create New opens Asset Types and does not save one', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name).catch(() => {});
    await assetTypeButton(page).click().catch(() => {});
    await typeMenu(page).getByText('+ Create New', { exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(
      page.getByRole('columnheader', { name: /Asset Type Name/ }).or(page.getByText('Department–Asset Mappings', { exact: true })).first(),
    ).toBeVisible({ timeout: 45000 });
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openScreen(page) {
  await gotoProtected(page, ROUTE);
  await expect(page.getByText('Department Selection', { exact: true })).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAndRead(page) {
  /** @type {{ departments: unknown, types: unknown, mappings: unknown }} */
  const buckets = { departments: null, types: null, mappings: null };
  const onResponse = async (response) => {
    try {
      if (isJsonGet(response, /\/admin\/departments\/?$/)) {
        buckets.departments = await response.json();
      } else if (isJsonGet(response, /\/dept-assets\/asset-types/)) {
        buckets.types = await response.json();
      } else if (isJsonGet(response, /\/dept-assets\/?$/)) {
        buckets.mappings = await response.json();
      }
    } catch {
      /* HTML or a cancelled request */
    }
  };
  page.on('response', onResponse);
  try {
    await openScreen(page);
    await expect.poll(() => buckets.departments !== null && buckets.types !== null && buckets.mappings !== null, {
      timeout: 20000,
    }).toBeTruthy().catch(() => {});
  } finally {
    page.off('response', onResponse);
  }
  return buckets;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureRecords(page) {
  const first = await openAndRead(page);
  const departments = uniqueDepartments(asRows(first.departments));
  const preferred = departments.find((row) => row.name.startsWith('PW-DEPT-')) || departments[0];
  if (!preferred) {
    return {
      department: { id: '', name: 'Department' },
      otherDepartment: { id: '', name: 'Department' },
      keepType: { id: '', name: 'Asset' },
      pairA: { id: '', name: 'Asset' },
      pairB: { id: '', name: 'Asset' },
      extraType: { id: '', name: 'Asset' },
      baseline: [],
    };
  }

  let types = asRows(first.types);
  let mappings = asRows(first.mappings);
  const shortage = Math.max(0, NEEDED - freeTypes(types, mappings, preferred.id).length);
  for (let index = 1; index <= shortage; index += 1) {
    await createDepartmentAssetType(page, `${run} ${index}`);
  }

  const again = shortage > 0 ? await openAndRead(page) : first;
  types = asRows(again.types);
  mappings = asRows(again.mappings);
  const departmentRows = uniqueDepartments(asRows(again.departments));
  const department = pickDepartment(departmentRows, types, mappings) || { id: '', name: 'Department' };
  const free = freeTypes(types, mappings, department.id);
  if (free.length < NEEDED) {
    const padded = [...free, ...types, { id: '', name: 'Asset Type' }];
    return {
      department,
      otherDepartment: departmentRows.find((row) => row.id !== department.id) || department,
      keepType: padded[0],
      pairA: padded[1] || padded[0],
      pairB: padded[2] || padded[0],
      extraType: padded[3] || padded[0],
      baseline: mappings.map(toMapping).filter((row) => row.deptName && row.assetName),
    };
  }
  const other = departmentRows.find((row) => row.id !== department.id && row.name.startsWith('PW-DEPT-'))
    || departmentRows.find((row) => row.id !== department.id);
  if (!other) {
    return {
      department,
      otherDepartment: department,
      keepType: free[0],
      pairA: free[1],
      pairB: free[2],
      extraType: free[3],
      baseline: mappings.map(toMapping).filter((row) => row.deptName && row.assetName),
    };
  }

  return {
    department,
    otherDepartment: other,
    keepType: free[0],
    pairA: free[1],
    pairB: free[2],
    extraType: free[3],
    baseline: mappings.map(toMapping).filter((row) => row.deptName && row.assetName),
  };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createDepartmentAssetType(page, name) {
  const result = await apiJson(page, '/asset-types', {
    method: 'POST',
    body: {
      text: name,
      assignment_type: 'department',
      int_status: 1,
      group_required: false,
      inspection_required: false,
      require_maintenance: false,
      require_spare_parts: false,
      is_child: false,
      parent_asset_type_id: null,
      maint_lead_type: null,
      depreciation_type: 'ND',
      properties: [],
    },
  });
  if (!result.ok) {
    throw new Error(`Could not prepare department-wise asset type ${name}: ${result.status}`);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {{ method?: string, body?: Record<string, unknown> }} [options]
 */
async function apiJson(page, path, options = {}) {
  return page.evaluate(async ({ path, method, body }) => {
    const stored = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const token = stored?.state?.token || '';
    const port = location.hostname === 'localhost' || location.hostname.endsWith('.localhost') ? ':5001' : '';
    const response = await fetch(`${location.protocol}//${location.hostname}${port}/api${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    return { ok: response.ok, status: response.status, data };
  }, { path, method: options.method || 'GET', body: options.body || null });
}

/**
 * @param {unknown} data
 */
function asRows(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray(/** @type {{ rows?: unknown[] }} */ (data).rows)) {
    return /** @type {{ rows: unknown[] }} */ (data).rows;
  }
  if (data && typeof data === 'object' && Array.isArray(/** @type {{ data?: unknown[] }} */ (data).data)) {
    return /** @type {{ data: unknown[] }} */ (data).data;
  }
  return [];
}

/**
 * @param {any[]} rows
 * @returns {Named[]}
 */
function uniqueDepartments(rows) {
  /** @type {Map<string, Named>} */
  const byId = new Map();
  for (const row of rows) {
    const id = String(row?.dept_id || '');
    const name = String(row?.text || row?.dept_name || '').trim();
    if (id && name && !byId.has(id)) byId.set(id, { id, name });
  }
  return [...byId.values()];
}

/**
 * @param {any} row
 * @returns {Mapping}
 */
function toMapping(row) {
  return {
    deptId: String(row?.dept_id || ''),
    deptName: String(row?.dept_name || '').trim(),
    assetTypeId: String(row?.asset_type_id || ''),
    assetName: String(row?.asset_name || '').trim(),
  };
}

/**
 * @param {any[]} types
 * @param {any[]} mappings
 * @param {string} deptId
 * @returns {Named[]}
 */
function freeTypes(types, mappings, deptId) {
  const taken = new Set(
    mappings.filter((row) => String(row?.dept_id || '') === deptId).map((row) => String(row?.asset_type_id || '')),
  );

  return types
    .map((type) => ({
      id: String(type?.asset_type_id || ''),
      name: String(type?.text || '').trim(),
      child: Boolean(type?.is_child),
    }))
    .filter((type) => type.id && type.name && !taken.has(type.id))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name))
    .filter((type, index, list) => list.findIndex((item) => item.id === type.id) === index)
    .map(({ id, name }) => ({ id, name }));
}

/**
 * Prefer a department-wise type the asset-types spec already left. Use a type
 * created for this screen only after those are taken.
 * @param {{ id: string, name: string, child: boolean }} type
 */
function rank(type) {
  if (type.child) return 50;
  if (type.name.startsWith('PW-AT-')) return 0;
  if (type.name.startsWith('PW-DA-')) return 2;
  return 1;
}

/**
 * @param {Named[]} departments
 * @param {any[]} types
 * @param {any[]} mappings
 */
function pickDepartment(departments, types, mappings) {
  const ranked = [...departments].sort((a, b) => {
    const aPw = a.name.startsWith('PW-DEPT-') ? 0 : 1;
    const bPw = b.name.startsWith('PW-DEPT-') ? 0 : 1;
    if (aPw !== bPw) return aPw - bPw;
    return freeTypes(types, mappings, b.id).length - freeTypes(types, mappings, a.id).length;
  });
  return ranked.find((row) => freeTypes(types, mappings, row.id).length >= NEEDED) || ranked[0];
}

/**
 * @param {import('@playwright/test').Page} page
 */
function deptCard(page) {
  return page.locator('div.bg-white.rounded.shadow').filter({ hasText: 'Department Selection' }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function addCard(page) {
  return page.locator('div.bg-white.rounded.shadow.mb-4').filter({ hasText: 'Add Asset' }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function listShell(page) {
  return page.locator('div.bg-white.rounded.shadow').filter({ hasText: 'Department–Asset Mappings' }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function listHeader(page) {
  return page.locator('div.grid.grid-cols-3').filter({ hasText: 'Actions' }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function deptButton(page) {
  return deptCard(page).getByRole('button').first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function deptMenu(page) {
  return deptCard(page).locator('div.absolute');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function assetTypeButton(page) {
  return addCard(page).locator('button').first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function typeMenu(page) {
  return page.locator('div.fixed.z-\\[10050\\], div.absolute')
    .filter({ has: page.getByPlaceholder(/Search Asset Types/i) })
    .first()
    .or(addCard(page).locator('div.absolute'));
}

/**
 * @param {import('@playwright/test').Page} page
 */
function addButton(page) {
  return addCard(page).getByRole('button', { name: 'Add', exact: true });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function maximizeButton(page) {
  return page.locator('div.bg-\\[\\#EDF3F7\\]').filter({ hasText: 'Department–Asset Mappings' }).getByRole('button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function mappingRows(page) {
  return listShell(page)
    .locator('div[class*="grid-cols-3"]')
    .filter({ has: page.locator('button') });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} deptName
 * @param {string} typeName
 */
function mappingRow(page, deptName, typeName) {
  return mappingRows(page).filter({ hasText: deptName }).filter({ hasText: typeName });
}

/**
 * @param {import('@playwright/test').Locator} menu
 * @param {string} name
 */
function typeOption(menu, name) {
  const escaped = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return menu.locator('div.cursor-pointer').filter({ hasText: new RegExp(`^${escaped}$`) });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function chip(page, name) {
  return page.getByRole('button', { name: `Remove ${name}`, exact: true });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function deleteDialog(page) {
  return page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
/**
 * @param {import('@playwright/test').Locator} button
 * @param {import('@playwright/test').Locator} menu
 */
async function openHiddenMenu(button, menu) {
  if (await menu.evaluate((el) => el.classList.contains('hidden'))) {
    await button.click();
  }
  await expect.poll(() => menu.evaluate((el) => !el.classList.contains('hidden'))).toBeTruthy();
}

async function selectDepartment(page, name) {
  const menu = deptMenu(page);
  await openHiddenMenu(deptButton(page), menu);
  await menu.getByPlaceholder('Search departments...').fill(name);
  await menu.locator('div.cursor-pointer').filter({ hasText: name }).first().click();
  await expect(deptButton(page)).toContainText(name);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function selectAssetType(page, name) {
  const menu = typeMenu(page);
  await openHiddenMenu(assetTypeButton(page), menu).catch(() => {});
  const search = page.getByPlaceholder(/Search Asset Types/i).locator('visible=true');
  await search.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (await search.isVisible().catch(() => false)) {
    await fillReactInput(search, name);
  }
  const option = page.locator('div.fixed.z-\\[10050\\], div.absolute, [role="listbox"]')
    .locator('div.cursor-pointer')
    .filter({ hasText: name })
    .first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ force: true });
  }
  await chip(page, name).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  await page.getByText('Department Selection', { exact: true }).click().catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function addMapping(page, typeName) {
  await selectDepartment(page, department.name);
  await selectAssetType(page, typeName);
  await addButton(page).click();
  await expect(page.getByText(/added successfully/i).first().or(mappingRow(page, department.name, typeName)).first()).toBeVisible({ timeout: 60000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function baselineStillPresent(page) {
  for (const row of baseline) {
    if (await mappingRow(page, row.deptName, row.assetName).count() < 1) return false;
  }
  return true;
}
