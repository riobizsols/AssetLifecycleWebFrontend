import Dexie from 'dexie';

/**
 * Shared offline IndexedDB (Dexie).
 * Originally inspection; v2 adds maintenance list/detail cache.
 */
export const db = new Dexie('inspection_offline_v1');

db.version(1).stores({
  // Open inspection list/detail rows
  insp_schedules: 'ais_id, status, asset_type_id, cached_at',
  // Checklist questions keyed by asset type (questions stored as JSON array)
  insp_checklists: 'asset_type_id, cached_at',
  // Local answer truth: compound key ais_id + insp_check_id
  insp_records: '[ais_id+insp_check_id], ais_id, insp_check_id, pending, updated_at',
  // Pending mutations with client idempotency_key
  outbox:
    '++id, &idempotency_key, ais_id, type, status, created_at',
});

db.version(2).stores({
  insp_schedules: 'ais_id, status, asset_type_id, cached_at',
  insp_checklists: 'asset_type_id, cached_at',
  insp_records: '[ais_id+insp_check_id], ais_id, insp_check_id, pending, updated_at',
  outbox:
    '++id, &idempotency_key, ais_id, type, status, created_at',
  // Maintenance supervisor list/detail rows
  maint_schedules: 'ams_id, status, asset_id, cached_at',
  // Keyed meta blobs (e.g. doc-types)
  maint_meta: 'key, cached_at',
});

/** Ensure DB is opened so DevTools shows `inspection_offline_v1` even before first write. */
export async function ensureInspectionDbOpen() {
  if (db.isOpen()) return db;
  await db.open();
  return db;
}

export default db;
