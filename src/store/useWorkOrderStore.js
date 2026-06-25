import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const WORK_ORDER_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'work-orders:list';

export function formatWorkOrderRows(raw, t) {
  const getDisplayValue = (value, dateFormat = false) => {
    if (dateFormat && value) {
      return new Date(value).toLocaleDateString();
    }
    if (value === null || value === undefined || value === '' || (typeof value === 'string' && value.trim() === '')) {
      return t('workorderManagement.notSet') || 'Not Set';
    }
    return value;
  };

  return (raw || []).map((wo) => ({
    ...wo,
    ams_id: getDisplayValue(wo.ams_id),
    asset_id: getDisplayValue(wo.asset?.asset_id),
    description: getDisplayValue(wo.asset?.description),
    maintenance_type_name: getDisplayValue(wo.maintenance_type_name),
    act_maint_st_date: getDisplayValue(wo.act_maint_st_date, true),
    status: getDisplayValue(wo.status),
    asset_type_name: getDisplayValue(wo.asset_type?.asset_type_name),
  }));
}

const cachedList = peekCache(LIST_KEY, WORK_ORDER_TTL_MS);

export const useWorkOrderStore = create((set, get) => ({
  workOrders: cachedList || [],
  listLoading: !cachedList,

  fetchWorkOrders: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ workOrders: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/work-orders/all');
      return Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
    };

    if (revalidate) {
      const cached = peekCache(LIST_KEY, WORK_ORDER_TTL_MS);
      if (cached?.length) {
        apply(cached);
      } else if (get().workOrders.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: WORK_ORDER_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: WORK_ORDER_TTL_MS,
    });
    apply(data);
    return data;
  },

  prefetchWorkOrders: () => {
    get().fetchWorkOrders({ revalidate: true }).catch(() => {});
  },

  invalidateWorkOrderCache: () => {
    invalidateCache('work-orders:');
    set({ workOrders: [] });
  },
}));
