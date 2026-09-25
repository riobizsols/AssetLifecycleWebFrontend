import API from '../lib/axios';

export const maintenanceStatusReportService = {
  getOptions: async () => {
    const res = await API.get('/maintenance-status-report/options');
    return res.data?.data || { facility_types: [], asset_types: [] };
  },

  viewReport: async (payload) => {
    const res = await API.post('/maintenance-status-report/view', payload);
    return res.data?.data;
  },

  exportReport: async (payload) => {
    const res = await API.post('/maintenance-status-report/export', payload, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default maintenanceStatusReportService;
