import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { DropdownMultiSelect } from '../../components/reportModels/ReportComponents';
import {
  applyAdvancedFilters,
  ReportAdvancedFilters,
  ReportColumnControls,
  ReportPreviewButton,
  ReportPreviewModal,
  ReportTableToolbar,
  useReportColumns,
} from '../../components/reportModels/ReportExtras';
import { upcomingMaintenanceScheduleReportService } from '../../services/upcomingMaintenanceScheduleReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  getUpcomingMaintenanceScheduleCellValue,
  UPCOMING_MAINTENANCE_SCHEDULE_ADVANCED_FIELDS,
  UPCOMING_MAINTENANCE_SCHEDULE_COLUMNS,
  UPCOMING_MAINTENANCE_SCHEDULE_FIELD_ACCESSORS,
} from './newReportExtrasConfig';

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_STYLES = {
  Upcoming: 'bg-sky-50 text-sky-800 border-sky-200',
  'Due Today': 'bg-amber-50 text-amber-800 border-amber-200',
  Overdue: 'bg-rose-50 text-rose-800 border-rose-200',
  Completed: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Rescheduled: 'bg-violet-50 text-violet-800 border-violet-200',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

export default function UpcomingMaintenanceScheduleReport() {
  const { recordActionByNameWithFetch } = useAuditLog(
    REPORTS_APP_IDS.UPCOMING_MAINTENANCE_SCHEDULE_REPORT,
  );

  const [allTypes, setAllTypes] = useState([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [period, setPeriod] = useState('upcoming_90');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingView, setLoadingView] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { columns, setColumns } = useReportColumns(
    UPCOMING_MAINTENANCE_SCHEDULE_COLUMNS.default,
    UPCOMING_MAINTENANCE_SCHEDULE_COLUMNS.all,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTypes(true);
        const data = await upcomingMaintenanceScheduleReportService.getOptions();
        if (cancelled) return;
        const types = data.asset_types || [];
        setAllTypes(types);
        setSelectedAssetTypes(types.map((t) => t.asset_type_id));
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load asset types');
      } finally {
        if (!cancelled) setLoadingTypes(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const assetTypeOptions = useMemo(
    () =>
      allTypes.map((t) => ({
        value: t.asset_type_id,
        label: t.asset_type_name || t.asset_type_id,
      })),
    [allTypes],
  );

  const canView = useMemo(() => {
    if (selectedAssetTypes.length === 0) return false;
    if (period === 'specific' && (!dateFrom || !dateTo)) return false;
    return true;
  }, [selectedAssetTypes, period, dateFrom, dateTo]);

  const payload = useMemo(
    () => ({
      period,
      date_from: dateFrom || null,
      date_to: dateTo || null,
      asset_type_ids: selectedAssetTypes,
      schedule_status: 'ALL',
    }),
    [period, dateFrom, dateTo, selectedAssetTypes],
  );

  const handleView = useCallback(async () => {
    if (!canView) {
      toast.error('Select a period and at least one asset type');
      return;
    }
    try {
      setLoadingView(true);
      const data = await upcomingMaintenanceScheduleReportService.viewReport(payload);
      setReport(data);
      await recordActionByNameWithFetch('Generate Report', {
        reportType: 'Upcoming Maintenance Schedule',
        action: 'Report generated',
        period,
      }).catch(() => {});
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoadingView(false);
    }
  }, [canView, payload, period, recordActionByNameWithFetch]);

  const handleExport = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      const blob = await upcomingMaintenanceScheduleReportService.exportReport(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `upcoming-maintenance-schedule-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await recordActionByNameWithFetch('Export Report', {
        reportType: 'Upcoming Maintenance Schedule',
        exportFormat: 'xlsx',
        action: 'Report exported',
      }).catch(() => {});
      toast.success('Excel downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  }, [payload, recordActionByNameWithFetch, report]);

  const rows = useMemo(() => {
    const list = report?.details || [];
    const statusFiltered =
      statusFilter === 'ALL'
        ? list
        : list.filter((row) => row.schedule_status === statusFilter);
    const filtered = applyAdvancedFilters(
      statusFiltered,
      advanced,
      UPCOMING_MAINTENANCE_SCHEDULE_FIELD_ACCESSORS,
    );
    return filtered.map((row, index) => ({ ...row, sno: index + 1 }));
  }, [report, statusFilter, advanced]);

  const totals = useMemo(() => {
    const countBy = (status) => rows.filter((r) => r.schedule_status === status).length;
    return {
      total: rows.length,
      upcoming: countBy('Upcoming'),
      due_today: countBy('Due Today'),
      overdue: countBy('Overdue'),
      completed: countBy('Completed'),
      rescheduled: countBy('Rescheduled'),
    };
  }, [rows]);

  const periodLabel = useMemo(() => {
    if (report?.period?.label) return report.period.label;
    if (period === 'upcoming_30') return 'Next 30 days';
    if (period === 'upcoming_90') return 'Next 90 days';
    if (period === 'current_month') return 'Current month';
    if (period === 'last_month') return 'Last month';
    if (period === 'current_year') return `Current year (${CURRENT_YEAR})`;
    if (period === 'last_year') return `Last year (${CURRENT_YEAR - 1})`;
    if (period === 'specific' && dateFrom && dateTo) return `${dateFrom} → ${dateTo}`;
    return period;
  }, [report, period, dateFrom, dateTo]);

  const filterSummary = useMemo(() => {
    const items = [];
    items.push({ label: 'Period', value: periodLabel });

    const selectedLabels = assetTypeOptions
      .filter((o) => selectedAssetTypes.map(String).includes(String(o.value)))
      .map((o) => o.label);
    items.push({
      label: 'Asset types',
      value:
        selectedLabels.length === 0
          ? 'None'
          : selectedLabels.length === assetTypeOptions.length
            ? `All (${selectedLabels.length})`
            : selectedLabels.length <= 3
              ? selectedLabels.join(', ')
              : `${selectedLabels.slice(0, 3).join(', ')} +${selectedLabels.length - 3} more`,
    });

    if (statusFilter && statusFilter !== 'ALL') {
      items.push({ label: 'Schedule status chip', value: statusFilter });
    }

    (advanced || []).forEach((cond, idx) => {
      const field = UPCOMING_MAINTENANCE_SCHEDULE_ADVANCED_FIELDS.find((f) => f.key === cond.field);
      const label = field?.label || cond.field || `Condition ${idx + 1}`;
      let value = '—';
      if (Array.isArray(cond.val)) value = cond.val.length ? cond.val.join(', ') : '—';
      else if (cond.val != null && cond.val !== '') value = String(cond.val);
      else if (cond.listValue) value = String(cond.listValue);
      items.push({
        label: `${label} (${cond.op || '='})`,
        value,
      });
    });

    return items;
  }, [
    periodLabel,
    assetTypeOptions,
    selectedAssetTypes,
    statusFilter,
    advanced,
  ]);

  const previewSummaryItems = useMemo(
    () => [
      { label: 'Total', value: totals.total },
      { label: 'Upcoming', value: totals.upcoming },
      { label: 'Due Today', value: totals.due_today },
      { label: 'Overdue', value: totals.overdue },
      { label: 'Completed', value: totals.completed },
      { label: 'Rescheduled', value: totals.rescheduled },
      { label: 'Period', value: periodLabel },
      {
        label: 'Rows shown',
        value: rows.length,
        sub: advanced?.length
          ? `${advanced.length} advanced condition${advanced.length === 1 ? '' : 's'}`
          : undefined,
      },
    ],
    [totals, periodLabel, rows.length, advanced],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Configure report</h2>
            <p className="text-sm text-slate-500 mt-1">
              Upcoming maintenance schedules for all assets in the selected period
            </p>
          </div>

          <div className="p-6 space-y-8">
            <div className="relative z-40 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Period</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                  value={period}
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    setReport(null);
                  }}
                >
                  <option value="upcoming_30">Next 30 days (incl. overdue)</option>
                  <option value="upcoming_90">Next 90 days (incl. overdue)</option>
                  <option value="current_month">Current month</option>
                  <option value="last_month">Last month</option>
                  <option value="current_year">Current year ({CURRENT_YEAR})</option>
                  <option value="last_year">Last year ({CURRENT_YEAR - 1})</option>
                  <option value="specific">Custom date range</option>
                </select>
              </div>

              <div className="relative z-50 space-y-2">
                <label className="block text-sm font-medium text-slate-700">Asset types</label>
                <DropdownMultiSelect
                  values={selectedAssetTypes}
                  onChange={(v) => {
                    setSelectedAssetTypes(v);
                    setReport(null);
                  }}
                  options={assetTypeOptions}
                  placeholder={loadingTypes ? 'Loading asset types…' : 'Select asset types'}
                />
              </div>
            </div>

            {period === 'specific' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">From</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">To</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="relative z-30">
              <ReportAdvancedFilters
                fields={UPCOMING_MAINTENANCE_SCHEDULE_ADVANCED_FIELDS}
                value={advanced}
                onChange={setAdvanced}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <ReportPreviewButton
                onClick={() => {
                  if (!report) {
                    toast.error('View the report first');
                    return;
                  }
                  setPreviewOpen(true);
                }}
                disabled={!report}
              />
              <button
                type="button"
                disabled={!canView || loadingView}
                onClick={handleView}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-[#143d65] text-white hover:bg-[#0f2f4e] disabled:opacity-50"
              >
                {loadingView ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                View report
              </button>
            </div>
          </div>
        </section>

        {!report && !loadingView && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No report yet</h3>
            <p className="text-sm text-slate-500 mt-1">
              Choose a period and asset types, then view the upcoming schedules.
            </p>
          </section>
        )}

        {report && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Upcoming Maintenance Schedule
                </h2>
                <p className="text-sm text-slate-500 mt-1">{report.period?.label}</p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={exporting}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Download Excel
              </button>
            </div>

            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 border-b border-slate-100">
              {[
                { label: 'Total', value: totals.total },
                { label: 'Upcoming', value: totals.upcoming },
                { label: 'Due Today', value: totals.due_today },
                { label: 'Overdue', value: totals.overdue },
                { label: 'Completed', value: totals.completed },
                { label: 'Rescheduled', value: totals.rescheduled },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums">
                    {item.value}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 px-6 py-4">
              <ReportTableToolbar
                title="Schedule detail"
                columnsSlot={
                  <ReportColumnControls
                    allColumns={UPCOMING_MAINTENANCE_SCHEDULE_COLUMNS.all}
                    columns={columns}
                    setColumns={setColumns}
                    defaultColumns={UPCOMING_MAINTENANCE_SCHEDULE_COLUMNS.default}
                  />
                }
                actions={
                  <div className="flex flex-wrap gap-1.5">
                    {['ALL', 'Upcoming', 'Due Today', 'Overdue', 'Completed', 'Rescheduled'].map(
                      (id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setStatusFilter(id)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                            statusFilter === id
                              ? 'bg-[#0E2F4B] text-white border-[#0E2F4B]'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {id === 'ALL' ? 'All' : id}
                        </button>
                      ),
                    )}
                  </div>
                }
              />
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-[#0E2F4B] text-white">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length}
                          className="px-4 py-10 text-center text-slate-500"
                        >
                          No schedules match the current filters
                        </td>
                      </tr>
                    ) : (
                      rows.map((row) => (
                        <tr
                          key={row.ams_id || `${row.asset_id}-${row.sno}`}
                          className="hover:bg-slate-50/80"
                        >
                          {columns.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-slate-800 whitespace-nowrap">
                              {col === 'Schedule Status' ? (
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${
                                    STATUS_STYLES[row.schedule_status] ||
                                    'bg-slate-50 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {row.schedule_status || '—'}
                                </span>
                              ) : col === 'Maintenance Schedule Date' ||
                                col === 'Last Maintenance Date' ? (
                                formatDate(
                                  col === 'Maintenance Schedule Date'
                                    ? row.maintenance_schedule_date
                                    : row.last_maintenance_date,
                                )
                              ) : (
                                getUpcomingMaintenanceScheduleCellValue(row, col)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Upcoming Maintenance Schedule preview"
        columns={columns}
        rows={rows}
        getCellValue={getUpcomingMaintenanceScheduleCellValue}
        emptyLabel="No schedules to preview."
        summaryItems={previewSummaryItems}
        filterSummary={filterSummary}
      />
    </div>
  );
}
