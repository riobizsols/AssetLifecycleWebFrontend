import React, { useCallback, useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox,
  Search,
  X,
} from 'lucide-react';
import {
  ReportAdvancedFilters,
  ReportColumnControls,
  ReportPreviewButton,
} from '../../../components/reportModels/ReportExtras';
import StockStatusBadge from '../../../components/consumables/StockStatusBadge';
import { cellText, columnByLabel, TXN_TONES } from './config';

const PAGE_SIZES = [10, 25, 50, 100];

function Cell({ col, row }) {
  const text = cellText(col, row);
  if (col.kind === 'status') return <StockStatusBadge status={row.stock_status} />;
  if (col.kind === 'txn') {
    return (
      <span
        className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
          TXN_TONES[row.txn_type] || 'bg-slate-50 text-slate-700 ring-slate-200'
        }`}
      >
        {text}
      </span>
    );
  }
  if (col.kind === 'signed') {
    const v = Number(col.value(row));
    const tone = v > 0 ? 'text-emerald-600' : v < 0 ? 'text-rose-600' : 'text-slate-500';
    return <span className={`font-semibold ${tone}`}>{text}</span>;
  }
  if (!text) return <span className="text-slate-300">—</span>;
  if (col.maxWidth) {
    return (
      <span className="block truncate" style={{ maxWidth: col.maxWidth }} title={text}>
        {text}
      </span>
    );
  }
  return text;
}

export default function DatasetTab({ view, rows, loading, onPreview }) {
  const {
    dataset,
    columns,
    setColumns,
    allColumns,
    defaultColumns,
    search,
    setSearch,
    advanced,
    setAdvanced,
    sort,
    toggleSort,
    filtered,
    pageRows,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageCount,
    total,
  } = view;

  const visibleCols = useMemo(
    () => columns.map((l) => columnByLabel(dataset, l)).filter(Boolean),
    [columns, dataset],
  );

  const getFilterOptions = useCallback(
    (key) => {
      const field = dataset.advancedFields.find((f) => f.key === key);
      if (field?.domain) return field.domain;
      const col = columnByLabel(dataset, key);
      if (!col) return [];
      const values = new Set();
      (rows || []).forEach((r) => {
        const v = col.value(r);
        if (v != null && v !== '') values.add(String(v));
      });
      return [...values].sort((a, b) => a.localeCompare(b));
    },
    [dataset, rows],
  );

  const from = filtered.length ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, filtered.length);
  const isNarrowed = filtered.length !== total;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{dataset.title}</p>
          <p className="text-xs text-slate-500">{dataset.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-52 rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-7 text-sm focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <ReportColumnControls
            allColumns={allColumns}
            columns={columns}
            setColumns={setColumns}
            defaultColumns={defaultColumns}
          />
          <ReportPreviewButton onClick={onPreview} disabled={loading || !filtered.length} />
        </div>
      </div>

      <ReportAdvancedFilters
        fields={dataset.advancedFields}
        value={advanced}
        onChange={setAdvanced}
        getFilterOptions={getFilterOptions}
      />

      <div className="relative overflow-hidden rounded-xl border border-slate-200">
        {loading ? (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-slate-100">
            <div className="h-full w-1/3 animate-[pulse_1s_ease-in-out_infinite] bg-[#0E2F4B]" />
          </div>
        ) : null}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-[#0E2F4B] text-white">
              <tr>
                {visibleCols.map((col) => {
                  const active = sort?.label === col.label;
                  const SortIcon = active ? (sort.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <th
                      key={col.label}
                      className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide ${
                        col.numeric ? 'text-right' : 'text-left'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.label)}
                        className={`inline-flex items-center gap-1 uppercase ${col.numeric ? 'flex-row-reverse' : ''} ${
                          active ? 'text-[#FFC107]' : 'text-white hover:text-white/80'
                        }`}
                      >
                        {col.label}
                        <SortIcon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading && !pageRows.length ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {visibleCols.map((col) => (
                      <td key={col.label} className="px-3 py-3">
                        <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : pageRows.length ? (
                pageRows.map((row) => (
                  <tr key={dataset.rowKey(row)} className="transition-colors hover:bg-slate-50/80">
                    {visibleCols.map((col) => (
                      <td
                        key={col.label}
                        className={`whitespace-nowrap px-3 py-2.5 text-slate-700 ${
                          col.numeric ? 'text-right tabular-nums' : ''
                        }`}
                      >
                        <Cell col={col} row={row} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={visibleCols.length} className="px-4 py-14 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Inbox className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-600">No records match</p>
                    <p className="text-xs text-slate-400">
                      Try widening the period or clearing some filters.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm focus:outline-none"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-slate-400">
            {from}–{to} of {filtered.length.toLocaleString('en-IN')}
            {isNarrowed ? ` (filtered from ${total.toLocaleString('en-IN')})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {[
            { icon: ChevronsLeft, to: 1, disabled: page <= 1, label: 'First page' },
            { icon: ChevronLeft, to: page - 1, disabled: page <= 1, label: 'Previous page' },
          ].map(({ icon, to: target, disabled, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPage(target)}
              disabled={disabled}
              aria-label={label}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              {React.createElement(icon, { className: "h-4 w-4" })}
            </button>
          ))}
          <span className="px-2 tabular-nums">
            Page {page} of {pageCount}
          </span>
          {[
            { icon: ChevronRight, to: page + 1, disabled: page >= pageCount, label: 'Next page' },
            { icon: ChevronsRight, to: pageCount, disabled: page >= pageCount, label: 'Last page' },
          ].map(({ icon, to: target, disabled, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPage(target)}
              disabled={disabled}
              aria-label={label}
              className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              {React.createElement(icon, { className: "h-4 w-4" })}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
