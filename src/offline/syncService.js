import { useInspectionSyncStore } from '../store/useInspectionSyncStore';
import { drainOutbox, refreshPendingCount } from './outbox';

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
  refreshPendingCount().catch(() => {});
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

  refreshPendingCount().catch(() => {});

  if (!navigator.onLine) {
    useInspectionSyncStore.getState().setOffline();
  } else {
    drainOutbox().catch(() => {});
  }
}

export function stopInspectionSyncService() {
  if (!started || typeof window === 'undefined') return;
  window.removeEventListener('online', onOnline);
  window.removeEventListener('offline', onOffline);
  document.removeEventListener('visibilitychange', onVisibility);
  started = false;
}
