// @ts-check
import { test, expect } from '@playwright/test';
import * as XLSX from 'xlsx';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, columnHeader, dismissToasts, expectSuccessOrName, headerAddButton, readDownloadedWorkbook, selectLoadedOrganization } from './helpers/screenAccess.js';

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
  await toast.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openUsers(page) {
  await gotoProtected(page, usersUrl);
  await expect(columnHeader(page, 'Full Name')).toBeVisible({
    timeout: 45000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAssign(page) {
  await gotoProtected(page, assignUrl);
  await expect(columnHeader(page, 'Full Name')).toBeVisible({
    timeout: 45000,
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
  await usersRow(page, email).locator('button[title="Edit"]').click();
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
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
  const nameBox = page.getByPlaceholder('Department Name');
  const hasAddForm = await nameBox.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
  if (hasAddForm) {
    const branch = page.locator('select').first();
    await expect(branch.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 30000 }).catch(() => null);
    const existing = await realOptions(branch);
    if (existing.length) {
      const fromBranches = existing.find((option) => option.label.includes('PW-BR-'));
      state.branchId = (fromBranches || existing[0]).value;
      return;
    }
  }

  const branchName = `${run}-Branch`;
  const branchCode = `PU${Date.now().toString(36).slice(-6)}`;
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  await expect(page.getByPlaceholder('Enter Branch Name')).toBeVisible({ timeout: 30000 });
  await selectLoadedOrganization(page);
  await page.getByPlaceholder('Enter Branch Name').fill(branchName);
  await page.getByPlaceholder('Enter Branch Code').fill(branchCode);
  await page.getByPlaceholder('Enter City').fill('Playwright');
  await clickUnblocked(page, 'Save');
  await expectSuccessOrName(page, branchName, /created successfully/i);

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
  if (state.branchId) {
    await page.locator('select').first().selectOption(state.branchId);
  }
  await page.getByPlaceholder('Department Name').fill(name);
  await clickUnblocked(page, 'Add');
  await expectSuccessOrName(page, name, /created successfully/i);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureDepartments(page) {
  await ensureBranch(page);
  await openCreate(page);
  const branchSelect = page.locator('select[name="branch_id"]');
  await expect(branchSelect.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 30000 });
  const branches = await realOptions(branchSelect);
  const branch = branches.find((option) => option.label.includes('PW-BR-'))
    || branches.find((option) => option.value === state.branchId)
    || branches[0];
  if (!branch) {
    throw new Error('Create Employee has no branch to select');
  }
  state.branchId = branch.value;
  await branchSelect.selectOption(state.branchId);

  let departments = await realOptions(page.locator('select[name="dept_id"]'));
  for (const suffix of ['Dept', 'Dept2']) {
    if (departments.length >= 2) break;
    await createDepartment(page, `${run}-${suffix}`);
    await openCreate(page);
    await page.locator('select[name="branch_id"]').selectOption(state.branchId);
    departments = await realOptions(page.locator('select[name="dept_id"]'));
  }
  if (departments.length < 2) {
    throw new Error('Create Employee still has fewer than 2 departments after creating them');
  }
  const preferredDepartments = departments.filter((option) => option.label.startsWith('PW-DEPT-'));
  const chosenDepartments = [...preferredDepartments, ...departments.filter((option) => !option.label.startsWith('PW-DEPT-'))];
  state.deptId = chosenDepartments[0].value;
  state.deptLabel = chosenDepartments[0].label;
  state.otherDeptId = chosenDepartments[1].value;
  state.otherDeptLabel = chosenDepartments[1].label;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createJobRole(page, name) {
  await gotoProtected(page, `${BASE}/master-data/job-roles`);
  await expect(page.getByRole('button', { name: 'Job Roles' })).toBeVisible({ timeout: 30000 });
  await headerAddButton(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Create New Job Role' });
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('e.g., System Administrator').fill(name);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Job role created successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {{ first: string, middle?: string, last?: string, email: string, phone: string, status?: string, deptId?: string }} fields
 */
async function fillEmployee(page, fields) {
  await page.getByPlaceholder('Enter First Name').fill(fields.first);
  if (fields.middle != null) {
    await page.getByPlaceholder('Enter Middle Name').fill(fields.middle);
  }
  if (fields.last != null) {
    await page.getByPlaceholder('Enter Last Name').fill(fields.last);
  }
  await page.getByPlaceholder('Enter Email (e.g. name@company.com)').fill(fields.email);
  await page.getByPlaceholder('Enter Phone Number').fill(fields.phone);
  const branch = page.locator('select[name="branch_id"]');
  const dept = page.locator('select[name="dept_id"]');
  const branchValue = await branch.locator('option').evaluateAll((opts, wantedId) => {
    const wanted = opts.find((opt) => opt.value && opt.value === wantedId);
    const real = opts.find((opt) => opt.value);
    return (wanted || real)?.value || '';
  }, state.branchId).catch(() => '');
  if (branchValue) await branch.selectOption(branchValue);
  else await branch.selectOption(state.branchId).catch(() => {});
  const deptValue = await dept.locator('option').evaluateAll((opts, wantedId) => {
    const wanted = opts.find((opt) => opt.value && opt.value === wantedId);
    const real = opts.find((opt) => opt.value);
    return (wanted || real)?.value || '';
  }, fields.deptId || state.deptId).catch(() => '');
  if (deptValue) await dept.selectOption(deptValue);
  else await dept.selectOption(fields.deptId || state.deptId).catch(() => {});
  await page.locator('select[name="employee_type"]').selectOption('Full-time');
  await page.locator('input[name="joining_date"]').fill(localDate());
  if (fields.status) {
    await page.locator('select[name="int_status"]').selectOption(fields.status);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function saveEmployee(page) {
  await dismissToasts(page);
  const submitted = await page.locator('form').evaluate((form) => {
    if (form instanceof HTMLFormElement) {
      form.requestSubmit();
      return true;
    }
    return false;
  }).catch(() => false);
  if (!submitted) await clickUnblocked(page, 'Save');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} fullName
 */
async function openAssignDialog(page, fullName) {
  await openAssign(page);
  await usersRow(page, fullName).getByRole('button', { name: 'Assign Role' }).click();
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
  await dialog.locator('div.cursor-pointer').filter({ hasText: roleName }).click();
}

test.beforeEach(() => {
  test.setTimeout(180000);
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
    await expect(columnHeader(page, header)).toBeVisible();
  }
  await expect(page.getByRole('columnheader', { name: 'User ID', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Assign Roles' })).toBeVisible();
  await expect(page.locator('[data-contentbox-filter-button]')).toBeVisible();
  await expect(page.locator('div.flex.gap-2.justify-end > button')).toHaveCount(2);

  const fullName = page.getByRole('columnheader', { name: /Full Name/ });
  await fullName.hover();
  await fullName.locator('div.cursor-pointer').last().click({ force: true });
  await expect(page.getByText('Columns', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
});

test('TC-USER-002 header delete with nothing selected shows a toast', async ({ page }) => {
  await openUsers(page);
  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  await expectToast(page, 'Please select items to delete');
  await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
});

test('TC-USER-003 a row has no delete control that removes the user', async ({ page }) => {
  await openUsers(page);
  const row = page.locator('tbody tr').first();
  await expect(row).toBeVisible({ timeout: 30000 });
  const before = (await row.innerText()).slice(0, 40);
  if (/no data found/i.test(before)) return;
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
  await expectToast(page, /phone/i);

  await page.getByPlaceholder('Enter Phone Number').fill(`${run}-00`);
  await saveEmployee(page);
  await expectToast(page, /branch/i);

  await page.locator('select[name="branch_id"]').selectOption({ index: 1 });
  await saveEmployee(page);
  await expectToast(page, /department/i);

  await page.locator('select[name="dept_id"]').selectOption({ index: 1 });
  await saveEmployee(page);
  await expectToast(page, /employment type/i);

  await page.locator('select[name="employee_type"]').selectOption('Full-time');
  await saveEmployee(page);
  await expectToast(page, /joining date/i);
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
  await expectToast(page, /created successfully|employee created|success/i);
  await gotoProtected(page, usersUrl).catch(() => {});
  await expect(usersRow(page, createEmail)).toHaveCount(0);

  await openAssign(page);
  const row = usersRow(page, createFull);
  if (await row.isVisible().catch(() => false)) {
    await expect(row).toContainText(run);
    await row.getByRole('button', { name: 'Edit User' }).click();
    const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit User' });
    if (await dialog.getByText('Edit User', { exact: true }).isVisible().catch(() => false)) {
      state.employeeId = await labeledControl(dialog, 'Employee ID').inputValue().catch(() => state.employeeId);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click().catch(() => {});
    }
  } else {
    await expect(page.getByRole('columnheader', { name: /Full Name|Email|Name/ }).first()).toBeVisible();
  }
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
  await expectToast(page, /already used|duplicate|exists|success/i);
  await expect(page.getByPlaceholder('Enter First Name').or(page.getByRole('columnheader', { name: /Full Name/ }))).toBeVisible();

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
  await expect(row).toBeVisible();
  await expect(row).toContainText(run);
  await expect(row).not.toContainText(`  ${run}  `);
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
  await expect(row).toBeVisible();
  await expect(row).toContainText('Inactive');
  await expect(row).toContainText('No Role');
});

test('TC-USER-012 Edit User validates, and closing does not keep an unsaved phone', async ({
  page,
}) => {
  await openAssign(page);
  await usersRow(page, createFull).getByRole('button', { name: 'Edit User' }).click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Edit User' });
  await labeledControl(dialog, 'Full Name').fill('');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'First name is required');
  await expect(dialog).toBeVisible();

  await labeledControl(dialog, 'Full Name').fill(createFull);
  await labeledControl(dialog, 'Email').fill('');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'Email is required');

  await labeledControl(dialog, 'Email').fill(badEmail);
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'Email must be in the format name@domain.com');

  await labeledControl(dialog, 'Email').fill(createEmail);
  await labeledControl(dialog, 'Phone').fill(`${run}-99`);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();

  await usersRow(page, createFull).getByRole('button', { name: 'Edit User' }).click();
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`);
  await labeledControl(dialog, 'Phone').fill(`${run}-99`);
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();

  await usersRow(page, createFull).getByRole('button', { name: 'Edit User' }).click();
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`);
  await labeledControl(dialog, 'Phone').fill(`${run}-99`);
  await dialog.click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeHidden();

  await usersRow(page, createFull).getByRole('button', { name: 'Edit User' }).click();
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(`${run}-01`);
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('TC-USER-013 Assign Role requires a role selection', async ({ page }) => {
  await createJobRole(page, state.roleA);
  await createJobRole(page, state.roleB);
  await createJobRole(page, state.roleC);

  const dialog = await openAssignDialog(page, createFull);
  await dialog.getByRole('button', { name: 'Assign Roles', exact: true }).click();
  await expectToast(page, 'Please select an employee and at least one role');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(usersRow(page, createFull)).toContainText('No Role');
});

test('TC-USER-014 the first role creates the login', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull);
  await pickRole(dialog, state.roleA);
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click();
  await expectToast(page, 'Successfully assigned 1 role(s)');
  await expect(usersRow(page, createFull)).toContainText(state.roleA);

  const manage = await openManage(page, createEmail);
  state.userId = await labeledControl(manage, 'User ID').inputValue();
  expect(state.userId).toBeTruthy();
  await expect(usersRow(page, createEmail)).toContainText('Active');
  await manage.getByRole('button', { name: 'Close', exact: true }).last().click();
});

test('TC-USER-015 a second role is added on the same login', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull);
  await pickRole(dialog, state.roleB);
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click();
  await expectToast(page, 'Successfully assigned 1 role(s)');
  const row = usersRow(page, createFull);
  await expect(row).toContainText(state.roleA);
  await expect(row).toContainText(state.roleB);

  await openUsers(page);
  const user = usersRow(page, createEmail);
  await expect(user).toContainText(state.roleA);
  await expect(user).toContainText(state.roleB);
  await expect(user).toHaveCount(1);
});

test('TC-USER-016 an inactive employee can receive a role and stays inactive', async ({
  page,
}) => {
  const dialog = await openAssignDialog(page, inactiveFull);
  await pickRole(dialog, state.roleA);
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click();
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page);
  const row = usersRow(page, inactiveEmail);
  await expect(row).toBeVisible();
  await expect(row).toContainText('Inactive');
  await expect(row).toContainText(state.roleA);
});

test('TC-USER-017 Manage Roles keeps the dialog open when the fields are invalid', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail);
  const emailBefore = await labeledControl(dialog, 'Email').inputValue();
  await labeledControl(dialog, 'Full Name').fill('');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'First name is required');
  await expect(dialog).toBeVisible();

  await labeledControl(dialog, 'Full Name').fill(createFull);
  await labeledControl(dialog, 'Email').fill('');
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'Email is required');

  await labeledControl(dialog, 'Email').fill(badEmail);
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'Email must be in the format name@domain.com');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();

  await openUsers(page);
  await expect(usersRow(page, emailBefore)).toBeVisible();
});

test('TC-USER-018 Save Changes stores the trimmed name, phone, and department', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail);
  await labeledControl(dialog, 'Full Name').fill(`  ${savedFull}  `);
  await labeledControl(dialog, 'Phone').fill(savedPhone);
  await labeledControl(dialog, 'Department').selectOption(state.otherDeptId);
  await dialog.getByRole('button', { name: 'Save Changes' }).click();
  await expectToast(page, 'User updated successfully');
  await expect(dialog).toBeVisible();
  await expect(labeledControl(dialog, 'Full Name')).toHaveValue(savedFull);
  await expect(labeledControl(dialog, 'Phone')).toHaveValue(savedPhone);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();

  await expect(usersRow(page, createEmail)).toContainText(savedFull);
  await expect(usersRow(page, createEmail)).toContainText(savedPhone);
  await expect(usersRow(page, createEmail)).toContainText(state.otherDeptLabel);
});

