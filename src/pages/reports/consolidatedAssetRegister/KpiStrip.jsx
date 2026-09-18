import React from 'react';
import { formatInrCurrency } from './utils';

export default function KpiStrip({ consolidated, loading }) {
  const items = [
    { label: 'Asset count', value: loading ? '—' : String(consolidated?.asset_count ?? 0) },
    {
      label: 'Acquisition value',
      value: loading ? '—' : formatInrCurrency(consolidated?.acquisition_value),
    },
    {
      label: 'Depreciation',
      value: loading ? '—' : formatInrCurrency(consolidated?.total_depreciation),
    },
    {
      label: 'Book value',
      value: loading ? '—' : formatInrCurrency(consolidated?.book_value),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
        >
          <div className="text-[11px] uppercase tracking-wide text-slate-500 font-medium">
            {item.label}
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-900 tabular-nums tracking-tight">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
