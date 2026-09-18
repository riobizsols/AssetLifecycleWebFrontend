// @ts-check
import { test, expect } from '@playwright/test';
import { loginToRioEam } from './helpers/auth.js';

test('logs in to RIO EAM with environment credentials', async ({ page }) => {
  await loginToRioEam(page);

  await expect(
    page
      .getByText('Total Assets')
      .or(page.getByRole('heading', { name: 'Change Password' }))
  ).toBeVisible({ timeout: 15000 });
});
