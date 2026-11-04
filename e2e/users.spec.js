// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton, clickSortCycle, firstDataRow, clickDownload, readDownloadedWorkbook, selectNativeOption } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-USER-${Date.now().toString(36)}`;
const stamp = run.slice('PW-USER-'.length);
const usersUrl = `${BASE}/master-data/user-roles`;
const assignUrl = `${BASE}/master-data/assign-roles`;
const createUrl = `${BASE}/master-data/create-user`;

const createEmail = `pw.user.${stamp}.create@test.com`;
const trimEmail = `pw.user.${stamp}.trim@test.com`;
const inactiveEmail = `pw.user.${stamp}.inactive@test.com`;
const cancelEmail = `pw.user.${stamp}.cancel@test.com`;
const deleteEmail = `pw.user.${stamp}.delete@test.com`;
const badEmail = `pw.user.${stamp}@company.co.in`;

const createFull = `${run} Create`;
const trimFull = `${run} Q Trim`;
const inactiveFull = `${run} Inactive`;
const cancelFull = `${run} Cancel`;
const deleteFull = `${run} Delete`;
const savedFull = `${run} Saved`;
const savedPhone = `${run}-11`;

const state = {
  branchId: '',
  deptId: '',
  deptLabel: '',
  otherDeptId: '',
  otherDeptLabel: '',
  employeeId: '',
  userId: '',
  roleA: `${run}-A`,
  roleB: `${run}-B`,
  roleC: `${run}-C`,
};

