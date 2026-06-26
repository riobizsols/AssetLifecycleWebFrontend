import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const ASSETS_TTL_MS = 5 * 60 * 1000;
const ASSET_TYPES_KEY = 'assets:types';
const ASSETS_FULL_KEY = 'assets:all';

export const formatAssetRowDates = (item) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return {
    ...item,
    raw_purchased_on: item.purchased_on,
    raw_expiry_date: item.expiry_date,
    raw_warranty_period: item.warranty_period,
    raw_created_on: item.created_on,
    raw_changed_on: item.changed_on,
    purchased_on: formatDate(item.purchased_on),
    expiry_date: formatDate(item.expiry_date),
    warranty_period: formatDate(item.warranty_period),
    created_on: formatDate(item.created_on),
    changed_on: formatDate(item.changed_on),
    purchased_cost: item.purchased_cost ? `₹${item.purchased_cost.toLocaleString()}` : '',
  };
};

const parseAssetsResponse = (resData) => {
  const rows = Array.isArray(resData) ? resData : resData?.rows || [];
  const pagination = resData?.pagination || null;
  return {
    rows: rows.map(formatAssetRowDates),
    pagination,
  };
};

export const useAssetsStore = create((set, get) => ({
  currentPage: 1,
  filterValues: { columnFilters: [], fromDate: '', toDate: '' },
  isFullListMode: false,

  setCurrentPage: (page) => set({ currentPage: page }),
  setFilterValues: (updater) => set((state) => ({
    filterValues: typeof updater === 'function' ? updater(state.filterValues) : updater,
  })),

  invalidateAssetsCache: () => invalidateCache('assets:'),

  fetchAssetTypes: async ({ force = false, revalidate = false, onFresh } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/asset-types');
      return Array.isArray(res.data) ? res.data : res.data?.rows || [];
    };

    if (revalidate && !force) {
      const { data } = await fetchWithRevalidate(ASSET_TYPES_KEY, fetcher, {
        ttlMs: ASSETS_TTL_MS,
        onFresh,
      });
      return data;
    }

    const { data } = await fetchWithCache(ASSET_TYPES_KEY, fetcher, {
      ttlMs: ASSETS_TTL_MS,
      force,
    });
    return data;
  },

  fetchAssetsList: async ({
    page = 1,
    limit = 50,
    loadAll = false,
    force = false,
    revalidate = false,
    onFresh,
  } = {}) => {
    const cacheKey = loadAll
      ? ASSETS_FULL_KEY
      : buildCacheKey(['assets', 'page', page, 'limit', limit]);

    const fetcher = async () => {
      const params = loadAll ? { all: true } : { page, limit };
      const res = await API.get('/assets', { params });
      return parseAssetsResponse(res.data);
    };

    if (revalidate && !force) {
      const { data } = await fetchWithRevalidate(cacheKey, fetcher, {
        ttlMs: ASSETS_TTL_MS,
        onFresh,
      });
      return data;
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSETS_TTL_MS,
      force,
    });

    return data;
  },

  fetchExistingAssets: async ({ force = false, revalidate = false, onFresh } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/assets', { params: { all: true } });
      return Array.isArray(res.data) ? res.data : res.data?.rows || [];
    };

    if (revalidate && !force) {
      const { data } = await fetchWithRevalidate(ASSETS_FULL_KEY, fetcher, {
        ttlMs: ASSETS_TTL_MS,
        onFresh,
      });
      return data;
    }

    const { data } = await fetchWithCache(ASSETS_FULL_KEY, fetcher, {
      ttlMs: ASSETS_TTL_MS,
      force,
    });
    return data;
  },

  fetchAssetById: async (assetId, { force = false } = {}) => {
    if (!assetId) return null;
    const cacheKey = buildCacheKey(['assets', 'id', assetId]);

    const { data } = await fetchWithCache(
      cacheKey,
      async () => {
        const res = await API.get(`/assets/${assetId}`);
        const payload = res?.data;
        if (!payload) return null;
        if (Array.isArray(payload)) return payload[0] || null;
        if (payload.data) {
          if (Array.isArray(payload.data)) return payload.data[0] || null;
          return payload.data;
        }
        return payload;
      },
      { ttlMs: ASSETS_TTL_MS, force },
    );

    return data;
  },

  getCachedAssetsList: (page, limit, loadAll) => {
    const cacheKey = loadAll
      ? ASSETS_FULL_KEY
      : buildCacheKey(['assets', 'page', page, 'limit', limit]);
    return peekCache(cacheKey, ASSETS_TTL_MS);
  },

  getCachedAssetTypes: () => peekCache(ASSET_TYPES_KEY, ASSETS_TTL_MS),

  getCachedAssetById: (assetId) =>
    peekCache(buildCacheKey(['assets', 'id', assetId]), ASSETS_TTL_MS),
}));
