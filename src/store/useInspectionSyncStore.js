import { create } from 'zustand';

/** @typedef {'online' | 'offline' | 'syncing' | 'failed'} SyncStatus */

const initialOnline =
  typeof navigator !== 'undefined' ? navigator.onLine : true;

export const useInspectionSyncStore = create((set, get) => ({
  /** @type {SyncStatus} */
  status: initialOnline ? 'online' : 'offline',
  lastError: null,
  pendingCount: 0,
  fromCache: false,

  setOnline: () => {
    const { status } = get();
    if (status === 'syncing') return;
    set({ status: 'online', lastError: null });
  },

  setOffline: () => set({ status: 'offline' }),

  setSyncing: () => set({ status: 'syncing', lastError: null }),

  setFailed: (error) =>
    set({
      status: 'failed',
      lastError: error || 'Sync failed',
    }),

  setPendingCount: (count) => set({ pendingCount: Number(count) || 0 }),

  setFromCache: (fromCache) => set({ fromCache: Boolean(fromCache) }),

  /**
   * After a failed sync, restore Online/Offline based on connectivity
   * without clearing lastError until the next successful sync.
   */
  restoreConnectivityStatus: () => {
    set({
      status: navigator.onLine ? 'online' : 'offline',
    });
  },
}));
