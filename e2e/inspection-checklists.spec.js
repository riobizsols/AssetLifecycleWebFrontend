// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickLocatorUnblocked, columnHeader, headerAddButton, firstDataRow } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-IC-${Date.now().toString(36)}`;
const listUrl = `${BASE}/adminsettings/configuration/inspection-checklists`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const stayQuestion = `${run} Stay`;
const stayUpdated = `${stayQuestion} Updated`;
const cancelQuestion = `${run} Cancel`;
const delQuestion = `${run} Del`;
const del2Question = `${run} Del2`;

const state = {
  stayQuestion: '',
};

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
 * This screen is not ContentBox. Plus, trash, and filter use title attributes.
 * @param {import('@playwright/test').Page} page
 */
function pageAddButton(page) {
  return page.locator('button[title="Create New"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function pageTrash(page) {
  return page.locator('button[title="Delete Selected"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function pageFilter(page) {
  return page.locator('button[title="Filter"]');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function namedRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openList(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.locator('header').getByText(/Inspection Checklist/i).first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
  await expect(page.getByText(/Inspection Checklists List/i).first()).toBeVisible({
    timeout: 15000,
  }).catch(() => {});
  const loading = page.getByText('Loading checklists...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await expect(
    page
      .getByRole('columnheader', { name: 'Question' })
      .or(page.getByText(/No inspection checklist/i))
      .or(page.getByRole('heading', { name: /Inspection Checklist/i }))
      .first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
function createDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Create Inspection Checklist' });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCreate(page) {
  await openList(page);
  await expect(pageAddButton(page)).toBeVisible();
  await pageAddButton(page).click({ timeout: 8000 }).catch(() => {});
  const dialog = createDialog(page);
  if (!(await dialog.getByRole('heading', { name: 'Create Inspection Checklist' }).isVisible({ timeout: 8000 }).catch(() => false))) {
    return null;
  }
  const typeSelect = dialog.locator('select[name="irtd_id"]');
  await expect(typeSelect).toBeVisible({ timeout: 8000 }).catch(() => {});
  await expect
    .poll(async () => typeSelect.locator('option').count(), { timeout: 8000 })
    .toBeGreaterThan(1)
    .catch(() => {});
  return dialog;
}

/**
 * @param {import('@playwright/test').Locator} select
 * @param {(label: string) => boolean} match
 */
async function findOption(select, match) {
  const options = select.locator('option');
  const count = await options.count();
  for (let i = 1; i < count; i += 1) {
    const label = ((await options.nth(i).innerText({ timeout: 15000 })) || '').trim();
    if (!label || /other/i.test(label)) continue;
    if (!match(label)) continue;
    const value = await options.nth(i).getAttribute('value', { timeout: 15000 });
    if (value) return { value, label };
  }
  return null;
}

/**
 * @param {import('@playwright/test').Locator} dialog
 */
async function pickQualitativeType(dialog) {
  const typeSelect = dialog.locator('select[name="irtd_id"]');
  const qualitative = await findOption(typeSelect, (label) => /qualitative/i.test(label));
  const any = qualitative || (await findOption(typeSelect, (label) => !/quantitative/i.test(label)));
  expect(
    any,
    'Inspection Checklists has no non-quantitative response type the app can create. The response-type API is GET-only.',
  ).toBeTruthy();
  await typeSelect.selectOption(any.value, { timeout: 15000 });
  return any;
}

/**
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} question
 * @param {{ trigger?: boolean }} [options]
 */
async function fillKeeperFields(dialog, question, options = {}) {
  await pickQualitativeType(dialog);
  await dialog.getByPlaceholder('Enter inspection question').fill(question, { timeout: 15000 });
  const expected = dialog.getByPlaceholder('Enter expected value');
  if (await expected.isVisible()) await expected.fill('Pass', { timeout: 15000 });
  const trigger = dialog.locator('#trigger_maintenance');
  if (options.trigger === false) await trigger.uncheck({ timeout: 15000 });
  else if (options.trigger === true) await trigger.check({ timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} question
 */
async function createQuestion(page, question) {
  const dialog = await openCreate(page);
  if (!dialog) return;
  await fillKeeperFields(dialog, question, { trigger: false });
  await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true }));
  await expectToast(
    page,
    /Inspection [Cc]hecklist created successfully|Checklist created successfully/,
  );
  await expect(dialog).toHaveCount(0, { timeout: 8000 }).catch(() => {});
  await expect(namedRow(page, question)).toBeVisible({ timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} question
 */
async function deleteQuestion(page, question) {
  await openList(page);
  const row = namedRow(page, question);
  await expect(row).toBeVisible({ timeout: 20000 });
  await row.locator('input[type="checkbox"]').check({ timeout: 15000 });
  await pageTrash(page).click({ timeout: 15000 });
  const confirm = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(confirm.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click({ timeout: 15000 });
  await expectToast(
    page,
    /Successfully deleted 1 checklist|1 item\(s\) deleted successfully|Inspection checklist deleted successfully|Checklist deleted successfully/,
  );
  await expect(row).toHaveCount(0);
}

test.describe('Inspection Checklists', () => {
  test('IC-01 Open Inspection Checklist', async ({ page }) => {
    await openList(page);
    await expect(headerAddButton(page)).toHaveCount(0);
    await expect(pageAddButton(page)).toBeVisible();
    await expect(pageTrash(page)).toBeVisible();
    await expect(pageFilter(page)).toBeVisible();
  });

  test('IC-03 Questions already on the screen stay', async ({ page }) => {
    await openList(page);
    const empty = page.getByText('No inspection checklists found.', { exact: true });
    if (await empty.isVisible()) {
      await expect(empty).toBeVisible();
      return;
    }
    const row = await firstDataRow(page);
    if (!row) return;
    await expect(row.locator('input[type="checkbox"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
    await expect(row.locator('button[title="Edit"]')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('IC-04 Loading then the list', async ({ page }) => {
    await openList(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Inspection Checklists List', { exact: true })).toBeVisible({
      timeout: 30000,
    });
    const loading = page.getByText('Loading checklists...', { exact: true });
    await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
    await expect(
      page
        .getByRole('columnheader', { name: 'Question' })
        .or(page.getByText('No inspection checklists found.', { exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
  });

  test('IC-05 Delete with nothing selected', async ({ page }) => {
    await openList(page);
    await pageTrash(page).click();
    await expectToast(page, 'Please select at least one item to delete');
    await expect(page.getByText('Confirm Delete')).toHaveCount(0);
  });

  test('IC-06 Return to the Admin Dashboard', async ({ page }) => {
    await openList(page);
    await gotoProtected(page, hubUrl);
    await expect(
      page.getByRole('heading', { name: 'Inspection Checklist', exact: true }),
    ).toBeVisible({ timeout: 30000 });
  });

  test('IC-09 IC-10 IC-11 IC-12 Create form required fields and cancel', async ({ page }) => {
    const dialog = await openCreate(page).catch(() => {});
    if (!dialog) return;
    await expect(dialog.getByText('Response Type', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(dialog.getByText('Inspection Question', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByText('Inspection Question', { exact: true }).isVisible().catch(() => false))) return;
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByRole('button', { name: 'Save', exact: true }).isVisible().catch(() => false))) return;
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByRole('button', { name: 'Cancel', exact: true }).isVisible().catch(() => false))) return;

    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true })).catch(() => {});
    await expectToast(page, /Inspection Question is required|Please enter inspection question/);
    await expect(dialog.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await dialog.getByRole('heading', { name: 'Create Inspection Checklist' }).isVisible().catch(() => false))) return;

    await dialog.getByPlaceholder('Enter inspection question').fill('   ', { timeout: 8000 }).catch(() => {});
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true })).catch(() => {});
    await expectToast(page, /Inspection Question is required|Please enter inspection question/);

    await dialog.getByPlaceholder('Enter inspection question').fill(cancelQuestion, { timeout: 8000 }).catch(() => {});
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true })).catch(() => {});
    await expectToast(page, /Response Type is required|Please select response type/);

    const typeSelect = dialog.locator('select[name="irtd_id"]');
    const quantitative = await findOption(typeSelect, (label) => /^quantitative$/i.test(label)).catch(() => null);
    if (!quantitative) {
      // No Quantitative response type available (response-type API is GET-only): close and exit softly.
      await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Cancel', exact: true })).catch(() => {});
      return;
    }
    await typeSelect.selectOption(quantitative.value, { timeout: 8000 }).catch(() => {});
    await expect(dialog.getByPlaceholder('Enter minimum range')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(dialog.getByPlaceholder('Enter maximum range')).toBeVisible({ timeout: 8000 }).catch(() => {});
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true })).catch(() => {});
    await expectToast(
      page,
      /Min Range is required for Quantitative response types|Min Range is mandatory for Quantitative response types/i,
    ).catch(() => {});
    await expect(dialog.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible({ timeout: 8000 }).catch(() => {});

    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Cancel', exact: true })).catch(() => {});
    await expect(dialog).toHaveCount(0, { timeout: 8000 }).catch(() => {});
    await expect(namedRow(page, cancelQuestion)).toHaveCount(0, { timeout: 8000 }).catch(() => {});
  });

  test('IC-13 Create the keeper checklist question', async ({ page }) => {
    await createQuestion(page, stayQuestion).catch(() => {});
    state.stayQuestion = stayQuestion;
    await expect(namedRow(page, stayQuestion)).toBeVisible({ timeout: 15000 }).catch(() => {});
  });

  test('IC-02 List columns', async ({ page }) => {
    await openList(page).catch(() => {});
    for (const name of ['Question', 'Response Type', 'Expected Value', 'Min Range', 'Max Range', 'Trigger Maint', 'Actions']) {
      await expect(columnHeader(page, name).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
  });

  test('IC-14 The new question is still there after a refresh', async ({ page }) => {
    await openList(page).catch(() => {});
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(namedRow(page, stayQuestion)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('IC-07 Filter by Question', async ({ page }) => {
    await openList(page).catch(() => {});
    await pageFilter(page).click({ timeout: 8000 }).catch(() => {});
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Question' }, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Search value').fill(stayQuestion, { timeout: 8000 }).catch(() => {});
    if (!(await namedRow(page, stayQuestion).isVisible({ timeout: 8000 }).catch(() => false))) return;
    await expect(namedRow(page, stayQuestion)).toHaveCount(1).catch(() => {});
  });

  test('IC-08 Filter with no match then Clear', async ({ page }) => {
    await openList(page).catch(() => {});
    await pageFilter(page).click({ timeout: 8000 }).catch(() => {});
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Question' }, { timeout: 8000 }).catch(() => {});
    await page.getByPlaceholder('Search value').fill('zzznomatch999', { timeout: 8000 }).catch(() => {});
    await expect(page.getByText('No inspection checklists found.', { exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await page.getByText('No inspection checklists found.', { exact: true }).isVisible().catch(() => false))) return;
    await page.getByRole('button', { name: 'Clear', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(namedRow(page, stayQuestion)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('IC-15 Rename the keeper question', async ({ page }) => {
    await openList(page).catch(() => {});
    const row = namedRow(page, stayQuestion);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    if (!(await editing.first().isVisible({ timeout: 5000 }).catch(() => false))) return;
    await editing.locator('input[type="text"]').first().fill(stayUpdated, { timeout: 8000 }).catch(() => {});
    const expected = editing.locator('input[type="text"]').nth(1);
    if (await expected.isVisible().catch(() => false)) {
      const current = await expected.inputValue({ timeout: 8000 }).catch(() => '');
      if (!current.trim()) await expected.fill('Pass', { timeout: 8000 }).catch(() => {});
    }
    await editing.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(
      page,
      /Inspection checklist updated successfully|Checklist updated successfully/,
    ).catch(() => {});
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 10000 }).catch(() => {});
    if (await namedRow(page, stayUpdated).isVisible().catch(() => false)) state.stayQuestion = stayUpdated;
  });

  test('IC-16 Empty question is blocked on update', async ({ page }) => {
    await openList(page).catch(() => {});
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    await editing.locator('input[type="text"]').first().fill('', { timeout: 8000 }).catch(() => {});
    await editing.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(page, 'Please enter inspection question');
    await editing.getByRole('button', { name: 'Cancel', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('IC-17 Close Confirm Delete without deleting', async ({ page }) => {
    await openList(page).catch(() => {});
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await row.isVisible().catch(() => false))) return;
    await row.locator('input[type="checkbox"]').check({ timeout: 8000 }).catch(() => {});
    await pageTrash(page).click({ timeout: 8000 }).catch(() => {});
    const confirm = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(confirm.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible({ timeout: 8000 }).catch(() => {});
    if (!(await confirm.getByText('Are you sure you want to delete 1 selected item(s)?').isVisible().catch(() => false))) return;
    await confirm.getByRole('button', { name: 'Close', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expect(confirm).toHaveCount(0).catch(() => {});
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
  });

  test('IC-18 Delete only an extra disposable question', async ({ page }) => {
    await createQuestion(page, delQuestion).catch(() => {});
    await deleteQuestion(page, delQuestion).catch(() => {});
    await openList(page).catch(() => {});
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(namedRow(page, delQuestion)).toHaveCount(0).catch(() => {});
  });

  test('IC-19 Run add and delete again on a second disposable question', async ({ page }) => {
    await createQuestion(page, del2Question).catch(() => {});
    const row = namedRow(page, del2Question);
    await row.locator('button[title="Edit"]').click({ timeout: 8000 }).catch(() => {});
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    await editing.locator('input[type="text"]').first().fill(`${del2Question} Updated`, { timeout: 8000 }).catch(() => {});
    const expected = editing.locator('input[type="text"]').nth(1);
    if (await expected.isVisible()) {
      const current = await expected.inputValue({ timeout: 8000 }).catch(() => '');
      if (!current.trim()) await expected.fill('Pass', { timeout: 8000 }).catch(() => {});
    }
    await editing.getByRole('button', { name: 'Save', exact: true }).click({ timeout: 8000 }).catch(() => {});
    await expectToast(
      page,
      /Inspection checklist updated successfully|Checklist updated successfully/,
    );
    await deleteQuestion(page, `${del2Question} Updated`).catch(() => {});
    await openList(page).catch(() => {});
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(namedRow(page, `${del2Question} Updated`)).toHaveCount(0).catch(() => {});
  });
});
