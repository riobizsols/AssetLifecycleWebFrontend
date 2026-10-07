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
  properties = [],
  loading,
  onApply,
  onReset,
  advanced = [],
  setAdvanced,
  onPreview,
  previewDisabled,
  institutionLocked = false,
}) {
  const institutionOpts = useMemo(() => toDropdownOptions(institutions), [institutions]);
  const campusOpts = useMemo(() => toDropdownOptions(campuses), [campuses]);
  const departmentOpts = useMemo(() => toDropdownOptions(departments), [departments]);

  const hasInstitution = (draft.orgIds || []).length > 0;
  const hasCampus = (draft.branchIds || []).length > 0;

  const scopedProperties = useMemo(() => {
    const selectedOrgs = draft.orgIds || [];
    return (properties || []).filter((prop) => {
      if (!prop?.prop_id || !prop?.property) return false;
      if (!selectedOrgs.length) return true;
      return selectedOrgs.includes(String(prop.org_id));
    });
  }, [properties, draft.orgIds]);

  const advancedFields = useMemo(() => {
    const typeDomain = (assetTypes || []).map((c) => c.label || c.name || c.id).filter(Boolean);
    const statusDomain = (statuses || []).map((s) => s.label || s.name || s.id).filter(Boolean);
    const base = CONSOLIDATED_ADVANCED_FIELDS.map((f) => {
      if (f.key === 'assetType') return { ...f, domain: typeDomain, type: 'multiselect' };
      if (f.key === 'status') return { ...f, domain: statusDomain };
      return f;
    });

    const usedLabels = new Set(base.map((f) => f.label));
    const nameCount = scopedProperties.reduce((acc, prop) => {
      const name = String(prop.property);
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {});

    const propertyFields = scopedProperties.map((prop) => {
      const values = (Array.isArray(prop.list_values) ? prop.list_values : [])
        .map((value) => String(value).trim())
        .filter(Boolean);
      let label = String(prop.property);
      if (nameCount[label] > 1) label = `${label} (${prop.org_id})`;
      if (usedLabels.has(label)) label = `${label} (${prop.prop_id})`;
      usedLabels.add(label);
      return {
        key: `prop:${prop.prop_id}`,
        label,
        type: 'select',
        domain: values,
      };
    });

    return [...base, ...propertyFields];
  }, [assetTypes, statuses, scopedProperties]);

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
    if (String(fieldKey).startsWith('prop:')) {
      const field = advancedFields.find((f) => f.key === fieldKey);
      return (field?.domain || []).map((value) => ({ value, label: value }));
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
              disabled={institutionLocked}
              onChange={(orgIds) => {
                if (institutionLocked) return;
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
