import React from 'react';

export function formatDate(value) {
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

export function StatusPill({ value }) {
  const raw = String(value || '').toLowerCase();
  let tone = 'bg-slate-100 text-slate-700';
  if (['active', 'valid', 'completed', 'co', 'ap'].some((x) => raw.includes(x))) {
    tone = 'bg-emerald-50 text-emerald-800';
  } else if (['expir', 'attention', 'pending', 'ip', 'in'].some((x) => raw.includes(x))) {
    tone = 'bg-amber-50 text-amber-800';
  } else if (['inactive', 'expired', 'scrap', 'cancel'].some((x) => raw.includes(x))) {
    tone = 'bg-rose-50 text-rose-800';
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {value || '—'}
    </span>
  );
}

export function EmptyHistory({ label }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
      <p className="text-sm text-slate-500">No {label} for this asset in the selected period.</p>
      <p className="text-xs text-slate-400 mt-2 max-w-md mx-auto">
        Data appears here only after it is recorded on the asset (maintenance schedule, breakdowns,
        documents, invoice / PO fields).
      </p>
    </div>
  );
}

export function formatHours(value) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  return Number.isInteger(n) ? `${n} h` : `${n.toFixed(2)} h`;
}

export function MiniTable({ columns, rows, emptyLabel }) {
  if (!rows?.length) return <EmptyHistory label={emptyLabel} />;
  return (
    <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
      <table className="w-full table-fixed text-sm">
        <thead className="bg-slate-50">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row, idx) => (
            <tr key={idx} className="hover:bg-slate-50/80">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-3 text-slate-700 align-top ${
                    c.wrap === false ? 'whitespace-nowrap' : 'break-words whitespace-normal'
                  }`}
                >
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

/** Group section rows by asset_id for the expand panels. */
export function buildHistoryByAsset(report) {
  if (!report) return { assets: [], index: {} };
  const assets = report.sections?.assetDetails?.length
    ? report.sections.assetDetails
    : report.assets || [];
  const index = {};
  const ensure = (id) => {
    if (!index[id]) {
      index[id] = {
        maintenance: [],
        breakdown: [],
        certifications: [],
        invoices: [],
        purchaseOrders: [],
      };
    }
    return index[id];
  };
  (report.sections?.maintenance || []).forEach((r) => ensure(r.asset_id).maintenance.push(r));
  (report.sections?.breakdown || []).forEach((r) => ensure(r.asset_id).breakdown.push(r));
  (report.sections?.certifications || []).forEach((r) => ensure(r.asset_id).certifications.push(r));
  (report.sections?.invoices || []).forEach((r) => ensure(r.asset_id).invoices.push(r));
  (report.sections?.purchaseOrders || []).forEach((r) => ensure(r.asset_id).purchaseOrders.push(r));
  return { assets, index };
}

export function enrichAssets(byAsset) {
  return byAsset.assets.map((a) => {
    const hist = byAsset.index[a.asset_id] || {
      maintenance: [],
      breakdown: [],
      certifications: [],
      invoices: [],
      purchaseOrders: [],
    };
    const lastMaint = hist.maintenance[0];
    const certCount = hist.certifications.length;
    return {
      ...a,
      history: hist,
      last_maintenance: lastMaint?.act_maint_st_date || lastMaint?.created_on || null,
      certification_summary: certCount
        ? `${certCount} document${certCount === 1 ? '' : 's'}`
        : '—',
    };
  });
}
