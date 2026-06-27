import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const SERIAL_PRINT_TTL_MS = 3 * 60 * 1000;
const PRINTERS_KEY = 'serial-print:printers';

export function transformPrintQueueItem(item) {
  return {
    psnq_id: item.psnq_id,
    serial_number: item.serial_no,
    status: item.status,
    reason: item.reason,
    created_by: item.created_by,
    created_at: item.created_on,
    org_id: item.org_id,
    asset_id: item.asset_details?.asset_id,
    asset_name: item.asset_details?.asset_name || '',
    asset_description: item.asset_details?.asset_description || '',
    asset_serial_number: item.asset_details?.asset_serial_number,
    purchased_on: item.asset_details?.purchased_on,
    expiry_date: item.asset_details?.expiry_date,
    current_status: item.asset_details?.current_status,
    asset_type_id: item.asset_type_details?.asset_type_id,
    asset_type_name: item.asset_type_details?.asset_type_name || '',
    assignment_type: item.asset_type_details?.assignment_type,
    inspection_required: item.asset_type_details?.inspection_required,
    group_required: item.asset_type_details?.group_required,
    estimated_cost: 0,
  };
}

export function mapPrinterAssets(assets) {
  return (assets || []).map((asset, idx) => ({
    id: String(asset.asset_id || `printer_${idx + 1}`),
    printer_id: asset.asset_id,
    name: asset.text || asset.description || `Printer ${idx + 1}`,
    location: asset.branch_id || 'Unknown',
    ip_address: 'N/A',
    status: asset.current_status || 'Online',
    type: 'Label',
    paper_size: 'A4',
    paper_type: 'Paper',
    paper_quality: 'High',
    description: asset.description || '',
    serial_number: asset.serial_number,
    purchased_cost: asset.purchased_cost,
    warranty_period: asset.warranty_period,
  }));
}

function queueKey(status) {
  return buildCacheKey(['serial-print', 'queue', status || 'New']);
}

const cachedPrinters = peekCache(PRINTERS_KEY, SERIAL_PRINT_TTL_MS);

export const useSerialNumberPrintStore = create((set, get) => ({
  queueByStatus: {},
  printers: cachedPrinters || [],
  queueLoading: false,
  printersLoading: !cachedPrinters,

  fetchPrintQueue: async (status = 'New', { revalidate = false, onFresh } = {}) => {
    const key = queueKey(status);
    const apply = (rows) => {
      set((state) => ({
        queueByStatus: { ...state.queueByStatus, [status]: rows },
        queueLoading: false,
      }));
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const response = await API.get(`/asset-serial-print/status/${status}`);
      if (!response.data?.success) return [];
      return (response.data.data || []).map(transformPrintQueueItem);
    };

    if (revalidate) {
      const cached = peekCache(key, SERIAL_PRINT_TTL_MS);
      if (cached) {
        apply(cached);
      } else if (get().queueByStatus[status]?.length) {
        set({ queueLoading: false });
      }
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: SERIAL_PRINT_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    set({ queueLoading: true });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: SERIAL_PRINT_TTL_MS,
    });
    apply(data);
    return data;
  },

  fetchPrinters: async ({ revalidate = false } = {}) => {
    const apply = (rows) => {
      set({ printers: rows, printersLoading: false });
    };

    const fetcher = async () => {
      const res = await API.get('/assets/printers');
      return mapPrinterAssets(res.data?.data || []);
    };

    if (revalidate) {
      const cached = peekCache(PRINTERS_KEY, SERIAL_PRINT_TTL_MS);
      if (cached?.length) {
        apply(cached);
      }
      const { data } = await fetchWithRevalidate(PRINTERS_KEY, fetcher, {
        ttlMs: SERIAL_PRINT_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(PRINTERS_KEY, fetcher, {
      ttlMs: SERIAL_PRINT_TTL_MS,
    });
    apply(data);
    return data;
  },

  prefetchSerialNumberPrint: (status = 'New') => {
    get().fetchPrintQueue(status, { revalidate: true }).catch(() => {});
    get().fetchPrinters({ revalidate: true }).catch(() => {});
  },

  invalidateSerialPrintCache: () => {
    invalidateCache('serial-print:');
    set({ queueByStatus: {}, printers: [] });
  },
}));
