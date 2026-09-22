import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Download, Eye, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../../../lib/axios';
import { auditReportService } from '../../../services/auditReportService';
import { formatDate, StatusPill } from './utils';

function fileLabel(path, fallback = 'Document') {
  if (!path) return fallback;
  const parts = String(path).split('/');
  return parts[parts.length - 1] || fallback;
}

function matchesCoverageDoc(doc, coverageType) {
  const type = String(coverageType || '').toLowerCase();
  const code = String(doc.doc_type || doc.dto_code || '').toUpperCase();
  const name = `${doc.doc_type_name || ''} ${doc.doc_type_text || ''}`.toLowerCase();

  if (type === 'warranty') {
    return code === 'WA' || /warrant/.test(name);
  }
  if (type === 'amc') {
    return (
      code === 'AMC' ||
      /\bamc\b/.test(name) ||
      /annual\s*maintenance/.test(name) ||
      /service\s*contract/.test(name) ||
      /maintenance\s*contract/.test(name) ||
      /contract/.test(name)
    );
  }
  if (type === 'cmc') {
    return (
      code === 'CMC' ||
      /\bcmc\b/.test(name) ||
      /comprehensive\s*maintenance/.test(name) ||
      /contract/.test(name)
    );
  }
  return /warrant|amc|cmc|contract|maintenance/.test(name) || ['WA', 'AMC', 'CMC'].includes(code);
}

function isImageDoc(doc, blob) {
  const name = fileLabel(doc.doc_path).toLowerCase();
  const type = String(blob?.type || '').toLowerCase();
  return type.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(name);
}

function isPdfDoc(doc, blob) {
  const name = fileLabel(doc.doc_path).toLowerCase();
  const type = String(blob?.type || '').toLowerCase();
  return type.includes('pdf') || name.endsWith('.pdf');
}

async function fetchAssetDocBlob(doc) {
  const id = doc.a_d_id || doc.id;
  if (!id) return null;
  const meta = await API.get(`/asset-docs/${id}/download-url?mode=view`);
  if (meta.data?.url) {
    const res = await fetch(meta.data.url);
    if (!res.ok) throw new Error('Failed to fetch document');
    return res.blob();
  }
  const streamPath = meta.data?.path || `/asset-docs/${id}/file?mode=view`;
  const blobRes = await API.get(streamPath, { responseType: 'blob' });
  return blobRes.data;
}

