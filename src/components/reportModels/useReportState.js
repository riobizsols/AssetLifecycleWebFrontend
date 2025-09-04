import { useState, useEffect, useMemo } from "react";
import { fakeRows, filterRows, REPORTS } from "./ReportConfig";
import { assetRegisterService } from "../../services/assetRegisterService";
import { assetLifecycleService } from "../../services/assetLifecycleService";

export function useReportState(reportId, report) {
  const [quick, setQuick] = useState({});
  const [advanced, setAdvanced] = useState([]);
  const [columns, setColumns] = useState(null);
  const [views, setViews] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [allAvailableAssets, setAllAvailableAssets] = useState([]); // Separate list for dropdown options
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterOptions, setFilterOptions] = useState(null);
  const [updatedReport, setUpdatedReport] = useState(null);
  const [forceUpdate, setForceUpdate] = useState(0);

  // Initialize quick filters with default values
  useEffect(() => {
    if (!report) return;
    
    const defaultQuick = {};
    report.quickFields.forEach(field => {
      if (field.defaultValue !== undefined) {
        defaultQuick[field.key] = field.defaultValue;
      }
    });
    
    setQuick(prev => ({ ...defaultQuick, ...prev }));
  }, [report]);

  // Fetch filter options from API for asset-register and asset-lifecycle reports
  useEffect(() => {
    if (reportId === "asset-register") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching filter options...');
          const response = await assetRegisterService.getFilterOptions();
          
          // The API returns the data directly in response.data, not response.data.data
          const filterData = response.data?.data || response.data || {};
          setFilterOptions(filterData);
          
          // Update the report configuration with real filter options
          const report = REPORTS.find(r => r.id === reportId);
          if (report && filterData) {
            console.log('✅ [useReportState] Updated filter options with real data');
            
            // Update quick fields with real data
            report.quickFields.forEach(field => {
              if (field.key === "department" && filterData.departments) {
                field.domain = filterData.departments;
              } else if (field.key === "employee" && filterData.employees) {
                field.domain = filterData.employees;
              } else if (field.key === "vendor" && filterData.vendors) {
                field.domain = filterData.vendors;
              }
            });
            
            // Update advanced fields with real data
            report.fields.forEach(field => {
              if (field.key === "category" && filterData.categories) {
                field.domain = filterData.categories;
              } else if (field.key === "location" && filterData.locations) {
                field.domain = filterData.locations;
              } else if (field.key === "currentStatus" && filterData.current_statuses) {
                field.domain = filterData.current_statuses;
              } else if (field.key === "status" && filterData.statuses) {
                field.domain = filterData.statuses;
              }
            });
          }
        } catch (err) {
          console.error('❌ [useReportState] Error fetching filter options:', err);
        }
      };

      fetchFilterOptions();
    } else if (reportId === "asset-lifecycle" || reportId === "asset-valuation") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching asset lifecycle filter options...');
          const response = await assetLifecycleService.getFilterOptions();
          console.log('🔍 [useReportState] Filter options response:', response);
          
          // The API returns the data in response.data.data
          const filterData = response.data?.data || {};
          setFilterOptions(filterData);
          
          // Update the report configuration with real filter options
          const report = REPORTS.find(r => r.id === reportId);
          if (report && filterData) {
            console.log('✅ [useReportState] Updated asset lifecycle filter options with real data');
            
            // Update quick fields with real data
            report.quickFields.forEach(field => {
              if (field.key === "assetUsageHistory" && filterData.asset_usage_history) {
                field.domain = filterData.asset_usage_history;
              } else if (field.key === "currentStatus" && filterData.current_statuses) {
                field.domain = filterData.current_statuses;
              }
            });
            
            // Update advanced fields with real data
            report.fields.forEach(field => {
              if (field.key === "category" && filterData.categories) {
                field.domain = filterData.categories;
              } else if (field.key === "location" && filterData.locations) {
                field.domain = filterData.locations;
              } else if (field.key === "department" && filterData.departments) {
                field.domain = filterData.departments;
              } else if (field.key === "vendor" && filterData.vendors) {
                field.domain = filterData.vendors;
              } else if (field.key === "scrapLocation" && filterData.scrap_locations) {
                field.domain = filterData.scrap_locations;
              } else if (field.key === "scrappedBy" && filterData.scrapped_by_users) {
                field.domain = filterData.scrapped_by_users;
              } else if (field.key === "buyer" && filterData.buyers) {
                field.domain = filterData.buyers;
              }
            });
          }
        } catch (err) {
          console.error('❌ [useReportState] Error fetching asset lifecycle filter options:', err);
        }
      };

      fetchFilterOptions();
    }
  }, [reportId]);

  // Fetch all available assets for dropdown options (only once, not affected by filters)
  useEffect(() => {
    if (reportId === "asset-register") {
      const fetchAllAssets = async () => {
        try {
          console.log('🔍 [useReportState] Fetching all assets for dropdown options...');
          const response = await assetRegisterService.getAssetRegister({
            limit: 1000,
            offset: 0
          });
          
          const allAssets = response.data?.data || response.data || [];
          setAllAvailableAssets(allAssets);
          console.log('✅ [useReportState] Loaded', allAssets.length, 'assets for dropdown options');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching all assets:', err);
          // Fallback to fake data if API fails
          setAllAvailableAssets(fakeRows(reportId, 12));
        }
      };

      fetchAllAssets();
    } else if (reportId === "asset-lifecycle" || reportId === "asset-valuation") {
      const fetchAllAssets = async () => {
        try {
          console.log('🔍 [useReportState] Fetching all asset lifecycle data for dropdown options...');
          const response = await assetLifecycleService.getAssetLifecycle({
            limit: 1000,
            offset: 0
          });
          console.log('🔍 [useReportState] All assets response:', response);
          
          const allAssets = response.data?.data || [];
          setAllAvailableAssets(allAssets);
          console.log('✅ [useReportState] Loaded', allAssets.length, 'asset lifecycle records for dropdown options');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching all asset lifecycle data:', err);
          // Don't fallback to fake data - show error instead
          setAllAvailableAssets([]);
        }
      };

      fetchAllAssets();
    } else {
      // Use fake data for other reports (not asset-lifecycle)
      setAllAvailableAssets(fakeRows(reportId, 12));
    }
  }, [reportId]);

  // Fetch filtered data from API for asset-register and asset-lifecycle reports
  useEffect(() => {
    if (reportId === "asset-register") {
      const fetchAssetRegisterData = async () => {
        setLoading(true);
        setError(null);
        try {
          // Convert quick filters to API parameters
          const apiFilters = {};
          Object.entries(quick).forEach(([key, value]) => {
            if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
              apiFilters[key] = value;
            }
          });
          
          // Add advanced conditions to API filters (only include conditions with actual values)
          if (advanced && advanced.length > 0) {
            const validAdvancedConditions = advanced.filter(condition => {
              // Check if the condition has a valid value
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
          
          console.log('🔍 [useReportState] Sending API filters:', apiFilters);
          console.log('🔍 [useReportState] Advanced conditions:', JSON.stringify(advanced, null, 2));

          const response = await assetRegisterService.getAssetRegister({
            ...apiFilters,
            limit: 1000,
            offset: 0
          });
          
          // The API returns the data directly in response.data, not response.data.data
          const assetData = response.data?.data || response.data || [];
          console.log('✅ [useReportState] Loaded', assetData.length, 'filtered assets from API');
          
          setAllRows(assetData);
          // Force re-render to update dropdowns
          setForceUpdate(prev => prev + 1);
        } catch (err) {
          console.error('❌ [useReportState] Error fetching asset register data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.message);
          // Fallback to fake data if API fails
          console.log('🔄 [useReportState] Falling back to fake data...');
          setAllRows(fakeRows(reportId, 12));
        } finally {
          setLoading(false);
        }
      };

      fetchAssetRegisterData();
    } else if (reportId === "asset-lifecycle") {
      const fetchAssetLifecycleData = async () => {
        console.log('🔍 [useReportState] Starting asset lifecycle data fetch...');
        setLoading(true);
        setError(null);
        try {
          // Convert quick filters to API parameters
          const apiFilters = {};
          Object.entries(quick).forEach(([key, value]) => {
            if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
              apiFilters[key] = value;
            }
          });
          
          // Add advanced conditions to API filters (only include conditions with actual values)
          if (advanced && advanced.length > 0) {
            const validAdvancedConditions = advanced.filter(condition => {
              // Check if the condition has a valid value
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
          
          console.log('🔍 [useReportState] Sending asset lifecycle API filters:', apiFilters);
          console.log('🔍 [useReportState] Advanced conditions:', JSON.stringify(advanced, null, 2));

          const response = await assetLifecycleService.getAssetLifecycle({
            ...apiFilters,
            limit: 1000,
            offset: 0
          });
          
          console.log('🔍 [useReportState] Main data response:', response);
          
          // The API returns the data in response.data.data
          const assetData = response.data?.data || [];
          console.log('✅ [useReportState] Loaded', assetData.length, 'filtered asset lifecycle records from API');
          
          setAllRows(assetData);
          // Force re-render to update dropdowns
          setForceUpdate(prev => prev + 1);
        } catch (err) {
          console.error('❌ [useReportState] Error fetching asset lifecycle data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.message);
          // Don't fallback to fake data - show error instead
          console.log('❌ [useReportState] API failed - showing error to user');
          setAllRows([]);
        } finally {
          setLoading(false);
        }
      };

      fetchAssetLifecycleData();
    } else if (reportId === "asset-valuation") {
      // Asset Valuation uses its own service and doesn't need data fetching here
      // as it's handled by the AssetValuation component itself
      console.log('🔍 [useReportState] Asset valuation - data handled by component');
      setAllRows([]);
      setLoading(false);
    } else {
      // Use fake data for other reports (not asset-lifecycle or asset-valuation)
      console.log('🔄 [useReportState] Using fake data for report:', reportId);
      setAllRows(fakeRows(reportId, 12));
    }
  }, [reportId, quick, advanced]);

  // Debug: Log when allRows changes
  useEffect(() => {
    if (allRows.length > 0) {
      console.log('📊 [useReportState] Data loaded:', allRows.length, 'rows');
    }
  }, [allRows]);

  // Update Asset ID and Work Order ID options dynamically
  useEffect(() => {
    if ((reportId === "asset-register" || reportId === "maintenance-history" || reportId === "asset-workflow-history" || reportId === "breakdown-history") && allAvailableAssets.length > 0) {
      const assetOptions = allAvailableAssets.map(row => ({
        value: row["Asset ID"],
        label: `${row["Asset ID"]} - ${row["Asset Name"]}`
      }));
      
      // Update the report configuration with dynamic asset IDs
      const report = REPORTS.find(r => r.id === reportId);
      if (report) {
        const assetIdField = report.quickFields.find(f => f.key === "assetId");
        if (assetIdField) {
          assetIdField.domain = assetOptions;
          console.log('✅ [useReportState] Updated Asset ID dropdown with', assetOptions.length, 'options');
        }
        
        // Update Work Order ID options for maintenance-history, asset-workflow-history, and breakdown-history
        if (reportId === "maintenance-history" || reportId === "asset-workflow-history" || reportId === "breakdown-history") {
          const workOrderOptions = allAvailableAssets.map(row => ({
            value: row["Work Order ID"],
            label: row["Work Order ID"]
          }));
          const workOrderIdField = report.quickFields.find(f => f.key === "workOrderId");
          if (workOrderIdField) {
            workOrderIdField.domain = workOrderOptions;
          }
        }
      }
    }
  }, [allAvailableAssets, reportId]);

  const filteredRows = useMemo(() => {
    // For asset-register and asset-lifecycle, we're doing server-side filtering, so return allRows
    // For other reports, use client-side filtering
    if (reportId === "asset-register" || reportId === "asset-lifecycle" || reportId === "asset-valuation") {
      return allRows;
    }
    return filterRows(allRows, reportId, quick, advanced);
  }, [allRows, reportId, quick, advanced]);

  const cols = useMemo(() => {
    return columns || report?.defaultColumns || [];
  }, [columns, report]);

  // Helper function to set individual quick filter fields
  const setQuickField = (key, value) => {
    setQuick(prev => ({ ...prev, [key]: value }));
  };

  return {
    quick,
    setQuick,
    setQuickField,
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
    filterOptions,
    forceUpdate,
    hasFilters: Object.values(quick).some(v => v && (Array.isArray(v) ? v.length > 0 : true)) || 
                (advanced && advanced.length > 0 && advanced.some(condition => {
                  if (condition.val === null || condition.val === undefined) return false;
                  if (Array.isArray(condition.val) && condition.val.length === 0) return false;
                  if (typeof condition.val === 'string' && condition.val.trim() === '') return false;
                  if (Array.isArray(condition.val) && condition.val.every(v => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) return false;
                  return true;
                })),
  };
}
