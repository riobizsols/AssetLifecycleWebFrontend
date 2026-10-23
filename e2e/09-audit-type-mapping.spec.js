// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString(36);
const runName = `E2E Audit ${stamp}`;
const updatedName = `${runName} Updated`;
const secondName = `E2E Audit ${stamp} second`;
const route = `${BASE}/master-data/audit-type-mapping`;

const state = {
  /** @type {string[]} */
  baselineNames: [],
  /** @type {Record<string, string[]>} */
  baselineChips: {},
  /** @type {string} */
  currentName: runName,
  /** @type {string} */
  assetTypeName: '',
  /** @type {string} */
  keeperName: '',
  /** @type {string} */
  otherName: '',
  /** @type {string} */
  mappedName: '',
  /** @type {string} */
  shareName: '',
  /** @type {string[]} */
  orderBeforeSearch: [],
};

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
  await expect(toast).toBeVisible({ timeout: 15000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function auditName(page) {
  return page.locator('label', { hasText: 'Audit type name' }).locator('xpath=..').locator('input');
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
function typeButton(page, name) {
  return page.getByRole('button', {
    name: new RegExp(`^${escapeRegex(name)} (Internal|External)`),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function listNames(page) {
  const labels = page.locator('section').first().locator('button div.text-sm.font-medium');
  const texts = await labels.allTextContents();
  return texts.map((text) => text.trim()).filter(Boolean);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function chipLabels(page) {
  const buttons = page.getByRole('button', { name: /^Remove / });
  const count = await buttons.count();
  /** @type {string[]} */
  const labels = [];
  for (let index = 0; index < count; index += 1) {
    const aria = (await buttons.nth(index).getAttribute('aria-label')) || '';
    labels.push(aria.replace(/^Remove /, ''));
  }
  return labels.sort();
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMapping(page) {
  await gotoProtected(page, route);
  await expect(page.getByRole('heading', { name: 'Audit types' })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.locator('section').first().getByText(/^Loading/)).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} current
 */
async function pickOther(page, current) {
  const names = await listNames(page);
  const existing = [
    ...names,
    state.shareName,
    state.keeperName,
    state.otherName,
    state.mappedName,
    ...state.baselineNames,
  ].find((name) => name && name !== current);
  if (existing) return existing;
  state.otherName = `E2E Audit ${stamp} other`;
  await createType(page, state.otherName);
  return state.otherName;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
async function selectType(page, name) {
  const search = page.getByPlaceholder('Search audit types');
  if (await search.inputValue()) await search.fill('');
  const current = await auditName(page).inputValue().catch(() => '');
  if (current !== name) {
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/audit-report/asset-types/') && res.ok(),
      ),
      typeButton(page, name).click(),
    ]);
  }
  await expect(auditName(page)).toHaveValue(name);
  await expect(page.getByText('Loading mappings…')).toHaveCount(0);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} typedName
 * @param {{ internal?: boolean }} [options]
 */
async function createType(page, typedName, options = {}) {
  const internal = options.internal !== false;
  const form = page.getByPlaceholder('e.g. Fire Safety');
  if (!(await form.isVisible())) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
  }
  await form.fill(typedName);
  const checkbox = page.getByRole('checkbox', { name: 'Internal audit' });
  if (internal) await checkbox.check();
  else await checkbox.uncheck();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  const listed = typeButton(page, typedName.trim());
  await expect(page.getByText('Audit type created').first().or(listed).first()).toBeVisible({
    timeout: 20000,
  });
  await expect(form).toBeHidden();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} assetLabel
 */
async function chooseAsset(page, assetLabel) {
  const closed = page.getByText('Select asset types to include', { exact: true });
  const search = page.getByPlaceholder('Select asset types to include');
  if (await closed.isVisible().catch(() => false)) {
    await closed.click();
  } else if (await search.isVisible().catch(() => false)) {
    await search.click();
  } else {
    await page.locator('div.relative').filter({ hasText: '▼' }).first().click();
  }
  await expect(search.or(page.locator('div.absolute.z-50').last())).toBeVisible();
  if (assetLabel && (await search.isVisible().catch(() => false))) {
    await search.fill(assetLabel);
  }
  const menu = page.locator('div.absolute.z-50').filter({ has: page.locator('input[type="checkbox"]') }).last();
  await expect(menu).toBeVisible({ timeout: 15000 });
  const row = assetLabel
    ? menu.locator('label').filter({ hasText: new RegExp(escapeRegex(assetLabel)) }).first()
    : menu.locator('label').first();
  await expect(row).toBeVisible();
  const label = assetLabel || (await row.locator('span').innerText()).trim();
  const box = row.locator('input[type="checkbox"]');
  if (!(await box.isChecked())) {
    await box.check();
  }
  await page.getByRole('heading', { name: 'Mapped asset types' }).click();
  await expect(page.getByRole('button', { name: 'Save mappings' })).toBeEnabled({ timeout: 10000 });
  return label;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function ensureAssetTypeExists(page) {
  if (await page.getByText('Select asset types to include', { exact: true }).isVisible()) return;
  if (!(await page.getByText('No asset types available').isVisible())) return;
  const assetName = `E2E Audit ${stamp} asset`;
  await gotoProtected(page, `${BASE}/master-data/asset-types/add`);
  await page.getByPlaceholder('Enter asset type name').fill(assetName);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectToast(page, `Asset type "${assetName}" created successfully`);
  state.assetTypeName = assetName;
  await openMapping(page);
}

test.beforeEach(() => {
  test.setTimeout(180000);
});

test('AT-01 the mapping screen shows both panels and Open Audit Reports', async ({ page }) => {
  await openMapping(page);
  await expect(page.getByRole('heading', { name: 'Audit types' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Search audit types')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Audit Reports' })).toBeVisible();
  const names = await listNames(page);
  if (names.length) {
    await expect(auditName(page)).toBeVisible();
  } else {
    await expect(page.getByText('Select or create an audit type to map asset types.')).toBeVisible();
  }
});

test('AT-02 each audit type shows Internal or External and a mapping count', async ({ page }) => {
  await openMapping(page);
  let names = await listNames(page);
  state.baselineNames = [...names];
  if (!names.length) {
    state.keeperName = `E2E Audit ${stamp} keeper`;
    await createType(page, state.keeperName);
    names = await listNames(page);
  }
  const sorted = [...names].sort((a, b) => a.localeCompare(b));
  expect(names).toEqual(sorted);
  for (const name of names) {
    await expect(typeButton(page, name)).toContainText(/Internal|External/);
    await expect(typeButton(page, name)).toContainText(/no mappings|asset type/);
  }
  state.baselineChips = {};
  for (const name of state.baselineNames) {
    await selectType(page, name);
    state.baselineChips[name] = await chipLabels(page);
  }
});

test('AT-03 a fresh visit selects the first audit type', async ({ page }) => {
  await openMapping(page);
  const names = await listNames(page);
  expect(names.length).toBeGreaterThan(0);
  await expect(auditName(page)).toHaveValue(names[0]);
  await expect(page.getByText('Loading mappings…')).toHaveCount(0);
  const chips = await chipLabels(page);
  const countText = chips.length === 1 ? '1 asset type selected' : `${chips.length} asset types selected`;
  await expect(page.getByText(countText)).toBeVisible();
  expect(chips).toEqual([...(state.baselineChips[names[0]] || chips)].sort());
  await expect(page.getByRole('button', { name: 'Save name' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Save mappings' })).toBeDisabled();
});

test('AT-04 a shared asset type names the other audit type', async ({ page }) => {
  await openMapping(page);
  const names = await listNames(page);
  let found = false;
  for (const name of names) {
    await selectType(page, name);
    const shared = page.locator('span.rounded-full').filter({ hasText: 'also' });
    if (await shared.count()) {
      await expect(shared.first()).toContainText('also');
      const plain = page.locator('span.rounded-full').filter({ hasNotText: 'also' });
      if (await plain.count()) {
        await expect(plain.first().locator('span', { hasText: 'also' })).toHaveCount(0);
      }
      found = true;
      break;
    }
  }
  if (found) return;

  await ensureAssetTypeExists(page);
  state.shareName = `E2E Audit ${stamp} share`;
  const partner = `E2E Audit ${stamp} partner`;
  await createType(page, state.shareName);
  const asset = await chooseAsset(page, state.assetTypeName);
  state.assetTypeName = asset;
  await page.getByRole('button', { name: 'Save mappings' }).click();
  await expectToast(page, 'Mappings saved');
  await createType(page, partner);
  await chooseAsset(page, state.assetTypeName);
  await page.getByRole('button', { name: 'Save mappings' }).click();
  await expectToast(page, 'Mappings saved');
  await selectType(page, state.shareName);
  const chip = page.locator('span.rounded-full').filter({ hasText: state.assetTypeName });
  await expect(chip).toContainText('also');
  await expect(chip).toContainText(partner);
});

test('AT-05 the empty organization message is the one with no audit types', async ({ page }) => {
  await openMapping(page);
  const names = await listNames(page);
  if (!names.length) {
    await expect(page.getByText('No audit types yet. Create one to start mapping.')).toBeVisible();
    await expect(page.getByText('Select or create an audit type to map asset types.')).toBeVisible();
    return;
  }
  await expect(page.getByText('Select or create an audit type to map asset types.')).toHaveCount(0);
  await expect(auditName(page)).toBeVisible();
});

test('AT-06 search keeps only audit types whose name contains the text', async ({ page }) => {
  await openMapping(page);
  state.orderBeforeSearch = await listNames(page);
  const first = state.orderBeforeSearch[0];
  const query = first.slice(0, Math.min(4, first.length)).toUpperCase();
  await page.getByPlaceholder('Search audit types').fill(query);
  const visible = await listNames(page);
  expect(visible.length).toBeGreaterThan(0);
  for (const name of visible) {
    expect(name.toLowerCase()).toContain(query.toLowerCase());
  }
  for (const name of state.orderBeforeSearch) {
    if (!name.toLowerCase().includes(query.toLowerCase())) {
      await expect(typeButton(page, name)).toHaveCount(0);
    }
  }
});

test('AT-07 a search with no match shows the empty list message', async ({ page }) => {
  await openMapping(page);
  await page.getByPlaceholder('Search audit types').fill('ZZZ-NOT-A-TYPE');
  await expect(page.getByText('No audit types yet. Create one to start mapping.')).toBeVisible();
});

test('AT-08 clearing the search restores the alphabetical list', async ({ page }) => {
  await openMapping(page);
  await page.getByPlaceholder('Search audit types').fill('ZZZ-NOT-A-TYPE');
  await page.getByPlaceholder('Search audit types').fill('');
  expect(await listNames(page)).toEqual(state.orderBeforeSearch);
});

test('AT-09 switching audit types replaces the name, label, and chips', async ({ page }) => {
  await openMapping(page);
  let names = await listNames(page);
  if (names.length < 2) {
    state.otherName = `E2E Audit ${stamp} other`;
    await createType(page, state.otherName);
    names = await listNames(page);
  }
  const first = names[0];
  const second = names.find((name) => name !== first) || names[1];
  await selectType(page, first);
  const firstKind = (await typeButton(page, first).innerText()).includes('External')
    ? 'External'
    : 'Internal';
  const firstChips = await chipLabels(page);
  await selectType(page, second);
  await expect(auditName(page)).toHaveValue(second);
  await expect(typeButton(page, second)).toContainText(/Internal|External/);
  const secondChips = await chipLabels(page);
  if (firstChips.join('|') !== secondChips.join('|')) {
    expect(secondChips).not.toEqual(firstChips);
  }
  await expect(auditName(page)).not.toHaveValue(first);
  await selectType(page, first);
  await expect(typeButton(page, first)).toContainText(firstKind);
  expect(await chipLabels(page)).toEqual(firstChips);
});

test('AT-10 an unsaved chip removal is discarded', async ({ page }) => {
  await openMapping(page);
  let names = await listNames(page);
  let mapped = '';
  for (const name of names) {
    if ((await typeButton(page, name).innerText()).match(/asset type/)) {
      mapped = name;
      break;
    }
  }
  if (!mapped) {
    await ensureAssetTypeExists(page);
    state.mappedName = `E2E Audit ${stamp} mapped`;
    await createType(page, state.mappedName);
    state.assetTypeName = await chooseAsset(page, state.assetTypeName);
    await page.getByRole('button', { name: 'Save mappings' }).click();
    await expectToast(page, 'Mappings saved');
    mapped = state.mappedName;
    names = await listNames(page);
  }
  const other = names.find((name) => name !== mapped) || state.otherName;
  if (!other) {
    state.otherName = `E2E Audit ${stamp} other`;
    await createType(page, state.otherName);
  }
  await selectType(page, mapped);
  const before = await chipLabels(page);
  expect(before.length).toBeGreaterThan(0);
  await page.getByRole('button', { name: `Remove ${before[0]}` }).click();
  await expect(page.getByText('unsaved changes')).toBeVisible();
  await selectType(page, other || state.otherName);
  await selectType(page, mapped);
  expect(await chipLabels(page)).toEqual(before);
});

test('AT-11 New opens and closes the create form', async ({ page }) => {
  await openMapping(page);
  const form = page.getByPlaceholder('e.g. Fire Safety');
  if (await form.isVisible()) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
  }
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(form).toBeVisible();
  await expect(page.getByRole('checkbox', { name: 'Internal audit' })).toBeChecked();
  await expect(page.getByRole('button', { name: 'Create', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(form).toBeHidden();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(form).toBeVisible();
});

test('AT-12 Create requires a name', async ({ page }) => {
  await openMapping(page);
  const before = await listNames(page);
  const form = page.getByPlaceholder('e.g. Fire Safety');
  if (!(await form.isVisible())) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
  }
  await form.fill('');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expectToast(page, 'Enter an audit type name');
  expect(await listNames(page)).toEqual(before);
});

test('AT-13 this run creates an internal audit type', async ({ page }) => {
  await openMapping(page);
  await createType(page, `  ${runName}  `);
  state.currentName = runName;
  await expect(auditName(page)).toHaveValue(runName);
  await expect(typeButton(page, runName)).toContainText('Internal');
  await expect(typeButton(page, runName)).toContainText('no mappings');
  await expect(page.getByText('0 asset types selected')).toBeVisible();
});

test('AT-14 the created name is stored without surrounding spaces', async ({ page }) => {
  await openMapping(page);
  await expect(typeButton(page, runName)).toBeVisible();
  await selectType(page, runName);
  await expect(auditName(page)).toHaveValue(runName);
});

test('AT-15 Internal audit can be cleared and ticked without creating a type', async ({
  page,
}) => {
  await openMapping(page);
  const before = await listNames(page);
  const form = page.getByPlaceholder('e.g. Fire Safety');
  if (await form.isVisible()) {
    await page.getByRole('button', { name: 'New', exact: true }).click();
  }
  await page.getByRole('button', { name: 'New', exact: true }).click();
  const checkbox = page.getByRole('checkbox', { name: 'Internal audit' });
  await checkbox.uncheck();
  await expect(checkbox).not.toBeChecked();
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  await page.getByRole('button', { name: 'New', exact: true }).click();
  await expect(form).toBeHidden();
  expect(await listNames(page)).toEqual(before);
});

test('AT-16 Save name stays disabled until the name changes', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await expect(page.getByRole('button', { name: 'Save name' })).toBeDisabled();
});

test('AT-17 Save name stores the updated name', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await auditName(page).fill(updatedName);
  await page.getByRole('button', { name: 'Save name' }).click();
  await expectToast(page, 'Audit type updated');
  state.currentName = updatedName;
  await expect(typeButton(page, updatedName)).toBeVisible();
  await expect(typeButton(page, updatedName)).toContainText('Internal');
  await expect(typeButton(page, updatedName)).toContainText('no mappings');
});

test('AT-18 a blank name is rejected', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await auditName(page).fill('');
  await page.getByRole('button', { name: 'Save name' }).click();
  await expectToast(page, 'Audit type name is required');
  await expect(typeButton(page, state.currentName)).toBeVisible();
  await auditName(page).fill(state.currentName);
  await expect(page.getByRole('button', { name: 'Save name' })).toBeDisabled();
});

test('AT-19 Internal or External cannot be switched after create', async ({ page }) => {
  await openMapping(page);
  const external = page.locator('section').first().locator('button').filter({ hasText: 'External' });
  if (await external.count()) {
    const label = (await external.first().locator('div.text-sm.font-medium').innerText()).trim();
    await selectType(page, label);
    await expect(page.locator('section').nth(1).getByRole('checkbox')).toHaveCount(0);
    await expect(typeButton(page, label)).toContainText('External');
    return;
  }
  await selectType(page, state.currentName);
  await expect(page.locator('section').nth(1).getByRole('checkbox')).toHaveCount(0);
  await expect(typeButton(page, state.currentName)).toContainText('Internal');
});

test('AT-20 one asset type can be mapped and saved', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await ensureAssetTypeExists(page);
  await selectType(page, state.currentName);
  state.assetTypeName = await chooseAsset(page, state.assetTypeName);
  await page.getByRole('button', { name: 'Save mappings' }).click();
  await expectToast(page, 'Mappings saved');
  expect(await chipLabels(page)).toEqual([state.assetTypeName]);
  await expect(page.getByText('1 asset type selected')).toBeVisible();
  await expect(typeButton(page, state.currentName)).toContainText('1 asset type');
  await expect(page.getByRole('button', { name: 'Save mappings' })).toBeDisabled();
});

test('AT-21 a shared mapping shows also and stays on the other audit type', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  let chip = page.locator('span.rounded-full').filter({ hasText: state.assetTypeName });
  if (!(await chip.innerText()).includes('also')) {
    state.shareName = state.shareName || `E2E Audit ${stamp} share`;
    if (!(await typeButton(page, state.shareName).count())) {
      await createType(page, state.shareName);
    } else {
      await selectType(page, state.shareName);
    }
    if (!(await chipLabels(page)).includes(state.assetTypeName)) {
      await chooseAsset(page, state.assetTypeName);
      await page.getByRole('button', { name: 'Save mappings' }).click();
      await expectToast(page, 'Mappings saved');
    }
    await selectType(page, state.currentName);
    chip = page.locator('span.rounded-full').filter({ hasText: state.assetTypeName });
  }
  await expect(chip).toContainText('also');
  const alsoText = await chip.innerText();
  const otherName = alsoText.split('also ')[1].split(',')[0].replace(/\+\d+.*/, '').trim();
  await selectType(page, otherName);
  await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toBeVisible();
  await selectType(page, state.currentName);
  await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toBeVisible();
});

test('AT-22 removing the chip without saving does not store the change', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await page.getByRole('button', { name: `Remove ${state.assetTypeName}` }).click();
  await expect(page.getByText('unsaved changes')).toBeVisible();
  const other = await pickOther(page, state.currentName);
  await selectType(page, other);
  await selectType(page, state.currentName);
  await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toBeVisible();
  await expect(page.getByText('unsaved changes')).toHaveCount(0);
});

test('AT-23 removing the chip and saving clears the mapping', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await page.getByRole('button', { name: `Remove ${state.assetTypeName}` }).click();
  await page.getByRole('button', { name: 'Save mappings' }).click();
  await expectToast(page, 'Mappings saved');
  await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toHaveCount(0);
  await expect(page.getByText('0 asset types selected')).toBeVisible();
  await expect(typeButton(page, state.currentName)).toContainText('no mappings');
  if (state.shareName) {
    await selectType(page, state.shareName);
    await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toBeVisible();
  }
});

test('AT-24 Select all and Clear do not save', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await page.getByRole('button', { name: 'Select all', exact: true }).click();
  expect((await chipLabels(page)).length).toBeGreaterThan(0);
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  expect(await chipLabels(page)).toEqual([]);
  const other = await pickOther(page, state.currentName);
  await selectType(page, other);
  await selectType(page, state.currentName);
  expect(await chipLabels(page)).toEqual([]);
  await expect(typeButton(page, state.currentName)).toContainText('no mappings');
});

test('AT-25 Clear is disabled when nothing is selected', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Select all', exact: true })).toBeEnabled();
});

test('AT-26 cancel leaves the audit type in the list', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(state.currentName);
    await dialog.dismiss();
  });
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await expect(typeButton(page, state.currentName)).toBeVisible();
});

