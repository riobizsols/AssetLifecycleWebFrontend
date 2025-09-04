import React, { useMemo } from "react";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";

export default function MaintenanceHistory() {
  const selectedReportId = "maintenance-history";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);

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
    setQuickField,
  } = useReportState(selectedReportId, report);

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
    />
  );
}