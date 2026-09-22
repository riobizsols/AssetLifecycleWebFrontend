import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Info, RefreshCw, X } from 'lucide-react';
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
import { slaVendorPerformanceService } from '../../services/slaVendorPerformanceService';
import { useSlaVendorPerformance } from './slaVendorPerformance/useSlaVendorPerformance';
import { exportSlaVendorExcel, exportSlaVendorPdf } from './slaVendorPerformance/exportSlaVendorReport';
import {
  getSlaDetailCellValue,
  SLA_ADVANCED_FIELDS,
  SLA_DETAIL_COLUMNS,
  SLA_FIELD_ACCESSORS,
} from './newReportExtrasConfig';

const PAGE_SIZES = [10, 25, 30, 50, 100];
const PIE_COLORS = ['#15803d', '#b91c1c', '#64748b', '#a16207', '#475569'];
const WO_DETAIL_PATH = (amsId) => `/workorder-management/workorder-detail/${amsId}`;

function labelsForIds(ids = [], options = []) {
  const map = new Map((options || []).map((o) => [String(o.id ?? o.value), o.label ?? o.name ?? o.id]));
  return (ids || []).map((id) => map.get(String(id)) || id).filter(Boolean);
}

function Hint({ text }) {
  if (!text) return null;
  return (
    <span className="relative inline-flex group/hint">
      <Info className="h-3.5 w-3.5 text-slate-400 cursor-help" />
      <span className="pointer-events-none absolute right-0 top-full z-50 mt-1.5 w-56 rounded-md bg-slate-900 px-2.5 py-1.5 text-left text-[11px] font-normal normal-case leading-snug text-white opacity-0 shadow-lg group-hover/hint:opacity-100">
        {text}
      </span>
    </span>
  );
}

function KpiCard({ label, value, sub, hint, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-full min-h-[7.25rem] w-full flex-col rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-slate-300 ${
        hint ? 'pr-9' : ''
      } ${onClick ? 'cursor-pointer' : 'cursor-default'} ${
        danger ? 'border-red-200' : 'border-slate-200'
      }`}
    >
      {hint ? (
        <span className="absolute right-3 top-3.5 z-10">
          <Hint text={hint} />
        </span>
      ) : null}
      <div className="min-h-[1.25rem] text-[11px] font-medium uppercase tracking-wide leading-tight text-slate-500">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-semibold leading-none tabular-nums ${
          danger ? 'text-red-700' : 'text-slate-900'
        }`}
      >
        {value ?? '—'}
      </div>
      <div className="mt-auto pt-2 min-h-[1.25rem] text-xs leading-tight text-slate-500">
        {sub || '\u00A0'}
      </div>
    </button>
  );
}

function toOpts(list = []) {
  return (list || []).map((o) => ({
    value: String(o.id ?? o.value),
    label: String(o.label ?? o.name ?? o.id),
  }));
}

