import API from '../lib/axios';

const toCsv = (value) => {
  if (value == null || value === '') return undefined;
  if (Array.isArray(value)) return value.length ? value.join(',') : undefined;
  return String(value);
};

const buildParams = (filters = {}) => {
  const params = {};
  const category = toCsv(filters.category);
  const brand = toCsv(filters.brand);
  const currentStatus = toCsv(filters.currentStatus);
  if (category) params.category = category;
  if (brand) params.brand = brand;
  if (currentStatus) params.currentStatus = currentStatus;

  const range = filters.purchaseDateRange || {};
  if (range.from) params.purchaseDateFrom = range.from;
  if (range.to) params.purchaseDateTo = range.to;
  return params;
};

export const sparePartsReportService = {
  async getFilterOptions() {
    const res = await API.get('/spare-parts/report/filter-options');
    return res.data;
  },

  async getReport(filters = {}) {
    const res = await API.get('/spare-parts/report', { params: buildParams(filters) });
    return res.data;
  },
};
