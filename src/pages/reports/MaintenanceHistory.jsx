import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { maintenanceHistoryService } from "../../services/maintenanceHistoryService";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function MaintenanceHistory() {
  const { t } = useTranslation();
  const selectedReportId = "maintenance-history";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.MAINTENANCE_HISTORY);

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
    loading,
    error,
    report: updatedReport,
  } = useReportState(selectedReportId, report);

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), { 
      reportType: t('reports.maintenanceHistoryReport.name'),
      action: t('reports.auditActions.reportGenerated'),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), { 
      reportType: t('reports.maintenanceHistoryReport.name'),
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', { format: exportType.toUpperCase() }),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  // Export functionality
  const handleExport = async (exportType = 'pdf') => {
    try {
      console.log('🔍 [MaintenanceHistory] Starting export as', exportType);
      
      // Log audit event for export
      await handleExportReport(exportType);
      
      // Convert quick filters to API parameters
      const apiFilters = {};
      Object.entries(quick).forEach(([key, value]) => {
        if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
          // Map frontend field names to API parameter names
          if (key === 'maintenanceStartDateRange' && Array.isArray(value) && value.length === 2) {
            apiFilters.maintenance_start_date_from = value[0];
            apiFilters.maintenance_start_date_to = value[1];
          } else if (key === 'maintenanceEndDateRange' && Array.isArray(value) && value.length === 2) {
            apiFilters.maintenance_end_date_from = value[0];
            apiFilters.maintenance_end_date_to = value[1];
          } else if (key === 'vendorId') {
            apiFilters.vendor_id = value;
          } else if (key === 'assetId') {
            apiFilters.asset_id = value;
          } else if (key === 'workOrderId') {
            apiFilters.wo_id = value;
          } else if (key === 'notes') {
            apiFilters.notes = value;
          } else {
            apiFilters[key] = value;
          }
        }
      });
      
      // Add advanced conditions to API filters
      if (advanced && advanced.length > 0) {
        const validAdvancedConditions = advanced.filter(condition => {
          if (condition.val === null || condition.val === undefined) return false;
          if (Array.isArray(condition.val) && condition.val.length === 0) return false;
          if (typeof condition.val === 'string' && condition.val.trim() === '') return false;
          if (Array.isArray(condition.val) && condition.val.every(v => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) return false;
          return true;
        });
        
        if (validAdvancedConditions.length > 0) {
          apiFilters.advancedConditions = validAdvancedConditions;
        }
      }

      const blob = await maintenanceHistoryService.exportMaintenanceHistory(apiFilters, exportType);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `maintenance-history-${new Date().toISOString().slice(0, 10)}.${exportType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ [MaintenanceHistory] Export completed successfully');
    } catch (error) {
      console.error('❌ [MaintenanceHistory] Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  return (
    <ReportLayout
      report={updatedReport || report}
      selectedReportId={selectedReportId}
      allRows={allRows}
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
      onExport={handleExport}
      exportFormats={['pdf', 'csv']}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}