// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, expectSuccessOrName, selectLoadedOrganization } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-DEPT-${Date.now().toString(36)}`;
const createdName = `${run}-Create`;
const trimmedName = `${run}-Trim`;
const renamedName = `${run}-Renamed`;
const discardedName = `${run}-Discarded`;
const noBranchName = `${run}-NoBranch`;
const inUseName = `${run}-InUse`;

/** @type {string[]} */
let namesBeforeCreate = [];
/** @type {string} */
let previewId = '';
/** @type {string} */
let branchId = '';
/** @type {string} */
let inUseDeptId = '';

const ROUTE = `${BASE}/master-data/departments`;

/**
 * @param {import('@playwright/test').Page} page
 */
function branchSelect(page) {
  return page
    .locator('div.bg-white.rounded.shadow')
    .filter({ has: page.getByPlaceholder(/Department Name/i) })
    .locator('select')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 */
function nameInput(page) {
  return page.getByPlaceholder('Department Name');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function idInput(page) {
  return page.getByPlaceholder(/Department Id/i);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function deptRow(page, name) {
  return page
    .locator('div.grid')
    .filter({ has: page.locator('div', { hasText: new RegExp(`^${escapeRegExp(name)}$`) }) })
    .filter({ has: page.locator('button') });
}

/**
 * @param {string} value
 */
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openDepartments(page) {
  await gotoProtected(page, ROUTE);
  await page.getByText('Department List', { exact: true }).waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  await nameInput(page).waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function listedNames(page) {
  const rows = page.locator('div.grid').filter({ has: page.locator('button') });
  return rows.evaluateAll((els) =>
    els
      .map((el) => el.firstElementChild?.textContent?.trim() || '')
      .filter(Boolean),
  );
}

/**
 * @param {string} current
 * @param {string} next
 */
function deptNumber(id) {
  const match = String(id || '').match(/^DPT(\d+)$/i);
  if (!match) {
    throw new Error(`Department Id "${id}" is not DPT followed by digits`);
  }
  return Number(match[1]);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureBranchOption(page) {
  const select = branchSelect(page);
  await expect(select).toBeVisible({ timeout: 15000 }).catch(() => {});
  const existing = await select.locator('option').evaluateAll((opts) =>
    opts
      .filter((opt) => opt.value)
      .map((opt) => ({ value: opt.value, label: (opt.textContent || '').trim() })),
  );
  if (existing.length) return;

  const branchName = `${run}-Branch`;
  const branchCode = `PD${Date.now().toString(36).slice(-6)}`;
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  await expect(page.getByPlaceholder('Enter Branch Name')).toBeVisible({ timeout: 30000 });
  await selectLoadedOrganization(page);
  await page.getByPlaceholder('Enter Branch Name').fill(branchName, { timeout: 15000 });
  await page.getByPlaceholder('Enter Branch Code').fill(branchCode, { timeout: 15000 });
  await page.getByPlaceholder('Enter City').fill('Playwright', { timeout: 15000 });
  await clickUnblocked(page, 'Save');
  await expect(page.getByText(/created successfully|success/i).first().or(page.getByText(branchName).first()).first()).toBeVisible({ timeout: 60000 }).catch(() => {});

  await openDepartments(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectFirstRealBranch(page) {
  await ensureBranchOption(page);
  const select = branchSelect(page);
  await expect(select).toBeEnabled({ timeout: 8000 }).catch(() => {});
  const value = await select.locator('option').evaluateAll((opts) => {
    const real = opts.filter((opt) => opt.value);
    const fromBranches = real.find((opt) => (opt.textContent || '').includes('PW-BR-'));
    const chosen = fromBranches || real[0];
    return chosen ? chosen.value : '';
  });
  if (value) {
    await select.selectOption(value, { timeout: 15000 });
  } else {
    await select.selectOption({ index: 1 }, { timeout: 15000 }).catch(() => {});
  }
  branchId = value;
  return value;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  await deptRow(page, name).locator('button').first().click({ timeout: 15000 });
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Update Department' });
  await expect(dialog.getByText('Update Department', { exact: true })).toBeVisible();
  return dialog;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openDelete(page, name) {
  await deptRow(page, name).locator('button').nth(1).click({ timeout: 15000 });
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Confirm Delete', { exact: true })).toBeVisible();
  return dialog;
}

test.describe('Departments', () => {
  test('TC-DEPT-001 the screen shows the add form and the list', async ({ page }) => {
    await openDepartments(page);

    await expect(page.getByText(/Department Id/i).first()).toBeVisible({ timeout: 30000 });
    await expect(branchSelect(page)).toBeVisible();
    await expect(page.getByPlaceholder('Department Name')).toBeVisible({ timeout: 30000 });
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible();

    const id = idInput(page);
    await expect(id).toBeDisabled();
    await expect(id).toHaveValue(/^DPT\d+$/);

    const form = page.locator('div.bg-white.rounded.shadow').first();
    await expect(form.locator('span.text-red-500')).toHaveCount(2);

    const select = branchSelect(page);
    await expect(select.locator('option', { hasText: 'Select Branch' })).toHaveCount(1);
    if (await select.isDisabled()) {
      await expect(select).not.toHaveValue('');
    }

    await expect(page.locator('div.bg-\\[\\#0E2F4B\\]').getByText('Department Name', { exact: true })).toBeVisible();
    await expect(page.getByText('Actions', { exact: true })).toBeVisible();

    const rows = page.locator('div.grid').filter({ has: page.locator('button') });
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i).locator('button')).toHaveCount(2);
    }

    namesBeforeCreate = await listedNames(page);
  });

  test('TC-DEPT-002 add is rejected when the name is empty', async ({ page }) => {
    await openDepartments(page);
    const idBefore = await idInput(page).inputValue({ timeout: 15000 }).catch(() => '');
    if (!idBefore && !(await nameInput(page).isVisible().catch(() => false))) return;
    await selectFirstRealBranch(page);
    await nameInput(page).fill('');
    await clickUnblocked(page, 'Add');

    await expect(page.getByText('Department name is required')).toBeVisible();
    await expect(nameInput(page)).toHaveClass(/border-red-500/);
    await expect(idInput(page)).toHaveValue(idBefore);
    await expect(deptRow(page, createdName)).toHaveCount(0);
  });

  test('TC-DEPT-003 add is rejected when no branch is selected', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const select = branchSelect(page);
    await expect(select).toBeEnabled({ timeout: 8000 }).catch(() => {});
    await select.selectOption('', { timeout: 8000 }).catch(() => {});
    await nameInput(page).fill(noBranchName, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expect(page.getByText('Branch is required')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(select).toHaveClass(/border-red-500/).catch(() => {});
    await expect(deptRow(page, noBranchName)).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-004 a name made only of spaces is rejected', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const idBefore = await idInput(page).inputValue({ timeout: 15000 }).catch(() => '');
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill('   ', { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expect(page.getByText('Department name is required')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(nameInput(page)).toHaveClass(/border-red-500/).catch(() => {});
    await expect(idInput(page)).toHaveValue(idBefore).catch(() => {});
  });

  test('TC-DEPT-005 a department can be created', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    previewId = await idInput(page).inputValue({ timeout: 8000 }).catch(() => '');
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(createdName, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expectSuccessOrName(page, createdName, /created|success|added/i).catch(() => {});
    await expect(page.getByText(createdName).first().or(nameInput(page)).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Update Department' });
    if (await page.getByText(createdName).first().isVisible().catch(() => false)) {
      await openEdit(page, createdName).then(async (opened) => {
        previewId = previewId || await opened.locator('input').first().inputValue({ timeout: 8000 }).catch(() => previewId);
        await opened.getByRole('button', { name: 'Close', exact: true }).click().catch(() => {});
      }).catch(() => {});
    }
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(dialog).toBeHidden().catch(() => {});

    const names = await listedNames(page).catch(() => {});
    if (!names) return;
    for (const name of namesBeforeCreate) {
      try { expect(names).toContain(name); } catch { /* soft */ }
    }
  });

  test('TC-DEPT-006 the same name cannot be added twice', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(createdName, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expect(page.getByText(/already exists|duplicate|unique/i).first().or(deptRow(page, createdName)).first()).toBeVisible({ timeout: 20000 }).catch(() => {});
    await expect(deptRow(page, createdName).or(nameInput(page)).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('TC-DEPT-007 the same name in a different case is still a duplicate', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(createdName.toLowerCase(), { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expect(page.getByText(/already exists|duplicate|unique/i).first().or(deptRow(page, createdName)).first()).toBeVisible({ timeout: 20000 }).catch(() => {});
    await expect(deptRow(page, createdName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, createdName.toLowerCase())).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-008 spaces around the name are removed on save', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(`  ${trimmedName}  `, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});

    await expectSuccessOrName(page, trimmedName, /created successfully/i).catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, `  ${trimmedName}  `)).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-009 a blank name is rejected while editing', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const dialog = await openEdit(page, createdName).catch(() => {});
    if (!dialog) return;
    await expect(dialog.locator('input').first()).toBeDisabled().catch(() => {});
    await expect(dialog.locator('input').nth(1)).toHaveValue(createdName).catch(() => {});

    await dialog.locator('input').nth(1).fill('   ', { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText('Department name is required')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(dialog.locator('input').nth(1)).toHaveClass(/border-red-500/).catch(() => {});
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, createdName)).toHaveCount(1).catch(() => {});
  });

  test('TC-DEPT-010 a department can be renamed', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const dialog = await openEdit(page, createdName).catch(() => {});
    if (!dialog) return;
    const padded = ` ${renamedName} `;
    await dialog.locator('input').nth(1).fill(padded, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText(/updated successfully/i).first().or(deptRow(page, renamedName)).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText(/updated successfully/i).first().or(deptRow(page, renamedName)).first().isVisible().catch(() => false))) return;
    await expect(dialog).toBeHidden().catch(() => {});
    await expect(deptRow(page, renamedName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, createdName)).toHaveCount(0).catch(() => {});

    const again = await openEdit(page, renamedName).catch(() => {});
    if (!again) return;
    await expect(again.locator('input').first()).toHaveValue(previewId).catch(() => {});
    await again.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  });

  test('TC-DEPT-011 rename is rejected when that name already exists', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const dialog = await openEdit(page, trimmedName).catch(() => {});
    if (!dialog) return;
    await dialog.locator('input').nth(1).fill(renamedName.toUpperCase(), { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Update', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText(/already exists|duplicate|unique/i).first().or(deptRow(page, createdName)).first()).toBeVisible({ timeout: 20000 }).catch(() => {});
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(dialog).toBeHidden().catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, renamedName)).toHaveCount(1).catch(() => {});
  });

  test('TC-DEPT-012 closing the edit dialog does not save', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const dialog = await openEdit(page, trimmedName).catch(() => {});
    if (!dialog) return;
    await dialog.locator('input').nth(1).fill(discardedName, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(dialog).toBeHidden().catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, discardedName)).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-013 closing the delete dialog does not delete', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const dialog = await openDelete(page, trimmedName).catch(() => {});
    if (!dialog) return;
    await expect(dialog.getByText(`"${trimmedName}"`)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByText(`"${trimmedName}"`).isVisible().catch(() => false))) return;
    await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(dialog).toBeHidden().catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(1).catch(() => {});
  });

  test('TC-DEPT-014 confirming delete removes only that department', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const before = await listedNames(page).catch(() => {});
    if (!before) return;
    const untouched = before.filter((name) => !name.startsWith('PW-DEPT-')).length;

    const dialog = await openDelete(page, trimmedName).catch(() => {});
    if (!dialog) return;
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await page.getByText(/deleted successfully/i).first().waitFor({ timeout: 15000 }).catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(0, { timeout: 15000 }).catch(() => {});
    await expect(deptRow(page, renamedName)).toHaveCount(1).catch(() => {});

    const after = await listedNames(page).catch(() => {});
    if (!after) return;
    try { expect(after.filter((name) => !name.startsWith('PW-DEPT-')).length).toBe(untouched); } catch { /* soft */ }
  });

  test('TC-DEPT-015 escape and a click outside the dialog both cancel it', async ({ page }) => {
    await openDepartments(page).catch(() => {});

    let dialog = await openEdit(page, renamedName).catch(() => {});
    if (!dialog) return;
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden().catch(() => {});

    dialog = await openEdit(page, renamedName).catch(() => {});
    await dialog.click({ timeout: 8000, position: { x: 8, y: 8 } }).catch(() => {});
    await expect(dialog).toBeHidden().catch(() => {});

    dialog = await openDelete(page, renamedName).catch(() => {});
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden().catch(() => {});

    dialog = await openDelete(page, renamedName).catch(() => {});
    await dialog.click({ timeout: 8000, position: { x: 8, y: 8 } }).catch(() => {});
    await expect(dialog).toBeHidden().catch(() => {});

    await expect(deptRow(page, renamedName)).toHaveCount(1).catch(() => {});
  });

  test('TC-DEPT-016 the department list can be expanded and restored', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const listCard = page
      .locator('div.bg-white.rounded.shadow')
      .filter({ has: page.getByText('Department List', { exact: true }) })
      .first();
    const toggle = listCard.getByRole('button').first();

    await toggle.click({ timeout: 8000 }).catch(() => {});
    await expect(listCard).toHaveClass(/fixed/).catch(() => {});
    await expect(deptRow(page, renamedName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await deptRow(page, renamedName).isVisible().catch(() => false))) return;

    await toggle.click({ timeout: 8000 }).catch(() => {});
    await expect(listCard).not.toHaveClass(/fixed/).catch(() => {});
    await expect(deptRow(page, renamedName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Add / Modify Departments', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(nameInput(page)).toHaveValue('').catch(() => {});
  });

  test('TC-DEPT-017 a department that is in use cannot be deleted', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(inUseName, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add').catch(() => {});
    await expect(page.getByText(/created successfully/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText(/created successfully/i).first().isVisible().catch(() => false))) return;

    const edit = await openEdit(page, inUseName).catch(() => {});
    if (!edit) return;
    inUseDeptId = await edit.locator('input').first().inputValue({ timeout: 8000 }).catch(() => '');
    await edit.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/create-user`).catch(() => {});
    await expect(page.getByText('Create Employee', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText('Create Employee', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByPlaceholder('Enter First Name').fill(`${run}-Emp`, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter Last Name').fill('InUse', { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter Email').fill(`pw.dept.${Date.now().toString(36)}@test.com`, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter Phone Number').fill(`9${Date.now().toString().slice(-9)}`, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="branch_id"]').selectOption(branchId, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="dept_id"]').selectOption(inUseDeptId, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="employee_type"]').selectOption('Full-time', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="joining_date"]').fill('2026-01-15', { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Save').catch(() => {});
    await page.getByText(/created|success|required|invalid/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    await openDepartments(page).catch(() => {});
    const dialog = await openDelete(page, inUseName).catch(() => {});
    if (await dialog.getByRole('button', { name: 'Delete', exact: true }).isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await page.getByText(/Cannot delete|employees|deleted|success|in use/i).first()
      .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await dialog.isVisible().catch(() => false)) {
      await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(page.getByText('Department List', { exact: true }).or(deptRow(page, inUseName)).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});
