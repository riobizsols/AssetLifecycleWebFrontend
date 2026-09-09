import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';
import { getAllSchedules } from '../offline/inspectionCache';
import { prefetchInspectionList } from '../offline/prefetch';
import { useInspectionSyncStore } from './useInspectionSyncStore';
import { useAuthStore } from './useAuthStore';

const INSPECTION_VIEW_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'inspection-view:list';

async function loadFromIndexedDb() {
  try {
    const rows = await getAllSchedules();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('[inspection-offline] IndexedDB list read failed', err);
    return [];
  }
}

export const useInspectionViewStore = create((set, get) => ({
  schedules: peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS) || [],
  listLoading: !peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS),
  fromCache: false,
  offlineAuthBlocked: false,

  fetchSchedules: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows, { fromCache = false } = {}) => {
      set({
        schedules: rows,
        listLoading: false,
        fromCache,
        offlineAuthBlocked: false,
      });
      useInspectionSyncStore.getState().setFromCache(fromCache);
      onFresh?.(rows);
    };

    const token = useAuthStore.getState().token;
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    // Offline without token: clear message, no invented login
    if (!online && !token) {
      const cached = await loadFromIndexedDb();
      set({
        schedules: cached,
        listLoading: false,
        fromCache: cached.length > 0,
        offlineAuthBlocked: true,
      });
      useInspectionSyncStore.getState().setFromCache(cached.length > 0);
      useInspectionSyncStore.getState().setOffline();
      return cached;
    }

    // Offline with token: serve IndexedDB
    if (!online) {
      const cached = await loadFromIndexedDb();
      if (cached.length) {
        apply(cached, { fromCache: true });
      } else {
        set({ schedules: [], listLoading: false, fromCache: true });
        useInspectionSyncStore.getState().setFromCache(true);
      }
      useInspectionSyncStore.getState().setOffline();
      return cached;
    }

    const fetcher = async () => {
      const res = await API.get('/inspection/list', {
        params: { context: 'INSPECTIONVIEW' },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    try {
      if (revalidate) {
        const mem = peekCache(LIST_KEY, INSPECTION_VIEW_TTL_MS);
        if (mem?.length) {
          apply(mem, { fromCache: false });
        } else if (get().schedules.length > 0) {
          set({ listLoading: false });
        } else {
          // Hydrate from IndexedDB while revalidating
          const idb = await loadFromIndexedDb();
          if (idb.length) {
            apply(idb, { fromCache: true });
          }
        }

        const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
          ttlMs: INSPECTION_VIEW_TTL_MS,
          onFresh: (rows) => {
            apply(rows, { fromCache: false });
            prefetchInspectionList(rows);
          },
        });
        await prefetchInspectionList(data);
        return data;
      }

      const { data } = await fetchWithCache(LIST_KEY, fetcher, {
        ttlMs: INSPECTION_VIEW_TTL_MS,
      });
      apply(data, { fromCache: false });
      await prefetchInspectionList(data);
      return data;
    } catch (err) {
      console.error('[inspection-view] fetch failed, falling back to cache', err);
      const cached = await loadFromIndexedDb();
      if (cached.length) {
        apply(cached, { fromCache: true });
        return cached;
      }
      set({ listLoading: false });
      throw err;
    }
  },

  prefetchSchedules: () => {
    get().fetchSchedules({ revalidate: true }).catch(() => {});
  },

  invalidateInspectionViewCache: () => {
    invalidateCache('inspection-view:');
    set({ schedules: [] });
  },
}));
