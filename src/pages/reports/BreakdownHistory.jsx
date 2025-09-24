import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function BreakdownHistory() {
  const { t } = useTranslation();
  const selectedReportId = "breakdown-history";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.BREAKDOWN_HISTORY);

  const {
    quick,  
    setQuick,
    advanced,
    setAdvanced,
    columns,
    setColumns,
    views,
    setViews,
    allRows,
    filteredRows,
    setQuickField,
    report: updatedReport,
  } = useReportState(selectedReportId, report);

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), { 
      reportType: t('reports.breakdownHistoryReport.name'),
      action: t('reports.auditActions.reportGenerated'),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), { 
      reportType: t('reports.breakdownHistoryReport.name'),
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', { format: exportType.toUpperCase() }),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  return (
    <ReportLayout
      report={updatedReport || report}
      selectedReportId={selectedReportId}
      allRows={allRows}
      filteredRows={filteredRows}
      quick={quick}
      setQuick={setQuick}
      advanced={advanced}
      setAdvanced={setAdvanced}
      columns={columns}
      setColumns={setColumns}
      views={views}
      setViews={setViews}
      setQuickField={setQuickField}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}

