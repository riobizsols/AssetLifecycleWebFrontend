import { useCallback, useEffect, useState } from 'react';
import API from '../lib/axios';

/**
 * Loads tblACM data-access scope for the current user (respects X-ACM-* headers).
 */
export function useAcmScope() {
  const [acm, setAcm] = useState(null);
  const [acmFilter, setAcmFilter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/acm/me');
      setAcm(res.data?.acm || null);
      setAcmFilter(res.data?.acmFilter || res.data?.acm || null);
    } catch (err) {
      console.error('Failed to load ACM scope', err);
      setError(err);
      setAcm(null);
      setAcmFilter(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const onChanged = () => refresh();
    window.addEventListener('acm-context-changed', onChanged);
    return () => window.removeEventListener('acm-context-changed', onChanged);
  }, [refresh]);

  const active = acmFilter || acm;
  const canWrite = Boolean(active?.canWrite);
  const canRead = Boolean(active?.canRead);
  const canChangeBranch = Boolean(
    active?.allBranches || (Array.isArray(active?.branchIds) && active.branchIds.length > 1)
  );

  return {
    acm,
    acmFilter: active,
    loading,
    error,
    refresh,
    canWrite,
    canRead,
    canChangeBranch,
    allOrgs: Boolean(active?.allOrgs),
    allBranches: Boolean(active?.allBranches),
    allDepts: Boolean(active?.allDepts),
    orgIds: active?.orgIds || [],
    branchIds: active?.branchIds || [],
    deptIds: active?.deptIds || [],
    accessLevel: canWrite ? 'Write' : canRead ? 'Read' : null,
  };
}

export default useAcmScope;
