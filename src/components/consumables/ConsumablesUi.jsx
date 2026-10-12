import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Loader2, Save, X } from 'lucide-react';
import { utilityPrimaryBtn, utilitySecondaryBtn } from '../../pages/utility/UtilityUi';

const TONES = {
  navy: { icon: 'bg-[#E8EFF6] text-[#0E2F4B]', ring: 'ring-[#0E2F4B]' },
  emerald: { icon: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-600' },
  amber: { icon: 'bg-amber-50 text-amber-700', ring: 'ring-amber-500' },
  orange: { icon: 'bg-orange-50 text-orange-700', ring: 'ring-orange-500' },
  rose: { icon: 'bg-rose-50 text-rose-700', ring: 'ring-rose-500' },
  sky: { icon: 'bg-sky-50 text-sky-700', ring: 'ring-sky-600' },
  violet: { icon: 'bg-violet-50 text-violet-700', ring: 'ring-violet-600' },
};

export function ConsumablesPage({ icon: Icon, title, subtitle, actions, loading, stats, children }) {
  return (
    <div className="min-h-full bg-[#F3F6F9]">
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {Icon ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0E2F4B] text-white shadow-sm">
                <Icon className="h-5 w-5" />
              </span>
            ) : null}
            <div>
              <h1 className="text-lg font-semibold leading-tight text-[#0E2F4B]">{title}</h1>
              {subtitle ? <p className="text-xs text-[#5A6B7C]">{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>

        {loading ? (
          <LoadingSkeleton statCount={stats ? 4 : 0} />
        ) : (
          <>
            {stats ? <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{stats}</div> : null}
            {children}
          </>
        )}
      </div>
    </div>
  );
}

function LoadingSkeleton({ statCount }) {
  return (
    <div className="space-y-5 animate-pulse">
      {statCount ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: statCount }).map((_, i) => (
            <div key={i} className="h-[84px] rounded-lg border border-[#D7E0EA] bg-white" />
          ))}
        </div>
      ) : null}
      <div className="rounded-lg border border-[#D7E0EA] bg-white">
        <div className="h-14 border-b border-[#E8EEF4]" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-[#F0F3F7] px-4 py-3.5">
            <div className="h-3 w-24 rounded bg-[#E8EEF4]" />
            <div className="h-3 flex-1 rounded bg-[#F0F3F7]" />
            <div className="h-3 w-16 rounded bg-[#E8EEF4]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, hint, tone = 'navy', active = false, onClick }) {
  const t = TONES[tone] || TONES.navy;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? active : undefined}
      className={`flex items-center gap-3 rounded-lg border border-[#D7E0EA] bg-white p-4 text-left shadow-sm transition ${
        onClick ? 'hover:border-[#9FB3C8] hover:shadow' : ''
      } ${active ? `ring-2 ${t.ring} border-transparent` : ''}`}
    >
      {Icon ? (
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-[#5A6B7C]">
          {label}
        </span>
        <span className="block text-xl font-semibold tabular-nums text-[#0E2F4B]">{value}</span>
        {hint ? <span className="block truncate text-[11px] text-[#7A8A9A]">{hint}</span> : null}
      </span>
    </Tag>
  );
}

function useEscape(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, enabled]);
}

/** Right-side slide-over that wraps a form; footer holds Cancel / Submit. */
export function FormDrawer({
  title,
  description,
  onClose,
  onSubmit,
  saving = false,
  submitLabel = 'Save',
  submitDisabled = false,
  children,
}) {
  useEscape(onClose, !saving);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={saving ? undefined : onClose}
        className="absolute inset-0 bg-[#0E2F4B]/30 backdrop-blur-[1px]"
      />
      <form
        onSubmit={onSubmit}
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-[consumDrawerIn_180ms_ease-out]"
      >
        <style>{`@keyframes consumDrawerIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}`}</style>
        <header className="flex items-start justify-between gap-3 border-b border-[#E8EEF4] px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-[#0E2F4B]">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-[#5A6B7C]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-md p-1.5 text-[#5A6B7C] hover:bg-[#F3F6F9] hover:text-[#0E2F4B]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-[#E8EEF4] bg-[#F8FAFC] px-5 py-3">
          <button type="button" onClick={onClose} disabled={saving} className={utilitySecondaryBtn}>
            Cancel
          </button>
          <button type="submit" disabled={saving || submitDisabled} className={utilityPrimaryBtn}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>,
    document.body,
  );
}

/** Read-only right-side panel (no form / submit). */
export function SideDrawer({ title, description, onClose, width = 'max-w-lg', children }) {
  useEscape(onClose);

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-[#0E2F4B]/30 backdrop-blur-[1px]"
      />
      <div
        className={`relative flex h-full w-full ${width} flex-col bg-white shadow-2xl animate-[consumDrawerIn_180ms_ease-out]`}
      >
        <style>{`@keyframes consumDrawerIn{from{transform:translateX(24px);opacity:.6}to{transform:none;opacity:1}}`}</style>
        <header className="flex items-start justify-between gap-3 border-b border-[#E8EEF4] px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-[#0E2F4B]">{title}</h2>
            {description ? <p className="mt-0.5 text-xs text-[#5A6B7C]">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#5A6B7C] hover:bg-[#F3F6F9] hover:text-[#0E2F4B]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDeleteDialog({ open, title = 'Delete record', message, busy, onCancel, onConfirm }) {
  useEscape(onCancel, open && !busy);
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={busy ? undefined : onCancel}
        className="absolute inset-0 bg-[#0E2F4B]/30 backdrop-blur-[1px]"
      />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[#0E2F4B]">{title}</h3>
            <p className="mt-1 text-sm text-[#5A6B7C]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={busy} className={utilitySecondaryBtn}>
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Delete
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Horizontal meter: value against a max, colored by tone. */
export function LevelBar({ value, max, tone = 'emerald' }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(pct));
    return () => cancelAnimationFrame(frame);
  }, [pct]);
  const colors = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    rose: 'bg-rose-500',
    navy: 'bg-[#0E2F4B]',
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#E8EEF4]">
      <div
        className={`h-full rounded-full transition-[width,background-color] duration-700 ease-out ${
          colors[tone] || colors.emerald
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

export function FieldHint({ children, tone = 'muted' }) {
  return (
    <p className={`mt-1 text-[11px] ${tone === 'error' ? 'text-[#B42318]' : 'text-[#7A8A9A]'}`}>
      {children}
    </p>
  );
}
