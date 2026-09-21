import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import { formatInr, PAGE_SIZE_OPTIONS } from './utils';

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
      <label className="block text-xs font-medium text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

export default function RegisterTab({
  register,
  loading,
  page,
  setPage,
  pageSize,
  setPageSize,
  registerDraft,
  setRegisterDraft,
  categories,
  statuses,
  onApplyRegisterFilters,
  onResetRegisterFilters,
}) {
  const totalPages = register?.totalPages || 1;
  const total = register?.total || 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const categoryOpts = useMemo(() => toDropdownOptions(categories), [categories]);
  const statusOpts = useMemo(() => toDropdownOptions(statuses), [statuses]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <FilterField label="Category">
            <DropdownMultiSelect
              values={registerDraft.categories || []}
              options={categoryOpts}
              placeholder="All categories"
              onChange={(next) =>
                setRegisterDraft((d) => ({ ...d, categories: next }))
              }
            />
          </FilterField>

          <FilterField label="Status">
            <DropdownMultiSelect
              values={registerDraft.statuses || []}
              options={statusOpts}
              placeholder="All statuses"
              onChange={(next) =>
                setRegisterDraft((d) => ({ ...d, statuses: next }))
              }
            />
          </FilterField>

          <FilterField label="Search" className="!flex-none w-[180px] min-w-[150px] max-w-[200px]">
            <input
              type="text"
              value={registerDraft.search || ''}
              placeholder="Asset ID, serial…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
              onChange={(e) =>
                setRegisterDraft((d) => ({ ...d, search: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') onApplyRegisterFilters();
              }}
            />
          </FilterField>

          <div className="flex items-center gap-2 pb-0.5">
            <button
              type="button"
              onClick={onApplyRegisterFilters}
              disabled={loading}
              className="rounded-lg bg-slate-900 min-w-[88px] px-5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={onResetRegisterFilters}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white min-w-[88px] px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          Showing {from}–{to} of {total.toLocaleString('en-IN')} assets
        </span>
        <label className="inline-flex items-center gap-2">
          <span className="text-xs text-slate-500">Rows</span>
          <select
            value={pageSize}
            disabled={loading}
            onChange={(e) => {
              setPage(1);
              setPageSize(Number(e.target.value));
            }}
            className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300 disabled:opacity-50"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              {[
                'Institution',
                'Campus',
                'Dept',
                'Asset ID',
                'Serial',
                'Type',
                'Category',
                'Status',
                'Acquisition (₹)',
                'Book (₹)',
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                  Loading register…
                </td>
              </tr>
            )}
            {!loading && !register?.rows?.length && (
              <tr>
                <td colSpan={10} className="px-3 py-10 text-center text-slate-500">
                  No assets match the current filters
                </td>
              </tr>
            )}
            {!loading &&
              register?.rows?.map((r) => (
                <tr key={r.asset_id} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 text-slate-800 whitespace-nowrap">{r.institution}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[180px] truncate" title={r.campus}>
                    {r.campus}
                  </td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.department}</td>
                  <td className="px-3 py-2 font-medium text-slate-900 whitespace-nowrap">
                    {r.asset_id}
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.serial_number}</td>
                  <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate" title={r.asset_type}>
                    {r.asset_type}
                  </td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.category}</td>
                  <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{r.status}</td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {formatInr(r.acquisition_value)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                    {formatInr(r.book_value)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
