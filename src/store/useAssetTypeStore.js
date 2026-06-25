import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'asset-types:list';

export function formatAssetTypeRows(raw) {
  const assetTypeMap = (raw || []).reduce((map, type) => {
    map[type.asset_type_id] = type.text;
    return map;
  }, {});

  return (raw || []).map((item) => ({
    ...item,
    int_status: item.int_status === 1 ? 'Active' : 'Inactive',
    assignment_type: item.assignment_type === 'user' ? 'User-wise' : 'Department-wise',
    group_required: item.group_required ? 'Yes' : 'No',
    inspection_required: item.inspection_required ? 'Yes' : 'No',
    maintenance_schedule: Number(item.maintenance_schedule) === 1 ? 'Yes' : 'No',
    created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
    changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
    type: item.is_child ? 'Child' : 'Parent',
    parent_asset_type: item.parent_asset_type_id ? assetTypeMap[item.parent_asset_type_id] : '-',
    _original: { ...item },
  }));
}

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useAssetTypeStore = create((set, get) => ({
  assetTypes: cachedList || [],
  listLoading: !cachedList,

  fetchAssetTypes: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ assetTypes: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/asset-types');
      return formatAssetTypeRows(Array.isArray(res.data) ? res.data : []);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().assetTypes.length > 0) set({ listLoading: false });
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

  prefetchAssetTypes: () => {
    get().fetchAssetTypes({ revalidate: true }).catch(() => {});
  },

  invalidateAssetTypeCache: () => {
    invalidateCache('asset-types:');
    set({ assetTypes: [] });
  },
}));
