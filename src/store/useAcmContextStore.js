import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearCache } from '../utils/apiCache';

/**
 * Header ACM working context (org → branch → dept).
 * draft* = UI selection; applied* = sent as X-ACM-* headers after Save / default seed.
 * Applied values are the single source of truth for active org/branch/dept.
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
      /** True once login default (or user Save) has committed applied* for this session */
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

      /** Commit draft → applied filters and refresh data caches */
      applySelection: () => {
        const { draftOrgId, draftBranchId, draftDeptId } = get();
        set({
          appliedOrgId: draftOrgId || '',
          appliedBranchId: draftBranchId || '',
          appliedDeptId: draftDeptId || '',
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

      /**
       * Seed draft + applied from deterministic default (login / first ACM row).
       * Does not force a full page reload — callers decide.
       */
      seedAndApply: ({ orgId, branchId, deptId } = {}, { emitEvent = true } = {}) => {
        const o = orgId || '';
        const b = branchId || '';
        const d = deptId || '';
        if (!o) return false;
        set({
          draftOrgId: o,
          draftBranchId: b,
          draftDeptId: d,
          appliedOrgId: o,
          appliedBranchId: b,
          appliedDeptId: d,
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
          hasAppliedContext: false,
        }),
    }),
    {
      name: 'acm-context-storage',
      // Persist only applied context so refresh keeps selection; login/logout reset via auth store
      partialize: (state) => ({
        draftOrgId: state.draftOrgId,
        draftBranchId: state.draftBranchId,
        draftDeptId: state.draftDeptId,
        appliedOrgId: state.appliedOrgId,
        appliedBranchId: state.appliedBranchId,
        appliedDeptId: state.appliedDeptId,
        hasAppliedContext: state.hasAppliedContext,
      }),
    }
  )
);
