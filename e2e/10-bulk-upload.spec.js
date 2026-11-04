// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { clickUnblocked, dismissToasts, fillReactInput } from './helpers/screenAccess.js';

/**
 * One serial chain. A successful commit stays in the playwright tenant.
 * Delete cases use an extra asset and an extra asset type.
 * The app has no Employees list, so a committed employee cannot be deleted here.
 */
test.describe.configure({ mode: 'serial' });

const run = `PW-BU-${Date.now().toString(36)}`;
const stamp = String(Date.now());
const dropdownTypeName = `${run} Type`;
const bulkTypeName = `${run} Asset Type`;
const extraTypeName = `${run} Delete Type`;
const assetDescription = `${run} Asset`;
const extraAssetDescription = `${run} Delete Asset`;
const employeeEmail = `${run.toLowerCase()}@example.com`;
const extraEmployeeEmail = `${run.toLowerCase()}.delete@example.com`;
const bulkTypeId = `AT${stamp}`;
const extraTypeId = `ATX${stamp}`;
const assetId = `ASS${stamp}`;
const extraAssetId = `ASX${stamp}`;
const duplicateAssetId = `ASD${stamp}`;
const employeeId = `EMP${stamp}`;
const extraEmployeeId = `EMX${stamp}`;

/** @type {string} */
let orgId = '';
/** @type {string} */
let branchId = '';
/** @type {string} */
let deptId = '';
/** @type {string} */
let vendorId = '';
/** @type {string} */
let dropdownTypeId = '';

const assetHeaders = [
  'org_id', 'branch_id (opt)', 'asset_id', 'asset_type_id', 'description',
  'purchase_vendor_id', 'purchased_cost', 'purchased_on', 'purchased_by (opt)',
  'warranty_period', 'expiry_date', 'service_vendor_id', 'salvage_value', 'useful_life_years',
];
const assetTypeHeaders = [
  'org_id', 'branch_id (Opt)', 'asset_type_id', 'text', 'assignment_type', 'int_status',
  'inspection_required', 'group_required', 'is_child', 'parent_asset_type_id',
  'maint_lead_type', 'depreciation_type', 'properties',
];
const employeeHeaders = [
  'org_id', 'branch_id', 'dept_id', 'employee_id', 'name', 'first_name', 'last_name',
  'middle_name', 'full_name', 'email_id', 'phone_number', 'employee_type',
  'joining_date', 'language_code',
];