function statusBadge(status) {
  const map = {
    within_sla: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    breached: 'bg-red-50 text-red-800 border-red-200',
    open: 'bg-slate-100 text-slate-700 border-slate-200',
    no_sla: 'bg-amber-50 text-amber-800 border-amber-200',
    cancelled: 'bg-slate-50 text-slate-500 border-slate-200',
  };
  const label = {
    within_sla: 'Within SLA',
    breached: 'Breached',
    open: 'Open',
    no_sla: 'No SLA',
    cancelled: 'Cancelled',
  };
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[11px] font-medium ${map[status] || map.open}`}>
      {label[status] || status || '—'}
    </span>
  );
}

export default function SlaVendorPerformance() {
  const {
    options,
    draft,
    setDraft,
    applied,
    detailFilters,
    summary,
    trends,
    breaches,
    vendors,
    repeat,
    quality,
    details,
    grain,
    setGrain,
    page,
    setPage,
    pageSize,
    setPageSize,
    search,
    setSearch,
    loading,
    loadingDetails,
    selectedVendorId,
    setSelectedVendorId,
    vendorDetail,
    applyFilters,
    resetFilters,
    filterByBreached,
    clearSlaStatusFilter,
  } = useSlaVendorPerformance();

  const [advanced, setAdvanced] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);
  const { columns, setColumns } = useReportColumns(
    SLA_DETAIL_COLUMNS.default,
    SLA_DETAIL_COLUMNS.all,
  );

  const defs = options.definitions || {};
  const kpis = summary?.kpis || {};
  const vs = kpis.vs_previous || {};
  const slaStatusFilter = applied.slaStatus || 'all';
  const slaStatusLabel =
    (options.slaStatuses || []).find((s) => s.id === slaStatusFilter)?.label || slaStatusFilter;

  const filterSummary = useMemo(() => {
    const items = [];
    const periodLabel =
      summary?.period?.label ||
      (options.periods || []).find((p) => p.id === applied.period)?.label ||
      applied.period;
    if (periodLabel) items.push({ label: 'Period', value: periodLabel });

    const vendorLabels = labelsForIds(applied.vendorIds, options.vendors);
    items.push({
      label: 'Vendor',
      value: vendorLabels.length ? vendorLabels.join(', ') : 'All vendors',
    });

    const typeLabels = labelsForIds(applied.assetTypeIds, options.assetTypes);
    if (typeLabels.length) items.push({ label: 'Asset type', value: typeLabels.join(', ') });

    const locLabels = labelsForIds(applied.branchIds, options.locations);
    if (locLabels.length) items.push({ label: 'Location', value: locLabels.join(', ') });

    if (slaStatusFilter && slaStatusFilter !== 'all') {
      items.push({ label: 'SLA status', value: slaStatusLabel });
    }
    if (search?.trim()) items.push({ label: 'Search', value: search.trim() });
    if (advanced?.length) {
      items.push({
        label: 'Advanced',
        value: `${advanced.length} condition${advanced.length === 1 ? '' : 's'}`,
      });
    }
    return items;
  }, [
    applied,
    options,
    summary,
    slaStatusFilter,
    slaStatusLabel,
    search,
    advanced,
  ]);

  const previewSummaryItems = useMemo(() => {
    const k = summary?.kpis || {};
    return [
      {
        label: 'Service requests',
        value: k.total_requests != null ? Number(k.total_requests).toLocaleString('en-IN') : '—',
      },
      {
        label: 'SLA compliance',
        value: k.sla_compliance_pct != null ? `${k.sla_compliance_pct}%` : '—',
      },
      { label: 'SLA breaches', value: k.breached ?? '—' },
      {
        label: 'Avg response',
        value: k.avg_response_label || (k.response_data_available ? '—' : 'N/A'),
      },
      { label: 'Avg resolution', value: k.avg_resolution_label || '—' },
      { label: 'Repeat failures', value: k.repeat_failure_assets ?? '—' },
      {
        label: 'Service rating',
        value: k.rating_data_available ? `${Number(k.avg_rating).toFixed(1)} / 5` : 'N/A',
        sub: k.rating_data_available ? `${k.rating_count} ratings` : undefined,
      },
      { label: 'Vendors w/ breaches', value: k.vendors_with_breaches ?? '—' },
    ];
  }, [summary]);

  const statusPie = useMemo(() => {
    const d = summary?.status_distribution || {};
    return [
      { name: 'Within SLA', value: d.within_sla || 0 },
      { name: 'Breached', value: d.breached || 0 },
      { name: 'Open', value: d.open || 0 },
      { name: 'No SLA', value: d.no_sla || 0 },
    ].filter((x) => x.value > 0);
  }, [summary]);

  const trendData = useMemo(
    () =>
      (trends?.points || []).map((p) => {
        const key = String(p.bucket || '').slice(0, 10);
        let label = key;
        if (trends?.grain === 'month' && key) {
          const [y, m] = key.split('-');
          label = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString(undefined, {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
          });
        } else if (trends?.grain === 'week' && key) {
          label = `W ${key.slice(5)}`;
        } else if (key) {
          label = key.slice(5); // MM-DD for day
        }
        return {
          ...p,
          label,
          hasCompliance: p.sla_compliance_pct != null,
        };
      }),
    [trends],
  );

  const showTrendDots = grain === 'day' || trendData.filter((p) => p.hasCompliance).length <= 8;

  const filteredDetails = useMemo(
    () => applyAdvancedFilters(details?.rows || [], advanced, SLA_FIELD_ACCESSORS),
    [details?.rows, advanced],
  );

  const loadScopedDetailRows = useCallback(async () => {
    const data = await slaVendorPerformanceService.getDetails({
      ...detailFilters,
      page: 1,
      pageSize: 2000,
      search: search || undefined,
    });
    return applyAdvancedFilters(data?.rows || [], advanced, SLA_FIELD_ACCESSORS);
  }, [detailFilters, search, advanced]);

  const openPreview = useCallback(async () => {
    try {
      setPreviewLoading(true);
      setPreviewOpen(true);
      const rows = await loadScopedDetailRows();
      setPreviewRows(rows);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load preview');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }, [loadScopedDetailRows]);

  useEffect(() => {
    if (!exportMenuOpen) return undefined;
    const onDocClick = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

  const handleExport = useCallback(async (format) => {
    try {
      setExportMenuOpen(false);
      setExporting(true);
      const rows = await loadScopedDetailRows();
      const payload = {
        summary,
        vendors,
        detailRows: rows,
        columns,
        filterSummary,
      };
      if (format === 'pdf') {
        exportSlaVendorPdf(payload);
        toast.success('PDF downloaded');
      } else {
        exportSlaVendorExcel(payload);
        toast.success('Excel downloaded');
      }
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || 'Failed to export report');
    } finally {
      setExporting(false);
    }
  }, [loadScopedDetailRows, summary, vendors, columns, filterSummary]);

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            {summary?.period?.label || '—'}
            {loading ? ' · Loading…' : ''}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setExportMenuOpen((v) => !v)}
                disabled={exporting || loading}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                {exporting ? 'Exporting…' : 'Export'}
                <ChevronDown className={`h-3 w-3 text-slate-400 transition ${exportMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              {exportMenuOpen && !exporting && (
                <div className="absolute right-0 z-30 mt-1.5 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    Excel (.xlsx)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('pdf')}
                    className="block w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    PDF (.pdf)
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="relative z-10 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-slate-100 bg-slate-50/80 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Filters</p>
            <div className="flex flex-wrap items-center gap-2">
              <ReportPreviewButton
                onClick={openPreview}
                disabled={previewLoading || loadingDetails}
                label={previewLoading ? 'Loading…' : 'Preview'}
              />
              <button
                type="button"
                onClick={() => {
                  resetFilters();
                  setAdvanced([]);
                }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-[#0E2F4B] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#143d65]"
              >
                Apply
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Period</label>
              <select
                value={draft.period}
                onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {(options.periods || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            {draft.period === 'custom' && (
              <>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</label>
                  <input
                    type="date"
                    value={draft.dateFrom}
                    onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</label>
                  <input
                    type="date"
                    value={draft.dateTo}
                    onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Vendor</label>
              <DropdownMultiSelect
                values={draft.vendorIds}
                options={toOpts(options.vendors)}
                placeholder="All vendors"
                onChange={(vendorIds) => setDraft((d) => ({ ...d, vendorIds }))}
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Asset type</label>
              <DropdownMultiSelect
                values={draft.assetTypeIds}
                options={toOpts(options.assetTypes)}
                placeholder="All types"
                onChange={(assetTypeIds) => setDraft((d) => ({ ...d, assetTypeIds }))}
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Location</label>
              <DropdownMultiSelect
                values={draft.branchIds}
                options={toOpts(options.locations)}
                placeholder="All locations"
                onChange={(branchIds) => setDraft((d) => ({ ...d, branchIds }))}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">SLA status</label>
              <select
                value={draft.slaStatus}
                onChange={(e) => setDraft((d) => ({ ...d, slaStatus: e.target.value }))}
                className={`w-full rounded-lg border px-3 py-2 text-sm ${
                  draft.slaStatus !== 'all'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-slate-200'
                }`}
              >
                {(options.slaStatuses || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ReportAdvancedFilters
            fields={SLA_ADVANCED_FIELDS}
            value={advanced}
            onChange={setAdvanced}
          />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3 items-stretch">
          <KpiCard label="Service requests" value={kpis.total_requests?.toLocaleString('en-IN')} sub={vs.total_requests != null ? `${vs.total_requests > 0 ? '↑' : '↓'} ${Math.abs(vs.total_requests)}% vs prior` : null} />
          <KpiCard label="SLA compliance" value={kpis.sla_compliance_pct != null ? `${kpis.sla_compliance_pct}%` : '—'} hint={defs.slaCompliance} sub={vs.sla_compliance_pct != null ? `${vs.sla_compliance_pct > 0 ? '↑' : '↓'} ${Math.abs(vs.sla_compliance_pct)} pts` : null} />
          <KpiCard
            label="SLA breaches"
            value={kpis.breached}
            danger={kpis.breached > 0}
            hint={defs.slaBreach}
            onClick={slaStatusFilter === 'breached' ? clearSlaStatusFilter : filterByBreached}
            sub={
              slaStatusFilter === 'breached'
                ? 'Filter on · click to clear'
                : vs.breached != null
                  ? `${vs.breached > 0 ? '↑' : '↓'} ${Math.abs(vs.breached)}% · click to filter`
                  : 'Click to filter details'
            }
          />
          <KpiCard label="Avg response" value={kpis.avg_response_label || (kpis.response_data_available ? '—' : 'N/A')} hint={defs.avgResponse} sub={kpis.response_compliance_pct != null ? `Response SLA ${kpis.response_compliance_pct}%` : 'No recorded first-response hours'} />
          <KpiCard label="Avg resolution" value={kpis.avg_resolution_label} hint={defs.avgResolution} />
          <KpiCard label="Repeat failures" value={kpis.repeat_failure_assets} hint={defs.repeatFailure} sub={kpis.top_failure_reason ? `Top: ${kpis.top_failure_reason}` : null} />
          <KpiCard label="Service rating" value={kpis.rating_data_available ? `${Number(kpis.avg_rating).toFixed(1)} / 5` : 'N/A'} hint={defs.serviceRating} sub={kpis.rating_data_available ? `${kpis.rating_count} ratings` : 'No ratings in period'} />
          <KpiCard label="Vendors w/ breaches" value={kpis.vendors_with_breaches} danger={kpis.vendors_with_breaches > 0} />
        </div>

        {/* Trends + status */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-semibold text-slate-900">SLA compliance trend</h2>
              <div className="flex gap-1">
                {['day', 'week', 'month'].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrain(g)}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                      grain === g ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mb-3">
              % of completed work orders finished within vendor Resolution (SLA-3). Gaps = no
              completed / scored requests in that {grain}.
            </p>
            <div className="h-64">
              {trendData.some((p) => p.hasCompliance) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={grain === 'day' ? 'preserveStartEnd' : 0}
                      minTickGap={grain === 'day' ? 28 : 8}
                    />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value, name) =>
                        value == null ? ['No scored completions', name] : [`${value}%`, name]
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="sla_compliance_pct"
                      name="Compliance %"
                      stroke="#0f172a"
                      strokeWidth={2}
                      connectNulls={false}
                      dot={showTrendDots ? { r: 3, strokeWidth: 1 } : false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No trend data</div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">SLA status</h2>
            <div className="h-48">
              {statusPie.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>
                      {statusPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No status data</div>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {statusPie.map((s) => (
                <li key={s.name} className="flex justify-between">
                  <span>{s.name}</span>
                  <span className="tabular-nums font-medium">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Response / resolution trends */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[
            { key: 'avg_response_hours', title: 'Avg recorded response (hrs)' },
            { key: 'avg_resolution_hours', title: 'Avg resolution (hrs)' },
          ].map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-3">{c.title}</h2>
              <div className="h-52">
                {trendData.some((p) => p[c.key] != null) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey={c.key} stroke="#0369a1" strokeWidth={2} connectNulls={false} dot={showTrendDots ? { r: 3 } : false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">Insufficient data</div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Breach analysis */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Breaches by vendor</h2>
            <div className="h-56">
              {(breaches.byVendor || []).length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={breaches.byVendor} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="vendor_name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar
                      dataKey="breaches"
                      fill="#b91c1c"
                      radius={[0, 4, 4, 0]}
                      onClick={(d) => d?.vendor_id && setSelectedVendorId(d.vendor_id)}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">No breaches</div>
              )}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Critical SLA breaches</h2>
            <div className="overflow-x-auto max-h-56">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    {['Request', 'Asset', 'Vendor', 'Delay', 'Status'].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(breaches.rows || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                        No breaches in period
                      </td>
                    </tr>
                  )}
                  {(breaches.rows || []).map((r) => (
                    <tr key={r.ams_id} className="hover:bg-slate-50">
                      <td className="px-2 py-2">
                        <Link className="text-slate-900 font-medium hover:underline" to={WO_DETAIL_PATH(r.ams_id)}>
                          {r.request_id}
                        </Link>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.asset_id}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.vendor_name}</td>
                      <td className="px-2 py-2 tabular-nums text-red-700">{r.delay_label || '—'}</td>
                      <td className="px-2 py-2">{statusBadge(r.sla_status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Vendor performance */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Vendor performance</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  {['Vendor', 'Requests', 'SLA %', 'Breaches', 'Avg response', 'Avg resolution', 'Repeat', 'Rating'].map((h) => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(vendors.rows || []).length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                      No vendor activity in period
                    </td>
                  </tr>
                )}
                {(vendors.rows || []).map((v) => (
                  <tr
                    key={v.vendor_id}
                    className="hover:bg-slate-50 cursor-pointer"
                    onClick={() => setSelectedVendorId(v.vendor_id)}
                  >
                    <td className="px-3 py-2.5 font-medium text-slate-900">{v.vendor_name}</td>
                    <td className="px-3 py-2.5 tabular-nums">{v.requests}</td>
                    <td className="px-3 py-2.5 tabular-nums">{v.sla_compliance_pct != null ? `${v.sla_compliance_pct}%` : '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums text-red-700">{v.breaches}</td>
                    <td className="px-3 py-2.5">{v.avg_response_label || '—'}</td>
                    <td className="px-3 py-2.5">{v.avg_resolution_label || '—'}</td>
                    <td className="px-3 py-2.5 tabular-nums">{v.repeat_failures}</td>
                    <td className="px-3 py-2.5">
                      {v.avg_rating != null ? `${Number(v.avg_rating).toFixed(1)}/5 (${v.rating_count})` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Repeat failures + quality */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Repeat failure analysis</h2>
            <div className="overflow-x-auto max-h-64">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    {['Asset', 'Count', 'Reason', 'Last', 'Vendor'].map((h) => (
                      <th key={h} className="px-2 py-2 text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(repeat?.assets || []).length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-400">
                        No repeat failures
                      </td>
                    </tr>
                  )}
                  {(repeat?.assets || []).map((a) => (
                    <tr key={a.asset_id} className="hover:bg-slate-50">
                      <td className="px-2 py-2">
                        <Link to={`/assets`} className="font-medium hover:underline">
                          {a.asset_id}
                        </Link>
                      </td>
                      <td className="px-2 py-2 tabular-nums">{a.failure_count}</td>
                      <td className="px-2 py-2">{a.primary_reason || '—'}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {a.last_failure ? String(a.last_failure).slice(0, 10) : '—'}
                      </td>
                      <td className="px-2 py-2">{a.vendor_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">Service quality & ratings</h2>
            {!quality?.rating_data_available ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">
                {quality?.message || 'Rating data unavailable for selected period'}
              </div>
            ) : (
              <div className="overflow-x-auto max-h-64">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      {['Vendor', 'Rating', 'Count', 'Requests'].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(quality.rows || []).map((r) => (
                      <tr key={r.vendor_id} className="hover:bg-slate-50">
                        <td className="px-2 py-2 font-medium">{r.vendor_name}</td>
                        <td className="px-2 py-2 tabular-nums">{Number(r.avg_rating).toFixed(1)} / 5</td>
                        <td className="px-2 py-2 tabular-nums">{r.rating_count}</td>
                        <td className="px-2 py-2 tabular-nums">{r.requests}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div
          id="sla-service-details"
          className={`rounded-xl border bg-white p-4 shadow-sm space-y-3 scroll-mt-4 ${
            slaStatusFilter !== 'all' ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Service performance details</h2>
              {slaStatusFilter !== 'all' && (
                <p className="text-xs text-red-700 mt-1">
                  Filtered to <span className="font-semibold">{slaStatusLabel}</span>
                  {' · '}
                  {details.total?.toLocaleString('en-IN') ?? 0} request
                  {(details.total || 0) === 1 ? '' : 's'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {slaStatusFilter !== 'all' && (
                <button
                  type="button"
                  onClick={clearSlaStatusFilter}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-800 hover:bg-red-100"
                >
                  Clear status filter
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
              <ReportTableToolbar
            title="Request detail"
            columnsSlot={
              <ReportColumnControls
                allColumns={SLA_DETAIL_COLUMNS.all}
                columns={columns}
                setColumns={setColumns}
                defaultColumns={SLA_DETAIL_COLUMNS.default}
              />
            }
            actions={
              <>
                <input
                  value={search}
                  onChange={(e) => {
                    setPage(1);
                    setSearch(e.target.value);
                  }}
                  placeholder="Search request, asset, vendor…"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/25"
                />
                <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPage(1);
                      setPageSize(Number(e.target.value));
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            }
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-[#0E2F4B] text-white">
                <tr>
                  {columns.map((h) => (
                    <th
                      key={h}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDetails && (
                  <tr>
                    <td colSpan={columns.length} className="px-2 py-8 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loadingDetails && !filteredDetails.length && (
                  <tr>
                    <td colSpan={columns.length} className="px-2 py-8 text-center text-slate-400">
                      No records match filters
                    </td>
                  </tr>
                )}
                {!loadingDetails &&
                  filteredDetails.map((r) => (
                    <tr key={r.ams_id} className="hover:bg-slate-50">
                      {columns.map((col) => (
                        <td key={col} className="px-2 py-2 whitespace-nowrap">
                          {col === 'Request' ? (
                            <Link
                              to={WO_DETAIL_PATH(r.ams_id)}
                              className="font-medium hover:underline"
                            >
                              {getSlaDetailCellValue(r, col)}
                            </Link>
                          ) : col === 'SLA' ? (
                            statusBadge(r.sla_status)
                          ) : col === 'Delay' ? (
                            <span className="tabular-nums text-red-700">
                              {getSlaDetailCellValue(r, col)}
                            </span>
                          ) : (
                            <span className="tabular-nums">{getSlaDetailCellValue(r, col)}</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>
              Page {details.page || page} of {details.totalPages || 1} · {(details.total || 0).toLocaleString('en-IN')} rows
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <button
                type="button"
                disabled={page >= (details.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 disabled:opacity-40"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vendor detail drawer */}
      {selectedVendorId && (
        <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/30" onClick={() => setSelectedVendorId(null)}>
          <div
            className="h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                {vendorDetail?.vendor?.vendor_name || 'Vendor detail'}
              </h3>
              <button type="button" onClick={() => setSelectedVendorId(null)} className="p-1 rounded hover:bg-slate-100">
                <X className="h-5 w-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Requests', vendorDetail?.vendor?.requests],
                  ['SLA %', vendorDetail?.vendor?.sla_compliance_pct != null ? `${vendorDetail.vendor.sla_compliance_pct}%` : '—'],
                  ['Breaches', vendorDetail?.vendor?.breaches],
                  ['Avg resolution', vendorDetail?.vendor?.avg_resolution_label || '—'],
                  ['Avg response', vendorDetail?.vendor?.avg_response_label || '—'],
                  [
                    'Rating',
                    vendorDetail?.vendor?.avg_rating != null
                      ? `${Number(vendorDetail.vendor.avg_rating).toFixed(1)}/5`
                      : 'N/A',
                  ],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-[11px] uppercase text-slate-500">{k}</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{v ?? '—'}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent breaches</h4>
                <ul className="space-y-2 text-sm">
                  {(vendorDetail?.breaches || []).slice(0, 8).map((b) => (
                    <li key={b.ams_id} className="flex justify-between border-b border-slate-100 pb-2">
                      <Link to={WO_DETAIL_PATH(b.ams_id)} className="hover:underline">
                        {b.request_id}
                      </Link>
                      <span className="text-red-700 tabular-nums">{b.delay_label}</span>
                    </li>
                  ))}
                  {!(vendorDetail?.breaches || []).length && (
                    <li className="text-slate-400">No breaches for this vendor in period</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <ReportPreviewModal
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewRows([]);
        }}
        title="SLA & Vendor preview"
        columns={columns}
        rows={previewLoading ? [] : previewRows}
        getCellValue={getSlaDetailCellValue}
        emptyLabel={previewLoading ? 'Loading filtered data…' : 'No detail rows to preview.'}
        filterSummary={filterSummary}
        summaryItems={previewSummaryItems}
      />
    </div>
  );
}
