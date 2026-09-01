import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import API from '../lib/axios';
import { useAcmContextStore } from '../store/useAcmContextStore';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Single cascading ACM dropdown:
 * Organization → Branch → Department
 * Back arrow returns to the previous level.
 */
export default function AcmContextSelector() {
  const { t } = useLanguage();
  const draftOrgId = useAcmContextStore((s) => s.draftOrgId);
  const draftBranchId = useAcmContextStore((s) => s.draftBranchId);
  const draftDeptId = useAcmContextStore((s) => s.draftDeptId);
  const appliedOrgId = useAcmContextStore((s) => s.appliedOrgId);
  const appliedBranchId = useAcmContextStore((s) => s.appliedBranchId);
  const appliedDeptId = useAcmContextStore((s) => s.appliedDeptId);
  const setDraftOrgId = useAcmContextStore((s) => s.setDraftOrgId);
  const setDraftBranchId = useAcmContextStore((s) => s.setDraftBranchId);
  const setDraftDeptId = useAcmContextStore((s) => s.setDraftDeptId);
  const applySelection = useAcmContextStore((s) => s.applySelection);

  const [orgs, setOrgs] = useState([]);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [acmRows, setAcmRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  /** 'org' | 'branch' | 'dept' */
  const [step, setStep] = useState('org');

  const rootRef = useRef(null);

  const loadOptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (draftOrgId) params.org_id = draftOrgId;
      if (draftBranchId) params.branch_id = draftBranchId;
      const res = await API.get('/acm/options', { params });
      setOrgs(Array.isArray(res.data?.orgs) ? res.data.orgs : []);
      setBranches(Array.isArray(res.data?.branches) ? res.data.branches : []);
      setDepartments(Array.isArray(res.data?.departments) ? res.data.departments : []);
      setAcmRows(Array.isArray(res.data?.rows) ? res.data.rows : []);
    } catch (err) {
      console.error('Failed to load ACM options', err);
      setOrgs([]);
      setBranches([]);
      setDepartments([]);
      setAcmRows([]);
    } finally {
      setLoading(false);
    }
  }, [draftOrgId, draftBranchId]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Login / no applied context → seed deterministic default ACM (first ACM row / stable wildcards)
  useEffect(() => {
    if (appliedOrgId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get('/acm/me');
        const def = res.data?.defaultSelection;
        if (cancelled || !def?.orgId) return;
        useAcmContextStore.getState().seedAndApply(
          {
            orgId: def.orgId,
            branchId: def.branchId,
            deptId: def.deptId,
          },
          { emitEvent: true }
        );
      } catch (err) {
        console.error('Failed to seed default ACM context', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appliedOrgId]);

  // Keep step aligned with how deep the draft is when opening
  useEffect(() => {
    if (!open) return;
    if (draftBranchId) setStep('dept');
    else if (draftOrgId) setStep('branch');
    else setStep('org');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const dirty = useMemo(
    () =>
      draftOrgId !== appliedOrgId ||
      draftBranchId !== appliedBranchId ||
      draftDeptId !== appliedDeptId,
    [draftOrgId, draftBranchId, draftDeptId, appliedOrgId, appliedBranchId, appliedDeptId]
  );

  /** Access level for current draft selection (shown on selected row). */
  const selectionAccess = useMemo(() => {
    if (!draftOrgId || !acmRows.length) return '';
    const isWild = (v) => !v || String(v).trim() === '*';
    const matching = acmRows.filter((row) => {
      if (!(isWild(row.org_id) || String(row.org_id) === draftOrgId)) return false;
      if (draftBranchId && !(isWild(row.branch_id) || String(row.branch_id) === draftBranchId)) {
        return false;
      }
      if (draftDeptId && !(isWild(row.dept_id) || String(row.dept_id) === draftDeptId)) {
        return false;
      }
      return true;
    });
    if (matching.some((r) => String(r.access_level).trim() === 'Write')) return 'Write';
    if (
      matching.some((r) => {
        const lvl = String(r.access_level).trim();
        return lvl === 'Read' || lvl === 'Write';
      })
    ) {
      return 'Read';
    }
    return '';
  }, [acmRows, draftOrgId, draftBranchId, draftDeptId]);

  const orgLabel = orgs.find((o) => o.org_id === draftOrgId)?.text || draftOrgId;
  const branchLabel = branches.find((b) => b.branch_id === draftBranchId)?.text || draftBranchId;
  const deptLabel = departments.find((d) => d.dept_id === draftDeptId)?.text || draftDeptId;

  const triggerLabel = useMemo(() => {
    const orgId = open ? draftOrgId : appliedOrgId || draftOrgId;
    const branchId = open ? draftBranchId : appliedBranchId || draftBranchId;
    const deptId = open ? draftDeptId : appliedDeptId || draftDeptId;
    const orgName = orgs.find((o) => o.org_id === orgId)?.text || orgId;
    const branchName = branches.find((b) => b.branch_id === branchId)?.text || branchId;
    const deptName = departments.find((d) => d.dept_id === deptId)?.text || deptId;
    if (deptId) return deptName;
    if (branchId) return branchName;
    if (orgId) return orgName;
    return t('common.selectOption') || 'Select…';
  }, [
    open,
    draftOrgId,
    draftBranchId,
    draftDeptId,
    appliedOrgId,
    appliedBranchId,
    appliedDeptId,
    orgs,
    branches,
    departments,
    t,
  ]);

  /** Access for applied (saved) scope — shown on closed trigger. */
  const appliedAccess = useMemo(() => {
    if (!appliedOrgId || !acmRows.length) return '';
    const isWild = (v) => !v || String(v).trim() === '*';
    const matching = acmRows.filter((row) => {
      if (!(isWild(row.org_id) || String(row.org_id) === appliedOrgId)) return false;
      if (
        appliedBranchId &&
        !(isWild(row.branch_id) || String(row.branch_id) === appliedBranchId)
      ) {
        return false;
      }
      if (appliedDeptId && !(isWild(row.dept_id) || String(row.dept_id) === appliedDeptId)) {
        return false;
      }
      return true;
    });
    if (matching.some((r) => String(r.access_level).trim() === 'Write')) return 'Write';
    if (
      matching.some((r) => {
        const lvl = String(r.access_level).trim();
        return lvl === 'Read' || lvl === 'Write';
      })
    ) {
      return 'Read';
    }
    return '';
  }, [acmRows, appliedOrgId, appliedBranchId, appliedDeptId]);

  const displayLevel = useMemo(() => {
    if (open) return step;
    if (appliedDeptId) return 'dept';
    if (appliedBranchId) return 'branch';
    if (appliedOrgId) return 'org';
    return step;
  }, [open, step, appliedDeptId, appliedBranchId, appliedOrgId]);

  const stepTitle =
    displayLevel === 'org'
      ? t('common.organization') || 'Organization'
      : displayLevel === 'branch'
        ? t('common.branch') || 'Branch'
        : t('common.department') || 'Department';

  const handleBack = () => {
    if (step === 'dept') {
      setDraftDeptId('');
      setStep('branch');
    } else if (step === 'branch') {
      setDraftBranchId('');
      setStep('org');
    }
  };

  const handlePickOrg = (orgId) => {
    setDraftOrgId(orgId);
    setStep('branch');
    setOpen(true);
  };

  const handlePickBranch = (branchId) => {
    setDraftBranchId(branchId);
    setStep('dept');
    setOpen(true);
  };

  const handlePickDept = (deptId) => {
    setDraftDeptId(deptId);
  };

  const handleSelect = () => {
    if (!draftOrgId) return;
    applySelection();
    setOpen(false);
    setTimeout(() => {
      window.location.reload();
    }, 50);
  };

  const listItems =
    step === 'org'
      ? orgs.map((o) => ({
          id: o.org_id,
          label: o.text || o.org_id,
          selected: o.org_id === draftOrgId,
          onClick: () => handlePickOrg(o.org_id),
        }))
      : step === 'branch'
        ? branches.map((b) => ({
            id: b.branch_id,
            label: b.text || b.branch_id,
            selected: b.branch_id === draftBranchId,
            onClick: () => handlePickBranch(b.branch_id),
          }))
        : departments.map((d) => ({
            id: d.dept_id,
            label: d.text || d.dept_id,
            selected: d.dept_id === draftDeptId,
            onClick: () => handlePickDept(d.dept_id),
          }));

  const triggerAccess = open ? selectionAccess : appliedAccess || selectionAccess;

  if (!orgs.length && !loading && !draftOrgId) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 mr-3" ref={rootRef}>
      <div className="relative w-[220px]">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-between gap-2 border border-gray-300 rounded px-2.5 py-1.5 text-xs bg-white text-[#0E2F4B] hover:bg-gray-50"
        >
          <span className="truncate text-left min-w-0 flex-1">
            <span className="text-[10px] text-gray-500 block leading-none mb-0.5">
              {stepTitle}
            </span>
            <span className="font-medium">{triggerLabel}</span>
          </span>
          <span className="flex items-center gap-1.5 shrink-0">
            {triggerAccess && (
              <span
                className={`text-[10px] font-medium ${
                  triggerAccess === 'Write' ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {triggerAccess}
              </span>
            )}
            <ChevronDown
              size={14}
              className={`text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
            />
          </span>
        </button>

        {open && (
          <div className="absolute right-0 mt-1 w-full min-w-[240px] bg-white border border-gray-200 rounded shadow-lg z-[60] overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-2 border-b bg-[#EDF3F7]">
              {step !== 'org' && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="p-1 rounded hover:bg-white/80 text-[#0E2F4B]"
                  aria-label="Back"
                  title="Back"
                >
                  <ArrowLeft size={16} />
                </button>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  {stepTitle}
                </p>
                {(step === 'branch' || step === 'dept') && orgLabel && (
                  <p className="text-[10px] text-[#0E2F4B] truncate">
                    {orgLabel}
                    {step === 'dept' && branchLabel ? ` › ${branchLabel}` : ''}
                  </p>
                )}
              </div>
              {selectionAccess && (
                <span
                  className={`shrink-0 text-[10px] font-medium pr-1 ${
                    selectionAccess === 'Write' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {selectionAccess}
                </span>
              )}
            </div>

            <div className="max-h-56 overflow-y-auto">
              {loading ? (
                <div className="px-3 py-3 text-xs text-gray-500">
                  {t('common.loading') || 'Loading...'}
                </div>
              ) : listItems.length === 0 ? (
                <div className="px-3 py-3 text-xs text-gray-500">
                  {t('common.noDataFound') || 'No data found'}
                </div>
              ) : (
                listItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-100 truncate ${
                      item.selected ? 'bg-gray-100 font-semibold text-[#0E2F4B]' : 'text-gray-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))
              )}
            </div>

            <div className="border-t px-2 py-2 bg-white">
              <button
                type="button"
                onClick={handleSelect}
                disabled={!draftOrgId || loading}
                className={`w-full h-[32px] rounded text-xs font-semibold text-white ${
                  dirty ? 'bg-[#0E2F4B] hover:bg-[#163a5c]' : 'bg-gray-400'
                } disabled:opacity-50`}
                title={
                  draftDeptId
                    ? 'Filter by organization, branch and department'
                    : draftBranchId
                      ? 'Filter by organization and branch'
                      : 'Filter by organization'
                }
              >
                {t('common.save') || 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
