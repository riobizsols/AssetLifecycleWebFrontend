import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const MAINTENANCE_SUPERVISOR_TTL_MS = 3 * 60 * 1000;

const KEYS = {
  list: 'maintenance-supervisor:list',
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

const cachedList = peekCache(KEYS.list, MAINTENANCE_SUPERVISOR_TTL_MS);

export const useMaintenanceSupervisorStore = create((set, get) => ({
  schedules: cachedList || [],
  listLoading: !cachedList,
  detailsById: {},
  docTypes: peekCache(KEYS.docTypes, MAINTENANCE_SUPERVISOR_TTL_MS),

  fetchSchedules: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ schedules: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/maintenance-schedules/all', {
        params: { context: 'SUPERVISORAPPROVAL' },
      });
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    if (revalidate) {
      const cached = peekCache(KEYS.list, MAINTENANCE_SUPERVISOR_TTL_MS);
      if (cached?.length) {
        apply(cached);
      } else if (get().schedules.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(KEYS.list, fetcher, {
        ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(KEYS.list, fetcher, {
      ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
    });
    apply(data);
    return data;
  },

  fetchScheduleDetail: async (id, { orgId, revalidate = false, force = false } = {}) => {
    if (!id) return null;

    const cacheKey = KEYS.detail(id);
    const apply = (detail) => {
      set((state) => ({
        detailsById: { ...state.detailsById, [id]: detail },
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/maintenance-schedules/${id}`, {
        params: {
          context: 'SUPERVISORAPPROVAL',
          ...(orgId ? { orgId } : {}),
        },
      });
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to load maintenance schedule');
      }
      return res.data.data;
    };

    if (revalidate && !force) {
      const cached = peekCache(cacheKey, MAINTENANCE_SUPERVISOR_TTL_MS);
      if (cached) {
        apply(cached);
        fetchWithRevalidate(cacheKey, fetcher, {
          ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
          onFresh: apply,
        }).catch(() => {});
        return cached;
      }
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchMaintenanceDocTypes: async ({ revalidate = false } = {}) => {
    const cached = peekCache(KEYS.docTypes, MAINTENANCE_SUPERVISOR_TTL_MS);
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

    if (revalidate && cached) {
      set({ docTypes: cached });
      fetchWithRevalidate(KEYS.docTypes, fetcher, {
        ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
        onFresh: (data) => set({ docTypes: data }),
      }).catch(() => {});
      return cached;
    }

    const { data } = await fetchWithCache(KEYS.docTypes, fetcher, {
      ttlMs: MAINTENANCE_SUPERVISOR_TTL_MS,
    });
    set({ docTypes: data });
    return data;
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
