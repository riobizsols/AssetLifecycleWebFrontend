// @ts-check
import { expect } from '@playwright/test';

/** @param {import('@playwright/test').Page} page */
export function dataRows(page) {
  return page.locator('tbody tr').filter({ has: page.locator('td') });
}

/** @param {import('@playwright/test').Page} page */
export function rowByText(page, text) {
  return dataRows(page).filter({ hasText: text }).first();
}

/**
 * ContentBox "Search by Column" filter. Picks one existing cell value.
 * @param {import('@playwright/test').Page} page
 * @param {string} columnLabel
 * @param {string} valueText
 */
export async function filterByColumn(page, columnLabel, valueText) {
  await page.locator('[data-contentbox-filter-button]').click();
  const searchByColumn = page.getByText('Search by Column', { exact: true });
  if (await searchByColumn.isVisible().catch(() => false)) {
    await searchByColumn.click();
  }

  const columnSelect = page.locator('select').filter({ hasText: 'Select column' }).last();
  await columnSelect.selectOption({ label: columnLabel });
  await page.getByRole('button', { name: /Select values|selected/ }).click();
  await page.getByPlaceholder('Search...').fill(valueText);
  await page
    .locator('div.cursor-pointer')
    .filter({ hasText: valueText })
    .first()
    .click();
  await page.keyboard.press('Escape');
}

/** Removes the ContentBox search-by-column chip. */
export async function clearColumnFilters(page) {
  const chip = page.locator('button:has(svg.lucide-minus)').first();
  if (await chip.isVisible().catch(() => false)) {
    await chip.click();
  }
}

/** @param {import('@playwright/test').Page} page */
export async function clickHeader(page, label) {
  await page.locator('thead').getByText(label, { exact: true }).click();
}

/** @param {import('@playwright/test').Page} page */
export async function downloadList(page) {
  const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
  await page.locator('button:has(svg.lucide-download)').click();
  return downloadPromise;
}
