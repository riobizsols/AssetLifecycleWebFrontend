import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, Link2 } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import {
  ReportAdvancedFilters,
  ReportPreviewButton,
} from '../../../components/reportModels/ReportExtras';
import { AUDIT_REPORT_ADVANCED_FIELDS } from '../newReportExtrasConfig';
import { CURRENT_YEAR } from './constants';

export default function ConfigurePanel({
  auditTypes,
  audtpId,
  setAudtpId,
  period,
  setPeriod,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  loadingTypes,
  loadingMapped,
  assetTypeOptions,
  selectedAssetTypes,
  setSelectedAssetTypes,
  selectedAssetTypeChips,
  canView,
  loadingView,
  onView,
  onClearReport,
  advanced = [],
  setAdvanced,
  statusDomain = [],
  onPreview,
  previewDisabled,
}) {
  const advancedFields = useMemo(
    () =>
      AUDIT_REPORT_ADVANCED_FIELDS.map((f) =>
        f.key === 'status' ? { ...f, domain: statusDomain } : f,
      ),
    [statusDomain],
  );

  const getFilterOptions = (fieldKey) => {
    if (fieldKey === 'status') {
      return (statusDomain || []).map((s) => ({ value: String(s), label: String(s) }));
    }
    return null;
  };

  return (
    <section className="relative z-10 overflow-visible rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <p className="text-sm font-semibold text-slate-900">Configure report</p>
        <div className="flex flex-wrap items-center gap-2">
          {onPreview ? (
            <ReportPreviewButton onClick={onPreview} disabled={previewDisabled || loadingView} />
          ) : null}
          <button
            type="button"
            disabled={!canView || loadingView}
            onClick={onView}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E2F4B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:opacity-50"
          >
            {loadingView ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            View report
          </button>
        </div>
      </div>

      <div className="p-4 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 relative z-10">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Audit type
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
              value={audtpId}
              onChange={(e) => {
                setAudtpId(e.target.value);
                onClearReport?.();
              }}
            >
              <option value="">
                {loadingTypes ? 'Loading audit types…' : 'Select audit type'}
              </option>
              {auditTypes.map((t) => (
                <option key={t.audtp_id} value={t.audtp_id}>
                  {t.description || t.audtp_id}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Audit period
            </label>
            <select
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="current_year">Current year ({CURRENT_YEAR})</option>
              <option value="last_year">Last year ({CURRENT_YEAR - 1})</option>
              <option value="specific">Specific range</option>
            </select>
          </div>
        </div>

        {period === 'specific' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                From
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                To
              </label>
              <input
                type="date"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Asset types
              </label>
              <Link
                to="/master-data/audit-type-mapping"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#0E2F4B] hover:underline"
              >
                <Link2 className="w-3 h-3" />
                Manage mappings
              </Link>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!assetTypeOptions.length}
                onClick={() => setSelectedAssetTypes(assetTypeOptions.map((o) => o.value))}
                className="text-xs font-medium text-[#0E2F4B] hover:underline disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                disabled={!selectedAssetTypes.length}
                onClick={() => setSelectedAssetTypes([])}
                className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-40"
              >
                Clear
              </button>
            </div>
          </div>

          <DropdownMultiSelect
            options={assetTypeOptions}
            values={selectedAssetTypes}
            onChange={setSelectedAssetTypes}
            hideSelectedText
            placeholder={
              !audtpId
                ? 'Select an audit type first'
                : loadingMapped
                  ? 'Loading mapped types…'
                  : assetTypeOptions.length
                    ? 'Select asset types'
                    : 'No asset types mapped'
            }
          />

          {selectedAssetTypeChips.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {selectedAssetTypeChips.map((chip) => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {chip.label}
                  <button
                    type="button"
                    aria-label={`Remove ${chip.label}`}
                    className="text-slate-400 hover:text-slate-700"
                    onClick={() =>
                      setSelectedAssetTypes((prev) => prev.filter((id) => id !== chip.id))
                    }
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
    </section>
  );
}
