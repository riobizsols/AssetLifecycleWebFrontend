import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { consolidatedAssetRegisterService } from '../../../services/consolidatedAssetRegisterService';
import { useAcmContextStore } from '../../../store/useAcmContextStore';
import { EMPTY_SUMMARY } from './utils';

const emptyFilters = {
  orgIds: [],
  branchIds: [],
  deptIds: [],
};

const emptyRegisterFilters = {
  assetTypeIds: [],
  statuses: [],
  search: '',
};

/**
 * Always start from a selected institution when possible.
 * - Header ACM org → pre-select that institution
 * - Only one institution available → select it
 * - Otherwise leave empty until user picks (no silent "all orgs")
 * Campus/dept follow ACM branch/dept level when they match the selected org.
 */
function buildScopedDefaults(options, acm) {
  const institutions = options?.institutions || [];
  const campuses = options?.campuses || [];
  const departments = options?.departments || [];

  const appliedOrg = acm?.appliedOrgId ? String(acm.appliedOrgId) : '';
  const appliedBranch = acm?.appliedBranchId ? String(acm.appliedBranchId) : '';
  const appliedDept = acm?.appliedDeptId ? String(acm.appliedDeptId) : '';
  const level = acm?.appliedScopeLevel || 'org';

  let orgIds = [];
  if (appliedOrg && institutions.some((i) => String(i.id) === appliedOrg)) {
    orgIds = [appliedOrg];
  } else if (institutions.length === 1) {
    orgIds = [String(institutions[0].id)];
  }

  const campusPool = orgIds.length
    ? campuses.filter((c) => orgIds.includes(String(c.org_id)))
    : [];

  let branchIds = [];
  if (
    orgIds.length &&
    (level === 'branch' || level === 'dept') &&
    appliedBranch &&
    campusPool.some((c) => String(c.id) === appliedBranch)
  ) {
    branchIds = [appliedBranch];
  } else if (campusPool.length === 1) {
    branchIds = [String(campusPool[0].id)];
  }

  const deptPool = departments.filter((d) => {
    if (!orgIds.length) return false;
    if (!orgIds.includes(String(d.org_id))) return false;
    if (branchIds.length && d.branch_id && !branchIds.includes(String(d.branch_id))) {
      return false;
    }
    return true;
  });

  let deptIds = [];
  if (
    orgIds.length &&
    level === 'dept' &&
    appliedDept &&
    deptPool.some((d) => String(d.id) === appliedDept)
  ) {
    deptIds = [appliedDept];
  } else if (deptPool.length === 1) {
    deptIds = [String(deptPool[0].id)];
  }

  return {
    ...emptyFilters,
    orgIds,
    branchIds,
    deptIds,
  };
}

