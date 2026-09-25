import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Eye, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../../../lib/axios';
import { auditReportService } from '../../../services/auditReportService';
import { formatDate, StatusPill } from './utils';

function daysLabel(daysLeft) {
  if (daysLeft == null) return '—';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'Expires today';
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
}

function fileLabel(path, fallback = 'Document') {
  if (!path) return fallback;
  const parts = String(path).split('/');
  return parts[parts.length - 1] || fallback;
}

function matchesRenewalDoc(doc) {
  const code = String(doc.doc_type || '').toUpperCase();
  const name = `${doc.doc_type_name || ''} ${doc.doc_type_text || ''}`.toLowerCase();
  return (
    code === 'CT' ||
    code === 'VR' ||
    code === 'AMC' ||
    /renew|contract|amc|vendor/.test(name)
  );
}

function VendorDocActions({ doc }) {
  const [busy, setBusy] = useState(null);

  const openDoc = async (mode) => {
    if (busy) return;
    const id = doc.vd_id || doc.id;
    if (!id) {
      toast.error('Document id missing');
      return;
    }
    try {
      setBusy(mode);
      const res = await API.get(`/vendor-docs/${id}/download?mode=${mode}`);
      if (res.data?.url) {
        if (mode === 'download') {
          const a = document.createElement('a');
          a.href = res.data.url;
          a.download = res.data.fileName || fileLabel(doc.doc_path);
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        } else {
          window.open(res.data.url, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      const streamPath = res.data?.path || `/vendor-docs/${id}/file?mode=${mode}`;
      const blobRes = await API.get(streamPath, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(blobRes.data);
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = res.data?.fileName || fileLabel(doc.doc_path) || 'vendor-renewal.pdf';
        a.click();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
        toast.success('Document downloaded');
      } else {
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err.message ||
          `Failed to ${mode} document`,
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => openDoc('view')}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === 'view' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
        View
      </button>
      <button
        type="button"
        onClick={() => openDoc('download')}
        disabled={!!busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {busy === 'download' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        Download
      </button>
    </div>
  );
}

function buildVendorRenewalPdf(row, asset = {}) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const title = 'Vendor renewal report';
  doc.setFontSize(16);
  doc.setTextColor(20, 61, 101);
  doc.text(title, 40, 48);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${asset.asset_id || ''} · ${asset.asset_name || asset.serial_number || ''} · ${row.vendor_name || 'Vendor'} · Status: ${row.status || '—'}`,
    40,
    68,
  );

  const fields = [
    ['Vendor', row.vendor_name || '—'],
    ['Company', row.company_name || '—'],
    ['Role on asset', row.vendor_role || '—'],
    ['Status', row.status || '—'],
    ['Asset ID', asset.asset_id || '—'],
    ['Asset', asset.asset_name || '—'],
    ['Serial number', asset.serial_number || '—'],
    ['Contract start', formatDate(row.contract_start_date)],
    ['Contract end', formatDate(row.contract_end_date)],
    ['Days to expire', daysLabel(row.days_left)],
    ['Last renewal date', formatDate(row.last_renewal_date)],
    ['Last renewal end', formatDate(row.last_renewal_end)],
    ['Previous end date', formatDate(row.previous_end_date)],
    ['Renewal history count', row.renewal_count == null ? '—' : String(row.renewal_count)],
    ['Contact', row.contact_person_name || '—'],
    ['Phone', row.contact_person_number || '—'],
    ['Email', row.contact_person_email || '—'],
    ['Vendor ID', row.vendor_id || '—'],
  ];

  autoTable(doc, {
    startY: 88,
    head: [['Field', 'Value']],
    body: fields,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [20, 61, 101] },
    columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const renewals = Array.isArray(row.renewals) ? row.renewals : [];
  const histStart = (doc.lastAutoTable?.finalY || 88) + 24;
  doc.setFontSize(12);
  doc.setTextColor(20, 61, 101);
  doc.text('Renewal history', 40, histStart);

  if (!renewals.length) {
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text('No renewal records for this vendor yet.', 40, histStart + 18);
  } else {
    autoTable(doc, {
      startY: histStart + 10,
      head: [['Renewal date', 'New start', 'New end', 'Previous end', 'Status', 'Approved by', 'Notes']],
      body: renewals.map((r) => [
        formatDate(r.renewal_date),
        formatDate(r.contract_start_date),
        formatDate(r.contract_end_date),
        formatDate(r.previous_contract_end_date),
        r.status || '—',
        r.renewal_approved_by || '—',
        r.renewal_notes || '—',
      ]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [20, 61, 101] },
      margin: { left: 40, right: 40 },
    });
  }

  return doc;
}

function VendorRenewalDetail({ row, asset, onBack }) {
  const [reportBusy, setReportBusy] = useState(null);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const fields = [
    ['Vendor', row.vendor_name],
    ['Company', row.company_name],
    ['Role on asset', row.vendor_role],
    ['Status', row.status],
    ['Contract start', formatDate(row.contract_start_date)],
    ['Contract end', formatDate(row.contract_end_date)],
    ['Days to expire', daysLabel(row.days_left)],
    ['Last renewal date', formatDate(row.last_renewal_date)],
    ['Last renewal end', formatDate(row.last_renewal_end)],
    ['Previous end date', formatDate(row.previous_end_date)],
    ['Renewal history count', row.renewal_count == null ? '—' : String(row.renewal_count)],
    ['Contact', row.contact_person_name],
    ['Phone', row.contact_person_number],
    ['Email', row.contact_person_email],
    ['Vendor ID', row.vendor_id],
  ];

  const renewals = Array.isArray(row.renewals) ? row.renewals : [];

  useEffect(() => {
    if (!row?.vendor_id) {
      setDocs([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setDocsLoading(true);
        const res = await API.get(`/vendor-docs/${encodeURIComponent(row.vendor_id)}`);
        const list = Array.isArray(res.data?.documents)
          ? res.data.documents
          : Array.isArray(res.data)
            ? res.data
            : [];
        if (cancelled) return;
        setDocs(list.filter((d) => !d.is_archived && matchesRenewalDoc(d)));
      } catch (err) {
        if (cancelled) return;
        setDocs([]);
        toast.error(err?.response?.data?.message || 'Failed to load vendor documents');
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [row?.vendor_id]);

  const handleReport = async (mode) => {
    if (reportBusy) return;
    try {
      setReportBusy(mode);
      const pdf = buildVendorRenewalPdf(row, asset);
      const fileName = `vendor-renewal-${row.vendor_id || 'vendor'}-${asset?.asset_id || 'asset'}.pdf`;
      if (mode === 'view') {
        const blobUrl = pdf.output('bloburl');
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        pdf.save(fileName);
        toast.success('Report downloaded');
      }
    } catch (err) {
      toast.error(err?.message || `Failed to ${mode} report`);
    } finally {
      setReportBusy(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[#143d65] hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to list
          </button>
          <h4 className="text-base font-semibold text-slate-900">
            {row.vendor_name || 'Vendor'} renewal details
          </h4>
          <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <StatusPill value={row.status} />
            <span>{row.vendor_role || 'Linked vendor'}</span>
            <span className="text-slate-300">·</span>
            <span>{daysLabel(row.days_left)}</span>
            <span className="text-slate-300">·</span>
            <span>Ends {formatDate(row.contract_end_date)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleReport('view')}
            disabled={!!reportBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {reportBusy === 'view' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            View report
          </button>
          <button
            type="button"
            onClick={() => handleReport('download')}
            disabled={!!reportBusy}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-white bg-[#143d65] hover:bg-[#1e5a8a] disabled:opacity-50"
          >
            {reportBusy === 'download' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-5 rounded-xl border border-slate-200 bg-white p-4">
        {fields.map(([label, value]) => (
          <div key={label}>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-1 text-sm text-slate-800">
              {label === 'Status' ? (
                <StatusPill value={value} />
              ) : value == null || value === '' ? (
                '—'
              ) : (
                String(value)
              )}
            </div>
          </div>
        ))}
      </div>

      <div>
        <h5 className="text-sm font-semibold text-[#143d65] mb-1">Documents</h5>
        <p className="text-xs text-slate-500 mb-2">
          Attached vendor renewal / contract files for this vendor (separate from the PDF report above).
        </p>
        {docsLoading ? (
          <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading documents…
          </div>
        ) : !docs.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
            No vendor renewal documents attached to this vendor.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
            {docs.map((doc) => (
              <div
                key={doc.vd_id || doc.doc_path}
                className="px-4 py-3 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">
                    {doc.doc_type_name || doc.doc_type_text || fileLabel(doc.doc_path)}
                  </div>
                  <div className="text-xs text-slate-500 truncate mt-0.5">
                    {fileLabel(doc.doc_path)}
                  </div>
                </div>
                <VendorDocActions doc={doc} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h5 className="text-sm font-semibold text-slate-800 mb-2">Renewal history</h5>
        {!renewals.length ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-sm text-slate-500">
            No renewal records for this vendor yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Renewal date', 'New start', 'New end', 'Previous end', 'Status', 'Approved by', 'Notes'].map(
                    (label) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {renewals.map((r) => (
                  <tr key={r.vr_id || `${r.vendor_id}-${r.renewal_date}`}>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.renewal_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.contract_start_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(r.contract_end_date)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {formatDate(r.previous_contract_end_date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusPill value={r.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{r.renewal_approved_by || '—'}</td>
                    <td className="px-4 py-3 max-w-xs truncate" title={r.renewal_notes || ''}>
                      {r.renewal_notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetVendorRenewalTab({ assetId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [asset, setAsset] = useState(null);
  const [note, setNote] = useState(null);
  const [expiringDays, setExpiringDays] = useState(30);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!assetId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelected(null);
        const data = await auditReportService.getAssetVendorRenewals(assetId);
        if (cancelled) return;
        setRows(data?.rows || []);
        setAsset(data?.asset || { asset_id: assetId });
        setNote(data?.note || null);
        setExpiringDays(data?.expiringDays ?? 30);
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.response?.data?.error || err.message || 'Failed to load vendor renewals',
        );
        setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading vendor renewals…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-6 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
        <p className="text-sm text-slate-500">
          {note || 'No purchase or service vendor linked to this asset.'}
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <VendorRenewalDetail
        row={selected}
        asset={asset}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Click a vendor to see contract dates, days to expire, and renewal history. Expiring window:{' '}
        {expiringDays} days.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Vendor',
                'Role',
                'Status',
                'Contract start',
                'Contract end',
                'Days to expire',
                'Last renewal',
                'Previous end',
              ].map((label) => (
                <th
                  key={label}
                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr
                key={row.vendor_id}
                className="cursor-pointer hover:bg-slate-50/80"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">
                  {row.vendor_name || '—'}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {row.vendor_role || '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusPill value={row.status} />
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.contract_start_date)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.contract_end_date)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap tabular-nums">
                  {daysLabel(row.days_left)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.last_renewal_date)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.previous_end_date)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
