import { db, ensureInspectionDbOpen } from './db';

function now() {
  return Date.now();
}

function resolveAmsId(row) {
  if (!row || typeof row !== 'object') return null;
  const raw = row.ams_id ?? row.AMS_ID ?? row.amsId ?? row.id;
  if (raw == null || raw === '') return null;
  return String(raw);
}

/** Upsert many maintenance schedule rows from list or detail payloads. */
export async function upsertMaintSchedules(rows = []) {
  await ensureInspectionDbOpen();
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    console.warn('[maintenance-offline] list prefetch skipped: empty rows');
    return;
  }

  // Preserve detail-only fields when list rows are thinner
  const ids = list.map((r) => resolveAmsId(r)).filter(Boolean);
  const existingRows = await db.maint_schedules.bulkGet(ids);
  const existingById = new Map(
    (existingRows || [])
      .filter(Boolean)
      .map((r) => [String(r.ams_id), r])
  );

  const stamped = list
    .map((r) => {
      const ams_id = resolveAmsId(r);
      if (!ams_id) return null;
      const prev = existingById.get(ams_id) || {};
      return {
        ...prev,
        ...r,
        ams_id,
        asset_id: r.asset_id ?? prev.asset_id ?? null,
        asset_type_id: r.asset_type_id ?? prev.asset_type_id ?? null,
        notes: r.notes != null && r.notes !== '' ? r.notes : (prev.notes ?? r.notes ?? ''),
        maint_notes:
          r.maint_notes != null && r.maint_notes !== ''
            ? r.maint_notes
            : (prev.maint_notes ?? r.maint_notes ?? ''),
        technician_name: r.technician_name ?? prev.technician_name,
        technician_email: r.technician_email ?? prev.technician_email,
        technician_phno: r.technician_phno ?? prev.technician_phno,
        // List payloads are thinner — never clear a prior full-detail flag
        _offline_detail: Boolean(prev._offline_detail || r._offline_detail),
        cached_at: now(),
      };
    })
    .filter(Boolean);

  if (!stamped.length) {
    console.warn(
      '[maintenance-offline] list prefetch skipped: no ams_id on rows',
      list.slice(0, 3).map((r) => (r && typeof r === 'object' ? Object.keys(r) : r))
    );
    return;
  }

  await db.maint_schedules.bulkPut(stamped);
  console.log(`[maintenance-offline] cached ${stamped.length} schedule(s) in IndexedDB`);
}

export async function upsertMaintSchedule(row) {
  await ensureInspectionDbOpen();
  const ams_id = resolveAmsId(row);
  if (!ams_id) return;
  const prev = (await db.maint_schedules.get(ams_id)) || {};
  await db.maint_schedules.put({
    ...prev,
    ...row,
    ams_id,
    _offline_detail: true,
    cached_at: now(),
  });
}

export async function getAllMaintSchedules() {
  await ensureInspectionDbOpen();
  return db.maint_schedules.toArray();
}

export async function getMaintSchedule(amsId) {
  await ensureInspectionDbOpen();
  if (amsId == null) return null;
  return db.maint_schedules.get(String(amsId));
}

const DOC_TYPES_KEY = 'doc-types-maintenance';

export async function upsertMaintDocTypes(rows = []) {
  await ensureInspectionDbOpen();
  await db.maint_meta.put({
    key: DOC_TYPES_KEY,
    rows: Array.isArray(rows) ? rows : [],
    cached_at: now(),
  });
}

export async function getMaintDocTypes() {
  await ensureInspectionDbOpen();
  const row = await db.maint_meta.get(DOC_TYPES_KEY);
  return Array.isArray(row?.rows) ? row.rows : [];
}
