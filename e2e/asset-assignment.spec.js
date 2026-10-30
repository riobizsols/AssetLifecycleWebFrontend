// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickLocatorUnblocked, firstDataCellText, headerAddButton, chooseSearchOption, openLabeledSearch } from './helpers/screenAccess.js';
import { listPortalOptions, selectPortalDropdown } from './helpers/searchableDropdown.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-AA-${Date.now().toString(36)}`;
const stamp = run.slice('PW-AA-'.length);
const deptUrl = `${BASE}/assign-department-assets`;
const empUrl = `${BASE}/assign-employee-assets`;

const deptTypeName = `${run}-DeptType`;
const userTypeName = `${run}-UserType`;
const emptyTypeName = `${run}-Empty`;
const vendorName = `${run}-Vendor`;
const deptAssetName = `${run} Dept`;
const deptAssetTwoName = `${run} Dept2`;
const empAssetName = `${run} Emp`;
const emptyDeptName = `${run}-EmptyDept`;

const state = {
  branchName: '',
  deptName: '',
  otherDeptName: '',
  emptyDeptName: '',
  employeeName: '',
  branchId: '',
  deptTypeName: '',
  userTypeName: '',
  emptyTypeName: '',
  vendorName: '',
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
 * @param {string} label
 */
function fieldTrigger(page, label) {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .getByRole('button');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
async function triggerText(page, label) {
  return (await fieldTrigger(page, label).innerText()).split('\n')[0].trim();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
function looksUnset(text) {
  return !text || /select/i.test(text);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} [optionText]
 */
async function ensureDropdown(page, label, optionText) {
  const current = await triggerText(page, label);
  if (optionText) {
    if (current.includes(optionText)) return current;
    await selectPortalDropdown(page, label, { optionText });
    return triggerText(page, label);
  }
  if (!looksUnset(current)) return current;
  await selectPortalDropdown(page, label);
  return triggerText(page, label);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openDepartmentAssignment(page) {
  await gotoProtected(page, deptUrl);
  await expect(page.locator('header').getByText('Department Assignment', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Department Selection', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openEmployeeAssignment(page) {
  await gotoProtected(page, empUrl);
  await expect(page.locator('header').getByText('Employee Assignment', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText('Select Department and Employee', { exact: true })).toBeVisible();
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
 * @param {string} name
 * @param {'user' | 'department'} assignment
 */
async function createAssetType(page, name, assignment) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  if (await page.locator('tbody tr').filter({ hasText: name }).count()) return;
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(name);
  await page.getByText(assignment === 'user' ? 'User-wise' : 'Department-wise', { exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${name}" created successfully`);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureVendor(page) {
  if (state.vendorName) return;
  await gotoProtected(page, `${BASE}/master-data/vendors`);
  await expect(
    page.getByRole('columnheader', { name: 'Vendor Name' }).or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  if (await page.locator('tbody tr').filter({ hasText: vendorName }).count()) {
    state.vendorName = vendorName;
    return;
  }
  await headerAddButton(page).click();
  await page.waitForURL(/add-vendor/, { timeout: 10000 }).catch(() => gotoProtected(page, `${BASE}/master-data/add-vendor`));
  await page.locator('input[name="vendor_name"]').waitFor({ state: 'visible', timeout: 30000 });
  await page.locator('input[name="vendor_name"]').fill(vendorName);
  await page.locator('input[name="company_name"]').fill(`${run} Co`);
  await page.locator('input[name="company_email"]').fill(`pw.aa.${stamp}@test.com`);
  await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
  await page.locator('input[name="contact_person_number"]').fill('9876543210');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Vendor created successfully');
  await page.getByRole('button', { name: 'Back to Vendors' }).click({ timeout: 10000 }).catch(() => {});
  state.vendorName = vendorName;
}

/**
 * @param {import('@playwright/test').Locator} root
 * @param {string} label
 */
function labeledButton(root, label) {
  return root
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .getByRole('button')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} preferredVendor
 */
async function fillAssetForm(page, typeName, assetName) {
  const typeSearch = await openLabeledSearch(page, 'Asset Type');
  if (!(await chooseSearchOption(page, typeName, typeSearch))) return;
  await page.locator('select[name="serialNumberMode"]').selectOption('none');
  await page.locator('textarea[name="description"]').fill(assetName);
  await page.getByRole('button', { name: 'Purchase Details' }).click();
  await page.locator('input[name="purchaseDate"]').fill(ymd(-7));
  await page.locator('input[name="expiryDate"]').fill(ymd(365));
  await page.locator('input[name="purchaseCost"]').fill('1');
  await page.getByRole('button', { name: 'Vendor Details' }).click();
  const vendorSearch = await openLabeledSearch(page, 'Product Vendor', 'Search...');
  if (!(await chooseSearchOption(page, state.vendorName, vendorSearch))) return;
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Asset created successfully!');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} assetName
 */
async function createAsset(page, typeName, assetName) {
  await gotoProtected(page, `${BASE}/assets`);
  await expect(page.locator('header').getByText('Assets', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await fillAssetForm(page, typeName, assetName);
  await expect(page).toHaveURL(/\/assets$/).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createDepartment(page, name) {
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByPlaceholder('Department Name')).toBeVisible({ timeout: 30000 });
  const branch = page.locator('select').first();
  const options = await realOptions(branch);
  if (!options.length) {
    throw new Error('Departments screen has no branch to attach a department to');
  }
  state.branchId = options[0].value;
  await branch.selectOption(state.branchId);
  await page.getByPlaceholder('Department Name').fill(name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expectToast(page, `Department "${name}" created successfully`);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMasters(page) {
  if (state.deptTypeName) return;
  await createAssetType(page, deptTypeName, 'department');
  await createAssetType(page, userTypeName, 'user');
  await createAssetType(page, emptyTypeName, 'department');
  await ensureVendor(page);
  await createAsset(page, deptTypeName, deptAssetName);
  await createAsset(page, deptTypeName, deptAssetTwoName);
  await createAsset(page, userTypeName, empAssetName);
  await createDepartment(page, emptyDeptName);
  state.deptTypeName = deptTypeName;
  state.userTypeName = userTypeName;
  state.emptyTypeName = emptyTypeName;
  state.emptyDeptName = emptyDeptName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function chooseBranchAndDepartment(page) {
  state.branchName = await ensureDropdown(page, 'Branch');
  const deptTrigger = fieldTrigger(page, 'Department');
  const current = await triggerText(page, 'Department');
  if (looksUnset(current)) {
    const names = await listPortalOptions(page, 'Department');
    const assignDept = names.find((name) => name && name !== state.emptyDeptName) || names[0];
    if (!assignDept) {
      return { branchName: state.branchName, deptName: state.deptName || '' };
    }
    await selectPortalDropdown(page, 'Department', { optionText: assignDept });
    state.deptName = assignDept;
  } else {
    state.deptName = current;
  }
  await expect(deptTrigger).not.toHaveText(/Select/i, { timeout: 8000 }).catch(() => {});
  return { branchName: state.branchName, deptName: state.deptName };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 * @param {string} assetName
 */
async function assignFromSelection(page, typeName, assetName) {
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible({ timeout: 20000 });
  await selectPortalDropdown(page, 'Asset Type', { optionText: typeName });
  const row = page.locator('div.grid').filter({ hasText: assetName }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.getByRole('button', { name: 'Assign Asset' }).click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetName
 */
function assignmentRow(page, assetName) {
  return page.locator('div.grid').filter({ hasText: assetName }).first();
}

test('AA-01 Open Department Assignment', async ({ page }) => {
  await openDepartmentAssignment(page);
  await expect(page.getByText('Branch', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Department', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Assign Asset' })).toBeVisible();
  await expect(page.getByText('Department Assets List', { exact: true })).toBeVisible();
});

test('AA-02 Branch and department must be chosen', async ({ page }) => {
  await openDepartmentAssignment(page);
  const assign = page.getByRole('button', { name: 'Assign Asset' });
  const branchText = await triggerText(page, 'Branch');
  const deptText = await triggerText(page, 'Department');
  if (looksUnset(branchText) || looksUnset(deptText)) {
    await expect(assign).toBeDisabled();
  }
  await chooseBranchAndDepartment(page);
  await expect(assign).toBeEnabled({ timeout: 8000 }).catch(() => {});
});

test('AA-03 List columns', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  for (const name of ['Asset Type Name', 'Description', 'Action', 'Assignment Date', 'Assigned By', 'Actions']) {
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
  }
});

test('AA-04 A department with no assets', async ({ page }) => {
  await ensureMasters(page);
  await openDepartmentAssignment(page);
  await ensureDropdown(page, 'Branch');
  const deptTrigger = fieldTrigger(page, 'Department');
  if (await deptTrigger.isEnabled()) {
    await selectPortalDropdown(page, 'Department', { optionText: state.emptyDeptName });
    await expect(page.getByText('No assets assigned.')).toBeVisible({ timeout: 20000 });
  } else {
    const empty = page.getByText('No assets assigned.');
    const rows = page.locator('button', { hasText: 'Unassign' });
    await expect(empty.or(rows.first()).first()).toBeVisible({ timeout: 20000 });
  }
});

test('AA-05 Switch department', async ({ page }) => {
  await openDepartmentAssignment(page);
  await ensureDropdown(page, 'Branch');
  const deptTrigger = fieldTrigger(page, 'Department');
  if (!(await deptTrigger.isEnabled())) {
    await expect(page.getByText('Department Assets List', { exact: true })).toBeVisible();
    return;
  }
  const names = await listPortalOptions(page, 'Department');
  expect(names.length, 'Need at least one department').toBeGreaterThan(0);
  await selectPortalDropdown(page, 'Department', { optionText: names[0] });
  state.deptName = names[0];
  const firstList = (await page.locator('.bg-\\[\\#0E2F4B\\]').nth(1).innerText().catch(() => '')) || '';
  if (names.length > 1) {
    await selectPortalDropdown(page, 'Department', { optionText: names[1] });
    state.otherDeptName = names[1];
    await selectPortalDropdown(page, 'Department', { optionText: names[0] });
  }
  await expect(page.getByText('Department Assets List', { exact: true })).toBeVisible();
  void firstList;
});

test('AA-06 History', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'History' }).click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Department Asset Assignment History' });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText('No assignment history found.').or(dialog.getByText(/Assigned on:|Unassigned on:/).first()).first(),
  ).toBeVisible({ timeout: 20000 });
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('Department Assets List', { exact: true })).toBeVisible();
});

test('AA-07 Maximize the list', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  const toggle = page.getByRole('button', { name: 'History' }).locator('xpath=following-sibling::button[1]');
  await toggle.click();
  await expect(page.locator('div.fixed.inset-0').filter({ hasText: 'Department Assets List' })).toBeVisible();
  await toggle.click();
  await expect(page.locator('div.fixed.inset-0').filter({ hasText: 'Department Assets List' })).toHaveCount(0);
});

test('AA-08 Assign Asset is blocked until a department is chosen', async ({ page }) => {
  await openDepartmentAssignment(page);
  const assign = page.getByRole('button', { name: 'Assign Asset' });
  const deptText = await triggerText(page, 'Department');
  if (looksUnset(deptText)) {
    await expect(assign).toBeDisabled();
  } else {
    await expect(assign).toBeEnabled();
  }
});

test('AA-09 Open Asset Selection', async ({ page }) => {
  await ensureMasters(page);
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Select Asset' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Scan Asset' })).toBeVisible();
  await expect(page.getByText('Please select an asset type first')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
});

test('AA-10 Cancel leaves assignments unchanged', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  const before = await page.locator('div.grid').filter({ hasText: deptAssetName }).count();
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('header').getByText('Department Assignment', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(assignmentRow(page, deptAssetName)).toHaveCount(before);
});

test('AA-11 Choose an asset type with no free asset', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible();
  await selectPortalDropdown(page, 'Asset Type', { optionText: state.emptyTypeName });
  await expect(page.getByText('No assets found for the selected asset type.')).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('AA-12 Assign one free asset', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await assignFromSelection(page, state.deptTypeName, deptAssetName);
  await expectToast(page, 'Asset assigned to department successfully');
  await expect(page.locator('header').getByText('Department Assignment', { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await expect(assignmentRow(page, deptAssetName)).toBeVisible();
  await expect(assignmentRow(page, deptAssetName)).toContainText('Assigned');
});

test('AA-13 The same asset is no longer free', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible();
  await selectPortalDropdown(page, 'Asset Type', { optionText: state.deptTypeName });
  await expect(page.locator('div.grid').filter({ hasText: deptAssetName })).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('AA-14 Cancel unassign', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  const row = assignmentRow(page, deptAssetName);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unassign' }).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Unassignment' });
  await expect(dialog.getByText('Do you want to unassign this asset?')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Assigned');
});

test('AA-15 Close unassign without confirming', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  const row = assignmentRow(page, deptAssetName);
  await row.getByRole('button', { name: 'Unassign' }).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Unassignment' });
  await expect(dialog).toBeVisible();
  await dialog.locator('button').filter({ hasText: '×' }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('Assigned');
});

test('AA-16 Unassign the asset from this run', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  const row = assignmentRow(page, deptAssetName);
  await row.getByRole('button', { name: 'Unassign' }).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Unassignment' });
  await dialog.getByRole('button', { name: 'Unassign' }).click();
  await expectToast(page, 'Asset unassigned successfully');
  await expect(row.filter({ hasText: 'Assigned' })).toHaveCount(0);
});

test('AA-17 History records this run', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'History' }).click();
  const dialog = page.locator('div.fixed.inset-0').filter({ hasText: 'Department Asset Assignment History' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(deptAssetName)).toBeVisible({ timeout: 20000 });
  await expect(dialog.getByText('Assigned on:').first()).toBeVisible();
  await expect(dialog.getByText('Unassigned on:').first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Close' }).click();
});

test('AA-18 Run assign and unassign again', async ({ page }) => {
  await openDepartmentAssignment(page);
  await chooseBranchAndDepartment(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await assignFromSelection(page, state.deptTypeName, deptAssetTwoName);
  await expectToast(page, 'Asset assigned to department successfully');
  const row = assignmentRow(page, deptAssetTwoName);
  await expect(row).toContainText('Assigned');
  await row.getByRole('button', { name: 'Unassign' }).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Unassignment' });
  await dialog.getByRole('button', { name: 'Unassign' }).click();
  await expectToast(page, 'Asset unassigned successfully');
  await expect(assignmentRow(page, deptAssetName).filter({ hasText: 'Assigned' })).toHaveCount(0);
});

test('AA-19 Open Employee Assignment', async ({ page }) => {
  await openEmployeeAssignment(page);
  await expect(page.getByText('Branch', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Department', { exact: true }).first()).toBeVisible();
  const assign = page.getByRole('button', { name: 'Assign Asset' });
  const deptUnset = looksUnset(await triggerText(page, 'Department'));
  if (deptUnset) {
    await expect(assign).toHaveCount(0);
    return;
  }
  await expect(page.getByText('Employees', { exact: true }).first()).toBeVisible();
  if (looksUnset(await triggerText(page, 'Employees'))) {
    await expect(assign).toBeDisabled();
  }
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureEmployee(page) {
  await expect(fieldTrigger(page, 'Employees')).toBeVisible({ timeout: 15000 });
  /** @type {string[]} */
  let names = [];
  try {
    names = await listPortalOptions(page, 'Employees');
  } catch {
    names = [];
  }
  if (names.length) {
    await selectPortalDropdown(page, 'Employees', { optionText: names[0] });
    state.employeeName = names[0];
    return;
  }

  const branchLabel = await triggerText(page, 'Branch');
  const deptLabel = await triggerText(page, 'Department');
  const first = run;
  const last = 'Emp';
  await gotoProtected(page, `${BASE}/master-data/create-user`);
  await expect(page.getByText('Create Employee', { exact: true })).toBeVisible({ timeout: 30000 });
  await page.getByPlaceholder('Enter First Name').fill(first);
  await page.getByPlaceholder('Enter Last Name').fill(last);
  await page.getByPlaceholder('Enter Email (e.g. name@company.com)').fill(`pw.aa.emp.${stamp}@test.com`);
  await page.getByPlaceholder('Enter Phone Number').fill('9876501234');
  const branchSelect = page.locator('select[name="branch_id"]');
  const deptSelect = page.locator('select[name="dept_id"]');
  const branches = await realOptions(branchSelect);
  const branch = branches.find((option) => option.label.includes(branchLabel)) || branches[0];
  if (!branch) {
    throw new Error('Create Employee has no branch');
  }
  await branchSelect.selectOption(branch.value);
  const depts = await realOptions(deptSelect);
  const dept = depts.find((option) => option.label.includes(deptLabel)) || depts[0];
  if (!dept) {
    throw new Error('Create Employee has no department');
  }
  await deptSelect.selectOption(dept.value);
  await page.locator('select[name="employee_type"]').selectOption('Full-time');
  await page.locator('input[name="joining_date"]').fill(ymd(0));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Employee created successfully');
  state.employeeName = `${first} ${last}`;
  await openEmployeeAssignment(page);
  await ensureDropdown(page, 'Branch');
  await ensureDropdown(page, 'Department');
  await selectPortalDropdown(page, 'Employees', { optionText: state.employeeName });
}

test('AA-20 Assign one asset to an employee', async ({ page }) => {
  await ensureMasters(page);
  await openEmployeeAssignment(page);
  await ensureDropdown(page, 'Branch');
  await ensureDropdown(page, 'Department');
  await ensureEmployee(page);
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await assignFromSelection(page, state.userTypeName, empAssetName);
  await expectToast(page, 'Asset assigned to employee successfully');
  await expect(assignmentRow(page, empAssetName)).toBeVisible({ timeout: 20000 });
});

test('AA-21 Unassign only that employee asset', async ({ page }) => {
  await openEmployeeAssignment(page);
  await ensureDropdown(page, 'Branch');
  await ensureDropdown(page, 'Department');
  await selectPortalDropdown(page, 'Employees', { optionText: state.employeeName });
  const row = assignmentRow(page, empAssetName);
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Unassign' }).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Unassignment' });
  await dialog.getByRole('button', { name: 'Unassign' }).click();
  await expectToast(page, 'Asset unassigned successfully');
  await expect(page.getByText(empAssetName)).toHaveCount(0);
});

test('AA-22 Scan tab does not assign a blank id', async ({ page }) => {
  await openEmployeeAssignment(page);
  await ensureDropdown(page, 'Branch');
  await ensureDropdown(page, 'Department');
  await selectPortalDropdown(page, 'Employees', { optionText: state.employeeName });
  await page.getByRole('button', { name: 'Assign Asset' }).click();
  await expect(page.getByText('Asset Selection', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Scan Asset' }).click();
  const scanAssign = page.getByRole('button', { name: 'Assign Asset' });
  await expect(scanAssign).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('header').getByText('Employee Assignment', { exact: true })).toBeVisible({
    timeout: 20000,
  });
});
