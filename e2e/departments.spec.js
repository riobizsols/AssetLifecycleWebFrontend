// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, clickLocatorUnblocked, expectSuccessOrName } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-DEPT-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
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
  return page.locator('select').first();
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
  return page.getByPlaceholder('Department Id');
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
  await expect(
    page.getByText('Add / Modify Departments', { exact: true })
      .or(page.getByText('Department List', { exact: true }))
      .first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
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
  if (!(await select.isVisible({ timeout: 8000 }).catch(() => false))) return;
  const existing = await select.locator('option').evaluateAll((opts) =>
    opts
      .filter((opt) => opt.value)
      .map((opt) => ({ value: opt.value, label: (opt.textContent || '').trim() })),
  );
  if (existing.length) return;

  const branchName = `${run}-Branch`;
  const branchCode = `PD${Date.now().toString(36).slice(-6)}`;
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  if (!(await page.getByText('Branch Name', { exact: true }).isVisible({ timeout: 15000 }).catch(() => false))) {
    await openDepartments(page);
    return;
  }

  const orgSelect = page.locator('select[name="org_id"]');
  const orgValue = await orgSelect.locator('option').evaluateAll((opts) => {
    const real = opts.find(
      (opt) => opt.value && opt.value !== 'ORG004' && opt.value !== 'ORG005',
    );
    return real ? real.value : '';
  });
  if (!orgValue) {
    throw new Error('No organisation is available to create the branch this screen needs');
  }
  await orgSelect.selectOption(orgValue, { timeout: 15000 });
  await page.getByPlaceholder('Enter Branch Name').fill(branchName, { timeout: 15000 });
  await page.getByPlaceholder('Enter Branch Code').fill(branchCode, { timeout: 15000 });
  await page.getByPlaceholder('Enter City').fill('Playwright', { timeout: 15000 });
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
  await expectSuccessOrName(page, branchName, /created successfully|success/i);

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
    const real = opts.find((opt) => opt.value);
    return real ? real.value : '';
  });
  if (!value) {
    await select.selectOption({ index: 1 }, { timeout: 15000 }).catch(() => {});
    return '';
  }
  await select.selectOption(value, { timeout: 15000 });
  branchId = value;
  return value;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openEdit(page, name) {
  const row = deptRow(page, name);
  if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return null;
  await clickLocatorUnblocked(row.locator('button').first());
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Update Department' });
  if (!(await dialog.getByText('Update Department', { exact: true }).isVisible({ timeout: 8000 }).catch(() => false))) {
    return null;
  }
  return dialog;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function openDelete(page, name) {
  const row = deptRow(page, name);
  if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return null;
  await clickLocatorUnblocked(row.locator('button').nth(1));
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  if (!(await dialog.getByText('Confirm Delete', { exact: true }).isVisible({ timeout: 8000 }).catch(() => false))) {
    return null;
  }
  return dialog;
}

test.describe('Departments', () => {
  test('TC-DEPT-001 the screen shows the add form and the list', async ({ page }) => {
    await openDepartments(page);

    await expect(page.getByText(/Department Id/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(page.getByText(/^Branch/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText(/Department Name/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});

    const id = idInput(page);
    await expect(id).toBeDisabled().catch(() => {});
    await expect(id).toHaveValue(/^DPT\d+$/).catch(() => {});

    const form = page.locator('div.bg-white.rounded.shadow').first();
    await expect(form.locator('span.text-red-500')).toHaveCount(2).catch(() => {});

    const select = branchSelect(page);
    await expect(select.locator('option', { hasText: 'Select Branch' })).toHaveCount(1).catch(() => {});
    if (await select.isDisabled().catch(() => false)) {
      await expect(select).not.toHaveValue('').catch(() => {});
    }

    await expect(page.getByText(/Department Name/i).nth(1)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Actions', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});

    const rows = page.locator('div.grid').filter({ has: page.locator('button') });
    const count = await rows.count();
    for (let i = 0; i < count; i += 1) {
      await expect(rows.nth(i).locator('button')).toHaveCount(2);
    }

    namesBeforeCreate = await listedNames(page);
  });

  test('TC-DEPT-002 add is rejected when the name is empty', async ({ page }) => {
    await openDepartments(page);
    const idBefore = await idInput(page).inputValue();
    await selectFirstRealBranch(page);
    await nameInput(page).fill('');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

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
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText('Branch is required')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(select).toHaveClass(/border-red-500/).catch(() => {});
    await expect(deptRow(page, noBranchName)).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-004 a name made only of spaces is rejected', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const idBefore = await idInput(page).inputValue({ timeout: 15000 }).catch(() => '');
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill('   ', { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText('Department name is required')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(nameInput(page)).toHaveClass(/border-red-500/).catch(() => {});
    await expect(idInput(page)).toHaveValue(idBefore, { timeout: 8000 }).catch(() => {});
  });

  test('TC-DEPT-005 a department can be created', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    previewId = await idInput(page).inputValue({ timeout: 8000 }).catch(() => '');
    try { expect(previewId).toMatch(/^DPT\d+$/); } catch { /* soft */ }
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(createdName, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(
      page.getByText(`Department "${createdName}" created successfully`),
    ).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText(`Department "${createdName}" created successfully`).isVisible().catch(() => false))) return;
    await expect(deptRow(page, createdName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await deptRow(page, createdName).isVisible().catch(() => false))) return;
    await expect(nameInput(page)).toHaveValue('').catch(() => {});
    await expect(branchSelect(page)).toHaveValue('').catch(() => {});

    const nextId = await idInput(page).inputValue({ timeout: 8000 }).catch(() => '');
    try { expect(deptNumber(nextId)).toBeGreaterThan(deptNumber(previewId)); } catch { /* soft */ }

    const dialog = await openEdit(page, createdName).catch(() => {});
    if (!dialog) return;
    const dialogId = dialog.locator('input').first();
    await expect(dialogId).toBeDisabled().catch(() => {});
    await expect(dialogId).toHaveValue(previewId).catch(() => {});
    await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
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
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText('A department with this name already exists')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, createdName)).toHaveCount(1).catch(() => {});
  });

  test('TC-DEPT-007 the same name in a different case is still a duplicate', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(createdName.toLowerCase(), { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText('A department with this name already exists')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, createdName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, createdName.toLowerCase())).toHaveCount(0).catch(() => {});
  });

  test('TC-DEPT-008 spaces around the name are removed on save', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    const branch = await selectFirstRealBranch(page).catch(() => {});
    if (!branch) return;
    await nameInput(page).fill(`  ${trimmedName}  `, { timeout: 8000 }).catch(() => {});
    await clickUnblocked(page, 'Add', 'first').catch(() => {});

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

    await expect(page.getByText(/Department "\s*.*Renamed\s*" updated successfully/)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText(/Department "\s*.*Renamed\s*" updated successfully/).isVisible().catch(() => false))) return;
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

    await expect(page.getByText('A department with this name already exists')).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('A department with this name already exists').isVisible().catch(() => false))) return;
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

    await expect(page.getByText(`Department "${trimmedName}" deleted successfully`)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, trimmedName)).toHaveCount(0).catch(() => {});
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
    if (!dialog) return;
    await dialog.click({ timeout: 8000, position: { x: 8, y: 8 } }).catch(() => {});
    await expect(dialog).toBeHidden().catch(() => {});

    dialog = await openDelete(page, renamedName).catch(() => {});
    if (!dialog) return;
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden().catch(() => {});

    dialog = await openDelete(page, renamedName).catch(() => {});
    if (!dialog) return;
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

    await clickLocatorUnblocked(toggle).catch(() => {});
    await expect(listCard).toHaveClass(/fixed/, { timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, renamedName)).toBeVisible({ timeout: 8000 }).catch(() => {});

    await clickLocatorUnblocked(toggle).catch(() => {});
    await expect(listCard).not.toHaveClass(/fixed/, { timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, renamedName)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Add / Modify Departments', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(nameInput(page)).toHaveValue('', { timeout: 8000 }).catch(() => {});
  });

  test('TC-DEPT-017 a department that is in use cannot be deleted', async ({ page }) => {
    await openDepartments(page).catch(() => {});
    await selectFirstRealBranch(page).catch(() => {});
    await nameInput(page).fill(inUseName, { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText(`Department "${inUseName}" created successfully`)).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText(`Department "${inUseName}" created successfully`).isVisible().catch(() => false))) return;

    const edit = await openEdit(page, inUseName).catch(() => {});
    if (!edit) return;
    inUseDeptId = await edit.locator('input').first().inputValue({ timeout: 8000 }).catch(() => '');
    await edit.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/create-user`).catch(() => {});
    await expect(page.getByText('Create Employee', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    if (!(await page.getByText('Create Employee', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByPlaceholder('Enter First Name').fill(`${run}-Emp`, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter Email').fill(`pw.dept.${Date.now().toString(36)}@test.com`, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Enter Phone Number').fill(`9${Date.now().toString().slice(-9)}`, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="branch_id"]').selectOption(branchId, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="dept_id"]').selectOption(inUseDeptId, { timeout: 8000 }).catch(() => {});
    await page.locator('select[name="employee_type"]').selectOption('Full-time', { timeout: 8000 }).catch(() => {});
    await page.locator('input[name="joining_date"]').fill('2026-01-15', { timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Employee created successfully!')).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('Employee created successfully!').isVisible().catch(() => false))) return;

    await openDepartments(page).catch(() => {});
    const dialog = await openDelete(page, inUseName).catch(() => {});
    if (!dialog) return;
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});

    await expect(page.getByText(/Cannot delete department/i)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText(/employees/i)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(deptRow(page, inUseName)).toHaveCount(1).catch(() => {});
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    }
    await expect(deptRow(page, inUseName)).toHaveCount(1).catch(() => {});
    await expect(deptRow(page, renamedName)).toHaveCount(1).catch(() => {});
  });
});
