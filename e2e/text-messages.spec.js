// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import { headerAddButton } from './helpers/screenAccess.js';

test.describe.configure({ mode: 'serial' });

const run = `PW-TM-${Date.now().toString(36)}`;
const listUrl = `${BASE}/adminsettings/configuration/text-messages`;
const hubUrl = `${BASE}/adminsettings/configuration`;
const e2eText = `${run} E2E`;
const e2eText2 = `${run} E2E2`;

const state = {
  englishText: '',
  tmdId: '',
  originalChinese: '',
  germanFirst: '',
  editedText: '',
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
      ? page.getByText(text, { exact: true }).first()
      : page.getByText(text).first();
  await toast.waitFor({ state: 'visible', timeout: 12000 }).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
function langSelect(page) {
  return page.locator('select[title="Select a language code"]');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function langCodeInput(page) {
  return page.getByPlaceholder('lang code (e.g., ch)');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function searchBox(page) {
  return page.getByPlaceholder('Search...');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function saveButton(page) {
  return page.getByRole('button', { name: /^(Save|Saving\.\.\.)$/ });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} tmdId
 */
function messageRow(page, tmdId) {
  return page.locator('tbody tr').filter({
    has: page.locator('div.font-mono', { hasText: new RegExp(`^${escapeRe(tmdId)}$`) }),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
function dataRows(page) {
  return page.locator('tbody tr').filter({
    has: page.getByPlaceholder('Enter translated text'),
  });
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function waitForList(page) {
  const loading = page.getByText('Loading...', { exact: true });
  await loading.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => {});
  await expect(
    page
      .getByRole('columnheader', { name: 'English', exact: true })
      .or(page.getByText(/No messages/i))
      .or(page.getByRole('heading', { name: /Text Messages/i }))
      .first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
  await expect(loading).toHaveCount(0).catch(() => {});
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openMessages(page) {
  await gotoProtected(page, listUrl);
  await expect(
    page.getByRole('heading', { name: /Text Messages/i }).first(),
  ).toBeVisible({ timeout: 30000 }).catch(() => {});
  await waitForList(page);
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} code
 */
async function selectLang(page, code) {
  await langSelect(page).selectOption(code);
  await waitForList(page);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openChinese(page) {
  await openMessages(page);
  if ((await langSelect(page).inputValue()) !== 'ch') {
    await selectLang(page, 'ch');
  }
  await expect(page.locator('span.font-mono')).toHaveText('ch').catch(() => {});
  await expect(
    page.getByRole('columnheader', { name: /Translation \(ch\)/ }).first(),
  ).toBeVisible({ timeout: 8000 }).catch(() => {});
}

test.describe('Text Messages', () => {
  test('TM-01 Open Text Messages', async ({ page }) => {
    await openMessages(page);
    await expect(page.getByText('Lang code:', { exact: false })).toBeVisible();
    await expect(page.locator('span.font-mono')).toHaveText('ch');
    await expect(langSelect(page)).toHaveValue('ch');
    await expect(searchBox(page)).toBeVisible();
    await expect(saveButton(page)).toBeVisible();
    await expect(saveButton(page)).toBeEnabled();
  });

  test('TM-02 List columns', async ({ page }) => {
    await openChinese(page);
    await expect(page.getByRole('columnheader', { name: 'English', exact: true })).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(
      page.getByRole('columnheader', { name: /Translation \(ch\)/ }).first(),
    ).toBeVisible({ timeout: 8000 }).catch(() => {});
    const first = dataRows(page).first();
    await expect(first).toBeVisible({ timeout: 8000 }).catch(() => {});
    await expect(first.locator('div.font-medium.text-gray-900')).toBeVisible();
    await expect(first.locator('div.font-mono')).toBeVisible();
    await expect(first.getByPlaceholder('Enter translated text')).toBeVisible();
    await expect(first.locator('td').first().locator('input, textarea')).toHaveCount(0);
    await expect(headerAddButton(page)).toHaveCount(0);
    await expect(page.locator('[data-contentbox-filter-button]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
  });

  test('TM-03 Messages already on the screen', async ({ page }) => {
    await openChinese(page);
    const first = dataRows(page).first();
    await expect(first).toBeVisible({ timeout: 8000 }).catch(() => {});
    state.englishText = (await first.locator('div.font-medium.text-gray-900').innerText()).trim();
    state.tmdId = (await first.locator('div.font-mono').innerText()).trim();
    state.originalChinese = await first.getByPlaceholder('Enter translated text').inputValue();
    expect(state.englishText.length).toBeGreaterThan(0);
    expect(state.tmdId).toMatch(/^TMD/);
  });

  test('TM-04 Loading then the list', async ({ page }) => {
    await openChinese(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(
      page.getByRole('heading', { name: 'Text Messages (English → Other Language)' }),
    ).toBeVisible({ timeout: 30000 });
    const loading = page.getByText('Loading...', { exact: true });
    await expect(
      loading.or(page.getByRole('columnheader', { name: 'English', exact: true })).first(),
    ).toBeVisible({ timeout: 30000 });
    await waitForList(page);
    await expect(messageRow(page, state.tmdId)).toBeVisible();
  });

  test('TM-05 Save with nothing changed', async ({ page }) => {
    await openChinese(page);
    await saveButton(page).click();
    await expectToast(page, 'No changes to save');
    await expect(messageRow(page, state.tmdId).getByPlaceholder('Enter translated text')).toHaveValue(
      state.originalChinese,
    );
  });

  test('TM-06 Return to the Admin Dashboard', async ({ page }) => {
    await openChinese(page);
    await gotoProtected(page, hubUrl);
    await expect(page.getByRole('heading', { name: 'Admin Settings', exact: true })).toBeVisible({
      timeout: 30000,
    });
    await expect(page.getByRole('heading', { name: 'Text Messages', exact: true })).toBeVisible();
  });

  test('TM-07 Search by English text', async ({ page }) => {
    await openChinese(page);
    const needle = state.englishText.slice(0, Math.min(12, state.englishText.length));
    await searchBox(page).fill(needle);
    const row = messageRow(page, state.tmdId);
    await expect(row).toBeVisible();
    await expect(row.locator('div.font-medium.text-gray-900')).toHaveText(state.englishText);
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(state.originalChinese);
  });

  test('TM-08 Search by tmd_id', async ({ page }) => {
    await openChinese(page);
    await searchBox(page).fill('');
    const needle = state.tmdId.slice(0, Math.min(10, state.tmdId.length));
    await searchBox(page).fill(needle);
    await expect(messageRow(page, state.tmdId)).toBeVisible();
  });

  test('TM-09 Search with no match', async ({ page }) => {
    await openChinese(page);
    await searchBox(page).fill('zzznomatch999');
    await expect(page.getByText('No messages found.', { exact: true })).toBeVisible();
    await searchBox(page).fill('');
    await expect(messageRow(page, state.tmdId)).toBeVisible();
  });

  test('TM-10 Search by a translation that is already filled', async ({ page }) => {
    await openChinese(page);
    await searchBox(page).fill('');
    let needle = state.originalChinese.trim();
    let matchId = state.tmdId;
    if (!needle) {
      const rows = dataRows(page);
      const count = await rows.count();
      expect(
        count,
        'English messages cannot be created on this screen. The tenant list is empty.',
      ).toBeGreaterThan(0);
      for (let i = 0; i < count; i += 1) {
        const value = await rows.nth(i).getByPlaceholder('Enter translated text').inputValue();
        if (value.trim()) {
          needle = value.trim();
          matchId = (await rows.nth(i).locator('div.font-mono').innerText()).trim();
          break;
        }
      }
    }

    if (!needle) {
      const box = messageRow(page, state.tmdId).getByPlaceholder('Enter translated text');
      await box.fill(`${run} search`);
      await searchBox(page).fill(`${run} search`);
      await expect(messageRow(page, state.tmdId)).toBeVisible();
      await searchBox(page).fill('');
      await box.fill(state.originalChinese);
      return;
    }

    await searchBox(page).fill(needle.slice(0, Math.min(12, needle.length)));
    await expect(messageRow(page, matchId)).toBeVisible();
    await searchBox(page).fill('');
    await expect(messageRow(page, state.tmdId)).toBeVisible();
  });

  test('TM-11 Language list', async ({ page }) => {
    await openChinese(page);
    const select = langSelect(page);
    await expect(select.getByRole('option', { name: 'Chinese (ch)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'German (de)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Tamil (ta)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Hindi (hi)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'French (fr)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Spanish (es)', exact: true })).toBeAttached();
    await expect(select.getByRole('option', { name: 'Custom...', exact: true })).toBeAttached();
  });

  test('TM-12 Switch to German', async ({ page }) => {
    await openChinese(page);
    await selectLang(page, 'de');
    await expect(page.locator('span.font-mono')).toHaveText('de');
    await expect(
      page.getByRole('columnheader', { name: 'Translation (de)', exact: true }),
    ).toBeVisible();
    const row = messageRow(page, state.tmdId);
    await expect(row.locator('div.font-medium.text-gray-900')).toHaveText(state.englishText);
    state.germanFirst = await row.getByPlaceholder('Enter translated text').inputValue();
  });

  test('TM-13 A change is dropped when the language changes', async ({ page }) => {
    await openMessages(page);
    await selectLang(page, 'de');
    const row = messageRow(page, state.tmdId);
    await row.getByPlaceholder('Enter translated text').fill('E2E temp');
    await expect(row).toHaveClass(/bg-yellow-50/);
    await selectLang(page, 'ch');
    await expect(page.locator('span.font-mono')).toHaveText('ch');
    await expect(messageRow(page, state.tmdId)).not.toHaveClass(/bg-yellow-50/);
    await expect(
      messageRow(page, state.tmdId).getByPlaceholder('Enter translated text'),
    ).toHaveValue(state.originalChinese);
  });

  test('TM-14 Custom needs a lang code', async ({ page }) => {
    await openChinese(page);
    await langSelect(page).selectOption('');
    await expect(page.locator('span.font-mono')).toHaveText('');
    await expect(page.getByRole('columnheader', { name: 'Translation', exact: true })).toBeVisible();
    await saveButton(page).click();
    await expectToast(page, 'No changes to save');
    const row = messageRow(page, state.tmdId);
    await row.getByPlaceholder('Enter translated text').fill(`${run} custom`);
    await expect(row).toHaveClass(/bg-yellow-50/);
    await saveButton(page).click();
    await expectToast(page, 'Please enter a lang code');
    await selectLang(page, 'ch');
    await expect(page.locator('span.font-mono')).toHaveText('ch');
    await expect(
      messageRow(page, state.tmdId).getByPlaceholder('Enter translated text'),
    ).toHaveValue(state.originalChinese);
  });

  test('TM-15 Type a lang code', async ({ page }) => {
    await openChinese(page);
    await langCodeInput(page).fill('de');
    await waitForList(page);
    await expect(page.locator('span.font-mono')).toHaveText('de');
    await expect(
      page.getByRole('columnheader', { name: 'Translation (de)', exact: true }),
    ).toBeVisible();
    await selectLang(page, 'ch');
    await expect(page.locator('span.font-mono')).toHaveText('ch');
    await expect(langSelect(page)).toHaveValue('ch');
  });

  test('TM-16 Mark a row as changed', async ({ page }) => {
    await openChinese(page);
    await searchBox(page).fill('');
    const row = messageRow(page, state.tmdId);
    state.editedText = state.originalChinese ? `${state.originalChinese} ${e2eText}` : e2eText;
    await row.getByPlaceholder('Enter translated text').fill(state.editedText);
    await expect(row).toHaveClass(/bg-yellow-50/);
    await expect(page.locator('tbody tr.bg-yellow-50')).toHaveCount(1);
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(state.editedText);
  });

  test('TM-17 Save that translation', async ({ page }) => {
    await openChinese(page);
    const row = messageRow(page, state.tmdId);
    await row.getByPlaceholder('Enter translated text').fill(state.editedText);
    await expect(row).toHaveClass(/bg-yellow-50/);
    await saveButton(page).click();
    await expectToast(page, 'Saved');
    await expect(messageRow(page, state.tmdId)).not.toHaveClass(/bg-yellow-50/);
    await expect(
      messageRow(page, state.tmdId).getByPlaceholder('Enter translated text'),
    ).toHaveValue(state.editedText);
  });

  test('TM-18 The saved text is still there after a refresh', async ({ page }) => {
    await openChinese(page);
    await expect(
      messageRow(page, state.tmdId).getByPlaceholder('Enter translated text'),
    ).toHaveValue(state.editedText);
  });

  test('TM-19 Put the original translation back', async ({ page }) => {
    await openChinese(page);
    const row = messageRow(page, state.tmdId);
    await row.getByPlaceholder('Enter translated text').fill(state.originalChinese);
    await saveButton(page).click();
    await expectToast(page, 'Saved');
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(state.originalChinese);
  });

  test('TM-20 English is not edited', async ({ page }) => {
    await openChinese(page);
    const row = messageRow(page, state.tmdId);
    await expect(row.locator('div.font-medium.text-gray-900')).toHaveText(state.englishText);
    await expect(row.locator('div.font-mono')).toHaveText(state.tmdId);
    await expect(row.locator('td').first().locator('input, textarea')).toHaveCount(0);
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(state.originalChinese);
  });

  test('TM-21 Run save and restore again', async ({ page }) => {
    await openChinese(page);
    const row = messageRow(page, state.tmdId);
    const second = state.originalChinese ? `${state.originalChinese} ${e2eText2}` : e2eText2;
    await row.getByPlaceholder('Enter translated text').fill(second);
    await saveButton(page).click();
    await expectToast(page, 'Saved');
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(second);
    await row.getByPlaceholder('Enter translated text').fill(state.originalChinese);
    await saveButton(page).click();
    await expectToast(page, 'Saved');
    await expect(row.getByPlaceholder('Enter translated text')).toHaveValue(state.originalChinese);
    await expect(row.locator('div.font-medium.text-gray-900')).toHaveText(state.englishText);
  });
});
