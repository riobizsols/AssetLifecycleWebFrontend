import React, { useState } from 'react';
import { ExternalLink, Loader2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../../lib/axios';
import { formatDate, StatusPill } from './utils';

function fileLabelFromPath(path) {
  if (!path) return 'View document';
  const parts = String(path).split('/');
  return parts[parts.length - 1] || 'View document';
}

function CalibrationDocLink({ doc }) {
  const [loading, setLoading] = useState(false);

  if (!doc?.doc_id) {
    return <span className="text-slate-400">—</span>;
  }

  const openDoc = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    try {
      setLoading(true);
      if (doc.source === 'asset') {
        const res = await API.get(`/asset-docs/${doc.doc_id}/download-url?mode=view`);
        if (res.data?.url) {
          window.open(res.data.url, '_blank', 'noopener,noreferrer');
        } else {
          throw new Error('No URL returned');
        }
        return;
      }

      // Maintenance docs: always fetch via authenticated API (MinIO host is Docker-only).
      const fileRes = await API.get(`/asset-maint-docs/${doc.doc_id}/file?mode=view`, {
        responseType: 'blob',
      });
      if (fileRes.data?.type && String(fileRes.data.type).includes('json')) {
        const text = await fileRes.data.text();
        const parsed = JSON.parse(text);
        throw new Error(parsed.message || parsed.error || 'Failed to open document');
      }
      const blobUrl = URL.createObjectURL(fileRes.data);
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err.message ||
          'Document file is missing in storage',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={openDoc}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-[#143d65] hover:underline font-medium disabled:opacity-60"
      title={doc.doc_path || 'Open document'}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <ExternalLink className="w-3.5 h-3.5" />
      )}
      <span className="truncate max-w-[260px]">
        {doc.document_type || fileLabelFromPath(doc.doc_path)}
      </span>
    </button>
  );
}

export default function CalibrationDetailDialog({ open, loading, data, error, onClose }) {
  if (!open) return null;

  const schedule = data?.schedule;
  const checklist = data?.checklist || [];
  const documents = data?.documents || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close calibration detail"
        onClick={onClose}
      />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">Calibration detail</h3>
            <p className="text-sm text-slate-500 mt-1 break-words">
              {schedule
                ? `${schedule.asset_type_name || 'Asset'} · ${schedule.serial_number || schedule.asset_id}`
                : 'Checklist and calibration certificate for this work order'}
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

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading calibration detail…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Work order
                  </div>
                  <div className="mt-0.5 text-slate-800">{schedule?.wo_id || schedule?.ams_id || '—'}</div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Date
                  </div>
                  <div className="mt-0.5 text-slate-800">
                    {formatDate(schedule?.act_maint_st_date)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </div>
                  <div className="mt-0.5">
                    <StatusPill value={schedule?.status} />
                  </div>
                </div>
              </div>

              <section>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Checklist</h4>
                {checklist.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No checklist configured for this calibration frequency.
                  </div>
                ) : (
                  <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {checklist.map((item) => (
                      <li key={item.id} className="px-4 py-3 text-sm text-slate-800">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">
                  Calibration certificate
                </h4>
                {documents.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                    No calibration certificate uploaded for this asset yet.
                  </div>
                ) : (
                  <ul className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
                    {documents.map((doc) => (
                      <li
                        key={`${doc.source}-${doc.doc_id}`}
                        className="px-4 py-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <CalibrationDocLink doc={doc} />
                          <div className="mt-0.5 text-xs text-slate-400 truncate">
                            {fileLabelFromPath(doc.doc_path)}
                          </div>
                        </div>
                        <span className="text-[11px] uppercase tracking-wide text-slate-400 shrink-0">
                          {doc.source === 'asset' ? 'Asset' : 'Maintenance'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
