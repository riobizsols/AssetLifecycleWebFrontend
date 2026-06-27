import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const INSPECTION_APPROVAL_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'inspection-approval:list';

export const useInspectionApprovalStore = create((set, get) => ({
  approvals: peekCache(LIST_KEY, INSPECTION_APPROVAL_TTL_MS) || [],
  listLoading: !peekCache(LIST_KEY, INSPECTION_APPROVAL_TTL_MS),

  fetchApprovals: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ approvals: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/inspection-approval/pending');
      if (!res.data?.success) return [];
      return res.data.data || [];
    };

    if (revalidate) {
      const cached = peekCache(LIST_KEY, INSPECTION_APPROVAL_TTL_MS);
      if (cached?.length) {
        apply(cached);
      } else if (get().approvals.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: INSPECTION_APPROVAL_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: INSPECTION_APPROVAL_TTL_MS,
    });
    apply(data);
    return data;
  },

  prefetchApprovals: () => {
    get().fetchApprovals({ revalidate: true }).catch(() => {});
  },

  invalidateInspectionApprovalCache: () => {
    invalidateCache('inspection-approval:');
    set({ approvals: [] });
  },
}));
