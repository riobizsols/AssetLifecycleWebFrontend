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

const COLORS = [
  '#0E2F4B',
  '#143d65',
  '#1e5a8a',
  '#334155',
  '#475569',
  '#64748b',
  '#0ea5e9',
  '#0369a1',
  '#94a3b8',
];

/** Breakdown by real asset types from master data (not invented category buckets). */
export default function AssetTypesTab({ summary, loading }) {
  const rows = summary?.assetTypeDistribution || [];
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const chartRows = useMemo(
    () =>
      rows
        .filter((r) => Number(r.asset_count) > 0)
        .slice(0, 12)
        .map((r) => ({
          ...r,
          label:
            String(r.asset_type || 'Unassigned').length > 28
              ? `${String(r.asset_type).slice(0, 26)}…`
              : r.asset_type || 'Unassigned',
        })),
    [rows],
  );

  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (loading) {
    return <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 relative z-0">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Assets by type</h3>
          <p className="text-xs text-slate-500 mb-3">Top asset types in the current filter scope</p>
          <div className="h-64">
            {chartRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartRows}
                  layout="vertical"
                  margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={140}
                    tick={{ fontSize: 10, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(value, _name, props) => [value, props?.payload?.asset_type || 'Assets']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="asset_count" name="Assets" fill="#0E2F4B" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                No asset type data
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Type mix</h3>
          <p className="text-xs text-slate-500 mb-3">Share of assets across types</p>
          <div className="h-64 flex items-center justify-center">
            {chartRows.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartRows}
                    dataKey="asset_count"
                    nameKey="asset_type"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={88}
                    paddingAngle={2}
                  >
                    {chartRows.map((_, idx) => (
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
              <div className="text-sm text-slate-400">No type mix to chart</div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
          <span>
            Showing {from}–{to} of {total.toLocaleString('en-IN')} asset types
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
                <th className="px-3 py-2.5 font-medium">Asset type</th>
                <th className="px-3 py-2.5 font-medium text-right">Assets</th>
                <th className="px-3 py-2.5 font-medium text-right">Share %</th>
                <th className="px-3 py-2.5 font-medium text-right">Acquisition (₹)</th>
                <th className="px-3 py-2.5 font-medium text-right">Book value (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {!pageRows.length && (
                <tr>
                  <td colSpan={5} className="px-3 py-10 text-center text-slate-500">
                    No asset type data
                  </td>
                </tr>
              )}
              {pageRows.map((r) => (
                <tr key={r.asset_type_id || r.asset_type} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2.5 text-slate-800">{r.asset_type}</td>
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
