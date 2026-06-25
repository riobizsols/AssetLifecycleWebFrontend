import API from '../lib/axios';
import { fetchWithCache, fetchWithRevalidate, peekCache } from '../utils/apiCache';
import { useAssetsStore } from '../store/useAssetsStore';

const TTL_MS = 10 * 60 * 1000;
const KEYS = {
  prodserv: 'add-form:prodserv',
  docTypes: 'add-form:doc-types',
  vendorsProduct: 'add-form:vendors-product',
  vendorsService: 'add-form:vendors-service',
};

export function normalizeDocumentTypes(raw) {
  const rows = Array.isArray(raw) ? raw : raw?.data;
  if (!Array.isArray(rows)) return [];
  return rows.map((docType) => ({
    id: docType.dto_id,
    text: docType.doc_type_text,
    doc_type: docType.doc_type,
  }));
}

export function getCachedAddFormData() {
  return {
    prodserv: peekCache(KEYS.prodserv, TTL_MS),
    docTypes: normalizeDocumentTypes(peekCache(KEYS.docTypes, TTL_MS)),
    vendorsProduct: peekCache(KEYS.vendorsProduct, TTL_MS),
    vendorsService: peekCache(KEYS.vendorsService, TTL_MS),
    existingAssets: peekCache('assets:all', TTL_MS),
  };
}

export function prefetchAddAssetFormData() {
  const tasks = [
    useAssetsStore.getState().fetchExistingAssets({ revalidate: true }),
    fetchWithRevalidate(KEYS.prodserv, async () => {
      const res = await API.get('/prodserv');
      return Array.isArray(res.data) ? res.data : [];
    }, { ttlMs: TTL_MS }),
    fetchWithRevalidate(KEYS.docTypes, async () => {
      const res = await API.get('/doc-type-objects/object-type/asset');
      return normalizeDocumentTypes(res.data?.data ? res.data : res.data);
    }, { ttlMs: TTL_MS }),
    fetchWithRevalidate(KEYS.vendorsProduct, async () => {
      const res = await API.get('/get-vendors', { params: { type: 'product' } });
      return Array.isArray(res.data) ? res.data : [];
    }, { ttlMs: TTL_MS }),
    fetchWithRevalidate(KEYS.vendorsService, async () => {
      const res = await API.get('/get-vendors', { params: { type: 'service' } });
      return Array.isArray(res.data) ? res.data : [];
    }, { ttlMs: TTL_MS }),
  ];

  Promise.all(tasks).catch((err) => {
    console.warn('[prefetchAddAssetFormData]', err);
  });
}

export async function loadProdServs({ revalidate = false, onFresh } = {}) {
  const fetcher = async () => {
    const res = await API.get('/prodserv');
    return Array.isArray(res.data) ? res.data : [];
  };
  if (revalidate) {
    const { data } = await fetchWithRevalidate(KEYS.prodserv, fetcher, { ttlMs: TTL_MS, onFresh });
    return data;
  }
  const { data } = await fetchWithCache(KEYS.prodserv, fetcher, { ttlMs: TTL_MS });
  return data;
}

export async function loadDocumentTypes({ revalidate = false, onFresh } = {}) {
  const fetcher = async () => {
    const res = await API.get('/doc-type-objects/object-type/asset');
    return normalizeDocumentTypes(res.data?.success ? res.data.data : res.data);
  };
  if (revalidate) {
    const { data } = await fetchWithRevalidate(KEYS.docTypes, fetcher, { ttlMs: TTL_MS, onFresh });
    return data;
  }
  const { data } = await fetchWithCache(KEYS.docTypes, fetcher, { ttlMs: TTL_MS });
  return data;
}

export async function loadVendorsByType(type, { revalidate = false, onFresh } = {}) {
  const key = type === 'service' ? KEYS.vendorsService : KEYS.vendorsProduct;
  const fetcher = async () => {
    const res = await API.get('/get-vendors', { params: { type } });
    return Array.isArray(res.data) ? res.data : [];
  };
  if (revalidate) {
    const { data } = await fetchWithRevalidate(key, fetcher, { ttlMs: TTL_MS, onFresh });
    return data;
  }
  const { data } = await fetchWithCache(key, fetcher, { ttlMs: TTL_MS });
  return data;
}

export { KEYS as ADD_FORM_CACHE_KEYS };
