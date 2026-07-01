import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const REPORT_BREAKDOWN_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'report-breakdown:list';

export function formatReportBreakdownRows(rows) {
  return (rows || []).map((b) => ({
    ...b,
    created_on: b.created_at
      ? new Date(b.created_at).toLocaleString()
      : b.created_on || '',
  }));
}

const cachedList = peekCache(LIST_KEY, REPORT_BREAKDOWN_TTL_MS);

export const useReportBreakdownStore = create((set, get) => ({
  reports: cachedList || [],
  listLoading: !cachedList,

  fetchReports: async ({ revalidate = false, force = false, onFresh } = {}) => {
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
      return formatReportBreakdownRows(raw);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, REPORT_BREAKDOWN_TTL_MS);
      if (cached) {
        apply(cached);
      } else if (get().reports.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: REPORT_BREAKDOWN_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, REPORT_BREAKDOWN_TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: REPORT_BREAKDOWN_TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  removeReports: (abrIds) => {
    const idSet = new Set(abrIds);
    set((state) => ({
      reports: state.reports.filter((r) => !idSet.has(r.abr_id)),
    }));
  },

  prefetchReports: () => {
    get().fetchReports({ revalidate: true }).catch(() => {});
  },

  invalidateReportBreakdownCache: () => {
    invalidateCache('report-breakdown:');
    set({ reports: [] });
  },
}));
