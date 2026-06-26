/**
 * Client-side table filtering for ContentBox list screens.
 * Supports column multi-select, date ranges, and global search.
 */

const DEFAULT_DATE_FIELDS = [
  'raw_expiry_date',
  'expiry_date',
  'raw_purchased_on',
  'purchased_on',
  'raw_scheduled_date',
  'scheduled_date',
  'raw_pl_sch_date',
  'pl_sch_date',
  'raw_act_maint_st_date',
  'act_maint_st_date',
  'raw_act_insp_st_date',
  'act_insp_st_date',
  'raw_created_on',
  'created_on',
  'raw_created_date',
  'created_date',
  'raw_changed_date',
  'changed_date',
  'raw_sale_date',
  'sale_date',
  'raw_collection_date',
  'collection_date',
  'raw_changed_on',
  'changed_on',
  'raw_maintenance_created_on',
  'maintenance_created_on',
  'raw_maintenance_changed_on',
  'maintenance_changed_on',
];

function isEmptyFilterValue(value) {
  if (value == null || value === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

function startOfDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseFlexibleDate(raw) {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw;
  }
  if (typeof raw === 'number') {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const str = String(raw).trim();
  if (!str || str === '-' || str === 'N/A') return null;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getItemDateValue(item, field) {
  if (!field || !item) return null;
  const rawKey = field.startsWith('raw_') ? field : `raw_${field}`;
  return (
    parseFlexibleDate(item[rawKey])
    ?? parseFlexibleDate(item[field])
  );
}

function getDateFieldCandidates(filterValues, visibleColumns) {
  const candidates = [];

  if (filterValues?.dateField) {
    candidates.push(filterValues.dateField);
  }

  if (Array.isArray(visibleColumns)) {
    visibleColumns.forEach((col) => {
      if (!col?.name) return;
      const name = col.name;
      const lower = name.toLowerCase();
      if (
        lower.includes('date')
        || lower.endsWith('_on')
        || lower.includes('scheduled')
        || lower.includes('expiry')
        || lower.includes('warranty')
      ) {
        candidates.push(name);
        candidates.push(`raw_${name}`);
      }
    });
  }

  candidates.push(...DEFAULT_DATE_FIELDS);
  return [...new Set(candidates.filter(Boolean))];
}

function matchesDateRange(item, fromDate, toDate, filterValues, visibleColumns) {
  if (!fromDate && !toDate) return true;

  const from = fromDate ? startOfDay(fromDate) : null;
  const to = toDate ? endOfDay(toDate) : null;
  const fields = getDateFieldCandidates(filterValues, visibleColumns);

  for (const field of fields) {
    const itemDate = getItemDateValue(item, field);
    if (!itemDate) continue;

    if (from && itemDate < from) continue;
    if (to && itemDate > to) continue;
    return true;
  }

  return false;
}

function normalizeSelectedValues(value) {
  if (Array.isArray(value)) {
    return value.filter((v) => v != null && String(v).trim() !== '');
  }
  if (value == null || value === '') return [];
  return [value];
}

function cellMatchesFilter(item, column, selectedValues) {
  const colValue = item[column];

  if (colValue && typeof colValue === 'object' && colValue.days !== undefined) {
    const label = `${colValue.days} days`;
    return selectedValues.some((sel) => String(sel) === label || String(sel) === String(colValue.days));
  }

  if (colValue === null || colValue === undefined || colValue === '') {
    return selectedValues.some((sel) => sel === 'N/A' || sel === '' || sel === '-');
  }

  const colStr = String(colValue).toLowerCase();
  return selectedValues.some((sel) => {
    const selStr = String(sel).toLowerCase().trim();
    if (!selStr) return false;
    return colStr === selStr || colStr.includes(selStr);
  });
}

function matchesColumnFilters(item, columnFilters) {
  if (!Array.isArray(columnFilters) || columnFilters.length === 0) return true;

  return columnFilters.every((filter) => {
    if (!filter?.column) return true;

    const selectedValues = normalizeSelectedValues(filter.value);
    if (selectedValues.length === 0) return true;

    return cellMatchesFilter(item, filter.column, selectedValues);
  });
}

function matchesGlobalSearch(item, searchTerm, visibleColumns) {
  const term = String(searchTerm).toLowerCase().trim();
  if (!term) return true;

  const columnNames = Array.isArray(visibleColumns) && visibleColumns.length > 0
    ? visibleColumns
      .filter((col) => col.visible !== false && col.name)
      .map((col) => col.name)
    : Object.keys(item);

  return columnNames.some((col) => {
    const val = item[col];
    if (val == null) return false;
    if (typeof val === 'object') {
      return JSON.stringify(val).toLowerCase().includes(term);
    }
    return String(val).toLowerCase().includes(term);
  });
}

export const filterData = (data, filterValues, visibleColumns) => {
  if (!data || !Array.isArray(data)) return [];
  if (!filterValues || typeof filterValues !== 'object') return data;

  const {
    columnFilters = [],
    fromDate = '',
    toDate = '',
    search = '',
  } = filterValues;

  const hasColumnFilters = Array.isArray(columnFilters) && columnFilters.some(
    (f) => f?.column && normalizeSelectedValues(f.value).length > 0,
  );
  const hasDateFilter = Boolean(fromDate || toDate);
  const hasSearch = Boolean(String(search).trim());

  if (!hasColumnFilters && !hasDateFilter && !hasSearch) {
    return data;
  }

  return data.filter((item) => {
    if (hasSearch && !matchesGlobalSearch(item, search, visibleColumns)) {
      return false;
    }

    if (hasColumnFilters && !matchesColumnFilters(item, columnFilters)) {
      return false;
    }

    if (hasDateFilter && !matchesDateRange(item, fromDate, toDate, filterValues, visibleColumns)) {
      return false;
    }

    return true;
  });
};

/** Attach raw_* copies before formatting display date fields. */
export function withRawDateFields(item, dateKeys) {
  if (!item || typeof item !== 'object') return item;
  const out = { ...item };
  dateKeys.forEach((key) => {
    if (item[key] != null && item[key] !== '') {
      out[`raw_${key}`] = item[key];
    }
  });
  return out;
}
