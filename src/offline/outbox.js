import { v4 as uuidv4 } from 'uuid';
import API from '../lib/axios';
import { db, ensureInspectionDbOpen } from './db';
import {
  clearPendingFlags,
  getSchedule,
  patchScheduleLocal,
} from './inspectionCache';
import { useInspectionSyncStore } from '../store/useInspectionSyncStore';
import { useAuthStore } from '../store/useAuthStore';

export const OUTBOX_TYPES = {
  SUBMIT_ANSWERS: 'inspection.submit_answers',
  COMPLETE: 'inspection.complete',
};

const STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  DONE: 'done',
  FAILED: 'failed',
};

let draining = false;

export async function refreshPendingCount() {
  await ensureInspectionDbOpen();
  const count = await db.outbox
    .where('status')
    .anyOf(STATUS.PENDING, STATUS.FAILED, STATUS.SYNCING)
    .count();
  useInspectionSyncStore.getState().setPendingCount(count);
  return count;
}

/** Drop older pending/failed items of the same type for this schedule (keep latest save). */
async function replacePendingOfType(ais_id, type) {
  const key = String(ais_id);
  const existing = await db.outbox
    .where('ais_id')
    .equals(key)
    .filter(
      (r) =>
        r.type === type &&
        !r.permanent &&
        (r.status === STATUS.PENDING ||
          r.status === STATUS.FAILED ||
          r.status === STATUS.SYNCING)
    )
    .toArray();
  await Promise.all(existing.map((r) => db.outbox.delete(r.id)));
}

/**
 * Enqueue a mutation. Coalesces pending items of the same type per ais_id.
 * @param {{ type: string, ais_id: string|number, payload: object }} opts
 */
export async function enqueue({ type, ais_id, payload }) {
  await ensureInspectionDbOpen();
  await replacePendingOfType(ais_id, type);

  const idempotency_key = uuidv4();
  const id = await db.outbox.add({
    idempotency_key,
    ais_id: String(ais_id),
    type,
    payload,
    status: STATUS.PENDING,
    error: null,
    created_at: Date.now(),
    attempts: 0,
  });
  await refreshPendingCount();
  return { id, idempotency_key };
}

/** FIFO pending items for one ais_id (answers before complete by created_at). */
async function itemsForAis(aisId, { includeFailed = false } = {}) {
  const allowed = includeFailed
    ? [STATUS.PENDING, STATUS.FAILED, STATUS.SYNCING]
    : [STATUS.PENDING, STATUS.SYNCING];
  const rows = await db.outbox
    .where('ais_id')
    .equals(String(aisId))
    .filter((r) => allowed.includes(r.status) && !r.permanent)
    .toArray();
  return rows.sort((a, b) => a.created_at - b.created_at || a.id - b.id);
}

async function distinctPendingAisIds({ includeFailed = false } = {}) {
  const allowed = includeFailed
    ? [STATUS.PENDING, STATUS.FAILED, STATUS.SYNCING]
    : [STATUS.PENDING, STATUS.SYNCING];
  const rows = await db.outbox
    .filter((r) => allowed.includes(r.status) && !r.permanent)
    .toArray();
  const ids = [...new Set(rows.map((r) => String(r.ais_id)))];
  ids.sort((a, b) => {
    const aMin = Math.min(
      ...rows.filter((r) => String(r.ais_id) === a).map((r) => r.created_at)
    );
    const bMin = Math.min(
      ...rows.filter((r) => String(r.ais_id) === b).map((r) => r.created_at)
    );
    return aMin - bMin;
  });
  return ids;
}

function isAuthError(err) {
  const status = err?.response?.status;
  return status === 401 || status === 403;
}

function isAlreadyTerminal(err) {
  const status = err?.response?.status;
  const msg = String(err?.response?.data?.message || err?.message || '').toLowerCase();
  if (status === 400 || status === 409) {
    if (
      msg.includes('already') ||
      msg.includes('completed') ||
      msg.includes('cancelled') ||
      msg.includes('terminal')
    ) {
      return true;
    }
  }
  return false;
}

async function sendItem(item) {
  const headers = { 'Idempotency-Key': item.idempotency_key };

  if (item.type === OUTBOX_TYPES.SUBMIT_ANSWERS) {
    const res = await API.post('/inspection/records', item.payload, { headers });
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to submit answers');
    }
    await clearPendingFlags(item.ais_id);
    return res.data;
  }

  if (item.type === OUTBOX_TYPES.COMPLETE) {
    const res = await API.put(`/inspection/${item.ais_id}`, item.payload, {
      headers,
    });
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to update inspection');
    }
    const nextStatus = item.payload?.status;
    if (nextStatus) {
      await patchScheduleLocal(item.ais_id, {
        status: nextStatus,
        notes: item.payload?.notes ?? undefined,
        trigger_maintenance: item.payload?.trigger_maintenance,
        act_insp_end_date: item.payload?.act_insp_end_date ?? undefined,
      });
    }
    return res.data;
  }

  throw new Error(`Unknown outbox type: ${item.type}`);
}

