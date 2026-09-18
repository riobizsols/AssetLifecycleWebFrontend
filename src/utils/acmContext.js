/**
 * Single-DB frontend org helpers.
 * Root AssetLifecycleWebFrontend is not multi-tenant — prefer the caller's
 * fallback (usually user.org_id). No ACM header / context selector required.
 */

export function getActiveAcmContext() {
  return {
    orgId: null,
    branchId: null,
    deptId: null,
    currentOrganizationId: null,
    currentBranchId: null,
    currentDepartmentId: null,
  };
}

export function getActiveOrgId(fallback = null) {
  return fallback || null;
}

export function getActiveBranchId(fallback = null) {
  return fallback || null;
}

export function getActiveDeptId(fallback = null) {
  return fallback || null;
}