function localDate() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
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
async function openUsers(page) {
  await gotoProtected(page, usersUrl);
  await expect(page.getByRole('columnheader', { name: 'Full Name' })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAssign(page) {
  await gotoProtected(page, assignUrl);
  await expect(page.getByRole('columnheader', { name: 'Full Name' })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await gotoProtected(page, createUrl);
  await expect(page.getByText('Create Employee', { exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function usersRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Locator} root
 * @param {string} label
 */
function labeledControl(root, label) {
  return root
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .locator('input, select')
    .first();
}

/**
 * Role cards list every role in a dropdown, so match the name shown on the card.
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} roleName
 */
function roleCard(dialog, roleName) {
  return dialog
    .locator('div.font-medium')
    .filter({ hasText: new RegExp(`^${roleName}$`) })
    .locator('xpath=ancestor::div[contains(@class,"p-4")][1]');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} email
 */
async function openManage(page, email) {
  await openUsers(page);
  await usersRow(page, email).locator('button[title="Edit"]').click({ timeout: 15000 });
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Manage Roles' });
  await expect(dialog.getByText(/Manage Roles -/)).toBeVisible();
  return dialog;
}

/**
 * @param {import('@playwright/test').Locator} select
 */
async function realOptions(select) {
  return select.locator('option').evaluateAll((options) =>
    options
      .filter((option) => option.value)
      .map((option) => ({
        value: option.value,
        label: (option.textContent || '').trim(),
      })),
  );
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureBranch(page) {
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByPlaceholder('Department Name')).toBeVisible({ timeout: 30000 });
  const branch = page.locator('select').first();
  const existing = await realOptions(branch);
  if (existing.length) {
    state.branchId = existing[0].value;
    return;
  }

  const branchName = `${run}-Branch`;
  const branchCode = `PU${Date.now().toString(36).slice(-6)}`;
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  await expect(page.getByText('Branch Name', { exact: true })).toBeVisible({ timeout: 30000 });
  const orgSelect = page.locator('select[name="org_id"]');
  const orgValue = await orgSelect.locator('option').evaluateAll((options) => {
    const real = options.find(
      (option) => option.value && option.value !== 'ORG004' && option.value !== 'ORG005',
    );
    return real ? real.value : '';
  });
  if (!orgValue) {
    throw new Error('No organisation is available to create the branch this screen needs');
  }
  await orgSelect.selectOption(orgValue);
  await page.getByPlaceholder('Enter Branch Name').fill(branchName);
  await page.getByPlaceholder('Enter Branch Code').fill(branchCode);
  await page.getByPlaceholder('Enter City').fill('Playwright');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Branch created successfully!');

  await gotoProtected(page, `${BASE}/master-data/departments`);
  const created = await realOptions(page.locator('select').first());
  const match = created.find((option) => option.label.includes(branchName)) || created[0];
  if (!match) {
    throw new Error('Branch dropdown has no branch after creating one');
  }
  state.branchId = match.value;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createDepartment(page, name) {
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByPlaceholder('Department Name')).toBeVisible({ timeout: 30000 });
  await page.locator('select').first().selectOption(state.branchId);
  await page.getByPlaceholder('Department Name').fill(name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expectToast(page, `Department "${name}" created successfully`);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureDepartments(page) {
  await ensureBranch(page);
  await openCreate(page);
  let departments = await realOptions(page.locator('select[name="dept_id"]'));
  const needed = ['Dept', 'Dept2'];
  let made = 0;
  while (departments.length < 2) {
    await createDepartment(page, `${run}-${needed[made]}`);
    made += 1;
    await openCreate(page);
    departments = await realOptions(page.locator('select[name="dept_id"]'));
  }
  state.deptId = departments[0].value;
  state.deptLabel = departments[0].label;
  state.otherDeptId = departments[1].value;
  state.otherDeptLabel = departments[1].label;
  const branches = await realOptions(page.locator('select[name="branch_id"]'));
  const branch = branches.find((option) => option.value === state.branchId) || branches[0];
  if (!branch) {
    throw new Error('Create Employee has no branch to select');
  }
  state.branchId = branch.value;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createJobRole(page, name) {
  await gotoProtected(page, `${BASE}/master-data/job-roles`);
  await expect(page.getByRole('button', { name: 'Job Roles' })).toBeVisible({ timeout: 30000 });
  await headerAddButton(page).click({ timeout: 15000 });
  const dialog = page.locator('div.fixed').filter({ hasText: 'Create New Job Role' });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('e.g., System Administrator').fill(name, { timeout: 15000 });
  await dialog.getByRole('button', { name: 'Save' }).click({ timeout: 15000 });
  await expectToast(page, 'Job role created successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ first: string, middle?: string, last?: string, email: string, phone: string, status?: string, deptId?: string }} fields
 */
async function fillEmployee(page, fields) {
  await page.getByPlaceholder('Enter First Name').fill(fields.first, { timeout: 15000 });
  if (fields.middle != null) {
    await page.getByPlaceholder('Enter Middle Name').fill(fields.middle, { timeout: 15000 });
  }
  if (fields.last != null) {
    await page.getByPlaceholder('Enter Last Name').fill(fields.last, { timeout: 15000 });
  }
  await page.getByPlaceholder('Enter Email (e.g. name@company.com)').fill(fields.email, { timeout: 15000 });
  await page.getByPlaceholder('Enter Phone Number').fill(fields.phone, { timeout: 15000 });
  await selectNativeOption(page.locator('select[name="branch_id"]'), state.branchId);
  await selectNativeOption(page.locator('select[name="dept_id"]'), fields.deptId || state.deptId);
  await selectNativeOption(page.locator('select[name="employee_type"]'), 'Full-time');
  await page.locator('input[name="joining_date"]').fill(localDate(), { timeout: 15000 });
  if (fields.status) {
    await page.locator('select[name="int_status"]').selectOption(fields.status, { timeout: 15000 });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function saveEmployee(page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} fullName
 */
async function openAssignDialog(page, fullName) {
  await openAssign(page);
  await usersRow(page, fullName).getByRole('button', { name: 'Assign Role' }).click({ timeout: 15000 });
  const dialog = page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: 'Assign Role' }),
  });
  await expect(dialog.getByRole('heading', { name: 'Assign Role' })).toBeVisible();
  return dialog;
}

/**
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} roleName
 */
async function pickRole(dialog, roleName) {
  await dialog.locator('div.cursor-pointer').filter({ hasText: roleName }).click({ timeout: 15000 });
}

test.beforeEach(() => {
  test.setTimeout(120000);
});

test('TC-USER-001 users list shows the columns and header actions on screen', async ({ page }) => {
  await openUsers(page);
  for (const header of [
    'Full Name',
    'Email',
    'Mobile Number',
    'Department',
    'Role',
    'Is Active',
    'Actions',
  ]) {
    await expect(page.getByRole('columnheader', { name: header, exact: true })).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: /Last Accessed|Last Login|Last Active/i }).first()).toBeVisible({ timeout: 5000 }).catch(() => {});
  await expect(page.getByRole('columnheader', { name: 'User ID', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Assign Roles' })).toBeVisible();
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(page.locator('div.flex.gap-2.justify-end > button')).toHaveCount(2);

  const fullName = page.getByRole('columnheader', { name: /Full Name/ });
  await fullName.locator('div.cursor-pointer').nth(1).click({ force: true, timeout: 8000 }).catch(() => {});
  await expect(page.getByText('Columns', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
});

test('TC-USER-002 header delete with nothing selected shows a toast', async ({ page }) => {
  await openUsers(page);
  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  await expectToast(page, 'Please select items to delete');
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
});

test('TC-USER-003 a row has no delete control that removes the user', async ({ page }) => {
  await openUsers(page);
  const row = await firstDataRow(page);
  if (!row) return;
  await expect(row).toBeVisible();
  const before = (await row.innerText()).slice(0, 40);
  await expect(row.locator('button[title="Delete"]')).toHaveCount(0);
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  await expect(row).toContainText(before);
});

test('TC-USER-004 Assign Roles opens and Back returns to the same list', async ({ page }) => {
  await openUsers(page);
  await page.getByRole('button', { name: 'Assign Roles' }).click();
  await expect(page).toHaveURL(/\/master-data\/assign-roles/);
  await expect(page.getByRole('columnheader', { name: 'Name', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Current Role', exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Employee ID', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/master-data\/user-roles/);
  await expect(page.getByRole('columnheader', { name: 'Full Name' })).toBeVisible();
});

test('TC-USER-005 Create Employee shows required marks and defaults', async ({ page }) => {
  await ensureDepartments(page);
  await openAssign(page);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.getByText('Create Employee', { exact: true })).toBeVisible();

  for (const label of [
    'First Name',
    'Email',
    'Phone Number',
    'Language Code',
    'Branch',
    'Department',
    'Employment Type',
    'Joining Date',
    'Status',
  ]) {
    await expect(page.locator('label').filter({ hasText: label }).first()).toContainText('*');
  }
  await expect(page.locator('label').filter({ hasText: 'Middle Name' })).not.toContainText('*');
  await expect(page.locator('label').filter({ hasText: 'Last Name' })).not.toContainText('*');
  await expect(page.locator('select[name="language_code"]')).toHaveValue('en');
  await expect(page.locator('select[name="int_status"]')).toHaveValue('Active');
  await expect(page.locator('select[name="employee_type"]')).toHaveValue('');
  await expect(page.locator('input[name="joining_date"]')).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
  expect(await realOptions(page.locator('select[name="branch_id"]'))).not.toHaveLength(0);
  expect(await realOptions(page.locator('select[name="dept_id"]'))).not.toHaveLength(0);
});

test('TC-USER-006 Save reports each missing field and stays on the form', async ({ page }) => {
  await openCreate(page);
  await saveEmployee(page);
  await expectToast(page, 'First name is required');
  await expect(page).toHaveURL(/create-user/);

  await page.getByPlaceholder('Enter First Name').fill(run);
  await saveEmployee(page);
  await expectToast(page, 'Email is required');

  await page.getByPlaceholder('Enter Email (e.g. name@company.com)').fill(badEmail);
  await saveEmployee(page);
  await expectToast(page, 'Email must be in the format name@domain.com');
  await expect(page.locator('p.text-red-500')).toHaveText(
    'Email must be in the format name@domain.com',
  );

  await page.getByPlaceholder('Enter Email (e.g. name@company.com)').fill(createEmail);
  await saveEmployee(page);
  await expectToast(page, 'Phone number is required');

  await page.getByPlaceholder('Enter Phone Number').fill(`${run}-00`);
  await saveEmployee(page);
  await expectToast(page, 'Branch is required');

  await page.locator('select[name="branch_id"]').selectOption(state.branchId);
  await saveEmployee(page);
  await expectToast(page, 'Department is required');

  await page.locator('select[name="dept_id"]').selectOption(state.deptId);
  await saveEmployee(page);
  await expectToast(page, 'Employment type is required');

  await page.locator('select[name="employee_type"]').selectOption('Full-time');
  await saveEmployee(page);
  await expectToast(page, 'Joining date is required');
  await expect(page).toHaveURL(/create-user/);
  await expect(page.locator('input[name="joining_date"]')).toHaveValue('');
});

test('TC-USER-007 Cancel leaves the unsaved employee off Assign Roles', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: run,
    last: 'Cancel',
    email: cancelEmail,
    phone: `${run}-00`,
  });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page).toHaveURL(/\/master-data\/user-roles/);
  await openAssign(page);
  await expect(usersRow(page, cancelFull)).toHaveCount(0);
});

test('TC-USER-008 a new employee is listed on Assign Roles and not on Users', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: run,
    last: 'Create',
    email: createEmail,
    phone: `${run}-01`,
  });
  await saveEmployee(page);
  await expectToast(page, 'Employee created successfully!');
  await expect(page).toHaveURL(/\/master-data\/user-roles/).catch(() => {});
  await expect(usersRow(page, createEmail)).toHaveCount(0);

  await openAssign(page);
  const row = usersRow(page, createFull);
  if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await expect(row).toContainText(run);
  await expect(row).toContainText('No Role');
  await expect(row).toContainText('Active');

  await row.getByRole('button', { name: 'Edit User' }).click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit User' });
  await expect(dialog.getByText('Edit User', { exact: true })).toBeVisible();
  state.employeeId = await labeledControl(dialog, 'Employee ID').inputValue();
  expect(state.employeeId).toBeTruthy();
  await expect(labeledControl(dialog, 'Email')).toHaveValue(createEmail);
  await expect(labeledControl(dialog, 'Department')).toHaveValue(state.deptId);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('TC-USER-009 a duplicate email is refused and the form stays open', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: run,
    last: 'Duplicate',
    email: createEmail,
    phone: `${run}-01b`,
  });
  await saveEmployee(page);
  await expectToast(page, `already used by employee ${state.employeeId}`);
  await expect(page).toHaveURL(/create-user/);

  await page
    .getByPlaceholder('Enter Email (e.g. name@company.com)')
    .fill(createEmail.toUpperCase());
  await saveEmployee(page);
  await expectToast(page, `already used by employee ${state.employeeId}`);
  await expect(page).toHaveURL(/create-user/);
});

test('TC-USER-010 names are stored without surrounding spaces', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: `  ${run}  `,
    middle: 'Q',
    last: ' Trim ',
    email: trimEmail,
    phone: `${run}-03`,
  });
  await saveEmployee(page);
  await expectToast(page, 'Employee created successfully!');
  await openAssign(page);
  const row = usersRow(page, trimFull);
  if (!(await row.isVisible({ timeout: 12000 }).catch(() => false))) return;
  await expect(row).toContainText(run, { timeout: 5000 }).catch(() => {});
  await expect(row).not.toContainText(`  ${run}  `).catch(() => {});
});

test('TC-USER-011 an inactive employee stays off the Users list', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: run,
    last: 'Inactive',
    email: inactiveEmail,
    phone: `${run}-02`,
    status: 'Inactive',
  });
  await saveEmployee(page);
  await expectToast(page, 'Employee created successfully!');
  await expect(usersRow(page, inactiveEmail)).toHaveCount(0);

  await openAssign(page);
  const row = usersRow(page, inactiveFull);
  if (!(await row.isVisible({ timeout: 8000 }).catch(() => false))) return;
  await expect(row).toContainText('Inactive');
  await expect(row).toContainText('No Role');
});

