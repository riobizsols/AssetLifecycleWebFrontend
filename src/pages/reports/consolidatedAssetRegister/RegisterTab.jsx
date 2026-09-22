import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import { ReportColumnControls, ReportTableToolbar } from '../../../components/reportModels/ReportExtras';
import { PAGE_SIZE_OPTIONS } from './utils';
import {
  CONSOLIDATED_REGISTER_COLUMNS,
  getConsolidatedCellValue,
  isNumericConsolidatedColumn,
} from '../newReportExtrasConfig';

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

export default function RegisterTab({
  register,
  loading,
  page,
  setPage,
  pageSize,
  setPageSize,
  registerDraft,
  setRegisterDraft,
  assetTypes,
  statuses,
  onApplyRegisterFilters,
  onResetRegisterFilters,
  columns,
  setColumns,
}) {
  const totalPages = register?.totalPages || 1;
  const total = register?.total || 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const assetTypeOpts = useMemo(() => toDropdownOptions(assetTypes), [assetTypes]);
  const statusOpts = useMemo(() => toDropdownOptions(statuses), [statuses]);

  const visibleColumns =
    columns?.length > 0 ? columns : CONSOLIDATED_REGISTER_COLUMNS.default;

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <FilterField label="Asset type">
            <DropdownMultiSelect
              values={registerDraft.assetTypeIds || []}
              options={assetTypeOpts}
              placeholder="All asset types"
              onChange={(next) =>
                setRegisterDraft((d) => ({ ...d, assetTypeIds: next }))
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
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
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
              onClick={onResetRegisterFilters}
              disabled={loading}
              className="rounded-lg border border-slate-200 bg-white min-w-[88px] px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onApplyRegisterFilters}
              disabled={loading}
              className="rounded-lg bg-[#0E2F4B] min-w-[88px] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:opacity-50"
            >
              Apply
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

      {setColumns ? (
        <ReportTableToolbar
          title="Asset register"
          columnsSlot={
            <ReportColumnControls
              allColumns={CONSOLIDATED_REGISTER_COLUMNS.all}
              columns={visibleColumns}
              setColumns={setColumns}
              defaultColumns={CONSOLIDATED_REGISTER_COLUMNS.default}
            />
          }
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-[#0E2F4B] text-white">
            <tr>
              {visibleColumns.map((h) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${
                    isNumericConsolidatedColumn(h) ? 'text-right' : 'text-left'
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  Loading register…
                </td>
              </tr>
            )}
            {!loading && !register?.rows?.length && (
              <tr>
                <td
                  colSpan={visibleColumns.length}
                  className="px-3 py-10 text-center text-slate-500"
                >
                  No assets match the current filters
                </td>
              </tr>
            )}
            {!loading &&
              register?.rows?.map((r) => (
                <tr key={r.asset_id} className="hover:bg-slate-50/80">
                  {visibleColumns.map((col) => (
                    <td
                      key={col}
                      className={`px-3 py-2 text-slate-800 whitespace-nowrap ${
                        isNumericConsolidatedColumn(col)
                          ? 'text-right tabular-nums'
                          : ''
                      } ${col === 'Asset ID' ? 'font-medium text-slate-900' : ''}`}
                      title={
                        col === 'Campus' || col === 'Type'
                          ? getConsolidatedCellValue(r, col)
                          : undefined
                      }
                    >
                      {getConsolidatedCellValue(r, col)}
                    </td>
                  ))}
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
