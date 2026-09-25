import React, { useMemo } from 'react';
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

const COLORS = [
  '#143d65',
  '#1e5a8a',
  '#2f7ab8',
  '#0f766e',
  '#b45309',
  '#be123c',
  '#475569',
  '#0369a1',
  '#a16207',
  '#64748b',
];

const COVERAGE_COLORS = {
  'With evidence': '#0f766e',
  'No evidence in period': '#be123c',
};

const STATUS_FULL_FORM = {
  IN: 'Initiated',
  IP: 'In progress',
  CO: 'Completed',
  CA: 'Cancelled',
  CR: 'Created',
  AP: 'Approved',
  RJ: 'Rejected',
  RE: 'Reopened',
  OH: 'On hold',
  UA: 'Under approval',
  UL: 'Under maintenance',
  SC: 'Scrapped',
  SS: 'Scrap sold',
  AC: 'Active',
  IA: 'Inactive',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SCRAPPED: 'Scrapped',
};

function statusLabel(value) {
  if (value == null || value === '') return 'Unknown';
  const raw = String(value).trim();
  const upper = raw.toUpperCase();
  return STATUS_FULL_FORM[upper] || raw;
}

function countBy(items, getKey) {
  const map = new Map();
  (items || []).forEach((item) => {
    const key = String(getKey(item) || '').trim() || 'Unassigned';
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function truncate(text, max = 22) {
  const s = String(text || '');
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`.trim()}>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {subtitle ? <p className="text-xs text-slate-500 mt-0.5 mb-3">{subtitle}</p> : <div className="mb-3" />}
      {children}
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="h-52 flex items-center justify-center text-sm text-slate-400 text-center px-4">
      {label}
    </div>
  );
}

function DonutChart({ data, emptyLabel, colorMap }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const top = data.slice(0, 8);
  const rest = data.slice(8);
  const chartData =
    rest.length > 0
      ? [...top, { name: 'Other', value: rest.reduce((s, d) => s + d.value, 0) }]
      : top;

  if (!chartData.length || total === 0) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative h-52 w-full sm:w-1/2 min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={78}
              paddingAngle={2}
            >
              {chartData.map((d, i) => (
                <Cell
                  key={d.name}
                  fill={colorMap?.[d.name] || COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [
                `${Number(value).toLocaleString('en-IN')} (${Math.round((Number(value) / total) * 100)}%)`,
                name,
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-lg font-semibold text-slate-900 tabular-nums">{total}</div>
          <div className="text-[10px] uppercase tracking-wide text-slate-500">Total</div>
        </div>
      </div>
      <ul className="w-full sm:w-1/2 space-y-1.5 text-xs text-slate-600 max-h-52 overflow-y-auto pr-1">
        {chartData.map((d, i) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <li key={d.name} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: colorMap?.[d.name] || COLORS[i % COLORS.length] }}
                />
                <span className="truncate" title={d.name}>
                  {d.name}
                </span>
              </span>
              <span className="tabular-nums font-medium text-slate-800 shrink-0">
                {d.value} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function HBarChart({ data, emptyLabel, valueLabel = 'Assets' }) {
  const chartData = data.slice(0, 10).map((d) => ({
    ...d,
    short: truncate(d.name),
  }));

  if (!chartData.length) {
    return <EmptyState label={emptyLabel} />;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
          <YAxis
            type="category"
            dataKey="short"
            width={120}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString('en-IN'), valueLabel]}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Bar dataKey="value" name={valueLabel} radius={[0, 4, 4, 0]} fill="#143d65" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function assetHasEvidence(asset) {
  const h = asset.history || {};
  return Boolean(
    (h.maintenance && h.maintenance.length) ||
      (h.breakdown && h.breakdown.length) ||
      (h.certifications && h.certifications.length) ||
      (h.invoices && h.invoices.length) ||
      (h.purchaseOrders && h.purchaseOrders.length) ||
      asset.invoice_no,
  );
}

/**
 * Audit-focused visuals: evidence coverage + operational status + scoped asset mix.
 */
export default function AuditCharts({ assets, report }) {
  const sections = report?.sections || {};
  const assetCount = assets?.length || 0;

  const coverage = useMemo(() => {
    if (!assetCount) return { pie: [], withCount: 0, withoutCount: 0, byType: [] };
    let withCount = 0;
    let withoutCount = 0;
    let withMaint = 0;
    let withBreakdown = 0;
    let withCert = 0;
    let withInvoice = 0;
    let withPo = 0;

    assets.forEach((a) => {
      const h = a.history || {};
      const hasMaint = (h.maintenance || []).length > 0;
      const hasBr = (h.breakdown || []).length > 0;
      const hasCert = (h.certifications || []).length > 0;
      const hasInv = (h.invoices || []).length > 0 || Boolean(a.invoice_no);
      const hasPo = (h.purchaseOrders || []).length > 0;
      if (hasMaint) withMaint += 1;
      if (hasBr) withBreakdown += 1;
      if (hasCert) withCert += 1;
      if (hasInv) withInvoice += 1;
      if (hasPo) withPo += 1;
      if (assetHasEvidence(a)) withCount += 1;
      else withoutCount += 1;
    });

    return {
      pie: [
        { name: 'With evidence', value: withCount },
        { name: 'No evidence in period', value: withoutCount },
      ].filter((d) => d.value > 0),
      withCount,
      withoutCount,
      coveragePct: assetCount ? Math.round((withCount / assetCount) * 100) : 0,
      byType: [
        { name: 'Maintenance', value: withMaint },
        { name: 'Breakdowns', value: withBreakdown },
        { name: 'Certifications', value: withCert },
        { name: 'Invoices', value: withInvoice },
        { name: 'Purchase orders', value: withPo },
      ].filter((d) => d.value > 0),
    };
  }, [assets, assetCount]);

  const evidenceRecords = useMemo(() => {
    return [
      { name: 'Maintenance', value: sections.maintenance?.length || 0 },
      { name: 'Breakdowns', value: sections.breakdown?.length || 0 },
      { name: 'Certifications', value: sections.certifications?.length || 0 },
      { name: 'Invoices', value: sections.invoices?.length || 0 },
      { name: 'Purchase orders', value: sections.purchaseOrders?.length || 0 },
    ].filter((d) => d.value > 0);
  }, [sections]);

  const maintByStatus = useMemo(
    () => countBy(sections.maintenance, (r) => statusLabel(r.status)),
    [sections.maintenance],
  );

  const breakdownByReason = useMemo(() => {
    const byReason = countBy(
      sections.breakdown,
      (r) => r.breakdown_reason || statusLabel(r.breakdown_status),
    );
    return byReason;
  }, [sections.breakdown]);

  const byType = useMemo(
    () => countBy(assets, (a) => a.asset_type_name || a.asset_type_id || 'Unknown type'),
    [assets],
  );

  const byBranch = useMemo(
    () => countBy(assets, (a) => a.branch_name || 'Unassigned branch'),
    [assets],
  );

  const byDepartment = useMemo(
    () => countBy(assets, (a) => a.department_name || 'Unassigned department'),
    [assets],
  );

  const byAssetStatus = useMemo(
    () => countBy(assets, (a) => statusLabel(a.asset_status)),
    [assets],
  );

  if (!assetCount) return null;

  const showDept = byDepartment.length > 1 || byDepartment[0]?.name !== 'Unassigned department';
  const showBranch = byBranch.length > 0;

  return (
    <div className="px-6 py-5 space-y-4 border-b border-slate-100">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Audit insights</h3>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Evidence coverage">
          <DonutChart
            data={coverage.pie}
            emptyLabel="No assets in scope"
            colorMap={COVERAGE_COLORS}
          />
        </ChartCard>

        <ChartCard title="Evidence records by category">
          <DonutChart
            data={evidenceRecords}
            emptyLabel="No evidence records in this period"
          />
        </ChartCard>

        <ChartCard title="Assets with each evidence type">
          {coverage.byType.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={coverage.byType}
                  layout="vertical"
                  margin={{ top: 4, right: 28, left: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    domain={[0, assetCount]}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip
                    formatter={(value) => [
                      `${Number(value).toLocaleString('en-IN')} of ${assetCount} (${Math.round((Number(value) / assetCount) * 100)}%)`,
                      'Assets',
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="value" name="Assets" radius={[0, 4, 4, 0]}>
                    {coverage.byType.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState label="No evidence types recorded in this period" />
          )}
        </ChartCard>

        <ChartCard title="Asset status">
          <DonutChart data={byAssetStatus} emptyLabel="No status data" />
        </ChartCard>

        {(maintByStatus.length > 0 || breakdownByReason.length > 0) && (
          <>
            <ChartCard title="Maintenance by status">
              <DonutChart
                data={maintByStatus}
                emptyLabel="No maintenance in this period"
              />
            </ChartCard>

            <ChartCard title="Breakdowns by reason">
              <DonutChart
                data={breakdownByReason}
                emptyLabel="No breakdowns in this period"
              />
            </ChartCard>
          </>
        )}

        <ChartCard title="Assets by type">
          <HBarChart data={byType} emptyLabel="No asset types" />
        </ChartCard>

        {showBranch && (
          <ChartCard title="Assets by branch">
            <HBarChart data={byBranch} emptyLabel="No branch data" />
          </ChartCard>
        )}

        {showDept && (
          <ChartCard
            title="Assets by department"
            className={showBranch ? '' : 'xl:col-span-2'}
          >
            <HBarChart data={byDepartment} emptyLabel="No department data" />
          </ChartCard>
        )}
      </div>
    </div>
  );
}
