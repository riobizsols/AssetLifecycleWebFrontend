// @ts-check
import { expect } from '@playwright/test';
import { DATE_PRESETS, MAX_OPTIONS_PER_FIELD } from './reportFilterCatalog.js';
import { generateReportFile, previewIfEnabled } from './reportScreen.js';

const ERROR_TEXT = /Error loading data|Network Error|Failed to load summary|Failed to load reopen|Failed to load filter|Error loading dropdown/i;
const SKIP_OPTION = /^(Select|All |Loading|Search|No options|No |Custom$)/i;

/**
 * @param {string} value
 */
function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForReportData(page) {
  const loading = page.getByText('Loading asset valuation data...');
  const overlay = page.locator('[aria-busy="true"]');
  await expect
    .poll(
      async () => {
        const busy =
          (await loading.isVisible().catch(() => false)) ||
          (await overlay.isVisible().catch(() => false));
        return !busy;
      },
      { timeout: 45000 },
    )
    .toBeTruthy();
}

/**
 * Persistent report error banner (not a disappearing toast).
 * @param {import('@playwright/test').Page} page
 */
export async function readErrorBanner(page) {
  const banner = page.locator('.bg-red-50').filter({ hasText: ERROR_TEXT });
  if (await banner.first().isVisible().catch(() => false)) {
    return ((await banner.first().innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
  }
  return '';
}

/**
 * Fail when the report surface shows a persistent load / API error.
 * @param {import('@playwright/test').Page} page
 * @param {string} context
 * @param {{ reloadOnce?: boolean }} [opts]
 */
export async function assertNoReportError(page, context, opts = {}) {
  let text = await readErrorBanner(page);
  if (text && opts.reloadOnce) {
    await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
    await waitForReportData(page);
    text = await readErrorBanner(page);
  }
  if (text) throw new Error(`BUG — error after ${context}: ${text}`);
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readPreviewCount(page) {
  const strip = page.getByText(/Preview • \d+ rows/).first();
  if (!(await strip.isVisible().catch(() => false))) return null;
  const text = await strip.innerText();
  const match = text.match(/Preview • (\d+) rows/);
  return match ? Number(match[1]) : null;
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function readDataState(page) {
  await waitForReportData(page);
  const error = await readErrorBanner(page);
  if (error) return { state: 'error', count: null, message: error };
  const count = await readPreviewCount(page);
  const empty = await page
    .getByText(/No data found|No records|Nothing to show|No results|No rows|No report yet|No .* for the selected/i)
    .first()
    .isVisible()
    .catch(() => false);
  if (count != null && count > 0) return { state: 'data', count };
  if (count === 0 || empty) return { state: 'empty', count: count ?? 0 };
  const tableRows = page.locator('table tbody tr');
  const n = await tableRows.count().catch(() => 0);
  if (n > 0) return { state: 'data', count: n };
  return { state: 'unknown', count: null };
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function closeMenus(page) {
  await page.keyboard.press('Escape').catch(() => {});
  const anchor = page.getByText('Active Filters').first();
  if (await anchor.isVisible().catch(() => false)) {
    await anchor.click({ force: true }).catch(() => {});
  }
}

/**
 * @param {import('@playwright/test').Locator} box
 * @param {'select' | 'multiselect' | 'searchable'} type
 */
async function clickTrigger(box, type) {
  if (type === 'multiselect') {
    await box.locator('div.rounded-xl.border').first().click();
    return;
  }
  await box.getByRole('button').first().click();
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} optionText
 */
function optionLocator(page, optionText) {
  return page
    .locator('div.cursor-pointer, label')
    .filter({ hasText: new RegExp(`^${escapeRe(optionText)}$`) })
    .last();
}

/**
 * ReportLayout quick-filter box (label is a small heading, not <label>).
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export function layoutFieldBox(page, label) {
  return page
    .locator('div.text-xs.font-medium')
    .filter({ hasText: new RegExp(`^${escapeRe(label)}$`) })
    .first()
    .locator('xpath=..');
}

/**
 * Extras / configure filter box (real <label> or uppercase caption).
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export function extrasFieldBox(page, label) {
  const exact = new RegExp(`^${escapeRe(label)}$`, 'i');
  const byLabel = page.locator('label').filter({ hasText: exact }).first();
  return byLabel.locator('xpath=..');
}

/**
 * @param {import('@playwright/test').Page} page
 */
function openMenuRoot(page) {
  const portal = page.locator('div.fixed').filter({
    has: page.getByPlaceholder(/Search/i),
  });
  const abs = page.locator('div.absolute.z-50');
  return { portal, abs };
}

/**
 * @param {import('@playwright/test').Locator} root
 */
async function optionTexts(root) {
  const checks = root.locator('label');
  const clicks = root.locator('div.cursor-pointer');
  const source = (await checks.count()) > 0 ? checks : clicks;
  const n = await source.count();
  const names = [];
  for (let i = 0; i < n; i += 1) {
    const raw = ((await source.nth(i).innerText()) || '').split('\n')[0].trim();
    if (raw && !SKIP_OPTION.test(raw)) names.push(raw);
  }
  return names;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} box
 * @param {'select' | 'multiselect' | 'searchable'} type
 */
export async function listFieldOptions(page, box, type) {
  await closeMenus(page);
  await clickTrigger(box, type);

  const { portal, abs } = openMenuRoot(page);
  const portalVisible = await portal
    .last()
    .isVisible()
    .catch(() => false);
  const root = portalVisible ? portal.last() : abs.last();
  const visible = await root.isVisible().catch(() => false);
  if (!visible) {
    await closeMenus(page);
    return [];
  }

  const empty = root.getByText(/No options found/i);
  if (await empty.isVisible().catch(() => false)) {
    await closeMenus(page);
    return [];
  }

  const names = await optionTexts(root);
  await closeMenus(page);
  return names;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} box
 * @param {'select' | 'multiselect' | 'searchable'} type
 * @param {string} optionText
 */
export async function pickFieldOption(page, box, type, optionText) {
  await closeMenus(page);
  await clickTrigger(box, type);

  const search = page.getByPlaceholder(/Search/i);
  if (await search.isVisible().catch(() => false)) {
    const inputType = await search.getAttribute('type');
    if (inputType !== 'number' && inputType !== 'date') {
      await search.fill(optionText.slice(0, 40));
    }
  }

  let target = optionLocator(page, optionText);
  if (!(await target.isVisible().catch(() => false))) {
    await clickTrigger(box, type);
    target = optionLocator(page, optionText);
  }
  if (!(await target.isVisible().catch(() => false))) {
    await closeMenus(page);
    return false;
  }

  if (type === 'multiselect') {
    const cb = target.locator('input[type="checkbox"]');
    if (await cb.count()) await cb.click({ force: true });
    else await target.click();
  } else {
    await target.click();
  }
  await closeMenus(page);
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {string} type
 * @param {string} [value]
 */
export async function applyLayoutFilter(page, label, type, value) {
  const box = layoutFieldBox(page, label);
  if (!(await box.isVisible().catch(() => false))) {
    return { applied: false, reason: 'missing-field', option: null };
  }

  if (type === 'text' || type === 'number') {
    const input = box.locator('input').first();
    if (!(await input.isVisible().catch(() => false))) {
      return { applied: false, reason: 'missing-input', option: null };
    }
    const fill = value ?? (type === 'number' ? '1' : 'A');
    await input.fill('');
    await input.fill(fill);
    await input.blur();
    return { applied: true, reason: 'typed', option: fill };
  }

  if (type === 'daterange') {
    const picked = await pickFieldOption(page, box, 'select', 'Current FY');
    if (picked) return { applied: true, reason: 'date-preset', option: 'Current FY' };
    const from = box.locator('input[type="date"]').first();
    const to = box.locator('input[type="date"]').last();
    if ((await from.isVisible().catch(() => false)) && (await to.isVisible().catch(() => false))) {
      await from.fill('2024-04-01');
      await to.fill('2025-03-31');
      return { applied: true, reason: 'date-inputs', option: '2024-04-01..2025-03-31' };
    }
    return { applied: false, reason: 'empty-options', option: null };
  }

  const kind = type === 'searchable' ? 'searchable' : type === 'select' ? 'select' : 'multiselect';
  const options = await listFieldOptions(page, box, kind);
  if (!options.length) return { applied: false, reason: 'empty-options', option: null };
  const pick = value && options.includes(value) ? value : options[0];
  const ok = await pickFieldOption(page, box, kind, pick);
  if (!ok) return { applied: false, reason: 'pick-failed', option: pick, options };
  return { applied: true, reason: 'option', option: pick, options };
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function dismissToasts(page) {
  const toaster = page.locator('[data-rht-toaster]');
  if (await toaster.isVisible().catch(() => false)) {
    await toaster.click({ force: true }).catch(() => {});
    await page.keyboard.press('Escape').catch(() => {});
  }
}

export async function clearReportFilters(page) {
  await dismissToasts(page);
  const clear = page.getByRole('button', { name: 'Clear', exact: true });
  if (await clear.isVisible().catch(() => false)) {
    await clear.click({ force: true });
    await waitForReportData(page);
  }
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function expectActiveChip(page) {
  const none = page.getByText('None', { exact: true });
  const chips = page.locator('div.inline-flex.items-center.gap-2.bg-blue-100');
  const hasChip = (await chips.count()) > 0;
  const noneVisible = await none.isVisible().catch(() => false);
  return hasChip || !noneVisible;
}

/**
 * Visible cell values for a preview-table column.
 * @param {import('@playwright/test').Page} page
 * @param {string} header
 */
export async function columnValues(page, header) {
  const table = page.locator('table').filter({ has: page.getByRole('columnheader') }).first();
  if (!(await table.isVisible().catch(() => false))) {
    const fallback = page.locator('table').last();
    if (!(await fallback.isVisible().catch(() => false))) return [];
  }
  const headers = page.locator('table thead th');
  const n = await headers.count();
  let index = -1;
  for (let i = 0; i < n; i += 1) {
    const text = ((await headers.nth(i).innerText()) || '').replace(/\s*×\s*$/, '').trim();
    if (text.toLowerCase() === header.toLowerCase()) {
      index = i;
      break;
    }
  }
  if (index < 0) return [];
  const cells = page.locator(`table tbody tr td:nth-child(${index + 1})`);
  const count = Math.min(await cells.count(), 25);
  const values = [];
  for (let i = 0; i < count; i += 1) {
    values.push(((await cells.nth(i).innerText()) || '').trim());
  }
  return values;
}

/**
 * @param {string[]} values
 * @param {string} option
 */
export function valuesMatchFilter(values, option) {
  if (!values.length) return true;
  const needle = String(option).trim().toLowerCase();
  if (!needle) return true;
  return values.every((cell) => {
    const hay = cell.toLowerCase();
    return hay === '' || hay.includes(needle) || needle.includes(hay);
  });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} header
 * @param {string} option
 * @param {string} context
 */
export async function assertColumnMatches(page, header, option, context) {
  const values = await columnValues(page, header);
  if (!values.length) return 'no-column-or-rows';
  if (!valuesMatchFilter(values, option)) return `mismatch after ${context}`;
  return 'matched';
}

/**
 * Apply every option (capped) of one quick field and record the data condition.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ label: string, type: string, matchColumn?: string }} field
 * @param {number} baseline
 */
export async function exerciseQuickField(page, info, field, baseline) {
  const results = [];
  const box = layoutFieldBox(page, field.label);
  if (!(await box.isVisible().catch(() => false))) {
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${field.label} — missing on screen.`,
    });
    return results;
  }

  let options = [];
  if (field.type === 'select' || field.type === 'multiselect' || field.type === 'searchable') {
    options = await listFieldOptions(
      page,
      box,
      field.type === 'searchable' ? 'searchable' : field.type === 'select' ? 'select' : 'multiselect',
    );
  } else if (field.type === 'daterange') {
    options = (await listFieldOptions(page, box, 'select')).filter((o) => DATE_PRESETS.includes(o));
    if (!options.length) options = ['Current FY'];
  } else if (field.type === 'number') {
    options = ['1'];
  } else {
    options = ['A'];
  }

  if (!options.length) {
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${field.label} — EMPTY OPTIONS (no data in dropdown).`,
    });
    return results;
  }

  const sample = options.slice(0, MAX_OPTIONS_PER_FIELD);
  for (const option of sample) {
    await clearReportFilters(page);
    const applied = await applyLayoutFilter(page, field.label, field.type, option);
    await waitForReportData(page);
    const data = await readDataState(page);
    if (data.state === 'error') {
      info.annotations.push({
        type: 'condition',
        description: `FILTER ${field.label}="${option}" → API error (${data.message})`,
      });
      results.push({ option, data: 'error', count: null, match: 'n/a', chip: false });
      continue;
    }

    if (applied.applied && data.count != null && baseline != null && data.count > baseline) {
      info.annotations.push({
        type: 'condition',
        description: `ROWS UP — ${field.label}="${option}" increased rows from ${baseline} to ${data.count}`,
      });
    }

    let match = 'n/a';
    if (
      applied.applied &&
      field.matchColumn &&
      data.state === 'data' &&
      field.type !== 'daterange' &&
      field.type !== 'number' &&
      field.type !== 'text'
    ) {
      match = await assertColumnMatches(
        page,
        field.matchColumn,
        applied.option || option,
        `${field.label}=${option}`,
      );
    }

    const chip = applied.applied ? await expectActiveChip(page) : false;
    results.push({ option, data: data.state, count: data.count, match, chip });
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${field.label}="${option}" → ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}${match === 'matched' ? ', column ok' : ''}${applied.applied ? '' : ` [${applied.reason}]`}`,
    });
  }

  if (options.length > sample.length) {
    info.annotations.push({
      type: 'condition',
      description: `FILTER ${field.label} — sampled ${sample.length} of ${options.length} options.`,
    });
  }

  await clearReportFilters(page);
  return results;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function addAdvancedRow(page) {
  const toggle = page.getByRole('button', { name: /Advanced filters/i });
  if (await toggle.isVisible().catch(() => false)) {
    const panel = page.getByText('Advanced Conditions');
    if (!(await panel.isVisible().catch(() => false))) await toggle.click();
  }
  const add = page.getByRole('button', { name: /^\+?\s*Add$/i });
  if (!(await add.isVisible().catch(() => false))) return false;
  await add.click();
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function removeAdvancedRows(page) {
  const remove = page.locator('button').filter({ hasText: '✕' });
  const n = await remove.count();
  for (let i = n - 1; i >= 0; i -= 1) {
    if (await remove.nth(i).isVisible().catch(() => false)) await remove.nth(i).click();
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ label: string, type: string, matchColumn?: string }} field
 * @param {number} baseline
 */
export async function exerciseAdvancedField(page, info, field, baseline) {
  await clearReportFilters(page);
  await removeAdvancedRows(page);

  const added = await addAdvancedRow(page);
  if (!added) {
    info.annotations.push({
      type: 'condition',
      description: `ADVANCED ${field.label} — Add button not on this screen.`,
    });
    return;
  }

  const row = page.locator('div.grid.grid-cols-12.items-center').last();
  const fieldSelect = row.getByRole('button').first();
  await fieldSelect.click();
  const menu = page.locator('div.absolute.z-50').last();
  const choice = menu.locator('div.cursor-pointer').filter({ hasText: field.label }).first();
  if (!(await choice.isVisible().catch(() => false))) {
    await closeMenus(page);
    await removeAdvancedRows(page);
    info.annotations.push({
      type: 'condition',
      description: `ADVANCED ${field.label} — field not in picker.`,
    });
    return;
  }
  await choice.click();
  await closeMenus(page);

  const valueBox = row.locator('div').filter({ has: row.locator('input, button') }).last();
  if (field.type === 'text' || field.type === 'number') {
    const input = row.locator('input').last();
    if (await input.isVisible().catch(() => false)) {
      await input.fill(field.type === 'number' ? '1' : 'A');
    }
  } else if (field.type === 'daterange') {
    const from = row.locator('input[type="date"]').first();
    const to = row.locator('input[type="date"]').last();
    if ((await from.isVisible().catch(() => false)) && (await to.isVisible().catch(() => false))) {
      await from.fill('2024-04-01');
      await to.fill('2025-03-31');
    }
  } else {
    const valueTrigger = row.locator('div.rounded-xl.border, button').filter({ hasText: /Select|▼/ }).last();
    if (await valueTrigger.isVisible().catch(() => false)) {
      await valueTrigger.click();
      const item = page.locator('div.cursor-pointer, label').filter({ hasNotText: /No options/i }).first();
      if (await item.isVisible().catch(() => false)) await item.click();
      await closeMenus(page);
    }
  }

  await waitForReportData(page);
  const data = await readDataState(page);
  if (data.state === 'error') {
    info.annotations.push({
      type: 'condition',
      description: `ADVANCED ${field.label} → API error (${data.message})`,
    });
    await removeAdvancedRows(page);
    await clearReportFilters(page);
    return;
  }
  if (data.count != null && baseline != null && data.count > baseline) {
    info.annotations.push({
      type: 'condition',
      description: `ROWS UP — advanced ${field.label} increased rows from ${baseline} to ${data.count}`,
    });
  }
  info.annotations.push({
    type: 'condition',
    description: `ADVANCED ${field.label} → ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}`,
  });
  await removeAdvancedRows(page);
  await clearReportFilters(page);
}

/**
 * Apply the first option of the first two selectable quick filters together.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ label: string, type: string }[]} fields
 * @param {number} baseline
 */
export async function exerciseCombinedFilters(page, info, fields, baseline) {
  const usable = fields.filter((f) =>
    ['select', 'multiselect', 'searchable', 'daterange'].includes(f.type),
  );
  if (usable.length < 2) {
    info.annotations.push({
      type: 'condition',
      description: 'COMBINED — fewer than two selectable filters; skipped.',
    });
    return;
  }

  await clearReportFilters(page);
  const applied = [];
  for (const field of usable.slice(0, 2)) {
    const result = await applyLayoutFilter(page, field.label, field.type);
    if (result.applied) applied.push(`${field.label}=${result.option}`);
  }
  await waitForReportData(page);
  const data = await readDataState(page);
  if (data.state === 'error') {
    info.annotations.push({
      type: 'condition',
      description: `COMBINED ${applied.join(' + ') || 'none'} → API error (${data.message})`,
    });
    await clearReportFilters(page);
    return;
  }
  if (data.count != null && baseline != null && data.count > baseline) {
    info.annotations.push({
      type: 'condition',
      description: `ROWS UP — combined filters increased rows from ${baseline} to ${data.count}`,
    });
  }
  info.annotations.push({
    type: 'condition',
    description: `COMBINED ${applied.join(' + ') || 'none'} → ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}`,
  });

  await clearReportFilters(page);
  await waitForReportData(page);
  const after = await readDataState(page);
  if (baseline != null && after.count != null && after.count < baseline) {
    info.annotations.push({
      type: 'condition',
      description: `CLEAR — rows ${after.count} (baseline ${baseline}).`,
    });
  } else {
    info.annotations.push({
      type: 'condition',
      description: `CLEAR → ${after.state}${after.count != null ? ` (${after.count} rows)` : ''}`,
    });
  }
}

/**
 * Preview + generate + column chooser after filters settle.
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ title: string | RegExp, generate?: boolean, hideTable?: boolean }} report
 */
export async function exerciseReportFunctions(page, info, report) {
  await waitForReportData(page);
  const fnError = await readErrorBanner(page);
  if (fnError) {
    info.annotations.push({
      type: 'condition',
      description: `FUNCTION skipped — API error (${fnError})`,
    });
    return;
  }

  if (!report.hideTable) {
    const preview = await previewIfEnabled(page, report.title);
    info.annotations.push({ type: 'condition', description: `FUNCTION preview → ${preview}` });
  }

  if (report.generate) {
    const download = await generateReportFile(page);
    info.annotations.push({
      type: 'condition',
      description: `FUNCTION generate → ${download ? download.suggestedFilename() : 'no file / disabled'}`,
    });
  }

  const addCol = page.getByRole('button', { name: /Add column/i });
  if (await addCol.isVisible().catch(() => false)) {
    await addCol.click();
    const { portal, abs } = openMenuRoot(page);
    const portalVisible = await portal.last().isVisible().catch(() => false);
    const root = portalVisible ? portal.last() : abs.last();
    const option = root.locator('div.cursor-pointer').first();
    if (await option.isVisible().catch(() => false)) {
      const name = (await option.innerText()).trim();
      await option.click();
      await expect(
        page.getByRole('columnheader', { name: new RegExp(`^${escapeRe(name)}\\s*×?$`) }),
      ).toBeVisible({ timeout: 10000 });
      info.annotations.push({ type: 'condition', description: `FUNCTION add column → ${name}` });
    } else {
      await closeMenus(page);
    }
    const reset = page.getByRole('button', { name: 'Reset', exact: true });
    if (await reset.isVisible().catch(() => false)) await reset.click({ force: true });
  }
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} info
 * @param {{ labels?: string[], apply?: string, advanced?: boolean, nativeSelects?: string[] }} extras
 */
export async function exerciseExtrasFilters(page, info, extras) {
  await waitForReportData(page);
  const openError = await readErrorBanner(page);
  if (openError) {
    info.annotations.push({
      type: 'condition',
      description: `EXTRAS open API error — ${openError}`,
    });
  }

  for (const label of extras.labels || []) {
    const box = extrasFieldBox(page, label);
    if (!(await box.isVisible().catch(() => false))) {
      info.annotations.push({
        type: 'condition',
        description: `EXTRAS ${label} — not on screen.`,
      });
      continue;
    }
    const native = box.locator('select').first();
    if (await native.isVisible().catch(() => false)) {
      const opts = await native.locator('option').allTextContents();
      const pick = opts.map((o) => o.trim()).find((o) => o && !SKIP_OPTION.test(o));
      if (pick) {
        await native.selectOption({ label: pick });
        info.annotations.push({
          type: 'condition',
          description: `EXTRAS ${label}="${pick}" applied.`,
        });
      }
      continue;
    }
    const kind = (await box.locator('input[type="checkbox"]').count()) > 0 ? 'multiselect' : 'select';
    const triggerVisible =
      kind === 'multiselect'
        ? await box.locator('div.rounded-xl.border').first().isVisible().catch(() => false)
        : await box.getByRole('button').first().isVisible().catch(() => false);
    if (!triggerVisible) {
      info.annotations.push({
        type: 'condition',
        description: `EXTRAS ${label} — locked / not interactive.`,
      });
      continue;
    }
    const options = await listFieldOptions(page, box, kind === 'multiselect' ? 'multiselect' : 'select');
    if (!options.length) {
      info.annotations.push({
        type: 'condition',
        description: `EXTRAS ${label} — EMPTY OPTIONS.`,
      });
      continue;
    }
    await pickFieldOption(page, box, kind === 'multiselect' ? 'multiselect' : 'select', options[0]);
    info.annotations.push({
      type: 'condition',
      description: `EXTRAS ${label}="${options[0]}" (${options.length} options).`,
    });
  }

  for (const label of extras.nativeSelects || []) {
    const sel = extrasFieldBox(page, label).locator('select').first();
    if (!(await sel.isVisible().catch(() => false))) continue;
    const opts = await sel.locator('option').allTextContents();
    const pick = opts.map((o) => o.trim()).find((o) => o && !SKIP_OPTION.test(o));
    if (pick) {
      await sel.selectOption({ label: pick });
      info.annotations.push({
        type: 'condition',
        description: `EXTRAS native ${label}="${pick}".`,
      });
    }
  }

  if (extras.advanced) {
    const toggle = page.getByRole('button', { name: /Advanced filters/i });
    if (await toggle.isVisible().catch(() => false)) {
      await toggle.click();
      const added = await addAdvancedRow(page);
      info.annotations.push({
        type: 'condition',
        description: `EXTRAS advanced → ${added ? 'condition added' : 'no Add'}`,
      });
      await removeAdvancedRows(page);
    }
  }

  if (extras.apply) {
    const apply = page.getByRole('button', { name: extras.apply, exact: false }).first();
    if (await apply.isVisible().catch(() => false) && (await apply.isEnabled().catch(() => false))) {
      await apply.click();
    }
  }

  await waitForReportData(page);
  const data = await readDataState(page);
  info.annotations.push({
    type: 'condition',
    description: `EXTRAS data → ${data.state}${data.count != null ? ` (${data.count} rows)` : ''}`,
  });
}