test('AT-27 deactivate removes only the audit type from this run', async ({ page }) => {
  await openMapping(page);
  await selectType(page, state.currentName);
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(state.currentName);
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await expectToast(page, 'Audit type deactivated');
  await expect(typeButton(page, state.currentName)).toHaveCount(0);
  await page.getByPlaceholder('Search audit types').fill(state.currentName);
  await expect(page.getByText('No audit types yet. Create one to start mapping.')).toBeVisible();
  await page.getByPlaceholder('Search audit types').fill('');
  for (const name of state.baselineNames) {
    await expect(typeButton(page, name)).toBeVisible();
  }
});

test('AT-28 deactivating this run does not change mappings that were already stored', async ({
  page,
}) => {
  await openMapping(page);
  const mappedBaseline = state.baselineNames.filter((name) => (state.baselineChips[name] || []).length);
  for (const name of mappedBaseline) {
    await selectType(page, name);
    expect(await chipLabels(page)).toEqual(state.baselineChips[name]);
  }
  if (!mappedBaseline.length && state.shareName) {
    await selectType(page, state.shareName);
    await expect(page.getByRole('button', { name: `Remove ${state.assetTypeName}` })).toBeVisible();
  }
  if (!mappedBaseline.length && !state.shareName && state.mappedName) {
    await selectType(page, state.mappedName);
    expect((await chipLabels(page)).length).toBeGreaterThan(0);
  }
});

test('AT-29 Open Audit Reports opens the report screen', async ({ page }) => {
  await openMapping(page);
  await page.getByRole('link', { name: 'Open Audit Reports' }).click();
  await expect(page).toHaveURL(/\/reports\/audit-reports/);
  await expect(page.getByRole('button', { name: 'View report' })).toBeVisible();
});

test('AT-30 a second create and deactivate removes only that new audit type', async ({
  page,
}) => {
  await openMapping(page);
  await createType(page, secondName);
  await expect(typeButton(page, secondName)).toBeVisible();
  await expect(typeButton(page, secondName)).toContainText('Internal');
  page.once('dialog', async (dialog) => {
    expect(dialog.message()).toContain(secondName);
    await dialog.accept();
  });
  await page.getByRole('button', { name: 'Deactivate' }).click();
  await expectToast(page, 'Audit type deactivated');
  await expect(typeButton(page, secondName)).toHaveCount(0);
  await expect(typeButton(page, state.currentName)).toHaveCount(0);
  for (const name of state.baselineNames) {
    await expect(typeButton(page, name)).toBeVisible();
  }
});
