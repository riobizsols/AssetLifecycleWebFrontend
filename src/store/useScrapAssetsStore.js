import { create } from 'zustand';
import API from '../lib/axios';
import { fetchWithRevalidate, peekCache, setCache, invalidateCache, buildCacheKey } from '../utils/apiCache';

const SCRAP_SUMMARY_KEY = 'assets:scrap:summary';
const SCRAP_TTL_MS = 5 * 60 * 1000;
const SCRAP_CTX = { params: { context: 'SCRAPASSETS' } };

const NEARING_KEY = 'assets:scrap:nearing-expiry';
const EXPIRED_KEY = 'assets:scrap:expired';
const BY_TYPE_KEY = 'assets:scrap:by-type';

const emptyStats = { totalAssets: 0, nearingExpiry: 0, expired: 0 };

async function cachedListFetch(key, fetcher, { force = false, revalidate = false, onFresh } = {}) {
  const cached = !force ? peekCache(key, SCRAP_TTL_MS) : null;

  const apply = (data) => {
    onFresh?.(data);
    return data;
  };

  if (revalidate && !force && cached) {
    apply(cached);
    const { data } = await fetchWithRevalidate(key, fetcher, {
      ttlMs: SCRAP_TTL_MS,
      onFresh: apply,
    });
    return data;
  }

  if (cached && !force) {
    return cached;
  }

  const payload = await fetcher();
  setCache(key, payload);
  apply(payload);
  return payload;
}

export const useScrapAssetsStore = create((set, get) => ({
  stats: peekCache(SCRAP_SUMMARY_KEY, SCRAP_TTL_MS)?.stats || emptyStats,
  expiringByCategory: peekCache(SCRAP_SUMMARY_KEY, SCRAP_TTL_MS)?.expiringByCategory || [],
  loading: !peekCache(SCRAP_SUMMARY_KEY, SCRAP_TTL_MS),

  fetchSummary: async ({ force = false, revalidate = false, onFresh } = {}) => {
    const cached = !force ? peekCache(SCRAP_SUMMARY_KEY, SCRAP_TTL_MS) : null;

    const fetcher = async () => {
      const [totalRes, nearingRes, expiredRes, categoryRes] = await Promise.all([
        API.get('/assets/count', SCRAP_CTX),
        API.get('/assets/expiry/expiring_soon?days=30', SCRAP_CTX),
        API.get('/assets/expiry/expired', SCRAP_CTX),
        API.get('/assets/expiring-30-days-by-type', SCRAP_CTX),
      ]);

      return {
        stats: {
          totalAssets: totalRes.data?.success ? totalRes.data.count : 0,
          nearingExpiry: nearingRes.data?.count ?? 0,
          expired: expiredRes.data?.count ?? 0,
        },
        expiringByCategory: (categoryRes.data?.asset_types || []).map((type) => ({
          category: type.asset_type_name,
          count: parseInt(type.asset_count, 10),
          asset_type_id: type.asset_type_id,
        })),
      };
    };

    const applyPayload = (payload) => {
      set({
        stats: payload.stats,
        expiringByCategory: payload.expiringByCategory,
        loading: false,
      });
      onFresh?.(payload);
    };

    if (revalidate && !force && cached) {
      applyPayload(cached);
      try {
        await fetchWithRevalidate(SCRAP_SUMMARY_KEY, fetcher, {
          ttlMs: SCRAP_TTL_MS,
          onFresh: applyPayload,
        });
      } catch (error) {
        console.error('Error revalidating scrap assets summary:', error);
      }
      return cached;
    }

    if (cached && !force) {
      set({ ...cached, loading: false });
      return cached;
    }

    set({ loading: true });

    try {
      const payload = force
        ? await fetcher().then((data) => {
            setCache(SCRAP_SUMMARY_KEY, data);
            return data;
          })
        : (await fetchWithRevalidate(SCRAP_SUMMARY_KEY, fetcher, {
            ttlMs: SCRAP_TTL_MS,
            onFresh: applyPayload,
          })).data;

      applyPayload(payload);
      return payload;
    } catch (error) {
      console.error('Error fetching scrap assets summary:', error);
      set({ loading: false });
      throw error;
    }
  },

  fetchNearingExpiry: (opts = {}) =>
    cachedListFetch(
      NEARING_KEY,
      async () => {
        const res = await API.get('/assets/expiry/expiring_soon?days=30', SCRAP_CTX);
        return res.data?.assets || [];
      },
      opts,
    ),

  fetchExpired: (opts = {}) =>
    cachedListFetch(
      EXPIRED_KEY,
      async () => {
        const res = await API.get('/assets/expiry/expired', SCRAP_CTX);
        return res.data?.assets || [];
      },
      opts,
    ),

  fetchExpiringByCategory: (opts = {}) =>
    cachedListFetch(
      BY_TYPE_KEY,
      async () => {
        const res = await API.get('/assets/expiring-30-days-by-type', SCRAP_CTX);
        return res.data?.asset_types || [];
      },
      opts,
    ),

  fetchCategoryAssets: (assetTypeId, opts = {}) => {
    const key = buildCacheKey(['assets:scrap:category', assetTypeId]);
    return cachedListFetch(
      key,
      async () => {
        const res = await API.get('/assets/expiring-30-days-by-type', SCRAP_CTX);
        const types = res.data?.asset_types || [];
        const match = types.find((t) => String(t.asset_type_id) === String(assetTypeId));
        if (match?.assets?.length) return match.assets;
        const fallback = await API.get('/assets/expiry/expiring_soon?days=30', {
          params: { context: 'SCRAPASSETS', asset_type: assetTypeId },
        });
        return fallback.data?.assets || [];
      },
      opts,
    );
  },

  prefetchScrapAssets: () => {
    const s = get();
    Promise.all([
      s.fetchSummary({ revalidate: true }),
      s.fetchNearingExpiry({ revalidate: true }),
      s.fetchExpired({ revalidate: true }),
      s.fetchExpiringByCategory({ revalidate: true }),
    ]).catch(() => {});
  },

  invalidateSummary: () => invalidateCache('assets:scrap:'),
}));