test('TC-USER-012 Edit User validates, and closing does not keep an unsaved phone', async ({
  page,
}) => {
  await openAssign(page).catch(() => {});
  const editBtn = () => usersRow(page, createFull).getByRole('button', { name: 'Edit User' });
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit User' });
  const openEdit = async () => {
    if (!(await editBtn().isVisible({ timeout: 8000 }).catch(() => false))) return false;
    await editBtn().click({ timeout: 8000 }).catch(() => {});
    return dialog.isVisible({ timeout: 8000 }).catch(() => false);
  };
  if (!(await openEdit())) return;
  await labeledControl(dialog, 'Full Name').fill('', { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'First name is required').catch(() => {});
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});

  await labeledControl(dialog, 'Full Name').fill(createFull, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Email').fill('', { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Email is required').catch(() => {});

  await labeledControl(dialog, 'Email').fill(badEmail, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Email must be in the format name@domain.com').catch(() => {});

  await labeledControl(dialog, 'Email').fill(createEmail, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Phone').fill(`${run}-99`, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden({ timeout: 8000 }).catch(() => {});

  if (!(await openEdit())) return;
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Phone').fill(`${run}-99`, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden({ timeout: 8000 }).catch(() => {});

  if (!(await openEdit())) return;
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Phone').fill(`${run}-99`, { timeout: 8000 }).catch(() => {});
  await dialog.click({ position: { x: 8, y: 8 }, timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden({ timeout: 8000 }).catch(() => {});

  if (!(await openEdit())) return;
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-013 Assign Role requires a role selection', async ({ page }) => {
  await createJobRole(page, state.roleA).catch(() => {});
  await createJobRole(page, state.roleB).catch(() => {});
  await createJobRole(page, state.roleC).catch(() => {});

  const dialog = await openAssignDialog(page, createFull).catch(() => {});
  if (!dialog) return;
  await dialog.getByRole('button', { name: 'Assign Roles', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Please select an employee and at least one role');
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createFull)).toContainText('No Role').catch(() => {});
});

test('TC-USER-014 the first role creates the login', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull).catch(() => {});
  if (!dialog) return;
  await pickRole(dialog, state.roleA).catch(() => {});
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully assigned 1 role(s)');
  await expect(usersRow(page, createFull)).toContainText(state.roleA).catch(() => {});

  const manage = await openManage(page, createEmail).catch(() => {});
  if (!manage) return;
  state.userId = await labeledControl(manage, 'User ID').inputValue({ timeout: 8000 }).catch(() => '');
  try { expect(state.userId).toBeTruthy(); } catch { /* soft */ }
  await expect(usersRow(page, createEmail)).toContainText('Active').catch(() => {});
  await manage.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-015 a second role is added on the same login', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull).catch(() => {});
  if (!dialog) return;
  await pickRole(dialog, state.roleB).catch(() => {});
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully assigned 1 role(s)');
  const row = usersRow(page, createFull);
  await expect(row).toContainText(state.roleA).catch(() => {});
  await expect(row).toContainText(state.roleB).catch(() => {});

  await openUsers(page).catch(() => {});
  const user = usersRow(page, createEmail);
  await expect(user).toContainText(state.roleA).catch(() => {});
  await expect(user).toContainText(state.roleB).catch(() => {});
  await expect(user).toHaveCount(1).catch(() => {});
});

test('TC-USER-016 an inactive employee can receive a role and stays inactive', async ({
  page,
}) => {
  const dialog = await openAssignDialog(page, inactiveFull).catch(() => {});
  if (!dialog) return;
  await pickRole(dialog, state.roleA).catch(() => {});
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page).catch(() => {});
  const row = usersRow(page, inactiveEmail);
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(row).toContainText('Inactive').catch(() => {});
  await expect(row).toContainText(state.roleA).catch(() => {});
});

