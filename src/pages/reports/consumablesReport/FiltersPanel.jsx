import React, { useMemo } from 'react';
import { CalendarRange, Check, Lock, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { DropdownMultiSelect } from '../../../components/reportModels/ReportComponents';
import { DATE_PRESETS, presetRange, STATUS_LABELS, TXN_LABELS } from './config';

function Field({ label, hint, children }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
        {hint}
      </span>
      {children}
    </label>
  );
}

const dateInput =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400';

export default function FiltersPanel({
  draft,
  setDraft,
  options,
  consumableOptions,
  loading,
  branchLocked,
  isDirty,
  onApply,
  onReset,
}) {
  const set = (patch) => setDraft((prev) => ({ ...prev, ...patch }));

  const branchOpts = useMemo(
    () => options.branches.map((b) => ({ value: b.branch_id, label: b.branch_name || b.branch_id })),
    [options.branches],
  );
  const consumableOpts = useMemo(
    () =>
      consumableOptions.map((c) => ({
        value: c.consum_id,
        label: c.uom_name ? `${c.consumable} (${c.uom_name})` : c.consumable,
      })),
    [consumableOptions],
  );
  const brandOpts = useMemo(() => options.brands.map((b) => ({ value: b, label: b })), [options.brands]);
  const deptOpts = useMemo(
    () => options.departments.map((d) => ({ value: d.dept_id, label: d.dept_name || d.dept_id })),
    [options.departments],
  );
  const statusOpts = useMemo(
    () => Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );
  const txnOpts = useMemo(
    () => Object.entries(TXN_LABELS).map(([value, label]) => ({ value, label })),
    [],
  );

  const pickPreset = (id) => set({ ...presetRange(id), preset: id });

  return (
    <section className="relative z-30 rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0E2F4B]/5 text-[#0E2F4B]">
            <SlidersHorizontal className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Report filters</p>
            <p className="text-xs text-slate-500">
              {isDirty ? 'You have unapplied changes' : 'Filters apply to every section of the report'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button
            type="button"
            onClick={onApply}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              isDirty
                ? 'bg-[#0E2F4B] text-white shadow-sm hover:bg-[#143d65] ring-2 ring-[#FFC107]/60'
                : 'bg-[#0E2F4B] text-white hover:bg-[#143d65]'
            }`}
          >
            <Check className="h-4 w-4" /> Apply
          </button>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1">
            <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              <CalendarRange className="h-3.5 w-3.5" /> Period
            </span>
            <div className="flex flex-wrap gap-1.5">
              {DATE_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => pickPreset(p.id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition ${
                    draft.preset === p.id
                      ? 'bg-[#0E2F4B] text-white ring-[#0E2F4B]'
                      : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <Field label="From">
              <input
                type="date"
                value={draft.from || ''}
                max={draft.to || undefined}
                onChange={(e) => set({ from: e.target.value, preset: null })}
                className={dateInput}
              />
            </Field>
            <Field label="To">
              <input
                type="date"
                value={draft.to || ''}
                min={draft.from || undefined}
                onChange={(e) => set({ to: e.target.value, preset: null })}
                className={dateInput}
              />
            </Field>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field
            label="Branch"
            hint={branchLocked ? <Lock className="h-3 w-3 text-slate-400" title="Set by your access scope" /> : null}
          >
            <DropdownMultiSelect
              values={draft.branchIds}
              onChange={(v) => set({ branchIds: v, consumIds: [] })}
              options={branchOpts}
              placeholder={branchLocked ? branchOpts[0]?.label || 'Your branch' : 'All branches'}
              disabled={loading || branchLocked}
            />
          </Field>
          <Field label="Consumable">
            <DropdownMultiSelect
              values={draft.consumIds}
              onChange={(v) => set({ consumIds: v })}
              options={consumableOpts}
              placeholder="All consumables"
              disabled={loading}
            />
          </Field>
          <Field label="Brand">
            <DropdownMultiSelect
              values={draft.brands}
              onChange={(v) => set({ brands: v })}
              options={brandOpts}
              placeholder="All brands"
              disabled={loading}
            />
          </Field>
          <Field label="Department">
            <DropdownMultiSelect
              values={draft.deptIds}
              onChange={(v) => set({ deptIds: v })}
              options={deptOpts}
              placeholder="All departments"
              disabled={loading}
            />
          </Field>
          <Field label="Stock status">
            <DropdownMultiSelect
              values={draft.statuses}
              onChange={(v) => set({ statuses: v })}
              options={statusOpts}
              placeholder="Any status"
            />
          </Field>
          <Field label="Movement type">
            <DropdownMultiSelect
              values={draft.txnTypes}
              onChange={(v) => set({ txnTypes: v })}
              options={txnOpts}
              placeholder="All movements"
            />
          </Field>
        </div>
        <p className="text-[11px] text-slate-400">
          Department narrows movements and allocations · Stock status narrows the stock register ·
          Movement type narrows stock movements
        </p>
      </div>
    </section>
  );
}
