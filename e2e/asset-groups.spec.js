// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';

test.describe('RIO EAM asset groups', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('loads groups, opens create, and saves a group when assets are available', async ({ page }) => {
    test.setTimeout(240000);

    await loginToRioEam(page);
    await gotoProtected(page, `${BASE}/group-asset`);

    await expect(page.getByText('Asset Groups').first()).toBeVisible({ timeout: 45000 });
    await expect(page.getByText('Loading asset groups...')).toHaveCount(0, { timeout: 30000 });

    const empty = page.getByText('No asset groups found.');
    if (await empty.isVisible()) {
      await expect(page.getByText('Create your first asset group')).toBeVisible();
    } else {
      await expect(page.getByText('Group Name').first()).toBeVisible();
      await expect(page.getByText('Asset Count').first()).toBeVisible();
      await expect(page.getByText('Created By').first()).toBeVisible();
      await expect(page.getByText('Created Date').first()).toBeVisible();
      await expect(page.getByText('Status').first()).toBeVisible();
    }

    const addButton = page.locator('button.bg-\\[\\#0E2F4B\\]').filter({ has: page.locator('svg.lucide-plus') });
    if ((await addButton.count()) > 0) {
      await addButton.first().click();
    } else if (await page.getByText('Create your first asset group').isVisible()) {
      await page.getByText('Create your first asset group').click();
    } else {
      await page.goto(`${BASE}/group-asset/create`);
    }

    await page.waitForURL(/\/group-asset\/create\/?/, { timeout: 20000 });
    await expect(page.getByPlaceholder('Enter group name')).toBeVisible({ timeout: 20000 });
    await expect(page.getByText('Assets List')).toBeVisible();
    await expect(page.getByText('Selected Assets')).toBeVisible();
    await expect(page.getByText('Please select an asset type to view assets')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Save' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();

    const groupName = `PW-E2E-GRP-${Date.now()}`;
    await page.getByPlaceholder('Enter group name').fill(groupName);

    const created = await tryCreateGroup(page, groupName);
    if (created) {
      await page.waitForURL(/\/group-asset\/?$/, { timeout: 30000 });
      // List may paginate / delay; reload once before asserting.
      const visible = await page
        .getByText(groupName)
        .first()
        .waitFor({ state: 'visible', timeout: 15000 })
        .then(() => true)
        .catch(() => false);
      if (!visible) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await expect(page.getByText(groupName).first()).toBeVisible({ timeout: 20000 });
      }
    } else {
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForURL(/\/group-asset\/?$/, { timeout: 20000 });
    }

    const editTarget = created
      ? page.locator('tr', { hasText: groupName }).getByTitle('Edit')
      : page.getByTitle('Edit').first();
    if ((await editTarget.count()) > 0 && (await editTarget.isVisible())) {
      await editTarget.click();
      const onEdit = await page
        .waitForURL(/\/group-asset\/edit\//, { timeout: 20000 })
        .then(() => true)
        .catch(() => false);
      if (!onEdit) return;

      const headingReady = await page
        .getByRole('heading', { name: 'Edit Asset Group' })
        .waitFor({ state: 'visible', timeout: 45000 })
        .then(() => true)
        .catch(() => false);
      if (!headingReady) {
        await page.goto(`${BASE}/group-asset`);
        return;
      }
      await expect(page.getByPlaceholder('Enter group name')).toBeVisible();
      await page.getByRole('button', { name: 'Cancel' }).click();
      await page.waitForURL(/\/group-asset\/?$/, { timeout: 20000 });
    }
  });
});

/**
 * @param {import('@playwright/test').Page} page
 * @param {string} groupName
 */
async function tryCreateGroup(page, groupName) {
  const typeTrigger = page.getByRole('button', { name: 'Select Asset Type' });
  await expect(typeTrigger).toBeVisible({ timeout: 20000 });
  await typeTrigger.click();
  await expect(page.getByPlaceholder('Select Asset Type')).toBeVisible({ timeout: 10000 });
  await expect(page.getByText('Loading asset types...')).toHaveCount(0, { timeout: 30000 });

  const typeOptions = page.locator('div.absolute.z-50 button').filter({ hasNotText: 'Create New Asset Type' });
  const optionsReady = await typeOptions
    .first()
    .waitFor({ state: 'visible', timeout: 30000 })
    .then(() => true)
    .catch(() => false);
  if (!optionsReady) {
    await typeTrigger.click().catch(() => {});
    return false;
  }

  const optionCount = await typeOptions.count();
  if (optionCount === 0) return false;

  let picked = false;
  for (let i = 0; i < optionCount; i += 1) {
    const text = await typeOptions.nth(i).innerText();
    if (/\([1-9]\d*\)/.test(text)) {
      await typeOptions.nth(i).click();
      picked = true;
      break;
    }
  }
  if (!picked) {
    await typeTrigger.click();
    return false;
  }

  await expect(page.getByText('Loading assets...')).toHaveCount(0, { timeout: 30000 });
  const emptyType = page.getByText('No assets found for selected asset type');
  if (await emptyType.isVisible()) return false;

  const addOne = page.getByTitle('Add one asset');
  await expect(addOne).toBeEnabled({ timeout: 15000 });
  await addOne.click();
  await expect(page.getByText(/Total Assets Selected: [1-9]/)).toBeVisible({ timeout: 10000 });

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'POST' &&
      /\/asset-groups\/?$/.test(new URL(response.url()).pathname)
  );
  await page.getByRole('button', { name: 'Save' }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok(), `Asset group create failed: ${createResponse.status()}`).toBeTruthy();
  await page
    .getByText(/Asset group created successfully/i)
    .first()
    .waitFor({ state: 'visible', timeout: 15000 })
    .catch(() => {});
  return true;
}
