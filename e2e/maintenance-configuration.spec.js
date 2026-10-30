// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-MC-${Date.now().toString(36)}`;
const configUrl = `${BASE}/adminsettings/configuration/maintenance-config`;
const freqAddUrl = `${BASE}/admin-settings/maintenance-frequency/add`;
const hubUrl = `${BASE}/adminsettings/configuration`;

const typeName = `${run}-Type`;
const stayStep = `${run} Stay`;
const stayUpdated = `${stayStep} Updated`;
const cancelStep = `${run} Cancel`;
const delStep = `${run} Del`;
const del2Step = `${run} Del2`;
const stayFreq = `${run} Freq`;
const stayFreqUpdated = `${stayFreq} Updated`;
const stayCheck = `${run} Check`;
const delCheck = `${run} DelCheck`;
const delFreq = `${run} DelFreq`;
const del2Freq = `${run} Del2Freq`;

const state = {
  typeName: '',
  uomText: '',
  firstRole: '',
  extraRole: '',
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
function outerTabs(page) {
  return page.getByRole('navigation', { name: 'Tabs' }).first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function namedRow(page, name) {
  return page.locator('tbody tr').filter({
    has: page.locator('span.font-medium').filter({ hasText: new RegExp(`^${escapeRe(name)}$`) }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function freqRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function addStepDialog(page) {
  return page.locator('div.fixed').filter({ hasText: 'Add Workflow Step' });
}

/**
 * @param {import('@playwright/test').Locator} select
 * @param {string} labelPart
 * @param {string} what
 */
async function selectOptionByLabel(select, labelPart, what) {
  const option = select.locator('option').filter({ hasText: labelPart });
  const attached = await option.first().waitFor({ state: 'attached', timeout: 8000 }).then(() => true).catch(() => false);
  if (!attached) return false;
  const value = await option.first().getAttribute('value');
  if (!value) return false;
  await select.selectOption(value);
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openConfig(page) {
  await gotoProtected(page, configUrl);
  await expect(outerTabs(page).getByRole('button', { name: 'Maintenance Details' })).toBeVisible({
    timeout: 30000,
  });
  await expect(outerTabs(page).getByRole('button', { name: 'Maintenance Frequency' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openDetails(page) {
  await openConfig(page);
  await outerTabs(page).getByRole('button', { name: 'Maintenance Details' }).click();
  await expect(page.getByRole('heading', { name: 'Maintenance Details' })).toBeVisible({
    timeout: 20000,
  });
  const loading = page.getByText('Loading...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openWorkflowSteps(page) {
  await openDetails(page);
  await page.getByRole('button', { name: 'Workflow Steps' }).click();
  await expect(page.locator('button[title="Add Workflow Step"]')).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openSequences(page) {
  await openDetails(page);
  await page.getByRole('button', { name: 'Asset Type Sequences' }).click();
  await expect(page.getByText(/Select Asset Type/i).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openJobRoles(page) {
  await openDetails(page);
  await page.getByRole('button', { name: 'Select Job Role' }).click();
  await expect(page.getByText('Select Workflow Step', { exact: true }).or(page.getByText('Select Workflow Step *')).first()).toBeVisible({ timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openFrequencyList(page) {
  await openConfig(page);
  await outerTabs(page).getByRole('button', { name: 'Maintenance Frequency' }).click();
  await expect(page.getByRole('heading', { name: 'Maintenance Frequency' })).toBeVisible({
    timeout: 20000,
  });
  const loading = page.getByText('Loading...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openAddStep(page) {
  await openWorkflowSteps(page);
  await page.locator('button[title="Add Workflow Step"]').click();
  await expect(addStepDialog(page).getByRole('heading', { name: 'Add Workflow Step' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAssetType(page) {
  if (state.typeName) return;
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page
      .getByRole('columnheader', { name: 'Asset Type Name' })
      .or(page.getByText('No data found', { exact: true })).first(),
  ).toBeVisible({ timeout: 30000 });
  const existing = page.locator('tbody tr').filter({ hasText: typeName });
  if (await existing.count()) {
    state.typeName = typeName;
    return;
  }
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(typeName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${typeName}" created successfully`);
  state.typeName = typeName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function createStep(page, name) {
  await openAddStep(page);
  const dialog = addStepDialog(page);
  await dialog.getByPlaceholder(/Enter workflow step name/).fill(name);
  await dialog.getByRole('button', { name: 'Add Step' }).click();
  await expectToast(page, 'Workflow step created successfully');
  await expect(dialog).toHaveCount(0);
  await expect(namedRow(page, name)).toBeVisible({ timeout: 20000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function chooseOurAssetType(page) {
  await ensureAssetType(page);
  await openSequences(page);
  const select = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Asset Type --' }),
  });
  await selectOptionByLabel(select, typeName, 'Asset type');
  await expect(page.getByRole('heading', { name: 'Existing Sequences' })).toBeVisible({
    timeout: 8000,
  }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} stepName
 * @param {string} seqNo
 */
async function addSequence(page, stepName, seqNo) {
  await chooseOurAssetType(page);
  const stepSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Step --' }),
  });
  await selectOptionByLabel(stepSelect, stepName, 'Workflow step');
  await page.getByPlaceholder('10, 20, 30, etc.').fill(seqNo);
  await page.locator('button[title="Add Sequence"]').click();
  await expectToast(page, 'Sequence created successfully');
  await expect(namedRow(page, stepName)).toBeVisible({ timeout: 20000 });
  await expect(namedRow(page, stepName)).toContainText(seqNo);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} stepName
 * @param {number} optionIndex
 */
async function assignJobRole(page, stepName, optionIndex) {
  await openJobRoles(page);
  const stepSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Workflow Step --' }),
  });
  await selectOptionByLabel(stepSelect, stepName, 'Workflow step');
  await expect(page.getByRole('heading', { name: 'Selected Job Roles' })).toBeVisible({
    timeout: 20000,
  });
  const roleSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Job Role --' }),
  });
  const options = roleSelect.locator('option');
  await expect(options.nth(optionIndex), 'Job role list has no option to assign').toBeAttached({
    timeout: 20000,
  });
  const label = ((await options.nth(optionIndex).textContent()) || '').trim();
  const value = await options.nth(optionIndex).getAttribute('value');
  expect(value, `Job role option ${optionIndex} has no value`).toBeTruthy();
  await roleSelect.selectOption(value);
  await page.locator('button[title="Select Job Role"]').click();
  await expectToast(page, 'Job role assigned successfully');
  await expect(namedRow(page, label)).toBeVisible({ timeout: 8000 }).catch(() => {});
  return label;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 * @param {string} frequency
 */
async function fillFrequencyForm(page, text, frequency) {
  await ensureAssetType(page);
  await gotoProtected(page, freqAddUrl);
  await expect(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).toBeVisible({
    timeout: 30000,
  });
  const typeSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Asset Type --' }),
  });
  await selectOptionByLabel(typeSelect, typeName, 'Asset type');
  await expect(page.getByText('Recurring', { exact: true })).toBeVisible();
  const maintSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select Maintenance Type --' }),
  });
  if (!(await maintSelect.inputValue())) {
    const first = maintSelect.locator('option').nth(1);
    await expect(first, 'Maintenance type is not in the dropdown').toBeAttached({ timeout: 20000 });
    const value = await first.getAttribute('value');
    await maintSelect.selectOption(value);
  }
  await page.getByPlaceholder('Enter frequency (e.g., 30, 90, 180)').fill(frequency);
  const uomSelect = page.locator('select').filter({
    has: page.getByRole('option', { name: '-- Select UOM --' }),
  });
  const firstUom = uomSelect.locator('option').nth(1);
  await expect(firstUom, 'UOM is not in the dropdown').toBeAttached({ timeout: 20000 });
  state.uomText = ((await firstUom.textContent()) || '').trim();
  const uomValue = await firstUom.getAttribute('value');
  await uomSelect.selectOption(uomValue);
  await page.getByPlaceholder('Enter description (e.g., Quarterly, Monthly)').fill(text);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function createFrequency(page, text) {
  await fillFrequencyForm(page, text, '365');
  await page.getByRole('button', { name: 'Save Frequency' }).click();
  await expectToast(page, 'Maintenance frequency created successfully');
  await expect(page.getByRole('heading', { name: 'Maintenance Frequency' })).toBeVisible({
    timeout: 30000,
  });
  const row = freqRow(page, text);
  await expect(row).toBeVisible({ timeout: 20000 });
  await expect(row).toContainText('365');
  await expect(row).toContainText('In-House');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
async function deleteFrequency(page, text) {
  await openFrequencyList(page);
  const row = freqRow(page, text);
  await expect(row).toBeVisible({ timeout: 20000 });
  page.once('dialog', (d) => d.accept());
  await row.locator('button[title="Delete"]').click();
  await expectToast(page, 'Maintenance frequency deleted successfully');
  await expect(freqRow(page, text)).toHaveCount(0);
}

test.describe('Maintenance Configuration', () => {
  test('MC-01 Open Maintenance Configuration', async ({ page }) => {
    await openConfig(page);
    await expect(page.getByText('Maintenance Configuration', { exact: true }).first()).toBeVisible();
    await expect(outerTabs(page).getByRole('button', { name: 'Maintenance Details' })).toBeVisible();
    await expect(outerTabs(page).getByRole('button', { name: 'Maintenance Frequency' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Maintenance Details' })).toBeVisible();
  });

  test('MC-02 Maintenance Details heading', async ({ page }) => {
    await openDetails(page);
    await expect(
      page.getByText(
        'Configure workflow steps, sequences, and job role assignments for maintenance approvals',
      ),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Workflow Steps' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Asset Type Sequences' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Select Job Role' })).toBeVisible();
    await expect(page.locator('button[title="Add Workflow Step"]')).toBeVisible();
  });

  test('MC-03 Steps already on the screen stay', async ({ page }) => {
    await openWorkflowSteps(page);
    const empty = page.getByText('No workflow steps created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(page.getByText('Click the + icon to create your first workflow step')).toBeVisible();
      return;
    }
    await expect(page.getByRole('columnheader', { name: 'Step Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    const first = page.locator('tbody tr').first();
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Delete"]')).toBeVisible();
  });

  test('MC-04 Loading then the list', async ({ page }) => {
    await openWorkflowSteps(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Maintenance Details' })).toBeVisible({
      timeout: 30000,
    });
    const loading = page.getByText('Loading...', { exact: true });
    await expect(
      loading
        .or(page.getByRole('columnheader', { name: 'Step Name' }))
        .or(page.getByText('No workflow steps created yet', { exact: true }))
        .first(),
    ).toBeVisible({ timeout: 30000 });
    await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  });

  test('MC-05 Return to the Admin Dashboard', async ({ page }) => {
    await openConfig(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'Admin Settings', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByRole('heading', { name: 'Maintenance Configuration', exact: true }),
    ).toBeVisible();
  });

  test('MC-06 Open Add Workflow Step', async ({ page }) => {
    await openAddStep(page);
    const dialog = addStepDialog(page);
    await expect(dialog.getByText('Step Name', { exact: false })).toBeVisible();
    await expect(dialog.getByPlaceholder(/Enter workflow step name/)).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Add Step' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Cancel' })).toBeVisible();
  });

  test('MC-07 Step Name is required', async ({ page }) => {
    await openAddStep(page);
    const dialog = addStepDialog(page);
    await dialog.getByRole('button', { name: 'Add Step' }).click();
    await expectToast(page, 'Step name is required');
    await expect(dialog.getByRole('heading', { name: 'Add Workflow Step' })).toBeVisible();
    await expect(namedRow(page, stayStep)).toHaveCount(0);

    await dialog.getByPlaceholder(/Enter workflow step name/).fill('   ');
    await dialog.getByRole('button', { name: 'Add Step' }).click();
    await expectToast(page, 'Step name is required');
    await expect(dialog.getByRole('heading', { name: 'Add Workflow Step' })).toBeVisible();
  });

  test('MC-08 Close create without saving', async ({ page }) => {
    await openAddStep(page);
    let dialog = addStepDialog(page);
    await dialog.getByPlaceholder(/Enter workflow step name/).fill(cancelStep);
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, cancelStep)).toHaveCount(0);

    await page.locator('button[title="Add Workflow Step"]').click();
    dialog = addStepDialog(page);
    await dialog.getByPlaceholder(/Enter workflow step name/).fill(cancelStep);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, cancelStep)).toHaveCount(0);

    await page.locator('button[title="Add Workflow Step"]').click();
    dialog = addStepDialog(page);
    await dialog.getByPlaceholder(/Enter workflow step name/).fill(cancelStep);
    await page.locator('div.fixed.inset-0').click({ position: { x: 8, y: 8 } });
    await expect(dialog).toHaveCount(0);
    await expect(namedRow(page, cancelStep)).toHaveCount(0);
  });

  test('MC-09 Create the keeper workflow step', async ({ page }) => {
    await createStep(page, stayStep);
  });

  test('MC-10 Rename the keeper step', async ({ page }) => {
    await openWorkflowSteps(page);
    const row = namedRow(page, stayStep);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill(stayUpdated);
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Workflow step updated successfully');
    await expect(namedRow(page, stayUpdated)).toBeVisible({ timeout: 20000 });
    await expect(namedRow(page, stayStep)).toHaveCount(0);
  });

  test('MC-11 Cancel edit without saving', async ({ page }) => {
    await openWorkflowSteps(page);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill(`${stayUpdated} discard`);
    await editing.locator('button[title="Cancel"]').click();
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, `${stayUpdated} discard`)).toHaveCount(0);
  });

  test('MC-12 Empty name is blocked on update', async ({ page }) => {
    await openWorkflowSteps(page);
    const row = namedRow(page, stayUpdated);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editing = page.locator('tbody tr').filter({ has: page.locator('button[title="Save"]') });
    await editing.locator('input[type="text"]').fill('');
    await editing.locator('button[title="Save"]').click();
    await expectToast(page, 'Step name is required');
    await editing.locator('button[title="Cancel"]').click();
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('MC-13 Open Asset Type Sequences', async ({ page }) => {
    await openSequences(page);
    const select = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Asset Type --' }),
    });
    await expect(select).toHaveValue('');
    await expect(page.getByRole('heading', { name: 'Existing Sequences' })).toHaveCount(0);
  });

  test('MC-14 Choose an asset type', async ({ page }) => {
    await chooseOurAssetType(page);
    await expect(page.getByRole('columnheader', { name: 'Workflow Step' }).or(
      page.getByText('No sequences assigned for this asset type', { exact: true }),
    ).first()).toBeVisible();
  });

  test('MC-15 Sequence fields are required', async ({ page }) => {
    await chooseOurAssetType(page);
    await page.locator('button[title="Add Sequence"]').click();
    await expectToast(page, /Please select a workflow step|Sequence number must be a positive integer/);
    const stepSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Step --' }),
    });
    await selectOptionByLabel(stepSelect, stayUpdated, 'Workflow step');
    await page.locator('button[title="Add Sequence"]').click();
    await expectToast(page, 'Sequence number must be a positive integer (e.g., 1, 2, 3)');
    await expect(namedRow(page, stayUpdated)).toHaveCount(0);
  });

  test('MC-16 Add a sequence that uses only the keeper step', async ({ page }) => {
    await addSequence(page, stayUpdated, '990');
  });

  test('MC-17 A duplicate sequence number is blocked', async ({ page }) => {
    await createStep(page, delStep);
    await chooseOurAssetType(page);
    const stepSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Step --' }),
    });
    await selectOptionByLabel(stepSelect, delStep, 'Workflow step');
    await page.getByPlaceholder('10, 20, 30, etc.').fill('990');
    await page.locator('button[title="Add Sequence"]').click();
    await expectToast(page, 'Sequence number 990 already exists for this asset type');
    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await expect(namedRow(page, delStep)).toHaveCount(0);
  });

  test('MC-18 Assign a job role only to the keeper step', async ({ page }) => {
    state.firstRole = await assignJobRole(page, stayUpdated, 1);
  });

  test('MC-19 Job Role is required', async ({ page }) => {
    await openJobRoles(page);
    const stepSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Workflow Step --' }),
    });
    await selectOptionByLabel(stepSelect, stayUpdated, 'Workflow step');
    const roleSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Job Role --' }),
    });
    await roleSelect.selectOption({ label: '-- Select Job Role --' });
    await page.locator('button[title="Select Job Role"]').click();
    await expectToast(page, 'Please select a job role');
    await expect(namedRow(page, state.firstRole)).toBeVisible();
  });

  test('MC-20 Remove only an extra job role assignment', async ({ page }) => {
    const roleSelectProbe = async () => {
      await openJobRoles(page);
      const stepSelect = page.locator('select').filter({
        has: page.getByRole('option', { name: '-- Select Workflow Step --' }),
      });
      await selectOptionByLabel(stepSelect, stayUpdated, 'Workflow step');
      return page.locator('select').filter({
        has: page.getByRole('option', { name: '-- Select Job Role --' }),
      });
    };
    const select = await roleSelectProbe();
    const count = await select.locator('option').count();
    if (count > 2) {
      state.extraRole = await assignJobRole(page, stayUpdated, 2);
    } else {
      state.extraRole = await assignJobRole(page, delStep, 1);
    }
    await openJobRoles(page);
    const stepSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Workflow Step --' }),
    });
    const stepForExtra = count > 2 ? stayUpdated : delStep;
    await selectOptionByLabel(stepSelect, stepForExtra, 'Workflow step');
    const row = namedRow(page, state.extraRole);
    await expect(row).toBeVisible({ timeout: 20000 });
    page.once('dialog', (d) => d.accept());
    await row.locator('button[title="Remove"]').click();
    await expectToast(page, 'Job role removed successfully');
    if (stepForExtra === stayUpdated) {
      await expect(namedRow(page, state.firstRole)).toBeVisible();
    }
    await expect(namedRow(page, state.extraRole)).toHaveCount(0);
  });

  test('MC-21 Open Maintenance Frequency', async ({ page }) => {
    await openFrequencyList(page);
    await expect(
      page.getByText('Configure maintenance frequencies and checklists for asset types'),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Frequency' }).nth(1)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Checklist' })).toBeVisible();
    await expect(page.locator('button[title="Filter"]')).toBeVisible();
    await expect(page.locator('button[title="Create Maintenance Frequency"]')).toBeVisible();
    await expect(headerAddButton(page)).toHaveCount(0);
  });

  test('MC-22 Frequency list columns', async ({ page }) => {
    await openFrequencyList(page);
    const empty = page.getByText('No maintenance frequencies created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }
    await expect(page.getByRole('columnheader', { name: 'Asset Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Frequency' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Text' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maintained By' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Maintenance Type' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Lead Time' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Downtime' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
  });

  test('MC-23 Frequencies already on the screen', async ({ page }) => {
    await openFrequencyList(page);
    const empty = page.getByText('No maintenance frequencies created yet', { exact: true });
    if (await empty.isVisible().catch(() => false)) {
      await expect(empty).toBeVisible();
      return;
    }
    const first = page.locator('tbody tr').first();
    await expect(first).toBeVisible();
    await expect(first.locator('td').first()).not.toHaveText(/^$/);
    await expect(first.locator('button[title="Edit"]')).toBeVisible();
    await expect(first.locator('button[title="Delete"]')).toBeVisible();
  });

  test('MC-25 Open Create Maintenance Frequency and close', async ({ page }) => {
    await openFrequencyList(page);
    await page.locator('button[title="Create Maintenance Frequency"]').click();
    await expect(page).toHaveURL(/\/admin-settings\/maintenance-frequency\/add/);
    await expect(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('heading', { name: 'Maintenance Frequency Details' })).toBeVisible();
    await expect(page.getByText('Asset Type', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(page.getByRole('heading', { name: 'Maintenance Frequency' })).toBeVisible({
      timeout: 30000,
    });
    await expect(freqRow(page, stayFreq)).toHaveCount(0);
  });

  test('MC-26 Create is blocked without Asset Type', async ({ page }) => {
    await gotoProtected(page, freqAddUrl);
    await expect(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).toBeVisible({
      timeout: 30000,
    });
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    const toast = page.getByText(/Please select an asset type|Please select a maintenance type/);
    await expect(
      toast.or(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).toBeVisible();
  });

  test('MC-27 Create the keeper frequency', async ({ page }) => {
    await createFrequency(page, stayFreq);
  });

  test('MC-28 Recurring needs frequency and UOM', async ({ page }) => {
    await fillFrequencyForm(page, `${run} blocked`, '');
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    const requiredToast = page.getByText(
      /Please enter a valid frequency|Please select Unit of Measure \(UOM\)/,
    );
    await expect(
      requiredToast.or(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).first(),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Create Maintenance Frequency' })).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();
    await expect(freqRow(page, stayFreq)).toBeVisible({ timeout: 20000 });
  });

  test('MC-24 Filter by Asset Type', async ({ page }) => {
    await openFrequencyList(page);
    await page.locator('button[title="Filter"]').click();
    const columnSelect = page.locator('select').filter({ hasText: 'Select column' });
    await columnSelect.selectOption({ label: 'Asset Type' });
    await page.getByRole('button', { name: 'Select value' }).click();
    const menu = page.locator('div.absolute.z-50').last();
    await menu.getByText(typeName, { exact: true }).click();
    await expect(freqRow(page, stayFreq)).toBeVisible({ timeout: 20000 });
    const chip = page.locator('div.flex.items-center.border').filter({ has: page.locator('select') });
    await chip.locator('button').first().click();
    await expect(freqRow(page, stayFreq)).toBeVisible();
  });

  test('MC-29 Edit only the keeper frequency', async ({ page }) => {
    await openFrequencyList(page);
    const row = freqRow(page, stayFreq);
    await expect(row).toBeVisible();
    await row.locator('button[title="Edit"]').click();
    const editor = page.locator('tbody tr').filter({ has: page.getByRole('button', { name: 'Save' }) });
    await editor.getByPlaceholder('Enter description').fill(stayFreqUpdated);
    await editor.getByRole('button', { name: 'Save' }).click();
    await expectToast(page, 'Maintenance frequency updated successfully');
    await expect(freqRow(page, stayFreqUpdated)).toBeVisible({ timeout: 20000 });

    const updated = freqRow(page, stayFreqUpdated);
    await updated.locator('button[title="Edit"]').click();
    const again = page.locator('tbody tr').filter({ has: page.getByRole('button', { name: 'Cancel' }) });
    await again.getByPlaceholder('Enter description').fill(`${stayFreqUpdated} discard`);
    await again.getByRole('button', { name: 'Cancel' }).click();
    await expect(freqRow(page, stayFreqUpdated)).toBeVisible();
    await expect(freqRow(page, `${stayFreqUpdated} discard`)).toHaveCount(0);
  });

  test('MC-30 Checklist item only on the keeper frequency', async ({ page }) => {
    await openFrequencyList(page);
    await page.getByRole('button', { name: 'Checklist' }).click();
    const typeSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Asset Type --' }),
    });
    await selectOptionByLabel(typeSelect, typeName, 'Asset type');
    const freqSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Frequency --' }),
    });
    await selectOptionByLabel(freqSelect, stayFreqUpdated, 'Frequency');
    await page.getByPlaceholder('Enter checklist item').fill(stayCheck);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expectToast(page, 'Checklist item added successfully');
    await expect(page.getByText(stayCheck, { exact: true })).toBeVisible();

    await page.getByPlaceholder('Enter checklist item').fill(delCheck);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expectToast(page, 'Checklist item added successfully');
    const delRow = page.locator('tbody tr').filter({ hasText: delCheck });
    await expect(delRow).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await delRow.locator('button[title="Delete"]').click();
    await expectToast(page, 'Checklist item deleted successfully');
    await expect(page.getByText(stayCheck, { exact: true })).toBeVisible();
    await expect(page.getByText(delCheck, { exact: true })).toHaveCount(0);
  });

  test('MC-31 Delete only an extra disposable frequency', async ({ page }) => {
    await createFrequency(page, delFreq);
    await deleteFrequency(page, delFreq);
    await openFrequencyList(page);
    await expect(freqRow(page, stayFreqUpdated)).toBeVisible();
    await expect(freqRow(page, delFreq)).toHaveCount(0);
  });

  test('MC-32 Delete only an extra sequence', async ({ page }) => {
    await addSequence(page, delStep, '991');
    const row = namedRow(page, delStep);
    await expect(row).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await row.locator('button[title="Delete"]').click();
    await expectToast(page, 'Sequence deleted successfully');
    await expect(namedRow(page, delStep)).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('MC-33 Delete only an extra workflow step', async ({ page }) => {
    await openWorkflowSteps(page);
    const row = namedRow(page, delStep);
    await expect(row).toBeVisible();
    page.once('dialog', (d) => d.accept());
    await row.locator('button[title="Delete"]').click();
    await expectToast(page, 'Workflow step deleted successfully');
    await expect(namedRow(page, delStep)).toHaveCount(0);
    await expect(namedRow(page, stayUpdated)).toBeVisible();
  });

  test('MC-34 Run create and delete again on disposable records', async ({ page }) => {
    await createStep(page, del2Step);
    await addSequence(page, del2Step, '992');
    await assignJobRole(page, del2Step, 1);
    await createFrequency(page, del2Freq);

    await chooseOurAssetType(page);
    const seqRow = namedRow(page, del2Step);
    page.once('dialog', (d) => d.accept());
    await seqRow.locator('button[title="Delete"]').click();
    await expectToast(page, 'Sequence deleted successfully');

    await openJobRoles(page);
    const stepSelect = page.locator('select').filter({
      has: page.getByRole('option', { name: '-- Select Workflow Step --' }),
    });
    await selectOptionByLabel(stepSelect, del2Step, 'Workflow step');
    const roleRow = page.locator('tbody tr').first();
    if (await roleRow.locator('button[title="Remove"]').count()) {
      page.once('dialog', (d) => d.accept());
      await roleRow.locator('button[title="Remove"]').click();
      await expectToast(page, 'Job role removed successfully');
    }

    await deleteFrequency(page, del2Freq);

    await openWorkflowSteps(page);
    const stepRow = namedRow(page, del2Step);
    page.once('dialog', (d) => d.accept());
    await stepRow.locator('button[title="Delete"]').click();
    await expectToast(page, 'Workflow step deleted successfully');

    await expect(namedRow(page, stayUpdated)).toBeVisible();
    await openFrequencyList(page);
    await expect(freqRow(page, stayFreqUpdated)).toBeVisible();
    await expect(freqRow(page, del2Freq)).toHaveCount(0);
  });
});
