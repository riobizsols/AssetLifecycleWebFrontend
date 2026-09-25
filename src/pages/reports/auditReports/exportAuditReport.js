import * as XLSX from 'xlsx';
import {
  AUDIT_REPORT_COLUMNS,
  getAuditReportCellValue,
} from '../newReportExtrasConfig';

/**
 * Export Audit Report asset list as Excel (Filters + Summary + Assets).
 */
export function exportAuditReportExcel({
  report,
  assets = [],
  columns = AUDIT_REPORT_COLUMNS.default,
  filterSummary = [],
  summaryItems = [],
}) {
  const wb = XLSX.utils.book_new();
  const periodLabel = report?.period?.label || '';
  const auditLabel = report?.auditType?.description || report?.auditType?.audtp_id || 'Audit';

  if (filterSummary?.length) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([
        ['Filter', 'Value'],
        ...filterSummary.map((f) => [f.label, f.value]),
      ]),
      'Filters',
    );
  }

  const summaryRows = summaryItems?.length
    ? summaryItems.map((s) => [s.label, s.value])
    : [
        ['Assets', assets.length],
        ['Audit type', auditLabel],
        ['Period', periodLabel],
      ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([['Metric', 'Value'], ...summaryRows]),
    'Summary',
  );

  const cols = columns?.length ? columns : AUDIT_REPORT_COLUMNS.default;
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      cols,
      ...assets.map((row) => cols.map((col) => getAuditReportCellValue(row, col))),
    ]),
    'Assets',
  );

  const stamp = String(periodLabel || 'export').replace(/[^\w\-]+/g, '_').slice(0, 40);
  XLSX.writeFile(wb, `Audit_Report_${stamp}.xlsx`);
}
