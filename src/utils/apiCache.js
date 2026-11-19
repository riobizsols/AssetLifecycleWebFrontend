const DEFAULT_TTL_MS = 5 * 60 * 1000;

const memoryCache = new Map();
/** Per-key serial so an older in-flight fetch cannot overwrite a newer one after delete/invalidate. */
const keySerial = new Map();
/** Monotonic epoch bumped on every invalidation — screens refetch when their prefix is hit. */
let cacheEpoch = 0;
const invalidationListeners = new Set();

function bumpKeySerial(key) {
  const next = (keySerial.get(key) || 0) + 1;
  keySerial.set(key, next);
  return next;
}

function bumpKeySerialByPrefix(prefix) {
  for (const key of keySerial.keys()) {
    if (key.startsWith(prefix)) bumpKeySerial(key);
  }
}

function notifyInvalidation(prefixes = []) {
  cacheEpoch += 1;
  const payload = { epoch: cacheEpoch, prefixes: [...prefixes] };
  invalidationListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (err) {
      console.error('[apiCache] invalidation listener failed:', err);
    }
  });
}

/** Subscribe to cache invalidation events (prefix-scoped). Returns unsubscribe. */
export function subscribeCacheInvalidation(listener) {
  if (typeof listener !== 'function') return () => {};
  invalidationListeners.add(listener);
  return () => invalidationListeners.delete(listener);
}

export function getCacheEpoch() {
  return cacheEpoch;
}

function normalizePath(url = '') {
  if (!url) return '';
  const clean = String(url).split('?')[0];
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    try {
      const parsed = new URL(clean);
      return parsed.pathname || '';
    } catch {
      return clean;
    }
  }
  return clean;
}

export function buildCacheKey(parts) {
  return parts.filter((p) => p != null && p !== '').join(':');
}

export function peekCache(key, ttlMs = DEFAULT_TTL_MS) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts >= ttlMs) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

/** Read cache in `{ data }` shape expected by some report screens */
export function getCache(key, ttlMs = DEFAULT_TTL_MS) {
  const payload = peekCache(key, ttlMs);
  if (payload == null) return null;
  if (Array.isArray(payload)) return { data: payload };
  if (payload && Array.isArray(payload.data)) return { data: payload.data };
  return { data: payload };
}

