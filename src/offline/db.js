import Dexie from 'dexie';

/**
 * Inspection offline IndexedDB (Dexie).
 * Keep schema generic enough to reuse for future modules.
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

export default db;