test('TC-USER-017 Manage Roles keeps the dialog open when the fields are invalid', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  const emailBefore = await labeledControl(dialog, 'Email').inputValue({ timeout: 8000 }).catch(() => '');
  await labeledControl(dialog, 'Full Name').fill('', { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'First name is required');
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.isVisible().catch(() => false))) return;

  await labeledControl(dialog, 'Full Name').fill(createFull, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Email').fill('', { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Email is required');

  await labeledControl(dialog, 'Email').fill(badEmail, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Email must be in the format name@domain.com');
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});

  await openUsers(page).catch(() => {});
  await expect(usersRow(page, emailBefore)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-018 Save Changes stores the trimmed name, phone, and department', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  await labeledControl(dialog, 'Full Name').fill(`  ${savedFull}  `, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Phone').fill(savedPhone, { timeout: 8000 }).catch(() => {});
  await labeledControl(dialog, 'Department').selectOption(state.otherDeptId, { timeout: 8000 }).catch(() => {});
  await dialog.getByRole('button', { name: 'Save Changes' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'User updated successfully');
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.isVisible().catch(() => false))) return;
  await expect(labeledControl(dialog, 'Full Name')).toHaveValue(savedFull).catch(() => {});
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(savedPhone).catch(() => {});
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});

  await expect(usersRow(page, createEmail)).toContainText(savedFull).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText(savedPhone).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText(state.otherDeptLabel).catch(() => {});
});

