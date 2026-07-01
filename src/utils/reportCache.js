import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
  setCache,
} from './apiCache';
import { assetRegisterService } from '../services/assetRegisterService';
import { assetLifecycleService } from '../services/assetLifecycleService';
import { maintenanceHistoryService } from '../services/maintenanceHistoryService';
import { breakdownHistoryService } from '../services/breakdownHistoryService';
import assetWorkflowHistoryService from '../services/assetWorkflowHistoryService';
import { assetValuationService } from '../services/assetValuationService';
import { reopenedBreakdownsService } from '../services/reopenedBreakdownsService';
import { slaReportService } from '../services/slaReportService';

export const REPORT_CACHE_TTL_MS = 5 * 60 * 1000;

export function buildReportDataKey(reportId, filters = {}) {
  let payload;
  try {
    payload = JSON.stringify(filters);
  } catch {
    payload = String(Date.now());
  }
  return buildCacheKey(['report', reportId, 'data', payload]);
}

export function buildReportFilterOptionsKey(reportId) {
  return buildCacheKey(['report', reportId, 'filter-options']);
}

export function buildReportSummaryKey(reportId) {
  return buildCacheKey(['report', reportId, 'summary']);
}

export function peekReportData(reportId, filters) {
  return peekCache(buildReportDataKey(reportId, filters), REPORT_CACHE_TTL_MS);
}

export function peekReportFilterOptions(reportId) {
  return peekCache(buildReportFilterOptionsKey(reportId), REPORT_CACHE_TTL_MS);
}

