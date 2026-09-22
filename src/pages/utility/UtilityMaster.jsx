import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Save, Trash2 } from 'lucide-react';
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
  uom_id: '',
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

  const load = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) {
      setHeader(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const row = await utilityService.getHeader(selectedId);
        if (!cancelled) setHeader(row);
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

  const createHeader = async () => {
    if (!newName.trim()) return toast.error('Utility name is required');
    setSaving(true);
    try {
      const row = await utilityService.createHeader({
        utility_name: newName.trim(),
        uom_id: newUom || null,
      });
      toast.success('Utility created');
      setNewName('');
      setNewUom('');
      await load();
      setSelectedId(row.util_id);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Create failed');
    } finally {
      setSaving(false);
    }
  };

  const saveHeader = async () => {
    if (!header) return;
    setSaving(true);
    try {
      const row = await utilityService.updateHeader(header.util_id, {
        utility_name: header.utility_name,
        uom_id: header.uom_id || null,
      });
      setHeader(row);
      toast.success('Utility updated');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const addDetail = async () => {
    if (!header) return;
    if (!detailForm.utility_sh.trim()) return toast.error('Short name is required');
    setSaving(true);
    try {
      await utilityService.createDetail({
        util_id: header.util_id,
        utility_sh: detailForm.utility_sh.trim(),
        utctp_id: detailForm.utctp_id,
        uom_id: detailForm.uom_id || header.uom_id || null,
        utfq_id: detailForm.utfq_id,
        meter_max: detailForm.utctp_id === 'UTCTP001' ? detailForm.meter_max : null,
      });
      toast.success('Detail added');
      setDetailForm(emptyDetail);
      const row = await utilityService.getHeader(header.util_id);
      setHeader(row);
      await load();
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
      await load();
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
              <UtilityField label="Utility name">
                <input
                  className={utilityInputClass}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. LPG"
                />
              </UtilityField>
            </div>
            <div className="min-w-[160px]">
              <UtilityField label="Default UOM">
                <select
                  className={utilityInputClass}
                  value={newUom}
                  onChange={(e) => setNewUom(e.target.value)}
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
                      <UtilityField label="Name">
                        <input
                          className={utilityInputClass}
                          value={header.utility_name || ''}
                          onChange={(e) =>
                            setHeader({ ...header, utility_name: e.target.value })
                          }
                        />
                      </UtilityField>
                    </div>
                    <div className="min-w-[150px]">
                      <UtilityField label="UOM">
                        <select
                          className={utilityInputClass}
                          value={header.uom_id || ''}
                          onChange={(e) =>
                            setHeader({ ...header, uom_id: e.target.value })
                          }
                        >
                          <option value="">—</option>
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
                          <th className="px-4 py-2.5 font-semibold">Short name</th>
                          <th className="px-4 py-2.5 font-semibold">Type</th>
                          <th className="px-4 py-2.5 font-semibold">UOM</th>
                          <th className="px-4 py-2.5 font-semibold">Frequency</th>
                          <th className="px-4 py-2.5 font-semibold">Meter max</th>
                          <th className="px-4 py-2.5" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E8EEF4]">
                        {(header.details || []).map((d) => (
                          <tr key={d.utild_id} className="bg-white hover:bg-[#F8FAFC]">
                            <td className="px-4 py-2.5 font-medium text-[#0E2F4B]">
                              {d.utility_sh}
                            </td>
                            <td className="px-4 py-2.5 capitalize text-[#334155]">
                              {d.consumption_type}
                            </td>
                            <td className="px-4 py-2.5 text-[#334155]">
                              {d.uom_name || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-[#334155]">
                              {d.frequency_label}
                            </td>
                            <td className="px-4 py-2.5 text-[#334155]">
                              {d.meter_max ?? '—'}
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => removeDetail(d.utild_id)}
                                className={utilityDangerBtn}
                              >
                                <Trash2 className="h-3.5 w-3.5" /> Remove
                              </button>
                            </td>
                          </tr>
                        ))}
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
                    <UtilityField label="Short name">
                      <input
                        className={utilityInputClass}
                        value={detailForm.utility_sh}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, utility_sh: e.target.value })
                        }
                        placeholder="LPG_Kitchen"
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
                    <UtilityField label="UOM">
                      <select
                        className={utilityInputClass}
                        value={detailForm.uom_id}
                        onChange={(e) =>
                          setDetailForm({ ...detailForm, uom_id: e.target.value })
                        }
                      >
                        <option value="">Use header UOM</option>
                        {uomOptions.map((u) => (
                          <option key={u.uom_id} value={u.uom_id}>
                            {u.uom}
                          </option>
                        ))}
                      </select>
                    </UtilityField>
                    {isMeter && (
                      <UtilityField label="Meter max (rollover)">
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
                          <option value={999}>999 (3-digit)</option>
                          <option value={9999}>9999 (4-digit)</option>
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
