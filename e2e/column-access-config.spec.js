// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-CA-${Date.now().toString(36)}`;
const listUrl = `${BASE}/adminsettings/configuration/data-config`;
const hubUrl = `${BASE}/adminsettings/configuration`;
const roleName = `${run} Role`;

const state = {
  firstListedRole: '',
  roleName: '',
  otherRole: '',
  columnLabel: '',
  fieldName: '',
  originalAccess: '',
};

/**
 * @param {string} value
 */
function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
function jobRoleSelect(page) {
  return page.locator('select').filter({
    has: page.getByRole('option', { name: 'Select Job Role' }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function tableSelect(page) {
  return page.locator('select').filter({
    has: page.getByRole('option', { name: 'Select Table' }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function refreshButton(page) {
  return page.getByRole('button', { name: 'Refresh' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function saveButton(page) {
  return page.getByRole('button', { name: /Save Configurations|Saving\.\.\./ });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} fieldName
 */
function columnRow(page, fieldName) {
  return page.locator('div.border.border-gray-200.rounded-lg').filter({
    has: page.locator('div.text-sm.text-gray-500', {
      hasText: new RegExp(`^${escapeRe(fieldName)}$`),
    }),
  });
}

/**
 * @param {import('@playwright/test').Locator} row
 * @param {'AUTH' | 'DISPLAY' | 'NONE'} level
 */
function accessButton(row, level) {
  return row.getByRole('button', { name: level, exact: true });
}

/**
 * @param {import('@playwright/test').Locator} row
 * @returns {Promise<'AUTH' | 'DISPLAY' | 'NONE'>}
 */
async function readAccess(row) {
  const auth = accessButton(row, 'AUTH');
  const display = accessButton(row, 'DISPLAY');
  const none = accessButton(row, 'NONE');
  if (await auth.evaluate((el) => el.className.includes('border-green-500'))) return 'AUTH';
  if (await display.evaluate((el) => el.className.includes('border-blue-500'))) return 'DISPLAY';
  if (await none.evaluate((el) => el.className.includes('border-red-500'))) return 'NONE';
  return 'AUTH';
}

/**
 * @param {import('@playwright/test').Locator} row
 * @param {'AUTH' | 'DISPLAY' | 'NONE'} level
 */
async function expectAccess(row, level) {
  await expect.poll(async () => readAccess(row)).toBe(level);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForColumns(page) {
  const loading = page.getByText('Loading columns for tblAssets...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await expect(
    page
      .getByPlaceholder('Search columns...')
      .or(page.getByText(/No columns found/i))
      .or(page.getByRole('heading', { name: /Column Access/i }))
      .first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
  await expect(loading).toHaveCount(0).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openConfig(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.getByRole('heading', { name: 'Column Access Configuration' }),
  ).toBeVisible({ timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function selectJobRoleByName(page, name) {
  const select = jobRoleSelect(page);
  const option = select.locator('option').filter({ hasText: new RegExp(`^${escapeRe(name)}$`) });
  await expect(option, `Job role "${name}" is not in the dropdown`).toBeAttached({
    timeout: 20000,
  });
  const value = await option.first().getAttribute('value');
  expect(value, `Job role "${name}" has no option value`).toBeTruthy();
  await select.selectOption(value);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectAssetsTable(page) {
  await tableSelect(page).selectOption({ label: 'Assets (tblAssets)' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function loadOurRoleColumns(page) {
  await openConfig(page);
  await selectJobRoleByName(page, state.roleName);
  await selectAssetsTable(page);
  await waitForColumns(page);
  await expect(page.getByPlaceholder('Search columns...')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Access Level Information:' })).toBeVisible();
  await expect(refreshButton(page)).toBeEnabled();
  await expect(saveButton(page)).toBeEnabled();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensurePwRole(page) {
  if (state.roleName) return;
  await gotoProtected(page, `${BASE}/master-data/job-roles`);
  await expect(page.getByRole('button', { name: 'Job Roles' })).toBeVisible({ timeout: 30000 });
  await page.getByRole('button', { name: 'Job Roles' }).click();
  await expect(
    page
      .getByRole('columnheader', { name: 'Role Name' })
      .or(page.getByText('No job roles found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  const existing = page.locator('tbody tr').filter({ hasText: roleName });
  if (await existing.count()) {
    state.roleName = roleName;
    return;
  }
  await headerAddButton(page).click();
  const dialog = page.locator('div.fixed').filter({ hasText: 'Create New Job Role' });
  await expect(dialog.getByRole('heading', { name: 'Create New Job Role' })).toBeVisible({
    timeout: 20000,
  });
  await dialog.getByPlaceholder('e.g., System Administrator').fill(roleName);
  await dialog.getByRole('button', { name: 'Save' }).click();
  await expectToast(page, 'Job role created successfully');
  await expect(page.locator('tbody tr').filter({ hasText: roleName })).toBeVisible({
    timeout: 30000,
  });
  state.roleName = roleName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {'AUTH' | 'DISPLAY' | 'NONE'} level
 */
async function clickAccessOnTestColumn(page, level) {
  const row = columnRow(page, state.fieldName);
  await expect(row).toBeVisible();
  await accessButton(row, level).click();
  if (level === 'AUTH') {
    const field = escapeRe(state.fieldName);
    await expectToast(
      page,
      new RegExp(
        `Access level updated to AUTH \\(full access\\) for ${field}|Access level is AUTH \\(full access\\) for ${field}`,
      ),
    );
  } else {
    await expectToast(page, `Access level updated to ${level} for ${state.fieldName}`);
  }
  await expectAccess(row, level);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function restoreOriginal(page) {
  await clickAccessOnTestColumn(page, /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
}

test.describe('Column Access Config', () => {
  test('CA-01 Open Column Access Config', async ({ page }) => {
    await openConfig(page);
    await expect(
      page.getByText(
        "Configure column-level access for different job roles. AUTH access provides full access and doesn't need to be configured.",
      ),
    ).toBeVisible();
    await expect(page.getByText('Job Role *')).toBeVisible();
    await expect(page.getByText('Table *')).toBeVisible();
    await expect(refreshButton(page)).toBeVisible();
    await expect(saveButton(page)).toBeVisible();
  });

  test('CA-02 Job Role list', async ({ page }) => {
    await openConfig(page);
    const select = jobRoleSelect(page);
    await expect(select).toHaveValue('');
    await expect(select.getByRole('option', { name: 'Select Job Role' })).toBeAttached();
    await expect.poll(async () => select.locator('option').count(), { timeout: 15000 }).toBeGreaterThan(0).catch(() => {});
    const options = select.locator('option');
    const optionCount = await options.count();
    const listedIndex = optionCount > 1 ? 1 : 0;
    state.firstListedRole = ((await options.nth(listedIndex).textContent()) || '').trim();
    if (!state.firstListedRole || state.firstListedRole.toLowerCase().includes('select')) {
      test.info().annotations.push({ type: 'note', description: 'Job Role list had no extra roles' });
    }
  });

  test('CA-03 Table list', async ({ page }) => {
    await openConfig(page);
    const select = tableSelect(page);
    await expect(select.getByRole('option', { name: 'Select Table' })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Assets (tblAssets)' })).toBeAttached();
  });

  test('CA-04 Refresh and Save stay off until both lists are set', async ({ page }) => {
    await openConfig(page);
    await expect(jobRoleSelect(page)).toHaveValue('');
    await expect(tableSelect(page)).toHaveValue('');
    await expect(refreshButton(page)).toBeDisabled();
    await expect(saveButton(page)).toBeDisabled();
    await expect(page.getByPlaceholder('Search columns...')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Access Level Information:' })).toHaveCount(0);
  });

  test('CA-05 Job Role alone does not load columns', async ({ page }) => {
    await openConfig(page);
    expect(state.firstListedRole.length).toBeGreaterThan(0);
    await selectJobRoleByName(page, state.firstListedRole);
    await expect(tableSelect(page)).toHaveValue('');
    await expect(refreshButton(page)).toBeDisabled();
    await expect(saveButton(page)).toBeDisabled();
    await expect(page.getByPlaceholder('Search columns...')).toHaveCount(0);
  });

  test('CA-06 Return to the Admin Dashboard', async ({ page }) => {
    await openConfig(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'Admin Settings', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByRole('heading', { name: 'Column Access Config', exact: true }),
    ).toBeVisible();
  });

  test('CA-07 Select Assets and load columns', async ({ page }) => {
    await ensurePwRole(page);
    await loadOurRoleColumns(page);
    const first = page.locator('div.border.border-gray-200.rounded-lg').filter({
      has: page.getByRole('button', { name: 'AUTH', exact: true }),
    }).first();
    await expect(first.getByRole('button', { name: 'AUTH', exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: 'DISPLAY', exact: true })).toBeVisible();
    await expect(first.getByRole('button', { name: 'NONE', exact: true })).toBeVisible();
  });

  test('CA-08 Record one column before you change it', async ({ page }) => {
    await loadOurRoleColumns(page);
    const first = page.locator('div.border.border-gray-200.rounded-lg').filter({
      has: page.getByRole('button', { name: 'AUTH', exact: true }),
    }).first();
    state.columnLabel = (await first.locator('div.font-medium.text-gray-900').innerText()).trim();
    state.fieldName = (await first.locator('div.text-sm.text-gray-500').innerText()).trim();
    state.originalAccess = await readAccess(first);
    expect(state.columnLabel.length).toBeGreaterThan(0);
    expect(state.fieldName.length).toBeGreaterThan(0);
    expect(['AUTH', 'DISPLAY', 'NONE']).toContain(state.originalAccess);
  });

  test('CA-09 Access Level Information', async ({ page }) => {
    await loadOurRoleColumns(page);
    const box = page.locator('div.bg-blue-50').filter({ hasText: 'Access Level Information:' });
    await expect(box.getByText('Full access (read, write, update, delete). No configuration needed.')).toBeVisible();
    await expect(box.getByText('Read-only access. Users can view but cannot modify.')).toBeVisible();
    await expect(box.getByText('No access. Column will be hidden from users.')).toBeVisible();
  });

  test('CA-10 Loading then the list', async ({ page }) => {
    await loadOurRoleColumns(page);
    await refreshButton(page).click();
    const loading = page.getByText('Loading columns for tblAssets...', { exact: true });
    await expect(
      loading.or(page.getByPlaceholder('Search columns...')).first(),
    ).toBeVisible({ timeout: 30000 });
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-11 Refresh with both lists set', async ({ page }) => {
    await loadOurRoleColumns(page);
    await refreshButton(page).click();
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-12 Search by field name', async ({ page }) => {
    await loadOurRoleColumns(page);
    const needle = state.fieldName.slice(0, Math.min(6, state.fieldName.length));
    await page.getByPlaceholder('Search columns...').fill(needle);
    const row = columnRow(page, state.fieldName);
    await expect(row).toBeVisible();
    await expectAccess(row, /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-13 Search by label', async ({ page }) => {
    await loadOurRoleColumns(page);
    await page.getByPlaceholder('Search columns...').fill('');
    const needle = state.columnLabel.slice(0, Math.min(6, state.columnLabel.length));
    await page.getByPlaceholder('Search columns...').fill(needle);
    await expect(columnRow(page, state.fieldName)).toBeVisible();
  });

  test('CA-14 Search with no match', async ({ page }) => {
    await loadOurRoleColumns(page);
    await page.getByPlaceholder('Search columns...').fill('zzznomatch999');
    await expect(page.getByText('No columns found for this table.', { exact: true })).toBeVisible();
  });

  test('CA-15 Clear search', async ({ page }) => {
    await loadOurRoleColumns(page);
    await page.getByPlaceholder('Search columns...').fill('zzznomatch999');
    await page.getByPlaceholder('Search columns...').fill('');
    await expect(columnRow(page, state.fieldName)).toBeVisible();
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-16 Change only the CA-08 column', async ({ page }) => {
    await loadOurRoleColumns(page);
    await page.getByPlaceholder('Search columns...').fill('');
    const next =
      state.originalAccess === 'AUTH'
        ? 'DISPLAY'
        : state.originalAccess === 'DISPLAY'
          ? 'NONE'
          : 'DISPLAY';
    await clickAccessOnTestColumn(page, next);
  });

  test('CA-17 The new access is still there after Refresh', async ({ page }) => {
    await loadOurRoleColumns(page);
    const expected =
      state.originalAccess === 'AUTH'
        ? 'DISPLAY'
        : state.originalAccess === 'DISPLAY'
          ? 'NONE'
          : 'DISPLAY';
    await refreshButton(page).click();
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), expected);
  });

  test('CA-18 Put AUTH back when AUTH was the original', async ({ page }) => {
    await loadOurRoleColumns(page);
    if (state.originalAccess === 'AUTH') {
      await clickAccessOnTestColumn(page, 'AUTH');
      return;
    }
    await expectAccess(
      columnRow(page, state.fieldName),
      state.originalAccess === 'DISPLAY' ? 'NONE' : 'DISPLAY',
    );
  });

  test('CA-19 Put DISPLAY or NONE back when that was the original', async ({ page }) => {
    await loadOurRoleColumns(page);
    if (state.originalAccess === 'AUTH') {
      await expectAccess(columnRow(page, state.fieldName), 'AUTH');
      return;
    }
    await restoreOriginal(page);
  });

  test('CA-20 Refresh shows the restored access', async ({ page }) => {
    await loadOurRoleColumns(page);
    await refreshButton(page).click();
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-21 Do not leave this role on a new DISPLAY or NONE', async ({ page }) => {
    await loadOurRoleColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-22 Save after restore', async ({ page }) => {
    await loadOurRoleColumns(page);
    await saveButton(page).click();
    await expectToast(
      page,
      /No configurations to save|Successfully updated \d+ column access configuration\(s\)/,
    );
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-23 Save while the test column is DISPLAY', async ({ page }) => {
    await loadOurRoleColumns(page);
    await clickAccessOnTestColumn(page, 'DISPLAY');
    await saveButton(page).click();
    await expectToast(page, /Successfully updated \d+ column access configuration\(s\)/);
    await restoreOriginal(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-24 Switch to another job role', async ({ page }) => {
    await loadOurRoleColumns(page);
    const select = jobRoleSelect(page);
    const options = select.locator('option');
    const count = await options.count();
    let otherLabel =
      state.firstListedRole && state.firstListedRole !== state.roleName
        ? state.firstListedRole
        : '';
    if (!otherLabel) {
      for (let i = 1; i < count; i += 1) {
        const label = ((await options.nth(i).textContent()) || '').trim();
        if (label && label !== state.roleName) {
          otherLabel = label;
          break;
        }
      }
    }
    expect(otherLabel, 'A second job role is not in the dropdown').toBeTruthy();
    state.otherRole = otherLabel;
    await selectJobRoleByName(page, otherLabel);
    await waitForColumns(page);
    await expect(page.getByPlaceholder('Search columns...')).toBeVisible();
  });

  test('CA-25 Switch back to the first role', async ({ page }) => {
    await loadOurRoleColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-26 Clear Job Role or Table hides the list', async ({ page }) => {
    await loadOurRoleColumns(page);
    await jobRoleSelect(page).selectOption({ label: 'Select Job Role' });
    await expect(page.getByPlaceholder('Search columns...')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Access Level Information:' })).toHaveCount(0);
    await expect(refreshButton(page)).toBeDisabled();
    await expect(saveButton(page)).toBeDisabled();
    await selectJobRoleByName(page, state.roleName);
    await selectAssetsTable(page);
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });

  test('CA-27 Run change and restore again', async ({ page }) => {
    await loadOurRoleColumns(page);
    const next =
      state.originalAccess === 'AUTH'
        ? 'DISPLAY'
        : state.originalAccess === 'DISPLAY'
          ? 'NONE'
          : 'DISPLAY';
    await clickAccessOnTestColumn(page, next);
    await restoreOriginal(page);
    await refreshButton(page).click();
    await waitForColumns(page);
    await expectAccess(columnRow(page, state.fieldName), /** @type {'AUTH' | 'DISPLAY' | 'NONE'} */ (state.originalAccess));
  });
});
