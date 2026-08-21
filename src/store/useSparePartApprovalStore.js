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
  list: 'spare-part-approval:list',
  detail: (id) => buildCacheKey(['spare-part-approval', 'detail', id]),
};

export function formatSparePartApprovalRows(rows) {
  return (rows || []).map((item) => ({
    ...item,
    is_disabled: item.is_approved || item.status === 'IS' || item.status === 'IE',
  }));
}

const cachedList = peekCache(KEYS.list, TTL_MS);

export const useSparePartApprovalStore = create((set, get) => ({
  approvals: cachedList || [],
  listLoading: !cachedList,

  fetchApprovals: async ({ revalidate = false, force = false } = {}) => {
    const apply = (rows) => set({ approvals: rows, listLoading: false });

    const fetcher = async () => {
      const res = await API.get('/spare-parts/issue-approvals');
      return res.data?.data || [];
    };

    if (revalidate || force) {
      const cached = peekCache(KEYS.list, TTL_MS);
      if (cached?.length && !force) apply(cached);
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

  fetchApprovalDetail: async (siId, { force = false } = {}) => {
    if (!siId) return null;
    const cacheKey = KEYS.detail(siId);
    const fetcher = async () => {
      const res = await API.get(`/spare-parts/issue-approvals/${siId}`);
      if (!res.data?.success) {
        throw new Error(res.data?.error || 'Failed to load approval detail');
      }
      return res.data.data;
    };
    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: TTL_MS,
      force,
    });
    return data;
  },

  invalidateApprovalCache: () => {
    invalidateCache(KEYS.list);
    invalidateCache(buildCacheKey(['spare-part-approval', 'detail']));
  },
}));
