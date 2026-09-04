import { useInspectionSyncStore } from '../store/useInspectionSyncStore';
import { useAuthStore } from '../store/useAuthStore';
import { drainOutbox } from '../offline/outbox';

const STATUS_STYLES = {
  online: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  offline: 'bg-amber-50 text-amber-900 border-amber-200',
  syncing: 'bg-sky-50 text-sky-900 border-sky-200',
  failed: 'bg-red-50 text-red-800 border-red-200',
};

const STATUS_LABELS = {
  online: 'Online',
  offline: 'Offline',
  syncing: 'Syncing',
  failed: 'Failed',
};

/**
 * Sync status banner — inspection screens only.
 */
export default function InspectionSyncBanner() {
  const status = useInspectionSyncStore((s) => s.status);
  const lastError = useInspectionSyncStore((s) => s.lastError);
  const pendingCount = useInspectionSyncStore((s) => s.pendingCount);
  const fromCache = useInspectionSyncStore((s) => s.fromCache);
  const token = useAuthStore((s) => s.token);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (!token && offline) {
    return (
      <div
        className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        role="status"
      >
        You are offline and not signed in. Connect to the network and log in to
        open or sync inspections. Offline login is not available.
      </div>
    );
  }

  const style = STATUS_STYLES[status] || STATUS_STYLES.online;
  const label = STATUS_LABELS[status] || status;

  return (
    <div
      className={`mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${style}`}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{label}</span>
        {pendingCount > 0 && (
          <span className="text-xs opacity-80">
            {pendingCount} pending sync{pendingCount === 1 ? '' : 's'}
          </span>
        )}
        {fromCache && status !== 'offline' && (
          <span className="text-xs opacity-80">Showing cached data</span>
        )}
        {status === 'failed' && lastError && (
          <span className="text-xs opacity-90">— {lastError}</span>
        )}
      </div>
      {(status === 'failed' || pendingCount > 0) && navigator.onLine && token && (
        <button
          type="button"
          className="text-xs font-medium underline underline-offset-2 hover:opacity-80"
          onClick={() => {
            drainOutbox({ retryFailed: true }).catch(() => {});
          }}
        >
          Retry sync
        </button>
      )}
    </div>
  );
}
