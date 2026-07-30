import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
  setCache,
  acmCacheSegment,
} from '../utils/apiCache';
import { useAssetsStore } from './useAssetsStore';
import { useAcmContextStore } from './useAcmContextStore';

const ASSIGNMENT_TTL_MS = 5 * 60 * 1000;

const acmKey = () => acmCacheSegment(useAcmContextStore.getState());

const KEYS = {
  departments: () => buildCacheKey(['assignment', 'departments', 'v2', acmKey()]),
  employees: (deptId) => buildCacheKey(['assignment', 'employees', deptId, acmKey()]),
  deptAssignments: (deptId) => buildCacheKey(['assignment', 'dept', deptId, acmKey()]),
  empAssignments: (empId) => buildCacheKey(['assignment', 'emp-active', empId, acmKey()]),
  deptHistory: (deptId) => buildCacheKey(['assignment', 'dept-history', deptId, acmKey()]),
  empHistory: (empIntId) => buildCacheKey(['assignment', 'emp-history', empIntId, acmKey()]),
  assetTypesDept: (deptId) => buildCacheKey(['assignment', 'asset-types', 'dept', deptId, acmKey()]),
  assetTypesUser: () => buildCacheKey(['assignment', 'asset-types', 'user', acmKey()]),
  inactive: (context, typeId, branchId = '') =>
    buildCacheKey(['assignment', 'inactive', context, typeId, branchId || 'all', acmKey()]),
};

function formatDepartments(rows) {
  return (rows || []).map((dept) => ({
    id: dept.dept_id,
    name: dept.text,
    branch_id: dept.branch_id || null,
  }));
}

function formatEmployees(rows) {
  return (rows || []).map((emp) => ({
    id: emp.employee_id,
    name: emp.employee_name || emp.name || emp.full_name,
    employee_int_id: emp.emp_int_id || emp.employee_int_id,
  }));
}

async function enrichAssignmentsWithAssets(rows) {
  if (!rows?.length) return rows || [];

  const uniqueAssetIds = [...new Set(rows.map((item) => item.asset_id).filter(Boolean))];
  const { fetchAssetById } = useAssetsStore.getState();

  const results = await Promise.all(
    uniqueAssetIds.map((id) => fetchAssetById(id).catch(() => null)),
  );

  const assetMap = Object.fromEntries(
    uniqueAssetIds.map((id, index) => [id, results[index]]),
  );

  return rows.map((row) => {
    const data = assetMap[row.asset_id];
    if (!data) return row;
    return {
      ...row,
      description: data.description ?? row.description,
      asset_text: data.text ?? row.asset_text,
      asset_type: data.asset_type_id ?? row.asset_type,
    };
  });
}

function parseInactiveList(res) {
  if (Array.isArray(res.data?.data)) return res.data.data;
  if (Array.isArray(res.data)) return res.data;
  return [];
}

const cachedDepartments = peekCache(KEYS.departments(), ASSIGNMENT_TTL_MS);

