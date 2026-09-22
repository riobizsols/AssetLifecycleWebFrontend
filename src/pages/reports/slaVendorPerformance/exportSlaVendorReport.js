import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getSlaDetailCellValue, SLA_DETAIL_COLUMNS } from '../newReportExtrasConfig';

function sheetFromAoA(rows) {
  return XLSX.utils.aoa_to_sheet(rows);
}

function buildStamp(periodLabel) {
  return (periodLabel || '').replace(/[^\w\-]+/g, '_').slice(0, 40) || 'export';
}

function buildKpiRows(summary) {
  const kpis = summary?.kpis || {};
  const periodLabel = summary?.period?.label || '';
  return [
    ['Period', periodLabel],
    ['Service requests', kpis.total_requests ?? 0],
    ['SLA compliance %', kpis.sla_compliance_pct ?? ''],
    ['SLA breaches', kpis.breached ?? 0],
    ['Avg response', kpis.avg_response_label || ''],
    ['Avg resolution', kpis.avg_resolution_label || ''],
    ['Repeat failure assets', kpis.repeat_failure_assets ?? 0],
    [
      'Service rating',
      kpis.rating_data_available ? `${Number(kpis.avg_rating).toFixed(1)} / 5` : 'N/A',
    ],
    ['Vendors with breaches', kpis.vendors_with_breaches ?? 0],
  ];
}

function buildVendorRows(vendors) {
  return (vendors?.rows || []).map((v) => [
    v.vendor_name,
    v.requests,
    v.sla_compliance_pct != null ? v.sla_compliance_pct : '',
    v.breaches,
    v.avg_resolution_label || '',
    v.avg_response_label || '',
    v.avg_rating != null ? Number(v.avg_rating).toFixed(1) : '',
  ]);
}

/**
 * Export SLA & Vendor Performance as Excel (Summary + Vendors + Detail).
 */
export function exportSlaVendorExcel({
  summary,
  vendors,
  detailRows = [],
  columns = SLA_DETAIL_COLUMNS.default,
  filterSummary = [],
}) {
  const wb = XLSX.utils.book_new();
  const periodLabel = summary?.period?.label || '';

  const filterSheet = [
    ['Filter', 'Value'],
    ...filterSummary.map((f) => [f.label, f.value]),
  ];
  if (filterSheet.length > 1) {
    XLSX.utils.book_append_sheet(wb, sheetFromAoA(filterSheet), 'Filters');
  }

  const kpiSheet = [['Metric', 'Value'], ...buildKpiRows(summary)];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(kpiSheet), 'Summary');

  const vendorRows = [
    [
      'Vendor',
      'Requests',
      'SLA %',
      'Breaches',
      'Avg resolution',
      'Avg response',
      'Rating',
    ],
    ...buildVendorRows(vendors),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(vendorRows), 'Vendors');

  const cols = columns?.length ? columns : SLA_DETAIL_COLUMNS.default;
  const detailSheet = [
    cols,
    ...detailRows.map((row) => cols.map((col) => getSlaDetailCellValue(row, col))),
  ];
  XLSX.utils.book_append_sheet(wb, sheetFromAoA(detailSheet), 'Request detail');

  XLSX.writeFile(wb, `SLA_Vendor_Performance_${buildStamp(periodLabel)}.xlsx`);
}

/**
 * Export SLA & Vendor Performance as PDF (filters + KPIs + vendors + detail).
 */
export function exportSlaVendorPdf({
  summary,
  vendors,
  detailRows = [],
  columns = SLA_DETAIL_COLUMNS.default,
  filterSummary = [],
}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 36;
  const periodLabel = summary?.period?.label || '—';
  const kpis = summary?.kpis || {};
  const headStyle = { fillColor: [14, 47, 75] };

  doc.setFontSize(16);
  doc.setTextColor(20, 30, 50);
  doc.text('SLA & Vendor Performance', margin, 36);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${periodLabel}  ·  ${kpis.total_requests ?? 0} requests  ·  SLA ${kpis.sla_compliance_pct == null ? '—' : `${kpis.sla_compliance_pct}%`}  ·  ${kpis.breached ?? 0} breaches`,
    margin,
    54,
  );
  doc.setTextColor(0);

  let startY = 68;

  if (filterSummary?.length) {
    autoTable(doc, {
      startY,
      head: [['Applied filters', 'Value']],
      body: filterSummary.map((f) => [f.label, f.value]),
      styles: { fontSize: 8 },
      headStyles: headStyle,
      margin: { left: margin, right: margin },
    });
    startY = (doc.lastAutoTable?.finalY || startY) + 14;
  }

  autoTable(doc, {
    startY,
    head: [['Metric', 'Value']],
    body: buildKpiRows(summary),
    styles: { fontSize: 8 },
    headStyles: headStyle,
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 160 } },
    margin: { left: margin, right: margin },
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 100) + 16,
    head: [[
      'Vendor',
      'Requests',
      'SLA %',
      'Breaches',
      'Avg resolution',
      'Avg response',
      'Rating',
    ]],
    body: buildVendorRows(vendors),
    styles: { fontSize: 8 },
    headStyles: headStyle,
    margin: { left: margin, right: margin },
  });

  const cols = columns?.length ? columns : SLA_DETAIL_COLUMNS.default;
  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 100) + 16,
    head: [cols],
    body: (detailRows || []).slice(0, 800).map((row) =>
      cols.map((col) => {
        const v = getSlaDetailCellValue(row, col);
        return v == null || v === '' ? '—' : String(v);
      }),
    ),
    styles: { fontSize: 7 },
    headStyles: headStyle,
    margin: { left: margin, right: margin },
  });

  doc.save(`SLA_Vendor_Performance_${buildStamp(periodLabel)}.pdf`);
}
