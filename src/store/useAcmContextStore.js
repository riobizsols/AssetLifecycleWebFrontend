import { create } from 'zustand';

/**
 * Minimal stub for single-DB frontend.
 * Keeps imports from stores/components working without ACM org/branch/dept switching.
 * Active org should come from the logged-in user (see getActiveOrgId fallbacks).
 */
export const useAcmContextStore = create(() => ({
  draftOrgId: '',
  draftBranchId: '',
  draftDeptId: '',
  appliedOrgId: '',
  appliedBranchId: '',
  appliedDeptId: '',
  appliedScopeLevel: 'org',
  hasAppliedContext: false,

  setDraftOrgId: () => {},
  setDraftBranchId: () => {},
  setDraftDeptId: () => {},
  syncDraftFromApplied: () => {},
  applySelection: () => {},
  seedAndApply: () => false,
  reset: () => {},
}));

export function getAppliedAcmHeaders() {
  return {};
}
