import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Search, X } from 'lucide-react';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';

const ScrapGroupedAssets = () => {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [assets, setAssets] = useState([]); // {asset_id, asset_name, asset_type_id, purchased_on?}
  const [assetTypeNameById, setAssetTypeNameById] = useState({});

  const [selectedAssetIds, setSelectedAssetIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('SELECTED'); // SELECTED | ALL
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchGroup = async () => {
    setLoading(true);
    try {
      // Fetch asset type names once so we can display text instead of IDs
      let typeMap = assetTypeNameById;
      if (!typeMap || Object.keys(typeMap).length === 0) {
        const typesRes = await API.get('/asset-types');
        const types = Array.isArray(typesRes.data) ? typesRes.data : [];
        typeMap = types.reduce((acc, t) => {
          if (t?.asset_type_id) acc[t.asset_type_id] = t.text || t.asset_type_name || t.name || t.asset_type_id;
          return acc;
        }, {});
        setAssetTypeNameById(typeMap);
      }

      const res = await API.get(`/asset-groups/${groupId}`);
      const header = res.data?.header;
      const details = res.data?.details || [];

      if (!header) {
        toast.error('Group not found');
        navigate('/scrap-assets/create');
        return;
      }

      setGroupName(header.text || groupId);
      setAssets(
        details.map((a) => ({
          asset_id: a.asset_id,
          asset_name: a.description || a.asset_name || a.text || 'N/A',
          asset_type_id: a.asset_type_id,
          asset_type_name: typeMap?.[a.asset_type_id] || 'N/A',
          purchased_on: a.purchased_on,
        }))
      );
      setSelectedAssetIds([]);
    } catch (e) {
      console.error('Failed to fetch group', e);
      toast.error('Failed to fetch group details');
      navigate('/scrap-assets/create');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  const filteredAssets = useMemo(() => {
    const s = searchTerm.trim().toLowerCase();
    if (!s) return assets;
    return assets.filter((a) => {
      return (
        String(a.asset_id || '').toLowerCase().includes(s) || // allow searching by hidden ID
        String(a.asset_name || '').toLowerCase().includes(s) ||
        String(a.asset_type_name || '').toLowerCase().includes(s)
      );
    });
  }, [assets, searchTerm]);

  const selectedAssets = useMemo(() => {
    const set = new Set(selectedAssetIds);
    return assets.filter((a) => set.has(a.asset_id));
  }, [assets, selectedAssetIds]);

  const toggleAsset = (assetId) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((x) => x !== assetId) : [...prev, assetId]
    );
  };

  const selectAll = () => setSelectedAssetIds(assets.map((a) => a.asset_id));
  const deselectAll = () => setSelectedAssetIds([]);

  const openScrapSelected = () => {
    if (selectedAssetIds.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }
    setMode('SELECTED');
    setNotes('');
    setModalOpen(true);
  };

  const openScrapAll = () => {
    setMode('ALL');
    setNotes('');
    setModalOpen(true);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'ALL') {
        const res = await API.post('/scrap-maintenance/create', {
          assetgroup_id: groupId,
          is_scrap_sales: 'N',
          notes: notes || null,
        });

        if (res.data?.success) {
          toast.success(res.data?.workflowCreated ? `Sent for approval (${res.data.wfscrap_h_id})` : 'Scrap created');
          setModalOpen(false);
          if (res.data?.workflowCreated) {
            navigate(`/scrap-approval-detail/${res.data.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`);
            return;
          }
          await fetchGroup();
        } else {
          toast.error(res.data?.message || 'Failed to create scrap request');
        }
      } else {
        const res = await API.post('/scrap-maintenance/create-from-group-selection', {
          assetgroup_id: groupId,
          asset_ids: selectedAssetIds,
          is_scrap_sales: 'N',
          notes: notes || null,
        });

        if (res.data?.success) {
          toast.success(res.data?.workflowCreated ? `Sent for approval (${res.data.wfscrap_h_id})` : 'Scrap created');
          setModalOpen(false);
          setSelectedAssetIds([]);

          if (res.data?.workflowCreated) {
            navigate(`/scrap-approval-detail/${res.data.wfscrap_h_id}?context=SCRAPMAINTENANCEAPPROVAL`);
            return;
          }

          await fetchGroup();
        } else {
          toast.error(res.data?.message || 'Failed to create scrap request');
        }
      }
    } catch (e) {
      console.error('Failed to submit grouped scrap', e);
      toast.error(e.response?.data?.message || 'Failed to create scrap request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 min-h-screen">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/scrap-assets/create')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          title="Back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="text-xl font-semibold text-gray-900">Scrap Group</div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
        <input className="w-full border rounded px-3 py-2 text-sm bg-gray-50" value={groupName} readOnly />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets list */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-900">Assets List</div>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded">
                Select All
              </button>
              <button onClick={deselectAll} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                Deselect All
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border rounded pl-9 pr-3 py-2 text-sm"
                placeholder="Search assets..."
              />
            </div>

            <div className="overflow-auto max-h-[420px] border rounded">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Select</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Asset Type</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((a) => (
                    <tr key={a.asset_id} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedAssetIds.includes(a.asset_id)}
                          onChange={() => toggleAsset(a.asset_id)}
                          className="accent-yellow-400"
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-800">{a.asset_name}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{a.asset_type_name}</td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                        No assets found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Selected assets */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b flex items-center justify-between">
            <div className="font-semibold text-gray-900">Selected Assets ({selectedAssets.length})</div>
            <button onClick={deselectAll} className="text-sm text-red-600 hover:underline">
              Clear All
            </button>
          </div>
          <div className="p-4">
            <div className="overflow-auto max-h-[420px] border rounded">
              <table className="min-w-full table-auto border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Asset Type</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAssets.map((a) => (
                    <tr key={a.asset_id} className="border-t">
                      <td className="px-3 py-2 text-sm">{a.asset_name}</td>
                      <td className="px-3 py-2 text-sm">{a.asset_type_name}</td>
                      <td className="px-3 py-2 text-sm">
                        <button
                          onClick={() => toggleAsset(a.asset_id)}
                          className="text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedAssets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-3 py-10 text-center text-sm text-gray-500">
                        No assets selected
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={openScrapSelected}
                disabled={selectedAssetIds.length === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded disabled:opacity-50"
              >
                Scrap Selected
              </button>
              <button
                onClick={openScrapAll}
                disabled={assets.length === 0}
                className="px-4 py-2 bg-[#0E2F4B] text-white rounded disabled:opacity-50"
              >
                Scrap Entire Group
              </button>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Note: If after scrapping selected assets only 1 asset remains in the original group, it will be removed from the group and treated as an individual asset.
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-4">
            <div className="text-lg font-semibold text-gray-900">
              {mode === 'ALL' ? 'Scrap Entire Group' : 'Scrap Selected Assets'}
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {mode === 'ALL'
                ? 'This will send the entire group for scrap approval.'
                : `This will send ${selectedAssetIds.length} selected asset(s) for scrap approval.`}
            </div>
            <textarea
              className="mt-3 w-full border rounded p-2 text-sm"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes (optional)..."
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                disabled={submitting}
                onClick={() => {
                  setModalOpen(false);
                  setNotes('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                disabled={submitting}
                onClick={submit}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScrapGroupedAssets;

