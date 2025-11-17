import axios from '../lib/axios';

const API_BASE_URL = '/asset-usage/report';

export const usageBasedAssetReportService = {
  /**
   * Get usage-based asset report data with filtering and pagination
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Report data
   */
  async getUsageReportData(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (key === 'advancedConditions') {
            // Special handling for advanced conditions - send as JSON string
            if (Array.isArray(value) && value.length > 0) {
              params.append(key, JSON.stringify(value));
              console.log('🔍 [usageBasedAssetReportService] Added advanced conditions:', value);
            }
          } else if (Array.isArray(value)) {
            // Handle array of primitives for multiselect filters
            if (key === 'assetTypeIds' || key === 'department' || key === 'branchId' || key === 'createdBy') {
              value.forEach(item => params.append(key, item));
            } else {
              // For other arrays, serialize to JSON
              params.append(key, JSON.stringify(value));
            }
          } else if (typeof value === 'object') {
            // Serialize objects to JSON string
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/data?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching usage report data:', error);
      throw error;
    }
  },

  /**
   * Get usage report summary for dashboard
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Summary data
   */
  async getUsageReportSummary(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      // Add all filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/data?${params.toString()}`);
      return {
        success: response.data.success,
        data: response.data.summary,
      };
    } catch (error) {
      console.error('Error fetching usage report summary:', error);
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
   * Export usage report data to Excel
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} Excel file blob
   */
  async exportToExcel(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/data?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  },

  /**
   * Export usage report data to CSV
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} CSV file blob
   */
  async exportToCSV(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`/asset-usage/report/export/csv?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw error;
    }
  },

  /**
   * Export usage report data to PDF
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} PDF file blob
   */
  async exportToPDF(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`/asset-usage/report/export/pdf?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  },

  /**
   * Export usage report data to JSON
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Blob>} JSON file blob
   */
  async exportToJSON(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(item => params.append(key, item));
          } else if (typeof value === 'object') {
            params.append(key, JSON.stringify(value));
          } else {
            params.append(key, value);
          }
        }
      });

      const response = await axios.get(`${API_BASE_URL}/data?${params.toString()}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  }
};

export default usageBasedAssetReportService;

