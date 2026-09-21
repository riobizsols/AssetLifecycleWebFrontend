import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../../../lib/axios';
import { formatDate } from './utils';

/** Common workflow / asset status codes → full labels */
const STATUS_FULL_FORM = {
  IN: 'Initiated',
  IP: 'In progress',
  CO: 'Completed',
  CA: 'Cancelled',
  CR: 'Created',
  AP: 'Approved',
  RJ: 'Rejected',
  RE: 'Reopened',
  OH: 'On hold',
  UA: 'Under approval',
  UL: 'Under maintenance',
  SC: 'Scrapped',
  SS: 'Scrap sold',
  AC: 'Active',
  IA: 'Inactive',
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  VALID: 'Valid',
  EXPIRED: 'Expired',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
};

function statusFullForm(value) {
  if (value == null || value === '') return '—';
  const raw = String(value).trim();
  const upper = raw.toUpperCase();
  if (STATUS_FULL_FORM[upper]) return STATUS_FULL_FORM[upper];
  // Already a phrase
  if (raw.includes(' ') || raw.length > 3) return raw;
  return raw;
}

function sourceFullForm(value) {
  const map = {
    asset: 'Asset record',
    maintenance: 'Maintenance record',
    document: 'Document',
  };
  const key = String(value || '').toLowerCase();
  return map[key] || (value ? String(value) : '—');
}

/** True when PDF export must await document open-URLs before saving. */
export function pdfNeedsDocUrlPrep(report, fieldSelection) {
  if (!report || !fieldSelection) return false;
  const on = fieldSelection;
  if (on.certPath) {
    const certs = report.sections?.certifications || [];
    if (certs.some((r) => r.a_d_id)) return true;
  }
  if (on.invoice) {
    const invoices = report.sections?.invoices || [];
    if (invoices.some((r) => r.source === 'document' && (r.source_id || r.a_d_id))) return true;
  }
  if (on.po) {
    const pos = report.sections?.purchaseOrders || [];
    if (pos.some((r) => r.source === 'document' && (r.source_id || r.a_d_id))) return true;
  }
  return false;
}

async function resolveDocUrl(docId) {
  if (!docId) return null;
  try {
    const res = await API.get(`/asset-docs/${docId}/download-url?mode=view`);
    return res.data?.url || null;
  } catch {
    return null;
  }
}

function cellText(columns, row) {
  return columns.map((c) => {
    const val = c.render ? c.render(row) : row[c.key];
    return val == null || val === '' ? '—' : String(val);
  });
}

