import API from '../lib/axios';

export const auditReportService = {
  getAuditTypes: async () => {
    const res = await API.get('/audit-report/audit-types');
    return res.data?.data || [];
  },

  createAuditType: async (payload) => {
    const res = await API.post('/audit-report/audit-types', payload);
    return res.data?.data;
  },

  updateAuditType: async (audtpId, payload) => {
    const res = await API.put(`/audit-report/audit-types/${encodeURIComponent(audtpId)}`, payload);
    return res.data?.data;
  },

  getMappedAssetTypes: async (audtpId) => {
    const res = await API.get(`/audit-report/asset-types/${encodeURIComponent(audtpId)}`);
    return res.data?.data || [];
  },

  getAllAssetTypes: async () => {
    const res = await API.get('/audit-report/all-asset-types');
    return res.data?.data || [];
  },

  saveMappings: async (audtpId, assetTypeIds) => {
    const res = await API.put(`/audit-report/mappings/${encodeURIComponent(audtpId)}`, {
      asset_type_ids: assetTypeIds,
    });
    return res.data?.data || [];
  },

  viewReport: async (payload) => {
    const res = await API.post('/audit-report/view', payload);
    return res.data?.data;
  },
};

export default auditReportService;