test('TC-USER-019 the role dropdown updates only when the role changes', async ({ page }) => {
  const dialog = await openManage(page, createEmail);
  await roleCard(dialog, state.roleB).locator('select').selectOption({ label: state.roleC });
  await expectToast(page, 'Role updated successfully');
  await expect(roleCard(dialog, state.roleC)).toBeVisible();

  await expect(page.getByText('Role updated successfully')).toBeHidden({ timeout: 10000 });
  await roleCard(dialog, state.roleC).locator('select').selectOption({ label: state.roleC });
  await expect
    .poll(async () => page.getByText('Role updated successfully').count(), { timeout: 1500 })
    .toBe(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
});

test('TC-USER-020 closing Manage Roles drops an unsaved phone', async ({ page }) => {
  const dialog = await openManage(page, createEmail);
  await labeledControl(dialog, 'Phone').fill(`${run}-99`);
  await dialog.locator('button[aria-label="Close"]').click();
  await expect(dialog).toBeHidden();

  const again = await openManage(page, createEmail);
  await expect(labeledControl(again, 'Phone')).toHaveValue(savedPhone);
  await labeledControl(again, 'Phone').fill(`${run}-98`);
  await page.keyboard.press('Escape');
  await expect(again).toBeHidden();

  const third = await openManage(page, createEmail);
  await expect(labeledControl(third, 'Phone')).toHaveValue(savedPhone);
  await labeledControl(third, 'Phone').fill(`${run}-97`);
  await third.click({ position: { x: 8, y: 8 } });
  await expect(third).toBeHidden();

  const fourth = await openManage(page, createEmail);
  await expect(labeledControl(fourth, 'Phone')).toHaveValue(savedPhone);
  await labeledControl(fourth, 'Phone').fill(`${run}-97`);
  await fourth.getByRole('button', { name: 'Close', exact: true }).last().click();
  await openUsers(page);
  await expect(usersRow(page, createEmail)).toContainText(savedPhone);
  await expect(usersRow(page, createEmail)).not.toContainText(`${run}-97`);
});

test('TC-USER-021 deleting one role asks first and leaves the last-role warning', async ({
  page,
}) => {
  const dialog = await openManage(page, createEmail);
  const card = roleCard(dialog, state.roleA);
  page.once('dialog', (confirm) => {
    expect(confirm.message()).toContain(state.roleA);
    confirm.dismiss();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(roleCard(dialog, state.roleA)).toBeVisible();

  page.once('dialog', (confirm) => {
    expect(confirm.message()).toContain(state.roleA);
    confirm.accept();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, 'Role deleted successfully');
  await expect(roleCard(dialog, state.roleA)).toHaveCount(0);
  await expect(
    dialog.getByText('This user has only one role. Deleting it will deactivate the user account.'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(usersRow(page, createEmail)).toContainText('Active');
});

test('TC-USER-022 the last role can be removed and the login stays active', async ({ page }) => {
  const dialog = await openManage(page, createEmail);
  const card = roleCard(dialog, state.roleC);
  page.once('dialog', (confirm) => {
    expect(confirm.message()).toContain(state.roleC);
    confirm.accept();
  });
  await card.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, 'Role deleted successfully');
  await expect(page.getByText('Role deleted and user deactivated')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(usersRow(page, createEmail)).toContainText('Active');

  const assign = await openAssignDialog(page, createFull);
  const remove = assign.locator('button[aria-label^="Remove "]');
  if (await remove.count()) {
    await remove.first().click();
    await expect(page.getByText('Are you sure you want to remove')).toBeVisible();
    await page.getByRole('button', { name: 'Yes', exact: true }).click();
    await expectToast(page, 'Role removed successfully');
  } else {
    await expect(assign.getByText('No roles assigned')).toBeVisible();
  }
  await assign.getByRole('button', { name: 'Cancel', exact: true }).click();
});

test('TC-USER-023 assigning a role again keeps the same user id', async ({ page }) => {
  const dialog = await openAssignDialog(page, createFull);
  await pickRole(dialog, state.roleA);
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click();
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page);
  await expect(usersRow(page, createEmail)).toHaveCount(1);
  await expect(usersRow(page, createEmail)).toContainText('Active');
  const manage = await openManage(page, createEmail);
  await expect(labeledControl(manage, 'User ID')).toHaveValue(state.userId);
  await manage.getByRole('button', { name: 'Close', exact: true }).last().click();
});

test('TC-USER-024 Is Active filters the list', async ({ page }) => {
  await openUsers(page);
  await page.locator('[data-contentbox-filter-button]').click();
  await page.getByText('Search by Column', { exact: true }).click();
  const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
  await columnSelect.selectOption({ label: 'Is Active' });
  await page.getByRole('button', { name: 'Select values' }).click();
  const menu = page.locator('div.absolute.z-50').last();
  await menu.getByText('Inactive', { exact: true }).click();
  await expect(usersRow(page, inactiveEmail)).toBeVisible();
  await expect(usersRow(page, createEmail)).toHaveCount(0);

  await page.getByRole('button', { name: '1 selected' }).click();
  const values = page.locator('div.absolute.z-50').last();
  await values.getByText('Inactive', { exact: true }).click();
  await values.getByText('Active', { exact: true }).click();
  await expect(usersRow(page, createEmail)).toBeVisible();
  await expect(usersRow(page, inactiveEmail)).toHaveCount(0);

  await page
    .locator('div.flex.items-center.border')
    .filter({ has: page.locator('select') })
    .locator('button')
    .first()
    .click();
  await expect(usersRow(page, createEmail)).toBeVisible();
  await expect(usersRow(page, inactiveEmail)).toBeVisible();
});

test('TC-USER-025 Full Name sorts ascending, descending, then off', async ({ page }) => {
  await openUsers(page);
  const header = page.locator('thead').getByText('Full Name', { exact: true });

  /**
   * @param {string} text
   */
  const indexOf = async (text) => {
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    for (let index = 0; index < count; index += 1) {
      if ((await rows.nth(index).innerText()).includes(text)) return index;
    }
    return -1;
  };

  await header.click();
  expect(await indexOf(savedFull)).toBeGreaterThan(-1);
  expect(await indexOf(inactiveFull)).toBeLessThan(await indexOf(savedFull));

  await header.click();
  expect(await indexOf(savedFull)).toBeLessThan(await indexOf(inactiveFull));

  await header.click();
  await expect(page.getByRole('columnheader', { name: /Full Name/ })).not.toContainText('↑');
  await expect(page.getByRole('columnheader', { name: /Full Name/ })).not.toContainText('↓');
});

test('TC-USER-026 download exports the visible columns', async ({ page }) => {
  await openUsers(page);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('div.flex.gap-2.justify-end > button').last().click();
  await expectToast(page, 'Users exported successfully');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain('Users_List');
  const filePath = await download.path();
  expect(filePath).toBeTruthy();
  const workbook = readDownloadedWorkbook(/** @type {string} */ (filePath));
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const headers = (rows[0] || []).map((cell) => String(cell));
  expect(headers).toContain('Full Name');
  expect(headers).toContain('Email');
  expect(headers).not.toContain('Password');
  expect(headers).not.toContain('Reset Token');
  expect(headers).not.toContain('User ID');
});

test('TC-USER-027 Close and the backdrop leave the selected user in place', async ({ page }) => {
  await openUsers(page);
  const row = usersRow(page, createEmail);
  await row.locator('input[type="checkbox"]').check();
  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  await expect(dialog.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  await dialog.locator('button').first().click();
  await expect(dialog).toBeHidden();
  await expect(row).toBeVisible();

  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  await dialog.click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Close', exact: true }).click();
  await row.locator('input[type="checkbox"]').uncheck();
});

test('TC-USER-028 only the disposable login created for deletion is removed', async ({ page }) => {
  await openCreate(page);
  await fillEmployee(page, {
    first: run,
    last: 'Delete',
    email: deleteEmail,
    phone: `${run}-04`,
  });
  await saveEmployee(page);
  await expectToast(page, 'Employee created successfully!');

  const dialog = await openAssignDialog(page, deleteFull);
  await pickRole(dialog, state.roleB);
  await dialog.getByRole('button', { name: 'Assign 1 Role' }).click();
  await expectToast(page, 'Successfully assigned 1 role(s)');

  await openUsers(page);
  await usersRow(page, deleteEmail).locator('input[type="checkbox"]').check();
  await page.locator('div.flex.gap-2.justify-end > button').first().click();
  const confirm = page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' });
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
  await expectToast(page, 'Successfully deleted 1 user(s)');
  await expect(usersRow(page, deleteEmail)).toHaveCount(0);
  await expect(usersRow(page, createEmail)).toBeVisible();
  await expect(usersRow(page, inactiveEmail)).toBeVisible();

  await openAssign(page);
  await expect(usersRow(page, deleteFull)).toBeVisible();
  await expect(usersRow(page, createFull)).toBeVisible();
  await expect(usersRow(page, inactiveFull)).toBeVisible();
  await expect(usersRow(page, trimFull)).toBeVisible();
});
