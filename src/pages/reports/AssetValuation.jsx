import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useMemo, useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { assetValuationService } from "../../services/assetValuationService";
import { toast } from "react-hot-toast";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";
import {
  fetchReportDataCached,
  fetchReportFilterOptionsCached,
  fetchReportSummaryCached,
  peekReportData,
} from "../../utils/reportCache";

export default function AssetValuation() {
  const { t } = useLanguage();
  const selectedReportId = "asset-valuation";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.ASSET_VALUATION);
  
  const [apiData, setApiData] = useState({
    assets: [],
    summary: null,
    filterOptions: null,
    pagination: null,
    error: null
  });

  const {
    quick,
    setQuick,
    advanced,
    setAdvanced,
    columns,
    setColumns,
    views,
    setViews,
    setQuickField,
  } = useReportState(selectedReportId, report);

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const data = await fetchReportFilterOptionsCached(selectedReportId, async () => {
          const response = await assetValuationService.getFilterOptions();
          return response.success ? response.data : null;
        });
        if (data) {
          setApiData((prev) => ({ ...prev, filterOptions: data }));
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_FILTER_OPTIONS_644C5192', fallbackText: 'Failed to load filter options', type: 'error' });
      }
    };

    loadFilterOptions();
  }, []);

  useEffect(() => {
    const loadSummary = async () => {
      try {
        const data = await fetchReportSummaryCached(selectedReportId, async () => {
          const response = await assetValuationService.getAssetValuationSummary();
          return response.success ? response.data : null;
        });
        if (data) {
          setApiData((prev) => ({ ...prev, summary: data }));
        }
      } catch (error) {
        console.error('Error loading summary:', error);
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_SUMMARY_DATA_4F69865C', fallbackText: 'Failed to load summary data', type: 'error' });
      }
    };

    loadSummary();
  }, []);

  useEffect(() => {
    if (!quick.includeScrapAssets) return;

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
      limit: 1000,
      advancedConditions: advanced && advanced.length > 0 ? advanced : null,
    };

    const applyAssets = (response) => {
      if (response?.success === false) return;
      const assets = Array.isArray(response) ? response : (response?.data || []);
      const pagination = Array.isArray(response) ? null : (response?.pagination || null);
      setApiData((prev) => ({
        ...prev,
        assets,
        pagination,
        error: null,
      }));
    };

    const fetcher = async () => {
      const response = await assetValuationService.getAssetValuationData(apiFilters);
      if (!response.success) {
        throw new Error(response.message || 'Failed to fetch data');
      }
      return response;
    };

    const cached = peekReportData(selectedReportId, apiFilters);
    if (cached) {
      applyAssets(cached);
      fetchReportDataCached(selectedReportId, apiFilters, fetcher, {
        revalidate: true,
        onFresh: applyAssets,
      }).catch((error) => {
        console.error('Error revalidating asset valuation data:', error);
      });
      return;
    }

    fetchReportDataCached(selectedReportId, apiFilters, fetcher, { force: true })
      .then(({ data }) => applyAssets(data))
      .catch((error) => {
        console.error('Error fetching asset valuation data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch asset valuation data';
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_FETCH_ASSET_VALUATION_DATA_00BD2A3A',
          fallbackText: errorMessage,
          type: 'error',
        });
      });
  }, [quick.assetStatus, quick.includeScrapAssets, quick.currentValueRange, quick.category, quick.location, quick.department, quick.acquisitionDateRange, advanced]);

  const handleRetry = () => {
    setApiData((prev) => ({ ...prev, error: null }));
  };

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
      onRetry={handleRetry}
    />
  );
}
