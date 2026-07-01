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
