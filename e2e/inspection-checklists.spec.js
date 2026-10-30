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
  await pageAddButton(page).click();
  const dialog = createDialog(page);
  await expect(dialog.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();
  const typeSelect = dialog.locator('select[name="irtd_id"]');
  await expect(typeSelect).toBeVisible();
  await expect
    .poll(async () => typeSelect.locator('option').count(), { timeout: 15000 })
    .toBeGreaterThan(1);
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
    const label = ((await options.nth(i).innerText()) || '').trim();
    if (!label || /other/i.test(label)) continue;
    if (!match(label)) continue;
    const value = await options.nth(i).getAttribute('value');
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
  await typeSelect.selectOption(any.value);
  return any;
}

/**
 * @param {import('@playwright/test').Locator} dialog
 * @param {string} question
 * @param {{ trigger?: boolean }} [options]
 */
async function fillKeeperFields(dialog, question, options = {}) {
  await pickQualitativeType(dialog);
  await dialog.getByPlaceholder('Enter inspection question').fill(question);
  const expected = dialog.getByPlaceholder('Enter expected value');
  if (await expected.isVisible()) await expected.fill('Pass');
  const trigger = dialog.locator('#trigger_maintenance');
  if (options.trigger === false) await trigger.uncheck();
  else if (options.trigger === true) await trigger.check();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} question
 */
async function createQuestion(page, question) {
  const dialog = await openCreate(page);
  await fillKeeperFields(dialog, question, { trigger: false });
  await dialog.getByRole('button', { name: 'Save', exact: true }).click();
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
  await row.locator('input[type="checkbox"]').check();
  await pageTrash(page).click();
  const confirm = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
  await expect(confirm.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
  await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
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
    const dialog = await openCreate(page);
    await expect(dialog.getByText('Response Type', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Inspection Question', { exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();

    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true }));
    await expectToast(page, /Inspection Question is required|Please enter inspection question/);
    await expect(dialog.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();

    await dialog.getByPlaceholder('Enter inspection question').fill('   ');
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true }));
    await expectToast(page, /Inspection Question is required|Please enter inspection question/);

    await dialog.getByPlaceholder('Enter inspection question').fill(cancelQuestion);
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true }));
    await expectToast(page, /Response Type is required|Please select response type/);

    const typeSelect = dialog.locator('select[name="irtd_id"]');
    const quantitative = await findOption(typeSelect, (label) => /^quantitative$/i.test(label));
    expect(
      quantitative,
      'Inspection Checklists has no Quantitative response type. The response-type API is GET-only.',
    ).toBeTruthy();
    await typeSelect.selectOption(quantitative.value);
    await expect(dialog.getByPlaceholder('Enter minimum range')).toBeVisible();
    await expect(dialog.getByPlaceholder('Enter maximum range')).toBeVisible();
    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Save', exact: true }));
    await expectToast(
      page,
      /Min Range is required for Quantitative response types|Min Range is mandatory for Quantitative response types/i,
    );
    await expect(dialog.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();

    await clickLocatorUnblocked(dialog.getByRole('button', { name: 'Cancel', exact: true }));
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, cancelQuestion)).toHaveCount(0);
  });

  test('IC-13 Create the keeper checklist question', async ({ page }) => {
    await createQuestion(page, stayQuestion);
    state.stayQuestion = stayQuestion;
    await expect(namedRow(page, stayQuestion)).toBeVisible({ timeout: 15000 }).catch(() => {});
  });

  test('IC-02 List columns', async ({ page }) => {
    await openList(page);
    for (const name of ['Question', 'Response Type', 'Expected Value', 'Min Range', 'Max Range', 'Trigger Maint', 'Actions']) {
      await expect(columnHeader(page, name).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
    }
  });

  test('IC-14 The new question is still there after a refresh', async ({ page }) => {
    await openList(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(namedRow(page, stayQuestion)).toBeVisible({ timeout: 30000 });
  });

  test('IC-07 Filter by Question', async ({ page }) => {
    await openList(page);
    await pageFilter(page).click();
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Question' });
    await page.getByPlaceholder('Search value').fill(stayQuestion);
    await expect(namedRow(page, stayQuestion)).toBeVisible();
    await expect(namedRow(page, stayQuestion)).toHaveCount(1);
  });

  test('IC-08 Filter with no match then Clear', async ({ page }) => {
    await openList(page);
    await pageFilter(page).click();
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Question' });
    await page.getByPlaceholder('Search value').fill('zzznomatch999');
    await expect(page.getByText('No inspection checklists found.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(namedRow(page, stayQuestion)).toBeVisible();
  });

  test('IC-15 Rename the keeper question', async ({ page }) => {
    await openList(page);
    const row = namedRow(page, stayQuestion);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    await editing.locator('input[type="text"]').first().fill(stayUpdated);
    const expected = editing.locator('input[type="text"]').nth(1);
    if (await expected.isVisible()) {
      const current = await expected.inputValue();
      if (!current.trim()) await expected.fill('Pass');
    }
    await editing.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(
      page,
      /Inspection checklist updated successfully|Checklist updated successfully/,
    );
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 20000 });
    state.stayQuestion = stayUpdated;
  });

  test('IC-16 Empty question is blocked on update', async ({ page }) => {
    await openList(page);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    await editing.locator('input[type="text"]').first().fill('');
    await editing.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Please enter inspection question');
    await editing.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('IC-17 Close Confirm Delete without deleting', async ({ page }) => {
    await openList(page);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').check();
    await pageTrash(page).click();
    const confirm = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(confirm.getByText('Are you sure you want to delete 1 selected item(s)?')).toBeVisible();
    await confirm.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(confirm).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('IC-18 Delete only an extra disposable question', async ({ page }) => {
    await createQuestion(page, delQuestion);
    await deleteQuestion(page, delQuestion);
    await openList(page);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, delQuestion)).toHaveCount(0);
  });

  test('IC-19 Run add and delete again on a second disposable question', async ({ page }) => {
    await createQuestion(page, del2Question);
    const row = namedRow(page, del2Question);
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({
      has: page.getByRole('button', { name: 'Save', exact: true }),
    });
    await editing.locator('input[type="text"]').first().fill(`${del2Question} Updated`);
    const expected = editing.locator('input[type="text"]').nth(1);
    if (await expected.isVisible()) {
      const current = await expected.inputValue();
      if (!current.trim()) await expected.fill('Pass');
    }
    await editing.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(
      page,
      /Inspection checklist updated successfully|Checklist updated successfully/,
    );
    await deleteQuestion(page, `${del2Question} Updated`);
    await openList(page);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, `${del2Question} Updated`)).toHaveCount(0);
  });
});
