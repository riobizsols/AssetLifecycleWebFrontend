import React, { useMemo } from 'react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import {
  ReportAdvancedFilters,
  ReportPreviewButton,
} from '../../../components/reportModels/ReportExtras';
import { CONSOLIDATED_ADVANCED_FIELDS } from '../newReportExtrasConfig';

function toDropdownOptions(options = []) {
  return (options || [])
    .filter((o) => o && (o.id != null || o.value != null))
    .map((o) => ({
      value: String(o.id ?? o.value),
      label: String(o.label ?? o.name ?? o.id ?? o.value),
    }));
}

function FilterField({ label, children, className = '' }) {
  return (
    <div className={`min-w-[160px] flex-1 ${className}`.trim()}>
      <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}

export default function FiltersBar({
  draft,
  setDraft,
  institutions,
  campuses,
  departments,
  assetTypes = [],
  statuses = [],
  loading,
  onApply,
  onReset,
  advanced = [],
  setAdvanced,
  onPreview,
  previewDisabled,
}) {
  const institutionOpts = useMemo(() => toDropdownOptions(institutions), [institutions]);
  const campusOpts = useMemo(() => toDropdownOptions(campuses), [campuses]);
  const departmentOpts = useMemo(() => toDropdownOptions(departments), [departments]);

  const hasInstitution = (draft.orgIds || []).length > 0;
  const hasCampus = (draft.branchIds || []).length > 0;

  const advancedFields = useMemo(() => {
    const typeDomain = (assetTypes || []).map((c) => c.label || c.name || c.id).filter(Boolean);
    const statusDomain = (statuses || []).map((s) => s.label || s.name || s.id).filter(Boolean);
    return CONSOLIDATED_ADVANCED_FIELDS.map((f) => {
      if (f.key === 'assetType') return { ...f, domain: typeDomain, type: 'multiselect' };
      if (f.key === 'status') return { ...f, domain: statusDomain };
      return f;
    });
  }, [assetTypes, statuses]);

  const getFilterOptions = (fieldKey) => {
    if (fieldKey === 'assetType') {
      return (assetTypes || []).map((c) => ({
        value: String(c.label ?? c.name ?? c.id),
        label: String(c.label ?? c.name ?? c.id),
      }));
    }
    if (fieldKey === 'status') {
      return (statuses || []).map((s) => ({
        value: String(s.id ?? s.label),
        label: String(s.label ?? s.name ?? s.id),
      }));
    }
    return null;
  };

  return (
    <div className="relative z-10 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Filters</p>
        <div className="flex flex-wrap items-center gap-2">
          {onPreview ? (
            <ReportPreviewButton onClick={onPreview} disabled={previewDisabled || loading} />
          ) : null}
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="rounded-lg bg-[#0E2F4B] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Institution">
            <DropdownMultiSelect
              values={draft.orgIds || []}
              options={institutionOpts}
              placeholder={loading ? 'Loading…' : 'Select institution'}
              onChange={(orgIds) => {
                setDraft((d) => ({
                  ...d,
                  orgIds,
                  branchIds: [],
                  deptIds: [],
                }));
              }}
            />
          </FilterField>

          <FilterField label="Campus">
            <div className={!hasInstitution ? 'pointer-events-none opacity-50' : ''}>
              <DropdownMultiSelect
                values={hasInstitution ? draft.branchIds || [] : []}
                options={campusOpts}
                placeholder={
                  !hasInstitution
                    ? 'Select institution first'
                    : loading
                      ? 'Loading…'
                      : 'All campuses'
                }
                onChange={(branchIds) => {
                  if (!hasInstitution) return;
                  setDraft((d) => ({
                    ...d,
                    branchIds,
                    deptIds: [],
                  }));
                }}
              />
            </div>
          </FilterField>

          <FilterField label="Department">
            <div className={!hasInstitution ? 'pointer-events-none opacity-50' : ''}>
              <DropdownMultiSelect
                values={hasInstitution ? draft.deptIds || [] : []}
                options={departmentOpts}
                placeholder={
                  !hasInstitution
                    ? 'Select institution first'
                    : hasCampus
                      ? 'All departments (campus)'
                      : loading
                        ? 'Loading…'
                        : 'All departments'
                }
                onChange={(deptIds) => {
                  if (!hasInstitution) return;
                  setDraft((d) => ({ ...d, deptIds }));
                }}
              />
            </div>
          </FilterField>
        </div>

        {setAdvanced ? (
          <ReportAdvancedFilters
            fields={advancedFields}
            value={advanced}
            onChange={setAdvanced}
            getFilterOptions={getFilterOptions}
          />
        ) : null}
      </div>
    </div>
  );
}
