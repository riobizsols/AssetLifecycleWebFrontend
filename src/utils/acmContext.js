import { useAcmContextStore } from '../store/useAcmContextStore';

/**
 * Central ACM Context Manager (frontend).
 * Active Organization / Branch / Department always come from the applied ACM selection —
 * never from the user profile's stored org/branch/dept IDs.
 */
export function getActiveAcmContext() {
  const s = useAcmContextStore.getState();
  return {
    orgId: s.appliedOrgId || null,
    branchId: s.appliedBranchId || null,
    deptId: s.appliedDeptId || null,
    currentOrganizationId: s.appliedOrgId || null,
    currentBranchId: s.appliedBranchId || null,
    currentDepartmentId: s.appliedDeptId || null,
  };
}

export function getActiveOrgId(fallback = null) {
  return useAcmContextStore.getState().appliedOrgId || fallback || null;
}

export function getActiveBranchId(fallback = null) {
  return useAcmContextStore.getState().appliedBranchId || fallback || null;
}

export function getActiveDeptId(fallback = null) {
  return useAcmContextStore.getState().appliedDeptId || fallback || null;
}
