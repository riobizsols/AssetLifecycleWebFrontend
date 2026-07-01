import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'vendors:list';

export function formatVendorRows(raw) {
  return (raw || []).map((item) => {
    let statusText = 'Inactive';
    if (item.int_status === 1) statusText = 'Active';
    else if (item.int_status === 3) statusText = 'CRApproved';
    else if (item.int_status === 4) statusText = 'Blocked';

    return {
      ...item,
      int_status: statusText,
      created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
      changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
    };
  });
}

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useVendorsStore = create((set, get) => ({
  vendors: cachedList || [],
  listLoading: !cachedList,

  fetchVendors: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ vendors: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/get-vendors');
      return formatVendorRows(Array.isArray(res.data) ? res.data : []);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().vendors.length > 0) set({ listLoading: false });
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

  prefetchVendors: () => {
    get().fetchVendors({ revalidate: true }).catch(() => {});
  },

  invalidateVendorsCache: () => {
    invalidateCache('vendors:');
    set({ vendors: [] });
  },
}));
