import React, { useMemo } from "react";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function UtilityConsumptionReport() {
  const selectedReportId = "utility-consumption";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);

  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.UTILITY_CONSUMPTION_REPORT);

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
    allAvailableAssets,
    filteredRows,
    loading,
    error,
    setQuickField,
    filterOptions,
    report: updatedReport,
  } = useReportState(selectedReportId, report);

  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch("Generate Report", {
      reportType: "Utility Consumption Report",
      action: "Report Generated",
      filterCount: Object.keys(quick).filter((key) => quick[key] && quick[key] !== "").length,
    });
  };

  const handleExportReport = async (exportType = "pdf") => {
    await recordActionByNameWithFetch("Export Report", {
      reportType: "Utility Consumption Report",
      exportFormat: exportType,
      action: `Report Exported (${String(exportType).toUpperCase()})`,
      filterCount: Object.keys(quick).filter((key) => quick[key] && quick[key] !== "").length,
    });
  };

  return (
    <ReportLayout
      report={updatedReport || report}
      selectedReportId={selectedReportId}
      allRows={allRows}
      allAvailableAssets={allAvailableAssets}
      filteredRows={filteredRows}
      quick={quick}
      setQuick={setQuick}
      setQuickField={setQuickField}
      advanced={advanced}
      setAdvanced={setAdvanced}
      columns={columns}
      setColumns={setColumns}
      views={views}
      setViews={setViews}
      loading={loading}
      error={error}
      apiData={filterOptions ? { filterOptions } : undefined}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
      paginate
    />
  );
}
