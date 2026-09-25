import React, { useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Eye, Loader2, ShieldCheck } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import { auditReportService } from '../../../services/auditReportService';
import { formatDate, StatusPill } from './utils';

const COVERAGE_OPTIONS = [
  { value: 'Warranty', label: 'Warranty' },
  { value: 'AMC', label: 'AMC' },
  { value: 'CMC', label: 'CMC' },
];

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Expiring', label: 'Expiring' },
  { value: 'Expired', label: 'Expired' },
];

const COLUMNS = [
  { key: 'coverage_type', label: 'Coverage' },
  { key: 'status', label: 'Status' },
  { key: 'asset_id', label: 'Asset ID' },
  { key: 'asset_name', label: 'Covered asset' },
  { key: 'serial_number', label: 'Serial' },
  { key: 'asset_type', label: 'Asset type' },
  { key: 'vendor_name', label: 'Vendor' },
  { key: 'coverage_start', label: 'Start' },
  { key: 'coverage_end', label: 'End / renewal due' },
  { key: 'days_left', label: 'Days left' },
  { key: 'last_renewal_date', label: 'Last renewal' },
];

function downloadCsv(rows) {
  const headers = COLUMNS.map((c) => c.label);
  const escape = (v) => {
    const s = v == null || v === '' ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map((row) =>
      COLUMNS.map((col) => {
        if (col.key === 'coverage_start' || col.key === 'coverage_end' || col.key === 'last_renewal_date') {
          return escape(row[col.key] || '');
        }
        return escape(row[col.key]);
      }).join(','),
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `coverage-amc-cmc-warranty-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CoverageReportSection() {
  const [coverageTypes, setCoverageTypes] = useState(['Warranty', 'AMC', 'CMC']);
  const [statuses, setStatuses] = useState(['Active', 'Expiring', 'Expired']);
  const [expiringDays, setExpiringDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [search, setSearch] = useState('');

  const rows = result?.rows || [];

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) =>
      [
        row.coverage_type,
        row.status,
        row.asset_id,
        row.asset_name,
        row.serial_number,
        row.asset_type,
        row.vendor_name,
        row.branch,
        row.department,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [rows, search]);

  const handleView = async () => {
    try {
      setLoading(true);
      const data = await auditReportService.viewCoverageReport({
        coverage_types: coverageTypes,
        statuses,
        expiring_days: expiringDays,
      });
      setResult(data);
      setSearch('');
      if (!data?.rows?.length) {
        toast(
          data?.note ||
            'No matching AMC, CMC, or warranty records for these filters.',
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to load coverage report');
    } finally {
      setLoading(false);
    }
  };

  const summary = result?.summary;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      <div className="px-6 py-5 border-b border-slate-100">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#143d65]">Coverage reports</p>
        <h2 className="text-lg font-semibold text-slate-900 mt-1">
          Active, expiring and expired AMCs, CMCs and warranties
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Covered assets, vendors and renewal dates. Expiring uses the window you set below
          (default 30 days). Vendor contracts are listed as AMC.
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 relative z-20">
            <label className="block text-sm font-medium text-slate-700">Coverage</label>
            <DropdownMultiSelect
              options={COVERAGE_OPTIONS}
              values={coverageTypes}
              onChange={setCoverageTypes}
              placeholder="Warranty, AMC, CMC"
            />
          </div>
          <div className="space-y-2 relative z-10">
            <label className="block text-sm font-medium text-slate-700">Status</label>
            <DropdownMultiSelect
              options={STATUS_OPTIONS}
              values={statuses}
              onChange={setStatuses}
              placeholder="Active, expiring, expired"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Expiring within (days)</label>
            <input
              type="number"
              min={0}
              value={expiringDays}
              onChange={(e) => setExpiringDays(Number(e.target.value) || 0)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={handleView}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#143d65] hover:bg-[#1e5a8a] disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            View coverage report
          </button>
        </div>
      </div>

      {result && (
        <div className="border-t border-slate-100">
          <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-4 gap-6 border-b border-slate-100">
            {[
              { label: 'Total', value: summary?.total || 0 },
              { label: 'Active', value: summary?.active || 0 },
              { label: 'Expiring', value: summary?.expiring || 0 },
              { label: 'Expired', value: summary?.expired || 0 },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-2xl font-semibold text-slate-900 tabular-nums">{item.value}</div>
                <div className="text-xs text-slate-500 mt-1">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-slate-900">
                {filteredRows.length} record{filteredRows.length === 1 ? '' : 's'}
              </h3>
              <div className="flex items-center gap-2">
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search assets or vendors"
                  className="w-full sm:w-64 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                />
                <button
                  type="button"
                  disabled={!filteredRows.length}
                  onClick={() => downloadCsv(filteredRows)}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>

            {!filteredRows.length ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-12 text-center">
                <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {result.note || 'No AMC, CMC, or warranty rows match these filters.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      {COLUMNS.map((col) => (
                        <th key={col.key} className="px-3 py-3 whitespace-nowrap">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, i) => (
                      <tr key={`${row.coverage_type}-${row.asset_id || 'none'}-${row.vendor_id || 'none'}-${i}`} className="hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.coverage_type}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <StatusPill value={row.status} />
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800">
                          {row.asset_id || '—'}
                        </td>
                        <td className="px-3 py-2.5 min-w-[10rem]">{row.asset_name || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.serial_number || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{row.asset_type || '—'}</td>
                        <td className="px-3 py-2.5 min-w-[8rem]">{row.vendor_name || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(row.coverage_start)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(row.coverage_end)}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap tabular-nums">
                          {row.days_left == null ? '—' : row.days_left}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(row.last_renewal_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
