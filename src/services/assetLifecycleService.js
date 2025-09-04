import API from '../lib/axios';

const API_BASE_URL = '/asset-lifecycle';

export const assetLifecycleService = {
  // Get asset lifecycle data with filters
  getAssetLifecycle: async (filters = {}) => {
    try {
      console.log('🔍 [AssetLifecycleService] Fetching asset lifecycle data with filters:', filters);
      
      // Prepare API parameters
      const apiParams = {
        limit: filters.limit || 1000,
        offset: filters.offset || 0
      };

      // Add filters to parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value) && value.length > 0) {
            // For arrays, send the array directly - axios will handle the parameter serialization
            apiParams[key] = value;
          } else if (!Array.isArray(value)) {
            apiParams[key] = value;
          }
        }
      });

      // Handle advanced conditions separately
      if (filters.advancedConditions) {
        apiParams.advancedConditions = JSON.stringify(filters.advancedConditions);
      }

      console.log('🔍 [AssetLifecycleService] Final API parameters:', apiParams);
      console.log('🔍 [AssetLifecycleService] Making request to:', API_BASE_URL);
      
      const response = await API.get(API_BASE_URL, {
        params: apiParams
      });
      
      console.log('🔍 [AssetLifecycleService] Response data count:', response.data?.data?.length);
      
      console.log('✅ [AssetLifecycleService] Asset lifecycle data fetched successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [AssetLifecycleService] Error fetching asset lifecycle data:', error);
      console.error('❌ [AssetLifecycleService] Error response:', error.response?.data);
      console.error('❌ [AssetLifecycleService] Error status:', error.response?.status);
      throw error;
    }
  },

  // Get filter options for dropdowns
  getFilterOptions: async () => {
    try {
      console.log('🔍 [AssetLifecycleService] Fetching filter options...');
      
      const response = await API.get(`${API_BASE_URL}/filter-options`);
      
      console.log('✅ [AssetLifecycleService] Filter options fetched successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [AssetLifecycleService] Error fetching filter options:', error);
      console.error('❌ [AssetLifecycleService] Error response:', error.response?.data);
      console.error('❌ [AssetLifecycleService] Error status:', error.response?.status);
      throw error;
    }
  },

  // Get asset lifecycle summary statistics
  getSummary: async () => {
    try {
      console.log('🔍 [AssetLifecycleService] Fetching summary statistics...');
      
      const response = await API.get(`${API_BASE_URL}/summary`);
      
      console.log('✅ [AssetLifecycleService] Summary statistics fetched successfully:', response.data);
      return response;
    } catch (error) {
      console.error('❌ [AssetLifecycleService] Error fetching summary statistics:', error);
      throw error;
    }
  }
};

export default assetLifecycleService;
