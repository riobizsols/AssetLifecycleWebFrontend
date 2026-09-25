import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getStockPurchaseCellValue } from './newReportExtrasConfig';

const PDF_COLUMNS = [
  'Part code',
  'Description',
  'Status',
  'Available',
  'Requested',
  'Upcoming PM',
  'Minimum qty',
];

/**
 * Client-side PDF for Stock & Purchase report.
 */
export function exportStockPurchasePdf({ rows = [], totals = {}, horizonDays = 30 } = {}) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  const stamp = new Date().toISOString().slice(0, 10);

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Stock & Purchase Report', margin, 36);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Horizon ${horizonDays} days  ·  Generated ${stamp}`, margin, 54);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 68,
    head: [['Metric', 'Value']],
    body: [
      ['Parts to buy', totals.parts_to_buy ?? rows.length ?? 0],
      ['Out of stock', totals.out_of_stock ?? 0],
      ['WO impact', totals.with_wo_impact ?? 0],
      ['Upcoming PM', totals.with_upcoming_pm ?? 0],
      ['Planning horizon (days)', horizonDays],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [14, 47, 75] },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 100 } },
  });

  const startY = (doc.lastAutoTable?.finalY || 100) + 18;
  autoTable(doc, {
    startY,
    head: [PDF_COLUMNS],
    body: (rows.length ? rows : [{}]).map((row) =>
      PDF_COLUMNS.map((col) =>
        rows.length ? String(getStockPurchaseCellValue(row, col) ?? '') : 'No matching parts',
      ),
    ),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [14, 47, 75] },
  });

  doc.save(`stock-purchase-${stamp}.pdf`);
}
