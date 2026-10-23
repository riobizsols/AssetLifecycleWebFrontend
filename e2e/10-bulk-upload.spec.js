// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

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
    const typeResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && /\/asset-types\/?$/.test(new URL(response.url()).pathname));
    await gotoProtected(page, `${BASE}/master-data/asset-types/add`);
    await page.getByPlaceholder('Enter asset type name').fill(dropdownTypeName);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const typeBody = await (await typeResponse).json();
    dropdownTypeId = typeBody.asset_type.asset_type_id;
    orgId = typeBody.asset_type.org_id;
    expect(dropdownTypeId).toMatch(/^[A-Za-z][A-Za-z0-9_]*[0-9]{3,}$/);
    expect(orgId).toBeTruthy();

    const vendorResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().includes('/create-vendor'));
    await gotoProtected(page, `${BASE}/master-data/add-vendor`);
    await page.locator('input[name="vendor_name"]').fill(`${run} Vendor`);
    await page.locator('input[name="company_name"]').fill(`${run} Company`);
    await page.locator('input[name="company_email"]').fill(`${run.toLowerCase()}.vendor@example.com`);
    await page.locator('input[name="contact_person_number"]').fill('9999900002');
    await page.locator('input[name="contact_person_name"]').fill(`${run} Contact`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    const vendorBody = await (await vendorResponse).json();
    vendorId = vendorBody.data.vendor_id;
    expect(vendorId).toMatch(/^V\d{3}$/);

    const branchResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && /\/branches\/?$/.test(new URL(response.url()).pathname));
    await gotoProtected(page, `${BASE}/master-data/branches/add`);
    await page.locator('select[name="org_id"]').selectOption(orgId);
    await page.locator('input[name="text"]').fill(`${run} Branch`);
    await page.locator('input[name="branch_code"]').fill(`B${stamp.slice(-4)}`);
    await page.locator('input[name="city"]').fill('Playwright');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    branchId = (await (await branchResponse).json()).branch_id;
    expect(branchId).toBeTruthy();

    await gotoProtected(page, `${BASE}/master-data/departments`);
    const deptIdBox = page.getByPlaceholder('Department Id');
    await expect(deptIdBox).toHaveValue(/DPT\d+/, { timeout: 30000 });
    await page.locator('select').first().selectOption(branchId);
    await page.getByPlaceholder('Department Name').fill(`${run} Department`);
    const deptResponse = page.waitForResponse((response) =>
      response.request().method() === 'POST' && /\/departments\/?$/.test(new URL(response.url()).pathname));
    await page.getByRole('button', { name: 'Add', exact: true }).click();
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
    await page.getByRole('button', { name: 'Select an asset type...' }).click();
    const search = page.getByPlaceholder('Search asset types...');
    await search.fill('zzzz-no-type');
    await expect(page.getByText('No asset types found')).toBeVisible();
    await search.fill(dropdownTypeName);
    const option = page.locator('div.absolute').getByRole('button', { name: dropdownTypeName, exact: true });
    await expect(option).toBeVisible({ timeout: 15000 });
    await option.click();
    await expect(page.getByText(`Selected: ${dropdownTypeName}`)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Sample CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`assets_sample_${dropdownTypeId}.csv`);
    const sample = (await readDownload(download)).toString();
    expect(sample).toContain('ASS001');
    expect(sample).toContain('description');
  });

  test('rejects a non-CSV file, a header-only file, a missing column, a duplicate id, and an unknown vendor', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);

    await upload(page, '#assets-file-upload', 'notes.txt', 'hello');
    await expect(page.getByText('Please select a CSV file')).toBeVisible();
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(page.getByText('Please select a CSV file')).toHaveCount(0);

    await upload(page, '#assets-file-upload', 'header-only.csv', assetHeaders.join(','));
    await expect(page.getByText('CSV file must have at least a header row and one data row')).toBeVisible();

    const missing = csv([assetHeaders.filter((header) => header !== 'description'), assetRow(assetId, assetDescription).filter((_, index) => assetHeaders[index] !== 'description')]);
    await upload(page, '#assets-file-upload', 'missing-description.csv', missing);
    await expect(page.getByText(/Missing required columns:.*description/)).toBeVisible();
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText(/Please fix validation errors before running trial upload/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Commit Changes' })).toBeDisabled();

    const duplicate = csv([assetHeaders, assetRow(duplicateAssetId, `${run} Dup A`), assetRow(duplicateAssetId, `${run} Dup B`)]);
    await upload(page, '#assets-file-upload', 'duplicate.csv', duplicate);
    await expect(page.getByText(`Duplicate record found (asset_id: ${duplicateAssetId})`)).toBeVisible();

    const unknownVendor = csv([assetHeaders, assetRow(assetId, assetDescription, 'V999')]);
    await expect(async () => {
      await upload(page, '#assets-file-upload', 'unknown-vendor.csv', unknownVendor);
      await expect(page.getByText(/V999.*vendors|does not exist in vendors/i)).toBeVisible({ timeout: 4000 });
    }).toPass({ timeout: 20000 });
  });

  test('trials and commits a new asset, and a second trial is an update', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    const file = csv([assetHeaders, assetRow(assetId, assetDescription)]);
    await upload(page, '#assets-file-upload', 'asset-new.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('Trial Results:')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('New Records: 1')).toBeVisible();
    await expect(page.getByText('Updated Records: 0')).toBeVisible();
    await expect(page.getByText('Errors: 0')).toBeVisible();
    await expect(page.getByText('Total Processed: 1')).toBeVisible();

    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('columnheader', { name: 'Asset Name' })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('row').filter({ hasText: assetDescription })).toHaveCount(0);

    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-commit.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Commit Successful')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Inserted: 1 records')).toBeVisible();
    await expect(page.getByText('Updated: 0 records')).toBeVisible();

    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('row').filter({ hasText: assetDescription })).toBeVisible({ timeout: 45000 });

    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-again.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('Updated Records: 1')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('New Records: 0')).toBeVisible();
    await gotoProtected(page, `${BASE}/assets`);
    await expect(page.getByRole('row').filter({ hasText: assetDescription })).toHaveCount(1);
  });

  test('commits an extra asset and deletes only that asset', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Assets', exact: true }).click();
    await selectAssetType(page, dropdownTypeName);
    await upload(page, '#assets-file-upload', 'asset-extra.csv', csv([assetHeaders, assetRow(extraAssetId, extraAssetDescription)]));
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Commit Successful')).toBeVisible({ timeout: 60000 });

    await gotoProtected(page, `${BASE}/assets`);
    const extra = page.getByRole('row').filter({ hasText: extraAssetDescription });
    await extra.getByRole('checkbox').check();
    await page.locator('div.flex.gap-2.justify-end > button').nth(1).click();
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('1 asset(s) deleted successfully')).toBeVisible();
    await expect(extra).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: assetDescription })).toBeVisible();
  });

  test('rejects a bad assignment type and a child with no parent', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await expect(page.getByText('Important Notes:')).toBeVisible();
    await expect(page.getByText(/If asset_type_id exists, record will be updated/)).toBeVisible();
    await expect(page.getByText(/Use semicolon \(;\) to separate multiple properties/)).toBeVisible();
    await expect(page.getByText(/Set to "true" if this is a child asset type/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Sample CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('asset_types_sample.csv');
    expect((await readDownload(download)).toString()).toContain('Bulk Test Laptops');

    await upload(page, '#assetTypes-file-upload', 'bad-assignment.csv', csv([
      assetTypeHeaders,
      assetTypeRow(`ATB${stamp}`, `${run} Bad`, { assignment: 'team' }),
    ]));
    await expect(page.getByText('assignment_type must be one of: user, department, group')).toBeVisible();

    await upload(page, '#assetTypes-file-upload', 'missing-parent.csv', csv([
      assetTypeHeaders,
      assetTypeRow(`ATC${stamp}`, `${run} Child`, { child: 'true', parent: 'AT999999' }),
    ]));
    await expect(page.getByText(/parent_asset_type_id 'AT999999' does not exist/)).toBeVisible();
  });

  test('commits a new asset type and a second trial is an update', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    const file = csv([assetTypeHeaders, assetTypeRow(bulkTypeId, bulkTypeName)]);
    await upload(page, '#assetTypes-file-upload', 'type-new.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Errors: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Commit Successful')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Inserted: 1 records')).toBeVisible();

    await gotoProtected(page, `${BASE}/master-data/asset-types`);
    await expect(page.getByRole('row').filter({ hasText: bulkTypeName })).toBeVisible({ timeout: 45000 });
    await expect(page.getByRole('row').filter({ hasText: dropdownTypeName })).toBeVisible();

    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await upload(page, '#assetTypes-file-upload', 'type-again.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('Updated Records: 1')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('New Records: 0')).toBeVisible();
  });

  test('commits an extra asset type and deletes only that type', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Asset Types', exact: true }).click();
    await upload(page, '#assetTypes-file-upload', 'type-extra.csv', csv([assetTypeHeaders, assetTypeRow(extraTypeId, extraTypeName)]));
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Commit Successful')).toBeVisible({ timeout: 60000 });

    await gotoProtected(page, `${BASE}/master-data/asset-types`);
    const extra = page.getByRole('row').filter({ hasText: extraTypeName });
    await extra.getByRole('checkbox').check();
    await page.locator('div.flex.gap-2.justify-end > button').nth(1).click();
    await page.locator('div.fixed.inset-0').filter({ hasText: 'Confirm Delete' }).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(`Successfully deleted asset type "${extraTypeName}"`)).toBeVisible();
    await expect(extra).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: bulkTypeName })).toBeVisible();
    await expect(page.getByRole('row').filter({ hasText: dropdownTypeName })).toBeVisible();
  });

  test('rejects a bad employee email and an unknown department', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Employees', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Employees Bulk Upload' })).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Download Sample CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('employees_sample.csv');
    const sample = (await readDownload(download)).toString();
    expect(sample).toContain('John Doe');
    expect(sample).toContain('Jane Smith');

    await upload(page, '#employees-file-upload', 'bad-email.csv', csv([
      employeeHeaders,
      employeeRow(employeeId, 'not-an-email', deptId),
    ]));
    await expect(page.getByText('email_id must be a valid email address')).toBeVisible();

    await upload(page, '#employees-file-upload', 'bad-dept.csv', csv([
      employeeHeaders,
      employeeRow(`EMY${stamp}`, `${run.toLowerCase()}.unknown@example.com`, 'DPT999999'),
    ]));
    await expect(page.getByText(/dept_id 'DPT999999' does not exist in departments table/)).toBeVisible();
  });

  test('commits an employee, treats the same file as an update, and leaves both employees', async ({ page }) => {
    await openBulk(page);
    await page.getByRole('button', { name: 'Employees', exact: true }).click();
    const file = csv([employeeHeaders, employeeRow(employeeId, employeeEmail, deptId)]);
    await upload(page, '#employees-file-upload', 'employee-new.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Errors: 0')).toBeVisible();
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Commit Successful')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Inserted: 1 records')).toBeVisible();

    await upload(page, '#employees-file-upload', 'employee-again.csv', file);
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('Updated Records: 1')).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('New Records: 0')).toBeVisible();

    await upload(page, '#employees-file-upload', 'employee-extra.csv', csv([
      employeeHeaders,
      employeeRow(extraEmployeeId, extraEmployeeEmail, deptId, `${run} Delete Person`),
    ]));
    await expect(page.getByText('File Uploaded & Validated Successfully')).toBeVisible({ timeout: 30000 });
    await page.getByRole('button', { name: 'Run Trial Upload' }).click();
    await expect(page.getByText('New Records: 1')).toBeVisible({ timeout: 60000 });
    await page.getByRole('button', { name: 'Commit Changes' }).click();
    await expect(page.getByText('Inserted: 1 records')).toBeVisible({ timeout: 60000 });
  });
});

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
  const opener = page.getByRole('button', { name: 'Select an asset type...' });
  if (await opener.count()) {
    await opener.click();
  } else {
    await page.getByRole('button', { name: typeName, exact: true }).click();
  }
  const search = page.getByPlaceholder('Search asset types...');
  await expect(search).toBeVisible();
  await search.fill(typeName);
  const option = page.locator('div.absolute').getByRole('button', { name: typeName, exact: true });
  await expect(option).toBeVisible({ timeout: 15000 });
  await option.click();
  await expect(page.getByText(`Selected: ${typeName}`)).toBeVisible();
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
