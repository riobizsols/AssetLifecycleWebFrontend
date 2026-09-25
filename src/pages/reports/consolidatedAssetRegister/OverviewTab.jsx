import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatInr, formatInrCurrency, PAGE_SIZE_OPTIONS } from './utils';

function isNumericHeader(header) {
  return /assets|acquisition|depreciation|book\s*value|share/i.test(String(header || ''));
}

function isNumericCell(cell) {
  if (typeof cell === 'number') return true;
  const s = String(cell ?? '').trim();
  if (!s) return false;
  if (s.startsWith('₹')) return true;
  return /^[\d,.]+%?$/.test(s) && !Number.isNaN(Number(s.replace(/[,%]/g, '')));
}

function DataTable({ headers, rows, emptyLabel }) {
  if (!rows?.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        {emptyLabel || 'No data for current filters'}
      </div>
    );
  }

  const numericCols = headers.map((h, idx) => {
    if (isNumericHeader(h)) return true;
    return rows.some((row) => isNumericCell(row[idx]));
  });

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            {headers.map((h, idx) => (
              <th
                key={h}
                className={`px-3 py-2.5 font-medium whitespace-nowrap ${
                  numericCols[idx] ? 'text-right' : 'text-left'
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50/80">
              {row.map((cell, cIdx) => (
                <td
                  key={cIdx}
                  className={`px-3 py-2.5 text-slate-800 ${
                    numericCols[cIdx] || isNumericCell(cell)
                      ? 'text-right tabular-nums'
                      : 'text-left'
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginatedDataTable({ headers, rows, emptyLabel }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const total = rows?.length || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    if (!rows?.length) return [];
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [rows, page, pageSize]);

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (!rows?.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
        {emptyLabel || 'No data for current filters'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      <DataTable headers={headers} rows={pageRows} emptyLabel={emptyLabel} />

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
  );
}

export default function OverviewTab({ summary, loading }) {
  const institutions = summary?.institutions || [];
  const showInstitutionBreakdown = institutions.length > 1;
  const showInstitutionColumn = institutions.length > 1;

  const chartData = useMemo(
    () =>
      institutions.map((r) => ({
        name: r.institution,
        acquisition: Number(r.acquisition_value) || 0,
        book: Number(r.book_value) || 0,
        count: Number(r.asset_count) || 0,
      })),
    [institutions],
  );

  const campusRows = useMemo(
    () =>
      (summary?.byCampus || []).map((r) =>
        showInstitutionColumn
          ? [
              r.institution,
              r.campus,
              String(r.asset_count),
              formatInr(r.acquisition_value),
              formatInr(r.book_value),
            ]
          : [
              r.campus,
              String(r.asset_count),
              formatInr(r.acquisition_value),
              formatInr(r.book_value),
            ],
      ),
    [summary?.byCampus, showInstitutionColumn],
  );

  const departmentRows = useMemo(
    () =>
      (summary?.byDepartment || []).map((r) =>
        showInstitutionColumn
          ? [
              r.institution,
              r.department,
              String(r.asset_count),
              formatInr(r.acquisition_value),
              formatInr(r.book_value),
            ]
          : [
              r.department,
              String(r.asset_count),
              formatInr(r.acquisition_value),
              formatInr(r.book_value),
            ],
      ),
    [summary?.byDepartment, showInstitutionColumn],
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 rounded-xl bg-slate-100" />
        <div className="h-32 rounded-xl bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showInstitutionBreakdown && (
        <section>
          <h3 className="text-sm font-semibold text-slate-900 mb-3">By institution</h3>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <DataTable
              headers={[
                'Institution',
                'Assets',
                'Acquisition (₹)',
                'Depreciation (₹)',
                'Book value (₹)',
              ]}
              rows={institutions.map((r) => [
                r.institution,
                String(r.asset_count),
                formatInr(r.acquisition_value),
                formatInr(r.depreciation),
                formatInr(r.book_value),
              ])}
            />
            <div className="rounded-xl border border-slate-200 bg-white p-3 h-64">
              {chartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      tickFormatter={(v) =>
                        v >= 100000 ? `${(v / 100000).toFixed(1)}L` : String(v)
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatInrCurrency(value)}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar
                      dataKey="acquisition"
                      name="Acquisition"
                      fill="#0f172a"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  No chart data
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">By campus</h3>
        <PaginatedDataTable
          headers={
            showInstitutionColumn
              ? ['Institution', 'Campus', 'Assets', 'Acquisition (₹)', 'Book value (₹)']
              : ['Campus', 'Assets', 'Acquisition (₹)', 'Book value (₹)']
          }
          rows={campusRows}
        />
      </section>

      <section>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">By department</h3>
        <PaginatedDataTable
          headers={
            showInstitutionColumn
              ? ['Institution', 'Department', 'Assets', 'Acquisition (₹)', 'Book value (₹)']
              : ['Department', 'Assets', 'Acquisition (₹)', 'Book value (₹)']
          }
          rows={departmentRows}
        />
      </section>
    </div>
  );
}