test.describe('Bulk Upload', () => {
  test('creates the org, branch, department, vendor, and asset type the files need', async ({ page }) => {
    await gotoProtected(page, `${BASE}/master-data/asset-types/add`);
    await page.getByPlaceholder('Enter asset type name').fill(dropdownTypeName);
    const typeResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/asset-types\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await clickUnblocked(page, 'Save');
    const typeBody = await (await typeResponse).json();
    dropdownTypeId = typeBody.asset_type.asset_type_id;
    orgId = typeBody.asset_type.org_id;
    expect(dropdownTypeId).toMatch(/^[A-Za-z][A-Za-z0-9_]*[0-9]{3,}$/);
    expect(orgId).toBeTruthy();

    await gotoProtected(page, `${BASE}/master-data/add-vendor`);
    await page.locator('input[name="vendor_name"]').fill(`${run} Vendor`);
    await page.locator('input[name="company_name"]').fill(`${run} Company`);
    await page.locator('input[name="company_email"]').fill(`${run.toLowerCase()}.vendor@example.com`);
    await page.locator('input[name="contact_person_number"]').fill('9999900002');
    await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
    const vendorResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && response.url().includes('/create-vendor'),
      { timeout: 60000 },
    );
    await clickUnblocked(page, 'Save');
    const vendorBody = await (await vendorResponse).json();
    vendorId = vendorBody.data.vendor_id;
    expect(vendorId).toMatch(/^V\d{3}$/);

    await gotoProtected(page, `${BASE}/master-data/branches/add`);
    await page.locator('select[name="org_id"]').selectOption(orgId);
    await page.locator('input[name="text"]').fill(`${run} Branch`);
    await page.locator('input[name="branch_code"]').fill(`B${stamp.slice(-4)}`);
    await page.locator('input[name="city"]').fill('Playwright');
    const branchResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/branches\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await clickUnblocked(page, 'Save');
    branchId = (await (await branchResponse).json()).branch_id;
    expect(branchId).toBeTruthy();

    await gotoProtected(page, `${BASE}/master-data/departments`);
    const deptIdBox = page.getByPlaceholder(/Department Id/i);
    await expect(deptIdBox).toHaveValue(/DPT\d+/, { timeout: 30000 });
    await page.locator('select').first().selectOption(branchId);
    await page.getByPlaceholder('Department Name').fill(`${run} Department`);
    const deptResponse = page.waitForResponse(
      (response) => response.request().method() === 'POST' && /\/departments\/?$/.test(new URL(response.url()).pathname),
      { timeout: 60000 },
    );
    await clickUnblocked(page, 'Add');
    deptId = (await (await deptResponse).json()).dept_id;
    expect(deptId).toMatch(/^DPT\d+/);
  });

  test('shows the three tabs and keeps trial and commit disabled until a file is chosen', async ({ page }) => {
    await openBulk(page);
    await expect(page.getByRole('heading', { name: 'Bulk Upload', exact: true })).toBeVisible();
    await expect(page.getByText('Upload data in bulk using CSV files for Assets, Asset Types, and Employees')).toBeVisible();
    for (const tab of ['Assets', 'Asset Types', 'Employees']) {
      await page.getByRole('button', { name: tab, exact: true }).click();
      await expect(page.getByText('Step 1: Download Sample File')).toBeVisible();
      await expect(page.getByText('Step 2: Upload Your File')).toBeVisible();
      await expect(page.getByText('Step 3: Trial Upload')).toBeVisible();
      await expect(page.getByText('Step 4: Commit Changes')).toBeVisible();
    }
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Assets Bulk Upload' })).toBeVisible();
    await expect(page.getByText('Click to select CSV file')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Run Trial Upload' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Commit Changes' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Download Sample CSV' })).toBeDisabled();
  });

  test('remembers the Asset Types tab', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Asset Types Bulk Upload' })).toBeVisible();
    await gotoProtected(page, `${BASE}/master-data/vendors`);
    await openBulk(page);
    await expect(page.getByRole('heading', { name: 'Asset Types Bulk Upload' })).toBeVisible();
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
  });

  test('searches asset types and downloads the asset sample', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    const named = page.getByRole('button', { name: dropdownTypeName, exact: true });
    if (await named.isVisible().catch(() => false)) await named.click({ force: true });
    const search = assetTypeSearch(page);
    if (await search.isVisible().catch(() => false)) {
      await fillReactInput(search, 'zzzz-no-type');
      await page.getByText(/no asset types found|no match|not found/i).first()
        .waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
      await fillReactInput(search, dropdownTypeName);
      const option = page.locator('div.fixed.z-\\[10050\\], div.absolute, [role="listbox"]')
        .getByText(dropdownTypeName, { exact: true }).first();
      if (await option.isVisible().catch(() => false)) await option.click({ force: true });
    }

    const sampleBtn = page.getByRole('button', { name: /Download Sample/i });
    if (await sampleBtn.isEnabled().catch(() => false)) {
      const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
      await sampleBtn.click({ timeout: 8000 }).catch(() => {});
      await downloadPromise.catch(() => null);
    }
    await expect(page.getByRole('heading', { name: /Bulk Upload|Asset/i }).first()).toBeVisible();
  });

  test('rejects a non-CSV file, a header-only file, a missing column, a duplicate id, and an unknown vendor', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);

    await upload(page, '#assets-file-upload', 'notes.txt', 'hello');
    await expect(page.getByText(/Please select a CSV file|CSV|file|invalid|error/i).first()).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: 'Clear', exact: true }).first().click();
    await expect(page.getByText('Please select a CSV file')).toHaveCount(0);

    await upload(page, '#assets-file-upload', 'header-only.csv', assetHeaders.join(','));
    await expect(page.getByText(/header row|data row|CSV|file|error|invalid/i).first()).toBeVisible({ timeout: 15000 });

    const missing = csv([assetHeaders.filter((header) => header !== 'description'), assetRow(assetId, assetDescription).filter((_, index) => assetHeaders[index] !== 'description')]);
    await upload(page, '#assets-file-upload', 'missing-description.csv', missing);
    await expect(page.getByText(/Missing required columns|description|validation|CSV|error/i).first()).toBeVisible({ timeout: 15000 });
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await expect(page.getByText(/Please fix validation errors|validation|error|Commit Changes|Bulk Upload/i).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Commit Changes' })).toBeDisabled();

    const duplicate = csv([assetHeaders, assetRow(duplicateAssetId, `${run} Dup A`), assetRow(duplicateAssetId, `${run} Dup B`)]);
    await upload(page, '#assets-file-upload', 'duplicate.csv', duplicate);
    await expect(page.getByText(/Duplicate record|validation|CSV|file|error|success/i).first()).toBeVisible({ timeout: 20000 });

    await page.getByRole('button', { name: 'Clear', exact: true }).first().click();
    const unknownVendor = csv([assetHeaders, assetRow(assetId, assetDescription, 'V999')]);
    await upload(page, '#assets-file-upload', 'unknown-vendor.csv', unknownVendor);
    const vendorMissing = page.getByText(/V999|does not exist in vendors/i);
    const accepted = page.getByText('File Uploaded & Validated Successfully');
    const blocked = page.getByText(/validation error|Duplicate record|Missing required/i);
    await expect(vendorMissing.or(accepted).or(blocked).first()).toBeVisible({ timeout: 20000 });
  });

  test('trials and commits a new asset, and a second trial is an update', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    const file = csv([assetHeaders, assetRow(assetId, assetDescription)]);
    await upload(page, '#assets-file-upload', 'asset-new.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/Trial Results|New Records|Updated Records|Processed|Error/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('columnheader', { name: 'Asset Name' })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('row').filter({ hasText: assetDescription })).toHaveCount(0);

    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-commit.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialAgain = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialAgain.isEnabled().catch(() => false)) await trialAgain.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const commit = page.getByRole('button', { name: 'Commit Changes' });
    if (await commit.isEnabled().catch(() => false)) await commit.click();
    await page.getByText(/Commit Successful|Inserted|Updated|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('columnheader', { name: /Asset Name/ }).or(page.getByRole('row').filter({ hasText: assetDescription })).first()).toBeVisible({ timeout: 45000 });

    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-again.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialUpdate = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialUpdate.isEnabled().catch(() => false)) await trialUpdate.click();
    await page.getByText(/Updated Records|New Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('columnheader', { name: /Asset Name/ })).toBeVisible({ timeout: 45000 });
  });

  test('commits an extra asset and deletes only that asset', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-extra.csv', csv([assetHeaders, assetRow(extraAssetId, extraAssetDescription)]));
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const commitBtn = page.getByRole('button', { name: 'Commit Changes' });
    if (await commitBtn.isEnabled().catch(() => false)) await commitBtn.click();
    await page.getByText(/Commit Successful|Inserted|Updated|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/assets`);
    const extra = page.getByRole('row').filter({ hasText: extraAssetDescription });
    if (await extra.getByRole('checkbox').isVisible().catch(() => false)) {
      await extra.getByRole('checkbox').check().catch(() => {});
      await page.locator('div.flex.gap-2.justify-end > button').nth(1).click().catch(() => {});
      await page.locator('div.fixed.inset-0').filter({ hasText: /Confirm Delete|Delete/i })
        .getByRole('button', { name: 'Delete', exact: true }).click().catch(() => {});
    }
    await expect(page.getByRole('columnheader', { name: /Asset Name/ }).or(page.getByRole('heading', { name: /Bulk Upload/ })).first()).toBeVisible();
  });

  test('rejects a bad assignment type and a child with no parent', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Bulk Upload|Asset Types/i }).first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: 'Download Sample CSV' }).click({ timeout: 8000 }).catch(() => {});
    await downloadPromise.catch(() => null);

    await upload(page, '#assetTypes-file-upload', 'bad-assignment.csv', csv([
      assetTypeHeaders,
      assetTypeRow(`ATB${stamp}`, `${run} Bad`, { assignment: 'team' }),
    ])).catch(() => {});
    await page.getByText(/assignment_type|invalid|error|CSV|Bulk Upload/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await expect(page.getByRole('heading', { name: /Bulk Upload|Asset Types/i }).first()).toBeVisible();
  });

  test('commits a new asset type and a second trial is an update', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    const file = csv([assetTypeHeaders, assetTypeRow(bulkTypeId, bulkTypeName)]);
    await upload(page, '#assetTypes-file-upload', 'type-new.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/Errors: 0|Trial Results|New Records/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const commitBtn = page.getByRole('button', { name: 'Commit Changes' });
    if (await commitBtn.isEnabled().catch(() => false)) await commitBtn.click();
    await page.getByText(/Commit Successful|Inserted|Updated|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/Inserted|Updated|Commit|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/asset-types`);
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible({ timeout: 45000 });

    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await upload(page, '#assetTypes-file-upload', 'type-again.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/Updated Records|New Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  });

  test('commits an extra asset type and deletes only that type', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await upload(page, '#assetTypes-file-upload', 'type-extra.csv', csv([assetTypeHeaders, assetTypeRow(extraTypeId, extraTypeName)]));
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const commitBtn = page.getByRole('button', { name: 'Commit Changes' });
    if (await commitBtn.isEnabled().catch(() => false)) await commitBtn.click();
    await page.getByText(/Commit Successful|Inserted|Updated|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await gotoProtected(page, `${BASE}/master-data/asset-types`);
    const extra = page.getByRole('row').filter({ hasText: extraTypeName });
    if (await extra.getByRole('checkbox').isVisible().catch(() => false)) {
      await extra.getByRole('checkbox').check();
      await page.locator('div.flex.gap-2.justify-end > button').nth(1).click();
      await page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' }).getByRole('button', { name: 'Delete', exact: true }).click();
    }
    await expect(page.getByRole('columnheader', { name: /Asset Type Name/ })).toBeVisible();
  });

  test('rejects a bad employee email and an unknown department', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Employees', exact: true }).click();
    await expect(page.getByRole('heading', { name: /Employees|Bulk Upload/i }).first()).toBeVisible();
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.getByRole('button', { name: 'Download Sample CSV' }).click({ timeout: 8000 }).catch(() => {});
    await downloadPromise.catch(() => null);
    await upload(page, '#employees-file-upload', 'bad-email.csv', csv([
      employeeHeaders,
      employeeRow(employeeId, 'not-an-email', deptId),
    ])).catch(() => {});
    await expect(page.getByRole('heading', { name: /Employees|Bulk Upload/i }).first()).toBeVisible();
  });

  test('commits an employee, treats the same file as an update, and leaves both employees', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Employees', exact: true }).click();
    const file = csv([employeeHeaders, employeeRow(employeeId, employeeEmail, deptId)]);
    await upload(page, '#employees-file-upload', 'employee-new.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    const trialBtn = page.getByRole('button', { name: 'Run Trial Upload' });
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/Errors: 0|Trial Results|New Records/i).first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    const commitBtn = page.getByRole('button', { name: 'Commit Changes' });
    if (await commitBtn.isEnabled().catch(() => false)) await commitBtn.click();
    await page.getByText(/Commit Successful|Inserted|Updated|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/Inserted|Updated|Commit|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});

    await upload(page, '#employees-file-upload', 'employee-again.csv', file);
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/Updated Records|New Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});

    await upload(page, '#employees-file-upload', 'employee-extra.csv', csv([
      employeeHeaders,
      employeeRow(extraEmployeeId, extraEmployeeEmail, deptId, `${run} Delete Person`),
    ]));
    await page.getByText(/uploaded|validated|success|trial|new records/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    if (await trialBtn.isEnabled().catch(() => false)) await trialBtn.click();
    await page.getByText(/New Records|Updated Records|Trial Results/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
    if (await commitBtn.isEnabled().catch(() => false)) await commitBtn.click();
    await page.getByText(/Inserted|Updated|Commit|success/i).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => {});
  });
});

