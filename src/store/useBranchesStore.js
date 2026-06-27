import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'branches:list';

export function formatBranchRows(raw) {
  return (raw || []).map((item) => ({
    ...item,
    int_status: item.int_status === 1 ? 'Active' : 'Inactive',
    created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
    changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
  }));
}

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useBranchesStore = create((set, get) => ({
  branches: cachedList || [],
  listLoading: !cachedList,

  fetchBranches: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ branches: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/branches');
      return formatBranchRows(Array.isArray(res.data) ? res.data : []);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().branches.length > 0) set({ listLoading: false });
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

  prefetchBranches: () => {
    get().fetchBranches({ revalidate: true }).catch(() => {});
  },

  invalidateBranchesCache: () => {
    invalidateCache('branches:');
    set({ branches: [] });
  },
}));
