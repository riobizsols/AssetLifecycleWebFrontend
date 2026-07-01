import { create } from 'zustand';
import API from '../lib/axios';
import {
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;
const JOBS_KEY = 'job-monitor:jobs';

const jobsKey = (jobId) => `job-monitor:history:${jobId}`;

const cachedJobs = peekCache(JOBS_KEY, TTL_MS);

export const useJobMonitorStore = create((set, get) => ({
  jobs: cachedJobs || [],
  listLoading: !cachedJobs,
  historyByJobId: {},
  historyLoading: false,

  fetchJobs: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      set({ jobs: rows, listLoading: false });
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get('/job-monitor/jobs');
      return res.data?.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(JOBS_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().jobs.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(JOBS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    if (!force && !revalidate) {
      const cached = peekCache(JOBS_KEY, TTL_MS);
      if (cached) {
        apply(cached);
        return cached;
      }
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(JOBS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  fetchJobHistory: async (jobId, { revalidate = false, force = false } = {}) => {
    if (!jobId) return [];
    const key = jobsKey(jobId);

    const apply = (rows) => {
      set((state) => ({
        historyByJobId: { ...state.historyByJobId, [jobId]: rows },
        historyLoading: false,
      }));
    };

    const fetcher = async () => {
      const res = await API.get(`/job-monitor/jobs/${jobId}/history`);
      return res.data?.data || [];
    };

    const cached = peekCache(key, TTL_MS);
    if (cached && !force) {
      apply(cached);
      if (!revalidate) return cached;
    } else if (get().historyByJobId[jobId]?.length && revalidate) {
      set({ historyLoading: false });
    }

    if (revalidate && !force) {
      set({ historyLoading: !cached && !get().historyByJobId[jobId]?.length });
      const { data } = await fetchWithRevalidate(key, fetcher, {
        ttlMs: TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    set({ historyLoading: !cached });
    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    apply(data);
    return data;
  },

  prefetchJobs: () => {
    get().fetchJobs({ revalidate: true }).catch(() => {});
  },

  invalidateJobMonitorCache: () => {
    invalidateCache('job-monitor:');
    set({ jobs: [], historyByJobId: {} });
  },
}));