async function markDone(item) {
  await db.outbox.update(item.id, {
    status: STATUS.DONE,
    error: null,
  });
}

async function markFailed(item, error, { permanent = false } = {}) {
  await db.outbox.update(item.id, {
    status: STATUS.FAILED,
    error: String(error?.message || error || 'Sync failed'),
    attempts: (item.attempts || 0) + 1,
    permanent: Boolean(permanent),
  });
}

/** Recover items left in SYNCING after a crashed/interrupted drain. */
async function resetStuckSyncing() {
  await ensureInspectionDbOpen();
  const stuck = await db.outbox.where('status').equals(STATUS.SYNCING).toArray();
  await Promise.all(
    stuck.map((r) =>
      db.outbox.update(r.id, { status: STATUS.PENDING, error: null })
    )
  );
}

/**
 * Drain outbox when online. FIFO per ais_id.
 * Does not invent login offline — requires token.
 * @param {{ retryFailed?: boolean }} opts — retryFailed used by manual Retry button
 */
export async function drainOutbox({ retryFailed = false } = {}) {
  if (draining) return { ok: true, skipped: true };
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    useInspectionSyncStore.getState().setOffline();
    return { ok: false, reason: 'offline' };
  }

  const token = useAuthStore.getState().token;
  if (!token) {
    useInspectionSyncStore.getState().setFailed(
      'Sign in required to sync. Reconnect and log in, then retry.'
    );
    return { ok: false, reason: 'no_token' };
  }

  await resetStuckSyncing();

  const aisIds = await distinctPendingAisIds({ includeFailed: retryFailed });
  if (!aisIds.length) {
    await refreshPendingCount();
    if (navigator.onLine) {
      useInspectionSyncStore.getState().setOnline();
    }
    return { ok: true, drained: 0 };
  }

  draining = true;
  useInspectionSyncStore.getState().setSyncing();
  let drained = 0;
  let fatalError = null;

  try {
    for (const aisId of aisIds) {
      const items = await itemsForAis(aisId, { includeFailed: retryFailed });
      for (const item of items) {
        // Do NOT skip COMPLETE based on local IndexedDB status.
        // Offline/online save patches local to CO before drain; skipping here
        // left the server stuck at IN while answers still synced.

        await db.outbox.update(item.id, { status: STATUS.SYNCING });

        try {
          await sendItem(item);
          await markDone(item);
          drained += 1;
        } catch (err) {
          if (isAlreadyTerminal(err) && item.type === OUTBOX_TYPES.COMPLETE) {
            // Server already CO/CA — drop mutation, keep answers as synced
            await markDone(item);
            const local = await getSchedule(aisId);
            if (local && local.status !== 'CO' && local.status !== 'CA') {
              await patchScheduleLocal(aisId, { status: 'CO' });
            }
            drained += 1;
            continue;
          }

          const permanent = isAuthError(err);
          await markFailed(item, err, { permanent });
          fatalError = err?.response?.data?.message || err?.message || 'Sync failed';

          if (permanent) {
            useInspectionSyncStore.getState().setFailed(
              fatalError || 'Authentication failed during sync'
            );
            await refreshPendingCount();
            return { ok: false, reason: 'auth', drained };
          }

          // Stop this ais_id chain; continue other ais_ids
          break;
        }
      }
    }
  } finally {
    draining = false;
    await refreshPendingCount();
  }

  if (fatalError) {
    useInspectionSyncStore.getState().setFailed(fatalError);
    return { ok: false, reason: 'failed', drained, error: fatalError };
  }

  useInspectionSyncStore.getState().setOnline();
  return { ok: true, drained };
}

/**
 * Enqueue submit_answers (if records) then complete/update, then drain if online.
 */
export async function enqueueSaveAndSync({
  ais_id,
  recordsPayload,
  completePayload,
  hasPendingRecords,
}) {
  if (hasPendingRecords && recordsPayload) {
    await enqueue({
      type: OUTBOX_TYPES.SUBMIT_ANSWERS,
      ais_id,
      payload: recordsPayload,
    });
  }

  if (completePayload) {
    await enqueue({
      type: OUTBOX_TYPES.COMPLETE,
      ais_id,
      payload: completePayload,
    });
  }

  if (typeof navigator !== 'undefined' && navigator.onLine) {
    return drainOutbox();
  }

  useInspectionSyncStore.getState().setOffline();
  await refreshPendingCount();
  return { ok: true, queued: true };
}
