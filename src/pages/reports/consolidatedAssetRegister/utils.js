export function formatInr(value) {
  const n = Number(value) || 0;
  return n.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
  });
}

export function formatInrCurrency(value) {
  return `₹ ${formatInr(value)}`;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 30, 50, 100];

export const EMPTY_SUMMARY = {
  asOf: null,
  asOfLabel: '—',
  consolidated: {
    asset_count: 0,
    acquisition_value: 0,
    total_depreciation: 0,
    book_value: 0,
  },
  institutions: [],
  byCampus: [],
  byDepartment: [],
  categoryDistribution: [],
  dataQuality: {
    departmentAllUnassigned: false,
    depreciationIsZero: false,
  },
};
