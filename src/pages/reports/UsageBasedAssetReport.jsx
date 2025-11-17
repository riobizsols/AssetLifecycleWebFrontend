import React, { useMemo, useState, useEffect } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { usageBasedAssetReportService } from "../../services/usageBasedAssetReportService";
import { toast } from "react-hot-toast";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";

export default function UsageBasedAssetReport() {
  const { t } = useLanguage();
  const selectedReportId = "usage-based-asset";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.USAGE_BASED_ASSET_REPORT);
  
  const [apiData, setApiData] = useState({
    data: [],
    summary: null,
    filterOptions: null,
    pagination: null,
    error: null
  });

  const [initialLoad, setInitialLoad] = useState(true);
  const [loading, setLoading] = useState(false);

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

  // Load filter options on component mount
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await usageBasedAssetReportService.getFilterOptions();
        if (response.success && response.data) {
          setApiData(prev => ({
            ...prev,
            filterOptions: response.data
          }));

          // Update report domain values with API data
          const assetTypes = response.data.assetTypes || [];
          const assets = response.data.assets || [];
          const departments = response.data.departments || [];
          const branches = response.data.branches || [];
          const users = response.data.users || [];

          console.log('🔍 [UsageBasedAssetReport] Departments from API:', departments);
          console.log('🔍 [UsageBasedAssetReport] Assets from API:', assets.slice(0, 3));

          // Update quickFields domain with labels for display
          if (report && report.quickFields) {
            report.quickFields.forEach(field => {
              if (field.key === 'assetId') {
                // For asset ID, use asset_id as value and display asset_id with asset_name
                // Asset name comes from description column in tblAssets
                field.domain = assets
                  .filter(a => a.asset_id)
                  .map(a => {
                    // Prioritize description, then text, then asset_id
                    const assetName = a.asset_name || a.description || a.text || a.asset_id || 'Unknown Asset';
                    console.log(`🔍 [UsageBasedAssetReport] Asset ${a.asset_id}: description="${a.description}", text="${a.text}", asset_name="${a.asset_name}", final="${assetName}"`);
                    return {
                      value: a.asset_id,
                      label: `${a.asset_id} - ${assetName}`
                    };
                  });
                console.log('🔍 [UsageBasedAssetReport] Final asset domain:', field.domain.slice(0, 3));
              } else if (field.key === 'assetType') {
                // For asset type, use asset_type_id as value and text as label
                field.domain = assetTypes.map(at => ({
                  value: at.asset_type_id,
                  label: at.text
                }));
              } else if (field.key === 'department') {
                // For department, use dept_id as value and department_name as label
                // Departments come from asset assignments: if asset ASS106 (type AT054) is assigned to DPT202,
                // then DPT202 should appear with its department name from tblDepartments.text
                console.log('🔍 [UsageBasedAssetReport] Processing departments:', departments);
                console.log('🔍 [UsageBasedAssetReport] Department count:', departments.length);
                
                if (departments.length === 0) {
                  console.warn('⚠️ [UsageBasedAssetReport] No departments received from API');
                }
                
                field.domain = departments
                  .filter(d => {
                    const hasDeptId = d && d.dept_id;
                    if (!hasDeptId) {
                      console.warn('⚠️ [UsageBasedAssetReport] Filtered out department without dept_id:', d);
                    }
                    return hasDeptId;
                  })
                  .map(d => {
                    // Try multiple fields to get the department name
                    const label = d.department_name || d.text || d.dept_id || 'Unknown Department';
                    const trimmedLabel = label ? String(label).trim() : String(d.dept_id);
                    
                    console.log(`🔍 [UsageBasedAssetReport] Department mapping:`, {
                      dept_id: d.dept_id,
                      department_name: d.department_name,
                      text: d.text,
                      final_label: trimmedLabel
                    });
                    
                    return {
                      value: d.dept_id,
                      label: trimmedLabel || d.dept_id || 'Unknown Department'
                    };
                  });
                
                console.log('🔍 [UsageBasedAssetReport] Final department domain (first 5):', field.domain.slice(0, 5));
                console.log('🔍 [UsageBasedAssetReport] Total department options:', field.domain.length);
              } else if (field.key === 'branch') {
                // For branch, use branch_id as value and branch_name as label
                field.domain = branches.map(b => ({
                  value: b.branch_id,
                  label: b.branch_name
                }));
              } else if (field.key === 'createdBy') {
                // For created by, use user_id as value and user_name as label
                field.domain = users.map(u => ({
                  value: u.user_id,
                  label: u.user_name
                }));
              }
            });
          }
        }
      } catch (error) {
        console.error('Error loading filter options:', error);
        toast.error('Failed to load filter options');
      }
    };

    loadFilterOptions();
  }, [report]);

  // Load summary data on component mount
  useEffect(() => {
    const loadSummary = async () => {
      try {
        const response = await usageBasedAssetReportService.getUsageReportSummary({});
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
    const fetchData = async () => {
      setLoading(true);
      try {
        // Convert frontend filters to API format
        const apiFilters = {
          assetId: quick.assetId || null,
          assetTypeIds: quick.assetType && Array.isArray(quick.assetType) && quick.assetType.length > 0 
            ? quick.assetType.map(item => typeof item === 'object' ? item.value : item)
            : (quick.assetType && !Array.isArray(quick.assetType) ? [quick.assetType] : null),
          dateFrom: quick.dateRange && quick.dateRange[0] ? quick.dateRange[0] : null,
          dateTo: quick.dateRange && quick.dateRange[1] ? quick.dateRange[1] : null,
          department: quick.department && Array.isArray(quick.department) && quick.department.length > 0
            ? quick.department.map(item => typeof item === 'object' ? item.value : item)
            : (quick.department && !Array.isArray(quick.department) ? [quick.department] : null),
          branchId: quick.branch && Array.isArray(quick.branch) && quick.branch.length > 0
            ? quick.branch.map(item => typeof item === 'object' ? item.value : item)
            : (quick.branch && !Array.isArray(quick.branch) ? [quick.branch] : null),
          createdBy: quick.createdBy && Array.isArray(quick.createdBy) && quick.createdBy.length > 0
            ? quick.createdBy.map(item => typeof item === 'object' ? item.value : item)
            : (quick.createdBy && !Array.isArray(quick.createdBy) ? [quick.createdBy] : null),
          usageCounterMin: quick.usageCounterMin || null,
          usageCounterMax: quick.usageCounterMax || null,
          limit: 10000, // Get all data for export
          offset: 0,
        };

        // Add advanced conditions if present
        // Filter out invalid conditions (empty values, null, undefined)
        if (advanced && advanced.length > 0) {
          const validAdvancedConditions = advanced.filter(condition => {
            // Check if the condition has a valid value
            if (!condition || !condition.field) return false;
            if (condition.val === null || condition.val === undefined) return false;
            if (Array.isArray(condition.val) && condition.val.length === 0) return false;
            if (typeof condition.val === 'string' && condition.val.trim() === '') return false;
            if (Array.isArray(condition.val) && condition.val.every(v => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) return false;
            return true;
          });
          
          if (validAdvancedConditions.length > 0) {
            apiFilters.advancedConditions = validAdvancedConditions; // Send as array, service will handle serialization
            console.log('🔍 [UsageBasedAssetReport] Sending advanced conditions:', validAdvancedConditions);
          }
        }

        const response = await usageBasedAssetReportService.getUsageReportData(apiFilters);
        console.log('🔍 [UsageBasedAssetReport] API response:', response);
        
        if (response.success) {
          // Transform API data to match frontend format
          const transformedData = (response.data || []).map(item => ({
            "Usage ID": item.aug_id,
            "Asset ID": item.asset_id,
            "Asset Name": item.asset_name || '',
            "Serial Number": item.serial_number || '',
            "Asset Type": item.asset_type_name || '',
            "Department": item.department_name || '',
            "Branch": item.branch_name || '',
            "Usage Counter": item.usage_counter || 0,
            "Recorded By": item.created_by_name || '',
            "Recorded Date": item.created_on ? new Date(item.created_on).toLocaleDateString() : '',
            "Employee Name": item.employee_name || '',
            "Asset Description": item.asset_description || '',
          }));

          setApiData(prev => ({
            ...prev,
            data: transformedData,
            summary: response.summary || null,
            pagination: response.pagination || null,
            error: null
          }));
        } else {
          throw new Error(response.message || 'Failed to fetch data');
        }
      } catch (error) {
        console.error('Error fetching usage report data:', error);
        const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch usage report data';
        toast.error(errorMessage);
        setApiData(prev => ({
          ...prev,
          error: null // Don't set error state to avoid full-screen error
        }));
      } finally {
        setLoading(false);
        setInitialLoad(false);
      }
    };

    // Always fetch data (initial load or when filters change)
    fetchData();
  }, [quick.assetId, quick.dateRange, quick.assetType, quick.department, quick.branch, quick.createdBy, quick.usageCounterMin, quick.usageCounterMax, advanced]);

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), { 
      reportType: t('reports.usageBasedAssetReport.name'),
      action: t('reports.auditActions.reportGenerated'),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), { 
      reportType: t('reports.usageBasedAssetReport.name'),
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', { format: exportType.toUpperCase() }),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  // Use API data only
  const finalAllRows = apiData.data || [];
  const finalFilteredRows = apiData.data || [];

  // Create updated report with domain values (for fallback if getFilterOptions doesn't work)
  const updatedReport = useMemo(() => {
    if (!report || !apiData.filterOptions) return report;
    
    const updated = { ...report };
    if (updated.quickFields) {
      updated.quickFields = updated.quickFields.map(field => {
        const updatedField = { ...field };
        
        // Update domain based on API data
        if (field.key === 'department' && apiData.filterOptions.departments) {
          updatedField.domain = apiData.filterOptions.departments.map(dept => ({
            value: dept.dept_id,
            label: dept.department_name || dept.text || dept.dept_id || 'Unknown Department'
          }));
        } else if (field.key === 'assetId' && apiData.filterOptions.assets) {
          updatedField.domain = apiData.filterOptions.assets.map(asset => ({
            value: asset.asset_id,
            label: `${asset.asset_id} - ${asset.asset_name || asset.description || asset.text || asset.asset_id || 'Unknown Asset'}`
          }));
        } else if (field.key === 'assetType' && apiData.filterOptions.assetTypes) {
          updatedField.domain = apiData.filterOptions.assetTypes.map(at => ({
            value: at.asset_type_id,
            label: at.text || at.asset_type_id || 'Unknown Asset Type'
          }));
        } else if (field.key === 'branch' && apiData.filterOptions.branches) {
          updatedField.domain = apiData.filterOptions.branches.map(branch => ({
            value: branch.branch_id,
            label: branch.branch_name || branch.text || branch.branch_id || 'Unknown Branch'
          }));
        } else if (field.key === 'createdBy' && apiData.filterOptions.users) {
          updatedField.domain = apiData.filterOptions.users.map(user => ({
            value: user.user_id,
            label: user.user_name || user.full_name || user.user_id || 'Unknown User'
          }));
        }
        
        return updatedField;
      });
    }
    
    return updated;
  }, [report, apiData.filterOptions]);

  return (
    <ReportLayout
      report={updatedReport || report}
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
      loading={loading}
      exportService={usageBasedAssetReportService}
      onGenerateReport={handleGenerateReport}
      onExportReport={handleExportReport}
    />
  );
}

