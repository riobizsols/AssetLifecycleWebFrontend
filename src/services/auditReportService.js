import API from '../lib/axios';

export const auditReportService = {
  getAuditTypes: async () => {
    const res = await API.get('/audit-report/audit-types');
    return res.data?.data || [];
  },

  getMappedAssetTypes: async (audtpId) => {
    const res = await API.get(`/audit-report/asset-types/${encodeURIComponent(audtpId)}`);
    return res.data?.data || [];
  },

  viewReport: async (payload) => {
    const res = await API.post('/audit-report/view', payload);
    return res.data?.data;
  },

  getPmCompliance: async (payload) => {
    const res = await API.post('/audit-report/pm-compliance', payload);
    return res.data?.data;
  },

  getCalibrationDetail: async (payload) => {
    const res = await API.post('/audit-report/calibration-detail', payload);
    return res.data?.data;
  },
};

export default auditReportService;
