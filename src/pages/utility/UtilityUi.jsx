import React from 'react';
import { Loader2 } from 'lucide-react';

export function UtilityPageShell({ actions, loading, children }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-[#5A6B7C] gap-2">
        <Loader2 className="w-5 h-5 animate-spin text-[#0E2F4B]" />
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F3F6F9]">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 space-y-5">
        {actions ? (
          <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function UtilityPanel({ title, description, children, className = '', bodyClassName = '' }) {
  return (
    <section
      className={`rounded-lg border border-[#D7E0EA] bg-white shadow-sm ${className}`}
    >
      {(title || description) && (
        <header className="border-b border-[#E8EEF4] px-4 py-3">
          {title ? (
            <h2 className="text-sm font-semibold text-[#0E2F4B]">{title}</h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-[#5A6B7C]">{description}</p>
          ) : null}
        </header>
      )}
      <div className={bodyClassName || 'p-4'}>{children}</div>
    </section>
  );
}

export function UtilityField({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#5A6B7C]">
        {label}
      </span>
      {children}
    </label>
  );
}

export const utilityInputClass =
  'mt-0 w-full rounded-md border border-[#C9D5E3] bg-white px-3 py-2 text-sm text-[#0E2F4B] shadow-sm outline-none transition focus:border-[#0E2F4B] focus:ring-2 focus:ring-[#0E2F4B]/15';

export const utilityPrimaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-md bg-[#0E2F4B] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#143d65] disabled:cursor-not-allowed disabled:opacity-50';

export const utilitySecondaryBtn =
  'inline-flex items-center justify-center gap-2 rounded-md border border-[#C9D5E3] bg-white px-4 py-2 text-sm font-medium text-[#0E2F4B] transition hover:bg-[#F3F6F9] disabled:cursor-not-allowed disabled:opacity-50';

export const utilityDangerBtn =
  'inline-flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-[#B42318] transition hover:bg-[#FEF3F2]';
