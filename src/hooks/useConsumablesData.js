import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { apiError } from '../services/consumableService';

/**
 * Loads one or more consumables resources in parallel.
 * loaders: { key: () => Promise<data> }  →  data: { key: result }
 */
export function useConsumablesData(loaders, initial) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const entries = Object.entries(loaders);
      const results = await Promise.all(entries.map(([, load]) => load()));
      setData(Object.fromEntries(entries.map(([key], i) => [key, results[i] ?? initial[key]])));
    } catch (err) {
      toast.error(apiError(err, 'Failed to load consumables data'));
    } finally {
      if (!silent) setLoading(false);
    }
    // loaders/initial are static per page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, reload };
}

/**
 * Add / edit / delete flow shared by the consumables screens.
 * editing: null = form closed, {} = adding, row = editing that row.
 */
export function useCrudEditor({ idKey, create, update, remove, reload, noun }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const save = async (payload) => {
    setSaving(true);
    try {
      if (editing?.[idKey]) {
        await update(editing[idKey], payload);
        toast.success(`${noun} updated`);
      } else {
        const created = await create(payload);
        toast.success(created?.restocked ? `${noun} restocked` : `${noun} added`);
      }
      setEditing(null);
      await reload({ silent: true });
    } catch (err) {
      toast.error(apiError(err, `Failed to save ${noun.toLowerCase()}`));
    } finally {
      setSaving(false);
    }
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = (row, description) => {
    setPendingDelete({ row, description: description || row[idKey] });
  };

  const performDelete = async () => {
    if (!pendingDelete) return;
    const { row } = pendingDelete;
    setDeleting(true);
    try {
      await remove(row[idKey]);
      toast.success(`${noun} deleted`);
      if (editing?.[idKey] === row[idKey]) setEditing(null);
      setPendingDelete(null);
      await reload({ silent: true });
    } catch (err) {
      toast.error(apiError(err, `Failed to delete ${noun.toLowerCase()}`));
    } finally {
      setDeleting(false);
    }
  };

  return {
    editing,
    saving,
    // Also used directly as onClick, so ignore a click event passed as the preset.
    startAdd: (preset) => setEditing(preset && !preset.nativeEvent ? { ...preset } : {}),
    startEdit: (row) => setEditing(row),
    cancel: () => setEditing(null),
    save,
    confirmDelete,
    pendingDelete,
    deleting,
    performDelete,
    cancelDelete: () => setPendingDelete(null),
  };
}

export const formatQty = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};
