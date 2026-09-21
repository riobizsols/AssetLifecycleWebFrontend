import React, { useMemo } from 'react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';

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
    <div className={`min-w-[180px] flex-1 ${className}`.trim()}>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
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
  loading,
  onApply,
  onReset,
}) {
  const institutionOpts = useMemo(() => toDropdownOptions(institutions), [institutions]);
  const campusOpts = useMemo(() => toDropdownOptions(campuses), [campuses]);
  const departmentOpts = useMemo(() => toDropdownOptions(departments), [departments]);

  const hasInstitution = (draft.orgIds || []).length > 0;
  const hasCampus = (draft.branchIds || []).length > 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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

        <div className="flex items-center gap-2 pb-0.5">
          <button
            type="button"
            onClick={onApply}
            disabled={loading}
            className="rounded-lg bg-slate-900 min-w-[88px] px-6 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white min-w-[88px] px-6 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
