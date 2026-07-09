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

/**
 * Global cache invalidation for successful mutation requests.
 * This prevents stale data when a screen forgets local invalidateCache calls.
 */
export function invalidateOnMutation({ method, url } = {}) {
  const verb = String(method || '').toLowerCase();
  if (!['post', 'put', 'patch', 'delete'].includes(verb)) return;

  const path = normalizePath(url);
  // Skip token-refresh calls to avoid unnecessary cache churn.
  if (path.includes('/auth/refresh')) return;

  clearCache();
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
