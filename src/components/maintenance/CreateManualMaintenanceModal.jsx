import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../ui/SearchableDropdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';

const CreateManualMaintenanceModal = ({ isOpen, onClose, onSuccess }) => {
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const { assetTypes, vendors } = useAppData();
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [selectedAsset, setSelectedAsset] = useState('');
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setSelectedAssetType('');
      setSelectedAsset('');
      setAssets([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedAssetType) {
      fetchAssetsByType();
    } else {
      setAssets([]);
      setSelectedAsset('');
    }
  }, [selectedAssetType]);

  const fetchAssetsByType = async () => {
    if (!selectedAssetType) return;
    
    setLoadingAssets(true);
    try {
      const res = await API.get('/assets', {
        params: {
          asset_type_id: selectedAssetType,
          org_id: user?.org_id,
          exclude_in_maintenance: true, // Exclude assets already in maintenance
        },
      });
      
      const assetsList = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAssets(assetsList);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      toast.error('Failed to fetch assets');
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAssetType) {
      toast.error('Please select an asset type');
      return;
    }
    
    if (!selectedAsset) {
      toast.error('Please select an asset');
      return;
    }

    setSubmitting(true);
    try {
      const res = await API.post('/maintenance-schedules/create-manual', {
        asset_id: selectedAsset,
        asset_type_id: selectedAssetType,
        org_id: user?.org_id,
      });

      if (res.data?.success) {
        toast.success('Maintenance created successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data?.message || 'Failed to create maintenance');
      }
    } catch (err) {
      console.error('Failed to create maintenance:', err);
      toast.error(err.response?.data?.message || 'Failed to create maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Create Manual Maintenance</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* Asset Type Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={assetTypes.map(at => ({
                  id: at.asset_type_id,
                  text: at.text || at.asset_type_name || at.name,
                }))}
                value={selectedAssetType}
                onChange={setSelectedAssetType}
                placeholder="Select Asset Type"
                searchPlaceholder="Search asset types..."
                displayKey="text"
                valueKey="id"
              />
            </div>

            {/* Asset Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Asset <span className="text-red-500">*</span>
              </label>
              {loadingAssets ? (
                <div className="px-3 py-2 border border-gray-300 rounded bg-gray-50 text-sm text-gray-500">
                  Loading assets...
                </div>
              ) : (
                <SearchableDropdown
                  options={assets.map(a => ({
                    id: a.asset_id,
                    text: `${a.description || a.text || a.asset_id}${a.serial_number ? ` (SN: ${a.serial_number})` : ''}`,
                  }))}
                  value={selectedAsset}
                  onChange={setSelectedAsset}
                  placeholder={selectedAssetType ? "Select Asset" : "Select Asset Type first"}
                  searchPlaceholder="Search assets..."
                  displayKey="text"
                  valueKey="id"
                  disabled={!selectedAssetType}
                />
              )}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50 transition"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm font-medium hover:bg-[#1a4971] transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting || !selectedAssetType || !selectedAsset}
            >
              {submitting ? 'Creating...' : 'Create Maintenance'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateManualMaintenanceModal;
