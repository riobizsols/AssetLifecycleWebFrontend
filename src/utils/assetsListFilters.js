/**
 * Map ContentBox filter state to GET /api/assets query params (server-side scope).
 * Unsupported column filters stay client-side on the current result page.
 */

const SERVER_FILTER_COLUMNS = new Set(['asset_type_id', 'text', 'current_status']);

function normalizeSelectedValues(value) {
  if (Array.isArray(value)) {
    return value.filter((v) => v != null && String(v).trim() !== '');
  }
  if (value == null || value === '') return [];
  return [value];
}

function resolveAssetTypeIds(values, assetTypes = []) {
  if (!values.length) return [];

  const byId = new Map(
    (assetTypes || []).map((at) => [String(at.asset_type_id), at]),
  );
  const byExactName = new Map();
  const byLowerName = new Map();
  (assetTypes || []).forEach((at) => {
    const name = String(at.text || '').trim();
    if (!name) return;
    if (!byExactName.has(name)) byExactName.set(name, []);
    byExactName.get(name).push(at.asset_type_id);
    const lower = name.toLowerCase();
    if (!byLowerName.has(lower)) byLowerName.set(lower, []);
    byLowerName.get(lower).push(at.asset_type_id);
  });

  const ids = [];
  values.forEach((raw) => {
    const str = String(raw).trim();
    if (!str) return;
    if (byId.has(str)) {
      ids.push(str);
      return;
    }
    // Asset type names are case-sensitive ("Bus" and "bus" can be different types).
    const exact = byExactName.get(str);
    if (exact) {
      ids.push(...exact);
      return;
    }
    const loose = byLowerName.get(str.toLowerCase());
    if (loose?.length === 1) ids.push(loose[0]);
  });

  return [...new Set(ids)];
}

/** @returns {{ serverParams: Record<string, string>, clientFilters: Array }} */
export function buildAssetsListFilters(filterValues, assetTypes = []) {
  const serverParams = {};
  const clientFilters = [];

  if (!filterValues || typeof filterValues !== 'object') {
    return { serverParams, clientFilters };
  }

  const searchTerm = String(filterValues.search || '').trim();
  if (searchTerm) {
    serverParams.search = searchTerm;
  }

  (filterValues.columnFilters || []).forEach((filter) => {
    if (!filter?.column) return;

    const selected = normalizeSelectedValues(filter.value);
    if (selected.length === 0) return;

    if (filter.column === 'asset_type_id' || filter.column === 'text') {
      const ids = resolveAssetTypeIds(selected, assetTypes);
      if (ids.length) {
        serverParams.asset_type_id = ids.join(',');
      }
      return;
    }

    if (filter.column === 'current_status') {
      serverParams.status = selected.join(',');
      return;
    }

    if (SERVER_FILTER_COLUMNS.has(filter.column)) {
      return;
    }

    clientFilters.push(filter);
  });

  return { serverParams, clientFilters };
}

export function hasServerSideAssetFilters(serverParams) {
  return Boolean(
    serverParams?.asset_type_id
    || serverParams?.status
    || serverParams?.search,
  );
}