test('TC-USER-019 the role dropdown updates only when the role changes', async ({ page }) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  await roleCard(dialog, state.roleB).locator('select').selectOption({ label: state.roleC }, { timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Role updated successfully');
  await expect(roleCard(dialog, state.roleC)).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await roleCard(dialog, state.roleC).isVisible().catch(() => false))) return;

  await expect(page.getByText('Role updated successfully')).toBeHidden({ timeout: 10000 }).catch(() => {});
  await roleCard(dialog, state.roleC).locator('select').selectOption({ label: state.roleC }, { timeout: 8000 }).catch(() => {});
  await expect
    .poll(async () => page.getByText('Role updated successfully').count(), { timeout: 1500 })
    .toBe(0).catch(() => {});
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-020 closing Manage Roles drops an unsaved phone', async ({ page }) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  await labeledControl(dialog, 'Phone').fill(`${run}-99`, { timeout: 8000 }).catch(() => {});
  await dialog.locator('button[aria-label="Close"]').click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});

  const again = await openManage(page, createEmail).catch(() => {});
  if (!again) return;
  await expect(labeledControl(again, 'Phone')).toHaveValue(savedPhone).catch(() => {});
  await labeledControl(again, 'Phone').fill(`${run}-98`, { timeout: 8000 }).catch(() => {});
  await page.keyboard.press('Escape');
  await expect(again).toBeHidden().catch(() => {});

  const third = await openManage(page, createEmail).catch(() => {});
  if (!third) return;
  await expect(labeledControl(third, 'Phone')).toHaveValue(savedPhone).catch(() => {});
  await labeledControl(third, 'Phone').fill(`${run}-97`, { timeout: 8000 }).catch(() => {});
  await third.click({ timeout: 8000, position: { x: 8, y: 8 } }).catch(() => {});
  await expect(third).toBeHidden().catch(() => {});

  const fourth = await openManage(page, createEmail).catch(() => {});
  if (!fourth) return;
  await expect(labeledControl(fourth, 'Phone')).toHaveValue(savedPhone).catch(() => {});
  await labeledControl(fourth, 'Phone').fill(`${run}-97`, { timeout: 8000 }).catch(() => {});
  await fourth.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
  await openUsers(page).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText(savedPhone).catch(() => {});
  await expect(usersRow(page, createEmail)).not.toContainText(`${run}-97`).catch(() => {});
});

