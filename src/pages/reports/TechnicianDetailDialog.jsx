import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ExternalLink, Loader2, X } from 'lucide-react';
import API from '../../lib/axios';
import { workforceReportService } from '../../services/workforceReportService';

function formatDate(value) {
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

function StatusPill({ value }) {
  const raw = String(value || '').toLowerCase();
  let tone = 'bg-slate-100 text-slate-700';
  if (raw.includes('approv') || raw.includes('confirm') || raw === 'co') {
    tone = 'bg-emerald-50 text-emerald-800';
  } else if (raw.includes('pending') || raw === 'in' || raw === 'ip') {
    tone = 'bg-amber-50 text-amber-800';
  } else if (raw.includes('reject') || raw === 'ca') {
    tone = 'bg-rose-50 text-rose-800';
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone}`}>
      {value || '—'}
    </span>
  );
}

export default function TechnicianDetailDialog({ open, technician, onClose }) {
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');
  const [openingCertId, setOpeningCertId] = useState(null);

  useEffect(() => {
    if (!open || !technician) return undefined;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        setError('');
        setDetail(null);
        const data = await workforceReportService.getTechnicianDetail({
          emp_int_id: technician.emp_int_id || undefined,
          name: technician.technician_name || undefined,
          email: technician.technician_email || undefined,
          phone: technician.technician_phno || undefined,
        });
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error ||
              err?.message ||
              'Failed to load technician details',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, technician]);

  if (!open) return null;

  const identity = detail?.identity || {};
  const certificates = detail?.certificates || [];
  const recent = detail?.recent_work_orders || [];

  const openCertificate = async (cert) => {
    if (!cert?.etc_id) {
      toast.error('Certificate file is not available');
      return;
    }
    try {
      setOpeningCertId(cert.etc_id);
      const res = await API.get(`/employee-tech-certificates/${cert.etc_id}/download`, {
        params: { mode: 'view' },
        responseType: 'blob',
        timeout: 120000,
      });
      const contentType = String(res.headers?.['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await (res.data instanceof Blob ? res.data.text() : Promise.resolve(String(res.data)));
        let payload = {};
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { message: text };
        }
        toast.error(payload.message || payload.error || 'No certificate file available');
        return;
      }
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: contentType || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Failed to open certificate',
      );
    } finally {
      setOpeningCertId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/30"
        aria-label="Close technician details"
        onClick={onClose}
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 break-words">
              {technician?.technician_name || identity.full_name || 'Technician'}
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Engineer / technician details and certificates
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
              Loading details…
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          {!loading && !error && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ['Name', identity.full_name || technician?.technician_name || '—'],
                  ['Employee ID', identity.employee_id || '—'],
                  ['Internal ID', identity.emp_int_id || technician?.emp_int_id || '—'],
                  ['Email', identity.email_id || technician?.technician_email || '—'],
                  ['Phone', identity.phone_number || technician?.technician_phno || '—'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 min-w-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {label}
                    </div>
                    <div className="mt-1 text-sm text-slate-800 break-words">{value}</div>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Certificates</h4>
                {certificates.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No certificates found for this technician.
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Certificate
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Number
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Expiry
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            File
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {certificates.map((cert) => (
                          <tr key={cert.etc_id || `${cert.tc_id}-${cert.cert_name}`}>
                            <td className="px-3 py-2.5 break-words">{cert.cert_name || '—'}</td>
                            <td className="px-3 py-2.5 break-words">{cert.cert_number || '—'}</td>
                            <td className="px-3 py-2.5">{formatDate(cert.certificate_expiry)}</td>
                            <td className="px-3 py-2.5">
                              <StatusPill value={cert.status} />
                            </td>
                            <td className="px-3 py-2.5">
                              {cert.file_path || cert.etc_id ? (
                                <button
                                  type="button"
                                  onClick={() => openCertificate(cert)}
                                  disabled={openingCertId === cert.etc_id}
                                  className="inline-flex items-center gap-1.5 text-[#143d65] font-medium hover:underline disabled:opacity-60"
                                >
                                  {openingCertId === cert.etc_id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  )}
                                  View
                                </button>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Recent work orders</h4>
                {recent.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                    No recent work orders found.
                  </div>
                ) : (
                  <div className="w-full max-w-full overflow-hidden rounded-xl border border-slate-200">
                    <table className="w-full table-fixed text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Work order
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Asset
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Type
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Scheduled
                          </th>
                          <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {recent.map((row) => (
                          <tr key={row.ams_id}>
                            <td className="px-3 py-2.5 break-words">{row.wo_id || '—'}</td>
                            <td className="px-3 py-2.5 break-words">
                              {`${row.asset_type_name || 'Asset'} ${row.serial_number || row.asset_id || ''}`.trim()}
                            </td>
                            <td className="px-3 py-2.5 break-words">
                              {row.maintenance_type_name || '—'}
                            </td>
                            <td className="px-3 py-2.5">{formatDate(row.act_maint_st_date)}</td>
                            <td className="px-3 py-2.5">
                              <StatusPill value={row.status} />
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
