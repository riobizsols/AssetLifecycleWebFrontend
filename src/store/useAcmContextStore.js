import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { clearCache } from '../utils/apiCache';

/**
 * Header ACM working context (org → branch → dept).
 * draft* = UI selection; applied* = sent as X-ACM-* headers after Save / default seed.
 * Applied values are the single source of truth for active org/branch/dept.
 * applied*Label / appliedAccessLevel avoid flashing raw IDs while options load.
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
      appliedOrgLabel: '',
      appliedBranchLabel: '',
      appliedDeptLabel: '',
      appliedAccessLevel: '',
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

      /** Discard unsaved draft picks and restore draft to the last applied (saved) context */
      discardDraft: () => {
        const { appliedOrgId, appliedBranchId, appliedDeptId } = get();
        set({
          draftOrgId: appliedOrgId || '',
          draftBranchId: appliedBranchId || '',
          draftDeptId: appliedDeptId || '',
        });
      },

      /**
       * Commit draft → applied filters and refresh data caches.
       * Pass labels/access from the selector so the closed trigger never flashes IDs.
       */
      applySelection: (meta = {}) => {
        const { draftOrgId, draftBranchId, draftDeptId } = get();
        set({
          appliedOrgId: draftOrgId || '',
          appliedBranchId: draftBranchId || '',
          appliedDeptId: draftDeptId || '',
          appliedOrgLabel: meta.orgLabel || '',
          appliedBranchLabel: meta.branchLabel || '',
          appliedDeptLabel: meta.deptLabel || '',
          appliedAccessLevel: meta.accessLevel || '',
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

      /** Update cached display labels for the current applied IDs (after options load). */
      setAppliedLabels: ({
        orgLabel,
        branchLabel,
        deptLabel,
        accessLevel,
      } = {}) => {
        const patch = {};
        if (orgLabel !== undefined) patch.appliedOrgLabel = orgLabel || '';
        if (branchLabel !== undefined) patch.appliedBranchLabel = branchLabel || '';
        if (deptLabel !== undefined) patch.appliedDeptLabel = deptLabel || '';
        if (accessLevel !== undefined) patch.appliedAccessLevel = accessLevel || '';
        if (Object.keys(patch).length) set(patch);
      },

      /**
       * Seed draft + applied from deterministic default (login / first ACM row).
       * Does not force a full page reload — callers decide.
       */
      seedAndApply: (
        { orgId, branchId, deptId, orgLabel, branchLabel, deptLabel, accessLevel } = {},
        { emitEvent = true } = {},
      ) => {
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
          appliedOrgLabel: orgLabel || '',
          appliedBranchLabel: branchLabel || '',
          appliedDeptLabel: deptLabel || '',
          appliedAccessLevel: accessLevel || '',
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
          appliedOrgLabel: '',
          appliedBranchLabel: '',
          appliedDeptLabel: '',
          appliedAccessLevel: '',
          hasAppliedContext: false,
        }),
    }),
    {
      name: 'acm-context-storage',
      // Persist only applied (saved) context + labels so unsaved draft clicks never stick
      partialize: (state) => ({
        appliedOrgId: state.appliedOrgId,
        appliedBranchId: state.appliedBranchId,
        appliedDeptId: state.appliedDeptId,
        appliedOrgLabel: state.appliedOrgLabel,
        appliedBranchLabel: state.appliedBranchLabel,
        appliedDeptLabel: state.appliedDeptLabel,
        appliedAccessLevel: state.appliedAccessLevel,
        hasAppliedContext: state.hasAppliedContext,
      }),
      merge: (persisted, current) => {
        const saved = persisted && typeof persisted === 'object' ? persisted : {};
        const appliedOrgId = saved.appliedOrgId || '';
        const appliedBranchId = saved.appliedBranchId || '';
        const appliedDeptId = saved.appliedDeptId || '';
        return {
          ...current,
          ...saved,
          appliedOrgId,
          appliedBranchId,
          appliedDeptId,
          appliedOrgLabel: saved.appliedOrgLabel || '',
          appliedBranchLabel: saved.appliedBranchLabel || '',
          appliedDeptLabel: saved.appliedDeptLabel || '',
          appliedAccessLevel: saved.appliedAccessLevel || '',
          draftOrgId: appliedOrgId,
          draftBranchId: appliedBranchId,
          draftDeptId: appliedDeptId,
        };
      },
    },
  ),
);
