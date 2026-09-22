import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatInr } from './utils';
import { consolidatedAssetRegisterService } from '../../../services/consolidatedAssetRegisterService';

export async function exportExcel({ summary, queryFilters, filterSummary = [] }) {
  const exportData = await consolidatedAssetRegisterService.getRegisterExport(queryFilters);
  const wb = XLSX.utils.book_new();

  if (filterSummary?.length) {
    const filters = [
      ['Filter', 'Value'],
      ...filterSummary.map((f) => [f.label, f.value]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filters), 'Filters');
  }

  const kpi = [
    ['Metric', 'Value'],
    ['As of', summary?.asOfLabel || ''],
    ['Asset count', summary?.consolidated?.asset_count ?? 0],
    ['Acquisition value', summary?.consolidated?.acquisition_value ?? 0],
    ['Depreciation', summary?.consolidated?.total_depreciation ?? 0],
    ['Book value', summary?.consolidated?.book_value ?? 0],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpi), 'Summary');

  const inst = [
    ['Institution', 'Assets', 'Acquisition', 'Depreciation', 'Book value'],
    ...(summary?.institutions || []).map((r) => [
      r.institution,
      r.asset_count,
      r.acquisition_value,
      r.depreciation,
      r.book_value,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inst), 'Institutions');

  const campus = [
    ['Institution', 'Campus', 'Assets', 'Acquisition', 'Book value'],
    ...(summary?.byCampus || []).map((r) => [
      r.institution,
      r.campus,
      r.asset_count,
      r.acquisition_value,
      r.book_value,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(campus), 'Campuses');

  const types = [
    ['Asset type', 'Assets', 'Share %', 'Acquisition', 'Book value'],
    ...(summary?.assetTypeDistribution || []).map((r) => [
      r.asset_type,
      r.asset_count,
      r.share_pct,
      r.acquisition_value,
      r.book_value,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(types), 'Asset types');

  const reg = [
    [
      'Institution',
      'Campus',
      'Department',
      'Asset ID',
      'Serial',
      'Type',
      'Status',
      'Acquisition',
      'Book value',
    ],
    ...(exportData?.rows || []).map((r) => [
      r.institution,
      r.campus,
      r.department,
      r.asset_id,
      r.serial_number,
      r.asset_type,
      r.status,
      r.acquisition_value,
      r.book_value,
    ]),
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(reg), 'Register');

  XLSX.writeFile(wb, `Consolidated_Asset_Register_${summary?.asOfLabel || 'export'}.xlsx`);
}

export async function exportPdf({ summary, queryFilters, filterSummary = [] }) {
  const exportData = await consolidatedAssetRegisterService.getRegisterExport(queryFilters);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;

  doc.setFontSize(16);
  doc.text('Consolidated Asset Register Report', margin, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `As of ${summary?.asOfLabel || '—'}  ·  ${summary?.consolidated?.asset_count ?? 0} assets  ·  Acquisition ₹ ${formatInr(summary?.consolidated?.acquisition_value)}  ·  Book ₹ ${formatInr(summary?.consolidated?.book_value)}`,
    margin,
    58,
  );
  doc.setTextColor(0);

  let startY = 72;

  if (filterSummary?.length) {
    autoTable(doc, {
      startY,
      head: [['Applied filters', 'Value']],
      body: filterSummary.map((f) => [f.label, f.value]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [15, 23, 42] },
    });
    startY = (doc.lastAutoTable?.finalY || startY) + 16;
  }

  autoTable(doc, {
    startY,
    head: [['Institution', 'Assets', 'Acquisition (₹)', 'Depreciation (₹)', 'Book value (₹)']],
    body: (summary?.institutions || []).map((r) => [
      r.institution,
      r.asset_count,
      formatInr(r.acquisition_value),
      formatInr(r.depreciation),
      formatInr(r.book_value),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 100) + 16,
    head: [['Asset type', 'Assets', 'Share %', 'Acquisition (₹)', 'Book value (₹)']],
    body: (summary?.assetTypeDistribution || []).map((r) => [
      r.asset_type,
      r.asset_count,
      r.share_pct,
      formatInr(r.acquisition_value),
      formatInr(r.book_value),
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  autoTable(doc, {
    startY: (doc.lastAutoTable?.finalY || 100) + 16,
    head: [
      [
        'Institution',
        'Campus',
        'Dept',
        'Asset ID',
        'Type',
        'Status',
        'Acquisition',
        'Book',
      ],
    ],
    body: (exportData?.rows || []).slice(0, 500).map((r) => [
      r.institution,
      r.campus,
      r.department,
      r.asset_id,
      r.asset_type,
      r.status,
      formatInr(r.acquisition_value),
      formatInr(r.book_value),
    ]),
    styles: { fontSize: 7 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save(`Consolidated_Asset_Register_${summary?.asOfLabel || 'export'}.pdf`);
}
