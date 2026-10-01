// @ts-check
/**
 * 16. Inspection configuration
 * TC_ICFG_001 qualitative question
 * TC_ICFG_002 quantitative question with maintenance trigger
 * TC_ICFG_003 map questions to every asset of a type
 * TC_ICFG_004 limit a checklist to one scanned asset
 * TC_ICFG_005 30-day in-house inspection
 * TC_ICFG_006 vendor on-demand inspection
 */
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

const QUALITATIVE_QUESTION = 'Power lamp is on';
const QUANTITATIVE_QUESTION = 'Output pressure psi';
const ASSET_TYPE = 'Oxygen Concentrator';
const SCANNED_ASSET = 'AST-101';
const TECHNICIAN = 'Ravi Kumar';
const FREQUENCY_DESCRIPTION = 'Monthly safety check';

const CHECKLISTS = `${BASE}/adminsettings/configuration/inspection-checklists`;
const MAPPING = `${BASE}/adminsettings/configuration/asset-type-checklist-mapping`;
const FREQUENCY = `${BASE}/adminsettings/configuration/inspection-frequency`;

test.describe('RIO EAM inspection configuration', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.describe.configure({ mode: 'serial' });

  test('TC_ICFG_001 adds a qualitative inspection question', async ({ page }) => {
    test.setTimeout(180000);
    await loginToRioEam(page);
    await openChecklists(page);

    await page.getByTitle('Create New').click();
    await expect(page.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();
    await page.getByPlaceholder('Enter inspection question').fill(QUALITATIVE_QUESTION);
    await chooseResponseType(page, 'Qualitative');
    await page.getByPlaceholder('Enter expected value').fill('Yes');
    await page.getByLabel('Trigger Maintenance Automatic').uncheck();

    const createResponsePromise = waitForChecklistCreate(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await createResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText(/created successfully/i)).toBeVisible({ timeout: 15000 });

    const row = page.locator('tbody tr').filter({ hasText: QUALITATIVE_QUESTION }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(/Qualitative/i);
    await expect(row).toContainText('Yes');
    await expect(row).toContainText('Off');
  });

  test('TC_ICFG_002 adds a ranged question that can trigger maintenance', async ({ page }) => {
    test.setTimeout(180000);
    await loginToRioEam(page);
    await openChecklists(page);

    await page.getByTitle('Create New').click();
    await page.getByPlaceholder('Enter inspection question').fill(QUANTITATIVE_QUESTION);
    await chooseResponseType(page, 'Quantitative');
    await page.getByPlaceholder('Enter minimum range').fill('70');
    await page.getByPlaceholder('Enter maximum range').fill('40');
    await page.getByLabel('Trigger Maintenance Automatic').check();
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByText(/min.*max|greater than|invalid range|must be less/i)).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole('heading', { name: 'Create Inspection Checklist' })).toBeVisible();

    await page.getByPlaceholder('Enter minimum range').fill('40');
    await page.getByPlaceholder('Enter maximum range').fill('60');
    const createResponsePromise = waitForChecklistCreate(page);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    expect((await createResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText(/created successfully/i)).toBeVisible({ timeout: 15000 });

    const row = page.locator('tbody tr').filter({ hasText: QUANTITATIVE_QUESTION }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText('40');
    await expect(row).toContainText('60');
    await expect(row).toContainText('On');
  });

  test('TC_ICFG_003 attaches questions to all assets of a type', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, MAPPING);
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.waitForURL(/asset-type-checklist-mapping\/create/, { timeout: 20000 });
    await page.getByRole('button', { name: 'Select Asset' }).click();

    await selectOptionContaining(page.locator('select').first(), ASSET_TYPE);
    await expect(page.locator('select').nth(1)).toHaveValue('');

    await addMappedQuestion(page, QUALITATIVE_QUESTION);
    await addMappedQuestion(page, QUANTITATIVE_QUESTION);

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/asset-type-checklist-mapping'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save Mapping' }).click();
    expect((await saveResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Mapping saved successfully')).toBeVisible({ timeout: 15000 });

    const row = page.locator('tbody tr').filter({ hasText: ASSET_TYPE }).filter({ hasText: '2' }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    const assetName = (await row.locator('td').nth(1).innerText()).replace(/\s+/g, ' ').trim();
    expect(assetName).toMatch(/All Assets|^$|^-$|^—$/i);
  });

  test('TC_ICFG_004 limits a checklist to one asset by scan', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, `${MAPPING}/create`);
    await page.getByRole('button', { name: 'Scan Asset' }).click();
    await page.getByPlaceholder('Scan QR code or enter Asset ID').fill(SCANNED_ASSET);
    await page.getByRole('button', { name: 'Search Asset' }).click();
    await expect(page.getByText(/loaded successfully/i)).toBeVisible({ timeout: 20000 });

    await addMappedQuestion(page, QUALITATIVE_QUESTION);
    await addMappedQuestion(page, QUANTITATIVE_QUESTION);
    await page.getByRole('button', { name: 'Save Mapping' }).click();
    await expect(page.getByText('Mapping saved successfully')).toBeVisible({ timeout: 15000 });

    const specific = page.locator('tbody tr').filter({ hasText: SCANNED_ASSET }).first();
    await expect(specific).toBeVisible({ timeout: 20000 });
    const typeWide = page
      .locator('tbody tr')
      .filter({ hasText: ASSET_TYPE })
      .filter({ hasNotText: SCANNED_ASSET })
      .first();
    await expect(typeWide).toBeVisible();
  });

  test('TC_ICFG_005 schedules a 30-day in-house inspection', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, FREQUENCY);
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.waitForURL(/inspection-frequency\/create/, { timeout: 20000 });

    await selectOptionContaining(
      page.locator('select').filter({ hasText: 'Select Asset Type' }),
      `${ASSET_TYPE} (All Assets)`,
    );
    await page.getByRole('radio', { name: /Recurring/ }).check();
    await page.getByPlaceholder('e.g. 30').fill('30');
    await selectOptionContaining(page.locator('select').filter({ hasText: 'Select UOM' }), 'Day');
    await page.getByRole('radio', { name: 'In-House' }).check();
    await page.getByPlaceholder('Enter inspection frequency details...').fill(FREQUENCY_DESCRIPTION);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/inspection-frequencies'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    expect((await createResponsePromise).ok()).toBeTruthy();
    await expect(page.getByText('Inspection frequency created successfully')).toBeVisible({
      timeout: 15000,
    });

    const row = page.locator('tbody tr').filter({ hasText: FREQUENCY_DESCRIPTION }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
    await expect(row).toContainText(/30\s*Days/i);
    await expect(row).toContainText(/In-House/i);

    await row.getByTitle(/edit/i).click();
    const technician = page.locator('select').filter({ hasText: 'Select Technician' });
    await expect(technician).toBeVisible({ timeout: 15000 });
    await selectOptionContaining(technician, TECHNICIAN);
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    await expect(page.getByText('Frequency updated')).toBeVisible({ timeout: 15000 });
    await row.getByTitle(/edit/i).click();
    await expect(technician.locator('option:checked')).toContainText(TECHNICIAN);
  });

  test('TC_ICFG_006 creates a vendor on-demand inspection', async ({ page }) => {
    test.setTimeout(240000);
    await loginToRioEam(page);
    await gotoProtected(page, FREQUENCY);
    await page.locator('button:has(svg.lucide-plus)').first().click();
    await page.waitForURL(/inspection-frequency\/create/, { timeout: 20000 });

    await selectOptionContaining(page.locator('select').filter({ hasText: 'Select Asset Type' }), ASSET_TYPE);
    await page.getByRole('radio', { name: 'On Demand' }).check();
    await page.getByRole('radio', { name: 'Vendor' }).check();
    await expect(page.getByText('Technician (In-House)')).toHaveCount(0);

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().includes('/inspection-frequencies'),
      { timeout: 60000 },
    );
    await page.getByRole('button', { name: 'Save Frequency' }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.ok(), `Vendor frequency failed: ${createResponse.status()}`).toBeTruthy();
    await expect(page.getByText(/technician.*required/i)).toHaveCount(0);
    await expect(page.getByText('Inspection frequency created successfully')).toBeVisible({
      timeout: 15000,
    });

    const row = page.locator('tbody tr').filter({ hasText: /Vendor/ }).filter({ hasText: /On Demand/i }).first();
    await expect(row).toBeVisible({ timeout: 20000 });
  });
});

