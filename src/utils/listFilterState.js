/**
 * Shared filter state updates for ContentBox list screens.
 */
export function applyListFilterChange(prev, columnName, value) {
  const base = prev || { columnFilters: [], fromDate: '', toDate: '' };

  if (columnName === 'columnFilters') {
    return { ...base, columnFilters: value };
  }

  if (
    columnName === 'fromDate'
    || columnName === 'toDate'
    || columnName === 'dateField'
    || columnName === 'search'
  ) {
    return { ...base, [columnName]: value };
  }

  const nextFilters = (base.columnFilters || []).filter((f) => f.column !== columnName);
  if (value != null && value !== '') {
    const normalizedValue = Array.isArray(value) ? value : [value];
    nextFilters.push({ column: columnName, value: normalizedValue });
  }

  return { ...base, columnFilters: nextFilters };
}

/** True when any list filter (column, date, or search) is actively set. */
export function hasActiveListFilters(filterValues) {
  if (!filterValues || typeof filterValues !== 'object') return false;

  const {
    columnFilters = [],
    fromDate = '',
    toDate = '',
    search = '',
  } = filterValues;

  if (fromDate || toDate) return true;
  if (String(search).trim()) return true;

  if (!Array.isArray(columnFilters)) return false;

  return columnFilters.some((filter) => {
    if (!filter?.column) return false;
    const value = filter.value;
    if (Array.isArray(value)) return value.length > 0;
    return value != null && value !== '';
  });
}

export const EMPTY_LIST_FILTERS = {
  columnFilters: [],
  fromDate: '',
  toDate: '',
};
