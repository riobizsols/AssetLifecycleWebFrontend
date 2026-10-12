import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Inbox,
  Pencil,
  Search,
  Trash2,
  X,
} from 'lucide-react';

const PAGE_SIZES = [10, 25, 50];

/**
 * columns: [{ key, label, align?: 'right', render?: (row) => node,
 *             sortValue?: (row) => value, sortable?: boolean, className?: string,
 *             maxWidth?: number — truncates with "…" and shows the full text on hover,
 *             title?: (row) => string — hover text (defaults to row[key]) }]
 * searchKeys: extra row keys included in the text search (defaults to column keys).
 * filters: toolbar nodes rendered next to the search box.
 * rowActions: (row) => node — extra buttons shown before Edit / Delete (also for read-only users).
 * resetKey: changes when external filters change, so paging returns to page 1.
 */
export default function ConsumablesDataTable({
  title,
  description,
  columns,
  rows,
  rowKey,
  searchKeys,
  filters,
  filtersActive = false,
  resetKey,
  onClearFilters,
  canEdit = false,
  onEdit,
  onDelete,
  rowActions,
  emptyIcon: EmptyIcon = Inbox,
  emptyText = 'No records yet.',
  emptyAction,
  defaultSort,
}) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(defaultSort || null);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [page, setPage] = useState(1);

  const keys = useMemo(
    () => Array.from(new Set([...(searchKeys || []), ...columns.map((c) => c.key)])),
    [columns, searchKeys],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => keys.some((k) => String(row[k] ?? '').toLowerCase().includes(q)));
  }, [rows, keys, query]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return filtered;
    const get = col.sortValue || ((r) => r[col.key]);
    const dir = sort.dir === 'desc' ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const na = Number(va);
      const nb = Number(vb);
      if (Number.isFinite(na) && Number.isFinite(nb) && va !== '' && vb !== '') return (na - nb) * dir;
      return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  useEffect(() => {
    setPage(1);
  }, [query, pageSize, resetKey]);
  const safePage = Math.min(page, pageCount);
  const pageRows = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key) =>
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return null;
    });

  const canEditRows = canEdit && (onEdit || onDelete);
  const showActions = canEditRows || !!rowActions;
  const isFiltering = !!query.trim() || filtersActive;
  const colSpan = columns.length + (showActions ? 1 : 0);

  return (
    <section className="overflow-hidden rounded-lg border border-[#D7E0EA] bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E8EEF4] px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-[#0E2F4B]">
            {title}
            <span className="ml-2 rounded-full bg-[#F3F6F9] px-2 py-0.5 text-[11px] font-medium text-[#5A6B7C]">
              {isFiltering ? `${sorted.length} of ${rows.length}` : rows.length}
            </span>
          </h2>
          {description ? <p className="mt-0.5 text-xs text-[#5A6B7C]">{description}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters}
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8A9AAA]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 w-56 rounded-md border border-[#C9D5E3] bg-white pl-8 pr-7 text-sm text-[#0E2F4B] outline-none transition focus:border-[#0E2F4B] focus:ring-2 focus:ring-[#0E2F4B]/15"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8A9AAA] hover:text-[#0E2F4B]"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-[#F8FAFC] text-left text-[11px] font-semibold uppercase tracking-wide text-[#5A6B7C]">
            <tr className="border-b border-[#E8EEF4]">
              {columns.map((col) => {
                const sortable = col.sortable !== false;
                const active = sort?.key === col.key;
                const SortIcon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={col.key}
                    className={`whitespace-nowrap px-4 py-2.5 ${col.align === 'right' ? 'text-right' : ''}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 uppercase tracking-wide hover:text-[#0E2F4B] ${
                          active ? 'text-[#0E2F4B]' : ''
                        } ${col.align === 'right' ? 'flex-row-reverse' : ''}`}
                      >
                        {col.label}
                        <SortIcon className={`h-3 w-3 ${active ? '' : 'opacity-40'}`} />
                      </button>
                    ) : (
                      col.label
                    )}
                  </th>
                );
              })}
              {showActions ? <th className="px-4 py-2.5 text-right">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0F3F7] text-[#0E2F4B]">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-14">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F6F9] text-[#8A9AAA]">
                      {React.createElement(isFiltering ? Search : EmptyIcon, { className: 'h-5 w-5' })}
                    </span>
                    <p className="text-sm font-medium text-[#0E2F4B]">
                      {isFiltering ? 'No matching records' : emptyText}
                    </p>
                    {isFiltering ? (
                      <button
                        type="button"
                        onClick={() => {
                          setQuery('');
                          onClearFilters?.();
                        }}
                        className="text-xs font-medium text-[#1F5E99] hover:underline"
                      >
                        Clear search and filters
                      </button>
                    ) : (
                      emptyAction
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr key={row[rowKey]} className="group transition-colors hover:bg-[#F8FAFC]">
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row)
                      : row[col.key] ?? <span className="text-[#A0AEBB]">—</span>;
                    const fullText = col.title ? col.title(row) : row[col.key];
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 align-middle ${
                          col.align === 'right' ? 'text-right tabular-nums' : ''
                        } ${col.className || ''}`}
                      >
                        {col.maxWidth ? (
                          <div
                            className="truncate [&_div]:truncate"
                            style={{ maxWidth: col.maxWidth }}
                            title={fullText ? String(fullText) : undefined}
                          >
                            {content}
                          </div>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                  {showActions ? (
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex gap-1 opacity-70 transition group-hover:opacity-100">
                        {rowActions ? rowActions(row) : null}
                        {canEditRows && onEdit ? (
                          <button
                            type="button"
                            onClick={() => onEdit(row)}
                            title="Edit"
                            aria-label="Edit"
                            className="rounded-md p-1.5 text-[#33506B] hover:bg-[#E8EFF6] hover:text-[#0E2F4B]"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        ) : null}
                        {canEditRows && onDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(row)}
                            title="Delete"
                            aria-label="Delete"
                            className="rounded-md p-1.5 text-[#B42318] hover:bg-[#FEF3F2]"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > PAGE_SIZES[0] ? (
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8EEF4] px-4 py-2.5 text-xs text-[#5A6B7C]">
          <div className="flex items-center gap-2">
            Rows per page
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-[#C9D5E3] bg-white px-2 py-1 text-xs text-[#0E2F4B] outline-none"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sorted.length)} of{' '}
              {sorted.length}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="rounded-md border border-[#C9D5E3] p-1 text-[#0E2F4B] hover:bg-[#F3F6F9] disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={safePage >= pageCount}
                className="rounded-md border border-[#C9D5E3] p-1 text-[#0E2F4B] hover:bg-[#F3F6F9] disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

/** Compact select used in table toolbars. */
export function ToolbarSelect({ value, onChange, children, label }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className="h-9 max-w-[220px] truncate rounded-md border border-[#C9D5E3] bg-white px-2.5 text-sm text-[#0E2F4B] outline-none transition focus:border-[#0E2F4B] focus:ring-2 focus:ring-[#0E2F4B]/15"
    >
      {children}
    </select>
  );
}
