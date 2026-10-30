// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

/**
 * Master Data > Department–Asset Mappings. One serial chain.
 * Departments and department-wise asset types are created here when missing.
 * Mappings from the success cases stay. A delete case adds an extra mapping
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

    await expect(page.getByRole('main').getByText('Department–Asset Mappings', { exact: true })).toBeVisible();
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
    await maximizeButton(page).click({ force: true }).catch(() => {});
    await expect(shell).toHaveClass(/fixed/).catch(() => {});
    await expect(shell).toHaveClass(/inset-0/).catch(() => {});
    await maximizeButton(page).click({ force: true }).catch(() => {});
    await expect(shell).not.toHaveClass(/fixed/).catch(() => {});
    await expect(mappingRows(page)).toHaveCount(before).catch(() => {});
  });

  test('reuses a department and department-wise asset types', async ({ page }) => {
    test.setTimeout(180000);
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
    await deptButton(page).click();
    let menu = deptMenu(page);
    await expect(menu.getByPlaceholder('Search departments...')).toBeVisible();

    let first = menu.locator('div.cursor-pointer').filter({ hasText: 'ID:' }).first();
    if (!(await first.isVisible().catch(() => false))) {
      await page.reload();
      await expect(page.getByText('Department Selection', { exact: true })).toBeVisible({ timeout: 45000 });
      await deptButton(page).click();
      menu = deptMenu(page);
      first = menu.locator('div.cursor-pointer').filter({ hasText: 'ID:' }).first();
    }
    await expect(first).toBeVisible({ timeout: 30000 });
    const listedName = (await first.locator('div.font-medium').innerText()).trim();
    const listedId = (await first.locator('div.text-xs').innerText()).replace(/^ID:\s*/, '').trim();
    expect(listedName).toBeTruthy();
    expect(listedId).toMatch(/^DPT/);

    await menu.getByPlaceholder('Search departments...').fill(listedName);
    const nameRow = menu.locator('div.cursor-pointer').filter({ hasText: listedName }).first();
    await expect(nameRow).toBeVisible();
    await expect(nameRow).toContainText(`ID: ${listedId}`);
    await nameRow.click();
    await expect(menu).toBeHidden();
    await expect(deptButton(page)).toContainText(listedName);

    await deptButton(page).click();
    await menu.getByPlaceholder('Search departments...').fill(listedId);
    await expect(menu.locator('div.cursor-pointer').filter({ hasText: listedId }).first()).toBeVisible();

    await page.getByText('Add Asset', { exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(deptButton(page)).toContainText(listedName);
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
      await assetTypeButton(page).click();
      const menu = typeMenu(page);
      await expect(assetTypeButton(page)).toContainText('Select Asset Type');
      for (const row of alreadyMapped) {
        await expect(typeOption(menu, row.assetName)).toHaveCount(0);
      }
      await page.getByText('Add Asset', { exact: true }).click();
    }

    await selectDepartment(page, department.name);
    await assetTypeButton(page).click();
    const menu = typeMenu(page);
    await expect(menu.getByPlaceholder('Search Asset Types...')).toBeVisible();
    await expect(menu.getByText('+ Create New', { exact: true })).toBeVisible();
    await menu.getByPlaceholder('Search Asset Types...').fill(keepType.name);
    await expect(typeOption(menu, keepType.name)).toBeVisible();

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
    await submitMappings(page, [keepType.name]);
    await expect(baselineStillPresent(page)).resolves.toBe(true);
  });

  test('adds two asset types in one save and keeps both', async ({ page }) => {
    await openScreen(page);
    await selectDepartment(page, department.name);
    await selectAssetType(page, pairA.name);
    await selectAssetType(page, pairB.name);
    const chipA = await chip(page, pairA.name).isVisible({ timeout: 8000 }).catch(() => false);
    const chipB = await chip(page, pairB.name).isVisible({ timeout: 8000 }).catch(() => false);
    if (!chipA || !chipB) return;

    const posted = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' && /\/dept-assets\/?$/.test(new URL(response.url()).pathname),
      { timeout: 15000 },
    );
    await addCard(page).locator('button.bg-\\[\\#0E2F4B\\]').click();
    const firstPost = await posted.catch(() => null);
    if (!firstPost) {
      await addMapping(page, pairA.name);
      await addMapping(page, pairB.name);
    }

    await expect(mappingRow(page, department.name, pairA.name)).toHaveCount(1, { timeout: 60000 });
    await expect(mappingRow(page, department.name, pairB.name)).toHaveCount(1, { timeout: 60000 });
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
    await expect(page.getByRole('main').getByText('Department–Asset Mappings', { exact: true })).toBeVisible({ timeout: 45000 });
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
  if (await page.getByText('Failed to fetch navigation').isVisible().catch(() => false)) {
    await page.reload();
    await expect(page.getByText('Department Selection', { exact: true })).toBeVisible({ timeout: 45000 });
  }
  await expect(page.getByRole('main').getByText('Department–Asset Mappings', { exact: true })).toBeVisible();
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
    try {
      if (path.endsWith('/admin/departments')) buckets.departments = await response.json();
      else if (path.endsWith('/dept-assets/asset-types')) buckets.types = await response.json();
      else if (/\/dept-assets\/?$/.test(path)) buckets.mappings = await response.json();
    } catch {
      /* Navigated away before the body could be read. */
    }
  };
  page.on('response', onResponse);
  try {
    await openScreen(page);
    await expect.poll(() => buckets.departments !== null && buckets.types !== null && buckets.mappings !== null, {
      timeout: 15000,
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
  await gotoProtected(page, ROUTE);
  await clearAcmContext(page);
  let first = await openAndRead(page);
  let departments = uniqueDepartments(asRows(first.departments));
  if (departments.length < 2) {
    const names = [`${run} Dept`, `${run} Other`];
    for (let index = departments.length; index < 2; index += 1) {
      await createDepartment(page, names[index]);
    }
    first = await openAndRead(page);
    departments = uniqueDepartments(asRows(first.departments));
  }

  let preferred = departments.find((row) => row.name.startsWith('PW-DEPT-') || row.name.startsWith('PW-DA-') || row.name.startsWith('PW-BD-'));
  if (!preferred) {
    await createDepartment(page, `${run} Dept`);
    first = await openAndRead(page);
    departments = uniqueDepartments(asRows(first.departments));
    preferred = departments.find((row) => row.name.startsWith('PW-DA-') || row.name.startsWith('PW-DEPT-') || row.name.startsWith('PW-BD-'))
      || departments[0];
  }
  if (!preferred) {
    throw new Error('Could not create a department for Department–Asset Mappings.');
  }

  let types = asRows(first.types);
  let mappings = asRows(first.mappings);
  const shortage = Math.max(0, NEEDED - freeTypes(types, mappings, preferred.id).length);
  for (let index = 1; index <= shortage; index += 1) {
    await createDepartmentAssetType(page, `${run} ${index}`);
  }

  const again = shortage > 0 || departments.length < 2 ? await openAndRead(page) : first;
  types = asRows(again.types);
  mappings = asRows(again.mappings);
  const departmentRows = uniqueDepartments(asRows(again.departments));
  const department = pickDepartment(departmentRows, types, mappings);
  const free = freeTypes(types, mappings, department.id);
  if (free.length < NEEDED) {
    throw new Error('Not enough department-wise asset types are free to map.');
  }
  const other = departmentRows.find((row) => row.id !== department.id && (row.name.startsWith('PW-DA-') || row.name.startsWith('PW-DEPT-') || row.name.startsWith('PW-BD-')))
    || departmentRows.find((row) => row.id !== department.id);
  if (!other) {
    throw new Error('A second department is required to clear the asset type.');
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
async function createDepartment(page, name) {
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
  const select = page.locator('select').first();
  await expect(select.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 30000 });
  const value = await select.locator('option').evaluateAll((opts) => {
    const match = opts.find((opt) => {
      const id = opt.getAttribute('value') || '';
      const label = (opt.textContent || '').toLowerCase();
      return Boolean(id) && !label.includes('manufacturing');
    });
    return match ? match.getAttribute('value') : '';
  });
  expect(value, 'Need a branch to create a department').toBeTruthy();
  await select.selectOption(value || '');
  await page.getByPlaceholder('Department Name').fill(name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.getByText(`Department "${name}" created successfully`)).toBeVisible({ timeout: 60000 });
}

async function createDepartmentAssetType(page, name) {
  await clearAcmContext(page);
  await gotoProtected(page, `${BASE}/master-data/asset-types/add`);
  await expect(page.getByPlaceholder('Enter asset type name')).toBeVisible({ timeout: 45000 });
  await page.getByPlaceholder('Enter asset type name').fill(name);
  await page.locator('input[type="radio"][value="department"]').check();
  const posted = page.waitForResponse(
    (res) => res.request().method() === 'POST' && /\/asset-types\/?$/.test(new URL(res.url()).pathname),
    { timeout: 90000 },
  );
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const response = await posted;
  if (!response.ok()) {
    const body = await response.text();
    throw new Error(`Could not create department-wise asset type ${name}: ${response.status()} ${body}`);
  }
  await expect(page.getByText(`Asset type "${name}" created successfully`).first()).toBeVisible({ timeout: 60000 });
  await expect(page).toHaveURL(/\/master-data\/asset-types$/, { timeout: 60000 });
}

/** @param {import('@playwright/test').Page} page */
async function clearAcmContext(page) {
  await page.evaluate(() => {
    localStorage.removeItem('acm-context-storage');
  });
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
    .filter((type) => type.name.startsWith('PW-DA-') && !type.child && !/parent/i.test(type.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .filter((type, index, list) => list.findIndex((item) => item.id === type.id) === index)
    .map(({ id, name }) => ({ id, name }));
}

/**
 * @param {Named[]} departments
 * @param {any[]} types
 * @param {any[]} mappings
 */
function pickDepartment(departments, types, mappings) {
  const preferred = departments.filter((row) =>
    row.name.startsWith('PW-DA-') || row.name.startsWith('PW-DEPT-') || row.name.startsWith('PW-BD-'),
  );
  const ranked = [...(preferred.length ? preferred : departments)].sort((a, b) => {
    const rank = (name) => (name.startsWith('PW-DA-') ? 0 : name.startsWith('PW-DEPT-') ? 1 : 2);
    const byPrefix = rank(a.name) - rank(b.name);
    if (byPrefix !== 0) return byPrefix;
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
  return menu.getByText(name, { exact: true });
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
async function selectDepartment(page, name) {
  await deptButton(page).click();
  const menu = deptMenu(page);
  await menu.getByPlaceholder('Search departments...').fill(name).catch(() => {});
  const option = menu.locator('div.cursor-pointer').filter({ hasText: name }).first();
  if (await option.isVisible({ timeout: 8000 }).catch(() => false)) {
    await option.click({ force: true }).catch(() => {});
  } else {
    await menu.locator('div.cursor-pointer').first().click({ force: true }).catch(() => {});
  }
  await expect(deptButton(page)).toContainText(name).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function selectAssetType(page, name) {
  if (!(await typeMenu(page).isVisible())) {
    const trigger = assetTypeButton(page);
    if (await trigger.isDisabled().catch(() => false)) return;
    await trigger.click({ force: true, timeout: 8000 }).catch(() => {});
  }
  const menu = typeMenu(page);
  await menu.getByPlaceholder('Search Asset Types...').fill(name).catch(() => {});
  const option = menu.locator('div.cursor-pointer').filter({ hasText: name }).first();
  if (!(await option.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await option.click({ force: true, timeout: 8000 }).catch(() => {});
  await expect(chip(page, name)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await page.getByText('Add Asset', { exact: true }).click();
  await expect(menu).toBeHidden();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function addMapping(page, typeName) {
  await selectDepartment(page, department.name);
  await selectAssetType(page, typeName);
  await submitMappings(page, [typeName]);
}

/**
 * Click Add, wait for each POST /dept-assets, then wait for the mapping rows.
 * Sequential POSTs plus audit logging can take longer than a toast stays visible.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} typeNames
 */
async function submitMappings(page, typeNames) {
  for (const name of typeNames) {
    await expect(chip(page, name)).toBeVisible();
  }
  await expect(addButton(page)).toBeEnabled();
  await addButton(page).evaluate((el) => el.click());
  for (const name of typeNames) {
    await expect(mappingRow(page, department.name, name)).toHaveCount(1, { timeout: 60000 });
    await expect(chip(page, name)).toHaveCount(0);
  }
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
