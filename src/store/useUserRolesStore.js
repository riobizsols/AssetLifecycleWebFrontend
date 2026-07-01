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
const USERS_KEY = 'users:list';
const DEPTS_KEY = 'users:admin-departments';
const JOB_ROLES_KEY = 'users:job-roles';

export function formatUserRows(raw, departments = [], notAssignedLabel = 'Not Assigned') {
  const deptMap = new Map((departments || []).map((d) => [d.dept_id, d.text]));
  return (raw || []).map((item) => ({
    ...item,
    int_status: item.int_status === 1 || item.int_status === '1' ? 'Active' : 'Inactive',
    created_on: item.created_on ? new Date(item.created_on).toLocaleString() : '',
    changed_on: item.changed_on ? new Date(item.changed_on).toLocaleString() : '',
    last_accessed: item.last_accessed ? new Date(item.last_accessed).toLocaleString() : '',
    dept_name: item.dept_name || deptMap.get(item.dept_id) || notAssignedLabel,
    job_role_name: item.job_role_name || notAssignedLabel,
  }));
}

const cachedUsers = peekCache(USERS_KEY, TTL_MS);
const cachedDepts = peekCache(DEPTS_KEY, TTL_MS);
const cachedJobRoles = peekCache(JOB_ROLES_KEY, TTL_MS);

export const useUserRolesStore = create((set, get) => ({
  users: cachedUsers || [],
  departments: cachedDepts || [],
  jobRoles: cachedJobRoles || [],
  listLoading: !cachedUsers,

  fetchUsers: async ({ revalidate = false, force = false, notAssignedLabel, onFresh } = {}) => {
    const depts = get().departments;
    const apply = (rows) => {
      const formatted = formatUserRows(rows, depts, notAssignedLabel);
      set({ users: formatted, listLoading: false });
      onFresh?.(formatted);
      return formatted;
    };

    const fetcher = async () => {
      const res = await API.get('/users/get-users');
      return res.data?.data || res.data || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(USERS_KEY, TTL_MS);
      if (cached) apply(cached);
      else if (get().users.length > 0) set({ listLoading: false });
      const { data } = await fetchWithRevalidate(USERS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (raw) => apply(raw),
      });
      return formatUserRows(data, depts, notAssignedLabel);
    }

    if (!force && !revalidate) {
      const cached = peekCache(USERS_KEY, TTL_MS);
      if (cached) return apply(cached);
    }

    set({ listLoading: true });
    const { data } = await fetchWithCache(USERS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    return apply(data);
  },

  fetchAdminDepartments: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/admin/departments');
      return Array.isArray(res.data) ? res.data : [];
    };

    if (revalidate && !force) {
      const cached = peekCache(DEPTS_KEY, TTL_MS);
      if (cached) set({ departments: cached });
      const { data } = await fetchWithRevalidate(DEPTS_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ departments: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(DEPTS_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ departments: data });
    return data;
  },

  fetchJobRoles: async ({ revalidate = false, force = false } = {}) => {
    const fetcher = async () => {
      const res = await API.get('/job-roles');
      return res.data?.roles || [];
    };

    if (revalidate && !force) {
      const cached = peekCache(JOB_ROLES_KEY, TTL_MS);
      if (cached) set({ jobRoles: cached });
      const { data } = await fetchWithRevalidate(JOB_ROLES_KEY, fetcher, {
        ttlMs: TTL_MS,
        onFresh: (rows) => set({ jobRoles: rows }),
      });
      return data;
    }

    const { data } = await fetchWithCache(JOB_ROLES_KEY, fetcher, {
      ttlMs: TTL_MS,
      force: force || revalidate,
    });
    set({ jobRoles: data });
    return data;
  },

  loadPageData: async ({ revalidate = true, notAssignedLabel } = {}) => {
    await Promise.all([
      get().fetchAdminDepartments({ revalidate }),
      get().fetchJobRoles({ revalidate }),
    ]);
    return get().fetchUsers({ revalidate, notAssignedLabel });
  },

  prefetchUserRoles: () => {
    get().loadPageData({ revalidate: true }).catch(() => {});
  },

  invalidateUserRolesCache: () => {
    invalidateCache('users:');
    set({ users: [], departments: [], jobRoles: [] });
  },
}));
