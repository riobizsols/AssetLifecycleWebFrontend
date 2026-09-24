import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Download, Loader2, RefreshCw } from 'lucide-react';
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
import { purchaseRequirementReportService } from '../../services/purchaseRequirementReportService';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import {
  getStockPurchaseCellValue,
  STOCK_PURCHASE_ADVANCED_FIELDS,
  STOCK_PURCHASE_COLUMNS,
  STOCK_PURCHASE_FIELD_ACCESSORS,
} from './newReportExtrasConfig';

function KpiCard({ label, value, danger }) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        danger ? 'border-amber-200' : 'border-slate-200'
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          danger ? 'text-amber-700' : 'text-slate-900'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Combined Stock & Purchase report (out-of-stock + buy recommendations).
 */
export default function PurchaseRequirementReport() {
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.PURCHASE_REQUIREMENT_REPORT);

  const [branches, setBranches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [focusOptions, setFocusOptions] = useState([]);
  const [selectedBranches, setSelectedBranches] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [focus, setFocus] = useState('all');
  const [horizonDays, setHorizonDays] = useState(30);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingView, setLoadingView] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [report, setReport] = useState(null);
  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const { columns, setColumns } = useReportColumns(
    STOCK_PURCHASE_COLUMNS.default,
    STOCK_PURCHASE_COLUMNS.all,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingOptions(true);
        const data = await purchaseRequirementReportService.getOptions();
        if (cancelled) return;
        setBranches(data.branches || []);
        setCategories(data.categories || []);
        setFocusOptions(
          data.focus_options || [
            { id: 'all', label: 'All parts' },
            { id: 'needs_purchase', label: 'Needs purchase' },
            { id: 'out_of_stock', label: 'Out of stock' },
          ],
        );
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Failed to load filter options');
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const payload = useMemo(
    () => ({
      branchIds: selectedBranches,
      categoryIds: selectedCategories,
      focus,
      horizonDays,
    }),
    [selectedBranches, selectedCategories, focus, horizonDays],
  );

  const handleView = useCallback(async () => {
    try {
      setLoadingView(true);
      const data = await purchaseRequirementReportService.viewReport(payload);
      setReport(data);
      await recordActionByNameWithFetch('Generate Report', {
        reportType: 'Stock & Purchase',
        action: 'Report generated',
        focus,
        horizonDays,
      }).catch(() => {});
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to generate report');
    } finally {
      setLoadingView(false);
    }
  }, [payload, focus, horizonDays, recordActionByNameWithFetch]);

  const handleExport = useCallback(async () => {
    if (!report) return;
    try {
      setExporting(true);
      const blob = await purchaseRequirementReportService.exportReport(payload);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `stock-purchase-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      await recordActionByNameWithFetch('Export Report', {
        reportType: 'Stock & Purchase',
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

  useEffect(() => {
    if (!loadingOptions) handleView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOptions]);

  const totals = report?.summary?.totals || {
    parts_to_buy: 0,
    out_of_stock: 0,
    total_recommended_qty: 0,
    with_wo_impact: 0,
    with_upcoming_pm: 0,
  };

  const rows = useMemo(
    () => applyAdvancedFilters(report?.rows || [], advanced, STOCK_PURCHASE_FIELD_ACCESSORS),
    [report, advanced],
  );

  const branchOptions = useMemo(
    () => branches.map((b) => ({ value: b.id, label: b.label || b.id })),
    [branches],
  );
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.id, label: c.label || c.id })),
    [categories],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleView}
            disabled={loadingView || loadingOptions}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {loadingView ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!report || exporting}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0E2F4B] px-4 py-2 text-sm font-medium text-white hover:bg-[#143d65] disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Excel
          </button>
        </div>

        <section className="relative z-10 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <div className="flex flex-wrap items-center gap-2">
              <ReportPreviewButton onClick={() => setPreviewOpen(true)} disabled={!rows.length} />
              <button
                type="button"
                onClick={() => {
                  setSelectedBranches([]);
                  setSelectedCategories([]);
                  setFocus('all');
                  setHorizonDays(30);
                  setAdvanced([]);
                  setReport(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleView}
                disabled={loadingView}
                className="rounded-lg bg-[#0E2F4B] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:opacity-50"
              >
                {loadingView ? 'Loading…' : 'Apply'}
              </button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[160px] flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Branch
                </label>
                <DropdownMultiSelect
                  options={branchOptions}
                  values={selectedBranches}
                  onChange={(v) => {
                    setSelectedBranches(v);
                    setReport(null);
                  }}
                  placeholder="All branches"
                />
              </div>
              <div className="min-w-[160px] flex-1">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Category / part
                </label>
                <DropdownMultiSelect
                  options={categoryOptions}
                  values={selectedCategories}
                  onChange={(v) => {
                    setSelectedCategories(v);
                    setReport(null);
                  }}
                  placeholder="All parts"
                />
              </div>
              <div className="min-w-[160px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Focus
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={focus}
                  onChange={(e) => {
                    setFocus(e.target.value);
                    setReport(null);
                  }}
                >
                  {focusOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="min-w-[140px]">
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Planning horizon
                </label>
                <select
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={horizonDays}
                  onChange={(e) => {
                    setHorizonDays(Number(e.target.value));
                    setReport(null);
                  }}
                >
                  {[7, 30, 60, 90].map((d) => (
                    <option key={d} value={d}>
                      {d} days
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <ReportAdvancedFilters
              fields={STOCK_PURCHASE_ADVANCED_FIELDS}
              value={advanced}
              onChange={setAdvanced}
            />
          </div>
        </section>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <KpiCard label="Parts to buy" value={totals.parts_to_buy} danger />
          <KpiCard label="Out of stock" value={totals.out_of_stock} danger />
          <KpiCard label="Recommended qty" value={totals.total_recommended_qty} />
          <KpiCard label="WO impact" value={totals.with_wo_impact} />
          <KpiCard label="Upcoming PM" value={totals.with_upcoming_pm} />
        </div>

        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <ReportTableToolbar
              title={`Parts (${rows.length})`}
              subtitle={
                report?.summary?.horizon_days
                  ? `Horizon ${report.summary.horizon_days} days`
                  : undefined
              }
              columnsSlot={
                <ReportColumnControls
                  allColumns={STOCK_PURCHASE_COLUMNS.all}
                  columns={columns}
                  setColumns={setColumns}
                  defaultColumns={STOCK_PURCHASE_COLUMNS.default}
                />
              }
            />
          </div>

          <div className="overflow-x-auto">
            {loadingView && !report ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-sm text-slate-500">
                No matching parts for these filters.
              </div>
            ) : (
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="whitespace-nowrap px-4 py-3 font-medium">
                        {col}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.part_code} className="hover:bg-slate-50/80">
                      {columns.map((col) => (
                        <td
                          key={col}
                          className={`whitespace-nowrap px-4 py-3 ${
                            col === 'Recommended qty'
                              ? 'font-semibold text-amber-700'
                              : col === 'Available' && Number(row.available) <= 0
                                ? 'font-semibold text-rose-700'
                                : col === 'Status' && row.is_out_of_stock
                                  ? 'font-medium text-rose-700'
                                  : 'text-slate-800'
                          }`}
                        >
                          {getStockPurchaseCellValue(row, col)}
                        </td>
                      ))}
                      <td className="whitespace-nowrap px-4 py-3">
                        <Link
                          to="/spare-part-list"
                          className="text-sm font-medium text-[#143d65] hover:underline"
                        >
                          Spare list
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Preview"
        columns={columns}
        rows={rows}
        getCellValue={getStockPurchaseCellValue}
      />
    </div>
  );
}