async function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function buildCoveragePdf(row, docs = []) {
  const { PDFDocument } = await import('pdf-lib');
  const summary = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const title = `${row.coverage_type || 'Coverage'} report`;
  summary.setFontSize(16);
  summary.setTextColor(20, 61, 101);
  summary.text(title, 40, 48);
  summary.setFontSize(10);
  summary.setTextColor(100);
  summary.text(
    `${row.asset_id || ''} · ${row.asset_name || row.serial_number || ''} · Status: ${row.status || '—'}`,
    40,
    68,
  );

  const fields = [
    ['Coverage', row.coverage_type || '—'],
    ['Status', row.status || '—'],
    ['Asset ID', row.asset_id || '—'],
    ['Covered asset', row.asset_name || '—'],
    ['Serial number', row.serial_number || '—'],
    ['Asset type', row.asset_type || '—'],
    ['Branch', row.branch || '—'],
    ['Department', row.department || '—'],
    ['Vendor', row.vendor_name || '—'],
    ['Vendor ID', row.vendor_id || '—'],
    ['Coverage start', formatDate(row.coverage_start)],
    ['End / renewal due', formatDate(row.coverage_end)],
    ['Days left', row.days_left == null ? '—' : String(row.days_left)],
    ['Last renewal', formatDate(row.last_renewal_date)],
    ['Previous end', formatDate(row.previous_end_date)],
  ];

  autoTable(summary, {
    startY: 88,
    head: [['Field', 'Value']],
    body: fields,
    styles: { fontSize: 9, cellPadding: 6 },
    headStyles: { fillColor: [20, 61, 101] },
    columnStyles: { 0: { cellWidth: 160, fontStyle: 'bold' } },
    margin: { left: 40, right: 40 },
  });

  const docsStart = (summary.lastAutoTable?.finalY || 88) + 24;
  summary.setFontSize(12);
  summary.setTextColor(20, 61, 101);
  summary.text('Documents', 40, docsStart);

  const fetched = [];
  for (const d of docs) {
    try {
      const blob = await fetchAssetDocBlob(d);
      if (blob) fetched.push({ doc: d, blob });
    } catch (err) {
      console.warn('Could not load document for report:', err);
      fetched.push({ doc: d, blob: null, error: true });
    }
  }

  if (!docs.length) {
    summary.setFontSize(9);
    summary.setTextColor(120);
    summary.text(
      `No ${row.coverage_type || 'coverage'} documents attached to this asset.`,
      40,
      docsStart + 18,
    );
  } else {
    autoTable(summary, {
      startY: docsStart + 10,
      head: [['Document type', 'File', 'In this report']],
      body: fetched.map(({ doc: d, blob, error }) => [
        d.doc_type_name || d.doc_type_text || 'Document',
        fileLabel(d.doc_path),
        error
          ? 'Could not load'
          : isPdfDoc(d, blob) || isImageDoc(d, blob)
            ? 'Included below / following pages'
            : 'Listed only',
      ]),
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [20, 61, 101] },
      columnStyles: {
        1: { textColor: [30, 64, 175] },
      },
      margin: { left: 40, right: 40 },
      didDrawCell: (data) => {
        if (data.section !== 'body' || data.column.index !== 1) return;
        const item = fetched[data.row.index];
        if (!item?.blob) return;
        const blobUrl = URL.createObjectURL(item.blob);
        // Clickable filename → opens the attached file
        summary.link(
          data.cell.x,
          data.cell.y,
          data.cell.width,
          data.cell.height,
          { url: blobUrl },
        );
      },
    });
  }

  // Embed images on following pages of the summary PDF
  for (const { doc: d, blob } of fetched) {
    if (!blob || !isImageDoc(d, blob)) continue;
    try {
      const dataUrl = await blobToDataUrl(blob);
      const fmt = /\.png$/i.test(fileLabel(d.doc_path)) || blob.type.includes('png') ? 'PNG' : 'JPEG';
      summary.addPage();
      summary.setFontSize(12);
      summary.setTextColor(20, 61, 101);
      summary.text(d.doc_type_name || d.doc_type_text || 'Document', 40, 40);
      summary.setFontSize(9);
      summary.setTextColor(100);
      summary.text(fileLabel(d.doc_path), 40, 56);
      const maxW = 515;
      const maxH = 700;
      summary.addImage(dataUrl, fmt, 40, 70, maxW, maxH, undefined, 'FAST');
    } catch (err) {
      console.warn('Could not embed image in report:', err);
    }
  }

  const merged = await PDFDocument.create();
  const summaryDoc = await PDFDocument.load(summary.output('arraybuffer'));
  const summaryPages = await merged.copyPages(summaryDoc, summaryDoc.getPageIndices());
  summaryPages.forEach((p) => merged.addPage(p));

  // Append PDF attachments so their content is visible in the report
  for (const { doc: d, blob } of fetched) {
    if (!blob || !isPdfDoc(d, blob)) continue;
    try {
      const attached = await PDFDocument.load(await blob.arrayBuffer());
      const pages = await merged.copyPages(attached, attached.getPageIndices());
      pages.forEach((p) => merged.addPage(p));
    } catch (err) {
      console.warn('Could not append PDF document to report:', err);
    }
  }

  const bytes = await merged.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

