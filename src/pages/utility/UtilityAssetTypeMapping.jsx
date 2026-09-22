import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import { utilityService } from '../../services/utilityService';
import {
  UtilityField,
  UtilityPageShell,
  UtilityPanel,
  utilityDangerBtn,
  utilityInputClass,
  utilityPrimaryBtn,
} from './UtilityUi';

export default function UtilityAssetTypeMapping() {
  const [details, setDetails] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [utildId, setUtildId] = useState('');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, at, m] = await Promise.all([
        utilityService.listDetails(),
        utilityService.listAssetTypes(),
        utilityService.listMappings(),
      ]);
      setDetails(d);
      setAssetTypes(at);
      setMappings(m);
      setUtildId((prev) => prev || d[0]?.utild_id || '');
      setAssetTypeId((prev) => prev || at[0]?.asset_type_id || '');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load mappings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!utildId || !assetTypeId) return toast.error('Select utility detail and asset type');
    setSaving(true);
    try {
      await utilityService.createMapping({ utild_id: utildId, assettype_id: assetTypeId });
      toast.success('Mapping created');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Could not create mapping');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (atumId) => {
    if (!window.confirm('Remove this mapping?')) return;
    try {
      await utilityService.deleteMapping(atumId);
      toast.success('Removed');
      await load();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <UtilityPageShell loading={loading}>
      <div className="space-y-5">
        <UtilityPanel
          title="Create mapping"
          description="Choose a utility measurement profile and the asset type it applies to."
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <UtilityField label="Utility detail">
                <select
                  className={utilityInputClass}
                  value={utildId}
                  onChange={(e) => setUtildId(e.target.value)}
                >
                  {details.length === 0 && <option value="">No details available</option>}
                  {details.map((d) => (
                    <option key={d.utild_id} value={d.utild_id}>
                      {d.utility_name} / {d.utility_sh} ({d.consumption_type})
                    </option>
                  ))}
                </select>
              </UtilityField>
            </div>
            <div className="min-w-[220px] flex-1">
              <UtilityField label="Asset type">
                <select
                  className={utilityInputClass}
                  value={assetTypeId}
                  onChange={(e) => setAssetTypeId(e.target.value)}
                >
                  {assetTypes.length === 0 && <option value="">No asset types</option>}
                  {assetTypes.map((a) => (
                    <option key={a.asset_type_id} value={a.asset_type_id}>
                      {a.asset_type_name} ({a.asset_type_id})
                    </option>
                  ))}
                </select>
              </UtilityField>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={saving || !details.length || !assetTypes.length}
              className={utilityPrimaryBtn}
            >
              <Plus className="h-4 w-4" /> Map
            </button>
          </div>
        </UtilityPanel>

        <UtilityPanel title="Active mappings" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[#0E2F4B] text-left text-[11px] uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Utility</th>
                  <th className="px-4 py-2.5 font-semibold">Detail</th>
                  <th className="px-4 py-2.5 font-semibold">Asset type</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8EEF4]">
                {mappings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-sm text-[#5A6B7C]">
                      No mappings yet
                    </td>
                  </tr>
                )}
                {mappings.map((m) => (
                  <tr key={m.atum_id} className="bg-white hover:bg-[#F8FAFC]">
                    <td className="px-4 py-3 font-medium text-[#0E2F4B]">{m.utility_name}</td>
                    <td className="px-4 py-3 text-[#334155]">
                      {m.utility_sh}
                      <div className="text-xs text-[#5A6B7C]">{m.utild_id}</div>
                    </td>
                    <td className="px-4 py-3 text-[#334155]">
                      {m.asset_type_name || m.assettype_id}
                      <div className="text-xs text-[#5A6B7C]">{m.assettype_id}</div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => remove(m.atum_id)}
                        className={utilityDangerBtn}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </UtilityPanel>
      </div>
    </UtilityPageShell>
  );
}
