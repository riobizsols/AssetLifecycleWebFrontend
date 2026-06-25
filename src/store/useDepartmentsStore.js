import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'departments:list';

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useDepartmentsStore = create((set, get) => ({
  departments: cachedList || [],
  listLoading: !cachedList,

  fetchDepartments: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ departments: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/departments');
      return Array.isArray(res.data) ? res.data : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().departments.length > 0) set({ listLoading: false });
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

  prefetchDepartments: () => {
    get().fetchDepartments({ revalidate: true }).catch(() => {});
  },

  invalidateDepartmentsCache: () => {
    invalidateCache('departments:');
    set({ departments: [] });
  },
}));
