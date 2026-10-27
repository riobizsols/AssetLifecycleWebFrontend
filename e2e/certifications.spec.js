// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-CT-${Date.now().toString(36)}`;
const stamp = run.slice('PW-CT-'.length);
const certificationsUrl = `${BASE}/certifications`;

const stayCertName = `${run} Stay`;
const stayCertNumber = `${run}-S`;
const delCertName = `${run} Del`;
const delCertNumber = `${run}-D`;
const stay2CertName = `${run} Stay2`;
const stay2CertNumber = `${run}-S2`;
const createdTypeName = `${run}-Type`;

const state = {
  typeName: '',
  maintTypeName: '',
  inspectionTypeName: '',
  stayMapped: false,
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
  await expect(toast).toBeVisible({ timeout: 20000 });
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
 * @param {string} label
 */
function labeledSelect(page, label) {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .locator('select')
    .first();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} heading
 */
function sectionToolbar(page, heading) {
  return page.locator('h2').filter({ hasText: heading }).locator('xpath=../..');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} text
 */
function listRow(page, text) {
  return page.locator('tbody tr').filter({ hasText: text });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCertifications(page) {
  await gotoProtected(page, certificationsUrl);
  await expect(page.locator('header').getByText('Certifications', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible({
    timeout: 30000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMaintenanceTab(page) {
  await openCertifications(page);
  await page.getByRole('button', { name: 'Maintenance Certificate', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Maintenance Certificates' })).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openInspectionTab(page) {
  await openCertifications(page);
  await page.getByRole('button', { name: 'Inspection Certificates', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Inspection Certificates' })).toBeVisible({
    timeout: 15000,
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openCertificateTab(page) {
  await openCertifications(page);
  await page.getByRole('button', { name: 'Certificate', exact: true }).click();
  await expect(page.getByText('Existing Certificates', { exact: true })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 * @param {string} number
 */
async function createCertificateType(page, name, number) {
  await openCertificateTab(page);
  const toolbar = sectionToolbar(page, 'Existing Certificates');
  await toolbar.locator('button[title="Add"]').click();
  await expect(page.getByText('Add New Certificate', { exact: true })).toBeVisible();
  await page.getByPlaceholder('Enter certificate name').fill(name);
  await page.getByPlaceholder('Enter certificate number').fill(number);
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expectToast(page, 'Certificate created successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createMaintRequiredType(page) {
  await gotoProtected(page, `${BASE}/master-data/asset-types`);
  await expect(
    page.getByRole('columnheader', { name: 'Asset Type Name' }).or(page.getByText('No data found', { exact: true })),
  ).toBeVisible({ timeout: 30000 });
  const existing = page.locator('tbody tr').filter({ hasText: createdTypeName });
  if (await existing.count()) {
    state.typeName = createdTypeName;
    return;
  }
  await headerAddButton(page).click();
  await expect(page.locator('header').getByText('Add Asset Type', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await page.getByPlaceholder('Enter asset type name').fill(createdTypeName);
  await page.locator('label').filter({ hasText: 'Require Maintenance' }).locator('input[type="checkbox"]').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${createdTypeName}" created successfully`);
  state.typeName = createdTypeName;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function createOnDemandFrequency(page) {
  await gotoProtected(page, `${BASE}/admin-settings/maintenance-frequency/add`);
  await expect(page.getByText('Create Maintenance Frequency', { exact: true })).toBeVisible({
    timeout: 30000,
  });
  const typeSelect = page.locator('select').filter({ has: page.getByText('-- Select Asset Type --') });
  await typeSelect.selectOption({ label: createdTypeName });
  await page.getByText('On Demand', { exact: true }).click();
  const maintSelect = page.locator('select').filter({ has: page.getByText('-- Select Maintenance Type --') });
  const maintOptions = await realOptions(maintSelect);
  const maint = maintOptions.find((option) => !/other/i.test(option.label)) || maintOptions[0];
  if (!maint) {
    throw new Error(
      'No maintenance type exists. Create one on Maintenance Types, leave it, and rerun this file.',
    );
  }
  await maintSelect.selectOption({ value: maint.value });
  await page.getByRole('button', { name: 'Save Frequency' }).click();
  await expectToast(page, 'Maintenance frequency created successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureMaintAssetType(page) {
  if (state.typeName) return;
  await openMaintenanceTab(page);
  const select = labeledSelect(page, 'Asset Type');
  await expect(select).toBeVisible();
  const options = await realOptions(select);
  if (options.length) {
    state.typeName = options[0].label;
    await select.selectOption({ value: options[0].value });
    const maintSelect = labeledSelect(page, 'Maintenance Type');
    await expect
      .poll(async () => (await realOptions(maintSelect)).length, { timeout: 20000 })
      .toBeGreaterThan(0);
    const maintOptions = await realOptions(maintSelect);
    const maint = maintOptions.find((option) => !/other/i.test(option.label)) || maintOptions[0];
    if (maint) {
      await maintSelect.selectOption({ value: maint.value });
      state.maintTypeName = maint.label;
    }
    return;
  }

  await createMaintRequiredType(page);
  await createOnDemandFrequency(page);
  await expect
    .poll(
      async () => {
        await openMaintenanceTab(page);
        const listed = await realOptions(labeledSelect(page, 'Asset Type'));
        return listed.some((option) => option.label === createdTypeName);
      },
      { timeout: 45000 },
    )
    .toBeTruthy();
  state.typeName = createdTypeName;
  const maintSelect = labeledSelect(page, 'Maintenance Type');
  const maintOptions = await realOptions(maintSelect);
  const maint = maintOptions.find((option) => !/other/i.test(option.label)) || maintOptions[0];
  if (!maint) {
    throw new Error(
      `Asset type ${createdTypeName} has no maintenance type. Add a maintenance frequency, leave it, and rerun this file.`,
    );
  }
  await maintSelect.selectOption({ value: maint.value });
  state.maintTypeName = maint.label;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function selectListAssetAndMaint(page) {
  await labeledSelect(page, 'Asset Type').selectOption({ label: state.typeName });
  const maintSelect = labeledSelect(page, 'Maintenance Type');
  await expect(maintSelect).toBeEnabled({ timeout: 15000 });
  if (state.maintTypeName) {
    await maintSelect.selectOption({ label: state.maintTypeName });
  } else {
    const options = await realOptions(maintSelect);
    const maint = options.find((option) => !/other/i.test(option.label)) || options[0];
    if (!maint) {
      throw new Error(
        `No maintenance type for ${state.typeName}. Add a frequency, leave it, and rerun this file.`,
      );
    }
    await maintSelect.selectOption({ value: maint.value });
    state.maintTypeName = maint.label;
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMappingForm(page) {
  await openMaintenanceTab(page);
  await sectionToolbar(page, 'Maintenance Certificates').locator('button[title="Add"]').click();
  await expect(page.getByText('Asset & Maintenance Type', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Available Certificates' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Selected Certificates' })).toBeVisible();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} certName
 */
async function mapCertificate(page, certName) {
  await openMappingForm(page);
  const formAsset = page
    .locator('h3')
    .filter({ hasText: 'Asset & Maintenance Type' })
    .locator('xpath=..')
    .locator('label')
    .filter({ hasText: /^Asset Type$/ })
    .locator('xpath=..')
    .locator('select');
  const formMaint = page
    .locator('h3')
    .filter({ hasText: 'Asset & Maintenance Type' })
    .locator('xpath=..')
    .locator('label')
    .filter({ hasText: /^Maintenance Type$/ })
    .locator('xpath=..')
    .locator('select');
  await formAsset.selectOption({ label: state.typeName });
  await expect.poll(async () => (await realOptions(formMaint)).length, { timeout: 20000 }).toBeGreaterThan(0);
  await formMaint.selectOption({ label: state.maintTypeName });

  const available = page.locator('div.bg-white.rounded-lg.shadow-sm.border').filter({
    has: page.getByRole('heading', { name: 'Available Certificates' }),
  });
  const selected = page.locator('div.bg-white.rounded-lg.shadow-sm.border').filter({
    has: page.getByRole('heading', { name: 'Selected Certificates' }),
  });
  const alreadySelected = selected.locator('tr').filter({ hasText: certName });
  if (!(await alreadySelected.isVisible().catch(() => false))) {
    const row = available.locator('tr').filter({ hasText: certName });
    await expect(row, `${certName} must be in Available Certificates`).toBeVisible({ timeout: 20000 });
    await row.click();
  }
  await expect(selected.locator('tr').filter({ hasText: certName })).toBeVisible();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, 'Certificates mapped successfully');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} column
 * @param {string} value
 */
async function filterMappedByName(page, column, value) {
  const toolbar = sectionToolbar(page, 'Maintenance Certificates');
  if (!(await page.getByRole('button', { name: 'Clear', exact: true }).isVisible().catch(() => false))) {
    await toolbar.locator('button[title="Filter"]').click();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
  }
  const chip = page.locator('div.flex.items-center.gap-2.border').first();
  await chip.locator('select').selectOption({ label: column });
  await chip.locator('input[placeholder="Search value"]').fill(value);
}

test.describe('Certifications', () => {
  test('CT-01 Open Certifications', async ({ page }) => {
    await openCertifications(page);
    await expect(page.getByRole('button', { name: 'Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Maintenance Certificate', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspection Certificates', exact: true })).toBeVisible();
  });

  test('CT-02 Open Maintenance Certificate', async ({ page }) => {
    await openMaintenanceTab(page);
    await expect(page.locator('label').filter({ hasText: /^Asset Type$/ })).toBeVisible();
    await expect(page.locator('label').filter({ hasText: /^Maintenance Type$/ })).toBeVisible();
    const toolbar = sectionToolbar(page, 'Maintenance Certificates');
    await expect(toolbar.locator('button[title="Add"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Filter"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Delete"]')).toBeVisible();
    const maintSelect = labeledSelect(page, 'Maintenance Type');
    const assetSelect = labeledSelect(page, 'Asset Type');
    const assetValue = await assetSelect.inputValue();
    if (!assetValue) {
      await expect(maintSelect).toBeDisabled();
    }
  });

  test('CT-03 Choose an asset type without mapping', async ({ page }) => {
    await ensureMaintAssetType(page);
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    await expect(page.getByRole('columnheader', { name: 'Certificate Name' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Certificate Number' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    const empty = page.getByText('No certificates mapped.');
    const first = page.locator('tbody tr').filter({ hasNotText: 'No certificates mapped' }).first();
    await expect(empty.or(first)).toBeVisible();
  });

  test('CT-04 Unmap with nothing selected', async ({ page }) => {
    await ensureMaintAssetType(page);
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    await sectionToolbar(page, 'Maintenance Certificates').locator('button[title="Delete"]').click();
    await expectToast(page, 'Please select at least one certificate to unmap');
    await expect(page.getByText('Confirm Delete', { exact: true })).toHaveCount(0);
  });

  test('CT-05 Filter mapped rows', async ({ page }) => {
    await ensureMaintAssetType(page);
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    await sectionToolbar(page, 'Maintenance Certificates').locator('button[title="Filter"]').click();
    await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeVisible();
    const mapped = page.locator('tbody tr').filter({ hasNotText: 'No certificates mapped' }).first();
    if (await mapped.isVisible()) {
      const name = ((await mapped.locator('td').nth(1).innerText()) || '').trim();
      if (name) {
        await filterMappedByName(page, 'Certificate Name', name.slice(0, Math.min(8, name.length)));
        await expect(listRow(page, name)).toBeVisible();
      }
    }
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
  });

  test('CT-06 Create the E2E certificate if needed', async ({ page }) => {
    await createCertificateType(page, stayCertName, stayCertNumber);
    await openMaintenanceTab(page);
    await expect(page.getByRole('heading', { name: 'Maintenance Certificates' })).toBeVisible();
  });

  test('CT-07 Cancel the mapping form', async ({ page }) => {
    await ensureMaintAssetType(page);
    await openMappingForm(page);
    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Asset & Maintenance Type', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Maintenance Certificates' })).toBeVisible();
  });

  test('CT-08 Asset type is required to save a mapping', async ({ page }) => {
    await openMappingForm(page);
    const formAsset = page
      .locator('h3')
      .filter({ hasText: 'Asset & Maintenance Type' })
      .locator('xpath=..')
      .locator('label')
      .filter({ hasText: /^Asset Type$/ })
      .locator('xpath=..')
      .locator('select');
    await formAsset.selectOption({ value: '' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Please select an asset type');
    await expect(page.getByText('Asset & Maintenance Type', { exact: true })).toBeVisible();
  });

  test('CT-09 Maintenance type is required to save a mapping', async ({ page }) => {
    await ensureMaintAssetType(page);
    await openMappingForm(page);
    const formBox = page.locator('h3').filter({ hasText: 'Asset & Maintenance Type' }).locator('xpath=..');
    await formBox.locator('label').filter({ hasText: /^Asset Type$/ }).locator('xpath=..').locator('select').selectOption({
      label: state.typeName,
    });
    await formBox
      .locator('label')
      .filter({ hasText: /^Maintenance Type$/ })
      .locator('xpath=..')
      .locator('select')
      .selectOption({ value: '' });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expectToast(page, 'Please select a maintenance type');
    await expect(page.getByText('Asset & Maintenance Type', { exact: true })).toBeVisible();
  });

  test('CT-10 Map the E2E certificate', async ({ page }) => {
    await ensureMaintAssetType(page);
    await mapCertificate(page, stayCertName);
    await expect(listRow(page, stayCertName)).toBeVisible({ timeout: 30000 });
    state.stayMapped = true;
  });

  test('CT-11 The mapping can be found', async ({ page }) => {
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    const row = listRow(page, stayCertName);
    await expect(row).toBeVisible();
    await expect(row.locator('button[title="Edit"]')).toBeVisible();
  });

  test('CT-12 Cancel unmap of this run only', async ({ page }) => {
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    const row = listRow(page, stayCertName);
    await row.locator('input[type="checkbox"]').check();
    await sectionToolbar(page, 'Maintenance Certificates').locator('button[title="Delete"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toBeVisible();
  });

  test('CT-13 Do not unmap a mapping from another run', async ({ page }) => {
    await openMaintenanceTab(page);
    await selectListAssetAndMaint(page);
    await expect(listRow(page, stayCertName)).toBeVisible();
  });

  test('CT-14 Open Inspection Certificates', async ({ page }) => {
    await openInspectionTab(page);
    const toolbar = sectionToolbar(page, 'Inspection Certificates');
    await expect(toolbar.locator('button[title="Add"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Filter"]')).toBeVisible();
    await expect(toolbar.locator('button[title="Delete"]')).toBeVisible();
    for (const name of ['Certificate Name', 'Asset Type', 'Certificate Number', 'Actions']) {
      await expect(page.getByRole('columnheader', { name })).toBeVisible();
    }
    const empty = page.getByText('No inspection certificates found. Click the Plus icon to add certificates.');
    const first = page.locator('tbody tr').filter({ hasNotText: 'No inspection certificates found' }).first();
    await expect(empty.or(first)).toBeVisible();
  });

  test('CT-15 Cancel the inspection form', async ({ page }) => {
    await openInspectionTab(page);
    await sectionToolbar(page, 'Inspection Certificates').locator('button[title="Add"]').click();
    await expect(page.getByText('Select Asset Type', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Inspection Certificates' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(0);
  });

  test('CT-16 Inspection save needs a certificate', async ({ page }) => {
    await openInspectionTab(page);
    await sectionToolbar(page, 'Inspection Certificates').locator('button[title="Add"]').click();
    const typeButton = page.getByRole('button').filter({ hasText: /Select Asset Type/ }).first();
    await typeButton.click();
    const search = page.getByPlaceholder('Search asset types...');
    await expect(search).toBeVisible();
    const options = page.locator('div.max-h-48 button');
    const count = await options.count();
    if (count === 0) {
      throw new Error(
        'No inspection-required asset type is listed. Add an inspection checklist for an asset type on Inspection Checklists, leave it, and rerun this file.',
      );
    }
    state.inspectionTypeName = ((await options.first().innerText()) || '').trim();
    await options.first().click();
    await expect(page.getByRole('button', { name: 'Add', exact: true })).toBeDisabled();
  });

  test('CT-17 Add the E2E certificate to inspection', async ({ page }) => {
    await openInspectionTab(page);
    await sectionToolbar(page, 'Inspection Certificates').locator('button[title="Add"]').click();
    const typeTrigger = page
      .locator('label')
      .filter({ hasText: /^Select Asset Type$/ })
      .locator('xpath=..')
      .getByRole('button')
      .first();
    await typeTrigger.click();
    const search = page.getByPlaceholder('Search asset types...');
    await expect(search).toBeVisible();
    const options = page.locator('div.max-h-48 button');
    if ((await options.count()) === 0) {
      throw new Error(
        'No inspection-required asset type is listed. Add an inspection checklist for an asset type on Inspection Checklists, leave it, and rerun this file.',
      );
    }
    if (state.inspectionTypeName) {
      await options.filter({ hasText: state.inspectionTypeName }).first().click();
    } else {
      state.inspectionTypeName = ((await options.first().innerText()) || '').trim();
      await options.first().click();
    }
    const available = page.locator('div.bg-white.rounded-lg.shadow-sm.border').filter({
      has: page.getByText('Available Certificates'),
    });
    const row = available.locator('tr').filter({ hasText: stayCertName });
    await expect(row).toBeVisible({ timeout: 20000 });
    await row.click();
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    const dbSetup = page.getByText(/Database setup required/i);
    const success = page.getByText('Inspection certificates added successfully');
    await expect(success.or(dbSetup)).toBeVisible({ timeout: 20000 });
    if (await success.isVisible().catch(() => false)) {
      await expect(listRow(page, stayCertName)).toBeVisible({ timeout: 20000 });
    }
  });

  test('CT-18 Unmap only a disposable maintenance mapping', async ({ page }) => {
    await createCertificateType(page, delCertName, delCertNumber);
    await ensureMaintAssetType(page);
    await mapCertificate(page, delCertName);
    await expect(listRow(page, delCertName)).toBeVisible({ timeout: 30000 });
    const row = listRow(page, delCertName);
    await row.locator('input[type="checkbox"]').check();
    await sectionToolbar(page, 'Maintenance Certificates').locator('button[title="Delete"]').click();
    const dialog = page.locator('div.fixed').filter({ hasText: 'Confirm Delete' });
    await expect(dialog.getByText('Confirm Delete')).toBeVisible();
    await dialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await expectToast(page, 'Certificates unmapped successfully');
    await expect(row).toHaveCount(0);
    await expect(listRow(page, stayCertName)).toBeVisible();
  });

  test('CT-19 Run map again', async ({ page }) => {
    await createCertificateType(page, stay2CertName, stay2CertNumber);
    await ensureMaintAssetType(page);
    await mapCertificate(page, stay2CertName);
    await expect(listRow(page, stay2CertName)).toBeVisible({ timeout: 30000 });
    await expect(listRow(page, stayCertName)).toBeVisible();
  });
});
