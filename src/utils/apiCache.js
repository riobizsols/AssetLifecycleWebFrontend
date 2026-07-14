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

/** Map API paths to cache key prefixes — avoid clearing the entire app cache on every mutation. */
function invalidationPrefixesForPath(path = '') {
  const p = String(path).toLowerCase();
  const prefixes = new Set();

  const rules = [
    { match: '/branches', prefix: 'branches:' },
    { match: '/departments', prefix: 'departments:' },
    { match: '/vendors', prefix: 'vendors:' },
    { match: '/users', prefix: 'users:' },
    { match: '/assets', prefix: 'assets:' },
    { match: '/asset-types', prefix: 'asset-types:' },
    { match: '/properties', prefix: 'properties:' },
    { match: '/job-role-navigation', prefix: 'app:navigation:' },
    { match: '/navigation/', prefix: 'app:navigation:' },
    { match: '/job-roles', prefix: 'job-roles:' },
    { match: '/user-job-roles', prefix: 'user-roles:' },
    { match: '/text-messages', prefix: 'text-messages:' },
    { match: '/certifications', prefix: 'certifications:' },
    { match: '/assignment', prefix: 'assignment:' },
    { match: '/dashboard', prefix: 'dashboard:' },
    { match: '/scrap', prefix: 'scrap' },
    { match: '/maintenance', prefix: 'maintenance' },
    { match: '/inspection', prefix: 'inspection' },
  ];

  for (const { match, prefix } of rules) {
    if (p.includes(match)) prefixes.add(prefix);
  }

  if (prefixes.size === 0) {
    const segment = p.split('/').filter(Boolean)[0];
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
