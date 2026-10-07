import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { slaVendorPerformanceService } from '../../../services/slaVendorPerformanceService';
import { useAcmContextStore } from '../../../store/useAcmContextStore';

const emptyDraft = {
  period: 'last_30_days',
  dateFrom: '',
  dateTo: '',
  vendorIds: [],
  assetTypeIds: [],
  branchIds: [],
  maintTypeIds: [],
  reasonIds: [],
  slaStatus: 'all',
};

export function useSlaVendorPerformance() {
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const appliedScopeLevel = useAcmContextStore((s) => s.appliedScopeLevel);
  const branchLocked = (appliedScopeLevel === 'branch' || appliedScopeLevel === 'dept')
    && Boolean(appliedBranchId);
  const lockedBranchId = branchLocked ? String(appliedBranchId) : '';

  const [options, setOptions] = useState({
    vendors: [],
    assetTypes: [],
    maintTypes: [],
    locations: [],
    breakdownReasons: [],
    periods: [],
    slaStatuses: [],
    definitions: {},
  });
  const [draft, setDraft] = useState(emptyDraft);
  const [applied, setApplied] = useState(emptyDraft);
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState({ points: [], grain: 'month' });
  const [breaches, setBreaches] = useState({ rows: [], total: 0, byVendor: [], byAssetType: [], byMonth: [] });
  const [vendors, setVendors] = useState({ rows: [] });
  const [repeat, setRepeat] = useState(null);
  const [quality, setQuality] = useState(null);
  const [details, setDetails] = useState({ rows: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
  const [grain, setGrain] = useState('month');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorDetail, setVendorDetail] = useState(null);

  const locationOptions = useMemo(() => {
    if (!lockedBranchId) return options.locations;
    return options.locations.filter((loc) => String(loc.id) === lockedBranchId);
  }, [options.locations, lockedBranchId]);

  const dashboardFilters = useMemo(
    () => ({
      ...applied,
      ...(lockedBranchId ? { branchIds: [lockedBranchId] } : {}),
      // Keep overview KPIs/charts unfiltered by SLA status — status only scopes the details table
      slaStatus: 'all',
      dateFrom: applied.period === 'custom' ? applied.dateFrom : undefined,
      dateTo: applied.period === 'custom' ? applied.dateTo : undefined,
      grain,
    }),
    [applied, grain, lockedBranchId],
  );

  const detailFilters = useMemo(
    () => ({
      ...applied,
      ...(lockedBranchId ? { branchIds: [lockedBranchId] } : {}),
      dateFrom: applied.period === 'custom' ? applied.dateFrom : undefined,
      dateTo: applied.period === 'custom' ? applied.dateTo : undefined,
      grain,
    }),
    [applied, grain, lockedBranchId],
  );

  const loadOptions = useCallback(async () => {
    try {
      const data = await slaVendorPerformanceService.getFilterOptions();
      setOptions({
        vendors: data.vendors || [],
        assetTypes: data.assetTypes || [],
        maintTypes: data.maintTypes || [],
        locations: data.locations || [],
        breakdownReasons: data.breakdownReasons || [],
        periods: data.periods || [],
        slaStatuses: data.slaStatuses || [],
        definitions: data.definitions || {},
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load filter options');
    }
  }, []);

  const loadDashboard = useCallback(async (filters) => {
    try {
      setLoading(true);
      const [sum, tr, br, ven, rep, qual] = await Promise.all([
        slaVendorPerformanceService.getSummary(filters),
        slaVendorPerformanceService.getTrends(filters),
        slaVendorPerformanceService.getBreaches({ ...filters, page: 1, pageSize: 10, sort: 'delay_desc' }),
        slaVendorPerformanceService.getVendors(filters),
        slaVendorPerformanceService.getRepeatFailures(filters),
        slaVendorPerformanceService.getServiceQuality(filters),
      ]);
      setSummary(sum);
      setTrends(tr || { points: [] });
      setBreaches(br || { rows: [] });
      setVendors(ven || { rows: [] });
      setRepeat(rep);
      setQuality(qual);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load SLA performance report');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetails = useCallback(async (filters, pageNum, size, q) => {
    try {
      setLoadingDetails(true);
      const data = await slaVendorPerformanceService.getDetails({
        ...filters,
        page: pageNum,
        pageSize: size,
        search: q || undefined,
      });
      setDetails(data || { rows: [], total: 0, page: 1, pageSize: size, totalPages: 1 });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load detail records');
    } finally {
      setLoadingDetails(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions, lockedBranchId]);

  useEffect(() => {
    loadDashboard(dashboardFilters);
  }, [dashboardFilters, loadDashboard]);

  useEffect(() => {
    loadDetails(detailFilters, page, pageSize, search);
  }, [detailFilters, page, pageSize, search, loadDetails]);

  useEffect(() => {
    if (!selectedVendorId) {
      setVendorDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await slaVendorPerformanceService.getVendorDetail(selectedVendorId, dashboardFilters);
        if (!cancelled) setVendorDetail(data);
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load vendor detail');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedVendorId, dashboardFilters]);

  const applyFilters = useCallback(() => {
    if (draft.period === 'custom' && (!draft.dateFrom || !draft.dateTo)) {
      toast.error('Select a custom date range');
      return;
    }
    setPage(1);
    setApplied({ ...draft });
  }, [draft]);

  const resetFilters = useCallback(() => {
    const next = lockedBranchId
      ? { ...emptyDraft, branchIds: [lockedBranchId] }
      : emptyDraft;
    setDraft(next);
    setApplied(next);
    setPage(1);
    setSearch('');
    setSelectedVendorId(null);
  }, [lockedBranchId]);

  const clearSlaStatusFilter = useCallback(() => {
    setDraft((d) => ({ ...d, slaStatus: 'all' }));
    setApplied((a) => ({ ...a, slaStatus: 'all' }));
    setPage(1);
  }, []);

  const filterByBreached = useCallback(() => {
    setDraft((d) => ({ ...d, slaStatus: 'breached' }));
    setApplied((a) => ({ ...a, slaStatus: 'breached' }));
    setPage(1);
    toast.success('Showing breached requests in the details table');
    requestAnimationFrame(() => {
      document.getElementById('sla-service-details')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  return {
    options,
    locationOptions,
    branchLocked,
    draft,
    setDraft,
    applied,
    summary,
    trends,
    breaches,
    vendors,
    repeat,
    quality,
    details,
    grain,
    setGrain,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    loadingDetails,
    selectedVendorId,
    setSelectedVendorId,
    vendorDetail,
    applyFilters,
    resetFilters,
    filterByBreached,
    clearSlaStatusFilter,
    detailFilters,
  };
}
