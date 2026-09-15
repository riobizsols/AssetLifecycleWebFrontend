import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';
import {
  getAllMaintSchedules,
  getMaintDocTypes,
  getMaintSchedule,
  upsertMaintDocTypes,
  upsertMaintSchedule,
} from '../offline/maintenanceCache';
import {
  prefetchMaintenanceDocTypes,
  prefetchMaintenanceList,
} from '../offline/prefetch';
import { useInspectionSyncStore } from './useInspectionSyncStore';
import { useAuthStore } from './useAuthStore';

const MAINTENANCE_SUPERVISOR_TTL_MS = 3 * 60 * 1000;

const KEYS = {
  list: 'maintenance-supervisor:list-all',
  detail: (id) => buildCacheKey(['maintenance-supervisor', 'detail', id]),
  docTypes: 'maintenance-supervisor:doc-types',
};

export function formatMaintenanceScheduleRows(rows, t) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '';
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  return (rows || []).map((item) => ({
    ...item,
    raw_act_maint_st_date: item.act_maint_st_date,
    raw_created_on: item.created_on,
    raw_changed_on: item.changed_on,
    act_maint_st_date: formatDate(item.act_maint_st_date),
    created_on: formatDate(item.created_on),
    changed_on: formatDate(item.changed_on),
    days_until_due:
      item.days_until_due > 0
        ? `${item.days_until_due} ${t('maintenanceSupervisor.days')}`
        : item.days_until_due === 0
          ? t('maintenanceSupervisor.dueToday')
          : t('maintenanceSupervisor.overdue'),
    variance:
      item.hours_spent && item.hours_required
        ? (parseFloat(item.hours_spent) - parseFloat(item.hours_required)).toFixed(2)
        : '0.00',
    urgency_class:
      item.days_until_due <= 2
        ? 'text-red-600 font-semibold'
        : item.days_until_due <= 5
          ? 'text-orange-600 font-semibold'
          : item.days_until_due === 0
            ? 'text-red-800 font-bold'
            : item.days_until_due < 0
              ? 'text-red-700 font-bold'
              : 'text-gray-600',
  }));
}

async function loadListFromIndexedDb() {
  try {
    const rows = await getAllMaintSchedules();
    return Array.isArray(rows) ? rows : [];
  } catch (err) {
    console.error('[maintenance-offline] IndexedDB list read failed', err);
    return [];
  }
}

const cachedList = peekCache(KEYS.list, MAINTENANCE_SUPERVISOR_TTL_MS);

