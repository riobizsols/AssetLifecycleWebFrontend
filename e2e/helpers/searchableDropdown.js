// @ts-check
import { expect } from '@playwright/test';

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
function fieldTrigger(page, label) {
  return page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .locator('xpath=..')
    .getByRole('button');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function openPortalMenu(page, label) {
  const trigger = fieldTrigger(page, label);
  await expect(trigger).toBeEnabled({ timeout: 15000 });
  await trigger.click();
  const search = page.getByPlaceholder(/Search/i);
  await expect(search).toBeVisible({ timeout: 10000 });
  return { trigger, search };
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 */
export async function listPortalOptions(page, label) {
  const { trigger, search } = await openPortalMenu(page, label);
  const panel = search.locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]');
  const items = panel.locator('div.cursor-pointer');
  await expect(items.first(), `No options in the ${label} dropdown`).toBeVisible({
    timeout: 15000,
  });

  const count = await items.count();
  const names = [];
  for (let i = 0; i < count; i += 1) {
    names.push((await items.nth(i).innerText()).split('\n')[0].trim());
  }

  await trigger.click();
  await expect(search).toBeHidden({ timeout: 5000 });
  return names;
}

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} label
 * @param {{ optionText?: string }} [options]
 */
export async function selectPortalDropdown(page, label, options = {}) {
  const { optionText } = options;
  const { trigger, search } = await openPortalMenu(page, label);
  const panel = search.locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]');
  const items = panel.locator('div.cursor-pointer');
  await expect(items.first(), `No options in the ${label} dropdown`).toBeVisible({
    timeout: 15000,
  });

  const target = optionText
    ? items.filter({ hasText: optionText }).first()
    : items.first();

  await expect(target).toBeVisible();
  await target.click();
  await expect(trigger).not.toHaveText(/Select/i, { timeout: 5000 });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
export async function selectAssetTypeWithAvailability(page) {
  const trigger = fieldTrigger(page, 'Asset Type');
  await expect(trigger).toBeVisible({ timeout: 15000 });

  try {
    await expect(async () => {
      if (!(await page.getByPlaceholder(/Search asset type/i).isVisible())) {
        await trigger.click();
      }
      const search = page.getByPlaceholder(/Search asset type/i);
      await expect(search).toBeVisible();
      const items = search
        .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
        .locator('div.cursor-pointer');
      const count = await items.count();
      let hasAvailable = false;
      for (let i = 0; i < count; i += 1) {
        if (/\([1-9]\d*\)/.test(await items.nth(i).innerText())) {
          hasAvailable = true;
          break;
        }
      }
      expect(hasAvailable).toBeTruthy();
    }).toPass({ timeout: 25000 });
  } catch {
    if (await page.getByPlaceholder(/Search asset type/i).isVisible()) {
      await trigger.click();
    }
    return false;
  }

  if (!(await page.getByPlaceholder(/Search asset type/i).isVisible())) {
    await trigger.click();
  }

  const search = page.getByPlaceholder(/Search asset type/i);
  const items = search
    .locator('xpath=ancestor::div[contains(@class,"fixed") or contains(@class,"absolute")][1]')
    .locator('div.cursor-pointer');
  const count = await items.count();
  for (let i = 0; i < count; i += 1) {
    const text = await items.nth(i).innerText();
    if (/\([1-9]\d*\)/.test(text)) {
      await items.nth(i).click();
      await expect(trigger).not.toHaveText(/Select Asset Type/i, { timeout: 5000 });
      return true;
    }
  }

  return false;
}