function DocActions({ doc }) {
  const [busy, setBusy] = useState(null);

  const openDoc = async (mode) => {
    if (busy) return;
    const id = doc.a_d_id || doc.id;
    if (!id) {
      toast.error('Document id missing');
      return;
    }
    try {
      setBusy(mode);
      const res = await API.get(`/asset-docs/${id}/download-url?mode=${mode}`);
      if (res.data?.url) {
        if (mode === 'download') {
          const a = document.createElement('a');
          a.href = res.data.url;
          a.download = res.data.fileName || 'document.pdf';
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        } else {
          window.open(res.data.url, '_blank', 'noopener,noreferrer');
        }
        return;
      }

      const streamPath = res.data?.path || `/asset-docs/${id}/file?mode=${mode}`;
      const blobRes = await API.get(streamPath, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(blobRes.data);
      if (mode === 'download') {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = res.data?.fileName || 'amc-document.pdf';
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

function CoverageDetail({ row, docs, docsLoading, onBack }) {
  const [reportBusy, setReportBusy] = useState(null);

  const fields = [
    ['Coverage', row.coverage_type],
    ['Status', row.status],
    ['Asset ID', row.asset_id],
    ['Covered asset', row.asset_name],
    ['Serial number', row.serial_number],
    ['Asset type', row.asset_type],
    ['Branch', row.branch],
    ['Department', row.department],
    ['Vendor', row.vendor_name],
    ['Vendor ID', row.vendor_id],
    ['Coverage start', formatDate(row.coverage_start)],
    ['End / renewal due', formatDate(row.coverage_end)],
    ['Days left', row.days_left == null ? '—' : String(row.days_left)],
    ['Last renewal', formatDate(row.last_renewal_date)],
    ['Previous end', formatDate(row.previous_end_date)],
  ];

  const handleReport = async (mode) => {
    if (reportBusy) return;
    try {
      setReportBusy(mode);
      const pdfBlob = await buildCoveragePdf(row, docs);
      const fileName = `${row.coverage_type || 'coverage'}-${row.asset_id || 'asset'}.pdf`;
      if (mode === 'view') {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000);
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(pdfBlob);
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
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
            {row.coverage_type} coverage details
          </h4>
          <p className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
            <StatusPill value={row.status} />
            <span>{row.vendor_name || 'No vendor'}</span>
            <span className="text-slate-300">·</span>
            <span>Ends {formatDate(row.coverage_end)}</span>
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

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h5 className="text-sm font-semibold text-slate-900">Documents</h5>
        </div>

        {docsLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading documents…
          </div>
        ) : !docs.length ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No {row.coverage_type} documents attached to this asset.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {docs.map((doc) => (
              <div
                key={doc.a_d_id || doc.doc_path}
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
                <DocActions doc={doc} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AssetCoverageTab({ assetId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [note, setNote] = useState(null);
  const [selected, setSelected] = useState(null);
  const [allDocs, setAllDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);

  useEffect(() => {
    if (!assetId) return undefined;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelected(null);
        const data = await auditReportService.viewAssetCoverageReport(assetId);
        if (cancelled) return;
        setRows(data?.rows || []);
        setNote(data?.note || null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err?.response?.data?.error ||
            err.message ||
            'Failed to load AMC / CMC / warranty coverage',
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

  useEffect(() => {
    if (!assetId || !selected) {
      setAllDocs([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        setDocsLoading(true);
        const res = await API.get(`/assets/${assetId}/docs`);
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        if (cancelled) return;
        setAllDocs(list.filter((d) => !d.is_archived));
      } catch (err) {
        if (cancelled) return;
        setAllDocs([]);
        toast.error(err?.response?.data?.message || 'Failed to load documents');
      } finally {
        if (!cancelled) setDocsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assetId, selected]);

  const relatedDocs = useMemo(() => {
    if (!selected) return [];
    return allDocs.filter((d) => matchesCoverageDoc(d, selected.coverage_type));
  }, [allDocs, selected]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading AMC / CMC / warranty coverage…
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
          {note || 'No AMC, CMC, or warranty coverage recorded for this asset.'}
        </p>
      </div>
    );
  }

  if (selected) {
    return (
      <CoverageDetail
        row={selected}
        docs={relatedDocs}
        docsLoading={docsLoading}
        onBack={() => setSelected(null)}
      />
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Click a row to view full details and document View / Download options.
      </p>
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              {[
                'Coverage',
                'Status',
                'Vendor',
                'Start',
                'End / renewal due',
                'Days left',
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
            {rows.map((row, idx) => (
              <tr
                key={`${row.coverage_type}-${row.vendor_id || 'v'}-${idx}`}
                className="cursor-pointer hover:bg-slate-50/80"
                onClick={() => setSelected(row)}
              >
                <td className="px-4 py-3 text-slate-800 font-medium whitespace-nowrap">
                  {row.coverage_type}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusPill value={row.status} />
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {row.vendor_name || '—'}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.coverage_start)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                  {formatDate(row.coverage_end)}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap tabular-nums">
                  {row.days_left == null ? '—' : row.days_left}
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
