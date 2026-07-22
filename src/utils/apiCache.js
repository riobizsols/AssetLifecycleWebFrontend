const DEFAULT_TTL_MS = 5 * 60 * 1000;

const memoryCache = new Map();

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

export function invalidateCache(prefix) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
}

export function clearCache() {
  memoryCache.clear();
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

/** Map API paths to cache key prefixes — avoid clearing the entire app cache on every mutation. */
function invalidationPrefixesForPath(path = '') {
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

  // Asset mutations can change group membership / counts on group screens.
  if (pathHasSegment(p, 'assets') && !pathHasSegment(p, 'asset-groups') && !pathHasSegment(p, 'asset-types')) {
    add('assets:', 'asset-groups:', 'group-assets:');
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
  ];

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

  for (const prefix of invalidationPrefixesForPath(path)) {
    invalidateCache(prefix);
  }
}

export async function fetchWithCache(key, fetcher, { ttlMs = DEFAULT_TTL_MS, force = false } = {}) {
  if (!force) {
    const cached = peekCache(key, ttlMs);
    if (cached != null) {
      return { data: cached, fromCache: true };
    }
  }

  const data = await fetcher();
  setCache(key, data);
  return { data, fromCache: false };
}

/**
 * Stale-while-revalidate: return cache immediately (if any), then fetch fresh data.
 * `onFresh` is called when the network response arrives (even if unchanged).
 */
export async function fetchWithRevalidate(key, fetcher, {
  ttlMs = DEFAULT_TTL_MS,
  onFresh,
} = {}) {
  const cached = peekCache(key, ttlMs);
  let fromCache = false;

  if (cached != null) {
    fromCache = true;
  }

  const refresh = async () => {
    const data = await fetcher();
    setCache(key, data);
    onFresh?.(data, { fromCache: false });
    return data;
  };

  if (cached != null) {
    refresh().catch((err) => {
      console.error(`[apiCache] revalidate failed for ${key}:`, err);
    });
    return { data: cached, fromCache: true };
  }

  const data = await refresh();
  return { data, fromCache };
}
