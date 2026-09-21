import React from 'react';

export default function SummaryStrip({ summary }) {
  if (!summary?.length) return null;
  return (
    <div className="px-6 py-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-6 border-b border-slate-100">
      {summary.map((item) => (
        <div key={item.label}>
          <div className="text-2xl font-semibold text-slate-900 tabular-nums">{item.value}</div>
          <div className="text-xs text-slate-500 mt-1">{item.label}</div>
        </div>
      ))}
    </div>
  );
}
