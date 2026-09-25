import API from '../lib/axios';

export const purchaseRequirementReportService = {
  getOptions: async () => {
    const res = await API.get('/purchase-requirement-report/options');
    return (
      res.data?.data || {
        branches: [],
        categories: [],
        demand_sources: [],
        focus_options: [],
        horizon_presets: [],
      }
    );
  },

  viewReport: async (payload) => {
    const res = await API.post('/purchase-requirement-report/view', payload);
    return res.data?.data;
  },

  exportReport: async (payload) => {
    const res = await API.post('/purchase-requirement-report/export', payload, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default purchaseRequirementReportService;
