import API from '../lib/axios';

export const assetRegisterService = {
  // Get asset register data with filters
  getAssetRegister: async (filters = {}) => {
    try {
      console.log('🔍 [AssetRegisterService] Fetching asset register data...');
      
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
      const response = await API.get(`/asset-register?${queryString}`);
      
      console.log('✅ [AssetRegisterService] Successfully fetched', response.data?.data?.length || 0, 'assets');
      
      return response.data;
    } catch (error) {
      console.error('❌ [AssetRegisterService] Error fetching asset register data:', error);
      console.error('❌ [AssetRegisterService] Error response:', error.response);
      throw error;
    }
  },

  // Get filter options for dropdowns
  getFilterOptions: async () => {
    try {
      console.log('🔍 [AssetRegisterService] Fetching filter options...');
      
      const response = await API.get('/asset-register/filter-options');
      
      console.log('✅ [AssetRegisterService] Successfully fetched filter options');
      
      return response.data;
    } catch (error) {
      console.error('❌ [AssetRegisterService] Error fetching filter options:', error);
      console.error('❌ [AssetRegisterService] Error response:', error.response);
      throw error;
    }
  },

  // Get asset register summary statistics
  getSummary: async () => {
    try {
      console.log('🔍 [AssetRegisterService] Fetching summary...');
      
      const response = await API.get('/asset-register/summary');
      
      console.log('✅ [AssetRegisterService] Successfully fetched summary');
      
      return response.data;
    } catch (error) {
      console.error('❌ [AssetRegisterService] Error fetching asset register summary:', error);
      console.error('❌ [AssetRegisterService] Error response:', error.response);
      throw error;
    }
  }
};

export default assetRegisterService;
