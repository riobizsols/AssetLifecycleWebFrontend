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
import { maintenanceStatusReportService } from '../../services/maintenanceStatusReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  getMaintenanceStatusCellValue,
  MAINTENANCE_STATUS_ADVANCED_FIELDS,
  MAINTENANCE_STATUS_COLUMNS,
  MAINTENANCE_STATUS_FIELD_ACCESSORS,
} from './newReportExtrasConfig';

const CURRENT_YEAR = new Date().getFullYear();

const STATUS_STYLES = {
  DUE: 'bg-amber-50 text-amber-800 border-amber-200',
  OVERDUE: 'bg-rose-50 text-rose-800 border-rose-200',
  COMPLETED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-600 border-slate-200',
  WARRANTY_EXPIRY: 'bg-orange-50 text-orange-800 border-orange-200',
  ASSET_EXPIRY: 'bg-orange-50 text-orange-800 border-orange-200',
  WARRANTY_AND_ASSET: 'bg-orange-50 text-orange-800 border-orange-200',
};

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toISOString().slice(0, 10);
}

function statusLabel(value) {
  if (!value) return '—';
  return String(value).replace(/_/g, ' ');
}

export default function MaintenanceStatusReport() {
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.MAINTENANCE_STATUS_REPORT);

  const [facilityTypes, setFacilityTypes] = useState([]);
  const [allTypes, setAllTypes] = useState([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [period, setPeriod] = useState('current_year');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loadingTypes, setLoadingTypes] = useState(true);
  const [loadingView, setLoadingView] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { columns, setColumns } = useReportColumns(
    MAINTENANCE_STATUS_COLUMNS.default,
    MAINTENANCE_STATUS_COLUMNS.all,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingTypes(true);
        const data = await maintenanceStatusReportService.getOptions();
        if (cancelled) return;
        const facility = data.facility_types || [];
        setFacilityTypes(facility);
        setAllTypes(data.asset_types || []);
        setSelectedAssetTypes(facility.map((t) => t.asset_type_id));
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

  const assetTypeOptions = useMemo(() => {
    const source = allTypes.length ? allTypes : facilityTypes;
    return source.map((t) => ({
      value: t.asset_type_id,
      label: t.asset_type_name || t.asset_type_id,
    }));
  }, [allTypes, facilityTypes]);

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
      const data = await maintenanceStatusReportService.viewReport(payload);
      setReport(data);
      setActiveTab('summary');
      await recordActionByNameWithFetch('Generate Report', {
        reportType: 'Maintenance Status Report',
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
      const blob = await maintenanceStatusReportService.exportReport(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `maintenance-status-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await recordActionByNameWithFetch('Export Report', {
        reportType: 'Maintenance Status Report',
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

  const totals = report?.summary?.totals || { due: 0, overdue: 0, completed: 0, expiry: 0, assets: 0 };
  const maintenanceRows = useMemo(() => {
    const rows = report?.details?.maintenance || [];
    const statusFiltered =
      statusFilter === 'ALL' ? rows : rows.filter((row) => row.compliance_status === statusFilter);
    return applyAdvancedFilters(
      statusFiltered,
      advanced,
      MAINTENANCE_STATUS_FIELD_ACCESSORS,
    );
  }, [report, statusFilter, advanced]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 py-5 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Configure report</h2>
          </div>

          <div className="p-6 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <option value="current_month">Current month</option>
                  <option value="last_month">Last month</option>
                  <option value="current_year">Current year ({CURRENT_YEAR})</option>
                  <option value="last_year">Last year ({CURRENT_YEAR - 1})</option>
                  <option value="specific">Custom date range</option>
                </select>
              </div>

              <div className="space-y-2 relative z-10">
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

            <div className="flex flex-wrap items-center justify-end gap-2">
              <ReportPreviewButton
                onClick={() => {
                  if (!report) {
                    toast.error('View the report first');
                    return;
                  }
                  setActiveTab('maintenance');
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

            <ReportAdvancedFilters
              fields={MAINTENANCE_STATUS_ADVANCED_FIELDS}
              value={advanced}
              onChange={setAdvanced}
            />
          </div>
        </section>

        {!report && !loadingView && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No report yet</h3>
          </section>
        )}

        {report && (
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Maintenance status</h2>
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

            <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 border-b border-slate-100">
              {[
                { label: 'Due', value: totals.due },
                { label: 'Overdue', value: totals.overdue },
                { label: 'Completed', value: totals.completed },
                { label: 'Expiry', value: totals.expiry },
                { label: 'Assets', value: totals.assets },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-2xl font-semibold text-slate-900 tabular-nums">{item.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{item.label}</div>
                </div>
              ))}
            </div>

            <div className="px-6 pt-4 flex flex-wrap gap-2 border-b border-slate-100">
              {[
                { id: 'summary', label: 'By asset type' },
                { id: 'maintenance', label: 'Maintenance detail' },
                { id: 'expiry', label: 'Expiry' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-[#143d65] text-[#143d65]'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'summary' && (
              <div className="overflow-x-auto px-6 py-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0E2F4B] text-white">
                      <tr>
                        {['Asset type', 'Assets', 'Due', 'Overdue', 'Completed', 'Expiry'].map((h) => (
                          <th
                            key={h}
                            className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-2.5 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(report.summary?.by_asset_type || []).map((row) => (
                        <tr key={row.asset_type_id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5 font-medium text-slate-800">{row.asset_type_name}</td>
                          <td className="px-4 py-2.5 tabular-nums">{row.asset_count}</td>
                          <td className="px-4 py-2.5 tabular-nums">{row.due}</td>
                          <td className="px-4 py-2.5 tabular-nums">{row.overdue}</td>
                          <td className="px-4 py-2.5 tabular-nums">{row.completed}</td>
                          <td className="px-4 py-2.5 tabular-nums">{row.expiry}</td>
                        </tr>
                      ))}
                      {!(report.summary?.by_asset_type || []).length && (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                            No facility assets found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-3 px-6 py-4">
                <ReportTableToolbar
                  title="Maintenance detail"
                  columnsSlot={
                    <ReportColumnControls
                      allColumns={MAINTENANCE_STATUS_COLUMNS.all}
                      columns={columns}
                      setColumns={setColumns}
                      defaultColumns={MAINTENANCE_STATUS_COLUMNS.default}
                    />
                  }
                  actions={
                    <div className="flex flex-wrap gap-1.5">
                      {['ALL', 'DUE', 'OVERDUE', 'COMPLETED'].map((id) => (
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
                          {id === 'ALL' ? 'All' : statusLabel(id)}
                        </button>
                      ))}
                    </div>
                  }
                />
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0E2F4B] text-white">
                      <tr>
                        {columns.map((h) => (
                          <th
                            key={h}
                            className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {maintenanceRows.map((row) => (
                        <tr
                          key={row.ams_id || `${row.wo_id}-${row.asset_id}`}
                          className="hover:bg-slate-50/80"
                        >
                          {columns.map((col) => (
                            <td key={col} className="px-4 py-2.5 text-slate-800 whitespace-nowrap">
                              {col === 'Status' ? (
                                <span
                                  className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${
                                    STATUS_STYLES[row.compliance_status] ||
                                    'bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  {getMaintenanceStatusCellValue(row, col)}
                                </span>
                              ) : (
                                getMaintenanceStatusCellValue(row, col)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {!maintenanceRows.length && (
                        <tr>
                          <td
                            colSpan={columns.length}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No maintenance records in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'expiry' && (
              <div className="overflow-x-auto px-6 py-4">
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-[#0E2F4B] text-white">
                      <tr>
                        {['Asset', 'Type', 'Kind', 'Warranty', 'Asset expiry'].map((h) => (
                          <th
                            key={h}
                            className="text-left text-[11px] font-semibold uppercase tracking-wide px-4 py-2.5 whitespace-nowrap"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(report.details?.expiry || []).map((row) => (
                        <tr key={row.asset_id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2.5">
                            <div className="font-medium text-slate-800">{row.asset_name || row.asset_id}</div>
                            <div className="text-xs text-slate-500">{row.serial_number || row.asset_id}</div>
                          </td>
                          <td className="px-4 py-2.5">{row.asset_type_name}</td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full border text-xs font-medium ${
                                STATUS_STYLES[row.expiry_kind] || 'bg-orange-50 text-orange-800'
                              }`}
                            >
                              {statusLabel(row.expiry_kind)}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">{formatDate(row.warranty_period)}</td>
                          <td className="px-4 py-2.5">{formatDate(row.expiry_date)}</td>
                        </tr>
                      ))}
                      {!(report.details?.expiry || []).length && (
                        <tr>
                          <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                            No warranty or asset expiry dates in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Maintenance detail preview"
        columns={columns}
        rows={maintenanceRows}
        getCellValue={getMaintenanceStatusCellValue}
        emptyLabel="No maintenance rows to preview."
      />
    </div>
  );
}
