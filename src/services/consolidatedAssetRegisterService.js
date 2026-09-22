import API from '../lib/axios';

function buildParams(filters = {}) {
  const params = {};
  if (filters.orgIds?.length) params.orgIds = filters.orgIds.join(',');
  if (filters.branchIds?.length) params.branchIds = filters.branchIds.join(',');
  if (filters.deptIds?.length) params.deptIds = filters.deptIds.join(',');
  if (filters.statuses?.length) params.statuses = filters.statuses.join(',');
  if (filters.assetTypeIds?.length) params.assetTypeIds = filters.assetTypeIds.join(',');
  if (filters.search) params.search = filters.search;
  if (filters.page) params.page = filters.page;
  if (filters.pageSize) params.pageSize = filters.pageSize;
  return params;
}

export const consolidatedAssetRegisterService = {
  getFilterOptions: async (filters = {}) => {
    const res = await API.get('/consolidated-asset-register/filter-options', {
      params: buildParams(filters),
    });
    return (
      res.data?.data || {
        institutions: [],
        campuses: [],
        departments: [],
        statuses: [],
        assetTypes: [],
      }
    );
  },

  getSummary: async (filters = {}) => {
    const res = await API.get('/consolidated-asset-register/summary', {
      params: buildParams(filters),
    });
    return res.data?.data;
  },

  getRegister: async (filters = {}) => {
    const res = await API.get('/consolidated-asset-register/register', {
      params: buildParams(filters),
    });
    return res.data?.data || { rows: [], total: 0, page: 1, pageSize: 50, totalPages: 1 };
  },

  getRegisterExport: async (filters = {}) => {
    const res = await API.get('/consolidated-asset-register/register/export', {
      params: buildParams(filters),
    });
    return res.data?.data || { rows: [], total: 0 };
  },
};

export default consolidatedAssetRegisterService;
