import API from '../lib/axios';

const data = (res) => res.data?.data;
const id = (value) => encodeURIComponent(value);

export const consumableService = {
  getLookups: async () => data(await API.get('/consumables/lookups')),
  listAlerts: async () => data(await API.get('/consumables/alerts')),

  listConsumables: async () => data(await API.get('/consumables/items')),
  createConsumable: async (payload) => data(await API.post('/consumables/items', payload)),
  updateConsumable: async (consumId, payload) =>
    data(await API.put(`/consumables/items/${id(consumId)}`, payload)),
  deleteConsumable: async (consumId) => data(await API.delete(`/consumables/items/${id(consumId)}`)),

  listInventory: async (params = {}) => data(await API.get('/consumables/inventory', { params })),
  createInventory: async (payload) => data(await API.post('/consumables/inventory', payload)),
  updateInventory: async (cinvenId, payload) =>
    data(await API.put(`/consumables/inventory/${id(cinvenId)}`, payload)),
  getInventoryHistory: async (cinvenId) =>
    data(await API.get(`/consumables/inventory/${id(cinvenId)}/history`)),
  deleteInventory: async (cinvenId) =>
    data(await API.delete(`/consumables/inventory/${id(cinvenId)}`)),

  listUsage: async (params = {}) => data(await API.get('/consumables/usage', { params })),
  createUsage: async (payload) => data(await API.post('/consumables/usage', payload)),
  updateUsage: async (cusageId, payload) =>
    data(await API.put(`/consumables/usage/${id(cusageId)}`, payload)),
  deleteUsage: async (cusageId) => data(await API.delete(`/consumables/usage/${id(cusageId)}`)),

  getReportOptions: async () => data(await API.get('/consumables/report/options')),
  getReport: async (filters = {}) => {
    const params = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        if (value.length) params[key] = value.join(',');
      } else if (value != null && value !== '') {
        params[key] = value;
      }
    });
    return data(await API.get('/consumables/report', { params }));
  },
};

export const apiError = (err, fallback) => err?.response?.data?.error || fallback;

export default consumableService;
