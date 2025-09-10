import API from '../lib/axios';

export const maintenanceHistoryService = {
  // Get maintenance history data with filters
  getMaintenanceHistory: async (filters = {}) => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Fetching maintenance history data...');
      
      const params = new URLSearchParams();
      
      // Add filters to query parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'advancedConditions') {
            // Special handling for advanced conditions - send as JSON
            params.append(key, JSON.stringify(value));
          } else if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });

      const queryString = params.toString();
      const response = await API.get(`/maintenance-history?${queryString}`);
      
      console.log('🔍 [MaintenanceHistoryService] Raw Axios response:', response);
      console.log('🔍 [MaintenanceHistoryService] Response.data:', response.data);
      console.log('🔍 [MaintenanceHistoryService] Response.data type:', typeof response.data);
      console.log('🔍 [MaintenanceHistoryService] Response.data keys:', Object.keys(response.data || {}));
      
      console.log('✅ [MaintenanceHistoryService] Successfully fetched', response.data?.data?.length || 0, 'maintenance records');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error fetching maintenance history data:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  },

  // Get maintenance history by asset ID
  getMaintenanceHistoryByAsset: async (assetId) => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Fetching maintenance history for asset:', assetId);
      
      const response = await API.get(`/maintenance-history/asset/${assetId}`);
      
      console.log('✅ [MaintenanceHistoryService] Successfully fetched maintenance history for asset');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error fetching maintenance history for asset:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  },

  // Get maintenance history by work order ID
  getMaintenanceHistoryByWorkOrder: async (woId) => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Fetching maintenance history for work order:', woId);
      
      const response = await API.get(`/maintenance-history/work-order/${woId}`);
      
      console.log('✅ [MaintenanceHistoryService] Successfully fetched maintenance history for work order');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error fetching maintenance history for work order:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  },

  // Get maintenance history summary statistics
  getSummary: async () => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Fetching summary...');
      
      const response = await API.get('/maintenance-history/summary');
      
      console.log('✅ [MaintenanceHistoryService] Successfully fetched summary');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error fetching maintenance history summary:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  },

  // Get filter options for dropdowns
  getFilterOptions: async () => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Fetching filter options...');
      
      const response = await API.get('/maintenance-history/filter-options');
      
      console.log('✅ [MaintenanceHistoryService] Successfully fetched filter options');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error fetching filter options:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  },

  // Export maintenance history
  exportMaintenanceHistory: async (filters = {}, exportType = 'pdf') => {
    try {
      console.log('🔍 [MaintenanceHistoryService] Exporting maintenance history as', exportType);
      
      const response = await API.post('/maintenance-history/export', filters, {
        params: { type: exportType },
        responseType: 'blob'
      });
      
      console.log('✅ [MaintenanceHistoryService] Successfully exported maintenance history');
      
      return response.data;
    } catch (error) {
      console.error('❌ [MaintenanceHistoryService] Error exporting maintenance history:', error);
      console.error('❌ [MaintenanceHistoryService] Error response:', error.response);
      throw error;
    }
  }
};

export default maintenanceHistoryService;
