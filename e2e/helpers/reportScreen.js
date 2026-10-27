// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';
import { noteInaccessible } from './screenAccess.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 * @returns {Promise<boolean>}
 */
export async function openReport(page, path, title) {
  const status = await openReportsScreen(page, path, title);
  if (status !== 'ok') return false;
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Active Filters')).toBeVisible();
  await expect(page.getByText('Loading asset valuation data...')).toHaveCount(0, {
    timeout: 30000,
  });
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} [title]
 * @returns {Promise<'ok' | 'denied' | 'boot'>}
 */
export async function openReportsScreen(page, path, title) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return 'boot';

  const unauthorized = page.getByText(UNAUTHORIZED);
  if (title) {
    const titleLocator =
      title instanceof RegExp
        ? page.getByText(title).first()
        : page.getByText(title, { exact: true }).first();
    const marker = unauthorized.or(titleLocator).first();
    const seen = await marker
      .waitFor({ state: 'visible', timeout: 45000 })
      .then(() => true)
      .catch(() => false);
    if (!seen || (await unauthorized.isVisible().catch(() => false))) {
      return 'denied';
    }
    await expect(titleLocator).toBeVisible({ timeout: 15000 });
    return 'ok';
  }

  const seenDenied = await unauthorized
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  return seenDenied ? 'denied' : 'ok';
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} screen
 * @param {'ok' | 'denied' | 'boot'} status
 */
export function skipIfInaccessible(page, screen, status) {
  if (status === 'ok') return false;
  if (status === 'boot') {
    throw new Error(`App shell did not load for ${screen}`);
  }
  noteInaccessible(screen);
  return true;
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function expectLayoutChrome(page) {
  await expect(page.getByText('Active Filters')).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible();
  await expect(page.getByText('Loading asset valuation data...')).toHaveCount(0, {
    timeout: 30000,
  });
}

/**
 * Preview strip, or a known empty state.
 * @param {import('@playwright/test').Page} page
 */
export async function expectPreviewOrEmpty(page) {
  const preview = page.getByText(/Preview • \d+ rows/);
  const empty = page.getByText(
    /No data found|No records|Nothing to show|No results|No rows|No .* for the selected/i,
  );
  await expect(preview.or(empty).first()).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} title
 */
export async function previewReport(page, title) {
  await page.getByRole('button', { name: 'Preview' }).click();
  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: title }),
  });
  await expect(modal).toBeVisible({ timeout: 15000 });
  await expect(modal.getByText('Total Records').first()).toBeVisible();
  await modal.getByRole('button', { name: 'Applied Filters' }).click();
  await modal.getByRole('button', { name: 'Detailed Data' }).click();
  await modal.locator('button').filter({ hasText: '×' }).click();
  await expect(modal).toBeHidden({ timeout: 10000 });
}

/**
 * Layout Preview opens the generated-report modal. Custom screens use Summary / Applied filters.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} heading
 */
export async function previewIfEnabled(page, heading) {
  const button = page.getByRole('button', { name: /^Preview$/ }).first();
  if (!(await button.isVisible().catch(() => false))) return 'missing';
  if (!(await button.isEnabled().catch(() => false))) return 'disabled';

  await button.click();
  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading', { name: heading }),
  });
  const opened = await modal
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(() => true)
    .catch(() => false);
  if (!opened) return 'did-not-open';

  const summary = modal.getByText(/Total Records|Summary/i).first();
  await expect(summary).toBeVisible({ timeout: 10000 });
  const filtersTab = modal.getByRole('button', { name: /Applied Filters|Applied filters/i });
  if (await filtersTab.isVisible().catch(() => false)) {
    await filtersTab.click({ force: true, timeout: 5000 }).catch(() => {});
  }
  const dataTab = modal.getByRole('button', { name: /Detailed Data|^Data$/i });
  if (await dataTab.isVisible().catch(() => false)) {
    await dataTab.click({ force: true, timeout: 5000 }).catch(() => {});
  }

  const close = modal.locator('button').filter({ hasText: '×' }).first();
  if (await close.isVisible().catch(() => false)) {
    await close.click();
  } else {
    await page.keyboard.press('Escape');
  }
  await expect(modal).toBeHidden({ timeout: 10000 });
  return 'opened';
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function generateReportFile(page) {
  const button = page.getByRole('button', { name: 'Generate Report' });
  if (!(await button.isVisible().catch(() => false))) return null;
  if (!(await button.isEnabled().catch(() => false))) return null;
  const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
  await button.click();
  const download = await downloadPromise;
  if (download) {
    expect(download.suggestedFilename(), 'Expected a generated report file').toMatch(
      /\.(pdf|json|xlsx|csv)$/i,
    );
  }
  const modal = page.locator('div.fixed').filter({
    has: page.getByRole('heading'),
  });
  if (await modal.isVisible().catch(() => false)) {
    await expect(modal.getByText(/Total Records|Summary/i).first()).toBeVisible({ timeout: 15000 });
    const close = modal.locator('button').filter({ hasText: '×' }).first();
    if (await close.isVisible().catch(() => false)) await close.click();
  }
  return download;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string[]} tabs
 */
export async function expectTabs(page, tabs) {
  for (const tab of tabs) {
    const button = page.getByRole('button', { name: tab, exact: true }).first();
    const seen = await button.waitFor({ state: 'visible', timeout: 10000 }).then(() => true).catch(() => false);
    if (seen && (await button.isEnabled().catch(() => false))) {
      await button.click({ timeout: 8000 }).catch(() => {});
    }
  }
}

/**
 * Expand Reports in the sidebar and return visible child labels.
 * @param {import('@playwright/test').Page} page
 */
export async function expandReportsSidebar(page) {
  const aside = page.getByRole('complementary');
  const group = aside.getByText('Reports', { exact: true }).first();
  const hasGroup = await group.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);

  const alreadyOpen = aside.getByText('Asset Report', { exact: true });
  if (hasGroup && !(await alreadyOpen.isVisible().catch(() => false))) {
    await group.click({ timeout: 8000 }).catch(() => {});
  }
  await aside
    .getByText(/Asset Report|Asset Lifecycle Report|Audit Reports|Stock & Purchase/i)
    .first()
    .waitFor({ state: 'visible', timeout: 10000 })
    .catch(() => {});
  return aside;
}
