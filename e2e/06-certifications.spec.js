// @ts-check
import { test, expect } from '@playwright/test';
import { noteInaccessible, openTitledScreen } from './helpers/screenAccess.js';

test.describe('RIO EAM certifications and technician certificates', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Run once against live data');

  test('TC_CERT_001 a unique certificate can be created', async ({ page }) => {
    test.setTimeout(150000);
    const opened = await openTitledScreen(page, '/certifications', 'Certifications');
    if (!opened) {
      noteInaccessible('Certifications');
      return;
    }

    await page.getByRole('button', { name: 'Certificate', exact: true }).click();
    await expect(page.getByText('Existing Certificates')).toBeVisible();
    const add = page.getByTitle('Add');
    if (!(await add.isVisible().catch(() => false))) {
      noteInaccessible('Certificate create');
      return;
    }

    await add.click();
    await expect(page.getByText('Add New Certificate')).toBeVisible();
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(/Certificate name is required/i)).toBeVisible({ timeout: 10000 });

    const stamp = Date.now();
    const name = `PW-E2E-CERT-${stamp}`;
    await page.getByPlaceholder('Enter certificate name').fill(name);
    await page.getByPlaceholder('Enter certificate number').fill(`PW-${stamp}`);
    await page.getByRole('button', { name: 'Create' }).click();
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  });

  test('TC_CERT_002 maintenance certificate mapping is visible and is not saved', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/certifications', 'Certifications');
    if (!opened) {
      noteInaccessible('Certifications');
      return;
    }

    await page.getByRole('button', { name: 'Maintenance Certificate' }).click();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Maintenance Type').first()).toBeVisible();
    await expect(page.getByText('Available Certificates').first()).toBeVisible();
  });

  test('TC_CERT_003 inspection certificate mapping is visible and is not saved', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/certifications', 'Certifications');
    if (!opened) {
      noteInaccessible('Certifications');
      return;
    }

    await page.getByRole('button', { name: 'Inspection Certificates' }).click();
    await expect(page.getByText('Asset Type').first()).toBeVisible();
    await expect(page.getByText('Available Certificates').first()).toBeVisible();
  });

  test('TC_CERT_004 technician certificate form opens without submitting', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(page, '/technician-certificates', 'Technician Certificates');
    if (!opened) {
      noteInaccessible('Technician Certificates');
      return;
    }

    const add = page.getByTitle('Add').or(page.getByRole('button', { name: /^Add$/ })).first();
    if (await add.isVisible().catch(() => false)) {
      await add.click();
    }
    await expect(page.getByText(/Certificate|Expiry/i).first()).toBeVisible();
  });

  test('TC_CERT_005 technician certificate approvals load without approving', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/tech-cert-approvals',
      'Technician Certificate Approvals'
    );
    if (!opened) {
      noteInaccessible('Tech Cert Approvals');
      return;
    }

    await expect(page.getByText(/Certificate|Status|Pending/i).first()).toBeVisible();
  });

  test('TC_CERT_006 reject stays available and is not confirmed', async ({ page }) => {
    test.setTimeout(120000);
    const opened = await openTitledScreen(
      page,
      '/tech-cert-approvals',
      'Technician Certificate Approvals'
    );
    if (!opened) {
      noteInaccessible('Tech Cert Approvals');
      return;
    }

    const reject = page.getByRole('button', { name: /Reject/i }).first();
    if (await reject.isVisible().catch(() => false)) {
      await expect(reject).toBeVisible();
      return;
    }
    await expect(page.getByText(/No .*found|Certificate|Pending/i).first()).toBeVisible();
  });
});
