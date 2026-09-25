import API from '../lib/axios';

export const workforceReportService = {
  viewReport: async (payload) => {
    const res = await API.post('/workforce-report/view', payload);
    return res.data?.data;
  },

  getTechnicianDetail: async (payload) => {
    const res = await API.post('/workforce-report/technician-detail', payload);
    return res.data?.data;
  },
};

export default workforceReportService;
