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

const APPROVALS_KEY = buildCacheKey(['tech-cert-approvals', 'pending']);
const TECHNICIANS_KEY = 'tech-cert-approvals:technicians';
const CERT_MASTER_KEY = 'tech-cert-approvals:cert-master';
const UPCOMING_JOBS_KEY = 'tech-cert-approvals:upcoming-jobs';

const cachedApprovals = peekCache(APPROVALS_KEY, TTL_MS);

export const useTechCertApprovalsStore = create((set, get) => ({
  approvals: cachedApprovals || [],
  technicians: peekCache(TECHNICIANS_KEY, TTL_MS) || [],
  certMasterList: peekCache(CERT_MASTER_KEY, TTL_MS) || [],
  upcomingJobs: peekCache(UPCOMING_JOBS_KEY, TTL_MS) || [],
  listLoading: !cachedApprovals,

  fetchApprovals: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ approvals: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/employee-tech-certificates/approvals', {
        params: { status: 'Approval Pending' },
      });
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(APPROVALS_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().approvals.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(APPROVALS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(APPROVALS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchTechnicians: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/employees/with-roles');
      return Array.isArray(res.data) ? res.data : res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(TECHNICIANS_KEY, TTL_MS);
      if (cached) set({ technicians: cached });
      const { data } = await fetchWithRevalidate(TECHNICIANS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ technicians: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(TECHNICIANS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ technicians: data });
    return data;
  },

  fetchCertificateMaster: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/tech-certificates');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(CERT_MASTER_KEY, TTL_MS);
      if (cached) set({ certMasterList: cached });
      const { data } = await fetchWithRevalidate(CERT_MASTER_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ certMasterList: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(CERT_MASTER_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ certMasterList: data });
    return data;
  },

  fetchUpcomingJobs: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/work-orders/all');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(UPCOMING_JOBS_KEY, TTL_MS);
      if (cached) set({ upcomingJobs: cached });
      const { data } = await fetchWithRevalidate(UPCOMING_JOBS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ upcomingJobs: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(UPCOMING_JOBS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ upcomingJobs: data });
    return data;
  },

  loadPageData: async ({ revalidate = true } = {}) => {
    await Promise.all([
      get().fetchTechnicians({ revalidate }),
      get().fetchCertificateMaster({ revalidate }),
      get().fetchUpcomingJobs({ revalidate }),
    ]);
    return get().fetchApprovals({ revalidate });
  },

  prefetchTechCertApprovals: () => {
    get().loadPageData({ revalidate: true }).catch(() => {});
  },

  invalidateTechCertApprovalsCache: () => {
    invalidateCache('tech-cert-approvals:');
    set({ approvals: [], technicians: [], certMasterList: [], upcomingJobs: [] });
  },
}));
