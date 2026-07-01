import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'breakdown-reason-codes:list';
const ASSET_TYPES_KEY = 'breakdown-reason-codes:asset-types';

function parseAssetTypes(res) {
  let rows = [];
  if (Array.isArray(res.data)) {
    rows = res.data;
  } else if (res.data?.data) {
    rows = res.data.data;
  }
  return rows.filter((at) => at.int_status === 1);
}

const cachedList = peekCache(LIST_KEY, TTL_MS);
const cachedAssetTypes = peekCache(ASSET_TYPES_KEY, TTL_MS);

export const useBreakdownReasonCodesStore = create((set, get) => ({
  reasonCodes: cachedList || [],
  assetTypes: cachedAssetTypes || [],
  listLoading: !cachedList,

  fetchReasonCodes: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ reasonCodes: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/breakdown-reason-codes');
      return res.data?.success ? res.data.data || [] : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().reasonCodes.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchAssetTypes: async ({ revalidate = false, force = false } = {}) => {
    const apply = (rows) => set({ assetTypes: rows });

    const fetcher = async () => {
      const res = await API.get('/asset-types');
      return parseAssetTypes(res);
    };

    if (revalidate && !force) {
      const cached = peekCache(ASSET_TYPES_KEY, TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(ASSET_TYPES_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(ASSET_TYPES_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    const { data } = await fetchWithCache(ASSET_TYPES_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  prefetchBreakdownReasonCodes: () => {
    const { fetchReasonCodes, fetchAssetTypes } = get();
    fetchReasonCodes({ revalidate: true }).catch(() => {});
    fetchAssetTypes({ revalidate: true }).catch(() => {});
  },

  invalidateBreakdownReasonCodesCache: () => {
    invalidateCache('breakdown-reason-codes:');
    set({ reasonCodes: [], assetTypes: [] });
  },
}));
