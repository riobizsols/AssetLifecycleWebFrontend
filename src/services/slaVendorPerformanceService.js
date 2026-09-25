import API from '../lib/axios';

function buildParams(filters = {}) {
  const params = {};
  if (filters.period) params.period = filters.period;
  if (filters.dateFrom) params.dateFrom = filters.dateFrom;
  if (filters.dateTo) params.dateTo = filters.dateTo;
  if (filters.vendorIds?.length) params.vendorIds = filters.vendorIds.join(',');
  if (filters.assetIds?.length) params.assetIds = filters.assetIds.join(',');
  if (filters.assetTypeIds?.length) params.assetTypeIds = filters.assetTypeIds.join(',');
  if (filters.branchIds?.length) params.branchIds = filters.branchIds.join(',');
  if (filters.maintTypeIds?.length) params.maintTypeIds = filters.maintTypeIds.join(',');
  if (filters.reasonIds?.length) params.reasonIds = filters.reasonIds.join(',');
  if (filters.slaStatus && filters.slaStatus !== 'all') params.slaStatus = filters.slaStatus;
  if (filters.grain) params.grain = filters.grain;
  if (filters.search) params.search = filters.search;
  if (filters.sort) params.sort = filters.sort;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  return params;
}

const base = '/sla-vendor-performance';

export const slaVendorPerformanceService = {
  getFilterOptions: async () => {
    const res = await API.get(`${base}/filter-options`);
    return res.data?.data || {};
  },
  getSummary: async (filters = {}) => {
    const res = await API.get(`${base}/summary`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getTrends: async (filters = {}) => {
    const res = await API.get(`${base}/trends`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getBreaches: async (filters = {}) => {
    const res = await API.get(`${base}/breaches`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getVendors: async (filters = {}) => {
    const res = await API.get(`${base}/vendors`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getVendorDetail: async (vendorId, filters = {}) => {
    const res = await API.get(`${base}/vendors/${vendorId}`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getRepeatFailures: async (filters = {}) => {
    const res = await API.get(`${base}/repeat-failures`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getServiceQuality: async (filters = {}) => {
    const res = await API.get(`${base}/service-quality`, { params: buildParams(filters) });
    return res.data?.data;
  },
  getDetails: async (filters = {}) => {
    const res = await API.get(`${base}/details`, { params: buildParams(filters) });
    return res.data?.data;
  },
};

export default slaVendorPerformanceService;
