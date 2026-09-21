import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatInr, formatInrCurrency, PAGE_SIZE_OPTIONS } from './utils';

const COLUMN_HINTS = {
  share: 'Share % = (assets in that category ÷ total assets in scope) × 100',
  acquisition: 'Acquisition (₹) = sum of purchase cost (purchased_cost) for assets in that category',
  book: 'Book value (₹) = current book value, or purchase cost − accumulated depreciation when book value is missing',
};

function ColumnHint({ children, text }) {
  return (
    <span className="relative inline-flex justify-end group/hint">
      <span className="cursor-help underline decoration-dotted decoration-slate-400 underline-offset-2">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-[60] mt-1.5 w-max max-w-[260px] -translate-x-1/2 rounded-md bg-slate-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal leading-snug text-white shadow-lg opacity-0 group-hover/hint:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

const COLORS = [
  '#0f172a',
  '#1e3a5f',
  '#334155',
  '#475569',
  '#64748b',
  '#94a3b8',
  '#0ea5e9',
  '#0369a1',
  '#cbd5e1',
];

export default function CategoriesTab({ summary, loading }) {
  const categories = summary?.categoryDistribution || [];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const withAssets = useMemo(
    () => categories.filter((c) => Number(c.asset_count) > 0),
    [categories],
  );

  const total = categories.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [categories, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return categories.slice(start, start + pageSize);
  }, [categories, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading) {
    return <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 relative z-0">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Asset count by category</h3>
          <p className="text-xs text-slate-500 mb-3">
            Compare how many assets sit in each category.
          </p>
          <div className="h-64">
            {withAssets.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={withAssets}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={120}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="asset_count" name="Assets" fill="#0f172a" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No category data
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Category mix</h3>
          <p className="text-xs text-slate-500 mb-3">
            Share of total assets by category (proportion of the portfolio).
          </p>
          <div className="h-64 flex items-center justify-center">
            {withAssets.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={withAssets}
                    dataKey="asset_count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {withAssets.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-slate-400">No category mix to chart</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Showing {from}–{to} of {total.toLocaleString('en-IN')}
          </span>
          <label className="inline-flex items-center gap-2">
            <span className="text-xs text-slate-500">Rows</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300"
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
                <th className="px-3 py-2.5 font-medium">Category</th>
                <th className="px-3 py-2.5 font-medium text-right">Assets</th>
                <th className="relative z-[50] px-3 py-2.5 font-medium text-right">
                  <ColumnHint text={COLUMN_HINTS.share}>Share %</ColumnHint>
                </th>
                <th className="relative z-[50] px-3 py-2.5 font-medium text-right">
                  <ColumnHint text={COLUMN_HINTS.acquisition}>Acquisition (₹)</ColumnHint>
                </th>
                <th className="relative z-[50] px-3 py-2.5 font-medium text-right">
                  <ColumnHint text={COLUMN_HINTS.book}>Book value (₹)</ColumnHint>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                    No category data
                  </td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr key={r.category} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5 text-slate-800">{r.category}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.asset_count}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.share_pct}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatInr(r.acquisition_value)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {formatInrCurrency(r.book_value).replace('₹ ', '')}
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
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40"
            >
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
