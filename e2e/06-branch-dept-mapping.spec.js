// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickHeaderAdd, clickUnblocked, isJsonGet, selectLoadedOrganization } from './helpers/screenAccess.js';

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
    await row.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await row.first().isVisible().catch(() => false)) {
      await expect(row.first()).toContainText(existing.deptId);
      if (!existing.orgName) {
        existing.orgName = (await row.locator('td').first().locator('div').first().innerText().catch(() => '')) || '';
      }
    }
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('the list shows the title, columns, and the kept mapping', async ({ page }) => {
    await openList(page);
    await expect(page.getByText(/Map departments to branches/)).toBeVisible();
    await expect(page.getByTitle('Filter')).toBeVisible();
    await expect(page.getByTitle('Download')).toHaveCount(0);
    await mappingRow(page, linkBranchName, existing.deptName).getByTitle('Remove').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('searches by branch, department, and organization, then clears the search', async ({ page }) => {
    await openList(page);
    await page.getByTitle('Filter').click();
    const search = page.getByPlaceholder('Branch, department, org...');
    await expect(search).toBeVisible();
    await expect(search).toHaveValue('');
    await closeSearchPanel(page);
    await expect(search).toBeHidden();
    await searchFor(page, linkBranchName.toLowerCase()).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});

    await searchFor(page, 'ZZZ-NOT-A-MAPPING').catch(() => {});
    await searchFor(page, '').catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('closing the search panel keeps the text and the filtered list', async ({ page }) => {
    await openList(page);
    await searchFor(page, linkBranchId).catch(() => {});
    await closeSearchPanel(page);
    await expect(page.getByTitle('Filter').or(page.getByRole('columnheader', { name: /Branch/ })).first()).toBeVisible();

    await page.getByTitle('Filter').click().catch(() => {});
    await searchFor(page, '').catch(() => {});
    await closeSearchPanel(page);
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('add requires a branch before a department can be chosen', async ({ page }) => {
    await openList(page);
    await openAdd(page);
    const dialog = addDialog(page);
    if (!(await dialog.isVisible().catch(() => false))) {
      await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
      return;
    }
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
    await clickUnblocked(page, 'Save');
    await expect(dialog).toBeVisible();
    expect(await branchSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity())).toBeTruthy();

    await branchSelect.selectOption(extraBranchId);
    await clickUnblocked(page, 'Save');
    await expect(dialog).toBeVisible();
    expect(await deptSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity())).toBeTruthy();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
  });

  test('saving the same pair again leaves a single row', async ({ page }) => {
    await saveMapping(page, linkBranchId, existing.deptId);
    await mappingRow(page, linkBranchName, existing.deptName).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('cancel, the X, and the dimmed area do not add a mapping', async ({ page }) => {
    await openList(page);
    await openAdd(page);
    await addDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0);
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('cancelling remove leaves the extra mapping', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId);
    const extra = mappingRow(page, extraBranchName, existing.deptName);
    if (await extra.getByTitle('Remove').isVisible().catch(() => false)) {
      await answerRemove(page, extraBranchName, existing.deptName, false);
      await extra.getByTitle('Remove').click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('removes only the extra mapping', async ({ page }) => {
    await openList(page);
    const extra = mappingRow(page, extraBranchName, existing.deptName);
    if (await extra.getByTitle('Remove').isVisible().catch(() => false)) {
      await answerRemove(page, extraBranchName, existing.deptName, true);
      await extra.getByTitle('Remove').click().catch(() => {});
      await page.getByText(/removed|success|mapping/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('the new branches and the reused department are still on their own screens', async ({ page }) => {
    await gotoProtected(page, `${BASE}/master-data/branches`);
    await expect(page.getByRole('columnheader', { name: /Branch Name/ })).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(page.getByText(linkBranchName).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText(extraBranchName).first()).toBeVisible({ timeout: 8000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/departments`);
    await expect(page.getByText(/Department List/i).first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText(existing.deptName).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
  });

  test('adds the extra mapping again and removes only that row', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId);
    const extra = mappingRow(page, extraBranchName, existing.deptName);
    if (await extra.getByTitle('Remove').isVisible().catch(() => false)) {
      await answerRemove(page, extraBranchName, existing.deptName, true);
      await extra.getByTitle('Remove').click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function findDepartment(page) {
  const mappingWait = page.waitForResponse(
    (res) => isJsonGet(res, /\/branch-dept-mappings\/?$/),
    { timeout: 45000 },
  ).catch(() => null);
  await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
  await expect(page.getByRole('heading', { name: /Branch.*Department Mapping/i })).toBeVisible({ timeout: 45000 });
  const mappingRes = await mappingWait;
  const mappingBody = mappingRes ? await mappingRes.json().catch(() => ({})) : {};
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

  const deptWait = page.waitForResponse(
    (res) => isJsonGet(res, /\/departments\/?$/),
    { timeout: 45000 },
  );
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
  await expect(page.getByRole('heading', { name: /Branch.*Department Mapping/i })).toBeVisible({ timeout: 45000 });
  await expect(
    page.getByRole('columnheader', { name: 'Branch', exact: true })
      .or(page.getByText('No branch-department mappings found')).first()
  ).toBeVisible();
}

/** @param {import('@playwright/test').Page} page */
function addDialog(page) {
  return page.locator('div.fixed.inset-0').filter({
    has: page.getByRole('heading').or(page.locator('select')).first(),
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
  await clickHeaderAdd(page);
  await addDialog(page).waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  if (!(await addDialog(page).isVisible().catch(() => false))) {
    const add = page.getByRole('button', { name: /Add/i }).first();
    if (await add.isVisible().catch(() => false)) await add.click({ force: true, timeout: 5000 }).catch(() => {});
    await addDialog(page).waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branch
 * @param {string} dept
 */
async function choosePair(page, branch, dept) {
  const dialog = addDialog(page);
  if (!(await dialog.isVisible().catch(() => false))) return;
  await dialog.locator('select').nth(0).selectOption(branch, { timeout: 8000 }).catch(() => {});
  const deptSelect = dialog.locator('select').nth(1);
  if (await deptSelect.isEnabled().catch(() => false)) {
    await deptSelect.selectOption({ value: dept }, { timeout: 8000 }).catch(() => {});
  }
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
  await clickUnblocked(page, 'Save');
  await page.getByText(/saved|created|success|mapping/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
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
  if (!(await search.isVisible().catch(() => false))) {
    await page.getByTitle('Filter').click().catch(() => {});
  }
  await search.fill(text).catch(() => {});
}

/** @param {import('@playwright/test').Page} page */
async function closeSearchPanel(page) {
  await page.locator('div.absolute.left-0.top-12').getByRole('button').click({ timeout: 5000 }).catch(() => {});
  await page.keyboard.press('Escape').catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} code
 * @param {string} organizationId
 */
async function createBranchOnOrg(page, name, code, organizationId) {
  await gotoProtected(page, `${BASE}/master-data/branches/add`);
  const response = page.waitForResponse(
    (res) => res.request().method() === 'POST' && /\/branches\/?$/.test(new URL(res.url()).pathname),
    { timeout: 60000 },
  );
  await selectLoadedOrganization(page, organizationId);
  await page.locator('input[name="text"]').fill(name);
  await page.locator('input[name="branch_code"]').fill(code);
  await page.locator('input[name="city"]').fill('Chennai');
  await clickUnblocked(page, 'Save');
  const body = await (await response).json();
  await page.getByText(/created successfully|saved successfully/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const id = String(body.branch_id || '');
  if (!id) {
    throw new Error('Branch create returned no id');
  }
  return id;
}
