import React from 'react';
import { Loader2, X } from 'lucide-react';

function pctTone(pct) {
  if (pct == null) return 'text-slate-700';
  if (pct >= 90) return 'text-emerald-700';
  if (pct >= 70) return 'text-amber-700';
  return 'text-rose-700';
}

export default function PmComplianceDialog({ open, loading, data, error, onClose }) {
  if (!open) return null;

  const totals = data?.totals;
  const rows = data?.by_institution_department || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close preventive maintenance compliance"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">
              Preventive maintenance compliance
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              How well scheduled preventive maintenance is completed on time
              {data?.period?.label ? ` · ${data.period.label}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading compliance…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  ['PMs due', totals?.pms_due ?? 0],
                  ['On time', totals?.pms_on_time ?? 0],
                  ['Late', totals?.pms_late ?? 0],
                  ['Still open', totals?.pms_open ?? 0],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </div>
                    <div className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Overall compliance
                  </div>
                  <div className={`mt-1 text-3xl font-semibold tabular-nums ${pctTone(totals?.pm_compliance_pct)}`}>
                    {totals?.pm_compliance_pct == null
                      ? '—'
                      : `${totals.pm_compliance_pct}%`}
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {totals?.pms_on_time ?? 0} on time ÷ {totals?.pms_due ?? 0} due
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                  By institution and department
                </h4>
                {rows.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No preventive maintenance due in this period for the selected asset types.
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[28%]">
                            Institution
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 w-[22%]">
                            Department
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Due
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            On time
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Late
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Open
                          </th>
                          <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Compliance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {rows.map((row) => (
                          <tr key={`${row.branch_id || ''}-${row.dept_id || ''}`}>
                            <td className="px-3 py-2.5 text-slate-800 break-words align-top">
                              {row.branch_name || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-slate-800 break-words align-top">
                              {row.department_name || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {row.pms_due}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {row.pms_on_time}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {row.pms_late}
                            </td>
                            <td className="px-3 py-2.5 text-right tabular-nums text-slate-700">
                              {row.pms_open}
                            </td>
                            <td
                              className={`px-3 py-2.5 text-right tabular-nums font-semibold ${pctTone(row.pm_compliance_pct)}`}
                            >
                              {row.pm_compliance_pct == null
                                ? '—'
                                : `${row.pm_compliance_pct}%`}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