export function isBaseReportQuery(quick, advancedFetchKey, report) {
  if (advancedFetchKey !== '[]') return false;

  const defaults = {};
  (report?.quickFields || []).forEach((field) => {
    if (field.defaultValue !== undefined) {
      defaults[field.key] = field.defaultValue;
    }
  });

  return Object.entries(quick || {}).every(([key, value]) => {
    if (value === null || value === undefined || value === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    if (defaults[key] !== undefined && JSON.stringify(value) === JSON.stringify(defaults[key])) {
      return true;
    }
    return false;
  });
}

export async function fetchReportDataCached(
  reportId,
  filters,
  fetcher,
  { revalidate = false, force = false, onFresh } = {},
) {
  const key = buildReportDataKey(reportId, filters);

  if (force) {
    const data = await fetcher();
    setCache(key, data);
    onFresh?.(data);
    return { data, fromCache: false };
  }

  if (revalidate) {
    const cached = peekCache(key, REPORT_CACHE_TTL_MS);
    if (cached != null) {
      fetchWithRevalidate(key, fetcher, {
        ttlMs: REPORT_CACHE_TTL_MS,
        onFresh,
      }).catch(() => {});
      return { data: cached, fromCache: true };
    }
  }

  const { data, fromCache } = await fetchWithCache(key, fetcher, {
    ttlMs: REPORT_CACHE_TTL_MS,
  });
  onFresh?.(data);
  return { data, fromCache };
}

export async function fetchReportFilterOptionsCached(reportId, fetcher) {
  const key = buildReportFilterOptionsKey(reportId);
  const cached = peekCache(key, REPORT_CACHE_TTL_MS);

  if (cached != null) {
    fetchWithRevalidate(key, fetcher, { ttlMs: REPORT_CACHE_TTL_MS }).catch(() => {});
    return cached;
  }

  const { data } = await fetchWithCache(key, fetcher, { ttlMs: REPORT_CACHE_TTL_MS });
  return data;
}

export async function fetchReportSummaryCached(reportId, fetcher) {
  const key = buildReportSummaryKey(reportId);
  const cached = peekCache(key, REPORT_CACHE_TTL_MS);

  if (cached != null) {
    fetchWithRevalidate(key, fetcher, { ttlMs: REPORT_CACHE_TTL_MS }).catch(() => {});
    return cached;
  }

  const { data } = await fetchWithCache(key, fetcher, { ttlMs: REPORT_CACHE_TTL_MS });
  return data;
}

const BASE_REPORT_FILTERS = {
  'asset-register': { limit: 1000, offset: 0 },
  'asset-lifecycle': { limit: 1000, offset: 0 },
  'maintenance-history': { limit: 1000, offset: 0 },
  'breakdown-history': { limit: 1000, offset: 0 },
  'asset-workflow-history': { limit: 1000, offset: 0 },
  'asset-valuation': {
    includeScrapAssets: false,
    page: 1,
    limit: 1000,
  },
  'reopened-breakdowns': { orgId: null },
  'sla-report': { limit: 1000, offset: 0 },
};

const REPORT_APP_IDS = {
  ASSETLIFECYCLEREPORT: 'asset-lifecycle',
  ASSETREPORT: 'asset-register',
  MAINTENANCEHISTORY: 'maintenance-history',
  ASSETVALUATION: 'asset-valuation',
  ASSETWORKFLOWHISTORY: 'asset-workflow-history',
  BREAKDOWNHISTORY: 'breakdown-history',
  REOPENEDBREAKDOWNS: 'reopened-breakdowns',
  SLAREPORT: 'sla-report',
};

export function prefetchReportByAppId(appId) {
  const reportId = REPORT_APP_IDS[appId];
  if (!reportId) return;

  const baseFilters = BASE_REPORT_FILTERS[reportId];
  if (!baseFilters) return;

  const filterFetchers = {
    'asset-register': () => assetRegisterService.getFilterOptions().then((r) => r.data?.data ?? r.data),
    'asset-lifecycle': () => assetLifecycleService.getFilterOptions().then((r) => r.data?.data ?? r.data),
    'maintenance-history': () => maintenanceHistoryService.getFilterOptions().then((r) => r.data?.data ?? r.data),
    'breakdown-history': () => breakdownHistoryService.getFilterOptions().then((r) => r.data?.data ?? r.data),
    'asset-workflow-history': () => assetWorkflowHistoryService.getFilterOptions().then((r) => r.data?.data ?? r.data),
    'asset-valuation': () => assetValuationService.getFilterOptions().then((r) => r.data),
    'reopened-breakdowns': () => reopenedBreakdownsService.getFilterOptions(),
    'sla-report': () => slaReportService.getFilterOptions().then((r) => r.data?.data ?? r.data),
  };

  const dataFetchers = {
    'asset-register': () => assetRegisterService.getAssetRegister(baseFilters).then((r) => r.data?.data ?? r.data ?? []),
    'asset-lifecycle': () => assetLifecycleService.getAssetLifecycle(baseFilters).then((r) => r.data?.data ?? r.data ?? []),
    'maintenance-history': () => maintenanceHistoryService.getMaintenanceHistory(baseFilters).then((r) => (
      Array.isArray(r.data) ? r.data : (r.data?.data || [])
    )),
    'breakdown-history': () => breakdownHistoryService.getBreakdownHistory(baseFilters).then((r) => (
      Array.isArray(r.data) ? r.data : (r.data?.data || [])
    )),
    'asset-workflow-history': () => assetWorkflowHistoryService.getAssetWorkflowHistory(baseFilters).then((r) => r.data || []),
    'asset-valuation': () => assetValuationService.getAssetValuationData(baseFilters).then((r) => r.data || []),
    'reopened-breakdowns': () => {
      const oid = typeof localStorage !== 'undefined' ? localStorage.getItem('org_id') || 'ORG001' : 'ORG001';
      return reopenedBreakdownsService.getReopenedBreakdowns({ orgId: oid }).then((r) => r);
    },
    'sla-report': () => slaReportService.getSLAReport({ limit: 1000, offset: 0 }).then((r) => r.data?.data ?? []),
  };

  fetchReportFilterOptionsCached(reportId, filterFetchers[reportId]).catch(() => {});
  fetchReportDataCached(reportId, baseFilters, dataFetchers[reportId], { revalidate: true }).catch(() => {});

  if (reportId === 'asset-valuation') {
    fetchReportSummaryCached(reportId, () =>
      assetValuationService.getAssetValuationSummary().then((r) => r.data),
    ).catch(() => {});
  }
}

export async function loadReportData({
  reportId,
  apiFilters,
  quick,
  advancedFetchKey,
  report,
  fetcher,
  setLoading,
  setError,
  setAllRows,
  setAllAvailableAssets,
  onRowsLoaded,
  fallbackRows,
}) {
  const normalizeFetcherResult = (result) => {
    if (Array.isArray(result)) {
      return { rows: result, dropdownRows: result };
    }
    return {
      rows: result?.rows ?? result?.transformed ?? [],
      dropdownRows: result?.dropdownRows ?? result?.raw ?? result?.rows ?? result?.transformed ?? [],
    };
  };

  const apply = (result) => {
    const { rows, dropdownRows } = normalizeFetcherResult(result);
    setAllRows(rows);
    if (isBaseReportQuery(quick, advancedFetchKey, report)) {
      setAllAvailableAssets(dropdownRows);
    }
    onRowsLoaded?.(rows);
  };

  const cached = peekReportData(reportId, apiFilters);
  if (cached) {
    apply(cached);
    setLoading(false);
    setError(null);
    fetchReportDataCached(reportId, apiFilters, fetcher, {
      revalidate: true,
      onFresh: apply,
    }).catch(() => {});
    return;
  }

  setLoading(true);
  setError(null);
  try {
    const { data } = await fetchReportDataCached(reportId, apiFilters, fetcher, { force: true });
    apply(data);
  } catch (err) {
    setError(err.message || 'Failed to load report');
    const fallback = typeof fallbackRows === 'function' ? fallbackRows(err) : fallbackRows ?? [];
    apply(fallback);
  } finally {
    setLoading(false);
  }
}

export function invalidateReportCache(reportId) {
  if (reportId) {
    invalidateCache(`report:${reportId}:`);
    return;
  }
  invalidateCache('report:');
}
