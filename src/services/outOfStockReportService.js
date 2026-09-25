import API from '../lib/axios';

export const outOfStockReportService = {
  getOptions: async () => {
    const res = await API.get('/out-of-stock-report/options');
    return (
      res.data?.data || {
        branches: [],
        stores: [],
        categories: [],
        impact_levels: [],
      }
    );
  },

  viewReport: async (payload) => {
    const res = await API.post('/out-of-stock-report/view', payload);
    return res.data?.data;
  },

  exportReport: async (payload) => {
    const res = await API.post('/out-of-stock-report/export', payload, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default outOfStockReportService;
