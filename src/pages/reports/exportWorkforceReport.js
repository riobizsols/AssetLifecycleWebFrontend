import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

function assetLabel(r) {
  return `${r.asset_type_name || 'Asset'} ${r.serial_number || r.asset_id || ''}`.trim();
}

function addSectionTitle(doc, title, y) {
  doc.setFontSize(12);
  doc.setTextColor(20, 30, 50);
  doc.text(title, 40, y);
  return y + 8;
}

export function exportWorkforcePdf(report) {
  if (!report) throw new Error('No report data to export');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const margin = 40;
  const summary = report.summary || {};
  const technicians = report.technicians || [];
  const sections = report.sections || {};

  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text('Workforce Report', margin, 36);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    `${report.period?.label || '—'}  ·  ${summary.technicians ?? 0} technicians  ·  ${summary.assignments ?? 0} assignments  ·  SLA ${summary.sla_compliance_pct == null ? '—' : `${summary.sla_compliance_pct}%`}`,
    margin,
    54,
  );
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 68,
    head: [['Metric', 'Value']],
    body: [
      ['Technicians', summary.technicians ?? 0],
      ['Assignments', summary.assignments ?? 0],
      ['Closures', summary.closures ?? 0],
      ['Backlog', summary.backlog ?? 0],
      ['Overdue backlog', summary.overdue_backlog ?? 0],
      [
        'SLA compliance',
        summary.sla_compliance_pct == null ? '—' : `${summary.sla_compliance_pct}%`,
      ],
      ['On time', summary.sla_on_time ?? 0],
      ['Late closures', summary.sla_late ?? 0],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [20, 61, 101] },
    columnStyles: { 0: { cellWidth: 180 }, 1: { cellWidth: 120 } },
  });

  let y = (doc.lastAutoTable?.finalY || 100) + 20;
  y = addSectionTitle(doc, 'Technician summary', y);
  autoTable(doc, {
    startY: y,
    head: [[
      'Technician',
      'Assignments',
      'Open',
      'Closures',
      'Backlog',
      'Overdue',
      'SLA %',
      'Avg days',
    ]],
    body: technicians.map((t) => [
      t.technician_name,
      t.assignments,
      t.open_assignments,
      t.closures,
      t.backlog,
      t.overdue_backlog,
      t.sla_compliance_pct == null ? '—' : `${t.sla_compliance_pct}%`,
      t.avg_turnaround_days == null ? '—' : t.avg_turnaround_days,
    ]),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [20, 61, 101] },
  });

  const woHead = [
    'Technician',
    'Work order',
    'Asset',
    'Type',
    'Scheduled',
    'Completed',
    'Status',
    'Institution',
  ];
  const mapWo = (rows) =>
    (rows || []).slice(0, 400).map((r) => [
      r.technician_name,
      r.wo_id || '—',
      assetLabel(r),
      r.maintenance_type_name || '—',
      formatDate(r.act_maint_st_date),
      formatDate(r.act_main_end_date),
      r.is_overdue ? `${r.status || '—'} (Overdue)` : r.status || '—',
      r.branch_name || '—',
    ]);

  const detailSections = [
    ['Assignments', sections.assignments],
    ['Closures', sections.closures],
    ['Backlog', sections.backlog],
  ];

  for (const [title, rows] of detailSections) {
    y = (doc.lastAutoTable?.finalY || 100) + 18;
    if (y > 520) {
      doc.addPage();
      y = 40;
    }
    y = addSectionTitle(doc, title, y);
    autoTable(doc, {
      startY: y,
      head: [woHead],
      body: mapWo(rows),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [20, 61, 101] },
    });
  }

  const stamp = (report.period?.from || 'export').replace(/[^0-9A-Za-z_-]/g, '_');
  doc.save(`Workforce_Report_${stamp}.pdf`);
}
