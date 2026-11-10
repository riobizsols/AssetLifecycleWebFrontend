import API from '../lib/axios';

export const upcomingMaintenanceScheduleReportService = {
  getOptions: async () => {
    const res = await API.get('/upcoming-maintenance-schedule-report/options');
    return res.data?.data || { asset_types: [], schedule_statuses: [] };
  },

  viewReport: async (payload) => {
    const res = await API.post('/upcoming-maintenance-schedule-report/view', payload);
    return res.data?.data;
  },

  exportReport: async (payload) => {
    const res = await API.post('/upcoming-maintenance-schedule-report/export', payload, {
      responseType: 'blob',
    });
    return res.data;
  },
};

export default upcomingMaintenanceScheduleReportService;