export function useConsolidatedAssetRegister() {
  const appliedOrgId = useAcmContextStore((s) => s.appliedOrgId);
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const appliedDeptId = useAcmContextStore((s) => s.appliedDeptId);
  const appliedScopeLevel = useAcmContextStore((s) => s.appliedScopeLevel);

  const [filterOptions, setFilterOptions] = useState({
    institutions: [],
    campuses: [],
    departments: [],
    statuses: [],
    assetTypes: [],
  });
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [registerDraft, setRegisterDraft] = useState(emptyRegisterFilters);
  const [registerApplied, setRegisterApplied] = useState(emptyRegisterFilters);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [register, setRegister] = useState({
    rows: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
  });
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const optionsRef = useRef(filterOptions);
  const seededRef = useRef(false);
  const skipAcmReseedOnce = useRef(true);

  const hasInstitution = (applied.orgIds || []).length > 0;

  const queryFilters = useMemo(
    () => ({
      orgIds: applied.orgIds,
      branchIds: applied.branchIds,
      deptIds: applied.deptIds,
    }),
    [applied],
  );

  const registerQueryFilters = useMemo(
    () => ({
      ...queryFilters,
      assetTypeIds: registerApplied.assetTypeIds,
      statuses: registerApplied.statuses,
      search: registerApplied.search || undefined,
    }),
    [queryFilters, registerApplied],
  );

  const seedFromContext = useCallback((options) => {
    const next = buildScopedDefaults(options, useAcmContextStore.getState());
    setDraft(next);
    setApplied(next);
    setRegisterDraft(emptyRegisterFilters);
    setRegisterApplied(emptyRegisterFilters);
    setPage(1);
    seededRef.current = true;
  }, []);

  const loadOptions = useCallback(
    async ({ reseed = false } = {}) => {
      try {
        setLoadingOptions(true);
        const data = await consolidatedAssetRegisterService.getFilterOptions();
        const normalized = {
          institutions: data.institutions || [],
          campuses: data.campuses || [],
          departments: data.departments || [],
          statuses: data.statuses || [],
          assetTypes: data.assetTypes || [],
        };
        optionsRef.current = normalized;
        setFilterOptions(normalized);
        if (reseed || !seededRef.current) {
          seedFromContext(normalized);
        }
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load filter options');
      } finally {
        setLoadingOptions(false);
      }
    },
    [seedFromContext],
  );

  const loadSummary = useCallback(async (filters) => {
    try {
      setLoadingSummary(true);
      const data = await consolidatedAssetRegisterService.getSummary(filters);
      setSummary(data || EMPTY_SUMMARY);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load summary');
      setSummary(EMPTY_SUMMARY);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadRegister = useCallback(async (filters, pageNum, size) => {
    try {
      setLoadingRegister(true);
      const data = await consolidatedAssetRegisterService.getRegister({
        ...filters,
        page: pageNum,
        pageSize: size,
      });
      setRegister(data);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load asset register');
      setRegister({ rows: [], total: 0, page: 1, pageSize: size, totalPages: 1 });
    } finally {
      setLoadingRegister(false);
    }
  }, []);

  useEffect(() => {
    loadOptions({ reseed: true });
  }, [loadOptions]);

  useEffect(() => {
    if (skipAcmReseedOnce.current) {
      skipAcmReseedOnce.current = false;
      return;
    }
    loadOptions({ reseed: true });
  }, [appliedOrgId, appliedBranchId, appliedDeptId, appliedScopeLevel, loadOptions]);

  useEffect(() => {
    const onAcm = () => loadOptions({ reseed: true });
    window.addEventListener('acm-context-changed', onAcm);
    return () => window.removeEventListener('acm-context-changed', onAcm);
  }, [loadOptions]);

  useEffect(() => {
    if (!hasInstitution) {
      setSummary(EMPTY_SUMMARY);
      setLoadingSummary(false);
      return;
    }
    loadSummary(queryFilters);
  }, [queryFilters, loadSummary, hasInstitution]);

  useEffect(() => {
    if (!hasInstitution) {
      setRegister({ rows: [], total: 0, page: 1, pageSize, totalPages: 1 });
      setLoadingRegister(false);
      return;
    }
    loadRegister(registerQueryFilters, page, pageSize);
  }, [registerQueryFilters, page, pageSize, loadRegister, hasInstitution]);

  const applyFilters = useCallback(() => {
    if (!(draft.orgIds || []).length) {
      toast('Select at least one institution', {
        duration: 3500,
        style: {
          background: '#B45309',
          color: '#FFFFFF',
          border: '1px solid #92400E',
          fontWeight: 500,
        },
      });
      return;
    }
    setPage(1);
    setApplied({ ...draft });
  }, [draft]);

  const resetFilters = useCallback(() => {
    seedFromContext(optionsRef.current);
  }, [seedFromContext]);

  const applyRegisterFilters = useCallback(() => {
    setPage(1);
    setRegisterApplied({ ...registerDraft });
  }, [registerDraft]);

  const resetRegisterFilters = useCallback(() => {
    setRegisterDraft(emptyRegisterFilters);
    setRegisterApplied(emptyRegisterFilters);
    setPage(1);
  }, []);

  const refresh = useCallback(() => {
    loadOptions({ reseed: false });
    if ((applied.orgIds || []).length) {
      loadSummary(queryFilters);
      loadRegister(registerQueryFilters, page, pageSize);
    }
  }, [
    loadOptions,
    loadSummary,
    loadRegister,
    queryFilters,
    registerQueryFilters,
    page,
    pageSize,
    applied.orgIds,
  ]);

  const campusOptions = useMemo(() => {
    if (!draft.orgIds.length) return [];
    const set = new Set(draft.orgIds.map(String));
    return (filterOptions.campuses || []).filter((c) => set.has(String(c.org_id)));
  }, [filterOptions.campuses, draft.orgIds]);

  const departmentOptions = useMemo(() => {
    if (!draft.orgIds.length) return [];
    const orgSet = new Set(draft.orgIds.map(String));
    let rows = (filterOptions.departments || []).filter((d) => orgSet.has(String(d.org_id)));
    if (draft.branchIds.length) {
      const branchSet = new Set(draft.branchIds.map(String));
      rows = rows.filter((d) => !d.branch_id || branchSet.has(String(d.branch_id)));
    }
    return rows;
  }, [filterOptions.departments, draft.orgIds, draft.branchIds]);

  return {
    filterOptions,
    campusOptions,
    departmentOptions,
    draft,
    setDraft,
    applied,
    registerDraft,
    setRegisterDraft,
    registerApplied,
    summary,
    register,
    loadingOptions,
    loadingSummary,
    loadingRegister,
    hasInstitution,
    page,
    setPage,
    pageSize,
    setPageSize,
    applyFilters,
    resetFilters,
    applyRegisterFilters,
    resetRegisterFilters,
    refresh,
    queryFilters,
    registerQueryFilters,
  };
}
