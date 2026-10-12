import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { cellText, columnByLabel, formatQty, STATUS_LABELS } from './config';

const NAVY = [14, 47, 75];
const AMBER = [255, 193, 7];

const stamp = () => new Date().toISOString().slice(0, 10);

const excelValue = (col, row) => {
  if (col.numeric) return Number(col.value(row)) || 0;
  return cellText(col, row);
};

function sheetFromView(view) {
  const cols = view.columns.map((l) => columnByLabel(view.dataset, l)).filter(Boolean);
  const aoa = [cols.map((c) => c.label), ...view.filtered.map((r) => cols.map((c) => excelValue(c, r)))];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = cols.map((c) => ({
    wch: Math.min(40, Math.max(c.label.length + 2, c.numeric ? 12 : 16)),
  }));
  return ws;
}

export function summaryRows(summary, filters) {
  const s = summary || {};
  return [
    ['Period', `${filters?.from || '-'} to ${filters?.to || '-'}`],
    ['Consumables', s.consumables ?? 0],
    ['Stock entries', s.stockEntries ?? 0],
    ['Need attention', s.attentionCount ?? 0],
    ...Object.entries(s.statusCounts || {}).map(([k, v]) => [`  ${STATUS_LABELS[k] || k}`, v]),
    ['Restocks in period', s.restockCount ?? 0],
    ['Quantity received (all units)', s.receivedQty ?? 0],
    ['Allocations in period', s.allocationCount ?? 0],
    ['Quantity allocated (all units)', s.allocatedQty ?? 0],
    ['Departments served', s.departmentsServed ?? 0],
  ];
}

const deptQty = (d) =>
  Object.entries(d.qty_by_uom || {})
    .map(([uom, q]) => `${formatQty(q)} ${uom}`)
    .join(', ');

export function exportExcel({ report, filterSummary, views, scope = 'full', activeView }) {
  const wb = XLSX.utils.book_new();
  const filters = [['Filter', 'Value'], ...filterSummary.map((f) => [f.label, f.value])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(filters), 'Filters');

  if (scope === 'full') {
    const summary = XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...summaryRows(report?.summary, report?.filters)]);
    summary['!cols'] = [{ wch: 34 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, summary, 'Summary');

    const dept = [
      ['Department', 'Allocations', 'Distinct items', 'Quantity issued'],
      ...(report?.summary?.byDepartment || []).map((d) => [d.dept_name, d.allocation_count, d.items, deptQty(d)]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dept), 'By department');

    const top = [
      ['Consumable', 'UOM', 'Allocated qty', 'Allocations', 'Departments'],
      ...(report?.summary?.topConsumables || []).map((c) => [
        c.consumable,
        c.uom_name || '',
        Number(c.allocated_qty) || 0,
        c.allocation_count,
        c.departments,
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(top), 'By consumable');

    views.forEach((v) => XLSX.utils.book_append_sheet(wb, sheetFromView(v), v.dataset.label.slice(0, 31)));
    XLSX.writeFile(wb, `Consumables_Report_${stamp()}.xlsx`);
    return;
  }

  XLSX.utils.book_append_sheet(wb, sheetFromView(activeView), activeView.dataset.label.slice(0, 31));
  XLSX.writeFile(wb, `Consumables_${activeView.dataset.id}_${stamp()}.xlsx`);
}

function pdfHeader(doc, title, subtitle) {
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, w, 58, 'F');
  doc.setFillColor(...AMBER);
  doc.rect(0, 58, w, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text(title, 32, 28);
  doc.setFontSize(9);
  doc.setTextColor(210, 220, 230);
  doc.text(subtitle, 32, 44);
  doc.setTextColor(0, 0, 0);
}

function pdfFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140);
    doc.text(`Generated ${new Date().toLocaleString('en-GB')}`, 32, h - 16);
    doc.text(`Page ${i} of ${pages}`, w - 32, h - 16, { align: 'right' });
  }
}

const tableStyle = {
  styles: { fontSize: 7.5, cellPadding: 4, overflow: 'linebreak' },
  headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold' },
  alternateRowStyles: { fillColor: [248, 250, 252] },
  margin: { left: 32, right: 32 },
};

function pdfSection(doc, title, startY) {
  const h = doc.internal.pageSize.getHeight();
  let y = startY;
  if (y > h - 90) {
    doc.addPage();
    y = 40;
  }
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(title, 32, y);
  doc.setTextColor(0);
  return y + 8;
}

function pdfView(doc, view, startY) {
  const cols = view.columns.map((l) => columnByLabel(view.dataset, l)).filter(Boolean);
  const y = pdfSection(doc, `${view.dataset.title} (${view.filtered.length} rows)`, startY);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [cols.map((c) => c.label)],
    body: view.filtered.map((r) => cols.map((c) => cellText(c, r))),
    columnStyles: Object.fromEntries(
      cols.map((c, i) => [i, c.numeric ? { halign: 'right' } : {}]),
    ),
  });
  return (doc.lastAutoTable?.finalY || y) + 22;
}

export function exportPdf({ report, filterSummary, views, scope = 'full', activeView }) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const period = `${report?.filters?.from || '-'} to ${report?.filters?.to || '-'}`;
  const title = scope === 'full' ? 'Consumables Report' : `Consumables - ${activeView.dataset.title}`;
  pdfHeader(doc, title, `Period ${period}`);

  let y = 84;
  y = pdfSection(doc, 'Applied filters', y);
  autoTable(doc, {
    ...tableStyle,
    startY: y,
    head: [['Filter', 'Value']],
    body: filterSummary.map((f) => [f.label, f.value]),
    tableWidth: 420,
  });
  y = (doc.lastAutoTable?.finalY || y) + 22;

  if (scope === 'full') {
    y = pdfSection(doc, 'Summary', y);
    autoTable(doc, {
      ...tableStyle,
      startY: y,
      head: [['Metric', 'Value']],
      body: summaryRows(report?.summary, report?.filters).map(([k, v]) => [
        k,
        typeof v === 'number' ? formatQty(v) : v,
      ]),
      tableWidth: 420,
    });
    y = (doc.lastAutoTable?.finalY || y) + 22;

    const depts = report?.summary?.byDepartment || [];
    if (depts.length) {
      y = pdfSection(doc, 'Allocations by department', y);
      autoTable(doc, {
        ...tableStyle,
        startY: y,
        head: [['Department', 'Allocations', 'Distinct items', 'Quantity issued']],
        body: depts.map((d) => [d.dept_name, d.allocation_count, d.items, deptQty(d)]),
      });
      y = (doc.lastAutoTable?.finalY || y) + 22;
    }

    views.forEach((v) => {
      y = pdfView(doc, v, y);
    });
  } else {
    pdfView(doc, activeView, y);
  }

  pdfFooter(doc);
  doc.save(
    scope === 'full'
      ? `Consumables_Report_${stamp()}.pdf`
      : `Consumables_${activeView.dataset.id}_${stamp()}.pdf`,
  );
}