export const useAssignmentStore = create((set, get) => ({
  departments: formatDepartments(cachedDepartments) || [],
  employeesByDept: {},
  deptAssignments: {},
  empAssignments: {},
  departmentsLoading: !cachedDepartments,
  employeesLoading: false,
  assignmentsLoading: false,

  fetchDepartments: async ({ revalidate = false, force = false, onFresh } = {}) => {
    const apply = (rows) => {
      const departments = formatDepartments(rows);
      set({ departments, departmentsLoading: false });
      onFresh?.(departments);
    };

    const fetcher = async () => {
      const res = await API.get('/admin/departments');
      return res.data;
    };

    if (force) {
      invalidateCache(KEYS.departments());
    }

    if (revalidate) {
      const listKey = KEYS.departments();
      const cached = force ? null : peekCache(listKey, ASSIGNMENT_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(listKey, fetcher, {
        ttlMs: ASSIGNMENT_TTL_MS,
        onFresh: apply,
      });
      return formatDepartments(data);
    }

    const { data } = await fetchWithCache(KEYS.departments(), fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
      force,
    });
    apply(data);
    return formatDepartments(data);
  },

  fetchEmployeesByDept: async (deptId, { revalidate = false, onFresh } = {}) => {
    if (!deptId) {
      set({ employeesLoading: false });
      return [];
    }

    const cacheKey = KEYS.employees(deptId);
    const apply = (rows) => {
      const employees = formatEmployees(rows);
      set((state) => ({
        employeesByDept: { ...state.employeesByDept, [deptId]: employees },
        employeesLoading: false,
      }));
      onFresh?.(employees);
    };

    const fetcher = async () => {
      const res = await API.get(`/employees/department/${deptId}`);
      return res.data;
    };

    set({ employeesLoading: true });

    if (revalidate) {
      const cached = peekCache(cacheKey, ASSIGNMENT_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(cacheKey, fetcher, {
        ttlMs: ASSIGNMENT_TTL_MS,
        onFresh: apply,
      });
      return formatEmployees(data);
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
    });
    apply(data);
    return formatEmployees(data);
  },

  fetchDeptAssignments: async (deptId, { revalidate = false, onFresh } = {}) => {
    if (!deptId) {
      set({ assignmentsLoading: false });
      return [];
    }

    const cacheKey = KEYS.deptAssignments(deptId);
    const apply = (rows) => {
      set((state) => ({
        deptAssignments: { ...state.deptAssignments, [deptId]: rows },
        assignmentsLoading: false,
      }));
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get(`/asset-assignments/department/${deptId}/assignments`);
      return res.data.assignedAssets || [];
    };

    set({ assignmentsLoading: true });

    if (revalidate) {
      const cached = peekCache(cacheKey, ASSIGNMENT_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(cacheKey, fetcher, {
        ttlMs: ASSIGNMENT_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
    });
    apply(data);
    return data;
  },

  fetchEmpAssignments: async (employeeId, { revalidate = false, onFresh } = {}) => {
    if (!employeeId) {
      set({ assignmentsLoading: false });
      return [];
    }

    const cacheKey = KEYS.empAssignments(employeeId);
    const apply = (rows) => {
      set((state) => ({
        empAssignments: { ...state.empAssignments, [employeeId]: rows },
        assignmentsLoading: false,
      }));
      onFresh?.(rows);
    };

    const fetcher = async () => {
      const res = await API.get(`/asset-assignments/employee/${employeeId}/active`);
      const rows = res.data.data || [];
      return enrichAssignmentsWithAssets(rows);
    };

    set({ assignmentsLoading: true });

    if (revalidate) {
      const cached = peekCache(cacheKey, ASSIGNMENT_TTL_MS);
      if (cached) apply(cached);
      const { data } = await fetchWithRevalidate(cacheKey, fetcher, {
        ttlMs: ASSIGNMENT_TTL_MS,
        onFresh: apply,
      });
      return data;
    }

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
    });
    apply(data);
    return data;
  },

  fetchAssignmentHistory: async ({
    type,
    deptId,
    employeeIntId,
    revalidate = false,
    onRaw,
    onEnriched,
  } = {}) => {
    let cacheKey;
    let endpoint;

    if (type === 'department' && deptId) {
      cacheKey = KEYS.deptHistory(deptId);
      endpoint = `/asset-assignments/dept/${deptId}`;
    } else if (type === 'employee' && employeeIntId) {
      cacheKey = KEYS.empHistory(employeeIntId);
      endpoint = `/asset-assignments/employee-history/${employeeIntId}`;
    } else {
      return [];
    }

    const loadFresh = async () => {
      const res = await API.get(endpoint);
      const rows = Array.isArray(res.data) ? res.data : [];
      onRaw?.(rows);
      const enriched = await enrichAssignmentsWithAssets(rows);
      setCache(cacheKey, enriched);
      onEnriched?.(enriched);
      return enriched;
    };

    const cached = peekCache(cacheKey, ASSIGNMENT_TTL_MS);
    if (cached) {
      if (revalidate) {
        loadFresh().catch((err) => {
          console.error('[assignment] history revalidate failed:', err);
        });
      }
      return cached;
    }

    return loadFresh();
  },

  getCachedAssignmentHistory: ({ type, deptId, employeeIntId } = {}) => {
    let cacheKey;
    if (type === 'department' && deptId) {
      cacheKey = KEYS.deptHistory(deptId);
    } else if (type === 'employee' && employeeIntId) {
      cacheKey = KEYS.empHistory(employeeIntId);
    } else {
      return null;
    }
    return peekCache(cacheKey, ASSIGNMENT_TTL_MS);
  },

  prefetchAssignmentHistory: ({ type, deptId, employeeIntId } = {}) => {
    get().fetchAssignmentHistory({ type, deptId, employeeIntId, revalidate: true }).catch(() => {});
  },

  fetchAssetTypesForAssignment: async (entityType, entityId, { revalidate = false, force = false } = {}) => {
    const cacheKey =
      entityType === 'department' && entityId
        ? KEYS.assetTypesDept(entityId)
        : KEYS.assetTypesUser();

    const fetcher = async () => {
      if (entityType === 'department' && entityId) {
        const res = await API.get(`/dept-assets/department/${entityId}/asset-types`);
        const incoming = Array.isArray(res.data.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        return incoming.map((item) => ({
          ...item,
          text: item.asset_type_name || item.text,
        }));
      }
      if (entityType === 'employee') {
        const res = await API.get('/dept-assets/asset-types?assignment_type=user');
        return Array.isArray(res.data) ? res.data : [];
      }
      const res = await API.get('/dept-assets/asset-types');
      return Array.isArray(res.data) ? res.data : [];
    };

    // Force a fresh network read so new dept↔asset-type mappings show immediately
    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
      force: force || revalidate,
    });
    return data;
  },

  fetchInactiveAssetsByType: async (
    context,
    assetTypeId,
    { revalidate = false, force = false, branchId = null } = {},
  ) => {
    if (!assetTypeId) return [];

    const cacheKey = KEYS.inactive(context, assetTypeId, branchId || '');
    const fetcher = async () => {
      const params = { context };
      // Pass UI/ACM branch so count and list use the same scope
      if (branchId) params.branch_id = branchId;
      const res = await API.get(`/assets/type/${assetTypeId}/inactive`, { params });
      return parseInactiveList(res);
    };

    const { data } = await fetchWithCache(cacheKey, fetcher, {
      ttlMs: ASSIGNMENT_TTL_MS,
      force: force || revalidate,
    });

    if (!branchId || !Array.isArray(data)) return data || [];
    return data.filter((a) => !a.branch_id || a.branch_id === branchId);
  },

  fetchInactiveCountsForTypes: async (context, types = [], { branchId = null, force = true } = {}) => {
    if (!types.length) return {};

    const results = await Promise.all(
      types.map((type) =>
        get().fetchInactiveAssetsByType(context, type.asset_type_id, {
          force,
          branchId,
        }),
      ),
    );

    const counts = {};
    types.forEach((type, index) => {
      counts[type.asset_type_id] = (results[index] || []).length;
    });
    return counts;
  },

  fetchAllInactiveAssets: async (context, types = []) => {
    if (!types.length) return [];

    const lists = await Promise.all(
      types.map((type) => get().fetchInactiveAssetsByType(context, type.asset_type_id)),
    );

    const combined = lists.flat();
    return Array.from(new Map(combined.map((asset) => [asset.asset_id, asset])).values());
  },

  invalidateAssignmentCache: () => {
    invalidateCache('assignment:');
  },
}));