/**
 * @param {import('@playwright/test').Page} page
 */
async function openChecklists(page) {
  await gotoProtected(page, CHECKLISTS);
  await expect(page.getByText('Inspection Checklists List').first()).toBeVisible({ timeout: 45000 });
  await expect(page.getByText('Loading checklists...')).toHaveCount(0, { timeout: 30000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function chooseResponseType(page, name) {
  const select = page.locator('select').filter({ hasText: 'Select response type' });
  const option = select.locator('option', { hasText: new RegExp(name, 'i') }).first();
  await expect(option).toHaveCount(1);
  await select.selectOption(await option.getAttribute('value'));
}

/**
 * @param {import('@playwright/test').Locator} select
 * @param {string} text
 */
async function selectOptionContaining(select, text) {
  const option = select.locator('option', { hasText: text }).first();
  await expect(option).toHaveCount(1, { timeout: 20000 });
  const value = await option.getAttribute('value');
  expect(value).toBeTruthy();
  await select.selectOption(value);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} question
 */
async function addMappedQuestion(page, question) {
  await page.getByRole('button', { name: 'Add New Row' }).click();
  const questionSelect = page.locator('select').filter({ hasText: 'Choose Inspection Question' }).last();
  await selectOptionContaining(questionSelect, question);
}

/**
 * @param {import('@playwright/test').Page} page
 */
function waitForChecklistCreate(page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/inspection-checklists\/?$/.test(new URL(response.url()).pathname),
    { timeout: 60000 },
  );
}
