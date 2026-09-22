import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Loader2, Users } from 'lucide-react';
import { workforceReportService } from '../../services/workforceReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import { exportWorkforcePdf } from './exportWorkforceReport';
import TechnicianDetailDialog from './TechnicianDetailDialog';

const TABS = [
  { id: 'assignments', label: 'Assignments' },
  { id: 'closures', label: 'Closures' },
  { id: 'backlog', label: 'Backlog' },
  { id: 'sla', label: 'SLA performance' },
  { id: 'workload', label: 'Workload' },
  { id: 'productivity', label: 'Productivity' },
];

function formatDate(value) {
  if (!value) return '—';
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(value);
  }
}

function StatusPill({ value }) {
  const raw = String(value || '').toUpperCase();
  let tone = 'bg-slate-100 text-slate-700';
  if (raw === 'CO') tone = 'bg-emerald-50 text-emerald-800';
  else if (raw === 'IN' || raw === 'IP' || raw === 'AP') tone = 'bg-amber-50 text-amber-800';
  else if (raw === 'CA') tone = 'bg-rose-50 text-rose-800';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {value || '—'}
    </span>
  );
}

function KpiCard({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 break-words">
        {value == null || value === '' ? '—' : value}
      </div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

function DataTable({ columns, rows, emptyLabel }) {
  if (!rows?.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
        No {emptyLabel} for the selected period.
      </div>
    );
  }
  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, idx) => (
            <tr key={row.ams_id || row.technician_name || idx} className="hover:bg-slate-50/80">
              {columns.map((c) => (
                <td key={c.key} className="px-3 py-2.5 text-slate-700 align-top break-words">
                  {c.render ? c.render(row) : row[c.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function WorkforceReport() {
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.WORKFORCE_REPORT);
  const [period, setPeriod] = useState('current_year');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [tab, setTab] = useState('assignments');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [report, setReport] = useState(null);
  const [selectedTech, setSelectedTech] = useState(null);

  const load = useCallback(async () => {
    if (period === 'specific' && (!dateFrom || !dateTo)) return;
    try {
      setLoading(true);
      const data = await workforceReportService.viewReport({
        period,
        date_from: period === 'specific' ? dateFrom : undefined,
        date_to: period === 'specific' ? dateTo : undefined,
      });
      setReport(data);
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to load workforce report');
    } finally {
      setLoading(false);
    }
  }, [period, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const openTechnician = (row) => {
    const name = row?.technician_name;
    if (!name || name === 'Unassigned') return;
    setSelectedTech({
      technician_name: name,
      emp_int_id: row.emp_int_id || null,
      technician_email: row.technician_email || null,
      technician_phno: row.technician_phno || null,
    });
  };

  const technicianCell = (row) => {
    const name = row.technician_name || '—';
    if (!row.technician_name || row.technician_name === 'Unassigned') {
      return name;
    }
    return (
      <button
        type="button"
        onClick={() => openTechnician(row)}
        className="text-left text-[#143d65] font-medium hover:underline"
        title="View technician details"
      >
        <span className="block">{name}</span>
        {row.emp_int_id ? (
          <span className="block text-[11px] font-normal text-slate-500">{row.emp_int_id}</span>
        ) : null}
      </button>
    );
  };

  const handleDownload = async () => {
    if (!report) {
      toast.error('Report is still loading');
      return;
    }
    try {
      setDownloading(true);
      exportWorkforcePdf(report);
      await recordActionByNameWithFetch('Export Report', {
        reportType: 'Workforce',
        exportFormat: 'pdf',
        period: report.period?.type,
      }).catch(() => {});
      toast.success('PDF downloaded');
    } catch (err) {
      toast.error(err?.message || 'Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const summary = report?.summary || {};
  const technicians = report?.technicians || [];
  const sections = report?.sections || {};

  const workOrderColumns = [
    {
      key: 'technician_name',
      label: 'Engineer / technician',
      render: technicianCell,
    },
    { key: 'wo_id', label: 'Work order' },
    {
      key: 'asset',
      label: 'Asset',
      render: (r) => `${r.asset_type_name || 'Asset'} ${r.serial_number || r.asset_id || ''}`.trim(),
    },
    { key: 'maintenance_type_name', label: 'Type' },
    {
      key: 'act_maint_st_date',
      label: 'Scheduled',
      render: (r) => formatDate(r.act_maint_st_date),
    },
    {
      key: 'act_main_end_date',
      label: 'Completed',
      render: (r) => formatDate(r.act_main_end_date),
    },
    {
      key: 'status',
      label: 'Status',
      render: (r) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <StatusPill value={r.status} />
          {r.is_overdue ? (
            <span className="text-[11px] font-medium text-rose-600">Overdue</span>
          ) : null}
        </span>
      ),
    },
    { key: 'branch_name', label: 'Institution' },
  ];

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[#143d65]">
              <Users className="w-5 h-5" />
              <h2 className="text-lg font-semibold text-slate-900">
                Engineering Team Productivity Report
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm">
              <span className="block text-xs font-medium text-slate-500 mb-1">Period</span>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="current_year">Current year</option>
                <option value="last_year">Last year</option>
                <option value="specific">Specific range</option>
              </select>
            </label>
            {period === 'specific' && (
              <>
                <label className="text-sm">
                  <span className="block text-xs font-medium text-slate-500 mb-1">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-xs font-medium text-slate-500 mb-1">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
              </>
            )}
            <div className="text-sm text-slate-500 pb-2">
              {report?.period?.label || (loading ? 'Loading…' : '—')}
            </div>
            <button
              type="button"
              disabled={!report || downloading}
              onClick={handleDownload}
              className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Download report
            </button>
          </div>
        </div>

        {loading && !report ? (
          <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading workforce report…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiCard label="Technicians" value={summary.technicians ?? 0} />
              <KpiCard label="Assignments" value={summary.assignments ?? 0} />
              <KpiCard label="Closures" value={summary.closures ?? 0} />
              <KpiCard
                label="Backlog"
                value={summary.backlog ?? 0}
                hint={`${summary.overdue_backlog ?? 0} overdue`}
              />
              <KpiCard
                label="SLA compliance"
                value={
                  summary.sla_compliance_pct == null ? '—' : `${summary.sla_compliance_pct}%`
                }
                hint={`${summary.sla_on_time ?? 0}/${summary.sla_due ?? 0} on time`}
              />
              <KpiCard label="Late closures" value={summary.sla_late ?? 0} />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap gap-1 border-b border-slate-200">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`px-3.5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      tab === t.id
                        ? 'border-[#143d65] text-[#143d65]'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {tab === 'assignments' && (
                <DataTable
                  emptyLabel="assignments"
                  columns={workOrderColumns}
                  rows={sections.assignments || []}
                />
              )}
              {tab === 'closures' && (
                <DataTable
                  emptyLabel="closures"
                  columns={workOrderColumns}
                  rows={sections.closures || []}
                />
              )}
              {tab === 'backlog' && (
                <DataTable
                  emptyLabel="backlog items"
                  columns={workOrderColumns}
                  rows={sections.backlog || []}
                />
              )}
              {tab === 'sla' && (
                <DataTable
                  emptyLabel="SLA metrics"
                  columns={[
                    {
                      key: 'technician_name',
                      label: 'Engineer / technician',
                      render: technicianCell,
                    },
                    { key: 'sla_due', label: 'Completed with dates' },
                    { key: 'sla_on_time', label: 'On time' },
                    { key: 'sla_late', label: 'Late' },
                    {
                      key: 'sla_compliance_pct',
                      label: 'Compliance %',
                      render: (r) =>
                        r.sla_compliance_pct == null ? '—' : `${r.sla_compliance_pct}%`,
                    },
                  ]}
                  rows={technicians}
                />
              )}
              {tab === 'workload' && (
                <DataTable
                  emptyLabel="workload metrics"
                  columns={[
                    {
                      key: 'technician_name',
                      label: 'Engineer / technician',
                      render: technicianCell,
                    },
                    { key: 'assignments', label: 'Total assignments' },
                    { key: 'open_assignments', label: 'Open workload' },
                    { key: 'backlog', label: 'Backlog' },
                    { key: 'overdue_backlog', label: 'Overdue' },
                  ]}
                  rows={technicians}
                />
              )}
              {tab === 'productivity' && (
                <DataTable
                  emptyLabel="productivity metrics"
                  columns={[
                    {
                      key: 'technician_name',
                      label: 'Engineer / technician',
                      render: technicianCell,
                    },
                    { key: 'closures', label: 'Closures' },
                    {
                      key: 'avg_turnaround_days',
                      label: 'Avg turnaround (days)',
                      render: (r) =>
                        r.avg_turnaround_days == null ? '—' : r.avg_turnaround_days,
                    },
                    {
                      key: 'sla_compliance_pct',
                      label: 'On-time %',
                      render: (r) =>
                        r.sla_compliance_pct == null ? '—' : `${r.sla_compliance_pct}%`,
                    },
                    { key: 'open_assignments', label: 'Still open' },
                  ]}
                  rows={technicians}
                />
              )}
            </div>
          </>
        )}
      </div>

      <TechnicianDetailDialog
        open={Boolean(selectedTech)}
        technician={selectedTech}
        onClose={() => setSelectedTech(null)}
      />
    </div>
  );
}
