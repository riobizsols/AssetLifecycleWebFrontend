import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  peekCache,
} from '../utils/apiCache';
import {
  fetchReportDataCached,
  fetchReportFilterOptionsCached,
  REPORT_CACHE_TTL_MS,
} from '../utils/reportCache';

function orgId() {
  return localStorage.getItem('org_id') || 'ORG001';
}

function buildReopenedParams(filters = {}) {
  const params = new URLSearchParams({ orgId: filters.orgId || orgId() });
  if (filters.assetId) params.set('assetId', filters.assetId);
  if (filters.assetTypeId) params.set('assetTypeId', filters.assetTypeId);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.deptId) params.set('deptId', filters.deptId);
  if (
    filters.reopenCountMin !== undefined &&
    filters.reopenCountMin !== null &&
    `${filters.reopenCountMin}`.trim() !== ''
  ) {
    params.set('reopenCountMin', String(filters.reopenCountMin));
  }
  if (filters.lastReopenedOnFrom) params.set('lastReopenedOnFrom', filters.lastReopenedOnFrom);
  if (filters.lastReopenedOnTo) params.set('lastReopenedOnTo', filters.lastReopenedOnTo);
  return params;
}

export const reopenedBreakdownsService = {
  async getFilterOptions() {
    return fetchReportFilterOptionsCached('reopened-breakdowns', async () => {
      const response = await API.get(
        `/breakdown-history/reopened-breakdowns/filter-options?orgId=${encodeURIComponent(orgId())}`,
      );
      return response.data?.filter_options || response.data?.data?.filter_options || {};
    });
  },

  async getReopenedBreakdowns(filters = {}, options = {}) {
    const apiFilters = { orgId: orgId(), ...filters };
    const fetchRaw = async () => {
      const response = await API.get(
        `/breakdown-history/reopened-breakdowns?${buildReopenedParams(apiFilters).toString()}`,
      );
      return response.data;
    };

    if (options.raw) {
      return fetchRaw();
    }

    const { data } = await fetchReportDataCached(
      'reopened-breakdowns',
      apiFilters,
      fetchRaw,
      options,
    );
    return data;
  },

  async getBrHistForAmsId(amsId, { revalidate = false, force = false } = {}) {
    const oid = orgId();
    const key = buildCacheKey(['report', 'reopened-breakdowns', 'hist', oid, amsId]);

    const fetcher = async () => {
      const response = await API.get(
        `/breakdown-history/reopened-breakdowns/${encodeURIComponent(amsId)}/history?orgId=${encodeURIComponent(oid)}`,
      );
      return response.data;
    };

    if (revalidate && !force) {
      const cached = peekCache(key, REPORT_CACHE_TTL_MS);
      if (cached) {
        fetchWithRevalidate(key, fetcher, { ttlMs: REPORT_CACHE_TTL_MS }).catch(() => {});
        return cached;
      }
    }

    const { data } = await fetchWithCache(key, fetcher, {
      ttlMs: REPORT_CACHE_TTL_MS,
      force: force || revalidate,
    });
    return data;
  },
};
