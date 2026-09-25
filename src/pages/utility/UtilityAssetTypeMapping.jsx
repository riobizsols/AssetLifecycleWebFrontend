import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { ChevronDown, Plus, Trash2 } from 'lucide-react';
import { utilityService } from '../../services/utilityService';
import {
  UtilityField,
  UtilityPageShell,
  UtilityPanel,
  utilityInputClass,
  utilityPrimaryBtn,
} from './UtilityUi';

export default function UtilityAssetTypeMapping() {
  const [utilities, setUtilities] = useState([]);
  const [details, setDetails] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [mappings, setMappings] = useState([]);
  const [utilId, setUtilId] = useState('');
  const [utildId, setUtildId] = useState('');
  const [assetTypeId, setAssetTypeId] = useState('');
  const [assetTypeSearch, setAssetTypeSearch] = useState('');
  const [assetTypeOpen, setAssetTypeOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const assetTypeRef = useRef(null);
  const assetTypeSearchRef = useRef(null);

  const profilesForUtility = useMemo(
    () => details.filter((d) => d.util_id === utilId),
    [details, utilId],
  );

  const selectedAssetType = useMemo(
    () => assetTypes.find((a) => a.asset_type_id === assetTypeId) || null,
    [assetTypes, assetTypeId],
  );

  const filteredAssetTypes = useMemo(() => {
    const q = assetTypeSearch.trim().toLowerCase();
    if (!q) return assetTypes;
    return assetTypes.filter((a) => {
      const name = String(a.asset_type_name || '').toLowerCase();
      const id = String(a.asset_type_id || '').toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [assetTypes, assetTypeSearch]);

  useEffect(() => {
    if (!profilesForUtility.length) {
      if (utildId) setUtildId('');
      return;
    }
    if (!profilesForUtility.some((d) => d.utild_id === utildId)) {
      setUtildId(profilesForUtility[0].utild_id);
    }
  }, [profilesForUtility, utildId]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (assetTypeRef.current && !assetTypeRef.current.contains(e.target)) {
        setAssetTypeOpen(false);
        setAssetTypeSearch('');
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const [headers, d, at, m] = await Promise.all([
        utilityService.listHeaders(),
        utilityService.listDetails(),
        utilityService.listAssetTypes(),
        utilityService.listMappings(),
      ]);
      setUtilities(headers || []);
      setDetails(d || []);
      setAssetTypes(at || []);
      setMappings(m || []);

      setUtilId((prev) => {
        if (prev && headers.some((h) => h.util_id === prev)) return prev;
        return headers[0]?.util_id || '';
      });
      setAssetTypeId((prev) => {
        if (prev && at.some((a) => a.asset_type_id === prev)) return prev;
        return at[0]?.asset_type_id || '';
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load mappings');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selectAssetType = (id) => {
    setAssetTypeId(id);
    setAssetTypeOpen(false);
    setAssetTypeSearch('');
  };

  const add = async () => {
    if (!utilId) return toast.error('Utility is required');
    if (!utildId) return toast.error('Consumption metric is required');
    if (!assetTypeId) return toast.error('Asset type is required');
    setSaving(true);
    try {
      await utilityService.createMapping({ utild_id: utildId, assettype_id: assetTypeId });
      toast.success('Mapping created');
      await load({ silent: true });
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
      await load({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <UtilityPageShell loading={loading}>
      <div className="space-y-5">
        <UtilityPanel
          title="Create mapping"
          description="Select a utility, then choose consumption metric, then the asset type."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
            <UtilityField label="Utility" required>
              <select
                className={utilityInputClass}
                value={utilId}
                onChange={(e) => {
                  setUtilId(e.target.value);
                  setUtildId('');
                }}
                required
              >
                <option value="">Select utility</option>
                {utilities.map((h) => (
                  <option key={h.util_id} value={h.util_id}>
                    {h.utility_name}
                  </option>
                ))}
              </select>
            </UtilityField>

            <UtilityField label="Choose consumption metric" required>
              <select
                className={utilityInputClass}
                value={utildId}
                onChange={(e) => setUtildId(e.target.value)}
                disabled={!utilId || profilesForUtility.length === 0}
                required
              >
                {!utilId && <option value="">Select utility first</option>}
                {utilId && profilesForUtility.length === 0 && (
                  <option value="">No consumption metrics for this utility</option>
                )}
                {utilId && profilesForUtility.length > 0 && (
                  <option value="">Choose consumption metric</option>
                )}
                {profilesForUtility.map((d) => (
                  <option key={d.utild_id} value={d.utild_id}>
                    {d.utility_sh}
                    {d.consumption_type ? ` (${d.consumption_type})` : ''}
                  </option>
                ))}
              </select>
            </UtilityField>

            <UtilityField label="Asset type" required>
              <div className="relative" ref={assetTypeRef}>
                <div className="relative">
                  <input
                    ref={assetTypeSearchRef}
                    type="text"
                    className={`${utilityInputClass} pr-9`}
                    value={
                      assetTypeOpen
                        ? assetTypeSearch
                        : selectedAssetType
                          ? `${selectedAssetType.asset_type_name} (${selectedAssetType.asset_type_id})`
                          : ''
                    }
                    placeholder={
                      assetTypes.length ? 'Search or select asset type…' : 'No asset types'
                    }
                    disabled={!assetTypes.length}
                    required={!assetTypeId}
                    onFocus={() => {
                      setAssetTypeOpen(true);
                      setAssetTypeSearch('');
                    }}
                    onClick={() => {
                      setAssetTypeOpen(true);
                      setAssetTypeSearch('');
                    }}
                    onChange={(e) => {
                      setAssetTypeOpen(true);
                      setAssetTypeSearch(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setAssetTypeOpen(false);
                        setAssetTypeSearch('');
                        e.currentTarget.blur();
                      }
                      if (e.key === 'Enter' && filteredAssetTypes[0]) {
                        e.preventDefault();
                        selectAssetType(filteredAssetTypes[0].asset_type_id);
                      }
                    }}
                    aria-haspopup="listbox"
                    aria-expanded={assetTypeOpen}
                    aria-label="Search or select asset type"
                    autoComplete="off"
                  />
                  <ChevronDown
                    className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5A6B7C] transition ${
                      assetTypeOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>

                {assetTypeOpen && (
                  <ul
                    className="absolute left-0 right-0 z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-[#C9D5E3] bg-white py-1 shadow-lg"
                    role="listbox"
                    aria-label="Asset types"
                  >
                    {filteredAssetTypes.length === 0 && (
                      <li className="px-3 py-3 text-sm text-[#5A6B7C]">No matches</li>
                    )}
                    {filteredAssetTypes.map((a) => {
                      const active = a.asset_type_id === assetTypeId;
                      return (
                        <li key={a.asset_type_id} role="option" aria-selected={active}>
                          <button
                            type="button"
                            className={`flex w-full flex-col px-3 py-2 text-left text-sm transition hover:bg-[#F3F6F9] ${
                              active ? 'bg-[#FFF8E1] font-medium text-[#0E2F4B]' : 'text-[#334155]'
                            }`}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => selectAssetType(a.asset_type_id)}
                          >
                            <span>{a.asset_type_name}</span>
                            <span className="text-xs text-[#5A6B7C]">{a.asset_type_id}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </UtilityField>

            <div className="flex items-end">
              <button
                type="button"
                onClick={add}
                disabled={
                  saving || !utilId || !utildId || !assetTypeId || !assetTypes.length
                }
                className={`${utilityPrimaryBtn} w-full sm:w-auto`}
              >
                <Plus className="h-4 w-4" /> Map
              </button>
            </div>
          </div>
        </UtilityPanel>

        <UtilityPanel title="Active mappings" bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-[#0E2F4B] text-left text-[11px] uppercase tracking-wide text-white">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Utility</th>
                  <th className="px-4 py-2.5 font-semibold">Consumption metric</th>
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#B42318] transition hover:bg-[#FEF3F2]"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
