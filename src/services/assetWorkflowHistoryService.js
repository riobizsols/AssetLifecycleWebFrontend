import API from '../lib/axios';
// Cache busting comment - force rebuild

const assetWorkflowHistoryService = {
  // Get all asset workflow history with filtering
  getAssetWorkflowHistory: async (filters = {}) => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Fetching asset workflow history data...');
      console.log('🔍 [AssetWorkflowHistoryService] Filters:', filters);
      
      const params = new URLSearchParams();
      
      // Add pagination
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      if (filters.page) params.append('page', filters.page);
      
      // Add organization ID
      if (filters.orgId) params.append('orgId', filters.orgId);
      
      // Add quick filters
      if (filters.assetId || filters.asset_id) params.append('assetId', filters.assetId || filters.asset_id);
      if (filters.vendorId || filters.vendor_id) params.append('vendorId', filters.vendorId || filters.vendor_id);
      if (filters.workOrderId || filters.work_order_id) params.append('workOrderId', filters.workOrderId || filters.work_order_id);
      if (filters.workflowStatus || filters.workflow_status) params.append('workflowStatus', filters.workflowStatus || filters.workflow_status);
      if (filters.stepStatus || filters.step_status) params.append('stepStatus', filters.stepStatus || filters.step_status);
      
      // Add date range filters
      if (filters.plannedScheduleDateFrom) params.append('plannedScheduleDateFrom', filters.plannedScheduleDateFrom);
      if (filters.plannedScheduleDateTo) params.append('plannedScheduleDateTo', filters.plannedScheduleDateTo);
      if (filters.actualScheduleDateFrom) params.append('actualScheduleDateFrom', filters.actualScheduleDateFrom);
      if (filters.actualScheduleDateTo) params.append('actualScheduleDateTo', filters.actualScheduleDateTo);
      if (filters.workflowCreatedDateFrom) params.append('workflowCreatedDateFrom', filters.workflowCreatedDateFrom);
      if (filters.workflowCreatedDateTo) params.append('workflowCreatedDateTo', filters.workflowCreatedDateTo);
      
      // Add text search filters
      if (filters.notes) params.append('notes', filters.notes);
      if (filters.assetDescription) params.append('assetDescription', filters.assetDescription);
      if (filters.vendorName) params.append('vendorName', filters.vendorName);
      
      // Add advanced conditions
      if (filters.advancedConditions && Array.isArray(filters.advancedConditions) && filters.advancedConditions.length > 0) {
        params.append('advancedConditions', JSON.stringify(filters.advancedConditions));
        console.log('🔍 [AssetWorkflowHistoryService] Added advanced conditions:', filters.advancedConditions);
      }
      
      const queryString = params.toString();
      const url = queryString ? `/asset-workflow-history?${queryString}` : '/asset-workflow-history';
      
      console.log('🔍 [AssetWorkflowHistoryService] Query parameters:', queryString);
      console.log('🔍 [AssetWorkflowHistoryService] Making request to:', url);
      console.log('🔍 [AssetWorkflowHistoryService] Full URL will be:', `${API.defaults.baseURL}${url}`);
      
      const response = await API.get(url);
      console.log('✅ [AssetWorkflowHistoryService] Successfully fetched', response.data?.data?.length || 0, 'workflow records');
      console.log('🔍 [AssetWorkflowHistoryService] Response structure:', {
        success: response.data?.success,
        dataLength: response.data?.data?.length,
        pagination: response.data?.pagination
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error fetching asset workflow history data:', error);
      console.error('❌ [AssetWorkflowHistoryService] Error response:', error.response?.data);
      throw error;
    }
  },

  // Get asset workflow history by asset ID
  getAssetWorkflowHistoryByAsset: async (assetId, filters = {}) => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Fetching workflow history for asset:', assetId);
      
      const params = new URLSearchParams();
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);
      
      const queryString = params.toString();
      const url = queryString ? `/asset-workflow-history/asset/${assetId}?${queryString}` : `/asset-workflow-history/asset/${assetId}`;
      
      const response = await API.get(url);
      console.log('✅ [AssetWorkflowHistoryService] Successfully fetched workflow history for asset:', assetId);
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error fetching workflow history for asset:', assetId, error);
      throw error;
    }
  },

  // Get workflow history details for a specific workflow
  getWorkflowHistoryDetails: async (workflowId) => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Fetching workflow details for:', workflowId);
      
      const response = await API.get(`/asset-workflow-history/workflow/${workflowId}`);
      console.log('✅ [AssetWorkflowHistoryService] Successfully fetched workflow details');
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error fetching workflow details:', error);
      throw error;
    }
  },

  // Get asset workflow history summary
  getAssetWorkflowHistorySummary: async () => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Fetching workflow history summary...');
      
      const response = await API.get('/asset-workflow-history/summary');
      console.log('✅ [AssetWorkflowHistoryService] Successfully fetched workflow summary');
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error fetching workflow summary:', error);
      throw error;
    }
  },

  // Get available filter options
  getFilterOptions: async () => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Fetching filter options...');
      
      const response = await API.get('/asset-workflow-history/filter-options');
      console.log('✅ [AssetWorkflowHistoryService] Successfully fetched filter options');
      console.log('🔍 [AssetWorkflowHistoryService] Filter options structure:', {
        assetOptions: response.data?.filter_options?.asset_options?.length || 0,
        vendorOptions: response.data?.filter_options?.vendor_options?.length || 0,
        workOrderOptions: response.data?.filter_options?.work_order_options?.length || 0,
        maintenanceTypeOptions: response.data?.filter_options?.maintenance_type_options?.length || 0,
        workflowStatusOptions: response.data?.filter_options?.workflow_status_options?.length || 0,
        stepStatusOptions: response.data?.filter_options?.step_status_options?.length || 0,
        userOptions: response.data?.filter_options?.user_options?.length || 0,
        departmentOptions: response.data?.filter_options?.department_options?.length || 0
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error fetching filter options:', error);
      throw error;
    }
  },

  // Export asset workflow history
  exportAssetWorkflowHistory: async (filters = {}, format = 'csv') => {
    try {
      console.log('🔍 [AssetWorkflowHistoryService] Exporting workflow history as:', format);
      
      const response = await API.post('/asset-workflow-history/export', {
        ...filters,
        format
      }, {
        responseType: 'blob'
      });
      
      console.log('✅ [AssetWorkflowHistoryService] Successfully exported workflow history');
      return response.data;
    } catch (error) {
      console.error('❌ [AssetWorkflowHistoryService] Error exporting workflow history:', error);
      throw error;
    }
  }
};

export default assetWorkflowHistoryService;
