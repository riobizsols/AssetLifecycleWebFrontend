// @ts-check
import { expect } from '@playwright/test';
import { BASE } from './baseUrl.js';

/** Login against remote DB often takes 30s+ (tenant resolve + nav sync). */
const LOGIN_RESPONSE_TIMEOUT_MS = 120_000;

export function getRioCredentials() {
  const email = process.env.RIO_EMAIL;
  const password = process.env.RIO_PASSWORD;

  if (!email || !password) {
    throw new Error('RIO_EMAIL and RIO_PASSWORD must be set');
  }

  return { email, password };
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function loginToRioEam(page) {
  const { email, password } = getRioCredentials();

  await page.goto(`${BASE}/login`, {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });

  const welcome = page.getByRole('heading', { name: 'Welcome back!' });
  const badGateway = page.getByRole('heading', { name: '502 Bad Gateway' });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await welcome.isVisible().catch(() => false)) break;
    if (await badGateway.isVisible().catch(() => false) || attempt < 2) {
      await page.waitForTimeout(2000 * (attempt + 1));
      await page.goto(`${BASE}/login`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
    }
  }

  await expect(welcome).toBeVisible({ timeout: 15000 });

  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);

  let loginResponse;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const loginResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/auth/login') &&
        response.request().method() === 'POST',
      { timeout: LOGIN_RESPONSE_TIMEOUT_MS }
    );

    await page.getByRole('button', { name: 'Login' }).click();

    try {
      loginResponse = await loginResponsePromise;
    } catch (err) {
      if (attempt === 3) throw err;
      await page.waitForTimeout(2000);
      await page.locator('#password').fill(password);
      continue;
    }

    if (loginResponse.ok()) break;

    const rateLimited = await page
      .getByText(/Too many login attempts/i)
      .isVisible()
      .catch(() => false);
    if (!rateLimited || attempt === 3) break;

    await page.waitForTimeout(15000 * (attempt + 1));
    await page.locator('#password').fill(password);
  }

  expect(loginResponse?.ok()).toBeTruthy();

  await page.waitForURL(
    (url) => {
      const path = new URL(url).pathname;
      return /\/(dashboard|change-password|adminsettings)(\/|$)/.test(path);
    },
    { timeout: 60000 }
  );

  await expect(page.locator('#email')).toHaveCount(0, { timeout: 15000 });
}
