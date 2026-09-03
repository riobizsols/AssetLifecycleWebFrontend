import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearCache } from '../utils/apiCache';

/** @typedef {'org' | 'branch' | 'dept'} AcmScopeLevel */

function resolveScopeLevel(scopeLevel, { branchId, deptId } = {}) {
  if (scopeLevel === 'dept' && deptId) return 'dept';
  if ((scopeLevel === 'branch' || scopeLevel === 'dept') && branchId) return 'branch';
  return 'org';
}

function scopeFieldsForLevel(level, { orgId, branchId, deptId }) {
  return {
    appliedOrgId: orgId || '',
    appliedBranchId: level === 'branch' || level === 'dept' ? (branchId || '') : '',
    appliedDeptId: level === 'dept' ? (deptId || '') : '',
    appliedScopeLevel: level,
  };
}

/**
 * Header ACM working context (org → branch → dept).
 * draft* = UI selection; applied* = sent as X-ACM-* headers after Save / default seed.
 * appliedScopeLevel controls which headers are sent (branch save must not send dept).
 */
export const useAcmContextStore = create(
  persist(
    (set, get) => ({
      draftOrgId: '',
      draftBranchId: '',
      draftDeptId: '',
      appliedOrgId: '',
      appliedBranchId: '',
      appliedDeptId: '',
      /** @type {AcmScopeLevel} */
      appliedScopeLevel: 'org',
      hasAppliedContext: false,

      setDraftOrgId: (orgId) =>
        set({
          draftOrgId: orgId || '',
          draftBranchId: '',
          draftDeptId: '',
        }),

      setDraftBranchId: (branchId) =>
        set({
          draftBranchId: branchId || '',
          draftDeptId: '',
        }),

      setDraftDeptId: (deptId) => set({ draftDeptId: deptId || '' }),

      syncDraftFromApplied: () => {
        const { appliedOrgId, appliedBranchId, appliedDeptId, appliedScopeLevel } = get();
        const level = appliedScopeLevel || 'org';
        set({
          draftOrgId: appliedOrgId || '',
          draftBranchId: level === 'branch' || level === 'dept' ? (appliedBranchId || '') : '',
          draftDeptId: level === 'dept' ? (appliedDeptId || '') : '',
        });
      },

      /** @param {AcmScopeLevel} scopeLevel */
      applySelection: (scopeLevel = 'org') => {
        const { draftOrgId, draftBranchId, draftDeptId } = get();
        const level = resolveScopeLevel(scopeLevel, {
          branchId: draftBranchId,
          deptId: draftDeptId,
        });

        set({
          ...scopeFieldsForLevel(level, {
            orgId: draftOrgId,
            branchId: draftBranchId,
            deptId: draftDeptId,
          }),
          draftBranchId: level === 'branch' || level === 'dept' ? (draftBranchId || '') : '',
          draftDeptId: level === 'dept' ? (draftDeptId || '') : '',
          hasAppliedContext: Boolean(draftOrgId),
        });

        try {
          clearCache();
        } catch (_) {
          /* ignore */
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('acm-context-changed'));
        }
      },

      seedAndApply: ({ orgId, branchId, deptId } = {}, { emitEvent = true, scopeLevel } = {}) => {
        const o = orgId || '';
        const b = branchId || '';
        const d = deptId || '';
        if (!o) return false;

        const level = resolveScopeLevel(scopeLevel || (d ? 'dept' : b ? 'branch' : 'org'), {
          branchId: b,
          deptId: d,
        });

        set({
          draftOrgId: o,
          draftBranchId: level === 'branch' || level === 'dept' ? b : '',
          draftDeptId: level === 'dept' ? d : '',
          ...scopeFieldsForLevel(level, { orgId: o, branchId: b, deptId: d }),
          hasAppliedContext: true,
        });

        try {
          clearCache();
        } catch (_) {
          /* ignore */
        }
        if (emitEvent && typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('acm-context-changed'));
        }
        return true;
      },

      reset: () =>
        set({
          draftOrgId: '',
          draftBranchId: '',
          draftDeptId: '',
          appliedOrgId: '',
          appliedBranchId: '',
          appliedDeptId: '',
          appliedScopeLevel: 'org',
          hasAppliedContext: false,
        }),
    }),
    {
      name: 'acm-context-storage',
      partialize: (state) => ({
        draftOrgId: state.draftOrgId,
        draftBranchId: state.draftBranchId,
        draftDeptId: state.draftDeptId,
        appliedOrgId: state.appliedOrgId,
        appliedBranchId: state.appliedBranchId,
        appliedDeptId: state.appliedDeptId,
        appliedScopeLevel: state.appliedScopeLevel,
        hasAppliedContext: state.hasAppliedContext,
      }),
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted || {}) };
        if (!merged.appliedScopeLevel) {
          merged.appliedScopeLevel = merged.appliedDeptId
            ? 'dept'
            : merged.appliedBranchId
              ? 'branch'
              : 'org';
        }
        return merged;
      },
    }
  )
);

export function getAppliedAcmHeaders(state) {
  const level = state.appliedScopeLevel
    || (state.appliedDeptId ? 'dept' : state.appliedBranchId ? 'branch' : 'org');

  const headers = {};
  if (state.appliedOrgId) headers['X-ACM-Org-Id'] = state.appliedOrgId;
  if ((level === 'branch' || level === 'dept') && state.appliedBranchId) {
    headers['X-ACM-Branch-Id'] = state.appliedBranchId;
  }
  if (level === 'dept' && state.appliedDeptId) {
    headers['X-ACM-Dept-Id'] = state.appliedDeptId;
  }
  return headers;
}
