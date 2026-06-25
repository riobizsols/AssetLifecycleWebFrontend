import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'inspection-checklists:list';
const TYPES_KEY = 'inspection-checklists:response-types';

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useInspectionChecklistsStore = create((set, get) => ({
  checklists: cachedList || [],
  responseTypes: peekCache(TYPES_KEY, TTL_MS) || [],
  listLoading: !cachedList,

  fetchChecklists: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      const data = [...(rows || [])].reverse();
      set({ checklists: data, listLoading: false });
      onFresh?.(data);
      return data;
    };

    const fetcher = async () => {
      const res = await API.get('/inspection-checklists');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().checklists.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (raw) => apply(raw),
      });
      return apply(data);
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) return apply(cached);
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    return apply(data);
  },

  fetchResponseTypes: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/inspection-checklists/response-types');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(TYPES_KEY, TTL_MS);
      if (cached) set({ responseTypes: cached });
      const { data } = await fetchWithRevalidate(TYPES_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ responseTypes: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(TYPES_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ responseTypes: data });
    return data;
  },

  loadPageData: async ({ revalidate = true } = {}) => {
    await get().fetchResponseTypes({ revalidate });
    return get().fetchChecklists({ revalidate });
  },

  prefetchInspectionChecklists: () => {
    get().loadPageData({ revalidate: true }).catch(() => {});
  },

  invalidateInspectionChecklistsCache: () => {
    invalidateCache('inspection-checklists:');
    set({ checklists: [], responseTypes: [] });
  },
}));
