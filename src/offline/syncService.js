import { useInspectionSyncStore } from '../store/useInspectionSyncStore';
import { drainOutbox, refreshPendingCount } from './outbox';
import { ensureInspectionDbOpen } from './db';

let started = false;

function onOnline() {
  useInspectionSyncStore.getState().setOnline();
  drainOutbox().catch((err) => {
    console.error('[inspection-offline] drain on online failed', err);
  });
}

function onOffline() {
  useInspectionSyncStore.getState().setOffline();
}

function onVisibility() {
  if (document.visibilityState !== 'visible') return;
  refreshPendingCount().catch((err) => {
    console.error('[inspection-offline] pending count refresh failed', err);
  });
  if (navigator.onLine) {
    drainOutbox().catch((err) => {
      console.error('[inspection-offline] drain on visibility failed', err);
    });
  }
}

/** Start online/offline/visibility listeners once. */
export function startInspectionSyncService() {
  if (started || typeof window === 'undefined') return;
  started = true;

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);
  document.addEventListener('visibilitychange', onVisibility);

  ensureInspectionDbOpen()
    .then(() => {
      console.log('[inspection-offline] IndexedDB ready: inspection_offline_v1');
      return refreshPendingCount();
    })
    .catch((err) => {
      console.error('[inspection-offline] IndexedDB open failed', err);
    });

  if (!navigator.onLine) {
    useInspectionSyncStore.getState().setOffline();
  } else {
    drainOutbox().catch((err) => {
      console.error('[inspection-offline] drain on start failed', err);
    });
  }
}

export function stopInspectionSyncService() {
  if (!started || typeof window === 'undefined') return;
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  document.removeEventListener('visibilitychange', onVisibility);
  started = false;
}
