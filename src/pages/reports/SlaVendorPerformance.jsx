import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
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
import { ChevronLeft, ChevronRight, Info, RefreshCw, X } from 'lucide-react';
import { DropdownMultiSelect } from '../../components/reportModels/ReportComponents';
import { useSlaVendorPerformance } from './slaVendorPerformance/useSlaVendorPerformance';

const PAGE_SIZES = [10, 25, 30, 50, 100];
const PIE_COLORS = ['#15803d', '#b91c1c', '#64748b', '#a16207', '#475569'];

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

  const defs = options.definitions || {};
  const kpis = summary?.kpis || {};
  const vs = kpis.vs_previous || {};
  const slaStatusFilter = applied.slaStatus || 'all';
  const slaStatusLabel =
    (options.slaStatuses || []).find((s) => s.id === slaStatusFilter)?.label || slaStatusFilter;

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

  return (
    <div className="min-h-full bg-slate-50/80">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-slate-900">SLA & Vendor Performance</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {summary?.period?.label || '—'}
              {loading ? ' · Loading…' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Period</label>
              <select
                value={draft.period}
                onChange={(e) => setDraft((d) => ({ ...d, period: e.target.value }))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
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
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">From</label>
                  <input
                    type="date"
                    value={draft.dateFrom}
                    onChange={(e) => setDraft((d) => ({ ...d, dateFrom: e.target.value }))}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">To</label>
                  <input
                    type="date"
                    value={draft.dateTo}
                    onChange={(e) => setDraft((d) => ({ ...d, dateTo: e.target.value }))}
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </>
            )}
            <div className="min-w-[180px] flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Vendor</label>
              <DropdownMultiSelect
                values={draft.vendorIds}
                options={toOpts(options.vendors)}
                placeholder="All vendors"
                onChange={(vendorIds) => setDraft((d) => ({ ...d, vendorIds }))}
              />
            </div>
            <div className="min-w-[180px] flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Asset type</label>
              <DropdownMultiSelect
                values={draft.assetTypeIds}
                options={toOpts(options.assetTypes)}
                placeholder="All types"
                onChange={(assetTypeIds) => setDraft((d) => ({ ...d, assetTypeIds }))}
              />
            </div>
            <div className="min-w-[160px] flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Location</label>
              <DropdownMultiSelect
                values={draft.branchIds}
                options={toOpts(options.locations)}
                placeholder="All locations"
                onChange={(branchIds) => setDraft((d) => ({ ...d, branchIds }))}
              />
            </div>
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">SLA status</label>
              <select
                value={draft.slaStatus}
                onChange={(e) => setDraft((d) => ({ ...d, slaStatus: e.target.value }))}
                className={`w-full rounded-md border px-3 py-2 text-sm ${
                  draft.slaStatus !== 'all'
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-gray-300'
                }`}
              >
                {(options.slaStatuses || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 pb-0.5">
              <button
                type="button"
                onClick={applyFilters}
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
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
            { key: 'avg_response_hours', title: 'Avg recorded response (hrs)', note: 'From Vendor SLA form SLA-1 values' },
            { key: 'avg_resolution_hours', title: 'Avg resolution (hrs)', note: 'Completion − request start' },
          ].map((c) => (
            <div key={c.key} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">{c.title}</h2>
              <p className="text-xs text-slate-500 mb-3">{c.note}</p>
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
                        <Link className="text-slate-900 font-medium hover:underline" to={`/maintenance-list-detail/${r.ams_id}`}>
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
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Repeat failure analysis</h2>
            <p className="text-xs text-slate-500 mb-3">
              {repeat?.overview?.asset_count || 0} assets · {repeat?.overview?.event_count || 0} events
              {repeat?.overview?.top_reason ? ` · Top reason: ${repeat.overview.top_reason}` : ''}
            </p>
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
            <h2 className="text-sm font-semibold text-slate-900 mb-1">Service quality & ratings</h2>
            <p className="text-xs text-slate-500 mb-3">From maintenance Vendor SLA ratings only</p>
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
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                placeholder="Search request, asset, vendor…"
                className="rounded-md border border-slate-200 px-3 py-1.5 text-sm w-56"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                Rows
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPage(1);
                    setPageSize(Number(e.target.value));
                  }}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-sm"
                >
                  {PAGE_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  {[
                    'Request',
                    'Asset',
                    'Type',
                    'Vendor',
                    'Created',
                    'Completed',
                    'Resolution',
                    'Target',
                    'SLA',
                    'Delay',
                    'Rating',
                  ].map((h) => (
                    <th key={h} className="px-2 py-2.5 text-left font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingDetails && (
                  <tr>
                    <td colSpan={11} className="px-2 py-8 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loadingDetails && !(details.rows || []).length && (
                  <tr>
                    <td colSpan={11} className="px-2 py-8 text-center text-slate-400">
                      No records match filters
                    </td>
                  </tr>
                )}
                {!loadingDetails &&
                  (details.rows || []).map((r) => (
                    <tr key={r.ams_id} className="hover:bg-slate-50">
                      <td className="px-2 py-2">
                        <Link to={`/maintenance-list-detail/${r.ams_id}`} className="font-medium hover:underline">
                          {r.request_id}
                        </Link>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.asset_id}</td>
                      <td className="px-2 py-2 max-w-[120px] truncate">{r.asset_type_name}</td>
                      <td className="px-2 py-2 whitespace-nowrap">{r.vendor_name}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.request_start ? String(r.request_start).slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {r.completed_at ? String(r.completed_at).slice(0, 16).replace('T', ' ') : '—'}
                      </td>
                      <td className="px-2 py-2 tabular-nums">{r.resolution_label || '—'}</td>
                      <td className="px-2 py-2 tabular-nums">{r.resolution_target_label || '—'}</td>
                      <td className="px-2 py-2">{statusBadge(r.sla_status)}</td>
                      <td className="px-2 py-2 tabular-nums text-red-700">{r.delay_label || '—'}</td>
                      <td className="px-2 py-2 tabular-nums">{r.sla_rating != null ? r.sla_rating : '—'}</td>
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
                      <Link to={`/maintenance-list-detail/${b.ams_id}`} className="hover:underline">
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
    </div>
  );
}