export function setCache(key, data) {
  memoryCache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(prefix, { silent = false } = {}) {
  for (const key of [...memoryCache.keys()]) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  // Invalidate in-flight writers for matching keys even if the entry was already cleared.
  bumpKeySerialByPrefix(prefix);
  if (!silent) notifyInvalidation([prefix]);
}

export function clearCache() {
  memoryCache.clear();
  keySerial.clear();
  notifyInvalidation(['*']);
}

/** Suffix for list cache keys so ACM org/branch/dept changes don't reuse stale data. */
export function acmCacheSegment(acmState) {
  if (!acmState) return 'acm:*:*:*';
  return `acm:${acmState.appliedOrgId || '*'}:${acmState.appliedBranchId || '*'}:${acmState.appliedDeptId || '*'}`;
}

/** True when `segment` is a full path segment (avoids `/assets` matching `/asset-groups`). */
function pathHasSegment(path = '', segment = '') {
  const parts = String(path)
    .toLowerCase()
    .split('/')
    .filter(Boolean)
    .filter((p) => p !== 'api');
  return parts.includes(String(segment).toLowerCase());
}

/** Map API paths to cache key prefixes — avoid clearing the entire app cache on every mutation.
 * Exported for automated regression tests of stale-data prefix rules.
 */
export function invalidationPrefixesForPath(path = '') {
  const p = String(path).toLowerCase();
  const prefixes = new Set();

  const add = (...keys) => keys.forEach((k) => prefixes.add(k));

  // Group asset mutations must also refresh assets lists (membership changes).
  if (
    pathHasSegment(p, 'asset-groups') ||
    pathHasSegment(p, 'group-assets') ||
    pathHasSegment(p, 'asset-group-docs')
  ) {
    add('asset-groups:', 'group-assets:', 'assets:');
  }

  // Dept ↔ asset-type mapping feeds department assignment asset-type dropdown
  if (pathHasSegment(p, 'dept-assets')) {
    add('dept-assets:', 'assignment:');
  }

  // Asset mutations can change group membership / counts on group screens + reports/dashboard.
  if (pathHasSegment(p, 'assets') && !pathHasSegment(p, 'asset-groups') && !pathHasSegment(p, 'asset-types')) {
    add('assets:', 'asset-groups:', 'group-assets:', 'dashboard:', 'report:');
  }

  // Maintenance frequency / details mutations must refresh the config screen bundle.
  if (
    pathHasSegment(p, 'maintenance-frequencies') ||
    pathHasSegment(p, 'maintenance-details') ||
    pathHasSegment(p, 'maint-types')
  ) {
    add('maintenance-config:', 'maintenance');
  }

  // Maintenance / approval / schedule mutations also drive Work Orders + dashboard.
  if (
    pathHasSegment(p, 'maintenance-schedules') ||
    pathHasSegment(p, 'approval-detail') ||
    pathHasSegment(p, 'maintenance-approvals') ||
    pathHasSegment(p, 'work-orders') ||
    pathHasSegment(p, 'workorders')
  ) {
    add(
      'work-orders:',
      'maintenance',
      'maintenance-approval:',
      'maintenance-supervisor:',
      'dashboard:',
      'report:',
    );
  }

  // Scrap asset mutations change asset status and scrap hub summaries.
  if (
    pathHasSegment(p, 'scrap-assets') ||
    pathHasSegment(p, 'asset-scrap') ||
    pathHasSegment(p, 'scrap-maintenance')
  ) {
    add('scrap', 'assets:scrap:', 'assets:', 'dashboard:', 'work-orders:', 'report:');
  }

  const rules = [
    { segment: 'branches', prefix: 'branches:' },
    { segment: 'departments', prefix: 'departments:' },
    { segment: 'vendors', prefix: 'vendors:' },
    { segment: 'users', prefix: 'users:' },
    { segment: 'asset-types', prefix: 'asset-types:' },
    { segment: 'properties', prefix: 'properties:' },
    { match: '/job-role-navigation', prefix: 'app:navigation:' },
    { match: '/navigation/', prefix: 'app:navigation:' },
    { segment: 'job-roles', prefix: 'job-roles:' },
    { segment: 'user-job-roles', prefix: 'user-roles:' },
    { segment: 'text-messages', prefix: 'text-messages:' },
    { segment: 'certifications', prefix: 'certifications:' },
    { segment: 'assignment', prefix: 'assignment:' },
    { segment: 'dashboard', prefix: 'dashboard:' },
    { segment: 'scrap', prefix: 'scrap' },
    { segment: 'maintenance', prefix: 'maintenance' },
    { segment: 'inspection', prefix: 'inspection' },
    { segment: 'work-orders', prefix: 'work-orders:' },
  ];

  // Technician certificate upload/approval lists use dedicated store keys.
  if (
    pathHasSegment(p, 'employee-tech-certificates') ||
    pathHasSegment(p, 'tech-certificates')
  ) {
    add('technician-certs:', 'tech-cert-approvals:', 'certifications:');
  }

  for (const rule of rules) {
    if (rule.segment && pathHasSegment(p, rule.segment)) prefixes.add(rule.prefix);
    else if (rule.match && p.includes(rule.match)) prefixes.add(rule.prefix);
  }

  if (prefixes.size === 0) {
    const parts = p.split('/').filter(Boolean).filter((seg) => seg !== 'api');
    const segment = parts[0];
    if (segment) prefixes.add(`${segment}:`);
  }

  return [...prefixes];
}

/**
 * Invalidate caches related to a successful mutation request.
 * Scoped invalidation keeps in-progress screens (e.g. job-role nav builder) from losing local state.
 */
export function invalidateOnMutation({ method, url } = {}) {
  const verb = String(method || '').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(verb)) return;

  const path = normalizePath(url);
  if (path.includes('/auth/refresh')) return;

  const prefixes = invalidationPrefixesForPath(path);
  // Delete keys once, then notify once with the full prefix set (avoid N listener storms).
  for (const prefix of prefixes) {
    for (const key of [...memoryCache.keys()]) {
      if (key.startsWith(prefix)) memoryCache.delete(key);
    }
    bumpKeySerialByPrefix(prefix);
  }
  if (prefixes.length) notifyInvalidation(prefixes);
}

export async function fetchWithCache(key, fetcher, { ttlMs = DEFAULT_TTL_MS, force = false } = {}) {
  if (!force) {
    const cached = peekCache(key, ttlMs);
    if (cached != null) {
      return { data: cached, fromCache: true, superseded: false };
    }
  }

  const serial = bumpKeySerial(key);
  const data = await fetcher();
  if (keySerial.get(key) !== serial) {
    return { data, fromCache: false, superseded: true };
  }
  setCache(key, data);
  return { data, fromCache: false, superseded: false };
}

/**
 * Stale-while-revalidate: return cache immediately (if any), then fetch fresh data.
 * `onFresh` is called when the network response arrives (even if unchanged).
 * Older in-flight refreshes are ignored after a newer fetch or cache invalidation.
 */
export async function fetchWithRevalidate(key, fetcher, {
  ttlMs = DEFAULT_TTL_MS,
  onFresh,
} = {}) {
  const cached = peekCache(key, ttlMs);
  const fromCache = cached != null;
  const serial = bumpKeySerial(key);

  const refresh = async () => {
    const data = await fetcher();
    if (keySerial.get(key) !== serial) {
      return { data, superseded: true };
    }
    setCache(key, data);
    onFresh?.(data, { fromCache: false });
    return { data, superseded: false };
  };

  if (fromCache) {
    refresh().catch((err) => {
      console.error(`[apiCache] revalidate failed for ${key}:`, err);
    });
    return { data: cached, fromCache: true, superseded: false };
  }

  const { data, superseded } = await refresh();
  return { data, fromCache: false, superseded };
}
