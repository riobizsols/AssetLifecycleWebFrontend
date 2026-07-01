import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const EMPLOYEE_BREAKDOWN_TTL_MS = 3 * 60 * 1000;

function listKey(user) {
  return buildCacheKey([
    'employee-report-breakdown',
    user?.user_id,
    user?.emp_int_id,
    user?.dept_id,
  ]);
}

export function filterEmployeeBreakdowns(raw, user) {
  if (!user) return [];
  const currentUserId = user?.user_id || user?.emp_int_id;
  const currentDeptId = user?.dept_id;
  return (raw || []).filter(
    (b) => b.reported_by === currentUserId || b.reported_by === currentDeptId,
  );
}

export function formatEmployeeBreakdownRows(rows) {
  return (rows || []).map((b) => ({
    ...b,
    created_on: b.created_on ? new Date(b.created_on).toLocaleString() : '',
  }));
}

export const useEmployeeReportBreakdownStore = create((set, get) => ({
  reports: [],
  listLoading: false,

  fetchBreakdowns: async (user, { revalidate = false, onFresh } = {}) => {
    if (!user) return [];

    const key = listKey(user);
    const apply = (rows) => {
      set({ reports: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/reportbreakdown/reports');
      const raw = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      return formatEmployeeBreakdownRows(filterEmployeeBreakdowns(raw, user));
    };

    if (revalidate) {
      const cached = peekCache(key, EMPLOYEE_BREAKDOWN_TTL_MS);
      if (cached) {
        apply(cached);
      } else if (get().reports.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: EMPLOYEE_BREAKDOWN_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const cached = peekCache(key, EMPLOYEE_BREAKDOWN_TTL_MS);
    if (cached) {
      apply(cached);
      return cached;
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: EMPLOYEE_BREAKDOWN_TTL_MS,
    });
    apply(data);
    return data;
  },

  patchReport: (abrId, updates) => {
    set((state) => ({
      reports: state.reports.map((item) =>
        item.abr_id === abrId ? { ...item, ...updates } : item,
      ),
    }));
  },

  prefetchBreakdowns: (user) => {
    if (user) {
      get().fetchBreakdowns(user, { revalidate: true }).catch(() => {});
    }
  },

  invalidateForUser: (user) => {
    if (user) invalidateCache(listKey(user));
  },
}));
