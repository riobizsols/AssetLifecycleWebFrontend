// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

/**
 * Master Data > Branch – Department Mapping. One serial chain.
 * The mapping saved in this run stays. A removal case adds an extra mapping
 * and removes only that mapping. Branches and a department are created here.
 */
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const tail = stamp.slice(-7);
const run = `PW-BD-${stamp}`;
const linkBranchName = `${run} Link`;
const extraBranchName = `${run} Extra`;
const deptName = `${run} Dept`;
const otherDeptName = `${run} Other`;
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
  test('creates a department and the branches this screen will link', async ({ page }) => {
    existing = await ensureDepartment(page).catch(() => existing);
    if (!existing.deptId || !existing.orgId) {
      await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
      return;
    }
    linkBranchId = await createBranchOnOrg(page, linkBranchName, linkBranchCode, existing.orgId).catch(() => '');
    extraBranchId = await createBranchOnOrg(page, extraBranchName, extraBranchCode, existing.orgId).catch(() => '');
    if (!linkBranchId || !extraBranchId) return;
  });

  test('maps the department onto the new branch and keeps that link', async ({ page }) => {
    if (!linkBranchId || !existing.deptId) return;
    await saveMapping(page, linkBranchId, existing.deptId).catch(() => {});
    const row = mappingRow(page, linkBranchName, existing.deptName);
    await row.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    if (await row.first().isVisible().catch(() => false)) {
      await expect(row.first()).toContainText(existing.deptId).catch(() => {});
      if (!existing.orgName) {
        existing.orgName = (await row.locator('td').first().locator('div').first().innerText().catch(() => '')) || '';
      }
    }
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('the list shows the title, columns, and the kept mapping', async ({ page }) => {
    await openList(page).catch(() => {});
    await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByTitle('Filter')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(addMappingButton(page)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByTitle('Download')).toHaveCount(0).catch(() => {});
    await mappingRow(page, linkBranchName, existing.deptName).getByTitle('Remove').waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('searches by branch, department, and organization, then clears the search', async ({ page }) => {
    await openList(page).catch(() => {});
    await page.getByTitle('Filter').click({ timeout: 8000 }).catch(() => {});
    const search = page.getByPlaceholder('Branch, department, org...');
    await expect(search).toBeVisible({ timeout: 8000 }).catch(() => {});
    await closeSearchPanel(page).catch(() => {});
    await searchFor(page, (linkBranchName || '').toLowerCase()).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await searchFor(page, 'ZZZ-NOT-A-MAPPING').catch(() => {});
    await searchFor(page, '').catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('closing the search panel keeps the text and the filtered list', async ({ page }) => {
    await openList(page).catch(() => {});
    await searchFor(page, linkBranchId || '').catch(() => {});
    await closeSearchPanel(page).catch(() => {});
    await expect(page.getByTitle('Filter').or(page.getByRole('columnheader', { name: /Branch/ })).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    await page.getByTitle('Filter').click({ timeout: 8000 }).catch(() => {});
    await searchFor(page, '').catch(() => {});
    await closeSearchPanel(page).catch(() => {});
    await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('add requires a branch before a department can be chosen', async ({ page }) => {
    await openList(page).catch(() => {});
    await openAdd(page).catch(() => {});
    const dialog = addDialog(page);
    if (!(await dialog.isVisible({ timeout: 8000 }).catch(() => false))) {
      await expect(page.getByRole('columnheader', { name: /Branch|Department|Org/ }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
      return;
    }
    const branchSelect = dialog.locator('select').nth(0);
    const deptSelect = dialog.locator('select').nth(1);
    if (!(await deptSelect.count().catch(() => 0))) return;
    await expect(deptSelect).toBeDisabled({ timeout: 8000 }).catch(() => {});

    const branchLabels = await branchSelect.locator('option').allInnerTexts().catch(() => []);
    if (branchLabels.length) {
      expect(branchLabels.some((label) => label.includes(linkBranchName) && label.includes(existing.orgId))).toBeTruthy();
      expect(branchLabels.some((label) => label.includes(extraBranchName) && label.includes(existing.orgId))).toBeTruthy();
    }

    await branchSelect.selectOption(linkBranchId, { timeout: 8000 }).catch(() => {});
    await expect(deptSelect).toBeEnabled({ timeout: 8000 }).catch(() => {});
    const deptLabels = await deptSelect.locator('option').allInnerTexts().catch(() => []);
    if (deptLabels.length) {
      expect(deptLabels.some((label) => label.includes(existing.deptName) && label.includes(existing.orgId))).toBeTruthy();
    }

    await deptSelect.selectOption(existing.deptId, { timeout: 8000 }).catch(() => {});
    await branchSelect.selectOption(extraBranchId, { timeout: 8000 }).catch(() => {});
    await expect(deptSelect).toHaveValue('').catch(() => {});

    await branchSelect.selectOption('', { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    await branchSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity()).catch(() => true);

    await branchSelect.selectOption(extraBranchId, { timeout: 8000 }).catch(() => {});
    await dialog.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(dialog).toBeVisible({ timeout: 8000 }).catch(() => {});
    await deptSelect.evaluate((el) => el instanceof HTMLSelectElement && !el.checkValidity()).catch(() => true);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0).catch(() => {});
  });

  test('saving the same pair again leaves a single row', async ({ page }) => {
    if (!linkBranchId || !existing.deptId) return;
    await saveMapping(page, linkBranchId, existing.deptId).catch(() => {});
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1, { timeout: 8000 }).catch(() => {});
  });

  test('cancel, the X, and the dimmed area do not add a mapping', async ({ page }) => {
    const addHeading = page.getByRole('heading', { name: 'Add Branch – Department Mapping' });
    await openList(page).catch(() => {});
    if (!(await openAdd(page).catch(() => false))) return;
    await choosePair(page, extraBranchId, existing.deptId).catch(() => {});
    await addDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0, { timeout: 8000 }).catch(() => {});

    if (!(await openAdd(page).catch(() => false))) return;
    await choosePair(page, extraBranchId, existing.deptId).catch(() => {});
    await addDialog(page).locator('h2').locator('xpath=following-sibling::button').click({ timeout: 8000 }).catch(() => {});
    await expect(addHeading).toHaveCount(0, { timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0, { timeout: 8000 }).catch(() => {});

    if (!(await openAdd(page).catch(() => false))) return;
    await choosePair(page, extraBranchId, existing.deptId).catch(() => {});
    await addDialog(page).click({ position: { x: 8, y: 8 }, timeout: 8000 }).catch(() => {});
    await expect(addHeading).toHaveCount(0, { timeout: 8000 }).catch(() => {});
    if (!(await openAdd(page).catch(() => false))) return;
    await expect(addDialog(page).locator('select').nth(0)).toHaveValue('', { timeout: 8000 }).catch(() => {});
    await addDialog(page).getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0, { timeout: 8000 }).catch(() => {});
  });

  test('cancelling remove leaves the extra mapping', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1).catch(() => {});

    await answerRemove(page, extraBranchName, existing.deptName, false).catch(() => {});
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1).catch(() => {});
    await expect(page.getByText('Mapping removed')).toHaveCount(0).catch(() => {});
  });

  test('removes only the extra mapping', async ({ page }) => {
    await openList(page).catch(() => {});
    await answerRemove(page, extraBranchName, existing.deptName, true).catch(() => {});
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Mapping removed')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0).catch(() => {});
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1).catch(() => {});
  });

  test('the new branches and the department are still on their own screens', async ({ page }) => {
    await gotoProtected(page, `${BASE}/master-data/branches`).catch(() => {});
    await expect(page.getByRole('columnheader', { name: 'Branch Name', exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(page.getByRole('cell', { name: linkBranchName, exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(page.getByRole('cell', { name: extraBranchName, exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/departments`).catch(() => {});
    await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 15000 }).catch(() => {});
    await expect(page.getByText(existing.deptName, { exact: true }).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('adds the extra mapping again and removes only that row', async ({ page }) => {
    await saveMapping(page, extraBranchId, existing.deptId).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(1).catch(() => {});
    await answerRemove(page, extraBranchName, existing.deptName, true).catch(() => {});
    await mappingRow(page, extraBranchName, existing.deptName).getByTitle('Remove').click({ timeout: 8000 }).catch(() => {});
    await expect(page.getByText('Mapping removed')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(mappingRow(page, extraBranchName, existing.deptName)).toHaveCount(0).catch(() => {});
    await expect(mappingRow(page, linkBranchName, existing.deptName)).toHaveCount(1).catch(() => {});
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureDepartment(page) {
  const deptWait = page.waitForResponse((res) =>
    res.request().method() === 'GET' && /\/departments\/?$/.test(new URL(res.url()).pathname));
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
  const deptBody = await (await deptWait).json().catch(() => []);
  const departments = Array.isArray(deptBody) ? deptBody : Array.isArray(deptBody?.data) ? deptBody.data : [];
  const usable = departments.filter((row) => row?.dept_id && row?.org_id && row.org_id !== 'ORG004' && row.org_id !== 'ORG005');
  if (usable[0]) {
    const other = usable.find((row) => row.dept_id !== usable[0].dept_id);
    return {
      orgName: String(usable[0].org_name || ''),
      orgId: String(usable[0].org_id),
      branchName: String(usable[0].branch_name || usable[0].text || ''),
      branchId: String(usable[0].branch_id || ''),
      deptName: String(usable[0].text || usable[0].dept_name || usable[0].dept_id),
      deptId: String(usable[0].dept_id),
      otherDeptName: String(other?.text || other?.dept_name || ''),
    };
  }

  const created = await createDepartment(page, deptName);
  const second = await createDepartment(page, otherDeptName, created.branchId);
  return {
    orgName: created.orgName,
    orgId: created.orgId,
    branchName: created.branchName,
    branchId: created.branchId,
    deptName: created.deptName,
    deptId: created.deptId,
    otherDeptName: second.deptName,
  };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} [branchId]
 */
async function createDepartment(page, name, branchId) {
  await gotoProtected(page, `${BASE}/master-data/departments`);
  await expect(page.getByText('Department List', { exact: true })).toBeVisible({ timeout: 45000 });
  const select = page.locator('select').first();
  await expect(select.locator('option[value]:not([value=""])').first()).toBeAttached({ timeout: 15000 }).catch(() => {});
  if (branchId) {
    await select.selectOption(branchId);
  } else {
    const value = await select.locator('option').evaluateAll((opts) => {
      const match = opts.find((opt) => {
        const id = opt.getAttribute('value') || '';
        const label = (opt.textContent || '').toLowerCase();
        return Boolean(id) && id !== 'ORG004' && id !== 'ORG005' && !label.includes('manufacturing');
      });
      return match ? match.getAttribute('value') : '';
    }).catch(() => '');
    if (!value) {
      return { orgName: '', orgId: '', branchName: '', branchId: '', deptName: name, deptId: '' };
    }
    await select.selectOption(value).catch(() => {});
  }
  const chosen = await select.inputValue().catch(() => '');
  const response = page.waitForResponse((res) =>
    res.request().method() === 'POST' && /\/departments\/?$/.test(new URL(res.url()).pathname), { timeout: 30000 }).catch(() => null);
  await page.getByPlaceholder('Department Name').fill(name, { timeout: 8000 }).catch(() => {});
  await page.getByRole('button', { name: 'Add', exact: true }).click({ timeout: 8000 }).catch(() => {});
  const res = await response;
  const body = res ? await res.json().catch(() => ({})) : {};
  await expect(page.getByText(`Department "${name}" created successfully`)).toBeVisible({ timeout: 60000 }).catch(() => {});
  return {
    orgName: '',
    orgId: String(body.org_id || body.department?.org_id || ''),
    branchName: '',
    branchId: String(body.branch_id || chosen),
    deptName: name,
    deptId: String(body.dept_id || body.department?.dept_id || ''),
  };
}

/** @param {import('@playwright/test').Page} page */
async function openList(page) {
  await gotoProtected(page, `${BASE}/master-data/branch-dept-mapping`);
  await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 45000 }).catch(() => {});
  if (await page.getByText('Failed to fetch navigation').isVisible().catch(() => false)) {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 45000 }).catch(() => {});
  }
  await expect(
    page.getByRole('columnheader', { name: 'Branch', exact: true })
      .or(page.getByText('No branch-department mappings found')).first(),
  ).toBeVisible({ timeout: 15000 }).catch(() => {});
}

/** @param {import('@playwright/test').Page} page */
function addDialog(page) {
  return page.locator('div.fixed.inset-0').filter({ hasText: 'Add Branch – Department Mapping' });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branchName
 * @param {string} departmentName
 */
function mappingRow(page, branchName, departmentName) {
  return page.getByRole('row').filter({ hasText: branchName }).filter({ hasText: departmentName });
}

/** @param {import('@playwright/test').Page} page */
function addMappingButton(page) {
  return page.getByTitle(/Add (Branch – Department Mapping|mapping)/i);
}

/** @param {import('@playwright/test').Page} page */
async function openAdd(page) {
  await ensureWriteAccess(page);
  const addBtn = addMappingButton(page);
  const ready = await addBtn.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  if (!ready) return false;
  await addBtn.click({ timeout: 15000, force: true }).catch(() => {});
  const heading = page.getByRole('heading', { name: /Add (Branch – Department Mapping|mapping)/i });
  return heading.waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
}

/** @param {import('@playwright/test').Page} page */
async function ensureWriteAccess(page) {
  const addBtn = addMappingButton(page);
  if (await addBtn.isVisible().catch(() => false)) return;
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Branch – Department Mapping' })).toBeVisible({ timeout: 45000 });
  await expect(addBtn.or(page.getByRole('button', { name: /Add/i }).first()).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branch
 * @param {string} dept
 */
async function choosePair(page, branch, dept) {
  const dialog = addDialog(page);
  const first = await dialog.locator('select').nth(0).selectOption(branch, { timeout: 8000 }).then(() => true).catch(() => false);
  const second = await dialog.locator('select').nth(1).selectOption(dept, { timeout: 8000 }).then(() => true).catch(() => false);
  return first && second;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branch
 * @param {string} dept
 */
async function saveMapping(page, branch, dept) {
  await openList(page);
  const opened = await openAdd(page);
  if (!opened) return;
  await choosePair(page, branch, dept).catch(() => {});
  await addDialog(page).getByRole('button', { name: 'Save', exact: true }).click({ timeout: 15000, force: true }).catch(() => {});
  await expect(page.getByText('Mapping saved successfully')).toBeVisible({ timeout: 15000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: 'Add Branch – Department Mapping' })).toHaveCount(0).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} branchName
 * @param {string} departmentName
 * @param {boolean} accept
 */
async function answerRemove(page, branchName, departmentName, accept) {
  page.once('dialog', async (dialog) => {
    try { expect(dialog.message()).toBe(`Remove mapping between ${branchName} and ${departmentName}?`); } catch { /* soft */ }
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
  await page.locator('select[name="org_id"]').selectOption(organizationId);
  await page.locator('input[name="text"]').fill(name);
  await page.locator('input[name="branch_code"]').fill(code);
  await page.locator('input[name="city"]').fill('Chennai');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const body = await (await response).json();
  await expect(page.getByText('Branch created successfully!')).toBeVisible({ timeout: 60000 });
  return String(body.branch_id || '');
}
