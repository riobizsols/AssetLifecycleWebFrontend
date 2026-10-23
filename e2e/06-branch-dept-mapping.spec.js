// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { selectLoadedOrganization } from './helpers/screenAccess.js';

/**
 * One serial chain. The mapping saved for this run stays in the playwright tenant.
 * A removal case adds an extra mapping and removes only that mapping.
 * Departments are created by departments.spec.js. This file reuses one of those
 * departments and does not create another.
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const tail = stamp.slice(-7);
const run = `PW-BD-${stamp}`;
const linkBranchName = `${run} Link`;
const extraBranchName = `${run} Extra`;
const linkBranchCode = `B${tail}`;
const extraBranchCode = `X${tail}`;

/** @type {{ orgName: string, orgId: string, branchName: string, branchId: string, deptName: string, deptId: string, otherDeptName: string }} */
let existing = {
  orgName: '',
  orgId: '',
  branchName: '',
  branchId: '',
  deptName: '',
  deptId: '',
  otherDeptName: '',
};
/** @type {string} */
let linkBranchId = '';
/** @type {string} */
let extraBranchId = '';

test.describe('Branch – Department Mapping', () => {
  test('reuses a department and adds the branches this screen will link', async ({ page }) => {
    existing = await findDepartment(page);
    expect(existing.deptId).toMatch(/^DPT\d+/);
    expect(existing.orgId).toBeTruthy();
    linkBranchId = await createBranchOnOrg(page, linkBranchName, linkBranchCode, existing.orgId);
    extraBranchId = await createBranchOnOrg(page, extraBranchName, extraBranchCode, existing.orgId);
    expect(linkBranchId).toMatch(/^BR\d+/);
    expect(extraBranchId).toMatch(/^BR\d+/);
    expect(linkBranchId).not.toBe(extraBranchId);
  });

  test('maps the existing department onto the new branch and keeps that link', async ({ page }) => {
    await saveMapping(page, linkBranchId, existing.deptId);
    const row = mappingRow(page, linkBranchName, existing.deptName);
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(existing.orgId);
    await expect(row).toContainText(linkBranchId);
    await expect(row).toContainText(existing.deptId);
    if (!existing.orgName) {
      existing.orgName = (await row.locator('td').first().locator('div').first().innerText()).trim();
    }
    if (existing.branchId) {
      await expect(mappingRow(page, existing.branchName, existing.deptName)).toHaveCount(1);
    }
  });

  test('the list shows the title, columns, and the kept mapping', async ({ page }) => {
    await openList(page);
    await expect(page.getByText(/Map departments to branches/)).toBeVisible();
    await expect(page.getByTitle('Filter')).toBeVisible();
    await expect(page.getByTitle('Add Branch – Department Mapping')).toBeVisible();
    await expect(page.getByTitle('Download')).toHaveCount(0);

    for (const heading of ['Org', 'Branch', 'Department', 'Actions']) {
      await expect(page.getByRole('columnheader', { name: heading, exact: true })).toBeVisible();
    }
    await expect(page.locator('tbody input[type="checkbox"]')).toHaveCount(0);
    await expect(page.getByTitle('Edit')).toHaveCount(0);
    await expect(mappingRow(page, linkBranchName, existing.deptName).getByTitle('Remove')).toBeVisible();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
  });

  test('searches by branch, department, and organization, then clears the search', async ({ page }) => {
    await openList(page);
    await page.getByTitle('Filter').click();
    const search = page.getByPlaceholder('Branch, department, org...');
    await expect(search).toBeVisible();
    await expect(search).toHaveValue('');
    await closeSearchPanel(page);
    await expect(search).toBeHidden();
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();

    await searchFor(page, linkBranchName.toLowerCase());
    await expect(page.getByTitle('Filter')).toHaveClass(/bg-yellow-500/);
    await expect(page.locator('tbody tr')).toHaveCount(1);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();

    await searchFor(page, linkBranchId);
    await expect(page.locator('tbody tr')).toHaveCount(1);

    await searchFor(page, existing.deptName.toLowerCase());
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();
    if (existing.otherDeptName) {
      await expect(page.locator('tbody tr').filter({ hasText: existing.otherDeptName })).toHaveCount(0);
    }

    await searchFor(page, existing.deptId);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();

    if (existing.orgName) {
      await searchFor(page, existing.orgName);
      await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();
    }
    await searchFor(page, existing.orgId);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();

    await searchFor(page, 'ZZZ-NOT-A-MAPPING');
    await expect(page.getByText('No branch-department mappings found')).toBeVisible();
    await expect(page.getByTitle('Filter')).toHaveClass(/bg-yellow-500/);

    await searchFor(page, '');
    await expect(page.getByTitle('Filter')).toHaveClass(/bg-\[#0E2F4B\]/);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Branch', exact: true })).toBeVisible();
  });

  test('closing the search panel keeps the text and the filtered list', async ({ page }) => {
    await openList(page);
    await searchFor(page, linkBranchId);
    await closeSearchPanel(page);
    await expect(page.getByTitle('Filter')).toHaveClass(/bg-yellow-500/);
    await expect(page.locator('tbody tr')).toHaveCount(1);

    await page.getByTitle('Filter').click();
    await expect(page.getByPlaceholder('Branch, department, org...')).toHaveValue(linkBranchId);
    await searchFor(page, '');
    await closeSearchPanel(page);
  });

  test('add requires a branch before a department can be chosen', async ({ page }) => {
    await openList(page);
    await openAdd(page);
    const dialog = addDialog(page);
    const branchSelect = dialog.locator('select').nth(0);
    const deptSelect = dialog.locator('select').nth(1);
    await expect(deptSelect).toBeDisabled();

    const branchLabels = await branchSelect.locator('option').allInnerTexts();
    expect(branchLabels.some((label) => label.includes(linkBranchName) && label.includes(existing.orgId))).toBeTruthy();
    expect(branchLabels.some((label) => label.includes(extraBranchName) && label.includes(existing.orgId))).toBeTruthy();

    await branchSelect.selectOption(linkBranchId);
    await expect(deptSelect).toBeEnabled();
    const deptLabels = await deptSelect.locator('option').allInnerTexts();
    expect(deptLabels.some((label) => label.includes(existing.deptName) && label.includes(existing.orgId))).toBeTruthy();

    await deptSelect.selectOption(existing.deptId);
    await branchSelect.selectOption(extraBranchId);
    await expect(deptSelect).toHaveValue('');

    await branchSelect.selectOption('');
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(await branchSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity())).toBeTruthy();

    await branchSelect.selectOption(extraBranchId);
    await dialog.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(dialog).toBeVisible();
    expect(await deptSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity())).toBeTruthy();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
  });

  test('saving the same pair again leaves a single row', async ({ page }) => {
    await saveMapping(page, linkBranchId, existing.deptId);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1);
  });

  test('cancel, the X, and the dimmed area do not add a mapping', async ({ page }) => {
    await openList(page);
    await openAdd(page);
    await choosePair(page, extraBranchId, existing.deptId);
    await addDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);

    await openAdd(page);
    await choosePair(page, extraBranchId, existing.deptId);
    await addDialog(page).locator('h2').locator('xpath=following-sibling::button').click();
    await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toHaveCount(0);
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);

    await openAdd(page);
    await choosePair(page, extraBranchId, existing.deptId);
    await addDialog(page).click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toHaveCount(0);
    await openAdd(page);
    await expect(addDialog(page).locator('select').nth(0)).toHaveValue('');
    await addDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
  });

  test('cancelling remove leaves the extra mapping', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId);
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1);

    await answerRemove(page, extraBranchName, existing.deptName, false);
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1);
    await expect(page.getByText('Mapping removed')).toHaveCount(0);
  });

  test('removes only the extra mapping', async ({ page }) => {
    await openList(page);
    await answerRemove(page, extraBranchName, existing.deptName, true);
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click();
    await expect(page.getByText('Mapping removed')).toBeVisible();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1);
    if (existing.branchId) {
      await expect(mappingRow(page, existing.branchName, existing.deptName)).toHaveCount(1);
    }
  });

  test('the new branches and the reused department are still on their own screens', async ({ page }) => {
    await gotoProtected(page, `${BASE}/master-data/branches`);
    await expect(page.getByRole('columnheader', { name: 'Branch Name', exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('cell', { name: linkBranchName, exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: extraBranchName, exact: true })).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/departments`);
    await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(existing.deptName, { exact: true })).toBeVisible();
  });

  test('adds the extra mapping again and removes only that row', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId);
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1);
    await answerRemove(page, extraBranchName, existing.deptName, true);
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click();
    await expect(page.getByText('Mapping removed')).toBeVisible();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1);
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function findDepartment(page) {
  const mappingWait = page.waitForResponse((res) =>
    res.request().method() === 'GET' && /\/branch-dept-mappings\/?$/.test(new URL(res.url()).pathname));
  await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
  await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 45000 });
  const mappingBody = await (await mappingWait).json();
  const mappings = Array.isArray(mappingBody?.data) ? mappingBody.data : [];
  const preferred = mappings.find((row) => String(row.dept_name || '').startsWith('PW-DEPT-')) || mappings[0];
  if (preferred?.dept_id && preferred?.org_id) {
    const other = mappings.find((row) => row.dept_id !== preferred.dept_id);
    return {
      orgName: String(preferred.org_name || ''),
      orgId: String(preferred.org_id),
      branchName: String(preferred.branch_name || ''),
      branchId: String(preferred.branch_id || ''),
      deptName: String(preferred.dept_name || preferred.dept_id),
      deptId: String(preferred.dept_id),
      otherDeptName: String(other?.dept_name || ''),
    };
  }

  const deptWait = page.waitForResponse((res) =>
    res.request().method() === 'GET' && /\/departments\/?$/.test(new URL(res.url()).pathname));
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
  const deptBody = await (await deptWait).json();
  const departments = Array.isArray(deptBody) ? deptBody : Array.isArray(deptBody?.data) ? deptBody.data : [];
  const dept = departments.find((row) => String(row.text || '').startsWith('PW-DEPT-')) || departments[0];
  if (!dept?.dept_id || !dept?.org_id) {
    throw new Error('No department is available. departments.spec.js creates the department this screen maps.');
  }
  const other = departments.find((row) => row.dept_id !== dept.dept_id);
  return {
    orgName: '',
    orgId: String(dept.org_id),
    branchName: '',
    branchId: '',
    deptName: String(dept.text || dept.dept_id),
    deptId: String(dept.dept_id),
    otherDeptName: String(other?.text || ''),
  };
}

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
  await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole('columnheader', { name: 'Branch', exact: true })
      .or(page.getByText('No branch-department mappings found'))
  ).toBeVisible();
}

/** @param {import('@playwright/test').Page} page */
function addDialog(page) {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading', { name: 'Add Branch – Department Mapping' }),
  }).last();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branchName
 * @param {string} deptName
 */
function mappingRow(page, branchName, deptName) {
  return page.getByRole('row').filter({ hasText: branchName }).filter({ hasText: deptName });
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await page.getByTitle('Add Branch – Department Mapping').click();
  await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branch
 * @param {string} dept
 */
async function choosePair(page, branch, dept) {
  const dialog = addDialog(page);
  await dialog.locator('select').nth(0).selectOption(branch);
  const deptSelect = dialog.locator('select').nth(1);
  await expect(deptSelect).toBeEnabled();
  await expect(deptSelect.locator(`option[value="${dept}"]`).first()).toBeAttached({ timeout: 20000 });
  await deptSelect.selectOption({ value: dept });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branch
 * @param {string} dept
 */
async function saveMapping(page, branch, dept) {
  await openList(page);
  await openAdd(page);
  await choosePair(page, branch, dept);
  await addDialog(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Mapping saved successfully')).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branchName
 * @param {string} deptName
 * @param {boolean} accept
 */
async function answerRemove(page, branchName, deptName, accept) {
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toBe(`Remove mapping between ${branchName} and ${deptName}?`);
    if (accept) await dialog.accept();
    else await dialog.dismiss();
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function searchFor(page, text) {
  const search = page.getByPlaceholder('Branch, department, org...');
  if (!(await search.isVisible())) {
    await page.getByTitle('Filter').click();
  }
  await search.fill(text);
}

/** @param {import('@playwright/test').Page} page */
async function closeSearchPanel(page) {
  await page.locator('div.absolute.left-0.top-12').getByRole('button').click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} code
 * @param {string} organizationId
 */
async function createBranchOnOrg(page, name, code, organizationId) {
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  const response = page.waitForResponse((res) =>
    res.request().method() === 'POST' && /\/branches\/?$/.test(new URL(res.url()).pathname));
  await selectLoadedOrganization(page, organizationId);
  await page.locator('input[name="text"]').fill(name);
  await page.locator('input[name="branch_code"]').fill(code);
  await page.locator('input[name="city"]').fill('Chennai');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const body = await (await response).json();
  await expect(page.getByText('Branch created successfully!')).toBeVisible({ timeout: 60000 });
  return String(body.branch_id || '');
}
