import API from '../lib/axios';

const data = (res) => res.data?.data;

export const utilityService = {
  getLookups: async () => data(await API.get('/utilities/lookups')),

  listHeaders: async () => data(await API.get('/utilities/headers')),
  getHeader: async (utilId) => data(await API.get(`/utilities/headers/${encodeURIComponent(utilId)}`)),
  createHeader: async (payload) => data(await API.post('/utilities/headers', payload)),
  updateHeader: async (utilId, payload) =>
    data(await API.put(`/utilities/headers/${encodeURIComponent(utilId)}`, payload)),
  deleteHeader: async (utilId) =>
    data(await API.delete(`/utilities/headers/${encodeURIComponent(utilId)}`)),

  listDetails: async () => data(await API.get('/utilities/details')),
  createDetail: async (payload) => data(await API.post('/utilities/details', payload)),
  updateDetail: async (utildId, payload) =>
    data(await API.put(`/utilities/details/${encodeURIComponent(utildId)}`, payload)),
  deleteDetail: async (utildId) =>
    data(await API.delete(`/utilities/details/${encodeURIComponent(utildId)}`)),

  listAssetTypes: async () => data(await API.get('/utilities/asset-types')),
  listMappings: async () => data(await API.get('/utilities/mappings')),
  createMapping: async (payload) => data(await API.post('/utilities/mappings', payload)),
  deleteMapping: async (atumId) =>
    data(await API.delete(`/utilities/mappings/${encodeURIComponent(atumId)}`)),

  listConsumptions: async (params = {}) =>
    data(await API.get('/utilities/consumptions', { params })),
  previewConsumption: async (payload) =>
    data(await API.post('/utilities/consumptions/preview', payload)),
  createConsumption: async (payload) =>
    data(await API.post('/utilities/consumptions', payload)),
};

export default utilityService;
