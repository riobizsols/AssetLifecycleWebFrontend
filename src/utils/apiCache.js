// Simple in-memory cache with TTL, shared across screens.
// This prevents refetch + loading flash when revisiting routes.

const store = new Map();

export function getCache(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function setCache(key, value, ttlMs = 0) {
  const expiresAt = ttlMs ? Date.now() + ttlMs : null;
  store.set(key, { value, expiresAt });
  return value;
}

export async function fetchWithCache(key, fetcher, { ttlMs = 0 } = {}) {
  const cached = getCache(key);
  if (cached !== null) return { data: cached, fromCache: true };
  const fresh = await fetcher();
  setCache(key, fresh, ttlMs);
  return { data: fresh, fromCache: false };
}

export function clearCache(prefix = "") {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const k of store.keys()) {
    if (String(k).startsWith(prefix)) store.delete(k);
  }
}

