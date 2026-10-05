// @ts-check
import { expect } from '@playwright/test';
import { gotoProtected } from './appReady.js';
import { BASE } from './baseUrl.js';

const UNAUTHORIZED = /not authorized|Access Denied|You are not authorized/i;

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} path
 * @param {string | RegExp} title
 * @returns {Promise<boolean>}
 */
export async function openReport(page, path, title) {
  const ready = await gotoProtected(page, `${BASE}${path}`);
  if (!ready) return false;

  const unauthorized = page.getByText(UNAUTHORIZED);
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
    return false;
  }

  await expect(titleLocator).toBeVisible({ timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Preview' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByText('Active Filters')).toBeVisible();
  await expect(page.getByText('Loading asset valuation data...')).toHaveCount(0, {
    timeout: 30000,
  });
  return true;
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
 * Preview strip, or a known empty state.
 * @param {import('@playwright/test').Page} page
 */
export async function expectPreviewOrEmpty(page) {
  const preview = page.getByText(/Preview • \d+ rows/);
  const empty = page.getByText(/No data found|No records|Nothing to show|No results/i);
  await expect(preview.or(empty).first()).toBeVisible({ timeout: 45000 });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function generateReportFile(page) {
  const button = page.getByRole('button', { name: 'Generate Report' });
  if (!(await button.isVisible().catch(() => false))) return null;
  const downloadPromise = page.waitForEvent('download', { timeout: 60000 });
  await button.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename(), 'Expected a generated report file').toMatch(/\.(pdf|json)$/i);
  return download;
}
