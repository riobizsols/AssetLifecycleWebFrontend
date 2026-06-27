import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const MAINTENANCE_APPROVAL_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'maintenance-approval:list';

export function formatMaintenanceApprovalRows(items, t) {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (Number.isNaN(date.getTime())) return '';
      if (dateString.length <= 10) return date.toLocaleDateString();
      return date.toLocaleString();
    } catch {
      return '';
    }
  };

  const formatted = (items || []).map((item) => ({
    ...item,
    raw_created_on: item.maintenance_created_on,
    raw_changed_on: item.maintenance_changed_on,
    raw_scheduled_date: item.scheduled_date,
    raw_actual_date: item.act_sch_date ?? item.actual_date,
    scheduled_date: formatDate(item.scheduled_date),
    actual_date: formatDate(item.actual_date),
    maintenance_created_on: formatDate(item.maintenance_created_on),
    maintenance_changed_on: formatDate(item.maintenance_changed_on),
    days_until_due: item.days_until_due ? `${item.days_until_due} ${t('maintenanceApproval.days')}` : '-',
    urgency_class:
      item.days_until_due <= 2
        ? 'text-red-600 font-semibold'
        : item.days_until_due <= 5
          ? 'text-orange-600 font-semibold'
          : 'text-gray-600',
  }));

  return formatted.sort((a, b) => {
    const dateA = new Date(a.raw_changed_on || a.raw_created_on || 0);
    const dateB = new Date(b.raw_changed_on || b.raw_created_on || 0);
    return dateB - dateA;
  });
}

const cachedList = peekCache(LIST_KEY, MAINTENANCE_APPROVAL_TTL_MS);

export const useMaintenanceApprovalStore = create((set, get) => ({
  approvals: cachedList || [],
  listLoading: !cachedList,

  fetchApprovals: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ approvals: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/approval-detail/maintenance-approvals');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    try {
      if (revalidate) {
        const cached = peekCache(LIST_KEY, MAINTENANCE_APPROVAL_TTL_MS);
        if (cached?.length) {
          apply(cached);
        } else if (get().approvals.length > 0) {
          set({ listLoading: false });
        }
        const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
          ttlMs: MAINTENANCE_APPROVAL_TTL_MS,
          onFresh: apply,
        });
        return data;
      }

      const { data } = await fetchWithCache(LIST_KEY, fetcher, {
        ttlMs: MAINTENANCE_APPROVAL_TTL_MS,
      });
      apply(data);
      return data;
    } catch (err) {
      set({ listLoading: false });
      throw err;
    }
  },

  prefetchApprovals: () => {
    get().fetchApprovals({ revalidate: true }).catch(() => {});
  },

  invalidateMaintenanceApprovalCache: () => {
    invalidateCache('maintenance-approval:');
    set({ approvals: [] });
  },
}));
