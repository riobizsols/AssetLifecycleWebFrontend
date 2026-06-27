import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'inspection-frequencies:list';
const MAPPINGS_KEY = 'inspection-frequencies:mappings';
const UOM_KEY = 'inspection-frequencies:uom';

export function formatInspectionFrequencyRows(raw, allAssetsFallback, onDemandFallback, notApplicable) {
  return (raw || []).map((f) => ({
    ...f,
    id: f.aatif_id,
    asset_name: f.asset_name || allAssetsFallback,
    freq_display: f.is_recurring
      ? `${f.freq || ''} ${f.uom || ''}`.trim() || notApplicable
      : onDemandFallback,
  }));
}

const cachedList = peekCache(LIST_KEY, TTL_MS);

export const useInspectionFrequencyStore = create((set, get) => ({
  frequencies: cachedList || [],
  mappings: peekCache(MAPPINGS_KEY, TTL_MS) || [],
  uomOptions: peekCache(UOM_KEY, TTL_MS) || [],
  listLoading: !cachedList,

  fetchFrequencies: async ({ revalidate = false, force = false, formatOpts, onFresh } = {}) => {
    const apply = (rows) => {
      const formatted = formatOpts
        ? formatInspectionFrequencyRows(
            rows,
            formatOpts.allAssetsFallback,
            formatOpts.onDemandFallback,
            formatOpts.notApplicable,
          )
        : rows;
      set({ frequencies: formatted, listLoading: false });
      onFresh?.(formatted);
      return formatted;
    };

    const fetcher = async () => {
      const res = await API.get('/inspection-frequencies');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().frequencies.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (raw) => apply(raw),
      });
      return apply(data);
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, TTL_MS);
      if (cached) return apply(cached);
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    return apply(data);
  },

  fetchMappings: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/asset-type-checklist-mapping/all');
      const data = res.data?.data || [];
      return (Array.isArray(data) ? data : []).map((m) => ({
        ...m,
        rowId: m.asset_id ? `${m.at_id}_${m.asset_id}` : m.at_id,
      }));
    };

    if (revalidate && !force) {
      const cached = peekCache(MAPPINGS_KEY, TTL_MS);
      if (cached) set({ mappings: cached });
      const { data } = await fetchWithRevalidate(MAPPINGS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ mappings: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(MAPPINGS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ mappings: data });
    return data;
  },

  fetchUom: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/uom');
      const data = res.data?.data || res.data || [];
      return (Array.isArray(data) ? data : []).map((u) => ({
        id: u.UOM_id || u.uom_id,
        text: u.UOM || u.uom || u.text,
      }));
    };

    if (revalidate && !force) {
      const cached = peekCache(UOM_KEY, TTL_MS);
      if (cached) set({ uomOptions: cached });
      const { data } = await fetchWithRevalidate(UOM_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ uomOptions: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(UOM_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ uomOptions: data });
    return data;
  },

  loadPageData: async (opts = {}) => {
    const { revalidate = true, formatOpts } = opts;
    await Promise.all([
      get().fetchMappings({ revalidate }),
      get().fetchUom({ revalidate }),
    ]);
    return get().fetchFrequencies({ revalidate, formatOpts });
  },

  prefetchInspectionFrequencies: (formatOpts) => {
    get().loadPageData({ revalidate: true, formatOpts }).catch(() => {});
  },

  invalidateInspectionFrequencyCache: () => {
    invalidateCache('inspection-frequencies:');
    set({ frequencies: [], mappings: [], uomOptions: [] });
  },
}));
