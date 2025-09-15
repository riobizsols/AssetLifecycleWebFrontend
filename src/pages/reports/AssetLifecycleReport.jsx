import React, { useMemo, useEffect } from "react";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function AssetLifecycleReport() {
  const selectedReportId = "asset-lifecycle";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.ASSET_LIFECYCLE_REPORT);

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
    allAvailableAssets,
    filteredRows,
    loading,
    error,
    hasFilters,
    setQuickField,
  } = useReportState(selectedReportId, report);

  // Debug logging
  console.log('🔍 [AssetLifecycleReport] Component rendered');
  console.log('🔍 [AssetLifecycleReport] Loading:', loading);
  console.log('🔍 [AssetLifecycleReport] Error:', error);
  console.log('🔍 [AssetLifecycleReport] All rows count:', allRows.length);
  console.log('🔍 [AssetLifecycleReport] Filtered rows count:', filteredRows.length);
  console.log('🔍 [AssetLifecycleReport] All available assets count:', allAvailableAssets.length);

  // Monitor data changes
  useEffect(() => {
    console.log('📊 [AssetLifecycleReport] Data changed - All rows:', allRows.length, 'Filtered rows:', filteredRows.length);
    if (allRows.length > 0) {
      console.log('📊 [AssetLifecycleReport] Sample data:', allRows[0]);
    }
  }, [allRows, filteredRows]);

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch('Generate Report', { 
      reportType: 'Asset Lifecycle Report',
      action: 'Report Generated Successfully',
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch('Export Report', { 
      reportType: 'Asset Lifecycle Report',
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
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}