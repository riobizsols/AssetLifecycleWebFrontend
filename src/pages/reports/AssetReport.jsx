import React, { useMemo } from "react";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function AssetReport() {
  const selectedReportId = "asset-register";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.ASSET_REPORT);

  const {
    quick,
    setQuick,
    advanced,
    setAdvanced,
    columns,
    setColumns,
    views,
    setViews,
    cols,
    allRows,
    filteredRows,
    hasFilters,
  } = useReportState(selectedReportId, report);

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch('Generate Report', { 
      reportType: 'Asset Report',
      action: 'Report Generated Successfully',
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch('Export Report', { 
      reportType: 'Asset Report',
      exportFormat: exportType,
      action: `Report Exported as ${exportType.toUpperCase()}`,
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  return (
    <ReportLayout
      report={report}
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
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}