import React from 'react';
import { Link } from 'react-router-dom';
import { Eye, Loader2, Link2 } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
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
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100">
        <h2 className="text-lg font-semibold text-slate-900">Configure report</h2>
        <p className="text-sm text-slate-500 mt-1">
          Choose the audit criteria, then generate a report for the mapped assets.
        </p>
      </div>

      <div className="p-6 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 relative z-10">
            <label className="block text-sm font-medium text-slate-700">Audit type</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
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

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Audit period</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">From</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">To</label>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">Asset types</label>
              <p className="text-xs text-slate-500 mt-0.5">
                Only asset types mapped to this audit type are listed. History is pulled from those
                assets for the selected period.{' '}
                <Link
                  to="/master-data/audit-type-mapping"
                  className="inline-flex items-center gap-1 font-medium text-[#143d65] hover:underline"
                >
                  <Link2 className="w-3 h-3" />
                  Manage mappings
                </Link>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!assetTypeOptions.length}
                onClick={() => setSelectedAssetTypes(assetTypeOptions.map((o) => o.value))}
                className="text-xs font-medium text-[#143d65] hover:underline disabled:opacity-40"
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

        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={!canView || loadingView}
            onClick={onView}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#143d65] hover:bg-[#1e5a8a] disabled:opacity-50"
          >
            {loadingView ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            View report
          </button>
        </div>
      </div>
    </section>
  );
}
