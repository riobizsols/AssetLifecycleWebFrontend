import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Columns3,
  Eye,
  Filter,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { AdvancedBuilder } from './ReportComponents';

/**
 * Compact column picker popover — pick visible columns with search + checkboxes.
 */
export function ReportColumnControls({
  allColumns = [],
  columns = [],
  setColumns,
  defaultColumns = [],
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allColumns;
    return allColumns.filter((c) => String(c).toLowerCase().includes(q));
  }, [allColumns, query]);

  const toggle = (col) => {
    if (columns.includes(col)) {
      if (columns.length <= 1) return;
      setColumns(columns.filter((c) => c !== col));
    } else {
      setColumns([...columns, col]);
    }
  };

  const selectAll = () => setColumns([...allColumns]);
  const reset = () => setColumns([...(defaultColumns || [])]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
          open
            ? 'border-[#0E2F4B] bg-[#0E2F4B] text-white'
            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        }`}
      >
        <Columns3 className="h-4 w-4" />
        Columns
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
            open ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {columns.length}/{allColumns.length}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          <div className="border-b border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search columns…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm text-slate-800 outline-none focus:border-[#0E2F4B] focus:ring-2 focus:ring-[#0E2F4B]/15"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="text-[11px] font-medium text-[#0E2F4B] hover:underline"
              >
                Select all
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                <RotateCcw className="h-3 w-3" /> Reset
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.map((col) => {
              const on = columns.includes(col);
              return (
                <li key={col}>
                  <button
                    type="button"
                    onClick={() => toggle(col)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        on
                          ? 'border-[#0E2F4B] bg-[#0E2F4B] text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {on ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                    </span>
                    <span className={on ? 'font-medium text-slate-900' : 'text-slate-600'}>
                      {col}
                    </span>
                  </button>
                </li>
              );
            })}
            {!filtered.length && (
              <li className="px-3 py-6 text-center text-xs text-slate-400">No columns match</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/**
 * Collapsible advanced filters panel with enterprise chrome.
 */
export function ReportAdvancedFilters({
  fields = [],
  value = [],
  onChange,
  getFilterOptions,
  quickFilters = {},
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen || (value?.length > 0));
  if (!fields?.length) return null;

  const count = value?.length || 0;

  return (
    <div className="relative z-20 mt-4 overflow-visible rounded-xl border border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-slate-200 text-[#0E2F4B]">
            <Filter className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-semibold text-slate-900">Advanced filters</span>
            {count > 0 ? (
              <span className="block text-xs text-slate-500">
                {count} condition{count === 1 ? '' : 's'} active
              </span>
            ) : null}
          </span>
        </span>
        <span className="inline-flex items-center gap-2">
          {count > 0 && (
            <span className="rounded-full bg-[#0E2F4B] px-2 py-0.5 text-[10px] font-semibold text-white">
              {count}
            </span>
          )}
          <ChevronDown
            className={`h-4 w-4 text-slate-400 transition ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="relative z-30 overflow-visible rounded-b-xl border-t border-slate-200 bg-white px-4 py-4">
          <AdvancedBuilder
            fields={fields}
            value={value}
            onChange={onChange}
            quickFilters={quickFilters}
            getFilterOptions={getFilterOptions}
          />
          {count > 0 && (
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-medium text-slate-500 hover:text-rose-600"
              >
                Clear all conditions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReportPreviewButton({ onClick, disabled, label = 'Preview' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg border border-[#0E2F4B]/20 bg-[#0E2F4B]/[0.04] px-3.5 py-2 text-sm font-medium text-[#0E2F4B] transition hover:bg-[#0E2F4B]/10 disabled:cursor-not-allowed disabled:opacity-45"
    >
      <Eye className="h-4 w-4" />
      {label}
    </button>
  );
}

/**
 * Full-screen-feel preview modal with Summary / Applied filters / Data tabs.
 */
export function ReportPreviewModal({
  open,
  onClose,
  title = 'Preview',
  columns = [],
  rows = [],
  getCellValue,
  emptyLabel = 'No rows to preview',
  filterSummary = [],
  summaryItems = [],
}) {
  const [tab, setTab] = useState('summary');

  useEffect(() => {
    if (!open) return undefined;
    setTab('summary');
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'filters', label: 'Applied filters' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center p-0 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl">
        <div className="bg-[#0E2F4B] px-5 py-4 text-white border-b-4 border-[#FFC107]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#FFC107]">
                Report preview
              </p>
              <h3 className="mt-1 text-lg font-semibold tracking-tight">{title}</h3>
              <p className="mt-1 text-sm text-white/70">
                {rows.length.toLocaleString('en-IN')} row{rows.length === 1 ? '' : 's'}
                <span className="mx-1.5 text-white/30">·</span>
                {columns.length} column{columns.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 bg-white px-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-[#0E2F4B] text-[#0E2F4B]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {tab === 'summary' && (
            <div className="p-5">
              {summaryItems?.length ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {summaryItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {item.label}
                      </p>
                      <p className="mt-1.5 text-lg font-semibold tabular-nums text-slate-900">
                        {item.value ?? '—'}
                      </p>
                      {item.sub ? (
                        <p className="mt-1 text-xs text-slate-500">{item.sub}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-500">No summary available</p>
                </div>
              )}
            </div>
          )}

          {tab === 'filters' && (
            <div className="p-5">
              {filterSummary?.length ? (
                <div className="overflow-hidden rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0E2F4B] text-white">
                      <tr>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                          Filter
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filterSummary.map((item) => (
                        <tr key={`${item.label}-${item.value}`} className="hover:bg-slate-50/90">
                          <td className="whitespace-nowrap px-4 py-2.5 font-medium text-slate-600">
                            {item.label}
                          </td>
                          <td className="px-4 py-2.5 text-slate-800">{item.value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <p className="text-sm font-medium text-slate-500">No filters applied</p>
                </div>
              )}
            </div>
          )}

          {tab === 'data' && (
            !rows.length ? (
              <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Eye className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">{emptyLabel}</p>
              </div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 z-10 bg-[#0E2F4B] text-white">
                  <tr>
                    {columns.map((col) => (
                      <th
                        key={col}
                        className="whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {rows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/90">
                      {columns.map((col) => (
                        <td key={col} className="whitespace-nowrap px-4 py-2.5 text-slate-800">
                          {getCellValue ? getCellValue(row, col) : row[col] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 bg-white px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0E2F4B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#143d65]"
          >
            Close preview
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Toolbar strip for table headers: title + column picker + optional actions.
 */
export function ReportTableToolbar({ title, subtitle, columnsSlot, actions }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
      <div className="min-w-0">
        {title ? (
          <p className="text-sm font-semibold text-slate-900">{title}</p>
        ) : null}
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {columnsSlot}
        {actions}
      </div>
    </div>
  );
}

export function useReportColumns(defaultColumns, allColumns) {
  const defaults = useMemo(() => [...(defaultColumns || [])], [defaultColumns]);
  const all = useMemo(() => [...(allColumns || defaultColumns || [])], [allColumns, defaultColumns]);
  const [columns, setColumns] = useState(defaults);

  const resetColumns = () => setColumns([...defaults]);

  return { columns, setColumns, allColumns: all, defaultColumns: defaults, resetColumns };
}

/**
 * Client-side advanced filter matching for report row objects.
 */
export function applyAdvancedFilters(rows, advanced, fieldAccessors = {}) {
  if (!advanced?.length) return rows || [];

  return (rows || []).filter((row) =>
    advanced.every((cond) => {
      const accessor = fieldAccessors[cond.field];
      if (!accessor) return true;
      const cell = accessor(row);
      const op = cond.op || '=';
      const val = cond.val;

      if (val == null || val === '' || (Array.isArray(val) && !val.length)) return true;

      const cellStr = String(cell ?? '').toLowerCase();
      const valStr = String(val).toLowerCase();

      if (op === '=' || op === 'equals' || op === 'is') {
        if (Array.isArray(val)) {
          return val.map(String).map((v) => v.toLowerCase()).includes(cellStr);
        }
        return cellStr === valStr;
      }
      if (op === '!=' || op === 'not equals') {
        if (Array.isArray(val)) {
          return !val.map(String).map((v) => v.toLowerCase()).includes(cellStr);
        }
        return cellStr !== valStr;
      }
      if (op === 'contains' || op === 'like') return cellStr.includes(valStr);
      if (op === 'starts with') return cellStr.startsWith(valStr);
      if (op === 'ends with') return cellStr.endsWith(valStr);
      if (op === '≥' || op === '>=' || op === 'greater than or equal') {
        return Number(cell) >= Number(val);
      }
      if (op === '≤' || op === '<=' || op === 'less than or equal') {
        return Number(cell) <= Number(val);
      }
      if (op === 'has any' && Array.isArray(val)) {
        return val.map(String).map((v) => v.toLowerCase()).includes(cellStr);
      }
      if (op === 'has all' && Array.isArray(val)) {
        return val
          .map(String)
          .map((v) => v.toLowerCase())
          .every((v) => cellStr === v || cellStr.includes(v));
      }
      if (op === 'has none' && Array.isArray(val)) {
        return !val.map(String).map((v) => v.toLowerCase()).includes(cellStr);
      }
      return true;
    }),
  );
}
