import axios from '../lib/axios';

const API_BASE_URL = '/asset-valuation';

export const assetValuationService = {
  /**
   * Get asset valuation data with filtering and pagination
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Asset valuation data
   */
  async getAssetValuationData(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            // Check if array contains objects
            if (value.length > 0 && typeof value[0] === 'object') {
              // Serialize array of objects to JSON string
              const jsonString = JSON.stringify(value);
              params.append(key, jsonString);
            } else {
              // Handle array of primitives
              value.forEach(item => params.append(key, item));
            }
          } else if (typeof value === 'object') {
            // Serialize objects to JSON string
            const jsonString = JSON.stringify(value);
            params.append(key, jsonString);
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching asset valuation data:', error);
      throw error;
    }
  },

  /**
   * Get asset valuation summary for dashboard
   * @returns {Promise<Object>} Summary data
   */
  async getAssetValuationSummary() {
    try {
      const response = await axios.get(`${API_BASE_URL}/summary`);
      return response.data;
    } catch (error) {
      console.error('Error fetching asset valuation summary:', error);
      throw error;
    }
  },

  /**
   * Get available filter options
   * @returns {Promise<Object>} Filter options
   */
  async getFilterOptions() {
    try {
      const response = await axios.get(`${API_BASE_URL}/filter-options`);
      return response.data;
    } catch (error) {
      console.error('Error fetching filter options:', error);
      throw error;
    }
  },

  /**
   * Export asset valuation data to Excel
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} Excel file blob
   */
  async exportToExcel(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            // Check if array contains objects
            if (value.length > 0 && typeof value[0] === 'object') {
              // Serialize array of objects to JSON string
              params.append(key, JSON.stringify(value));
            } else {
              // Handle array of primitives
              value.forEach(item => params.append(key, item));
            }
          } else if (typeof value === 'object') {
            // Serialize objects to JSON string
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/export/excel?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  /**
   * Export asset valuation data to CSV
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} CSV file blob
   */
  async exportToCSV(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            // Check if array contains objects
            if (value.length > 0 && typeof value[0] === 'object') {
              // Serialize array of objects to JSON string
              params.append(key, JSON.stringify(value));
            } else {
              // Handle array of primitives
              value.forEach(item => params.append(key, item));
            }
          } else if (typeof value === 'object') {
            // Serialize objects to JSON string
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  },

  /**
   * Export asset valuation data to JSON
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} JSON file blob
   */
  async exportToJSON(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            // Check if array contains objects
            if (value.length > 0 && typeof value[0] === 'object') {
              // Serialize array of objects to JSON string
              params.append(key, JSON.stringify(value));
            } else {
              // Handle array of primitives
              value.forEach(item => params.append(key, item));
            }
          } else if (typeof value === 'object') {
            // Serialize objects to JSON string
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/export/json?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }
};

export default assetValuationService;
