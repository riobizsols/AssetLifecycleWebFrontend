import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import consumableService, { apiError } from '../../../services/consumableService';
import { useAcmContextStore } from '../../../store/useAcmContextStore';
import { emptyFilters, STATUS_LABELS, TXN_LABELS } from './config';

const EMPTY_OPTIONS = {
  branches: [],
  consumables: [],
  brands: [],
  departments: [],
  statuses: [],
  txnTypes: [],
};

const toQuery = (f) => ({
  from: f.from,
  to: f.to,
  branchIds: f.branchIds,
  consumIds: f.consumIds,
  brands: f.brands,
  deptIds: f.deptIds,
  statuses: f.statuses,
  txnTypes: f.txnTypes,
});

export function useConsumablesReport() {
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const [options, setOptions] = useState(EMPTY_OPTIONS);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [draft, setDraft] = useState(emptyFilters);
  const [applied, setApplied] = useState(emptyFilters);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    setLoadingOptions(true);
    consumableService
      .getReportOptions()
      .then((res) => {
        if (!cancelled) setOptions({ ...EMPTY_OPTIONS, ...(res || {}) });
      })
      .catch((err) => {
        if (!cancelled) toast.error(apiError(err, 'Failed to load report filters'));
      })
      .finally(() => {
        if (!cancelled) setLoadingOptions(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedBranchId]);

  const load = useCallback(async (filters) => {
    const reqId = ++requestRef.current;
    setLoading(true);
    try {
      const res = await consumableService.getReport(toQuery(filters));
      if (reqId === requestRef.current) setReport(res);
    } catch (err) {
      if (reqId === requestRef.current) {
        toast.error(apiError(err, 'Failed to load consumables report'));
        setReport(null);
      }
    } finally {
      if (reqId === requestRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(applied);
  }, [applied, load, appliedBranchId]);

  const applyFilters = useCallback(() => {
    if (draft.from && draft.to && draft.from > draft.to) {
      toast.error('From date must be on or before To date');
      return;
    }
    setApplied({ ...draft });
  }, [draft]);

  const resetFilters = useCallback(() => {
    const fresh = emptyFilters();
    setDraft(fresh);
    setApplied(fresh);
  }, []);

  const refresh = useCallback(() => load(applied), [applied, load]);

  const consumableOptions = useMemo(() => {
    const list = options.consumables || [];
    if (!draft.branchIds.length) return list;
    return list.filter((c) => draft.branchIds.includes(c.branch_id));
  }, [options.consumables, draft.branchIds]);

  const lookup = useMemo(() => {
    const map = (list, idKey, labelKey) =>
      new Map((list || []).map((o) => [String(o[idKey]), o[labelKey] || o[idKey]]));
    return {
      branch: map(options.branches, 'branch_id', 'branch_name'),
      consumable: map(options.consumables, 'consum_id', 'consumable'),
      dept: map(options.departments, 'dept_id', 'dept_name'),
    };
  }, [options]);

  const filterSummary = useMemo(() => {
    const names = (ids, m) => ids.map((id) => m.get(String(id)) || id).join(', ');
    const items = [
      { label: 'Period', value: `${applied.from || '—'} to ${applied.to || '—'}` },
      {
        label: 'Branch',
        value: applied.branchIds.length ? names(applied.branchIds, lookup.branch) : 'All branches',
      },
      {
        label: 'Consumable',
        value: applied.consumIds.length
          ? names(applied.consumIds, lookup.consumable)
          : 'All consumables',
      },
    ];
    if (applied.brands.length) items.push({ label: 'Brand', value: applied.brands.join(', ') });
    if (applied.deptIds.length) {
      items.push({ label: 'Department', value: names(applied.deptIds, lookup.dept) });
    }
    if (applied.statuses.length) {
      items.push({
        label: 'Stock status',
        value: applied.statuses.map((s) => STATUS_LABELS[s] || s).join(', '),
      });
    }
    if (applied.txnTypes.length) {
      items.push({
        label: 'Movement type',
        value: applied.txnTypes.map((t) => TXN_LABELS[t] || t).join(', '),
      });
    }
    return items;
  }, [applied, lookup]);

  const isDirty = useMemo(
    () => JSON.stringify(toQuery(draft)) !== JSON.stringify(toQuery(applied)),
    [draft, applied],
  );

  return {
    options,
    consumableOptions,
    loadingOptions,
    draft,
    setDraft,
    applied,
    applyFilters,
    resetFilters,
    refresh,
    report,
    loading,
    filterSummary,
    isDirty,
    branchLocked: Boolean(appliedBranchId),
  };
}

export default useConsumablesReport;
