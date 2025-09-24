import React, { useMemo, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { assetValuationService } from "../../services/assetValuationService";
import { toast } from "react-hot-toast";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function AssetValuation() {
  const { t } = useTranslation();
  const selectedReportId = "asset-valuation";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.ASSET_VALUATION);
  
  const [apiData, setApiData] = useState({
    assets: [],
    summary: null,
    filterOptions: null,
    pagination: null,
    error: null
  });

  const [initialLoad, setInitialLoad] = useState(true);

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
  } = useReportState(selectedReportId, report);

  // Debug: Log quick state changes
  useEffect(() => {
    console.log('🔍 [AssetValuation] Quick state:', quick);
  }, [quick]);

  // Load filter options on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await assetValuationService.getFilterOptions();
        if (response.success && response.data) {
          setApiData(prev => ({
            ...prev,
            filterOptions: response.data
          }));
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
        toast.error('Failed to load filter options');
      }
    };

    loadFilterOptions();
  }, []);

  // Load summary data on component mount
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await assetValuationService.getAssetValuationSummary();
        if (response.success && response.data) {
          setApiData(prev => ({
            ...prev,
            summary: response.data
          }));
        }
      } catch (error) {
        console.error('Error loading summary:', error);
        toast.error('Failed to load summary data');
      }
    };

    loadSummary();
  }, []);

  // Fetch data from API when filters change
  useEffect(() => {
    // Wait for quick state to be initialized with default values
    if (!quick.includeScrapAssets) {
      console.log('🔍 [AssetValuation] Waiting for quick state to initialize...');
      return;
    }
    
    const fetchData = async () => {
      // Remove loading state - fetch in background
      try {
        // Convert frontend filters to API format
        const apiFilters = {
          assetStatus: quick.assetStatus && quick.assetStatus.length > 0 ? quick.assetStatus[0] : null,
          includeScrapAssets: quick.includeScrapAssets === 'Yes',
          currentValueMin: quick.currentValueRange || null,
          category: quick.category || null,
          location: quick.location || null,
          department: quick.department || null,
          acquisitionDateFrom: quick.acquisitionDateRange?.[0] || null,
          acquisitionDateTo: quick.acquisitionDateRange?.[1] || null,
          page: 1,
          limit: 1000, // Get more data for frontend filtering
          // Add advanced conditions
          advancedConditions: advanced && advanced.length > 0 ? advanced : null
        };

        // Debug logs removed for cleaner console
        const response = await assetValuationService.getAssetValuationData(apiFilters);
        console.log('🔍 [AssetValuation] API response:', response);
        
        if (response.success) {
          setApiData(prev => ({
            ...prev,
            assets: response.data || [],
            pagination: response.pagination || null,
            error: null
          }));
        } else {
          throw new Error(response.message || 'Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching asset valuation data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch asset valuation data';
        toast.error(errorMessage);
        setApiData(prev => ({
          ...prev,
          error: null // Don't set error state to avoid full-screen error
        }));
      }
    };

    // Only fetch if we have some filters applied or it's the initial load
    if (initialLoad || quick.assetStatus || quick.includeScrapAssets || quick.category || quick.location || quick.department || (advanced && advanced.length > 0)) {
      fetchData();
      setInitialLoad(false);
    }
  }, [quick.assetStatus, quick.includeScrapAssets, quick.currentValueRange, quick.category, quick.location, quick.department, quick.acquisitionDateRange, advanced, initialLoad]);

  // Retry function for failed requests
  const handleRetry = () => {
    setInitialLoad(true);
    setApiData(prev => ({ ...prev, error: null }));
  };

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), { 
      reportType: t('reports.assetValuationReport'),
      action: t('reports.auditActions.reportGenerated'),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), { 
      reportType: t('reports.assetValuationReport'),
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', { format: exportType.toUpperCase() }),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  // Use API data only
  const finalAllRows = apiData.assets || [];
  const finalFilteredRows = apiData.assets || [];

  return (
    <ReportLayout
      report={report}
      selectedReportId={selectedReportId}
      allRows={finalAllRows}
      filteredRows={finalFilteredRows}
      quick={quick}
      setQuick={setQuick}
      setQuickField={setQuickField}
      advanced={advanced}
      setAdvanced={setAdvanced}
      columns={columns}
      setColumns={setColumns}
      views={views}
      setViews={setViews}
      apiData={{
        ...apiData,
        summary: apiData.summary,
        filterOptions: apiData.filterOptions
      }}
      exportService={assetValuationService}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}