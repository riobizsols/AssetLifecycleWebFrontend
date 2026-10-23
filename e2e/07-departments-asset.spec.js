// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

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
    const data = await openAndRead(page);
    const before = asRows(data.mappings).length;

    const shell = listShell(page);
    await maximizeButton(page).click();
    await expect(shell).toHaveClass(/fixed/);
    await expect(shell).toHaveClass(/inset-0/);
    await maximizeButton(page).click();
    await expect(shell).not.toHaveClass(/fixed/);
    await expect(mappingRows(page)).toHaveCount(before);
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

    expect(department.id).toMatch(/^DPT/);
    expect(otherDepartment.id).toMatch(/^DPT/);
    expect(otherDepartment.id).not.toBe(department.id);
    for (const type of [keepType, pairA, pairB, extraType]) {
      expect(type.id).toMatch(/^AT/);
      expect(type.name).toBeTruthy();
    }
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

    await menu.getByPlaceholder('Search departments...').fill('ZZZ-NOT-A-DEPARTMENT');
    await expect(menu.locator('div.cursor-pointer')).toHaveCount(0);

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
    const alreadyMapped = baseline.filter((row) => row.deptId === department.id);

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
    await expect(typeOption(menu, keepType.name)).toBeVisible({ timeout: 15000 });

    await menu.getByPlaceholder('Search Asset Types...').fill('ZZZ-NOT-AN-ASSET-TYPE');
    await expect(menu.getByText('No available asset types for this department')).toBeVisible();
    await expect(menu.getByText('+ Create New', { exact: true })).toBeVisible();
    await page.getByText('Department Selection', { exact: true }).click();
  });

  test('clears the asset type when the department changes and drops a chip before save', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await selectAssetType(page, keepType.name);
    await expect(chip(page, keepType.name)).toBeVisible();
    await expect(addButton(page)).toBeEnabled();

    await selectDepartment(page, otherDepartment.name);
    await expect(chip(page, keepType.name)).toHaveCount(0);
    await expect(assetTypeButton(page)).toContainText('Select Asset Type');
    await expect(addButton(page)).toBeDisabled();
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(0);

    await selectDepartment(page, department.name);
    await selectAssetType(page, pairA.name);
    await selectAssetType(page, pairB.name);
    await expect(chip(page, pairA.name)).toBeVisible();
    await expect(chip(page, pairB.name)).toBeVisible();
    await chip(page, pairA.name).click();
    await expect(chip(page, pairA.name)).toHaveCount(0);
    await expect(chip(page, pairB.name)).toBeVisible();
    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(0);
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(0);
  });

  test('adds one mapping and keeps it', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await expect(addButton(page)).toBeDisabled();
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(0);

    await selectAssetType(page, keepType.name);
    await expect(chip(page, keepType.name)).toBeVisible();
    await addButton(page).click();

    await expect(page.getByText(`Asset mapping ${keepType.name} added successfully to ${department.name}`)).toBeVisible({ timeout: 60000 });
    await expect(chip(page, keepType.name)).toHaveCount(0);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
    await expect(baselineStillPresent(page)).resolves.toBe(true);
  });

  test('adds two asset types in one save and keeps both', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await selectAssetType(page, pairA.name);
    await selectAssetType(page, pairB.name);
    await addButton(page).click();

    await expect(page.getByText(`Asset mapping ${pairA.name}, ${pairB.name} added successfully to ${department.name}`)).toBeVisible({ timeout: 60000 });
    await expect(chip(page, pairA.name)).toHaveCount(0);
    await expect(chip(page, pairB.name)).toHaveCount(0);
    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
  });

  test('does not offer a mapped asset type again', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await assetTypeButton(page).click();
    const menu = typeMenu(page);
    await expect(typeOption(menu, keepType.name)).toHaveCount(0);
    await expect(typeOption(menu, pairA.name)).toHaveCount(0);
    await expect(typeOption(menu, pairB.name)).toHaveCount(0);
    await menu.getByPlaceholder('Search Asset Types...').fill(extraType.name);
    await expect(typeOption(menu, extraType.name)).toBeVisible();
    await page.getByText('Department Selection', { exact: true }).click();
  });

  test('cancel and the close button leave the extra mapping in place', async ({ page }) => {
    await openScreen(page);
    await addMapping(page, extraType.name);
    const row = mappingRow(page, department.name, extraType.name);
    await expect(row).toHaveCount(1);

    await row.getByRole('button').click();
    const dialog = deleteDialog(page);
    await expect(dialog.getByText('Confirm Delete', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/Do you want to delete mapping \S+\?/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(1);

    await row.getByRole('button').click();
    await deleteDialog(page).locator('button.text-yellow-400').click();
    await expect(deleteDialog(page)).toHaveCount(0);
    await expect(row).toHaveCount(1);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
  });

  test('deletes only the extra mapping', async ({ page }) => {
    await openScreen(page);
    const row = mappingRow(page, department.name, extraType.name);
    await row.getByRole('button').click();
    await deleteDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Asset mapping removed successfully')).toBeVisible({ timeout: 60000 });
    await expect(row).toHaveCount(0);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(1);
    await expect(baselineStillPresent(page)).resolves.toBe(true);
  });

  test('adds the extra mapping again and deletes only that mapping', async ({ page }) => {
    await openScreen(page);
    await addMapping(page, extraType.name);
    const row = mappingRow(page, department.name, extraType.name);
    await expect(row).toHaveCount(1);

    await row.getByRole('button').click();
    await deleteDialog(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Asset mapping removed successfully')).toBeVisible({ timeout: 60000 });
    await expect(row).toHaveCount(0);
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(1);
  });

  test('Create New opens Asset Types and does not save one', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await assetTypeButton(page).click();
    await typeMenu(page).getByText('+ Create New', { exact: true }).click();

    await expect(page).toHaveURL(/\/master-data\/asset-types$/);
    await expect(page.getByRole('columnheader', { name: 'Asset Type Name', exact: true })).toBeVisible({ timeout: 45000 });

    await page.goBack();
    await expect(page.getByText('Department–Asset Mappings', { exact: true }).first()).toBeVisible({ timeout: 45000 });
    await expect(mappingRow(page, department.name, keepType.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(1);
    await expect(mappingRow(page, department.name, extraType.name)).toHaveCount(0);
    await expect(baselineStillPresent(page)).resolves.toBe(true);
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
    if (response.request().method() !== 'GET' || !response.ok()) return;
    const path = new URL(response.url()).pathname;
    if (path.endsWith('/admin/departments')) buckets.departments = await response.json();
    else if (path.endsWith('/dept-assets/asset-types')) buckets.types = await response.json();
    else if (/\/dept-assets\/?$/.test(path)) buckets.mappings = await response.json();
  };
  page.on('response', onResponse);
  try {
    await openScreen(page);
    await expect.poll(() => buckets.departments !== null && buckets.types !== null && buckets.mappings !== null, {
      timeout: 20000,
    }).toBeTruthy();
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
    throw new Error('No department is available. departments.spec.js creates the department this screen maps.');
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
  const department = pickDepartment(departmentRows, types, mappings);
  const free = freeTypes(types, mappings, department.id);
  if (free.length < NEEDED) {
    throw new Error('Not enough department-wise asset types are free to map.');
  }
  const other = departmentRows.find((row) => row.id !== department.id && row.name.startsWith('PW-DEPT-'))
    || departmentRows.find((row) => row.id !== department.id);
  if (!other) {
    throw new Error('A second department is required to clear the asset type. departments.spec.js leaves two departments.');
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
  return addCard(page).locator('div.absolute');
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
  return page.locator('div.grid.grid-cols-3.items-center');
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
  return menu.locator('div.cursor-pointer').filter({ hasText: name }).first();
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
  await openHiddenMenu(assetTypeButton(page), menu);
  await menu.getByPlaceholder('Search Asset Types...').fill(name);
  await typeOption(menu, name).click();
  await expect(chip(page, name)).toBeVisible();
  await page.getByText('Department Selection', { exact: true }).click();
  await expect(menu).toBeHidden();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function addMapping(page, typeName) {
  await selectDepartment(page, department.name);
  await selectAssetType(page, typeName);
  await addButton(page).click();
  await expect(page.getByText(`Asset mapping ${typeName} added successfully to ${department.name}`)).toBeVisible({ timeout: 60000 });
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
