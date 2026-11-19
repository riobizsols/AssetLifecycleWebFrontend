/**
 * Automated regression checks for stale-data cache invalidation prefix rules.
 * Run: node scripts/test-stale-data-cache-prefixes.mjs
 */
import { invalidationPrefixesForPath } from '../src/utils/apiCache.js';

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function includesAll(actual, expected) {
  return expected.every((e) => actual.some((a) => a === e || a.startsWith(e)));
}

const cases = [
  {
    name: 'approval-detail clears work-orders + report',
    path: '/approval-detail/WFAMSD_1/approve',
    expect: ['work-orders:', 'dashboard:', 'report:'],
  },
  {
    name: 'maintenance-schedules clears work-orders',
    path: '/maintenance-schedules/AMS001',
    expect: ['work-orders:', 'maintenance'],
  },
  {
    name: 'assets delete clears assets + dashboard + report',
    path: '/assets/bulk-delete',
    expect: ['assets:', 'dashboard:', 'report:'],
  },
  {
    name: 'scrap-assets clears assets scrap + report',
    path: '/scrap-assets',
    expect: ['assets:', 'report:', 'dashboard:'],
  },
];

let failed = 0;
for (const c of cases) {
  const got = invalidationPrefixesForPath(c.path);
  try {
    assert(includesAll(got, c.expect), `${c.name}: expected ${c.expect.join(',')} in ${got.join(',')}`);
    console.log('PASS', c.name, '→', got.join(', '));
  } catch (e) {
    failed += 1;
    console.error('FAIL', e.message);
  }
}

if (failed) {
  console.error(`\n${failed} failing case(s)`);
  process.exit(1);
}
console.log('\nAll prefix regression checks passed');
