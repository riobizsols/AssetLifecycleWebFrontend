import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const SCRAP_SALES_TTL_MS = 3 * 60 * 1000;
const LIST_KEY = 'scrap-sales:list';

function formatDate(dateString) {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function normalizeScrapSalesRows(list) {
  return (list || []).map((item) => ({
    ssh_id: item.ssh_id || item.scrap_id || item.id || '',
    text: item.text || item.group_name || item.name || '',
    buyer_name: item.buyer_name || item.buyer_details?.buyer_name || '',
    buyer_company: item.buyer_company || item.buyer_details?.company_name || '',
    buyer_phone: item.buyer_phone || item.buyer_details?.buyer_contact || '',
    sale_date: formatDate(item.sale_date || item.scrap_date || ''),
    raw_sale_date: item.sale_date || item.scrap_date || '',
    collection_date: formatDate(item.collection_date || ''),
    raw_collection_date: item.collection_date || '',
    invoice_no: item.invoice_no || '',
    po_no: item.po_no || '',
    total_assets: item.total_assets || '',
    total_sale_value: Array.isArray(item.total_sale_value)
      ? (item.total_sale_value[0] ?? '')
      : (item.total_sale_value ?? ''),
    status: item.status || '',
    created_by: item.created_by || '',
    created_on: formatDate(item.created_on || item.created_date || ''),
    raw_created_on: item.created_on || item.created_date || '',
    group_name: item.group_name,
    asset_id: item.asset_id,
    asset_name: item.asset_name,
    asset_type: item.asset_type,
    created_date: item.created_date,
    scrap_value: item.scrap_value,
    buyer_contact: item.buyer_contact,
  }));
}

const cachedList = peekCache(LIST_KEY, SCRAP_SALES_TTL_MS);

export const useScrapSalesStore = create((set, get) => ({
  scrapSales: cachedList || [],
  listLoading: !cachedList,

  fetchScrapSales: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ scrapSales: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/scrap-sales', { params: { context: 'SCRAPSALES' } });
      const list = Array.isArray(res.data?.scrap_sales)
        ? res.data.scrap_sales
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data?.rows)
            ? res.data.rows
            : Array.isArray(res.data)
              ? res.data
              : [];
      return normalizeScrapSalesRows(list);
    };

    if (revalidate && !force) {
      const cached = peekCache(LIST_KEY, SCRAP_SALES_TTL_MS);
      if (cached) {
        apply(cached);
      } else if (get().scrapSales.length > 0) {
        set({ listLoading: false });
      }
      const { data } = await fetchWithRevalidate(LIST_KEY, fetcher, {
        ttlMs: SCRAP_SALES_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(LIST_KEY, SCRAP_SALES_TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(LIST_KEY, fetcher, {
      ttlMs: SCRAP_SALES_TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  removeSales: (sshIds) => {
    const idSet = new Set(sshIds);
    set((state) => ({
      scrapSales: state.scrapSales.filter((r) => !idSet.has(r.ssh_id)),
    }));
  },

  prefetchScrapSales: () => {
    get().fetchScrapSales({ revalidate: true }).catch(() => {});
  },

  invalidateScrapSalesCache: () => {
    invalidateCache('scrap-sales:');
    set({ scrapSales: [] });
  },
}));
