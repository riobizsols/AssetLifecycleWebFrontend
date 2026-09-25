import API from "../lib/axios";

const API_BASE_URL = "/spare-parts-report";

export const sparePartsReportService = {
  getSparePartsReport: async (filters = {}) => {
    const apiParams = {
      limit: filters.limit || 1000,
      offset: filters.offset || 0,
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      if (key === "advancedConditions") {
        apiParams.advancedConditions = JSON.stringify(value);
        return;
      }
      if (Array.isArray(value)) {
        if (value.length > 0) apiParams[key] = value;
        return;
      }
      apiParams[key] = value;
    });

    return API.get(API_BASE_URL, { params: apiParams });
  },

  getFilterOptions: async () => API.get(`${API_BASE_URL}/filter-options`),
};

export default sparePartsReportService;
