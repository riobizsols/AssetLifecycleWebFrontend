import { create } from 'zustand';
import API from '../lib/axios';
import {
  buildCacheKey,
  fetchWithCache,
  fetchWithRevalidate,
  invalidateCache,
  peekCache,
} from '../utils/apiCache';

const TTL_MS = 3 * 60 * 1000;

const KEYS = {
  certificates: 'certifications:tech-certs',
  assetTypes: 'certifications:asset-types-maint',
  maintTypes: 'certifications:maint-types',
  inspectionCerts: 'certifications:inspection-certs',
  documentTypes: 'certifications:doc-types-inspection',
};

export { TTL_MS as CERTIFICATIONS_TTL_MS, KEYS as CERTIFICATIONS_CACHE_KEYS };

function parseApiList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function cachedFetch(key, fetcher, { revalidate = false, force = false, onFresh } = {}) {
  if (revalidate && !force) {
    const cached = peekCache(key, TTL_MS);
    if (cached) onFresh?.(cached);
    const { data } = await fetchWithRevalidate(key, fetcher, {
      ttlMs: TTL_MS,
      onFresh,
    });
    return data;
  }
  const { data } = await fetchWithCache(key, fetcher, {
    ttlMs: TTL_MS,
    force: force || revalidate,
  });
  onFresh?.(data);
  return data;
}

export const useCertificationsStore = create((set, get) => ({
  fetchCertificates: (opts = {}) =>
    cachedFetch(
      KEYS.certificates,
      async () => {
        const res = await API.get('/tech-certificates');
        return res.data?.data || [];
      },
      opts,
    ),

  fetchAssetTypes: (opts = {}) =>
    cachedFetch(
      KEYS.assetTypes,
      async () => {
        const res = await API.get('/asset-types/maint-required');
        return parseApiList(res.data);
      },
      opts,
    ),

  fetchMaintTypes: (opts = {}) =>
    cachedFetch(
      KEYS.maintTypes,
      async () => {
        const res = await API.get('/maint-types');
        return parseApiList(res.data);
      },
      opts,
    ),

  fetchInspectionCertificates: (opts = {}) =>
    cachedFetch(
      KEYS.inspectionCerts,
      async () => {
        const res = await API.get('/asset-types/inspection-certificates');
        return parseApiList(res.data);
      },
      opts,
    ),

  fetchDocumentTypes: (opts = {}) =>
    cachedFetch(
      KEYS.documentTypes,
      async () => {
        const res = await API.get('/doc-type-objects/object-type/inspection certificate');
        if (res.data?.success && Array.isArray(res.data.data)) {
          return res.data.data.map((docType) => ({
            id: docType.dto_id,
            text: docType.doc_type_text,
            doc_type: docType.doc_type,
          }));
        }
        return [];
      },
      opts,
    ),

  fetchMappedCertificates: (assetTypeId, opts = {}) => {
    if (!assetTypeId) return Promise.resolve([]);
    const key = buildCacheKey(['certifications:mapped', assetTypeId]);
    return cachedFetch(
      key,
      async () => {
        const res = await API.get(`/asset-types/${assetTypeId}/maintenance-certificates`);
        return parseApiList(res.data);
      },
      opts,
    );
  },

  fetchMaintFrequencies: (assetTypeId, opts = {}) => {
    if (!assetTypeId) return Promise.resolve([]);
    const key = buildCacheKey(['certifications:maint-freq', assetTypeId]);
    return cachedFetch(
      key,
      async () => {
        const res = await API.get(`/maintenance-frequencies/asset-type/${assetTypeId}`);
        return parseApiList(res.data);
      },
      opts,
    );
  },

  prefetchCertifications: () => {
    const s = get();
    Promise.all([
      s.fetchCertificates({ revalidate: true }),
      s.fetchAssetTypes({ revalidate: true }),
      s.fetchMaintTypes({ revalidate: true }),
      s.fetchInspectionCertificates({ revalidate: true }),
      s.fetchDocumentTypes({ revalidate: true }),
    ]).catch(() => {});
  },

  invalidateCertificationsCache: () => {
    invalidateCache('certifications:');
  },
}));
