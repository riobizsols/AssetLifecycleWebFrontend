import API from '../lib/axios';
import {
  upsertChecklist,
  upsertRecordsFromServer,
  upsertSchedule,
  upsertSchedules,
} from './inspectionCache';
import {
  upsertMaintDocTypes,
  upsertMaintSchedule,
  upsertMaintSchedules,
} from './maintenanceCache';

/** Prefetch open inspection list into IndexedDB (online only). */
export async function prefetchInspectionList(rows) {
  if (!navigator.onLine) return;
  try {
    await upsertSchedules(rows);
  } catch (err) {
    console.error('[inspection-offline] list prefetch failed', err);
  }
}

/** Prefetch maintenance supervisor list into IndexedDB (online only). */
export async function prefetchMaintenanceList(rows) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await upsertMaintSchedules(rows);
  } catch (err) {
    console.error('[maintenance-offline] list prefetch failed', err);
  }
}

/**
 * Prefetch one maintenance schedule detail while online.
 * @param {string|number} amsId
 */
export async function prefetchMaintenanceDetail(amsId) {
  if ((typeof navigator !== 'undefined' && !navigator.onLine) || amsId == null) {
    return null;
  }

  try {
    const detailRes = await API.get(`/maintenance-schedules/${amsId}`, {
      params: { context: 'SUPERVISORAPPROVAL' },
    });
    if (!detailRes.data?.success) return null;
    const detail = detailRes.data.data;
    await upsertMaintSchedule(detail);
    return detail;
  } catch (err) {
    console.error('[maintenance-offline] detail prefetch failed', err);
    return null;
  }
}

/** Prefetch maintenance document types for offline read. */
export async function prefetchMaintenanceDocTypes(rows) {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await upsertMaintDocTypes(rows);
  } catch (err) {
    console.error('[maintenance-offline] doc-types prefetch failed', err);
  }
}

/**
 * Prefetch detail + checklist + records for one schedule while online.
 */
export async function prefetchInspectionDetail(aisId) {
  if (!navigator.onLine || aisId == null) return null;

  try {
    const detailRes = await API.get(`/inspection/${aisId}`);
    if (!detailRes.data?.success) return null;
    const detail = detailRes.data.data;
    await upsertSchedule(detail);

    const assetTypeId = detail?.asset_type_id;
    if (assetTypeId != null) {
      try {
        const checkRes = await API.get(`/inspection/checklist/${assetTypeId}`);
        if (checkRes.data?.success) {
          const rows = checkRes.data.data || [];
          const seen = new Set();
          const unique = [];
          for (const r of rows) {
            if (!seen.has(r.insp_check_id)) {
              seen.add(r.insp_check_id);
              unique.push(r);
            }
          }
          await upsertChecklist(assetTypeId, unique);
        }
      } catch (err) {
        console.error('[inspection-offline] checklist prefetch failed', err);
      }
    }

    try {
      const recRes = await API.get(`/inspection/${aisId}/records`);
      if (recRes.data?.success) {
        await upsertRecordsFromServer(aisId, recRes.data.data || []);
      }
    } catch (err) {
      console.error('[inspection-offline] records prefetch failed', err);
    }

    return detail;
  } catch (err) {
    console.error('[inspection-offline] detail prefetch failed', err);
    return null;
  }
}