export function useAuditReportPdf({ report, enrichedAssets, fieldSelection }) {
  return useCallback(async () => {
    if (!report) return;
    const doc = new jsPDF('l', 'pt', 'a4');
    const margin = 40;
    let y = 40;
    const on = fieldSelection;

    doc.setFontSize(16);
    doc.text('Audit Report', margin, y);
    y += 20;
    doc.setFontSize(10);
    doc.text(
      `${report.auditType?.description || '—'} · ${report.period?.label || '—'} · ${enrichedAssets.length} assets`,
      margin,
      y,
    );
    y += 24;

    const addTable = (title, columns, rows, linkColumnKey = null) => {
      if (!columns.length) return;
      if (y > 480) {
        doc.addPage();
        y = 40;
      }
      doc.setFontSize(12);
      doc.text(`${title} (${rows.length})`, margin, y);
      y += 8;

      const linkColIndex = linkColumnKey
        ? columns.findIndex((c) => c.key === linkColumnKey)
        : -1;

      autoTable(doc, {
        startY: y,
        head: [columns.map((c) => c.label)],
        body: rows.length
          ? rows.map((row) => cellText(columns, row))
          : [['No records']],
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [20, 61, 101] },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (
            linkColIndex < 0 ||
            data.section !== 'body' ||
            data.column.index !== linkColIndex ||
            !rows.length
          ) {
            return;
          }
          const row = rows[data.row.index];
          const url = row?.__pdfLinkUrl;
          if (!url) return;
          // Blue clickable text styling
          doc.setTextColor(20, 61, 101);
          doc.link(data.cell.x, data.cell.y, data.cell.width, data.cell.height, { url });
          doc.setTextColor(0, 0, 0);
        },
      });
      y = (doc.lastAutoTable?.finalY || y) + 18;
    };

    const assetCols = [];
    if (on.asset) assetCols.push({ key: 'asset_id', label: 'Asset' });
    if (on.assetType) assetCols.push({ key: 'asset_type_name', label: 'Asset type' });
    if (on.location) assetCols.push({ key: 'branch_name', label: 'Location' });
    if (on.department) assetCols.push({ key: 'department_name', label: 'Department' });
    if (on.serialNumber) assetCols.push({ key: 'serial_number', label: 'Serial number' });
    if (on.purchaseDate) {
      assetCols.push({
        key: 'purchased_on',
        label: 'Purchase date',
        render: (r) => formatDate(r.purchased_on),
      });
    }
    if (on.purchaseCost) assetCols.push({ key: 'purchased_cost', label: 'Purchase cost' });
    if (on.status) {
      assetCols.push({
        key: 'asset_status',
        label: 'Status',
        render: (r) => statusFullForm(r.asset_status),
      });
    }
    if (on.purchaseVendor) assetCols.push({ key: 'purchase_vendor_name', label: 'Purchase vendor' });
    if (on.serviceVendor) assetCols.push({ key: 'service_vendor_name', label: 'Service vendor' });
    addTable('Assets', assetCols, enrichedAssets);

    if (on.maintDate || on.maintType || on.maintStatus || on.maintVendor || on.maintWo || on.maintNotes) {
      const cols = [];
      if (on.asset) cols.push({ key: 'asset_id', label: 'Asset' });
      if (on.maintDate) {
        cols.push({
          key: 'act_maint_st_date',
          label: 'Maintenance date',
          render: (r) => formatDate(r.act_maint_st_date),
        });
      }
      if (on.maintType) cols.push({ key: 'maintenance_type_name', label: 'Maintenance type' });
      if (on.maintStatus) {
        cols.push({
          key: 'status',
          label: 'Status',
          render: (r) => statusFullForm(r.status),
        });
      }
      if (on.maintVendor) {
        cols.push({
          key: 'vendor_name',
          label: 'Technician / vendor',
          render: (r) => r.technician_name || r.vendor_name || '—',
        });
      }
      if (on.maintWo) cols.push({ key: 'wo_id', label: 'Work order' });
      if (on.maintNotes) cols.push({ key: 'notes', label: 'Notes' });
      addTable('Maintenance', cols, report.sections?.maintenance || []);
    }

    if (
      on.brDate ||
      on.brIssue ||
      on.brReason ||
      on.brStatus ||
      on.brReportedBy ||
      on.brAffectedDept ||
      on.brExpectedDowntime ||
      on.brActualDowntime ||
      on.brRepeat
    ) {
      const cols = [];
      if (on.asset) cols.push({ key: 'asset_id', label: 'Asset' });
      if (on.brDate) {
        cols.push({
          key: 'breakdown_date',
          label: 'Breakdown date',
          render: (r) => formatDate(r.breakdown_date),
        });
      }
      if (on.brIssue) cols.push({ key: 'breakdown_description', label: 'Issue' });
      if (on.brReason) cols.push({ key: 'breakdown_reason', label: 'Cause' });
      if (on.brAffectedDept) {
        cols.push({
          key: 'affected_department_name',
          label: 'Affected department',
          render: (r) => r.affected_department_name || '—',
        });
      }
      if (on.brExpectedDowntime) {
        cols.push({
          key: 'expected_downtime_hours',
          label: 'Expected downtime (h)',
          render: (r) =>
            r.expected_downtime_hours == null || r.expected_downtime_hours === ''
              ? '—'
              : String(r.expected_downtime_hours),
        });
      }
      if (on.brActualDowntime) {
        cols.push({
          key: 'actual_downtime_hours',
          label: 'Actual downtime (h)',
          render: (r) =>
            r.actual_downtime_hours == null || r.actual_downtime_hours === ''
              ? '—'
              : String(r.actual_downtime_hours),
        });
      }
      if (on.brRepeat) {
        cols.push({
          key: 'is_repeat_problem',
          label: 'Repeat problem',
          render: (r) => {
            if (!r.is_repeat_problem) return 'No';
            const parts = [];
            if (Number(r.reopen_count) > 0) parts.push(`${r.reopen_count} reopen`);
            if (Number(r.same_cause_count_in_period) > 1) {
              parts.push(`${r.same_cause_count_in_period}× same cause`);
            }
            return parts.join(' · ') || 'Yes';
          },
        });
      }
      if (on.brStatus) {
        cols.push({
          key: 'breakdown_status',
          label: 'Status',
          render: (r) => statusFullForm(r.breakdown_status),
        });
      }
      if (on.brReportedBy) cols.push({ key: 'reported_by_name', label: 'Reported by' });
      addTable('Breakdowns', cols, report.sections?.breakdown || []);
    }

    if (on.certType || on.certPath) {
      const certRows = [...(report.sections?.certifications || [])];
      // Resolve openable URLs for each document
      await Promise.all(
        certRows.map(async (row) => {
          const url = await resolveDocUrl(row.a_d_id);
          row.__pdfLinkUrl = url;
        }),
      );

      const cols = [];
      if (on.asset) cols.push({ key: 'asset_id', label: 'Asset' });
      if (on.certType) cols.push({ key: 'document_type', label: 'Certification type' });
      if (on.certPath) {
        cols.push({
          key: 'doc_path',
          label: 'Document',
          render: (r) =>
            r.__pdfLinkUrl
              ? `Open ${r.document_type || 'document'}`
              : r.doc_path
                ? 'Document unavailable'
                : '—',
        });
      }
      addTable('Certifications', cols, certRows, on.certPath ? 'doc_path' : null);
    }

    if (on.invoice || on.invoiceVendor) {
      const invRows = [...(report.sections?.invoices || [])];
      await Promise.all(
        invRows.map(async (row) => {
          if (row.source === 'document' && (row.source_id || row.a_d_id)) {
            row.__pdfLinkUrl = await resolveDocUrl(row.source_id || row.a_d_id);
          }
        }),
      );
      const cols = [];
      if (on.asset) cols.push({ key: 'asset_id', label: 'Asset' });
      if (on.invoice) {
        cols.push({
          key: 'invoice_no',
          label: 'Invoice number',
          render: (r) =>
            r.__pdfLinkUrl ? `Open ${r.invoice_no || 'invoice'}` : r.invoice_no || '—',
        });
      }
      if (on.invoiceVendor) cols.push({ key: 'vendor_name', label: 'Invoice vendor' });
      cols.push({
        key: 'source',
        label: 'Source',
        render: (r) => sourceFullForm(r.source),
      });
      addTable('Invoices', cols, invRows, on.invoice ? 'invoice_no' : null);
    }

    if (on.po || on.poVendor) {
      const poRows = [...(report.sections?.purchaseOrders || [])];
      await Promise.all(
        poRows.map(async (row) => {
          if (row.source === 'document' && (row.source_id || row.a_d_id)) {
            row.__pdfLinkUrl = await resolveDocUrl(row.source_id || row.a_d_id);
          }
        }),
      );
      const cols = [];
      if (on.asset) cols.push({ key: 'asset_id', label: 'Asset' });
      if (on.po) {
        cols.push({
          key: 'po_number',
          label: 'Purchase order number',
          render: (r) =>
            r.__pdfLinkUrl
              ? `Open ${r.po_number || 'purchase order'}`
              : r.po_number || '—',
        });
      }
      if (on.poVendor) cols.push({ key: 'vendor_name', label: 'Purchase order vendor' });
      cols.push({
        key: 'source',
        label: 'Source',
        render: (r) => sourceFullForm(r.source),
      });
      addTable('Purchase orders', cols, poRows, on.po ? 'po_number' : null);
    }

    // Also update field-picker labels consistency is separate; PDF labels are full form above.
    const stamp = new Date().toISOString().slice(0, 10);
    const name = `audit-report-${report.auditType?.audtp_id || 'report'}-${stamp}.pdf`;
    doc.save(name);
  }, [report, enrichedAssets, fieldSelection]);
}
