import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;

const KEYS = {
  list: 'spare-part-list:list',
  detail: (id) => buildCacheKey(['spare-part-list', 'detail', id]),
};

export function formatSparePartListRows(rows, t) {
  const spareStatusLabel = (code) => {
    if (code === 'IS') return t('sparePartList.issued');
    if (code === 'IE') return t('sparePartList.confirmedIssued');
    if (code === 'RQ') return t('sparePartList.pendingApproval');
    return '-';
  };

  return (rows || []).map((item) => ({
    ...item,
    status: item.spare_status || null,
    status_label: spareStatusLabel(item.spare_status),
  }));
}

const cachedList = peekCache(KEYS.list, TTL_MS);

export const useSparePartListStore = create((set, get) => ({
  items: cachedList || [],
  listLoading: !cachedList,
  detailsById: {},

  fetchList: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ items: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/spare-parts/maintenance-list');
      return res.data?.data || [];
    };

    if (revalidate) {
      const cached = peekCache(KEYS.list, TTL_MS);
      if (cached?.length) apply(cached);
      const { data } = await fetchWithRevalidate(KEYS.list, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(KEYS.list, fetcher, { ttlMs: TTL_MS });
    apply(data);
    return data;
  },

  fetchDetail: async (amsId, { revalidate = false, force = false } = {}) => {
    if (!amsId) return null;
    const cacheKey = KEYS.detail(amsId);

    const apply = (detail) => {
      set((state) => ({
        detailsById: { ...state.detailsById, [amsId]: detail },
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/spare-parts/maintenance-list/${amsId}`);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to load detail');
      }
      return res.data.data;
    };

    if (revalidate && !force) {
      const cached = peekCache(cacheKey, TTL_MS);
      if (cached) {
        apply(cached);
        fetchWithRevalidate(cacheKey, fetcher, { ttlMs: TTL_MS, onFresh: apply }).catch(() => {});
        return cached;
      }
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  invalidateListCache: () => invalidateCache(KEYS.list),

  getCachedDetail: (amsId) => get().detailsById[amsId] || peekCache(KEYS.detail(amsId), TTL_MS),
}));