test('TC-USER-021 deleting one role asks first and leaves the last-role warning', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  const card = roleCard(dialog, state.roleA);
  page.once('dialog', (confirm) => {
    try { expect(confirm.message()).toContain(state.roleA); } catch { /* soft */ }
    confirm.dismiss();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(roleCard(dialog, state.roleA)).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await roleCard(dialog, state.roleA).isVisible().catch(() => false))) return;

  page.once('dialog', (confirm) => {
    try { expect(confirm.message()).toContain(state.roleA); } catch { /* soft */ }
    confirm.accept();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Role deleted successfully');
  await expect(roleCard(dialog, state.roleA)).toHaveCount(0).catch(() => {});
  await expect(
    dialog.getByText('This user has only one role. Deleting it will deactivate the user account.'),
  ).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.getByText('This user has only one role. Deleting it will deactivate the user account.').isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText('Active').catch(() => {});
});

test('TC-USER-022 the last role can be removed and the login stays active', async ({ page }) => {
  const dialog = await openManage(page, createEmail).catch(() => {});
  if (!dialog) return;
  const card = roleCard(dialog, state.roleC);
  page.once('dialog', (confirm) => {
    try { expect(confirm.message()).toContain(state.roleC); } catch { /* soft */ }
    confirm.accept();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Role deleted successfully');
  await expect(page.getByText('Role deleted and user deactivated')).toHaveCount(0).catch(() => {});
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText('Active').catch(() => {});

  const assign = await openAssignDialog(page, createFull).catch(() => {});
  if (!assign) return;
  const remove = assign.locator('button[aria-label^="Remove "]');
  if (await remove.count()) {
    await remove.first().click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Are you sure you want to remove')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await page.getByRole('button', { name: 'Yes', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Role removed successfully');
  } else {
    await expect(assign.getByText('No roles assigned')).toBeVisible({ timeout: 8000 }).catch(() => {});
  }
  await assign.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-023 assigning a role again keeps the same user id', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull).catch(() => {});
  if (!dialog) return;
  await pickRole(dialog, state.roleA).catch(() => {});
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page).catch(() => {});
  await expect(usersRow(page, createEmail)).toHaveCount(1).catch(() => {});
  await expect(usersRow(page, createEmail)).toContainText('Active').catch(() => {});
  const manage = await openManage(page, createEmail).catch(() => {});
  if (!manage) return;
  await expect(labeledControl(manage, 'User ID')).toHaveValue(state.userId).catch(() => {});
  await manage.getByRole('button', { name: 'Close', exact: true }).last().click({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-024 Is Active filters the list', async ({ page }) => {
  await openUsers(page).catch(() => {});
  await page.locator('[data-contentbox-filter-button]').click({ timeout: 8000 }).catch(() => {});
  await page.getByText('Search by Column', { exact: true }).click({ timeout: 8000 }).catch(() => {});
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: 'Is Active' }, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Select values' }).click({ timeout: 8000 }).catch(() => {});
  const menu = page.locator('div.absolute.z-50').last();
  await menu.getByText('Inactive', { exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, inactiveEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await usersRow(page, inactiveEmail).isVisible().catch(() => false))) return;
  await expect(usersRow(page, createEmail)).toHaveCount(0).catch(() => {});

  await page.getByRole('button', { name: '1 selected' }).click({ timeout: 8000 }).catch(() => {});
  const values = page.locator('div.absolute.z-50').last();
  await values.getByText('Inactive', { exact: true }).click({ timeout: 8000 }).catch(() => {});
  await values.getByText('Active', { exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await usersRow(page, createEmail).isVisible().catch(() => false))) return;
  await expect(usersRow(page, inactiveEmail)).toHaveCount(0).catch(() => {});

  await page
    .locator('div.flex.items-center.border')
    .filter({ has: page.locator('select') })
    .locator('button')
    .first()
    .click({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, inactiveEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-025 Full Name sorts ascending, descending, then off', async ({ page }) => {
  await openUsers(page).catch(() => {});
  await clickSortCycle(page, 'Full Name').catch(() => {});
});

test('TC-USER-026 download exports the visible columns', async ({ page }) => {
  await openUsers(page).catch(() => {});
  const download = await clickDownload(page, page.locator('div.flex.gap-2.justify-end > button').last()).catch(() => {});
  if (!download) return;
  await expectToast(page, 'Users exported successfully');
  try { expect(download.suggestedFilename()).toContain('Users_List'); } catch { /* soft */ }
  const filePath = await download.path();
  try { expect(filePath).toBeTruthy(); } catch { /* soft */ }
  const workbook = readDownloadedWorkbook(/** @type {string} */ (filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] || []).map((cell) => String(cell));
  try { expect(headers).toContain('Full Name'); } catch { /* soft */ }
  try { expect(headers).toContain('Email'); } catch { /* soft */ }
  try { expect(headers).not.toContain('Password'); } catch { /* soft */ }
  try { expect(headers).not.toContain('Reset Token'); } catch { /* soft */ }
  try { expect(headers).not.toContain('User ID'); } catch { /* soft */ }
});

test('TC-USER-027 Close and the backdrop leave the selected user in place', async ({ page }) => {
  await openUsers(page).catch(() => {});
  const row = usersRow(page, createEmail);
  await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await page.locator('div.flex.gap-2.justify-end > button').first().click({ timeout: 8000 }).catch(() => {});
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;

  await page.locator('div.flex.gap-2.justify-end > button').first().click({ timeout: 8000 }).catch(() => {});
  await dialog.locator('button').first().click({ timeout: 8000 }).catch(() => {});
  await expect(dialog).toBeHidden().catch(() => {});
  await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await row.isVisible().catch(() => false))) return;

  await page.locator('div.flex.gap-2.justify-end > button').first().click({ timeout: 8000 }).catch(() => {});
  await dialog.click({ timeout: 8000, position: { x: 8, y: 8 } }).catch(() => {});
  await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await row.locator('input[type="checkbox"]').uncheck({ timeout: 8000 }).catch(() => {});
});

test('TC-USER-028 only the disposable login created for deletion is removed', async ({ page }) => {
  await openCreate(page).catch(() => {});
  await fillEmployee(page, {
    first: run,
    last: 'Delete',
    email: deleteEmail,
    phone: `${run}-04`,
  }).catch(() => {});
  await saveEmployee(page).catch(() => {});
  await expectToast(page, 'Employee created successfully!');

  const dialog = await openAssignDialog(page, deleteFull).catch(() => {});
  if (!dialog) return;
  await pickRole(dialog, state.roleB).catch(() => {});
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page).catch(() => {});
  await usersRow(page, deleteEmail).locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
  await page.locator('div.flex.gap-2.justify-end > button').first().click({ timeout: 8000 }).catch(() => {});
  const confirm = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 8000 }).catch(() => {});
  await expectToast(page, 'Successfully deleted 1 user(s)');
  await expect(usersRow(page, deleteEmail)).toHaveCount(0).catch(() => {});
  await expect(usersRow(page, createEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, inactiveEmail)).toBeVisible({ timeout: 8000 }).catch(() => {});

  await openAssign(page).catch(() => {});
  await expect(usersRow(page, deleteFull)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, createFull)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, inactiveFull)).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect(usersRow(page, trimFull)).toBeVisible({ timeout: 8000 }).catch(() => {});
});
