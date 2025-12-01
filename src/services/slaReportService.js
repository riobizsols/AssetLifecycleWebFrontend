import API from "../lib/axios";

export const slaReportService = {
  // Get SLA report data with filters
  getSLAReport: async (filters = {}) => {
    const params = new URLSearchParams();
    
    // Add filters to params - handle both camelCase and snake_case keys
    if (filters.vendor && filters.vendor.length > 0) {
      filters.vendor.forEach(v => params.append('vendor_id', v));
    } else if (filters.vendor_id && filters.vendor_id.length > 0) {
      filters.vendor_id.forEach(v => params.append('vendor_id', v));
    }
    
    if (filters.assetType && filters.assetType.length > 0) {
      filters.assetType.forEach(at => params.append('asset_type_id', at));
    } else if (filters.asset_type_id && filters.asset_type_id.length > 0) {
      filters.asset_type_id.forEach(at => params.append('asset_type_id', at));
    }
    
    if (filters.slaDescription && filters.slaDescription.length > 0) {
      filters.slaDescription.forEach(sla => params.append('sla_description', sla));
    } else if (filters.sla_description && filters.sla_description.length > 0) {
      filters.sla_description.forEach(sla => params.append('sla_description', sla));
    }
    
    if (filters.dateRange && filters.dateRange.length === 2) {
      params.append('dateRange', filters.dateRange.join(','));
    }
    
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.offset) params.append('offset', filters.offset);
    
    const response = await API.get(`/sla-report?${params.toString()}`);
    return response;
  },
  
  // Get filter options
  getFilterOptions: async () => {
    const response = await API.get('/sla-report/filter-options');
    return response;
  }
};


