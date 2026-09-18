import React from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function ExportDialog({
  open,
  report,
  assetCount,
  fieldCount,
  loading = false,
  onClose,
  onExport,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close export dialog"
        onClick={onClose}
        disabled={loading}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Export audit report</h3>
          <p className="text-sm text-slate-500 mt-1">
            The PDF will include only the fields you selected.
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-1 text-sm text-slate-700">
          <div>
            <span className="font-semibold tabular-nums">{assetCount}</span> assets selected
          </div>
          <div>
            <span className="font-semibold tabular-nums">{fieldCount}</span> fields selected
          </div>
          <div className="text-slate-500">
            {report?.auditType?.description} · {report?.period?.label}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#143d65] hover:bg-[#1e5a8a] disabled:opacity-70"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {loading ? 'Preparing PDF…' : 'Download PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}
