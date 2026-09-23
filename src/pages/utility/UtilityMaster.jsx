import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Check, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { utilityService } from '../../services/utilityService';
import {
  UtilityField,
  UtilityPageShell,
  UtilityPanel,
  utilityDangerBtn,
  utilityInputClass,
  utilityPrimaryBtn,
  utilitySecondaryBtn,
} from './UtilityUi';

const emptyDetail = {
  utility_sh: '',
  utctp_id: 'UTCTP001',
  utfq_id: 'uf002',
  meter_max: 999,
};

export default function UtilityMaster() {
  const [lookups, setLookups] = useState({ consumptionTypes: [], frequencies: [], uoms: [] });
  const [headers, setHeaders] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [header, setHeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newUom, setNewUom] = useState('');
  const [detailForm, setDetailForm] = useState(emptyDetail);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(emptyDetail);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [lu, list] = await Promise.all([
        utilityService.getLookups(),
        utilityService.listHeaders(),
      ]);
      setLookups(lu);
      setHeaders(list);
      setSelectedId((prev) => {
        if (prev && list.some((h) => h.util_id === prev)) return prev;
        return list[0]?.util_id || '';
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load utilities');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setHeader(null);
      setEditingId('');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await utilityService.getHeader(selectedId);
        if (!cancelled) {
          setHeader(row);
          setEditingId('');
        }
      } catch (err) {
        if (!cancelled) toast.error(err?.response?.data?.error || 'Failed to load utility');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const isMeter = detailForm.utctp_id === 'UTCTP001';
  const uomOptions = useMemo(() => lookups.uoms || [], [lookups.uoms]);
  const headerUomLabel =
    header?.uom_name ||
    uomOptions.find((u) => u.uom_id === header?.uom_id)?.uom ||
    (header?.uom_id ? header.uom_id : '—');

  const startEditDetail = (d) => {
    setEditingId(d.utild_id);
    setEditForm({
      utility_sh: d.utility_sh || '',
      utctp_id: d.utctp_id || 'UTCTP001',
      utfq_id: d.utfq_id || 'uf002',
      meter_max: d.utctp_id === 'UTCTP001' ? d.meter_max || 999 : null,
    });
  };

  const cancelEditDetail = () => {
    setEditingId('');
    setEditForm(emptyDetail);
  };

  const saveEditDetail = async () => {
    if (!editingId) return;
    if (!editForm.utility_sh.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await utilityService.updateDetail(editingId, {
        utility_sh: editForm.utility_sh.trim(),
        utctp_id: editForm.utctp_id,
        utfq_id: editForm.utfq_id,
        uom_id: header?.uom_id || null,
        meter_max: editForm.utctp_id === 'UTCTP001' ? editForm.meter_max || 999 : null,
      });
      toast.success('Profile updated');
      setEditingId('');
      setEditForm(emptyDetail);
      const row = await utilityService.getHeader(header.util_id);
      setHeader(row);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const createHeader = async () => {
    if (!newName.trim()) return toast.error('Utility name is required');
    if (!newUom) return toast.error('Default UOM is required');
    setSaving(true);
    try {
      const row = await utilityService.createHeader({
        utility_name: newName.trim(),
        uom_id: newUom,
      });
      toast.success('Utility created');
      setNewName('');
      setNewUom('');
      await load({ silent: true });
      setSelectedId(row.util_id);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const saveHeader = async () => {
    if (!header) return;
    if (!String(header.utility_name || '').trim()) {
      return toast.error('Utility name is required');
    }
    if (!header.uom_id) return toast.error('Default UOM is required');
    setSaving(true);
    try {
      const row = await utilityService.updateHeader(header.util_id, {
        utility_name: header.utility_name.trim(),
        uom_id: header.uom_id,
      });
      setHeader(row);
      toast.success('Utility updated');
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const addDetail = async () => {
    if (!header) return;
    if (!detailForm.utility_sh.trim()) return toast.error('Name is required');
    if (!header.uom_id) {
      return toast.error('Set UOM on the utility first, then add a measurement profile');
    }
    setSaving(true);
    try {
      await utilityService.createDetail({
        util_id: header.util_id,
        utility_sh: detailForm.utility_sh.trim(),
        utctp_id: detailForm.utctp_id,
        uom_id: header.uom_id,
        utfq_id: detailForm.utfq_id,
        meter_max: detailForm.utctp_id === 'UTCTP001' ? detailForm.meter_max : null,
      });
      toast.success('Detail added');
      setDetailForm(emptyDetail);
      const row = await utilityService.getHeader(header.util_id);
      setHeader(row);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not add detail');
    } finally {
      setSaving(false);
    }
  };

  const removeDetail = async (utildId) => {
    if (!window.confirm('Remove this measurement detail?')) return;
    try {
      await utilityService.deleteDetail(utildId);
      toast.success('Detail removed');
      const row = await utilityService.getHeader(header.util_id);
      setHeader(row);
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <UtilityPageShell loading={loading}>
      <div className="space-y-5">
        <UtilityPanel
          title="Create utility"
          description="Examples: Electricity, LPG, Water, Diesel."
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1">
              <UtilityField label="Utility name" required>
                <input
                  className={utilityInputClass}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. LPG"
                  required
                />
              </UtilityField>
            </div>
            <div className="min-w-[160px]">
              <UtilityField label="Default UOM" required>
                <select
                  className={utilityInputClass}
                  value={newUom}
                  onChange={(e) => setNewUom(e.target.value)}
                  required
                >
                  <option value="">Select UOM</option>
                  {uomOptions.map((u) => (
                    <option key={u.uom_id} value={u.uom_id}>
                      {u.uom}
                    </option>
                  ))}
                </select>
              </UtilityField>
            </div>
            <button
              type="button"
              onClick={createHeader}
              disabled={saving}
              className={utilityPrimaryBtn}
            >
              <Plus className="h-4 w-4" /> Create
            </button>
          </div>
        </UtilityPanel>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <UtilityPanel title="Utilities" className="lg:col-span-4" bodyClassName="p-0">
            <ul className="max-h-[560px] divide-y divide-[#E8EEF4] overflow-auto">
              {headers.length === 0 && (
                <li className="px-4 py-10 text-center text-sm text-[#5A6B7C]">
                  No utilities configured yet
                </li>
              )}
              {headers.map((h) => {
                const active = selectedId === h.util_id;
                return (
                  <li key={h.util_id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(h.util_id)}
                      className={`w-full px-4 py-3 text-left transition ${
                        active
                          ? 'border-l-4 border-[#FFC107] bg-[#F3F6F9]'
                          : 'border-l-4 border-transparent hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <div className="text-sm font-semibold text-[#0E2F4B]">
                        {h.utility_name}
                      </div>
                      <div className="mt-0.5 text-xs text-[#5A6B7C]">
                        {h.util_id} · {h.detail_count || 0} detail
                        {(h.detail_count || 0) === 1 ? '' : 's'}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </UtilityPanel>

          <div className="space-y-4 lg:col-span-8">
            {!header ? (
              <div className="rounded-lg border border-dashed border-[#C9D5E3] bg-white px-6 py-16 text-center text-sm text-[#5A6B7C]">
                Select a utility from the list, or create one above.
              </div>
            ) : (
              <>
                <UtilityPanel title="Utility details">
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[180px] flex-1">
                      <UtilityField label="Name" required>
                        <input
                          className={utilityInputClass}
                          value={header.utility_name || ''}
                          onChange={(e) =>
                            setHeader({ ...header, utility_name: e.target.value })
                          }
                          required
                        />
                      </UtilityField>
                    </div>
                    <div className="min-w-[150px]">
                      <UtilityField label="UOM" required>
                        <select
                          className={utilityInputClass}
                          value={header.uom_id || ''}
                          onChange={(e) =>
                            setHeader({ ...header, uom_id: e.target.value })
                          }
                          required
                        >
                          <option value="">Select UOM</option>
                          {uomOptions.map((u) => (
                            <option key={u.uom_id} value={u.uom_id}>
                              {u.uom}
                            </option>
                          ))}
                        </select>
                      </UtilityField>
                    </div>
                    <button
                      type="button"
                      onClick={saveHeader}
                      disabled={saving}
                      className={utilitySecondaryBtn}
                    >
                      <Save className="h-4 w-4" /> Save
                    </button>
                  </div>
                  <p className="mt-3 text-xs text-[#5A6B7C]">
                    ID {header.util_id} · Organization {header.org_id}
                  </p>
                </UtilityPanel>

                <UtilityPanel
                  title="Measurement profiles"
                  description="Add meter or quantity modes used when recording consumption."
                >
                  <div className="-mx-4 overflow-x-auto border-y border-[#E8EEF4]">
                    <table className="w-full min-w-[640px] text-sm">
                      <thead className="bg-[#0E2F4B] text-left text-[11px] uppercase tracking-wide text-white">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold">
                            Name <span className="text-[#FFC107]">*</span>
                          </th>
                          <th className="px-4 py-2.5 font-semibold">Type</th>
                          <th className="px-4 py-2.5 font-semibold">UOM</th>
                          <th className="px-4 py-2.5 font-semibold">Frequency</th>
                          <th className="px-4 py-2.5 font-semibold">Meter max</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF4]">
                        {(header.details || []).map((d) => {
                          const isEditing = editingId === d.utild_id;
                          return (
                            <tr
                              key={d.utild_id}
                              className={`bg-white ${isEditing ? 'bg-[#FFF8E1]' : 'hover:bg-[#F8FAFC]'}`}
                            >
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <input
                                    className={utilityInputClass}
                                    value={editForm.utility_sh}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, utility_sh: e.target.value })
                                    }
                                  />
                                ) : (
                                  <span className="font-medium text-[#0E2F4B]">{d.utility_sh}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <select
                                    className={utilityInputClass}
                                    value={editForm.utctp_id}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        utctp_id: e.target.value,
                                        meter_max:
                                          e.target.value === 'UTCTP001'
                                            ? editForm.meter_max || 999
                                            : null,
                                      })
                                    }
                                  >
                                    {(lookups.consumptionTypes || []).map((t) => (
                                      <option key={t.utctp_id} value={t.utctp_id}>
                                        {t.consumption_type}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="capitalize text-[#334155]">
                                    {d.consumption_type}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-[#334155]">
                                {isEditing ? headerUomLabel : d.uom_name || headerUomLabel}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  <select
                                    className={utilityInputClass}
                                    value={editForm.utfq_id}
                                    onChange={(e) =>
                                      setEditForm({ ...editForm, utfq_id: e.target.value })
                                    }
                                  >
                                    {(lookups.frequencies || []).map((f) => (
                                      <option key={f.utfq_id} value={f.utfq_id}>
                                        {f.description}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-[#334155]">{d.frequency_label}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                {isEditing ? (
                                  editForm.utctp_id === 'UTCTP001' ? (
                                    <select
                                      className={utilityInputClass}
                                      value={editForm.meter_max || 999}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          meter_max: Number(e.target.value),
                                        })
                                      }
                                    >
                                      <option value={999}>999</option>
                                      <option value={9999}>9999</option>
                                    </select>
                                  ) : (
                                    <span className="text-[#5A6B7C]">—</span>
                                  )
                                ) : (
                                  <span className="text-[#334155]">{d.meter_max ?? '—'}</span>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                {isEditing ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={saveEditDetail}
                                      disabled={saving}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#C9D5E3] bg-white text-[#0E2F4B] transition hover:bg-[#F3F6F9] disabled:opacity-50"
                                      title="Save"
                                      aria-label="Save"
                                    >
                                      <Check className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={cancelEditDetail}
                                      disabled={saving}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-50"
                                      title="Cancel"
                                      aria-label="Cancel"
                                    >
                                      <X className="h-4 w-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => startEditDetail(d)}
                                      disabled={saving || Boolean(editingId)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#C9D5E3] bg-white text-[#0E2F4B] transition hover:bg-[#F3F6F9] disabled:opacity-50"
                                      title="Edit"
                                      aria-label="Edit"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removeDetail(d.utild_id)}
                                      disabled={saving || Boolean(editingId)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B42318] transition hover:bg-[#FEF3F2] disabled:opacity-50"
                                      title="Delete"
                                      aria-label="Delete"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {(header.details || []).length === 0 && (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-8 text-center text-sm text-[#5A6B7C]"
                            >
                              No measurement profiles yet
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <UtilityField label="Name" required>
                      <input
                        className={utilityInputClass}
                        value={detailForm.utility_sh}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, utility_sh: e.target.value })
                        }
                        placeholder="Name"
                        required
                      />
                    </UtilityField>
                    <UtilityField label="Consumption type">
                      <select
                        className={utilityInputClass}
                        value={detailForm.utctp_id}
                        onChange={(e) =>
                          setDetailForm({
                            ...detailForm,
                            utctp_id: e.target.value,
                            meter_max:
                              e.target.value === 'UTCTP001'
                                ? detailForm.meter_max || 999
                                : null,
                          })
                        }
                      >
                        {(lookups.consumptionTypes || []).map((t) => (
                          <option key={t.utctp_id} value={t.utctp_id}>
                            {t.consumption_type}
                          </option>
                        ))}
                      </select>
                    </UtilityField>
                    <UtilityField label="Frequency">
                      <select
                        className={utilityInputClass}
                        value={detailForm.utfq_id}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, utfq_id: e.target.value })
                        }
                      >
                        {(lookups.frequencies || []).map((f) => (
                          <option key={f.utfq_id} value={f.utfq_id}>
                            {f.description}
                          </option>
                        ))}
                      </select>
                    </UtilityField>
                    <UtilityField label="UOM (from utility)">
                      <input
                        className={`${utilityInputClass} cursor-not-allowed bg-[#F3F6F9] text-[#5A6B7C]`}
                        value={
                          headerUomLabel === '—'
                            ? 'Set UOM on utility above'
                            : headerUomLabel
                        }
                        readOnly
                        disabled
                      />
                    </UtilityField>
                    {isMeter && (
                      <UtilityField label="Meter max">
                        <select
                          className={utilityInputClass}
                          value={detailForm.meter_max || 999}
                          onChange={(e) =>
                            setDetailForm({
                              ...detailForm,
                              meter_max: Number(e.target.value),
                            })
                          }
                        >
                          <option value={999}>999</option>
                          <option value={9999}>9999</option>
                        </select>
                      </UtilityField>
                    )}
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={addDetail}
                        disabled={saving}
                        className={utilityPrimaryBtn}
                      >
                        <Plus className="h-4 w-4" /> Add profile
                      </button>
                    </div>
                  </div>
                </UtilityPanel>
              </>
            )}
          </div>
        </div>
      </div>
    </UtilityPageShell>
  );
}