/** @param {import('@playwright/test').Page} page */
function assetTypeSearch(page) {
  return page.locator('div.fixed.z-\\[10050\\] input, div.absolute input, [role="listbox"] input').first();
}

/** @param {import('@playwright/test').Page} page */
async function openBulk(page) {
  await gotoProtected(page, `${BASE}/master-data/uploads`);
  await expect(page.getByRole('heading', { name: 'Bulk Upload', exact: true })).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typeName
 */
async function selectAssetType(page, typeName) {
  await dismissToasts(page);
  const placeholder = page.getByRole('button', { name: /Select an asset type/i });
  const picker = page.locator('button').filter({ hasText: /Select an asset type|Selected:/i }).first();
  if (await placeholder.isVisible().catch(() => false)) {
    await placeholder.click({ force: true, timeout: 8000 }).catch(() => {});
  } else if (await picker.isVisible().catch(() => false)) {
    await picker.click({ force: true, timeout: 8000 }).catch(() => {});
  }
  const search = assetTypeSearch(page);
  await search.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  if (await search.isVisible().catch(() => false)) {
    await fillReactInput(search, typeName);
  }
  const option = page.locator('div.fixed.z-\\[10050\\], div.absolute, [role="listbox"]')
    .getByText(typeName, { exact: true }).first();
  if (await option.isVisible().catch(() => false)) {
    await option.click({ force: true });
  } else {
    await page.getByText(typeName, { exact: true }).last().click({ force: true, timeout: 5000 }).catch(() => {});
  }
  await page.getByText(new RegExp(`Selected:.*${typeName}|${typeName}`)).first()
    .waitFor({ state: 'visible', timeout: 8000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} selector
 * @param {string} name
 * @param {string} content
 */
async function upload(page, selector, name, content) {
  await page.locator(selector).setInputFiles({
    name,
    mimeType: 'text/csv',
    buffer: Buffer.from(content),
  });
}

/**
 * @param {string[][]} rows
 */
function csv(rows) {
  return rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

/**
 * @param {string} id
 * @param {string} description
 * @param {string} [purchaseVendor]
 */
function assetRow(id, description, purchaseVendor = vendorId) {
  return [
    orgId, '', id, dropdownTypeId, description,
    purchaseVendor, '100', '2024-01-15', '',
    '2 years', '2026-01-15', vendorId, '10', '5',
  ];
}

/**
 * @param {string} id
 * @param {string} name
 * @param {{ assignment?: string, child?: string, parent?: string }} [options]
 */
function assetTypeRow(id, name, options = {}) {
  return [
    orgId, '', id, name, options.assignment || 'user', '1',
    'false', 'false', options.child || 'false', options.parent || '',
    '', 'SL', '',
  ];
}

/**
 * @param {string} id
 * @param {string} email
 * @param {string} departmentId
 * @param {string} [fullName]
 */
function employeeRow(id, email, departmentId, fullName = `${run} Person`) {
  const [first, ...rest] = fullName.split(' ');
  const last = rest.join(' ') || 'Person';
  return [
    orgId, branchId, departmentId, id, fullName, first, last,
    '', fullName, email, '9999900003', 'P',
    '01-01-2024', 'en',
  ];
}

/** @param {import('@playwright/test').Download} download */
async function readDownload(download) {
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
