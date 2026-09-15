/**
 * Store-level online/offline decision tests for maintenance list.
 * Run: npx vite-node scripts/test-maintenance-offline-store.mjs
 */
import 'fake-indexeddb/auto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error(`FAIL: ${msg}`);
    throw new Error(msg);
  }
  passed += 1;
  console.log(`PASS: ${msg}`);
}

// --- mocks before store import ---
const apiState = {
  listImpl: async () => [],
  detailImpl: async () => null,
  docTypesImpl: async () => [],
};

const axiosMock = {
  default: {
    get: async (url, config) => {
      if (String(url).includes('/maintenance-schedules/all')) {
        const data = await apiState.listImpl(config);
        return { data };
      }
      if (String(url).match(/\/maintenance-schedules\/[^/]+$/)) {
        const data = await apiState.detailImpl(url, config);
        return { data: { success: true, data } };
      }
      if (String(url).includes('/doc-type-objects/')) {
        const data = await apiState.docTypesImpl();
        return { data: { success: true, data } };
      }
      throw new Error(`Unexpected GET ${url}`);
    },
  },
};

// vite-node resolves @/ alias etc; we monkey-patch after import via auth/sync stores.

async function main() {
  console.log('Running maintenance store offline tests…\n');

  // Dynamic imports of real modules
  const { useAuthStore } = await import('../src/store/useAuthStore.js');
  const { useInspectionSyncStore } = await import('../src/store/useInspectionSyncStore.js');
  const { upsertMaintSchedules, upsertMaintSchedule, getMaintSchedule } = await import(
    '../src/offline/maintenanceCache.js'
  );

  // Patch API module used by store — replace get on default export
  const API = (await import('../src/lib/axios.js')).default;
  const originalGet = API.get.bind(API);
  API.get = axiosMock.default.get;

  // Reset stores
  useAuthStore.setState({ token: 'test-token', user: { id: 'U1' } });
  useInspectionSyncStore.setState({
    status: 'online',
    fromCache: false,
    pendingCount: 0,
    lastError: null,
  });

  // Import store AFTER api patch
  const { useMaintenanceSupervisorStore } = await import(
    '../src/store/useMaintenanceSupervisorStore.js'
  );

  // Clear list state
  useMaintenanceSupervisorStore.setState({
    schedules: [],
    listLoading: true,
    fromCache: false,
    offlineAuthBlocked: false,
    detailsById: {},
  });

  // Seed IDB
  await upsertMaintSchedules([
    { ams_id: 'ams501', status: 'IN', asset_id: 'AST501', asset_type_name: 'Fan' },
  ]);
  await upsertMaintSchedule({
    ams_id: 'ams501',
    status: 'IN',
    technician_name: 'Alex',
    cost: '50',
  });

  let onlineFlag = false;
  globalThis.navigator = {
    get onLine() {
      return onlineFlag;
    },
  };

  // 1) Offline + token → IDB list
  onlineFlag = false;
  const offlineList = await useMaintenanceSupervisorStore
    .getState()
    .fetchSchedules({ revalidate: true });
  assert(
    offlineList.some((r) => r.ams_id === 'ams501'),
    'offline+token serves list from IndexedDB'
  );
  assert(
    useMaintenanceSupervisorStore.getState().fromCache === true,
    'fromCache true when offline list'
  );
  assert(
    useInspectionSyncStore.getState().status === 'offline',
    'sync store set to offline'
  );
  assert(
    useMaintenanceSupervisorStore.getState().offlineAuthBlocked === false,
    'offlineAuthBlocked false when token present'
  );

  // 2) Offline detail
  const offlineDetail = await useMaintenanceSupervisorStore
    .getState()
    .fetchScheduleDetail('ams501', { revalidate: true });
  assert(offlineDetail.technician_name === 'Alex', 'offline detail from IDB');
  assert(
    useInspectionSyncStore.getState().fromCache === true,
    'fromCache true for offline detail'
  );

  // 3) Offline missing detail throws
  let threw = false;
  try {
    await useMaintenanceSupervisorStore.getState().fetchScheduleDetail('ams-none');
  } catch (e) {
    threw = /not cached|Sign in/i.test(String(e.message));
  }
  assert(threw, 'offline missing detail throws helpful error');

  // 4) Offline + no token → blocked
  useAuthStore.setState({ token: null });
  await useMaintenanceSupervisorStore.getState().fetchSchedules({ revalidate: true });
  assert(
    useMaintenanceSupervisorStore.getState().offlineAuthBlocked === true,
    'offline without token sets offlineAuthBlocked'
  );

  // 5) Online success → prefetch path + clears fromCache
  useAuthStore.setState({ token: 'test-token' });
  onlineFlag = true;
  useInspectionSyncStore.getState().setOnline();
  apiState.listImpl = async () => [
    { ams_id: 'ams601', status: 'IP', asset_id: 'AST601', asset_type_name: 'Pump' },
    { ams_id: 'ams501', status: 'CO', asset_id: 'AST501', asset_type_name: 'Fan' },
  ];
  const onlineList = await useMaintenanceSupervisorStore
    .getState()
    .fetchSchedules({ revalidate: false });
  assert(onlineList.length === 2, 'online fetch returns API rows');
  assert(
    useMaintenanceSupervisorStore.getState().fromCache === false,
    'fromCache false after online fetch'
  );
  // IDB should now include ams601
  // give prefetch a tick
  await new Promise((r) => setTimeout(r, 50));
  const cached601 = await getMaintSchedule('ams601');
  assert(!!cached601, 'online fetch prefetches list into IndexedDB');

  // 6) Online API fail → fall back to IDB
  const { invalidateCache } = await import('../src/utils/apiCache.js');
  invalidateCache('maintenance-supervisor:');
  apiState.listImpl = async () => {
    throw new Error('network down');
  };
  const fallback = await useMaintenanceSupervisorStore
    .getState()
    .fetchSchedules({ revalidate: false });
  assert(
    fallback.some((r) => r.ams_id === 'ams601' || r.ams_id === 'ams501'),
    'online failure falls back to IndexedDB'
  );
  assert(
    useMaintenanceSupervisorStore.getState().fromCache === true,
    'fromCache true on API failure fallback'
  );

  // 7) Online detail success writes IDB
  apiState.detailImpl = async () => ({
    ams_id: 'ams601',
    status: 'IP',
    technician_name: 'Blake',
    hours_spent: '2',
  });
  const detail = await useMaintenanceSupervisorStore
    .getState()
    .fetchScheduleDetail('ams601', { force: true });
  assert(detail.technician_name === 'Blake', 'online detail returns API data');
  const idb601 = await getMaintSchedule('ams601');
  assert(idb601.technician_name === 'Blake', 'online detail upserted to IndexedDB');

  // 8) Online detail fail → IDB fallback
  apiState.detailImpl = async () => {
    throw new Error('detail 500');
  };
  const detailFb = await useMaintenanceSupervisorStore
    .getState()
    .fetchScheduleDetail('ams601', { force: true });
  assert(detailFb.technician_name === 'Blake', 'detail API fail falls back to IDB');

  // 9) format rows still works with store export
  const { formatMaintenanceScheduleRows } = await import(
    '../src/store/useMaintenanceSupervisorStore.js'
  );
  const formatted = formatMaintenanceScheduleRows(
    [{ ams_id: 'x', days_until_due: 1, hours_spent: '1', hours_required: '1' }],
    (k) => (k.includes('days') ? 'days' : k)
  );
  assert(formatted[0].variance === '0.00', 'format variance zero');

  // restore
  API.get = originalGet;

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
