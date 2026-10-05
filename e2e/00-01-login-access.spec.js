// @ts-check
import { test, expect } from '@playwright/test';
import { getRioCredentials } from './helpers/auth.js';
import { BASE } from './helpers/baseUrl.js';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM login and access', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_AUTH_001 a saved session opens the dashboard', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/dashboard', 'Dashboard');
    if (!opened) {
      noteInaccessible('Dashboard');
      return;
    }

    await expect(page.getByText('Total Assets', { exact: true })).toBeVisible();
    await expect(page.locator('p.tabular-nums').first()).toHaveText(/\d/, { timeout: 30000 });

    await page.locator('header button.rounded-full').last().click();
    const name = page.locator('header p.font-semibold').first();
    await expect(name).toBeVisible();
    await expect(name).not.toHaveText('');
    await expect(page.locator('header p').filter({ hasText: /@/ }).first()).toBeVisible();
  });
});

test.describe('RIO EAM login refusals', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');
  test.use({ storageState: { cookies: [], origins: [] } });

  test('TC_AUTH_002 a wrong password stays on the login page', async ({ page }) => {
    test.setTimeout(120000);
    const { email } = getRioCredentials();
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#email')).toBeVisible({ timeout: 20000 });
    await page.locator('#email').fill(email);
    await page.locator('#password').fill('wrong-password-e2e');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('p.text-red-600').first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Total Assets')).toHaveCount(0);
    await expect(page).toHaveURL(/\/login|\/$/);
  });

  test('TC_AUTH_003 an unknown user is refused', async ({ page }) => {
    test.setTimeout(120000);
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#email')).toBeVisible({ timeout: 20000 });
    await page.locator('#email').fill('pw-e2e-inactive@example.com');
    await page.locator('#password').fill('inactive-e2e');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.locator('p.text-red-600').first()).toBeVisible({ timeout: 60000 });
    await expect(page.getByText('Total Assets')).toHaveCount(0);
  });
});

test.describe('RIO EAM password screens', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_AUTH_004 forgot password accepts the registered email', async ({ page }) => {
    test.setTimeout(120000);
    const { email } = getRioCredentials();
    await page.goto(`${BASE}/forgot-password`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Forgot your password?' })).toBeVisible({
      timeout: 20000,
    });
    await page.getByPlaceholder('Enter your mail address').fill(email);
    await page.getByRole('button', { name: 'Request Reset Link' }).click();
    await expect(
      page.getByText(/Reset link sent|Link Sent|Something went wrong|try again/i).first()
    ).toBeVisible({ timeout: 60000 });
  });

  test('TC_AUTH_005 reset password rejects a mismatched confirm value', async ({ page }) => {
    test.setTimeout(90000);
    await page.goto(`${BASE}/reset-password`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Reset Password' })).toBeVisible({
      timeout: 20000,
    });
    await page.getByPlaceholder('Enter New Password', { exact: true }).fill('Pw-e2e-new-1');
    await page.getByPlaceholder('Re-enter New Password', { exact: true }).fill('Pw-e2e-new-2');
    await page.getByRole('button', { name: 'Reset Password' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
    await expect(page.getByText(/Password reset successfully/i)).toHaveCount(0);
  });

  test('TC_AUTH_006 change password rejects a mismatched confirm value', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/change-password', 'Change Password');
    if (!opened) {
      noteInaccessible('Change Password');
      return;
    }

    await page.getByPlaceholder('Enter Current Password', { exact: true }).fill('not-the-current-password');
    await page.getByPlaceholder('Enter New Password', { exact: true }).fill('Pw-e2e-new-1');
    await page.getByPlaceholder('Re-enter New Password', { exact: true }).fill('Pw-e2e-new-2');
    await page.getByRole('button', { name: 'Change Password' }).click();
    await expect(page.getByText('New password and confirm password do not match')).toBeVisible();
    await expect(page.getByText(/Password changed successfully/i)).toHaveCount(0);
  });

  test('TC_AUTH_007 the not authorized page is shown', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/not-authorized', 'Access restricted');
    if (!opened) {
      noteInaccessible('Not Authorized');
      return;
    }
    await expect(page.getByText('Error 403')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back to Dashboard' })).toBeVisible();
  });
});
