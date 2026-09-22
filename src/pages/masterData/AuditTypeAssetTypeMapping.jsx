import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  Check,
  Loader2,
  Plus,
  Save,
  Search,
  Settings2,
  Trash2,
} from 'lucide-react';
import { auditReportService } from '../../services/auditReportService';
import { DropdownMultiSelect } from '../../components/reportModels/ReportComponents';

export default function AuditTypeAssetTypeMapping() {
  const [auditTypes, setAuditTypes] = useState([]);
  const [allAssetTypes, setAllAssetTypes] = useState([]);
  const [selectedAudtpId, setSelectedAudtpId] = useState('');
  const [selectedAssetTypeIds, setSelectedAssetTypeIds] = useState([]);
  const [savedAssetTypeIds, setSavedAssetTypeIds] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMapped, setLoadingMapped] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newInternal, setNewInternal] = useState(true);
  const [editName, setEditName] = useState('');

  const loadMasters = useCallback(async () => {
    setLoading(true);
    try {
      const [types, assetTypes] = await Promise.all([
        auditReportService.getAuditTypes(),
        auditReportService.getAllAssetTypes(),
      ]);
      setAuditTypes(types);
      setAllAssetTypes(assetTypes);
      setSelectedAudtpId((prev) => {
        if (prev && types.some((t) => t.audtp_id === prev)) return prev;
        return types[0]?.audtp_id || '';
      });
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to load audit mapping masters');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMasters();
  }, [loadMasters]);

  useEffect(() => {
    if (!selectedAudtpId) {
      setSelectedAssetTypeIds([]);
      setSavedAssetTypeIds([]);
      setEditName('');
      return;
    }
    const current = auditTypes.find((t) => t.audtp_id === selectedAudtpId);
    setEditName(current?.description || '');
    // Clear immediately so previous audit type's chips don't flash on the next one
    setSelectedAssetTypeIds([]);
    setSavedAssetTypeIds([]);

    let cancelled = false;
    (async () => {
      try {
        setLoadingMapped(true);
        const mapped = await auditReportService.getMappedAssetTypes(selectedAudtpId);
        if (cancelled) return;
        const ids = mapped.map((m) => m.asset_type_id);
        setSelectedAssetTypeIds(ids);
        setSavedAssetTypeIds(ids);
      } catch (err) {
        if (!cancelled) {
          toast.error(err?.response?.data?.error || 'Failed to load mappings');
          setSelectedAssetTypeIds([]);
          setSavedAssetTypeIds([]);
        }
      } finally {
        if (!cancelled) setLoadingMapped(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedAudtpId, auditTypes]);

  const dirty = useMemo(() => {
    if (selectedAssetTypeIds.length !== savedAssetTypeIds.length) return true;
    const saved = new Set(savedAssetTypeIds);
    return selectedAssetTypeIds.some((id) => !saved.has(id));
  }, [selectedAssetTypeIds, savedAssetTypeIds]);

  const nameDirty = useMemo(() => {
    const current = auditTypes.find((t) => t.audtp_id === selectedAudtpId);
    return String(editName || '').trim() !== String(current?.description || '').trim();
  }, [editName, auditTypes, selectedAudtpId]);

  const assetTypeOptions = useMemo(
    () =>
      allAssetTypes.map((a) => ({
        value: a.asset_type_id,
        label: a.asset_type_name || a.asset_type_id,
      })),
    [allAssetTypes],
  );

  const filteredAuditTypes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return auditTypes;
    return auditTypes.filter((t) =>
      [t.description, t.audtp_id].filter(Boolean).join(' ').toLowerCase().includes(q),
    );
  }, [auditTypes, search]);

  const selectedChips = useMemo(() => {
    const byId = new Map(allAssetTypes.map((a) => [a.asset_type_id, a.asset_type_name]));
    return selectedAssetTypeIds.map((id) => ({
      id,
      label: byId.get(id) || id,
    }));
  }, [selectedAssetTypeIds, allAssetTypes]);

  const handleCreate = async () => {
    const description = newName.trim();
    if (!description) {
      toast.error('Enter an audit type name');
      return;
    }
    try {
      setCreating(true);
      const created = await auditReportService.createAuditType({
        description,
        is_internal: newInternal,
      });
      toast.success('Audit type created');
      setShowCreate(false);
      setNewName('');
      setNewInternal(true);
      await loadMasters();
      if (created?.audtp_id) setSelectedAudtpId(created.audtp_id);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to create audit type');
    } finally {
      setCreating(false);
    }
  };

  const handleSaveName = async () => {
    if (!selectedAudtpId) return;
    const description = editName.trim();
    if (!description) {
      toast.error('Audit type name is required');
      return;
    }
    try {
      setSaving(true);
      await auditReportService.updateAuditType(selectedAudtpId, { description });
      toast.success('Audit type updated');
      await loadMasters();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to update audit type');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMappings = async () => {
    if (!selectedAudtpId) return;
    try {
      setSaving(true);
      const data = await auditReportService.saveMappings(selectedAudtpId, selectedAssetTypeIds);
      const ids = data.map((m) => m.asset_type_id);
      setSelectedAssetTypeIds(ids);
      setSavedAssetTypeIds(ids);
      toast.success('Mappings saved');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedAudtpId) return;
    const current = auditTypes.find((t) => t.audtp_id === selectedAudtpId);
    if (!window.confirm(`Deactivate audit type “${current?.description || selectedAudtpId}”?`)) {
      return;
    }
    try {
      setSaving(true);
      await auditReportService.updateAuditType(selectedAudtpId, { int_status: 0 });
      toast.success('Audit type deactivated');
      setSelectedAudtpId('');
      await loadMasters();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Failed to deactivate');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-start justify-end gap-4">
          <Link
            to="/reports/audit-reports"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Settings2 className="w-4 h-4" />
            Open Audit Reports
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Audit types list */}
          <section className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">Audit types</h2>
                <button
                  type="button"
                  onClick={() => setShowCreate((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#143d65] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[#0f2f4f]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search audit types"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                />
              </div>
              {showCreate && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Fire Safety"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                  />
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={newInternal}
                      onChange={(e) => setNewInternal(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Internal audit
                  </label>
                  <button
                    type="button"
                    disabled={creating}
                    onClick={handleCreate}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#143d65] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Create
                  </button>
                </div>
              )}
            </div>

            <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-100">
              {loading ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">Loading…</div>
              ) : filteredAuditTypes.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-slate-400">
                  No audit types yet. Create one to start mapping.
                </div>
              ) : (
                filteredAuditTypes.map((t) => {
                  const active = t.audtp_id === selectedAudtpId;
                  return (
                    <button
                      key={t.audtp_id}
                      type="button"
                      onClick={() => setSelectedAudtpId(t.audtp_id)}
                      className={`w-full text-left px-4 py-3 transition ${
                        active ? 'bg-slate-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="text-sm font-medium text-slate-900">
                        {t.description || t.audtp_id}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{t.audtp_id}</span>
                        <span>·</span>
                        <span>{t.is_internal ? 'Internal' : 'External'}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>

          {/* Mapping panel */}
          <section className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
            {!selectedAudtpId ? (
              <div className="px-6 py-16 text-center text-sm text-slate-500">
                Select or create an audit type to map asset types.
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[220px] space-y-1.5">
                    <label className="block text-xs font-medium text-slate-500">Audit type name</label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={saving || !nameDirty}
                    onClick={handleSaveName}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleDeactivate}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-white px-3.5 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deactivate
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Mapped asset types</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose which asset types belong to this audit type only. The same asset type can
                    be mapped to more than one audit if needed. Unselected types for this audit stay
                    available in the list but are not included until you select and save.
                  </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!assetTypeOptions.length}
                        onClick={() => setSelectedAssetTypeIds(assetTypeOptions.map((o) => o.value))}
                        className="text-xs font-medium text-[#143d65] hover:underline disabled:opacity-40"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        disabled={!selectedAssetTypeIds.length}
                        onClick={() => setSelectedAssetTypeIds([])}
                        className="text-xs font-medium text-slate-500 hover:underline disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {loadingMapped ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-400">
                      Loading mappings…
                    </div>
                  ) : (
                    <DropdownMultiSelect
                      options={assetTypeOptions}
                      values={selectedAssetTypeIds}
                      onChange={setSelectedAssetTypeIds}
                      placeholder={
                        assetTypeOptions.length
                          ? 'Select asset types to include'
                          : 'No asset types available'
                      }
                    />
                  )}

                  {selectedChips.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {selectedChips.map((chip) => (
                        <span
                          key={chip.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700"
                        >
                          {chip.label}
                          <button
                            type="button"
                            aria-label={`Remove ${chip.label}`}
                            onClick={() =>
                              setSelectedAssetTypeIds((prev) => prev.filter((id) => id !== chip.id))
                            }
                            className="text-slate-400 hover:text-slate-700"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-500">
                    {selectedAssetTypeIds.length} asset type
                    {selectedAssetTypeIds.length === 1 ? '' : 's'} selected
                    {dirty ? ' · unsaved changes' : ''}
                  </p>
                  <button
                    type="button"
                    disabled={saving || !dirty}
                    onClick={handleSaveMappings}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#143d65] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0f2f4f] disabled:opacity-40"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save mappings
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
