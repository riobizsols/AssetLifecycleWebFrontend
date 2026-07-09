import API from '../lib/axios';
import { invalidateCache } from './apiCache';
import { useAssetTypeStore } from '../store/useAssetTypeStore';

/** Clear frontend asset-type caches and refetch master list + assignment dropdown data. */
export async function refreshAssetTypeCaches() {
  invalidateCache('asset-types:');
  invalidateCache('assignment:asset-types');

  const listPromise = useAssetTypeStore.getState().fetchAssetTypes({ force: true });
  const assignmentPromise = API.get('/dept-assets/asset-types').catch(() => null);

  const [list, assignmentRes] = await Promise.all([listPromise, assignmentPromise]);
  const assignmentTypes = assignmentRes?.data && Array.isArray(assignmentRes.data)
    ? assignmentRes.data
    : null;

  return { list, assignmentTypes };
}
