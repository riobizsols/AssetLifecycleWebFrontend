import { useState, useEffect, useMemo } from "react";
import { fakeRows, filterRows, REPORTS } from "./ReportConfig";
import { assetRegisterService } from "../../services/assetRegisterService";
import { assetLifecycleService } from "../../services/assetLifecycleService";
import { maintenanceHistoryService } from "../../services/maintenanceHistoryService";
import { breakdownHistoryService } from "../../services/breakdownHistoryService";
import assetWorkflowHistoryService from "../../services/assetWorkflowHistoryService";
import { slaReportService } from "../../services/slaReportService";
import { useAuthStore } from "../../store/useAuthStore";

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

  // Fetch filter options from API for asset-register, asset-lifecycle, and maintenance-history reports
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
    } else if (reportId === "maintenance-history") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching maintenance history filter options...');
          console.log('🔍 [useReportState] Auth token available:', !!useAuthStore.getState().token);
          const response = await maintenanceHistoryService.getFilterOptions();
          console.log('🔍 [useReportState] Maintenance history filter options response:', response);
          console.log('🔍 [useReportState] Filter options data structure:', response.data);
          
          // The API returns the data in response.data.data
          const filterData = response.data?.data || response.data || {};
          console.log('🔍 [useReportState] Filter data:', filterData);
          console.log('🔍 [useReportState] Asset options from API:', filterData.asset_options);
          setFilterOptions(filterData);
          
          // Update the report configuration with real filter options
          const reportToUpdate = REPORTS.find(r => r.id === reportId);
          if (reportToUpdate && filterData) {
            console.log('✅ [useReportState] Updated maintenance history filter options with real data');
            console.log('🔍 [useReportState] Available filter data:', {
              asset_options: filterData.asset_options?.length || 0,
              vendor_options: filterData.vendor_options?.length || 0,
              work_order_options: filterData.work_order_options?.length || 0,
              maintenance_type_options: filterData.maintenance_type_options?.length || 0,
              status_options: filterData.status_options?.length || 0
            });
            
            // Update quick fields with real data
            reportToUpdate.quickFields.forEach(field => {
              if (field.key === "vendorId" && filterData.vendor_options) {
                // Transform vendor options to the format expected by the frontend
                field.domain = filterData.vendor_options.map(vendor => ({
                  value: vendor.vendor_id,
                  label: `${vendor.vendor_id} - ${vendor.vendor_name}`
                }));
                console.log('✅ [useReportState] Updated vendor options:', field.domain.length, 'vendors');
              } else if (field.key === "assetId" && filterData.asset_options) {
                // Transform asset options to the format expected by the frontend
                console.log('🔍 [useReportState] Transforming asset options:', filterData.asset_options.length, 'assets');
                console.log('🔍 [useReportState] First few asset options:', filterData.asset_options.slice(0, 3));
                field.domain = filterData.asset_options.map(asset => ({
                  value: asset.asset_id,
                  label: `${asset.asset_id} - ${asset.description || asset.serial_number}`
                }));
                console.log('✅ [useReportState] Updated asset options:', field.domain.length, 'assets');
                console.log('🔍 [useReportState] First few transformed options:', field.domain.slice(0, 3));
              } else if (field.key === "workOrderId" && filterData.work_order_options) {
                // Transform work order options to the format expected by the frontend
                field.domain = filterData.work_order_options.map(wo => ({
                  value: wo.wo_id,
                  label: wo.wo_id
                }));
                console.log('✅ [useReportState] Updated work order options:', field.domain.length, 'work orders');
              }
            });
            
            // Update advanced fields with real data
            reportToUpdate.fields.forEach(field => {
              if (field.key === "maintenanceType" && filterData.maintenance_type_options) {
                // Transform maintenance type options
                field.domain = filterData.maintenance_type_options.map(mt => ({
                  value: mt.maint_type_id,
                  label: mt.maintenance_type_name
                }));
              } else if (field.key === "workOrderStatus" && filterData.status_options) {
                // Transform status options to show full words for user comfort
                field.domain = filterData.status_options.map(status => ({
                  value: status.status,
                  label: status.status === 'CO' ? 'Completed' : status.status === 'IN' ? 'Initiated' : status.status
                }));
              }
            });
            
            // Update the local report state to trigger re-render
            setUpdatedReport({ ...reportToUpdate });
          }
        } catch (err) {
          console.error('❌ [useReportState] Error fetching maintenance history filter options:', err);
          console.error('❌ [useReportState] Filter options error details:', err.response?.data);
          
          // For testing purposes, continue without filter options
          console.log('🔄 [useReportState] Filter options API failed - continuing without real options');
        }
      };

      fetchFilterOptions();
    } else if (reportId === "sla-report") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching SLA report filter options...');
          const response = await slaReportService.getFilterOptions();
          console.log('🔍 [useReportState] SLA report filter options response:', response);
          const filterData = response.data?.data || response.data || {};
          console.log('🔍 [useReportState] Filter data structure:', {
            hasVendors: !!filterData.vendors,
            vendorsCount: filterData.vendors?.length || 0,
            hasAssetTypes: !!filterData.assetTypes,
            assetTypesCount: filterData.assetTypes?.length || 0,
            hasAssets: !!filterData.assets,
            assetsCount: filterData.assets?.length || 0
          });
          setFilterOptions(filterData);
          
          const report = REPORTS.find(r => r.id === reportId);
          if (report && filterData) {
            console.log('✅ [useReportState] Updated SLA report filter options with real data');
            
            // Update quick fields with real data
            report.quickFields.forEach(field => {
              if (field.key === "assetType" && filterData.assetTypes) {
                const assetTypeOptions = filterData.assetTypes.map(at => {
                  // Handle multilingual/camelCase - use the cleaned text field
                  const label = (at.asset_type_name || at.text || at.asset_type_id || '').toString().trim();
                  return {
                    value: at.asset_type_id,
                    label: label || at.asset_type_id
                  };
                });
                field.domain = assetTypeOptions;
                console.log(`✅ [useReportState] Updated Asset Type dropdown with ${assetTypeOptions.length} options:`, assetTypeOptions.slice(0, 3));
              } else if (field.key === "vendor" && filterData.vendors) {
                const vendorOptions = filterData.vendors.map(v => {
                  // Handle multilingual/camelCase - prioritize vendor_name, fallback to company_name
                  const label = (v.vendor_name || v.company_name || v.vendor_id || '').toString().trim();
                  return {
                    value: v.vendor_id,
                    label: label || v.vendor_id
                  };
                });
                field.domain = vendorOptions;
                console.log(`✅ [useReportState] Updated Vendor dropdown with ${vendorOptions.length} options:`, vendorOptions.slice(0, 3));
              } else if (field.key === "slaDescription" && filterData.slaDescriptions) {
                const slaDescriptionOptions = filterData.slaDescriptions.map(sla => {
                  // Handle multilingual/camelCase - use description field
                  const label = (sla.description || sla.sla_id || '').toString().trim();
                  return {
                    value: sla.sla_id,
                    label: label || sla.sla_id
                  };
                });
                field.domain = slaDescriptionOptions;
                console.log(`✅ [useReportState] Updated SLA Description dropdown with ${slaDescriptionOptions.length} options:`, slaDescriptionOptions.slice(0, 3));
              }
            });
            
            setUpdatedReport({ ...report });
          } else {
            console.warn('⚠️ [useReportState] Report or filterData not found for sla-report');
          }
        } catch (err) {
          console.error('❌ [useReportState] Error fetching SLA report filter options:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
        }
      };
      
      fetchFilterOptions();
    } else if (reportId === "asset-workflow-history") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching asset workflow history filter options...');
          console.log('🔍 [useReportState] Auth token available:', !!useAuthStore.getState().token);
          const response = await assetWorkflowHistoryService.getFilterOptions();
          console.log('🔍 [useReportState] Asset workflow history filter options response:', response);
          console.log('🔍 [useReportState] Filter options data structure:', response.filter_options);
          
          const filterData = response.filter_options || {};
          console.log('🔍 [useReportState] Filter data:', filterData);
          
          // Update report configuration with real data
          const updatedReport = { ...report };
          
          // Update quick fields with real data
          const assetIdField = updatedReport.quickFields.find(f => f.key === "assetId");
          if (assetIdField && filterData.asset_options) {
            const assetOptions = filterData.asset_options.map(asset => ({
              value: asset.asset_id,
              label: `${asset.asset_id} - ${asset.description && asset.description !== 'NULL' ? asset.description : asset.serial_number}`
            }));
            assetIdField.domain = assetOptions;
            console.log('✅ [useReportState] Updated Asset ID dropdown with', assetOptions.length, 'options');
          }
          
          const vendorIdField = updatedReport.quickFields.find(f => f.key === "vendorId");
          if (vendorIdField && filterData.vendor_options) {
            const vendorOptions = filterData.vendor_options.map(vendor => ({
              value: vendor.vendor_id,
              label: `${vendor.vendor_id} - ${vendor.vendor_name}`
            }));
            vendorIdField.domain = vendorOptions;
            console.log('✅ [useReportState] Updated Vendor ID dropdown with', vendorOptions.length, 'options');
          }
          
          const workOrderIdField = updatedReport.quickFields.find(f => f.key === "workOrderId");
          if (workOrderIdField && filterData.work_order_options) {
            const workOrderOptions = filterData.work_order_options.map(wo => ({
              value: wo.work_order_id,
              label: wo.work_order_id
            }));
            workOrderIdField.domain = workOrderOptions;
            console.log('✅ [useReportState] Updated Work Order ID dropdown with', workOrderOptions.length, 'options');
          }
          
          // Update advanced fields with real data
          const vendorNameField = updatedReport.fields.find(f => f.key === "vendorName");
          if (vendorNameField && filterData.vendor_options) {
            const vendorNameOptions = filterData.vendor_options.map(vendor => ({
              value: vendor.vendor_name,
              label: vendor.vendor_name
            }));
            vendorNameField.domain = vendorNameOptions;
            console.log('✅ [useReportState] Updated Vendor Name dropdown with', vendorNameOptions.length, 'options');
          }
          
          const workflowStatusField = updatedReport.fields.find(f => f.key === "workflowStatus");
          if (workflowStatusField && filterData.workflow_status_options) {
            const statusMapping = {
              'CO': 'Completed',
              'IN': 'Initiated',
              'IP': 'In Progress',
              'CA': 'Cancelled',
              'OH': 'On Hold'
            };
            const workflowStatusOptions = filterData.workflow_status_options.map(status => ({
              value: status.workflow_status,
              label: statusMapping[status.workflow_status] || status.workflow_status
            }));
            workflowStatusField.domain = workflowStatusOptions;
            console.log('✅ [useReportState] Updated Workflow Status dropdown with', workflowStatusOptions.length, 'options');
          }
          
          const stepStatusField = updatedReport.fields.find(f => f.key === "stepStatus");
          if (stepStatusField && filterData.step_status_options) {
            const stepStatusMapping = {
              'AP': 'Approved',
              'IN': 'Initiated',
              'UA': 'Under Approval',
              'CO': 'Completed',
              'CA': 'Cancelled'
            };
            const stepStatusOptions = filterData.step_status_options.map(status => ({
              value: status.step_status,
              label: stepStatusMapping[status.step_status] || status.step_status
            }));
            stepStatusField.domain = stepStatusOptions;
            console.log('✅ [useReportState] Updated Step Status dropdown with', stepStatusOptions.length, 'options');
          }
          
          const maintenanceTypeField = updatedReport.fields.find(f => f.key === "maintenanceType");
          if (maintenanceTypeField && filterData.maintenance_type_options) {
            const maintenanceTypeOptions = filterData.maintenance_type_options.map(type => ({
              value: type.maintenance_type_name,
              label: type.maintenance_type_name
            }));
            maintenanceTypeField.domain = maintenanceTypeOptions;
            console.log('✅ [useReportState] Updated Maintenance Type dropdown with', maintenanceTypeOptions.length, 'options');
          }
          
          const assignedToField = updatedReport.fields.find(f => f.key === "assignedTo");
          if (assignedToField && filterData.user_options) {
            const assignedToOptions = filterData.user_options.map(user => ({
              value: user.user_id,
              label: user.full_name || user.user_id
            }));
            assignedToField.domain = assignedToOptions;
            console.log('✅ [useReportState] Updated Assigned To dropdown with', assignedToOptions.length, 'options');
          }
          
          const departmentField = updatedReport.fields.find(f => f.key === "department");
          if (departmentField && filterData.department_options) {
            const departmentOptions = filterData.department_options.map(dept => ({
              value: dept.department_name,
              label: dept.department_name
            }));
            departmentField.domain = departmentOptions;
            console.log('✅ [useReportState] Updated Department dropdown with', departmentOptions.length, 'options');
          }
          
          setUpdatedReport(updatedReport);
          console.log('✅ [useReportState] Updated asset workflow history filter options with real data');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching asset workflow history filter options:', err);
          console.log('🔄 [useReportState] Filter options API failed - continuing without real options');
        }
      };

      fetchFilterOptions();
    } else if (reportId === "breakdown-history") {
      const fetchFilterOptions = async () => {
        try {
          console.log('🔍 [useReportState] Fetching breakdown history filter options...');
          console.log('🔍 [useReportState] Auth token available:', !!useAuthStore.getState().token);
          const response = await breakdownHistoryService.getFilterOptions();
          console.log('🔍 [useReportState] Breakdown history filter options response:', response);
          console.log('🔍 [useReportState] Filter options data structure:', response.data);
          
          // The API returns the data in response.data.filter_options
          const filterData = response.data?.filter_options || response.data || {};
          console.log('🔍 [useReportState] Filter data:', filterData);
          console.log('🔍 [useReportState] Asset options from API:', filterData.asset_options);
          
          setFilterOptions(filterData);
          console.log('✅ [useReportState] Updated breakdown history filter options with real data');
          console.log('🔍 [useReportState] Available filter data:', {
            asset_options: filterData.asset_options?.length || 0,
            vendor_options: filterData.vendor_options?.length || 0,
            work_order_options: filterData.work_order_options?.length || 0,
            breakdown_reason_options: filterData.breakdown_reason_options?.length || 0,
            status_options: filterData.status_options?.length || 0
          });
          
          // Update the report configuration with real data
          const reportToUpdate = { ...report };
          
          // Update quick fields with real data
          reportToUpdate.quickFields.forEach(field => {
            if (field.key === "vendorId" && filterData.vendor_options) {
              // Transform vendor options to the format expected by the frontend
              field.domain = filterData.vendor_options.map(vendor => ({
                value: vendor.vendor_id,
                label: `${vendor.vendor_id} - ${vendor.vendor_name}`
              }));
              console.log('✅ [useReportState] Updated vendor options:', field.domain.length, 'vendors');
            } else if (field.key === "assetId" && filterData.asset_options) {
              // Transform asset options to the format expected by the frontend
              console.log('🔍 [useReportState] Transforming asset options:', filterData.asset_options.length, 'assets');
              console.log('🔍 [useReportState] First few asset options:', filterData.asset_options.slice(0, 3));
              field.domain = filterData.asset_options.map(asset => ({
                value: asset.asset_id,
                label: `${asset.asset_id} - ${asset.asset_description && asset.asset_description !== 'NULL' ? asset.asset_description : asset.serial_number}`
              }));
              console.log('✅ [useReportState] Updated asset options:', field.domain.length, 'assets');
              console.log('🔍 [useReportState] First few transformed options:', field.domain.slice(0, 3));
            } else if (field.key === "workOrderId" && filterData.work_order_options) {
              // Transform work order options to the format expected by the frontend
              field.domain = filterData.work_order_options.map(wo => ({
                value: wo.work_order_id,
                label: wo.work_order_id
              }));
              console.log('✅ [useReportState] Updated work order options:', field.domain.length, 'work orders');
            } else if (field.key === "reportedBy" && filterData.reported_by_options) {
              // Transform reported by options to the format expected by the frontend
              field.domain = filterData.reported_by_options.map(user => ({
                value: user.user_id,
                label: user.full_name || user.user_name
              }));
              console.log('✅ [useReportState] Updated reported by options:', field.domain.length, 'users');
            }
          });
          
          // Update advanced fields with real data
          reportToUpdate.fields.forEach(field => {
            if (field.key === "breakdownReason" && filterData.breakdown_reason_options) {
              // Transform breakdown reason options
              field.domain = filterData.breakdown_reason_options.map(reason => ({
                value: reason.atbrrc_id,
                label: reason.breakdown_reason
              }));
            } else if (field.key === "breakdownStatus" && filterData.breakdown_status_options) {
              // Transform breakdown status options
              field.domain = filterData.breakdown_status_options.map(status => ({
                value: status.breakdown_status,
                label: status.breakdown_status
              }));
            } else if (field.key === "workOrderStatus" && filterData.status_options) {
              // Transform status options to show full words for user comfort
              field.domain = filterData.status_options.map(status => ({
                value: status.status,
                label: status.status === 'OP' ? 'Open' : 
                       status.status === 'IP' ? 'In Progress' : 
                       status.status === 'CO' ? 'Completed' : 
                       status.status === 'CA' ? 'Cancelled' : 
                       status.status === 'OH' ? 'On Hold' : status.status
              }));
            }
          });
          
          setUpdatedReport({ ...reportToUpdate });
        } catch (err) {
          console.error('❌ [useReportState] Error fetching breakdown history filter options:', err);
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
    } else if (reportId === "breakdown-history") {
      const fetchAllBreakdownData = async () => {
        try {
          console.log('🔍 [useReportState] Fetching all breakdown data for dropdown options...');
          const response = await breakdownHistoryService.getBreakdownHistory({
            limit: 1000,
            offset: 0
          });
          
          const allBreakdownData = response.data?.data || response.data || [];
          setAllAvailableAssets(allBreakdownData);
          console.log('✅ [useReportState] Loaded', allBreakdownData.length, 'breakdown records for dropdown options');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching all breakdown data:', err);
          // No fallback to fake data for breakdown history - use real API data only
          setAllAvailableAssets([]);
        }
      };

      fetchAllBreakdownData();
    } else if (reportId === "asset-workflow-history") {
      const fetchAllWorkflowData = async () => {
        try {
          console.log('🔍 [useReportState] Fetching all asset workflow data for dropdown options...');
          const response = await assetWorkflowHistoryService.getAssetWorkflowHistory({
            limit: 1000,
            offset: 0,
            orgId: useAuthStore.getState().user?.org_id
          });
          
          console.log('🔍 [useReportState] All workflow data response:', response);
          const allWorkflowData = response.data || [];
          setAllAvailableAssets(allWorkflowData);
          console.log('✅ [useReportState] Loaded', allWorkflowData.length, 'workflow records for dropdown options');
          console.log('🔍 [useReportState] First few workflow records:', allWorkflowData.slice(0, 2));
        } catch (err) {
          console.error('❌ [useReportState] Error fetching all workflow data:', err);
          // No fallback to fake data for asset workflow history - use real API data only
          setAllAvailableAssets([]);
        }
      };

      fetchAllWorkflowData();
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
    } else if (reportId === "maintenance-history") {
      const fetchAllMaintenanceHistory = async () => {
        try {
          console.log('🔍 [useReportState] Fetching all maintenance history for dropdown options...');
          const response = await maintenanceHistoryService.getMaintenanceHistory({
            limit: 1000,
            offset: 0
          });
          console.log('🔍 [useReportState] All maintenance history response:', response);
          
          const allMaintenanceHistory = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          setAllAvailableAssets(allMaintenanceHistory);
          console.log('✅ [useReportState] Loaded', allMaintenanceHistory.length, 'maintenance history records for dropdown options');
          console.log('🔍 [useReportState] All maintenance history data:', allMaintenanceHistory);
        } catch (err) {
          console.error('❌ [useReportState] Error fetching all maintenance history data:', err);
          // Don't fallback to fake data - show error instead
          setAllAvailableAssets([]);
        }
      };

      fetchAllMaintenanceHistory();
    } else {
      // Use fake data for other reports (not asset-lifecycle)
      setAllAvailableAssets(fakeRows(reportId, 12));
    }
  }, [reportId]);

  // Fetch filtered data from API for asset-register, asset-lifecycle, maintenance-history, breakdown-history, and asset-workflow-history reports
  useEffect(() => {
    console.log('🔍 [useReportState] useEffect triggered for data fetching:', { reportId, quick, advanced });
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
          
          // Extract property columns dynamically and add to available columns
          if (assetData.length > 0) {
            const propertyColumns = new Set();
            assetData.forEach(row => {
              Object.keys(row).forEach(key => {
                if (key.startsWith('Property: ')) {
                  propertyColumns.add(key);
                }
              });
            });
            
            // Update report's allColumns with property columns
            if (propertyColumns.size > 0) {
              const report = REPORTS.find(r => r.id === reportId);
              if (report) {
                const existingColumns = report.allColumns || ALL_COLUMNS[reportId] || [];
                const newColumns = [...existingColumns, ...Array.from(propertyColumns)];
                // Remove duplicates
                report.allColumns = [...new Set(newColumns)];
                console.log('✅ [useReportState] Added property columns:', Array.from(propertyColumns));
              }
            }
          }
          
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
    } else if (reportId === "maintenance-history") {
      const fetchMaintenanceHistoryData = async () => {
        console.log('🔍 [useReportState] Starting maintenance history data fetch...');
        console.log('🔍 [useReportState] Auth token available for data fetch:', !!useAuthStore.getState().token);
        setLoading(true);
        setError(null);
        try {
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
          
          console.log('🔍 [useReportState] Sending maintenance history API filters:', apiFilters);
          console.log('🔍 [useReportState] Advanced conditions:', JSON.stringify(advanced, null, 2));

          const response = await maintenanceHistoryService.getMaintenanceHistory({
            ...apiFilters,
            limit: 1000,
            offset: 0
          });
          
          console.log('🔍 [useReportState] Maintenance history response:', response);
          console.log('🔍 [useReportState] Response data structure:', response.data);
          console.log('🔍 [useReportState] Response.data.data:', response.data?.data);
          console.log('🔍 [useReportState] Response.data type:', typeof response.data);
          console.log('🔍 [useReportState] Response.data keys:', Object.keys(response.data || {}));
          console.log('🔍 [useReportState] Is response.data.data an array?', Array.isArray(response.data?.data));
          console.log('🔍 [useReportState] Response.data.data length:', response.data?.data?.length);
          
          // Handle both cases: response.data could be the full object or just the data array
          const maintenanceData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          console.log('✅ [useReportState] Loaded', maintenanceData.length, 'filtered maintenance history records from API');
          console.log('🔍 [useReportState] First record sample:', maintenanceData[0]);
          console.log('🔍 [useReportState] Raw response data:', response.data);
          
          // Transform API data to match frontend column names
          const transformedData = maintenanceData.map(record => ({
            "Work Order ID": record.wo_id,
            "Asset ID": record.asset_id,
            "Asset Name": record.asset_description,
            "Maintenance Start Date": record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : 'N/A',
            "Maintenance End Date": record.act_main_end_date ? new Date(record.act_main_end_date).toLocaleDateString() : 'N/A',
            "Notes": record.notes || 'N/A',
            "Vendor ID": record.vendor_id,
            "Vendor Name": record.vendor_name,
            "Work Order Status": record.status === 'CO' ? 'Completed' : record.status === 'IN' ? 'Initiated' : record.status,
            "Maintenance Type": record.maintenance_type_name,
            "Cost (₹)": record.po_number ? `₹${record.po_number}` : 'N/A',
            "Downtime (h)": record.technician_name ? '8' : 'N/A' // Placeholder - not in API response
          }));
          
          setAllRows(transformedData);
          // Force re-render to update dropdowns
          setForceUpdate(prev => prev + 1);
        } catch (err) {
          console.error('❌ [useReportState] Error fetching maintenance history data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.message);
          
          // Don't fallback to fake data - show error instead
          console.log('❌ [useReportState] API failed - showing error to user');
          setAllRows([]);
        } finally {
          setLoading(false);
        }
      };

      fetchMaintenanceHistoryData();
    } else if (reportId === "breakdown-history") {
      const fetchBreakdownHistoryData = async () => {
        console.log('🔍 [useReportState] Starting breakdown history data fetch...');
        console.log('🔍 [useReportState] Auth token available for data fetch:', !!useAuthStore.getState().token);
        setLoading(true);
        setError(null);
        try {
          // Convert quick filters to API parameters
          const apiFilters = {};
          Object.entries(quick).forEach(([key, value]) => {
            if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
              if (key === 'breakdownDateRange' && Array.isArray(value) && value.length === 2) {
                apiFilters.breakdown_date_from = value[0];
                apiFilters.breakdown_date_to = value[1];
              } else if (key === 'assetId' && typeof value === 'string') {
                apiFilters.asset_id = value;
              } else if (key === 'reportedBy' && typeof value === 'string') {
                apiFilters.reported_by = value;
              } else if (key === 'vendorId' && typeof value === 'string') {
                apiFilters.vendor_id = value;
              } else if (key === 'workOrderId' && typeof value === 'string') {
                apiFilters.work_order_id = value;
              } else {
                apiFilters[key] = value;
              }
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
          
          console.log('🔍 [useReportState] Sending breakdown history API filters:', apiFilters);
          console.log('🔍 [useReportState] Advanced conditions:', JSON.stringify(advanced, null, 2));

          const response = await breakdownHistoryService.getBreakdownHistory({
            ...apiFilters,
            limit: 1000,
            offset: 0
          });
          
          console.log('🔍 [useReportState] Breakdown history response:', response);
          console.log('🔍 [useReportState] Response data structure:', response.data);
          console.log('🔍 [useReportState] Response.data.data:', response.data?.data);
          console.log('🔍 [useReportState] Response.data type:', typeof response.data);
          console.log('🔍 [useReportState] Response.data keys:', Object.keys(response.data || {}));
          console.log('🔍 [useReportState] Is response.data.data an array?', Array.isArray(response.data?.data));
          console.log('🔍 [useReportState] Response.data.data length:', response.data?.data?.length);
          
          // Handle both response.data as array and response.data.data cases
          const breakdownData = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          console.log('✅ [useReportState] Loaded', breakdownData.length, 'filtered breakdown history records from API');
          console.log('🔍 [useReportState] First record sample:', breakdownData[0]);
          console.log('🔍 [useReportState] Raw response data:', breakdownData);
          
          // Transform the data to match the frontend column names
          const transformedData = breakdownData.map(record => ({
            "Breakdown ID": record.breakdown_id || 'N/A',
            "Asset ID": record.asset_id,
            "Asset Name": record.asset_description && record.asset_description !== 'NULL' ? record.asset_description : record.serial_number || 'N/A',
            "Breakdown Date": record.breakdown_date ? new Date(record.breakdown_date).toLocaleDateString() : 'N/A',
            "Description": record.breakdown_description || 'N/A',
            "Reported By": record.reported_by_name || 'N/A',
            "Vendor ID": record.vendor_id || 'N/A',
            "Vendor Name": record.vendor_name || 'N/A',
            "Work Order Status": record.maintenance_status === 'CO' ? 'Completed' : record.maintenance_status === 'IN' ? 'Initiated' : record.maintenance_status || 'N/A',
            "Breakdown Status": record.breakdown_status === 'CR' ? 'Created' : record.breakdown_status || 'N/A',
            "Breakdown Reason": record.breakdown_reason || 'N/A',
            "Asset Type": record.asset_type_name || 'N/A',
            "Department": record.department_name || 'N/A',
            "Branch": record.branch_name || 'N/A',
            "Serial Number": record.serial_number || 'N/A',
            "Asset Status": record.asset_status || 'N/A',
            "Purchased On": record.purchased_on ? new Date(record.purchased_on).toLocaleDateString() : 'N/A',
            "Purchased Cost": record.purchased_cost ? `₹${record.purchased_cost}` : 'N/A',
            "Vendor Contact": record.vendor_contact_person || 'N/A',
            "Vendor Email": record.vendor_email || 'N/A',
            "Vendor Phone": record.vendor_phone || 'N/A',
            "Vendor Address": record.vendor_address || 'N/A',
            "Reported By Email": record.reported_by_email || 'N/A',
            "Reported By Phone": record.reported_by_phone || 'N/A'
          }));
          
          setAllRows(transformedData);
          console.log('✅ [useReportState] Set breakdown history data:', transformedData.length, 'records');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching breakdown history data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.response?.data?.message || 'Failed to fetch breakdown history data');
          setAllRows([]);
          console.log('❌ [useReportState] API failed - no fallback to fake data for breakdown history');
        } finally {
          setLoading(false);
        }
      };

      fetchBreakdownHistoryData();
    } else if (reportId === "asset-workflow-history") {
      const fetchAssetWorkflowHistoryData = async () => {
        console.log('🔍 [useReportState] Starting asset workflow history data fetch...');
        console.log('🔍 [useReportState] Auth token available for data fetch:', !!useAuthStore.getState().token);
        setLoading(true);
        setError(null);
        
        try {
          // Convert quick filters to API parameters
          const apiFilters = {};
          
          // Handle date range filters
          if (quick.plannedScheduleDateRange?.from) {
            apiFilters.maintenance_start_date_from = quick.plannedScheduleDateRange.from;
          }
          if (quick.plannedScheduleDateRange?.to) {
            apiFilters.maintenance_start_date_to = quick.plannedScheduleDateRange.to;
          }
          if (quick.actualScheduleDateRange?.from) {
            apiFilters.maintenance_end_date_from = quick.actualScheduleDateRange.from;
          }
          if (quick.actualScheduleDateRange?.to) {
            apiFilters.maintenance_end_date_to = quick.actualScheduleDateRange.to;
          }
          
          // Handle other quick filters
          if (quick.assetId) apiFilters.asset_id = quick.assetId;
          if (quick.vendorId) apiFilters.vendor_id = quick.vendorId;
          if (quick.workOrderId) apiFilters.work_order_id = quick.workOrderId;
          
          // Add pagination
          apiFilters.limit = 1000;
          apiFilters.offset = 0;
          apiFilters.orgId = useAuthStore.getState().user?.org_id;
          
          // Add advanced conditions
          if (advanced && advanced.length > 0) {
            apiFilters.advancedConditions = advanced;
          }
          
          console.log('🔍 [useReportState] Sending asset workflow history API filters:', apiFilters);
          console.log('🔍 [useReportState] Quick filters:', quick);
          console.log('🔍 [useReportState] Advanced conditions:', advanced);
          console.log('🔍 [useReportState] Work Order ID filter value:', quick.workOrderId);
          console.log('🔍 [useReportState] API work_order_id value:', apiFilters.work_order_id);
          
          const response = await assetWorkflowHistoryService.getAssetWorkflowHistory(apiFilters);
          console.log('🔍 [useReportState] Asset workflow history response:', response);
          console.log('🔍 [useReportState] Response data structure:', response.data);
          
          const workflowData = response.data || [];
          console.log('🔍 [useReportState] Raw response data:', workflowData);
          console.log('🔍 [useReportState] Number of records returned from API:', workflowData.length);
          
          // Debug: Log sample data to see what's being processed
          if (workflowData.length > 0) {
            console.log('🔍 [useReportState] Sample workflow record for debugging:', {
              purchased_cost: workflowData[0].purchased_cost,
              asset_status: workflowData[0].asset_status,
              asset_type_name: workflowData[0].asset_type_name
            });
          }
          
          // Transform API data to frontend column format
          const transformedData = workflowData.map(record => ({
            "Work Order ID": record.workflow_id || 'N/A',
            "Asset ID": record.asset_id || 'N/A',
            "Asset Name": record.asset_description && record.asset_description !== 'NULL' ? record.asset_description : record.serial_number || 'N/A',
            "Workflow Step": `Step ${record.sequence || 'N/A'}`,
            "Planned Schedule Date": record.planned_schedule_date ? new Date(record.planned_schedule_date).toLocaleDateString() : 'N/A',
            "Actual Schedule Date": record.actual_schedule_date ? new Date(record.actual_schedule_date).toLocaleDateString() : 'N/A',
            "Notes": record.step_notes || 'N/A',
            "Vendor ID": record.vendor_id || 'N/A',
            "Vendor Name": record.vendor_name || 'N/A',
            "Workflow Status": record.workflow_status === 'CO' ? 'Completed' : 
                             record.workflow_status === 'IN' ? 'Initiated' : 
                             record.workflow_status === 'IP' ? 'In Progress' : 
                             record.workflow_status === 'CA' ? 'Cancelled' : 
                             record.workflow_status === 'OH' ? 'On Hold' : record.workflow_status || 'N/A',
            "Step Status": record.step_status === 'AP' ? 'Approved' : 
                          record.step_status === 'IN' ? 'Initiated' : 
                          record.step_status === 'UA' ? 'Under Approval' : 
                          record.step_status === 'CO' ? 'Completed' : 
                          record.step_status === 'CA' ? 'Cancelled' : record.step_status || 'N/A',
            "Assigned To": record.user_id || 'N/A',
            "Maintenance Type": record.maintenance_type_name || 'N/A',
            "Asset Type": record.asset_type_name || 'N/A',
            "Department": record.department_name || 'N/A',
            "Serial Number": record.serial_number || 'N/A',
            "Asset Status": record.asset_status || 'N/A',
            "Purchased On": record.purchased_on ? new Date(record.purchased_on).toLocaleDateString() : 'N/A',
            "Purchased Cost": record.purchased_cost ? `₹${record.purchased_cost}` : 'N/A',
            "Vendor Contact": record.vendor_contact_person || 'N/A',
            "Vendor Email": record.vendor_email || 'N/A',
            "Vendor Phone": record.vendor_phone || 'N/A',
            "Vendor Address": record.vendor_address || 'N/A',
            "User Name": record.user_name || 'N/A',
            "User Email": record.user_email || 'N/A',
            "Job Role": record.job_role_name || 'N/A',
            "Sequence": record.sequence || 'N/A',
            "History Count": record.history_count || '0',
            "Latest Action": record.latest_action || 'N/A',
            "Latest Action Date": record.latest_action_date ? new Date(record.latest_action_date).toLocaleDateString() : 'N/A',
            "Latest Action By": record.latest_action_by || 'N/A',
            // Additional fields for workflow history details
            "History ID": record.history_id || 'N/A',
            "Action By": record.action_by_name || record.action_by || 'N/A',
            "Action On": record.action_on ? new Date(record.action_on).toLocaleDateString() : 'N/A',
            "Action": record.action === 'AP' ? 'Approved' : 
                     record.action === 'UA' ? 'Under Approval' : 
                     record.action === 'UR' ? 'Under Review' : 
                     record.action === 'CO' ? 'Completed' : 
                     record.action === 'CA' ? 'Cancelled' : record.action || 'N/A',
            "History Notes": record.history_notes || 'N/A',
            "Action By Email": record.action_by_email || 'N/A',
            "Step User": record.step_user_name || record.step_user_id || 'N/A',
            "Step User Email": record.step_user_email || 'N/A'
          }));
          
          setAllRows(transformedData);
          // Also set allAvailableAssets for dropdown population
          setAllAvailableAssets(workflowData);
          console.log('🔍 [useReportState] Set allRows with', transformedData.length, 'transformed records');
          console.log('🔍 [useReportState] Set allAvailableAssets with', workflowData.length, 'raw records');
          console.log('🔍 [useReportState] Sample workflowData for dropdowns:', {
            asset_status: workflowData.map(row => row.asset_status),
            asset_type_name: workflowData.map(row => row.asset_type_name),
            purchased_cost: workflowData.map(row => row.purchased_cost)
          });
        } catch (err) {
          console.error('❌ [useReportState] Error fetching asset workflow history data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.response?.data?.message || 'Failed to fetch asset workflow history data');
          setAllRows([]);
          console.log('❌ [useReportState] API failed - no fallback to fake data for asset workflow history');
        } finally {
          setLoading(false);
        }
      };

      fetchAssetWorkflowHistoryData();
    } else if (reportId === "sla-report") {
      const fetchSLAReportData = async () => {
        console.log('🔍 [useReportState] Starting SLA report data fetch...');
        setLoading(true);
        setError(null);
        try {
          // Convert quick filters to API parameters
          const apiFilters = {};
          Object.entries(quick).forEach(([key, value]) => {
            if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
              // Extract values from arrays (handle both objects and primitives)
              let processedValue = value;
              if (Array.isArray(value)) {
                processedValue = value.map(v => typeof v === 'object' && v !== null ? v.value : v);
              }
              
              if (key === 'assetType') {
                apiFilters.asset_type_id = processedValue;
              } else if (key === 'vendor') {
                apiFilters.vendor_id = processedValue;
              } else if (key === 'slaDescription') {
                apiFilters.sla_description = processedValue;
              } else if (key === 'dateRange' && Array.isArray(value) && value.length === 2) {
                apiFilters.dateRange = value;
              } else {
                apiFilters[key] = processedValue;
              }
            }
          });
          
          console.log('🔍 [useReportState] Sending SLA report API filters:', apiFilters);
          
          const response = await slaReportService.getSLAReport({
            ...apiFilters,
            limit: 1000,
            offset: 0
          });
          
          const slaData = response.data?.data || [];
          console.log('✅ [useReportState] Loaded', slaData.length, 'SLA report records from API');
          
          // Transform data to create rows for each vendor-SLA combination
          // Since query now returns one row per vendor with aggregated asset types
          const transformedData = [];
          
          slaData.forEach(item => {
            // Extract asset type info (now comes as comma-separated string)
            const assetTypeNames = item.asset_type_names || '';
            const assetTypeIds = item.asset_type_ids || '';
            
            // Collect all SLA values for this vendor
            const slas = [];
            for (let i = 1; i <= 10; i++) {
              const slaValue = item[`sla_${i}_value`];
              const slaDescription = item[`sla_${i}_description`];
              const slaId = item[`sla_${i}_id`];
              
              if (slaValue && slaValue.trim() !== '') {
                slas.push({
                  sla_id: slaId,
                  sla_description: slaDescription,
                  sla_value: slaValue
                });
              }
            }
            
            // Create a row for each SLA that has a value
            if (slas.length > 0) {
              slas.forEach(sla => {
                transformedData.push({
                  "Vendor ID": item.vendor_id,
                  "Vendor Name": item.vendor_name,
                  "Company Name": item.company_name,
                  "Company Email": item.company_email || '-',
                  "Contact Person": item.contact_person_name || '-',
                  "Contact Number": item.contact_person_number || '-',
                  "Contract Start": item.contract_start_date ? new Date(item.contract_start_date).toLocaleDateString() : '-',
                  "Contract End": item.contract_end_date ? new Date(item.contract_end_date).toLocaleDateString() : '-',
                  "Asset Type ID": assetTypeIds || '-',
                  "Asset Type": assetTypeNames || '-',
                  "SLA ID": sla.sla_id || '-',
                  "SLA Description": sla.sla_description || '-',
                  "SLA Value (hrs)": sla.sla_value || '-',
                  "Created On": item.created_on ? new Date(item.created_on).toISOString() : null,
                  "Changed On": item.changed_on ? new Date(item.changed_on).toISOString() : null
                });
              });
            } else {
              // If no SLA values, still show the vendor row
              transformedData.push({
                "Vendor ID": item.vendor_id,
                "Vendor Name": item.vendor_name,
                "Company Name": item.company_name,
                "Company Email": item.company_email || '-',
                "Contact Person": item.contact_person_name || '-',
                "Contact Number": item.contact_person_number || '-',
                "Contract Start": item.contract_start_date ? new Date(item.contract_start_date).toLocaleDateString() : '-',
                "Contract End": item.contract_end_date ? new Date(item.contract_end_date).toLocaleDateString() : '-',
                "Asset Type ID": assetTypeIds || '-',
                "Asset Type": assetTypeNames || '-',
                "SLA ID": '-',
                "SLA Description": '-',
                "SLA Value (hrs)": '-',
                "Created On": item.created_on ? new Date(item.created_on).toISOString() : null,
                "Changed On": item.changed_on ? new Date(item.changed_on).toISOString() : null
              });
            }
          });
          
          setAllRows(transformedData);
          console.log('✅ [useReportState] Set SLA report data:', transformedData.length, 'transformed records');
        } catch (err) {
          console.error('❌ [useReportState] Error fetching SLA report data:', err);
          console.error('❌ [useReportState] Error details:', err.response?.data);
          setError(err.response?.data?.message || 'Failed to fetch SLA report data');
          setAllRows([]);
        } finally {
          setLoading(false);
        }
      };
      
      fetchSLAReportData();
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


  // Update Asset ID and Work Order ID options dynamically
  useEffect(() => {
    if ((reportId === "asset-register" || reportId === "maintenance-history" || reportId === "asset-workflow-history" || reportId === "breakdown-history") && allAvailableAssets.length > 0) {
      let assetOptions, workOrderOptions, reportedByOptions, vendorOptions;
      
      if (reportId === "breakdown-history") {
        // Handle breakdown history data structure
        assetOptions = allAvailableAssets.map(row => ({
          value: row.asset_id,
          label: `${row.asset_id} - ${row.asset_description && row.asset_description !== 'NULL' ? row.asset_description : row.serial_number}`
        }));
        
        workOrderOptions = allAvailableAssets
          .filter(row => row.work_order_id)
          .map(row => ({
            value: row.work_order_id,
            label: row.work_order_id
          }));
          
        reportedByOptions = allAvailableAssets
          .filter(row => row.reported_by_name)
          .map(row => ({
            value: row.reported_by,
            label: row.reported_by_name
          }));
          
        vendorOptions = allAvailableAssets
          .filter(row => row.vendor_id && row.vendor_name)
          .map(row => ({
            value: row.vendor_id,
            label: `${row.vendor_id} - ${row.vendor_name}`
          }));
      } else if (reportId === "asset-workflow-history") {
        // Handle asset workflow history data structure
        // Debug: Check Work Order ID issue only
        console.log('🔍 [useReportState] First allAvailableAssets record:', allAvailableAssets[0]);
        console.log('🔍 [useReportState] All workflow_id values in allAvailableAssets:', allAvailableAssets.map(row => row.workflow_id));
        
        assetOptions = allAvailableAssets.map(row => ({
          value: row.asset_id,
          label: `${row.asset_id} - ${row.asset_description && row.asset_description !== 'NULL' ? row.asset_description : row.serial_number}`
        }));
        
        // Get unique workflow IDs properly - check multiple possible field names
        const workflowIds = allAvailableAssets.map(row => {
          // Try different possible field names
          return row.workflow_id || row.work_order_id || row.workflowId || row.workOrderId;
        }).filter(Boolean);
        
        const uniqueWorkflowIds = [...new Set(workflowIds)];
        
        workOrderOptions = uniqueWorkflowIds.map(wo => ({
          value: wo,
          label: wo
        }));
        
        // Debug: Work Order ID issue only
        console.log('🔍 [useReportState] Work Order IDs from data:', workflowIds);
        console.log('🔍 [useReportState] Unique Work Order IDs:', uniqueWorkflowIds);
        console.log('🔍 [useReportState] Work Order Options count:', workOrderOptions.length);
        console.log('🔍 [useReportState] First work order option:', workOrderOptions[0]);
        
        vendorOptions = allAvailableAssets.length > 0 
          ? [...new Set(allAvailableAssets.map(row => row.vendor_id).filter(Boolean))].map(vendor => ({
              value: vendor,
              label: `${vendor} - ${allAvailableAssets.find(row => row.vendor_id === vendor)?.vendor_name || vendor}`
            }))
          : [];
      } else {
        // Handle other reports data structure
        // Use description for asset name (not "Asset Name" which is actually asset type name from a.text)
        // The backend query returns a.description without alias, so it should be accessible as row.description
        // Debug logging for first row to understand data structure
        if (allAvailableAssets.length > 0) {
          const sampleRow = allAvailableAssets[0];
          console.log('🔍 [useReportState] Sample asset row keys:', Object.keys(sampleRow));
          console.log('🔍 [useReportState] Sample row data:', {
            assetId: sampleRow["Asset ID"] || sampleRow.asset_id,
            description: sampleRow.description,
            "description": sampleRow["description"],
            Description: sampleRow.Description,
            "Description": sampleRow["Description"],
            asset_description: sampleRow.asset_description,
            "Asset Name": sampleRow["Asset Name"],
            Category: sampleRow["Category"] || sampleRow.Category
          });
        }
        
        assetOptions = allAvailableAssets.map((row, index) => {
          const assetId = row["Asset ID"] || row.asset_id;
          // Priority: description (lowercase, from a.description) > asset_description > other variations
          // Note: "Asset Name" is actually asset type name (from a.text), so don't use it
          // The backend now returns a.description as "description" (lowercase quoted)
          const assetName = row.description || row["description"] || row.asset_description;
          
          // Only log for first asset to debug
          if (index === 0) {
            console.log('🔍 [useReportState] First asset row sample:', {
              assetId,
              'description': row.description,
              '"description"': row["description"],
              'asset_description': row.asset_description,
              '"Asset Name" (wrong - asset type)': row["Asset Name"],
              'All keys': Object.keys(row)
            });
          }
          
          return {
            value: assetId,
            label: assetName ? `${assetId} - ${assetName}` : assetId
          };
        });
        
        workOrderOptions = allAvailableAssets.map(row => ({
          value: row["Work Order ID"] || row.wo_id,
          label: row["Work Order ID"] || row.wo_id
        }));
      }
      
      // Update the report configuration with dynamic options
      const report = REPORTS.find(r => r.id === reportId);
      if (report) {
        const assetIdField = report.quickFields.find(f => f.key === "assetId");
        if (assetIdField && reportId !== "maintenance-history") {
          // Only update for non-maintenance-history reports since maintenance-history gets its options from filter options
          assetIdField.domain = assetOptions;
          console.log('✅ [useReportState] Updated Asset ID dropdown with', assetOptions.length, 'options');
        }
        
        // Update Work Order ID options for asset-workflow-history and breakdown-history (not maintenance-history)
        if ((reportId === "asset-workflow-history" || reportId === "breakdown-history")) {
          const workOrderIdField = report.quickFields.find(f => f.key === "workOrderId");
          if (workOrderIdField) {
            workOrderIdField.domain = workOrderOptions;
            console.log('✅ [useReportState] Updated Work Order ID dropdown with', workOrderOptions.length, 'options');
          }
        }
        
          // Update breakdown history specific dropdowns
        if (reportId === "breakdown-history") {
          const reportedByField = report.quickFields.find(f => f.key === "reportedBy");
          if (reportedByField) {
            reportedByField.domain = reportedByOptions;
            console.log('✅ [useReportState] Updated Reported By dropdown with', reportedByOptions.length, 'options');
          }
          
          const vendorIdField = report.quickFields.find(f => f.key === "vendorId");
          if (vendorIdField) {
            vendorIdField.domain = vendorOptions;
            console.log('✅ [useReportState] Updated Vendor ID dropdown with', vendorOptions.length, 'options');
          }
          
          // Update advanced condition dropdowns
          const vendorNameField = report.fields.find(f => f.key === "vendorName");
          if (vendorNameField) {
            vendorNameField.domain = vendorOptions;
            console.log('✅ [useReportState] Updated Vendor Name dropdown with', vendorOptions.length, 'options');
          }
          
          const workOrderStatusField = report.fields.find(f => f.key === "workOrderStatus");
          if (workOrderStatusField) {
            // Get actual work order statuses from the data
            const workOrderStatuses = [...new Set(allAvailableAssets.map(row => row.maintenance_status).filter(Boolean))];
            
            // Map status codes to labels
            const statusMapping = {
              'CO': 'Completed',
              'IN': 'Initiated', 
              'OP': 'Open',
              'IP': 'In Progress',
              'CA': 'Cancelled',
              'OH': 'On Hold'
            };
            
            // Create options from actual data
            const statusOptions = workOrderStatuses.map(status => ({
              value: status,
              label: statusMapping[status] || status
            }));
            
            // Add "No Work Order" option if there are records with null status
            const hasNullStatus = allAvailableAssets.some(row => row.maintenance_status === null);
            if (hasNullStatus) {
              statusOptions.push({ value: 'NULL', label: 'No Work Order' });
            }
            
            workOrderStatusField.domain = statusOptions;
            console.log('✅ [useReportState] Updated Work Order Status dropdown with', statusOptions.length, 'options from actual data');
            console.log('🔍 [useReportState] Available work order statuses:', workOrderStatuses);
          }
          
          const breakdownReasonField = report.fields.find(f => f.key === "breakdownReason");
          if (breakdownReasonField) {
            const breakdownReasons = [...new Set(allAvailableAssets.map(row => row.breakdown_reason).filter(Boolean))];
            breakdownReasonField.domain = breakdownReasons.map(reason => ({ value: reason, label: reason }));
            console.log('✅ [useReportState] Updated Breakdown Reason dropdown with', breakdownReasons.length, 'options');
          }
          
          const breakdownStatusField = report.fields.find(f => f.key === "breakdownStatus");
          if (breakdownStatusField) {
            const breakdownStatuses = [...new Set(allAvailableAssets.map(row => row.breakdown_status).filter(Boolean))];
            
            // Map status codes to user-friendly labels
            const statusMapping = {
              'CR': 'Created',
              'IN': 'In Progress',
              'CO': 'Completed',
              'CA': 'Cancelled'
            };
            
            breakdownStatusField.domain = breakdownStatuses.map(status => ({ 
              value: status, 
              label: statusMapping[status] || status 
            }));
            console.log('✅ [useReportState] Updated Breakdown Status dropdown with', breakdownStatuses.length, 'options from actual data');
            console.log('🔍 [useReportState] Available breakdown statuses:', breakdownStatuses);
          }
          
          const assetTypeField = report.fields.find(f => f.key === "assetType");
          if (assetTypeField) {
            const assetTypes = [...new Set(allAvailableAssets.map(row => row.asset_type_name).filter(Boolean))];
            assetTypeField.domain = assetTypes.map(type => ({ value: type, label: type }));
            console.log('✅ [useReportState] Updated Asset Type dropdown with', assetTypes.length, 'options');
          }
          
          const departmentField = report.fields.find(f => f.key === "department");
          if (departmentField) {
            const departments = [...new Set(allAvailableAssets.map(row => row.department_name).filter(Boolean))];
            departmentField.domain = departments.map(dept => ({ value: dept, label: dept }));
            console.log('✅ [useReportState] Updated Department dropdown with', departments.length, 'options');
          }
          
          const assetStatusField = report.fields.find(f => f.key === "assetStatus");
          if (assetStatusField) {
            const assetStatuses = [...new Set(allAvailableAssets.map(row => row.asset_status).filter(Boolean))];
            assetStatusField.domain = assetStatuses.map(status => ({ value: status, label: status }));
            console.log('✅ [useReportState] Updated Asset Status dropdown with', assetStatuses.length, 'options');
          }
          
          const branchField = report.fields.find(f => f.key === "branch");
          if (branchField) {
            const branches = [...new Set(allAvailableAssets.map(row => row.branch_name).filter(Boolean))];
            branchField.domain = branches.map(branch => ({ value: branch, label: branch }));
            console.log('✅ [useReportState] Updated Branch dropdown with', branches.length, 'options');
          }
          
          // Trigger re-render with updated report
          setUpdatedReport({ ...report });
        }
      } else if (reportId === "asset-workflow-history") {
        // Handle asset workflow history data structure
        // Debug: Check Work Order ID issue only
        console.log('🔍 [useReportState] First allAvailableAssets record:', allAvailableAssets[0]);
        console.log('🔍 [useReportState] All workflow_id values in allAvailableAssets:', allAvailableAssets.map(row => row.workflow_id));
        
        let assetOptions, workOrderOptions, vendorOptions;
        
        assetOptions = allAvailableAssets.length > 0 
          ? allAvailableAssets.map(row => ({
              value: row.asset_id,
              label: `${row.asset_id} - ${row.asset_description && row.asset_description !== 'NULL' ? row.asset_description : row.serial_number}`
            }))
          : [];
        
        // Get unique workflow IDs properly - check multiple possible field names
        const workflowIds = allAvailableAssets.map(row => {
          // Try different possible field names
          return row.workflow_id || row.work_order_id || row.workflowId || row.workOrderId;
        }).filter(Boolean);
        
        const uniqueWorkflowIds = [...new Set(workflowIds)];
        
        workOrderOptions = uniqueWorkflowIds.map(wo => ({
          value: wo,
          label: wo
        }));
        
        // Debug: Work Order ID issue only
        console.log('🔍 [useReportState] Work Order IDs from data:', workflowIds);
        console.log('🔍 [useReportState] Unique Work Order IDs:', uniqueWorkflowIds);
        console.log('🔍 [useReportState] Work Order Options count:', workOrderOptions.length);
        console.log('🔍 [useReportState] First work order option:', workOrderOptions[0]);
        
        vendorOptions = allAvailableAssets.length > 0 
          ? [...new Set(allAvailableAssets.map(row => row.vendor_id).filter(Boolean))].map(vendor => ({
              value: vendor,
              label: `${vendor} - ${allAvailableAssets.find(row => row.vendor_id === vendor)?.vendor_name || vendor}`
            }))
          : [];
        
        
        // Update Asset ID dropdown
        const assetIdField = report.quickFields.find(f => f.key === "assetId");
        if (assetIdField) {
          assetIdField.domain = assetOptions;
        }
        
        // Update Work Order ID dropdown
          const workOrderIdField = report.quickFields.find(f => f.key === "workOrderId");
          if (workOrderIdField) {
            workOrderIdField.domain = workOrderOptions;
          console.log('✅ [useReportState] Updated Work Order ID dropdown with', workOrderOptions.length, 'options');
        }
        
        // Update Vendor ID dropdown
        const vendorIdField = report.quickFields.find(f => f.key === "vendorId");
        if (vendorIdField) {
          vendorIdField.domain = vendorOptions;
        }
        
        // Update advanced condition dropdowns
        const vendorNameField = report.fields.find(f => f.key === "vendorName");
        if (vendorNameField) {
          const vendorNames = [...new Set(allAvailableAssets.map(row => row.vendor_name).filter(Boolean))];
          vendorNameField.domain = vendorNames.map(name => ({ value: name, label: name }));
          console.log('✅ [useReportState] Updated Vendor Name dropdown with', vendorNames.length, 'options');
        }
        
        const workflowStatusField = report.fields.find(f => f.key === "workflowStatus");
        if (workflowStatusField) {
          const workflowStatuses = [...new Set(allAvailableAssets.map(row => row.workflow_status).filter(Boolean))];
          const statusMapping = {
            'CO': 'Completed',
            'IN': 'Initiated',
            'IP': 'In Progress',
            'CA': 'Cancelled',
            'OH': 'On Hold'
          };
          const statusOptions = workflowStatuses.map(status => ({
            value: status,
            label: statusMapping[status] || status
          }));
          workflowStatusField.domain = statusOptions;
          console.log('✅ [useReportState] Updated Workflow Status dropdown with', statusOptions.length, 'options');
        }
        
        const stepStatusField = report.fields.find(f => f.key === "stepStatus");
        if (stepStatusField) {
          const stepStatuses = [...new Set(allAvailableAssets.map(row => row.step_status).filter(Boolean))];
          const statusMapping = {
            'AP': 'Approved',
            'IN': 'Initiated',
            'UA': 'Under Approval',
            'CO': 'Completed',
            'CA': 'Cancelled'
          };
          const statusOptions = stepStatuses.map(status => ({
            value: status,
            label: statusMapping[status] || status
          }));
          stepStatusField.domain = statusOptions;
          console.log('✅ [useReportState] Updated Step Status dropdown with', statusOptions.length, 'options');
        }
        
        const maintenanceTypeField = report.fields.find(f => f.key === "maintenanceType");
        if (maintenanceTypeField) {
          const maintenanceTypes = [...new Set(allAvailableAssets.map(row => row.maintenance_type_name).filter(Boolean))];
          maintenanceTypeField.domain = maintenanceTypes.map(type => ({ value: type, label: type }));
          console.log('✅ [useReportState] Updated Maintenance Type dropdown with', maintenanceTypes.length, 'options');
        }
        
        const assignedToField = report.fields.find(f => f.key === "assignedTo");
        if (assignedToField) {
          const assignedUsers = [...new Set(allAvailableAssets.map(row => row.user_id).filter(Boolean))];
          assignedToField.domain = assignedUsers.map(user => ({ value: user, label: user }));
          console.log('✅ [useReportState] Updated Assigned To dropdown with', assignedUsers.length, 'options');
        }
        
        const departmentField = report.fields.find(f => f.key === "department");
        if (departmentField) {
          const departments = [...new Set(allAvailableAssets.map(row => row.department_name).filter(Boolean))];
          departmentField.domain = departments.map(dept => ({ value: dept, label: dept }));
          console.log('✅ [useReportState] Updated Department dropdown with', departments.length, 'options');
        }
        
        const assetTypeField = report.fields.find(f => f.key === "assetType");
        if (assetTypeField) {
          console.log('🔍 [useReportState] Processing Asset Type dropdown...');
          console.log('🔍 [useReportState] allAvailableAssets sample:', allAvailableAssets.slice(0, 2));
          console.log('🔍 [useReportState] asset_type_name values:', allAvailableAssets.map(row => row.asset_type_name));
          const assetTypes = [...new Set(allAvailableAssets.map(row => row.asset_type_name).filter(Boolean))];
          assetTypeField.domain = assetTypes.map(type => ({ value: type, label: type }));
          console.log('✅ [useReportState] Updated Asset Type dropdown with', assetTypes.length, 'options');
          console.log('🔍 [useReportState] Asset Type values:', assetTypes);
        } else {
          console.log('❌ [useReportState] Asset Type field not found in report');
        }
        
        const assetStatusField = report.fields.find(f => f.key === "assetStatus");
        if (assetStatusField) {
          console.log('🔍 [useReportState] Processing Asset Status dropdown...');
          console.log('🔍 [useReportState] asset_status values:', allAvailableAssets.map(row => row.asset_status));
          const assetStatuses = [...new Set(allAvailableAssets.map(row => row.asset_status).filter(Boolean))];
          assetStatusField.domain = assetStatuses.map(status => ({ value: status, label: status }));
          console.log('✅ [useReportState] Updated Asset Status dropdown with', assetStatuses.length, 'options');
          console.log('🔍 [useReportState] Asset Status values:', assetStatuses);
        } else {
          console.log('❌ [useReportState] Asset Status field not found in report');
        }
        
        // Trigger re-render with updated report
        setUpdatedReport({ ...report });
      }
    }
  }, [allAvailableAssets, reportId]);
  
  // Debug: Log when allAvailableAssets changes
  useEffect(() => {
    console.log('🔍 [useReportState] Debug useEffect triggered with dependencies:', {
      allAvailableAssetsLength: allAvailableAssets.length,
      reportId: reportId,
      reportExists: !!report,
      reportFieldsLength: report?.fields?.length || 0
    });
    
    console.log('🔍 [useReportState] allAvailableAssets changed:', {
      length: allAvailableAssets.length,
      sample: allAvailableAssets.slice(0, 2)
    });
    
    // Check if we have data for dropdowns
    if (allAvailableAssets.length > 0) {
      console.log('🔍 [useReportState] Data available for dropdowns:', {
        asset_status: allAvailableAssets.map(row => row.asset_status),
        asset_type_name: allAvailableAssets.map(row => row.asset_type_name),
        purchased_cost: allAvailableAssets.map(row => row.purchased_cost)
      });
      
      // Check if report is available for dropdown population
      console.log('🔍 [useReportState] Report available for dropdown population:', {
        reportId: reportId,
        reportExists: !!report,
        reportFields: report?.fields?.length || 0
      });
      
      // Check if we should trigger dropdown population
      if (reportId === "asset-workflow-history" && report && report.fields) {
        console.log('🔍 [useReportState] Triggering dropdown population for asset-workflow-history');
        console.log('🔍 [useReportState] Report fields available:', report.fields.map(f => f.key));
        
        // Manually trigger dropdown population for Asset Type and Asset Status
        const assetTypeField = report.fields.find(f => f.key === "assetType");
        if (assetTypeField) {
          console.log('🔍 [useReportState] Processing Asset Type dropdown...');
          console.log('🔍 [useReportState] allAvailableAssets sample:', allAvailableAssets.slice(0, 2));
          console.log('🔍 [useReportState] asset_type_name values:', allAvailableAssets.map(row => row.asset_type_name));
          const assetTypes = [...new Set(allAvailableAssets.map(row => row.asset_type_name).filter(Boolean))];
          assetTypeField.domain = assetTypes.map(type => ({ value: type, label: type }));
          console.log('✅ [useReportState] Updated Asset Type dropdown with', assetTypes.length, 'options');
          console.log('🔍 [useReportState] Asset Type values:', assetTypes);
        } else {
          console.log('❌ [useReportState] Asset Type field not found in report');
        }
        
        const assetStatusField = report.fields.find(f => f.key === "assetStatus");
        if (assetStatusField) {
          console.log('🔍 [useReportState] Processing Asset Status dropdown...');
          console.log('🔍 [useReportState] asset_status values:', allAvailableAssets.map(row => row.asset_status));
          const assetStatuses = [...new Set(allAvailableAssets.map(row => row.asset_status).filter(Boolean))];
          assetStatusField.domain = assetStatuses.map(status => ({ value: status, label: status }));
          console.log('✅ [useReportState] Updated Asset Status dropdown with', assetStatuses.length, 'options');
          console.log('🔍 [useReportState] Asset Status values:', assetStatuses);
        } else {
          console.log('❌ [useReportState] Asset Status field not found in report');
        }
      } else {
        console.log('❌ [useReportState] Dropdown population conditions not met:', {
          reportIdMatch: reportId === "asset-workflow-history",
          reportExists: !!report,
          reportFieldsExists: !!(report && report.fields)
        });
      }
    }
  }, [allAvailableAssets, reportId, report]);

  const filteredRows = useMemo(() => {
    // For asset-register, asset-lifecycle, maintenance-history, and breakdown-history, we're doing server-side filtering, so return allRows
    // For other reports, use client-side filtering
    if (reportId === "asset-register" || reportId === "asset-lifecycle" || reportId === "asset-valuation" || reportId === "maintenance-history" || reportId === "breakdown-history" || reportId === "asset-workflow-history") {
      return allRows;
    }
    return filterRows(allRows, reportId, quick, advanced);
  }, [allRows, reportId, quick, advanced]);

  const cols = useMemo(() => {
    return columns || report?.defaultColumns || [];
  }, [columns, report]);

  // Helper function to set individual quick filter fields
  const setQuickField = (key, value) => {
    console.log('🔍 [useReportState] setQuickField called:', { key, value });
    console.log('🔍 [useReportState] Current quick state before update:', quick);
    setQuick(prev => {
      const newQuick = { ...prev, [key]: value };
      console.log('🔍 [useReportState] New quick state after update:', newQuick);
      return newQuick;
    });
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
    report: updatedReport || report, // Use updated report if available
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
