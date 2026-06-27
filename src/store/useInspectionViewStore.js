import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const INSPECTION_VIEW_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'inspection-view:list';

export const useInspectionViewStore = create((set, get) => ({
  schedules: peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS) || [],
  listLoading: !peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS),

  fetchSchedules: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ schedules: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/inspection/list', {
        params: { context: 'INSPECTIONVIEW' },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    if (revalidate) {
      const cached = peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS);
      if (cached?.length) {
        apply(cached);
      } else if (get().schedules.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: INSPECTION_VIEW_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: INSPECTION_VIEW_TTL_MS,
    });
    apply(data);
    return data;
  },

  prefetchSchedules: () => {
    get().fetchSchedules({ revalidate: true }).catch(() => {});
  },

  invalidateInspectionViewCache: () => {
    invalidateCache('inspection-view:');
    set({ schedules: [] });
  },
}));
