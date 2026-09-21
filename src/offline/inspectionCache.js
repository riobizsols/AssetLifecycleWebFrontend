import { db, ensureInspectionDbOpen } from './db';

function now() {
  return Date.now();
}

function resolveAisId(row) {
  if (!row || typeof row !== 'object') return null;
  const raw = row.ais_id ?? row.AIS_ID ?? row.aisId ?? row.id;
  if (raw == null || raw === '') return null;
  return String(raw);
}

/** Upsert many schedule rows from list or detail payloads. */
export async function upsertSchedules(rows = []) {
  await ensureInspectionDbOpen();
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) {
    console.warn('[inspection-offline] list prefetch skipped: empty rows');
    return;
  }

  // Preserve detail-only fields (asset_type_id, notes, etc.) when list rows are thinner
  const existingRows = await db.insp_schedules.bulkGet(
    list.map((r) => resolveAisId(r)).filter(Boolean)
  );
  const existingById = new Map(
    (existingRows || [])
      .filter(Boolean)
      .map((r) => [String(r.ais_id), r])
  );

  const stamped = list
    .map((r) => {
      const ais_id = resolveAisId(r);
      if (!ais_id) return null;
      const prev = existingById.get(ais_id) || {};
      return {
        ...prev,
        ...r,
        ais_id,
        asset_type_id: r.asset_type_id ?? prev.asset_type_id ?? null,
        notes: r.notes != null && r.notes !== '' ? r.notes : (prev.notes ?? r.notes ?? ''),
        trigger_maintenance:
          r.trigger_maintenance != null
            ? r.trigger_maintenance
            : prev.trigger_maintenance,
        inspector_name: r.inspector_name ?? prev.inspector_name,
        inspector_email: r.inspector_email ?? prev.inspector_email,
        inspector_phone: r.inspector_phone ?? r.inspector_phno ?? prev.inspector_phone ?? prev.inspector_phno,
        cached_at: now(),
      };
    })
    .filter(Boolean);
  if (!stamped.length) {
    console.warn(
      '[inspection-offline] list prefetch skipped: no ais_id on rows',
      list.slice(0, 3).map((r) => (r && typeof r === 'object' ? Object.keys(r) : r))
    );
    return;
  }
  await db.insp_schedules.bulkPut(stamped);
  console.log(`[inspection-offline] cached ${stamped.length} schedule(s) in IndexedDB`);
}

export async function upsertSchedule(row) {
  await ensureInspectionDbOpen();
  const ais_id = resolveAisId(row);
  if (!ais_id) return;
  await db.insp_schedules.put({
    ...row,
    ais_id,
    cached_at: now(),
  });
}

export async function getAllSchedules() {
  return db.insp_schedules.toArray();
}

export async function getSchedule(aisId) {
  if (aisId == null) return null;
  return db.insp_schedules.get(String(aisId));
}

export async function upsertChecklist(assetTypeId, questions = []) {
  if (assetTypeId == null) return;
  await db.insp_checklists.put({
    asset_type_id: String(assetTypeId),
    questions: Array.isArray(questions) ? questions : [],
    cached_at: now(),
  });
}

export async function getChecklist(assetTypeId) {
  if (assetTypeId == null) return null;
  return db.insp_checklists.get(String(assetTypeId));
}

/**
 * Replace server records for an ais_id, preserving local pending answers
 * that are not yet in the server payload.
 */
export async function upsertRecordsFromServer(aisId, records = []) {
  const key = String(aisId);
  const serverRows = Array.isArray(records) ? records : [];
  const existing = await db.insp_records.where('ais_id').equals(key).toArray();
  const pendingLocal = existing.filter((r) => r.pending);

  await db.insp_records.where('ais_id').equals(key).delete();

  const toPut = [];
  const seen = new Set();

  for (const r of serverRows) {
    if (r?.insp_check_id == null) continue;
    const insp_check_id = String(r.insp_check_id);
    seen.add(insp_check_id);
    toPut.push({
      ais_id: key,
      insp_check_id,
      attirec_id: r.attirec_id ?? null,
      recorded_value: r.recorded_value ?? '',
      pending: false,
      updated_at: now(),
      created_on: r.created_on || null,
      created_by: r.created_by || null,
    });
  }

  // Keep pending local answers not overwritten by an identical pending upsert below
  for (const p of pendingLocal) {
    if (!seen.has(String(p.insp_check_id))) {
      toPut.push({
        ...p,
        ais_id: key,
        insp_check_id: String(p.insp_check_id),
      });
    }
  }

  if (toPut.length) {
    await db.insp_records.bulkPut(toPut);
  }
}

/** Persist a single answer locally (pending until synced). */
export async function upsertLocalRecord(aisId, { insp_check_id, recorded_value, attirec_id = null, created_by = null }) {
  const key = String(aisId);
  const checkId = String(insp_check_id);
  await db.insp_records.put({
    ais_id: key,
    insp_check_id: checkId,
    attirec_id,
    recorded_value: recorded_value ?? '',
    pending: true,
    updated_at: now(),
    created_on: new Date().toISOString(),
    created_by,
  });
}

export async function getRecords(aisId) {
  if (aisId == null) return [];
  return db.insp_records.where('ais_id').equals(String(aisId)).toArray();
}

export async function getPendingRecords(aisId) {
  const rows = await getRecords(aisId);
  return rows
    .filter((r) => r.pending)
    .map((r) => ({
      insp_check_id: r.insp_check_id,
      recorded_value: r.recorded_value,
    }));
}

export async function clearPendingFlags(aisId) {
  const key = String(aisId);
  const rows = await db.insp_records.where('ais_id').equals(key).toArray();
  await Promise.all(
    rows.map((r) =>
      db.insp_records.put({
        ...r,
        pending: false,
        updated_at: now(),
      })
    )
  );
}

/** Patch local schedule fields after a successful/queued complete. */
export async function patchScheduleLocal(aisId, patch = {}) {
  const existing = await getSchedule(aisId);
  if (!existing) return;
  await db.insp_schedules.put({
    ...existing,
    ...patch,
    ais_id: String(aisId),
    cached_at: now(),
  });
}
