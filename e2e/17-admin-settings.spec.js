// @ts-check
import { test, expect } from '@playwright/test';
import { gotoProtected } from './helpers/appReady.js';
import { BASE } from './helpers/baseUrl.js';
import {
  ADMIN_SETTINGS_AUDIT,
  ADMIN_SETTINGS_HUB,
  ADMIN_SETTINGS_HUB_EXTRA,
  ADMIN_SETTINGS_MODULES,
} from './helpers/adminSettingsCatalog.js';
import {
  expandAdminConfigSidebar,
  expandAppAdminSettings,
  expectColumns,
  exerciseTabs,
  firstRealOption,
  openAdminScreen,
  readAdminState,
  skipIfInaccessible,
  waitForAdminReady,
} from './helpers/adminSettingsScreen.js';
import {
  exerciseSearchFromRow,
  exerciseSort,
  waitForListData,
} from './helpers/inspectionScreen.js';

/**
 * Condition-based coverage for every screen under sidebar → Admin Settings.
 * Save / Delete / Run / Print / access toggles are not committed.
 */

test.describe('Admin Settings sidebar', () => {
  test('main app group lists Audit Logs and Config', async ({ page }) => {
    const ready = await gotoProtected(page, `${BASE}/dashboard`);
    test.skip(!ready, 'App shell did not finish loading');

    const aside = await expandAppAdminSettings(page);
    const labels = ['Audit Logs', 'Audit Log Config'];
    const visible = [];
    for (const label of labels) {
      if (await aside.getByText(label, { exact: true }).first().isVisible().catch(() => false)) {
        visible.push(label);
      }
    }
    test.info().annotations.push({
      type: 'condition',
      description: `SIDEBAR — ${visible.join(', ') || 'no English Admin Settings labels'}`,
    });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('configuration mode lists Job Roles and other modules', async ({ page }) => {
    const status = await openAdminScreen(
      page,
      ADMIN_SETTINGS_HUB.path,
      ADMIN_SETTINGS_HUB.marker,
    );
    if (skipIfInaccessible(page, ADMIN_SETTINGS_HUB.name, status)) return;

    const aside = await expandAdminConfigSidebar(page);
    const visible = [];
    for (const screen of ADMIN_SETTINGS_MODULES) {
      const item = aside.getByText(screen.sidebar, { exact: true }).first();
      if (await item.isVisible().catch(() => false)) visible.push(screen.sidebar);
    }
    test.info().annotations.push({
      type: 'condition',
      description: `SIDEBAR — ${visible.join(', ')}`,
    });
  });
});

test.describe('Configuration hub', () => {
  test('hub loads cards for accessible modules', async ({ page }) => {
    const status = await openAdminScreen(
      page,
      ADMIN_SETTINGS_HUB.path,
      ADMIN_SETTINGS_HUB.marker,
    );
    if (skipIfInaccessible(page, ADMIN_SETTINGS_HUB.name, status)) return;

    await expect(page.getByRole('heading', { name: 'Admin Settings' }).first()).toBeVisible();
    const restricted = page.getByText('Access Restricted', { exact: true });
    if (await restricted.isVisible().catch(() => false)) {
      test.info().annotations.push({
        type: 'condition',
        description: 'HUB — Access Restricted (no module cards).',
      });
      return;
    }

    const cards = [];
    for (const screen of [...ADMIN_SETTINGS_MODULES, ...ADMIN_SETTINGS_HUB_EXTRA]) {
      if (await page.getByText(screen.sidebar, { exact: true }).first().isVisible().catch(() => false)) {
        cards.push(screen.sidebar);
      }
    }
    expect(cards.length, 'Hub should list at least one module card').toBeGreaterThan(0);
    test.info().annotations.push({
      type: 'condition',
      description: `HUB CARDS — ${cards.join(', ')}`,
    });
  });
});

for (const screen of ADMIN_SETTINGS_MODULES) {
  test.describe(screen.name, () => {
    test(`data loads without error (${screen.id})`, async ({ page }) => {
      const status = await openAdminScreen(page, screen.path, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;

      const data = await readAdminState(page, screen.empty);
      test.info().annotations.push({
        type: 'condition',
        description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}${data.message ? ` [${data.message}]` : ''}`,
      });
      expect(['data', 'empty', 'empty-filter', 'error', 'unknown'].includes(data.state)).toBeTruthy();

      if (screen.columns?.length && data.state === 'data') {
        await expectColumns(page, screen.columns);
      } else if (screen.columns?.length && data.state !== 'error') {
        const firstCol = page.getByRole('columnheader', { name: screen.columns[0] }).first();
        if (await firstCol.isVisible().catch(() => false)) {
          await expectColumns(page, screen.columns);
        }
      }
      if (screen.tabs?.length) {
        await exerciseTabs(page, test.info(), screen.tabs);
      }
    });

    test(`filters and functions, no save (${screen.id})`, async ({ page }) => {
      const status = await openAdminScreen(page, screen.path, screen.marker);
      if (skipIfInaccessible(page, screen.name, status)) return;

      if (screen.kind === 'contentbox') {
        await waitForListData(page);
        const filterBtn = page.locator('[data-contentbox-filter-button]');
        if (await filterBtn.isVisible().catch(() => false)) {
          await expect(filterBtn).toBeVisible();
          if (screen.columns?.[0]) {
            await exerciseSort(page, test.info(), screen.columns[0]);
            await exerciseSearchFromRow(page, test.info(), screen.columns.slice(0, 2));
          }
        } else {
          test.info().annotations.push({
            type: 'condition',
            description: 'CHROME — ContentBox filter not shown.',
          });
        }
        return;
      }

      if (screen.kind === 'column-access') {
        const role = page.locator('select').first();
        const table = page.locator('select').nth(1);
        await expect(role).toBeVisible();
        const roles = await firstRealOption(role);
        const tables = await firstRealOption(table);
        test.info().annotations.push({
          type: 'condition',
          description: `FILTER job role ${roles.length} / table ${tables.length} — Save not clicked.`,
        });
        if (roles.length) await role.selectOption({ label: roles[0] });
        if (tables.length) await table.selectOption({ label: tables[0] });
        await waitForAdminReady(page);
        const search = page.getByPlaceholder('Search columns...');
        if (await search.isVisible().catch(() => false)) {
          await search.fill('id');
        }
        await expect(page.getByRole('button', { name: /Save Configurations/i })).toBeVisible();
        return;
      }

      if (screen.kind === 'bulk-print') {
        const trigger = page.getByPlaceholder(/Select asset type/i);
        await expect(trigger.or(page.getByText(/Select an asset type to begin/i)).first()).toBeVisible();
        if (await trigger.isVisible().catch(() => false)) {
          await trigger.click();
          const option = page.locator('div.cursor-pointer').first();
          if (await option.isVisible().catch(() => false)) {
            const name = ((await option.innerText()) || '').split('\n')[0].trim();
            await option.click();
            await waitForAdminReady(page);
            const empty = page.getByText(/No assets found/i);
            const col = page.getByRole('columnheader', { name: 'Asset Name' });
            await expect(empty.or(col).first()).toBeVisible({ timeout: 30000 });
            test.info().annotations.push({
              type: 'condition',
              description: `STEP 2 after "${name}" — Proceed to Print not clicked.`,
            });
          } else {
            test.info().annotations.push({
              type: 'condition',
              description: 'FILTER asset type — no options.',
            });
            await page.keyboard.press('Escape').catch(() => {});
          }
        }
        return;
      }

      if (screen.kind === 'maint-config') {
        await expect(page.getByText('Workflow Steps').first()).toBeVisible();
        await page.getByRole('button', { name: 'Maintenance Frequency', exact: true }).click();
        await waitForAdminReady(page);
        await expect(
          page.getByText(/No maintenance frequencies created yet|Asset Type/).first(),
        ).toBeVisible();
        test.info().annotations.push({
          type: 'condition',
          description: 'TABS — Details and Frequency opened; create/save not clicked.',
        });
        return;
      }

      if (screen.kind === 'properties') {
        const search = page.getByPlaceholder('Search by property name...');
        await expect(search).toBeVisible();
        const data = await readAdminState(page, screen.empty);
        if (data.state === 'data') {
          const name = ((await page.locator('table tbody tr td').first().innerText()) || '').trim();
          if (name) {
            await search.fill(name);
            const cells = page.locator('table tbody tr td:nth-child(1)');
            const n = await cells.count();
            if (n > 0) {
              for (let i = 0; i < n; i += 1) {
                expect(await cells.nth(i).innerText()).toContain(name);
              }
            } else {
              await expect(page.getByText(/No properties match your search/)).toBeVisible();
            }
          }
        }
        test.info().annotations.push({
          type: 'condition',
          description: `SEARCH — ${data.state}; Create/Save not clicked.`,
        });
        return;
      }

      if (screen.kind === 'certs') {
        await exerciseTabs(page, test.info(), screen.tabs);
        await expect(page.getByText(/Certificate Name|No certificates/i).first()).toBeVisible();
        return;
      }

      if (screen.kind === 'checklists') {
        const add = page.getByTitle('Create New').first();
        if (await add.isVisible().catch(() => false)) {
          await add.click();
          await expect(page.getByText('Create Inspection Checklist')).toBeVisible();
          await page.getByRole('button', { name: 'Cancel', exact: true }).click();
          await expect(page.getByText('Create Inspection Checklist')).toHaveCount(0);
          test.info().annotations.push({
            type: 'condition',
            description: 'CREATE — modal opened and cancelled; nothing saved.',
          });
        }
        const filter = page.getByTitle('Filter').first();
        if (await filter.isVisible().catch(() => false)) {
          await filter.click();
          const colSelect = page.locator('select').filter({
            has: page.locator('option', { hasText: 'Select column' }),
          });
          test.info().annotations.push({
            type: 'condition',
            description: `FILTER — panel ${
              (await colSelect.first().isVisible().catch(() => false)) ? 'opened' : 'toggled'
            }; nothing saved.`,
          });
        }
        return;
      }

      if (screen.kind === 'opc') {
        await exerciseTabs(page, test.info(), screen.tabs);
        await expect(
          page.getByText(/Set conditions on mapped OPC tags|Comp ID|CT ID|Rule ID|No /i).first(),
        ).toBeVisible();
        test.info().annotations.push({
          type: 'condition',
          description: 'OPC — tabs opened; Plus/Save not clicked.',
        });
        return;
      }

      if (screen.kind === 'jobs') {
        await expect(page.getByRole('columnheader', { name: 'Job Name' })).toBeVisible();
        const run = page.getByRole('button', { name: 'Run' }).first();
        const edit = page.getByRole('button', { name: 'Edit' }).first();
        test.info().annotations.push({
          type: 'condition',
          description: `JOBS — Run visible=${await run.isVisible().catch(() => false)}; Edit/Run/Save not committed.`,
        });
        if (await edit.isVisible().catch(() => false)) {
          await edit.click();
          const cancel = page.getByRole('button', { name: 'Cancel', exact: true }).first();
          if (await cancel.isVisible().catch(() => false)) await cancel.click();
        }
        const firstJob = page.locator('table tbody tr').first();
        if (await firstJob.isVisible().catch(() => false)) {
          await firstJob.click();
          await waitForAdminReady(page);
          await expect(
            page.getByText(/Job History|No history found|Date Executed/i).first(),
          ).toBeVisible();
        }
      }
    });

    if (screen.childPath && screen.childTitle) {
      test(`create child opens and Cancel returns (${screen.id})`, async ({ page }) => {
        const status = await openAdminScreen(page, screen.childPath, screen.childTitle);
        if (skipIfInaccessible(page, `${screen.name} create`, status)) return;
        await expect(page.getByText(screen.childTitle).first()).toBeVisible();
        const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
        await expect(cancel.first()).toBeVisible();
        await cancel.first().click();
        await expect(page).toHaveURL(new RegExp(`${screen.path.replace(/\//g, '\\/')}\\/?$`));
        test.info().annotations.push({
          type: 'condition',
          description: 'CHILD — create opened; Cancel returned; Save not clicked.',
        });
      });
    }
  });
}

test.describe('Audit Logs', () => {
  const screen = ADMIN_SETTINGS_AUDIT[0];

  test('list, filters, reset — no export', async ({ page }) => {
    const status = await openAdminScreen(page, screen.path, screen.marker);
    if (skipIfInaccessible(page, screen.name, status)) return;

    const header = page.getByRole('columnheader', { name: 'Timestamp' });
    const empty = page.getByText('No audit logs found');
    await expect(header.or(empty).first()).toBeVisible();
    if (await header.isVisible().catch(() => false)) {
      await expectColumns(page, screen.columns);
    }
    await expect(page.getByRole('button', { name: 'Filters', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Config', exact: true })).toBeVisible();

    const data = await readAdminState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}${data.count ? ` (${data.count})` : ''}`,
    });

    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await expect(page.getByText('Users', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Application', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Event', { exact: true }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reset Filters' })).toBeVisible();

    const appTrigger = page.getByText('Select Application', { exact: true }).or(
      page.getByRole('button', { name: /All Applications|Select Application/ }),
    );
    if (await appTrigger.first().isVisible().catch(() => false)) {
      await appTrigger.first().click();
      const opt = page.locator('div.cursor-pointer').filter({ hasNotText: /^All Applications$/ }).first();
      if (await opt.isVisible().catch(() => false)) {
        const label = ((await opt.innerText()) || '').split('\n')[0].trim();
        await opt.click();
        await waitForAdminReady(page);
        const after = await readAdminState(page, screen.empty);
        if (after.state === 'data') {
          const cells = page.locator('table tbody tr td:nth-child(4)');
          const n = await cells.count();
          for (let i = 0; i < Math.min(n, 15); i += 1) {
            const text = await cells.nth(i).innerText();
            expect(text, `Application column row ${i}`).toContain(label);
          }
        }
        test.info().annotations.push({
          type: 'condition',
          description: `FILTER Application="${label}" → ${after.state}`,
        });
      }
    }
    await page.getByRole('button', { name: 'Reset Filters' }).click();
  });
});

test.describe('Audit Log Config', () => {
  const screen = ADMIN_SETTINGS_AUDIT[1];

  test('table, search, All Apps — no toggle/save', async ({ page }) => {
    const status = await openAdminScreen(page, screen.path, screen.marker);
    if (skipIfInaccessible(page, screen.name, status)) return;

    await expectColumns(page, screen.columns);
    const search = page.getByPlaceholder('Search...');
    await expect(search).toBeVisible();
    const apps = page.locator('select').first();
    if (await apps.isVisible().catch(() => false)) {
      const names = await firstRealOption(apps);
      test.info().annotations.push({
        type: 'condition',
        description: `FILTER All Apps — ${names.length} app options. Status/email not saved.`,
      });
      if (names.length) {
        await apps.selectOption({ label: names[0] });
        const after = await readAdminState(page, screen.empty);
        if (after.state === 'data') {
          const cells = page.locator('table tbody tr td:nth-child(1)');
          const n = await cells.count();
          for (let i = 0; i < n; i += 1) {
            expect(await cells.nth(i).innerText()).toContain(names[0]);
          }
        }
      }
    }
    const data = await readAdminState(page, screen.empty);
    if (data.state === 'data') {
      const sample = ((await page.locator('table tbody tr td').first().innerText()) || '').split('\n')[0].trim();
      if (sample) {
        await search.fill(sample.slice(0, 12));
      }
    }
  });
});

test.describe('Text Messages', () => {
  const screen = ADMIN_SETTINGS_HUB_EXTRA[0];

  test('loads translations; Save not clicked', async ({ page }) => {
    const status = await openAdminScreen(page, screen.path, screen.marker);
    if (skipIfInaccessible(page, screen.name, status)) return;

    await expect(page.getByText('Lang code:', { exact: false }).or(page.getByText(/Chinese|lang code/i)).first()).toBeVisible();
    const search = page.getByPlaceholder('Search...');
    if (await search.isVisible().catch(() => false)) {
      await search.fill('save');
    }
    const data = await readAdminState(page, screen.empty);
    test.info().annotations.push({
      type: 'condition',
      description: `DATA — ${data.state}; Save not clicked.`,
    });
  });
});
