import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'asset-groups:list';

export function formatGroupAssetRows(raw) {
  return (raw || []).map((group) => ({
    group_id: group.assetgroup_h_id,
    group_name: group.text,
    org_id: group.org_id,
    asset_count: group.asset_count,
    created_by: group.created_by,
    created_date: group.created_on
      ? new Date(group.created_on).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
    changed_by: group.changed_by,
    changed_date: group.changed_on
      ? new Date(group.changed_on).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '',
    status: 'Active',
    _original: group,
  }));
}

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useGroupAssetStore = create((set, get) => ({
  groupAssets: cachedList || [],
  listLoading: !cachedList,

  fetchGroupAssets: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ groupAssets: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/asset-groups');
      return formatGroupAssetRows(Array.isArray(res.data) ? res.data : []);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().groupAssets.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  removeGroups: (groupIds) => {
    const idSet = new Set(groupIds);
    set((state) => ({
      groupAssets: state.groupAssets.filter((g) => !idSet.has(g.group_id)),
    }));
  },

  prefetchGroupAssets: () => {
    get().fetchGroupAssets({ revalidate: true }).catch(() => {});
  },

  invalidateGroupAssetCache: () => {
    invalidateCache('asset-groups:');
    set({ groupAssets: [] });
  },
}));
