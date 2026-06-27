import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;

const UPLOADED_KEY = 'technician-certs:uploaded';
const OPTIONS_KEY = 'technician-certs:options';
const EMPLOYEES_KEY = 'technician-certs:employees';

const ALLOWED_STATUSES = ['approved', 'confirmed', 'approval pending', 'pending'];

export function filterUploadedCertificates(data, employeeId) {
  const filtered = (data || []).filter((cert) =>
    ALLOWED_STATUSES.includes(String(cert.status || '').toLowerCase()),
  );
  if (!employeeId) return filtered;
  return filtered.filter((cert) => String(cert.emp_int_id) === String(employeeId));
}

const cachedUploaded = peekCache(UPLOADED_KEY, TTL_MS);

export const useTechnicianCertificatesStore = create((set, get) => ({
  uploadedCertificates: cachedUploaded || [],
  certificateOptions: peekCache(OPTIONS_KEY, TTL_MS) || [],
  employees: peekCache(EMPLOYEES_KEY, TTL_MS) || [],
  listLoading: !cachedUploaded,

  fetchUploadedCertificates: async ({
    revalidate = false,
    force = false,
    employeeId = '',
    onFresh,
  } = {}) => {
    const apply = (rows) => {
      const filtered = filterUploadedCertificates(rows, employeeId);
      set({ uploadedCertificates: filtered, listLoading: false });
      onFresh?.(filtered);
      return filtered;
    };

    const fetcher = async () => {
      const res = await API.get('/employee-tech-certificates/approvals');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(UPLOADED_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().uploadedCertificates.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(UPLOADED_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (raw) => apply(raw),
      });
      return filterUploadedCertificates(data, employeeId);
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(UPLOADED_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    return apply(data);
  },

  fetchCertificateOptions: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/tech-certificates');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(OPTIONS_KEY, TTL_MS);
      if (cached) set({ certificateOptions: cached });
      const { data } = await fetchWithRevalidate(OPTIONS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ certificateOptions: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(OPTIONS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ certificateOptions: data });
    return data;
  },

  fetchEmployees: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/employees');
      const data = res.data?.data || res.data || [];
      return Array.isArray(data) ? data : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(EMPLOYEES_KEY, TTL_MS);
      if (cached) set({ employees: cached });
      const { data } = await fetchWithRevalidate(EMPLOYEES_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ employees: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(EMPLOYEES_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ employees: data });
    return data;
  },

  loadPageData: async ({ revalidate = true, employeeId = '' } = {}) => {
    await Promise.all([
      get().fetchCertificateOptions({ revalidate }),
      get().fetchEmployees({ revalidate }),
    ]);
    return get().fetchUploadedCertificates({ revalidate, employeeId });
  },

  prefetchTechnicianCertificates: () => {
    get().loadPageData({ revalidate: true }).catch(() => {});
  },

  invalidateTechnicianCertificatesCache: () => {
    invalidateCache('technician-certs:');
    invalidateCache('tech-cert-approvals:');
    invalidateCache('certifications:tech-certs');
    set({ uploadedCertificates: [], certificateOptions: [], employees: [] });
  },
}));
