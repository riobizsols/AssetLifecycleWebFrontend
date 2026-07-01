import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const SCRAP_APPROVAL_TTL_MS = 3 * 60 * 1000;

const KEYS = {
  list: 'scrap-approval:list',
  detail: (id) => buildCacheKey(['scrap-approval', 'detail', id]),
  history: (wfscrapHId) => buildCacheKey(['scrap-approval', 'history', wfscrapHId]),
};

export function formatScrapApprovalRows(approvals, t) {
  return (approvals || []).map((row) => {
    let displayName = row.asset_group_name;

    if (
      row.assetgroup_id &&
      (row.assetgroup_id.startsWith('SCRAP_INDIVIDUAL_') ||
        row.assetgroup_id.startsWith('SCRAP_SALES_'))
    ) {
      displayName = row.asset_names || row.asset_group_name;
    } else if (row.asset_names) {
      displayName = `${row.asset_group_name} (${row.asset_names})`;
    }

    return {
      ...row,
      raw_created_on: row.created_on,
      status: row.header_status,
      created_on: row.created_on ? new Date(row.created_on).toLocaleDateString() : '',
      scrap_type_display:
        row.is_scrap_sales === 'Y'
          ? t('scrapApproval.scrapTypeOptions.sales')
          : t('scrapApproval.scrapTypeOptions.asset'),
      display_name: displayName,
    };
  });
}

const cachedList = peekCache(KEYS.list, SCRAP_APPROVAL_TTL_MS);

export const useScrapApprovalStore = create((set, get) => ({
  approvals: cachedList || [],
  listLoading: !cachedList,
  detailsById: {},
  historyById: {},
  historyLoading: false,

  fetchApprovals: async ({ revalidate = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ approvals: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/scrap-maintenance/approvals');
      return res.data?.approvals || [];
    };

    if (revalidate) {
      const cached = peekCache(KEYS.list, SCRAP_APPROVAL_TTL_MS);
      if (cached?.length) {
        apply(cached);
      } else if (get().approvals.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(KEYS.list, fetcher, {
        ttlMs: SCRAP_APPROVAL_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(KEYS.list, fetcher, {
      ttlMs: SCRAP_APPROVAL_TTL_MS,
    });
    apply(data);
    return data;
  },

  prefetchApprovals: () => {
    get().fetchApprovals({ revalidate: true }).catch(() => {});
  },

  fetchWorkflowDetail: async (id, { revalidate = false, force = false } = {}) => {
    if (!id) return null;

    const cacheKey = KEYS.detail(id);
    const apply = (detail) => {
      set((state) => ({
        detailsById: { ...state.detailsById, [id]: detail },
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/scrap-maintenance/workflow/${id}`);
      if (!res.data?.success) {
        throw new Error(res.data?.message || 'Failed to load scrap workflow');
      }
      return {
        header: res.data.header,
        assets: res.data.assets || [],
        workflowSteps: res.data.workflowSteps || [],
      };
    };

    if (revalidate && !force) {
      const cached = peekCache(cacheKey, SCRAP_APPROVAL_TTL_MS);
      if (cached) {
        apply(cached);
        fetchWithRevalidate(cacheKey, fetcher, {
          ttlMs: SCRAP_APPROVAL_TTL_MS,
          onFresh: apply,
        }).catch(() => {});
        return cached;
      }
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: SCRAP_APPROVAL_TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchWorkflowHistory: async (wfscrapHId, { revalidate = false, force = false } = {}) => {
    if (!wfscrapHId) return [];

    const cacheKey = KEYS.history(wfscrapHId);
    set({ historyLoading: true });

    const apply = (rows) => {
      set((state) => ({
        historyById: { ...state.historyById, [wfscrapHId]: rows },
        historyLoading: false,
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/scrap-maintenance/workflow-history/${wfscrapHId}`);
      return res.data?.success ? res.data.data || [] : [];
    };

    try {
      if (revalidate && !force) {
        const cached = peekCache(cacheKey, SCRAP_APPROVAL_TTL_MS);
        if (cached) {
          apply(cached);
          fetchWithRevalidate(cacheKey, fetcher, {
            ttlMs: SCRAP_APPROVAL_TTL_MS,
            onFresh: apply,
          }).catch(() => {});
          return cached;
        }
      }

      const { data } = await fetchWithCache(cacheKey, fetcher, {
        ttlMs: SCRAP_APPROVAL_TTL_MS,
        force: force || revalidate,
      });
      apply(data);
      return data;
    } catch (err) {
      set({ historyLoading: false });
      throw err;
    }
  },

  getCachedDetail: (id) =>
    peekCache(KEYS.detail(id), SCRAP_APPROVAL_TTL_MS) || get().detailsById[id] || null,

  getCachedHistory: (wfscrapHId) =>
    peekCache(KEYS.history(wfscrapHId), SCRAP_APPROVAL_TTL_MS) ||
    get().historyById[wfscrapHId] ||
    null,

  invalidateScrapApprovalCache: () => {
    invalidateCache('scrap-approval:');
    set({ detailsById: {}, historyById: {} });
  },
}));
