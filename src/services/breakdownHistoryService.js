import API from '../lib/axios';

export const breakdownHistoryService = {
  // Get breakdown history with filtering
  getBreakdownHistory: async (filters = {}) => {
    try {
      console.log('🔍 [BreakdownHistoryService] Fetching breakdown history data...');
      
      // Convert filters to query parameters
      const params = new URLSearchParams();
      
      // Add pagination
      params.append('page', filters.page || 1);
      params.append('limit', filters.limit || 50);
      params.append('orgId', filters.orgId || 'ORG001');
      
      // Add advanced conditions if they exist
      if (filters.advancedConditions && Array.isArray(filters.advancedConditions) && filters.advancedConditions.length > 0) {
        params.append('advancedConditions', JSON.stringify(filters.advancedConditions));
        console.log('🔍 [BreakdownHistoryService] Added advanced conditions:', filters.advancedConditions);
      }
      
      // Add other filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '' && key !== 'advancedConditions' && key !== 'page' && key !== 'limit' && key !== 'orgId') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });
      
      const queryString = params.toString();
      console.log('🔍 [BreakdownHistoryService] Query string:', queryString);
      
      const response = await API.get(`/breakdown-history?${queryString}`);
      console.log('🔍 [BreakdownHistoryService] Raw Axios response:', response);
      console.log('🔍 [BreakdownHistoryService] Response.data:', response.data);
      console.log('🔍 [BreakdownHistoryService] Response.data type:', typeof response.data);
      console.log('🔍 [BreakdownHistoryService] Response.data keys:', Object.keys(response.data || {}));
      console.log('✅ [BreakdownHistoryService] Successfully fetched', response.data?.data?.length || 0, 'breakdown records');
      
      return response.data;
    } catch (error) {
      console.error('❌ [BreakdownHistoryService] Error fetching breakdown history data:', error);
      console.error('❌ [BreakdownHistoryService] Error response:', error.response?.data);
      throw error;
    }
  },

  // Get breakdown history by asset ID
  getBreakdownHistoryByAsset: async (assetId, orgId = 'ORG001') => {
    try {
      console.log('🔍 [BreakdownHistoryService] Fetching breakdown history for asset:', assetId);
      
      const response = await API.get(`/breakdown-history/asset/${assetId}?orgId=${orgId}`);
      console.log('✅ [BreakdownHistoryService] Successfully fetched breakdown history for asset:', assetId);
      
      return response.data;
    } catch (error) {
      console.error('❌ [BreakdownHistoryService] Error fetching breakdown history for asset:', error);
      throw error;
    }
  },

  // Get breakdown history summary
  getBreakdownHistorySummary: async (orgId = 'ORG001') => {
    try {
      console.log('🔍 [BreakdownHistoryService] Fetching breakdown history summary...');
      
      const response = await API.get(`/breakdown-history/summary?orgId=${orgId}`);
      console.log('✅ [BreakdownHistoryService] Successfully fetched breakdown history summary');
      
      return response.data;
    } catch (error) {
      console.error('❌ [BreakdownHistoryService] Error fetching breakdown history summary:', error);
      throw error;
    }
  },

  // Get filter options
  getFilterOptions: async (orgId = 'ORG001') => {
    try {
      console.log('🔍 [BreakdownHistoryService] Fetching filter options...');
      
      const response = await API.get(`/breakdown-history/filter-options?orgId=${orgId}`);
      console.log('✅ [BreakdownHistoryService] Successfully fetched filter options');
      
      return response.data;
    } catch (error) {
      console.error('❌ [BreakdownHistoryService] Error fetching filter options:', error);
      throw error;
    }
  },

  // Export breakdown history
  exportBreakdownHistory: async (filters = {}, exportType = 'csv', orgId = 'ORG001') => {
    try {
      console.log('🔍 [BreakdownHistoryService] Exporting breakdown history...', { exportType, filters });
      
      const response = await API.post(`/breakdown-history/export?type=${exportType}&orgId=${orgId}`, filters, {
        responseType: exportType === 'csv' ? 'blob' : 'arraybuffer'
      });
      
      console.log('✅ [BreakdownHistoryService] Successfully exported breakdown history');
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: exportType === 'csv' ? 'text/csv' : 'application/pdf' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `breakdown-history-${new Date().toISOString().slice(0, 10)}.${exportType}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return response.data;
    } catch (error) {
      console.error('❌ [BreakdownHistoryService] Error exporting breakdown history:', error);
      throw error;
    }
  }
};