export const useMaintenanceSupervisorStore = create((set, get) => ({
  schedules: cachedList || [],
  listLoading: !cachedList,
  fromCache: false,
  offlineAuthBlocked: false,
  detailsById: {},
  docTypes: peekCache(KEYS.docTypes, MAINTENANCE_SUPERVISOR_TTL_MS),

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

    if (!online && !token) {
      const cached = await loadListFromIndexedDb();
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

    if (!online) {
      const cached = await loadListFromIndexedDb();
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
      const res = await API.get('/maintenance-schedules/all', {
        params: { context: 'SUPERVISORAPPROVAL' },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    try {
      if (revalidate) {
        const mem = peekCache(KEYS.list, MAINTENANCE_SUPERVISOR_TTL_MS);
        if (mem?.length) {
          apply(mem, { fromCache: false });
        } else if (get().schedules.length > 0) {
          set({ listLoading: false });
        } else {
          const idb = await loadListFromIndexedDb();
          if (idb.length) {
            apply(idb, { fromCache: true });
          }
        }

        const { data } = await fetchWithRevalidate(KEYS.list, fetcher, {
          ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
          onFresh: (rows) => {
            apply(rows, { fromCache: false });
            prefetchMaintenanceList(rows);
          },
        });
        await prefetchMaintenanceList(data);
        return data;
      }

      const { data } = await fetchWithCache(KEYS.list, fetcher, {
        ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
      });
      apply(data, { fromCache: false });
      await prefetchMaintenanceList(data);
      return data;
    } catch (err) {
      console.error('[maintenance-list] fetch failed, falling back to cache', err);
      const cached = await loadListFromIndexedDb();
      if (cached.length) {
        apply(cached, { fromCache: true });
        return cached;
      }
      set({ listLoading: false });
      throw err;
    }
  },

  fetchScheduleDetail: async (id, { revalidate = false, force = false } = {}) => {
    if (!id) return null;

    const cacheKey = KEYS.detail(id);
    const apply = (detail) => {
      set((state) => ({
        detailsById: { ...state.detailsById, [id]: detail },
      }));
    };

    const token = useAuthStore.getState().token;
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!online) {
      if (!token) {
        useInspectionSyncStore.getState().setOffline();
        throw new Error('Sign in required. Offline login is not available.');
      }
      const idb = await getMaintSchedule(id);
      const mem =
        peekCache(cacheKey, MAINTENANCE_SUPERVISOR_TTL_MS) ||
        get().detailsById[id] ||
        null;
      // Prefer a previously opened full detail; fall back to list-row cache for browse.
      const detail =
        (idb?._offline_detail ? idb : null) ||
        mem ||
        idb ||
        null;
      if (!detail) {
        useInspectionSyncStore.getState().setOffline();
        throw new Error('Maintenance detail not cached for offline use. Open it once while online.');
      }
      apply(detail);
      useInspectionSyncStore.getState().setFromCache(true);
      useInspectionSyncStore.getState().setOffline();
      return detail;
    }

    const fetcher = async () => {
      const res = await API.get(`/maintenance-schedules/${id}`, {
        params: {
          context: 'SUPERVISORAPPROVAL',
        },
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to load maintenance schedule');
      }
      return res.data.data;
    };

    try {
      if (revalidate && !force) {
        const cached = peekCache(cacheKey, MAINTENANCE_SUPERVISOR_TTL_MS);
        if (cached) {
          apply(cached);
          fetchWithRevalidate(cacheKey, fetcher, {
            ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
            onFresh: (detail) => {
              apply(detail);
              upsertMaintSchedule(detail).catch(() => {});
            },
          }).catch(() => {});
          return cached;
        }
      }

      const { data } = await fetchWithCache(cacheKey, fetcher, {
        ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
        force: force || revalidate,
      });
      apply(data);
      await upsertMaintSchedule(data);
      return data;
    } catch (err) {
      console.error('[maintenance-detail] fetch failed, falling back to cache', err);
      const idb = await getMaintSchedule(id);
      const mem =
        peekCache(cacheKey, MAINTENANCE_SUPERVISOR_TTL_MS) ||
        get().detailsById[id] ||
        null;
      const detail = idb || mem;
      if (detail) {
        apply(detail);
        useInspectionSyncStore.getState().setFromCache(true);
        return detail;
      }
      throw err;
    }
  },

  fetchMaintenanceDocTypes: async ({ revalidate = false } = {}) => {
    const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const cached = peekCache(KEYS.docTypes, MAINTENANCE_SUPERVISOR_TTL_MS);

    if (!online) {
      const idb = await getMaintDocTypes();
      const rows = (idb && idb.length ? idb : cached) || [];
      set({ docTypes: rows });
      return rows;
    }

    if (cached && !revalidate) {
      set({ docTypes: cached });
      return cached;
    }

    const fetcher = async () => {
      const maintenanceRes = await API.get('/doc-type-objects/object-type/maintenance');
      const rows = maintenanceRes.data?.success && Array.isArray(maintenanceRes.data.data)
        ? maintenanceRes.data.data
        : [];
      return rows;
    };

    try {
      if (revalidate && cached) {
        set({ docTypes: cached });
        fetchWithRevalidate(KEYS.docTypes, fetcher, {
          ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
          onFresh: (data) => {
            set({ docTypes: data });
            prefetchMaintenanceDocTypes(data);
          },
        }).catch(() => {});
        return cached;
      }

      const { data } = await fetchWithCache(KEYS.docTypes, fetcher, {
        ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
      });
      set({ docTypes: data });
      await upsertMaintDocTypes(data);
      return data;
    } catch (err) {
      const idb = await getMaintDocTypes();
      if (idb.length) {
        set({ docTypes: idb });
        return idb;
      }
      if (cached) {
        set({ docTypes: cached });
        return cached;
      }
      throw err;
    }
  },

  getCachedDetail: (id) =>
    peekCache(KEYS.detail(id), MAINTENANCE_SUPERVISOR_TTL_MS) ||
    get().detailsById[id] ||
    null,

  prefetchSchedules: () => {
    get().fetchSchedules({ revalidate: true }).catch(() => {});
  },

  invalidateMaintenanceCache: () => {
    invalidateCache('maintenance-supervisor:');
    set({ detailsById: {} });
  },
}));
