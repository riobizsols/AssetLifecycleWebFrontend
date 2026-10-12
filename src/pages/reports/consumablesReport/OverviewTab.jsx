import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, Building2, PackageCheck, TrendingUp } from 'lucide-react';
import StockStatusBadge from '../../../components/consumables/StockStatusBadge';
import { formatDate, formatQty, STATUS_LABELS } from './config';

const STATUS_COLORS = {
  OK: '#10b981',
  LOW_STOCK: '#f59e0b',
  REORDER: '#f97316',
  OUT_OF_STOCK: '#f43f5e',
};

const SEVERITY = { OUT_OF_STOCK: 0, REORDER: 1, LOW_STOCK: 2, OK: 3 };

function Card({ icon: Icon, title, subtitle, children, className = '' }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className="mb-3 flex items-start gap-2.5">
        {Icon ? (
          <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function Empty({ label }) {
  return (
    <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400">
      {label}
    </div>
  );
}

const shortDate = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
};

export default function OverviewTab({ report, loading }) {
  const summary = report?.summary;

  const statusData = useMemo(
    () =>
      Object.entries(summary?.statusCounts || {})
        .filter(([, v]) => v > 0)
        .map(([key, value]) => ({ key, name: STATUS_LABELS[key] || key, value })),
    [summary],
  );

  const deptData = useMemo(
    () =>
      (summary?.byDepartment || []).slice(0, 8).map((d) => ({
        name: d.dept_name,
        allocations: d.allocation_count,
        items: d.items,
      })),
    [summary],
  );

  const trendData = useMemo(
    () => (summary?.trend || []).map((t) => ({ ...t, label: shortDate(t.date) })),
    [summary],
  );

  const watchlist = useMemo(
    () =>
      (report?.stock || [])
        .filter((r) => r.stock_status !== 'OK')
        .sort(
          (a, b) =>
            SEVERITY[a.stock_status] - SEVERITY[b.stock_status] ||
            Number(a.quantity) - Number(b.quantity),
        )
        .slice(0, 8),
    [report],
  );

  if (loading && !report) {
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card
        icon={TrendingUp}
        title="Received vs allocated"
        subtitle="Daily quantities in the selected period (all units combined)"
        className="lg:col-span-3"
      >
        <div className="h-64">
          {trendData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 8, left: -12, bottom: 0 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v) => formatQty(v)} cursor={{ fill: '#f1f5f9' }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="received" name="Received" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="allocated" name="Allocated" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="No stock movements in this period" />
          )}
        </div>
      </Card>

      <Card
        icon={PackageCheck}
        title="Stock health"
        subtitle="Stock entries by status right now"
        className="lg:col-span-2"
      >
        <div className="h-64">
          {statusData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="55%"
                  outerRadius="85%"
                  paddingAngle={2}
                  stroke="none"
                >
                  {statusData.map((d) => (
                    <Cell key={d.key} fill={STATUS_COLORS[d.key]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="No stock entries" />
          )}
        </div>
      </Card>

      <Card
        icon={Building2}
        title="Allocations by department"
        subtitle="Number of allocations and distinct items issued"
        className="lg:col-span-3"
      >
        <div className="h-64">
          {deptData.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 12, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={130}
                  tick={{ fontSize: 11, fill: '#334155' }}
                  tickFormatter={(v) => (String(v).length > 18 ? `${String(v).slice(0, 17)}…` : v)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="allocations" name="Allocations" fill="#0E2F4B" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="items" name="Distinct items" fill="#FFC107" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Empty label="No allocations in this period" />
          )}
        </div>
      </Card>

      <Card
        icon={AlertTriangle}
        title="Reorder watchlist"
        subtitle="Items below min stock, at reorder level or out of stock"
        className="lg:col-span-2"
      >
        {watchlist.length ? (
          <ul className="divide-y divide-slate-100">
            {watchlist.map((r) => (
              <li key={r.cinven_id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800" title={r.consumable}>
                    {r.consumable}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {(r.brand && r.brand.trim()) || 'Unbranded'} · {formatQty(r.quantity)} {r.uom_name || ''}
                    {r.branch_name ? ` · ${r.branch_name}` : ''}
                  </p>
                </div>
                <StockStatusBadge status={r.stock_status} />
              </li>
            ))}
          </ul>
        ) : (
          <Empty label="All stock is healthy" />
        )}
      </Card>

      <Card
        title="Most allocated consumables"
        subtitle="Ranked by quantity issued in the selected period"
        className="lg:col-span-5"
      >
        {summary?.topConsumables?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4 font-semibold">#</th>
                  <th className="py-2 pr-4 font-semibold">Consumable</th>
                  <th className="py-2 pr-4 text-right font-semibold">Allocated</th>
                  <th className="py-2 pr-4 text-right font-semibold">Allocations</th>
                  <th className="py-2 pr-4 text-right font-semibold">Departments</th>
                  <th className="py-2 font-semibold">Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.topConsumables.slice(0, 10).map((c, idx) => {
                  const max = summary.topConsumables[0]?.allocated_qty || 1;
                  return (
                    <tr key={c.consum_id}>
                      <td className="py-2 pr-4 text-slate-400 tabular-nums">{idx + 1}</td>
                      <td className="py-2 pr-4 font-medium text-slate-800">{c.consumable}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">
                        {formatQty(c.allocated_qty)} <span className="text-slate-400">{c.uom_name || ''}</span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{c.allocation_count}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{c.departments}</td>
                      <td className="w-48 py-2">
                        <div className="h-1.5 w-full rounded-full bg-slate-100">
                          <div
                            className="h-1.5 rounded-full bg-[#0E2F4B] transition-[width] duration-700"
                            style={{ width: `${Math.max(4, (c.allocated_qty / max) * 100)}%` }}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty label="No allocations in this period" />
        )}
        {report?.generatedAt ? (
          <p className="mt-3 text-[11px] text-slate-400">Generated {formatDate(report.generatedAt)}</p>
        ) : null}
      </Card>
    </div>
  );
}
