import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Building2,
  ChevronDown,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { useAuditLog } from '../../hooks/useAuditLog';
import { REPORTS_APP_IDS } from '../../constants/reportsAuditEvents';
import { ReportPreviewModal } from '../../components/reportModels/ReportExtras';
import { useConsumablesReport } from './consumablesReport/useConsumablesReport';
import { useDatasetView } from './consumablesReport/useDatasetView';
import FiltersPanel from './consumablesReport/FiltersPanel';
import OverviewTab from './consumablesReport/OverviewTab';
import DatasetTab from './consumablesReport/DatasetTab';
import { exportExcel, exportPdf } from './consumablesReport/exportConsumablesReport';
import { cellText, columnByLabel, DATASETS, formatQty } from './consumablesReport/config';

const KPI_TONES = {
  slate: 'bg-slate-100 text-slate-600',
  rose: 'bg-rose-50 text-rose-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  amber: 'bg-amber-50 text-amber-600',
};

function Kpi({ icon, label, value, sub, tone = 'slate', loading }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${KPI_TONES[tone]}`}>
          {React.createElement(icon, { className: 'h-3.5 w-3.5' })}
        </span>
      </div>
      <p className="mt-1.5 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
        {loading ? <span className="inline-block h-6 w-14 animate-pulse rounded bg-slate-100" /> : value}
      </p>
      {sub ? <p className="mt-0.5 truncate text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function advancedSummary(view) {
  const parts = [];
  if (view.search.trim()) parts.push(`search "${view.search.trim()}"`);
  view.advanced.forEach((c) => {
    if (c.val == null || c.val === '' || (Array.isArray(c.val) && !c.val.length)) return;
    parts.push(`${c.field} ${c.op} ${Array.isArray(c.val) ? c.val.join(', ') : c.val}`);
  });
  return parts.length ? { label: `${view.dataset.label} conditions`, value: parts.join('; ') } : null;
}

export default function ConsumablesReport() {
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.CONSUMABLES_REPORT);
  const r = useConsumablesReport();
  const { report, loading } = r;

  const [tab, setTab] = useState('overview');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const stockView = useDatasetView(DATASETS.stock, report?.stock);
  const movementView = useDatasetView(DATASETS.movements, report?.movements);
  const allocationView = useDatasetView(DATASETS.allocations, report?.allocations);
  const views = useMemo(
    () => ({ stock: stockView, movements: movementView, allocations: allocationView }),
    [stockView, movementView, allocationView],
  );
  const activeView = views[tab] || null;
  const previewView = activeView || stockView;

  const s = report?.summary;

  const fullFilterSummary = useMemo(
    () => [
      ...r.filterSummary,
      ...Object.values(views).map(advancedSummary).filter(Boolean),
    ],
    [r.filterSummary, views],
  );

  const previewSummaryItems = useMemo(
    () => [
      { label: 'Consumables', value: String(s?.consumables ?? 0) },
      { label: 'Stock entries', value: String(s?.stockEntries ?? 0) },
      { label: 'Need attention', value: String(s?.attentionCount ?? 0), sub: 'Low, reorder or out of stock' },
      { label: 'Restocks', value: String(s?.restockCount ?? 0) },
      { label: 'Qty received', value: formatQty(s?.receivedQty), sub: 'All units combined' },
      { label: 'Allocations', value: String(s?.allocationCount ?? 0) },
      { label: 'Qty allocated', value: formatQty(s?.allocatedQty), sub: 'All units combined' },
      { label: 'Rows in preview', value: String(previewView.filtered.length) },
    ],
    [s, previewView.filtered.length],
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const handleExport = useCallback(
    async (format, scope) => {
      if (!report) return;
      setMenuOpen(false);
      setExporting(true);
      try {
        const payload = {
          report,
          filterSummary: fullFilterSummary,
          views: [stockView, movementView, allocationView],
          scope,
          activeView,
        };
        if (format === 'pdf') exportPdf(payload);
        else exportExcel(payload);
        toast.success(format === 'pdf' ? 'PDF exported' : 'Excel exported');
        try {
          await recordActionByNameWithFetch('Export Report', {
            format: format === 'pdf' ? 'pdf' : 'xlsx',
            reportType: scope === 'full' ? 'Consumables Report' : `Consumables - ${activeView?.dataset.label}`,
          });
        } catch {
          /* audit logging is best-effort */
        }
      } catch (err) {
        toast.error(err?.message || 'Export failed');
      } finally {
        setExporting(false);
      }
    },
    [report, fullFilterSummary, stockView, movementView, allocationView, activeView, recordActionByNameWithFetch],
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'stock', label: DATASETS.stock.label, icon: Boxes, count: report?.stock?.length },
    { id: 'movements', label: DATASETS.movements.label, icon: RefreshCw, count: report?.movements?.length },
    { id: 'allocations', label: DATASETS.allocations.label, icon: Building2, count: report?.allocations?.length },
  ];

  const menuItem = (format, scope, label, Icon, disabled = false) => (
    <button
      key={`${format}-${scope}`}
      type="button"
      disabled={disabled}
      onClick={() => handleExport(format, scope)}
      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <Icon className={`h-4 w-4 ${format === 'pdf' ? 'text-rose-500' : 'text-emerald-600'}`} />
      {label}
    </button>
  );

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {report?.filters ? `${report.filters.from} to ${report.filters.to}` : 'Loading…'}
            {loading && report ? ' · Refreshing…' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              disabled={loading || !report}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" /> Preview
            </button>
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                disabled={exporting || loading || !report}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0E2F4B] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Exporting…' : 'Export'}
                <ChevronDown className={`h-3.5 w-3.5 transition ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Full report
                  </p>
                  {menuItem('xlsx', 'full', 'Excel workbook (all sections)', FileSpreadsheet)}
                  {menuItem('pdf', 'full', 'PDF (all sections)', FileText)}
                  <div className="my-1 border-t border-slate-100" />
                  <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {activeView ? `Current table · ${activeView.dataset.label}` : 'Current table'}
                  </p>
                  {menuItem('xlsx', 'table', 'Excel (.xlsx)', FileSpreadsheet, !activeView)}
                  {menuItem('pdf', 'table', 'PDF (.pdf)', FileText, !activeView)}
                  {!activeView ? (
                    <p className="px-3 pb-2 text-[11px] text-slate-400">Open a table tab to export it alone.</p>
                  ) : null}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={r.refresh}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        <FiltersPanel
          draft={r.draft}
          setDraft={r.setDraft}
          options={r.options}
          consumableOptions={r.consumableOptions}
          loading={r.loadingOptions}
          branchLocked={r.branchLocked}
          isDirty={r.isDirty}
          onApply={r.applyFilters}
          onReset={r.resetFilters}
        />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <Kpi
            icon={Boxes}
            label="Consumables"
            value={s?.consumables ?? 0}
            sub={`${s?.stockEntries ?? 0} stock entries`}
            loading={loading && !report}
          />
          <Kpi
            icon={AlertTriangle}
            label="Need attention"
            value={s?.attentionCount ?? 0}
            sub={`${s?.statusCounts?.OUT_OF_STOCK ?? 0} out of stock`}
            tone="rose"
            loading={loading && !report}
          />
          <Kpi
            icon={ArrowDownToLine}
            label="Received"
            value={formatQty(s?.receivedQty)}
            sub={`${s?.restockCount ?? 0} stock-ins in period`}
            tone="emerald"
            loading={loading && !report}
          />
          <Kpi
            icon={ArrowUpFromLine}
            label="Allocated"
            value={formatQty(s?.allocatedQty)}
            sub={`${s?.allocationCount ?? 0} allocations in period`}
            tone="indigo"
            loading={loading && !report}
          />
          <Kpi
            icon={Building2}
            label="Departments served"
            value={s?.departmentsServed ?? 0}
            sub="Received at least one allocation"
            tone="amber"
            loading={loading && !report}
          />
          <Kpi
            icon={RefreshCw}
            label="Movements"
            value={report?.movements?.length ?? 0}
            sub="Ledger entries in period"
            loading={loading && !report}
          />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex overflow-x-auto border-b border-slate-100 px-2">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px inline-flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? 'border-[#0E2F4B] text-[#0E2F4B]'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                  {t.count != null ? (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        active ? 'bg-[#0E2F4B] text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="p-5">
            {tab === 'overview' ? (
              <OverviewTab report={report} loading={loading} />
            ) : (
              <DatasetTab
                key={tab}
                view={activeView}
                rows={report?.[activeView.dataset.rowsKey]}
                loading={loading}
                onPreview={() => setPreviewOpen(true)}
              />
            )}
          </div>
        </div>
      </div>

      <ReportPreviewModal
        open={previewOpen}
        onClose={closePreview}
        title={`Consumables — ${previewView.dataset.title}`}
        columns={previewView.columns}
        rows={previewView.filtered}
        getCellValue={(row, label) => cellText(columnByLabel(previewView.dataset, label), row) || '—'}
        filterSummary={fullFilterSummary}
        summaryItems={previewSummaryItems}
        emptyLabel="No rows match the current filters"
      />
    </div>
  );
}
