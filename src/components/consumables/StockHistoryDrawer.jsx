import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Loader2,
  PackageOpen,
  PackagePlus,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { consumableService, apiError } from '../../services/consumableService';
import { formatQty } from '../../hooks/useConsumablesData';
import { SideDrawer } from './ConsumablesUi';
import StockStatusBadge from './StockStatusBadge';

const TXN = {
  OPENING: { label: 'Opening stock', icon: PackageOpen, tone: 'bg-sky-50 text-sky-700', group: 'in' },
  RESTOCK: { label: 'Restocked', icon: PackagePlus, tone: 'bg-emerald-50 text-emerald-700', group: 'in' },
  ADJUSTMENT: { label: 'Adjusted', icon: SlidersHorizontal, tone: 'bg-violet-50 text-violet-700', group: 'adj' },
  ISSUE: { label: 'Allocated', icon: ArrowUpRight, tone: 'bg-orange-50 text-orange-700', group: 'out' },
  ISSUE_EDIT: { label: 'Allocation changed', icon: ArrowUpRight, tone: 'bg-amber-50 text-amber-700', group: 'out' },
  ISSUE_REVERSAL: { label: 'Allocation reversed', icon: RotateCcw, tone: 'bg-slate-100 text-slate-700', group: 'out' },
};

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'in', label: 'Restocks' },
  { id: 'out', label: 'Allocations' },
  { id: 'adj', label: 'Adjustments' },
];

const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

const signed = (n) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${formatQty(Math.abs(n))}`;

export default function StockHistoryDrawer({ row, onClose }) {
  const [state, setState] = useState({ loading: true, error: null, entry: row, logs: [] });
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    consumableService
      .getInventoryHistory(row.cinven_id)
      .then((res) => {
        if (!cancelled) setState({ loading: false, error: null, entry: res?.entry || row, logs: res?.logs || [] });
      })
      .catch((err) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: apiError(err, 'Failed to load stock history') }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [row]);

  const { entry, logs } = state;
  const unit = entry?.uom_name ? ` ${entry.uom_name}` : '';

  const totals = useMemo(() => {
    let received = 0;
    let issued = 0;
    let restocks = 0;
    logs.forEach((l) => {
      const q = Number(l.qty_change) || 0;
      if (l.txn_type === 'OPENING' || l.txn_type === 'RESTOCK') {
        received += q;
        restocks += 1;
      } else if (TXN[l.txn_type]?.group === 'out') {
        issued -= q;
      }
    });
    return { received, issued, restocks };
  }, [logs]);

  const visible = useMemo(
    () => (filter === 'all' ? logs : logs.filter((l) => TXN[l.txn_type]?.group === filter)),
    [logs, filter],
  );

  return (
    <SideDrawer
      title={`${entry?.consumable || 'Stock'}${entry?.brand ? ` · ${entry.brand}` : ''}`}
      description="Every restock, allocation and adjustment for this stock entry."
      onClose={onClose}
    >
      <div className="space-y-4 border-b border-[#E8EEF4] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-[#5A6B7C]">On hand now</div>
            <div className="text-2xl font-semibold tabular-nums text-[#0E2F4B]">
              {formatQty(entry?.quantity)}
              <span className="ml-1 text-sm font-normal text-[#7A8A9A]">{unit.trim()}</span>
            </div>
          </div>
          <StockStatusBadge status={entry?.stock_status} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Received', value: `${formatQty(totals.received)}${unit}`, tone: 'text-emerald-700' },
            { label: 'Allocated', value: `${formatQty(totals.issued)}${unit}`, tone: 'text-orange-700' },
            { label: 'Times stocked', value: totals.restocks, tone: 'text-[#0E2F4B]' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-[#E8EEF4] bg-[#F8FAFC] px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-[#5A6B7C]">{s.label}</div>
              <div className={`font-semibold tabular-nums ${s.tone}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.id
                  ? 'bg-[#0E2F4B] text-white'
                  : 'bg-[#F3F6F9] text-[#33506B] hover:bg-[#E8EEF4]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-4">
        {state.loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#5A6B7C]">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading history…
          </div>
        ) : state.error ? (
          <p className="py-12 text-center text-sm text-[#B42318]">{state.error}</p>
        ) : visible.length === 0 ? (
          <p className="py-12 text-center text-sm text-[#5A6B7C]">No movements to show.</p>
        ) : (
          <ol className="relative space-y-4 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-px before:bg-[#E8EEF4]">
            {visible.map((l) => {
              const meta = TXN[l.txn_type] || TXN.ADJUSTMENT;
              const Icon = meta.icon;
              const change = Number(l.qty_change) || 0;
              return (
                <li key={l.log_id} className="relative flex gap-3">
                  <span
                    className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${meta.tone}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 rounded-lg border border-[#E8EEF4] px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#0E2F4B]">{meta.label}</div>
                        <div className="text-[11px] text-[#7A8A9A]">
                          {formatDateTime(l.created_on)}
                          {l.created_by_name || l.created_by ? ` · ${l.created_by_name || l.created_by}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${
                            change >= 0 ? 'text-emerald-700' : 'text-orange-700'
                          }`}
                        >
                          {change >= 0 ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                          {signed(change)}
                        </div>
                        {l.qty_before !== null && l.qty_after !== null ? (
                          <div className="text-[11px] tabular-nums text-[#7A8A9A]">
                            {formatQty(l.qty_before)} → {formatQty(l.qty_after)}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {l.dept_name || l.dept_id || l.reference || l.remarks ? (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {l.dept_name || l.dept_id ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-medium text-sky-800">
                            <Building2 className="h-3 w-3" />
                            {l.dept_name || l.dept_id}
                          </span>
                        ) : null}
                        {l.reference ? (
                          <span className="rounded-md bg-[#F3F6F9] px-1.5 py-0.5 font-medium text-[#33506B]">
                            Ref: {l.reference}
                          </span>
                        ) : null}
                        {l.remarks ? <span className="text-[#5A6B7C]">{l.remarks}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </SideDrawer>
  );
}
