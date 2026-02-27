import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Maximize, Minimize, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../lib/axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { useAuthStore } from '../store/useAuthStore';
import { useAppData } from '../contexts/AppDataContext';
import { useLanguage } from '../contexts/LanguageContext';

const CreateManualInspection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const { assetTypes } = useAppData();
  const [activeTab, setActiveTab] = useState('select');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      initializeScanner();
    }
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [showScanner]);

  useEffect(() => {
    if (selectedAssetType) {
      fetchAssetsByType();
    } else {
      setAssets([]);
    }
  }, [selectedAssetType]);

  const initializeScanner = async () => {
    try {
      const scanner = new Html5Qrcode('manual-insp-qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      toast.error(t('assets.couldNotAccessCamera') || 'Could not access camera');
      setShowScanner(false);
    }
  };

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setScannedAssetId(decodedText);
    setShowScanner(false);
    toast.success(t('assets.assetIdScannedSuccessfully') || 'Asset ID scanned successfully');
  };

  const onScanError = () => {};

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  const fetchAssetsByType = async () => {
    if (!selectedAssetType) return;
    setLoadingAssets(true);
    try {
      const res = await API.get('/assets', {
        params: {
          asset_type_id: selectedAssetType,
          org_id: user?.org_id,
        },
      });
      const assetsList = Array.isArray(res.data) ? res.data : res.data?.data || [];
      setAssets(assetsList);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
      toast.error(t('assets.failedToFetchAssets') || 'Failed to fetch assets');
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const createInspectionForAsset = async (asset) => {
    if (!asset?.asset_id) {
      toast.error(t('maintenanceSupervisor.pleaseSelectAsset') || 'Please select an asset');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post('/inspection/create-manual', {
        asset_id: asset.asset_id,
      });
      if (res.data?.success) {
        toast.success(t('inspectionView.inspectionCreatedSuccessfully') || 'Inspection created successfully');
        navigate('/inspection-view');
      } else {
        toast.error(res.data?.message || (t('inspectionView.failedToCreateInspection') || 'Failed to create inspection'));
      }
    } catch (err) {
      console.error('Failed to create inspection:', err);
      toast.error(err.response?.data?.message || (t('inspectionView.failedToCreateInspection') || 'Failed to create inspection'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId?.trim()) {
      toast.error(t('assets.pleaseEnterAssetId') || 'Please enter or scan asset ID');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.get(`/assets/${encodeURIComponent(scannedAssetId.trim())}`);
      const asset = res.data;
      if (!asset?.asset_id) {
        toast.error(t('assets.assetNotFoundOrNotAvailable') || 'Asset not found');
        setSubmitting(false);
        return;
      }
      await createInspectionForAsset(asset);
    } catch (err) {
      console.error('Failed to resolve scanned asset:', err);
      const msg = err.response?.status === 404
        ? (t('assets.assetNotFoundOrNotAvailable') || 'Asset not found')
        : (err.response?.data?.message || t('assets.assetNotFoundOrNotAvailable') || 'Asset not found');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const assetTypeOptions = [
    { id: '', text: t('assets.allAssetTypes') || 'All Asset Types' },
    ...(assetTypes || []).map((at) => ({
      id: at.asset_type_id,
      text: at.text || at.asset_type_name || at.name || at.asset_type_id,
    })),
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('inspectionView.createManualInspection') || 'Trigger Inspection for Asset'}
        </div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex">
            <button
              type="button"
              onClick={() => setActiveTab('select')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'select'
                  ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('assets.selectAsset') || 'Select Asset'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scan')}
              className={`py-2 px-4 text-sm font-medium ${
                activeTab === 'scan'
                  ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('assets.scanAsset') || 'Scan Asset'}
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'select' ? (
            <div className="flex gap-4 items-end mb-4">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetType') || 'Asset Type'} <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={assetTypeOptions}
                  value={selectedAssetType}
                  onChange={setSelectedAssetType}
                  placeholder={t('assets.selectAssetType') || 'Select Asset Type'}
                  searchPlaceholder={t('assets.searchAssetType') || 'Search asset type...'}
                  displayKey="text"
                  valueKey="id"
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('/inspection-view')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleScanSubmit} className="flex gap-4 items-end flex-wrap">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetId') || 'Asset ID'} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="border border-gray-300 px-3 py-2 text-sm w-full bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] rounded"
                    placeholder={t('assets.scanOrEnterAssetId') || 'Scan or enter asset ID'}
                    value={scannedAssetId}
                    onChange={(e) => setScannedAssetId(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0E2F4B]"
                    title={t('assets.scanBarcode') || 'Scan Barcode'}
                  >
                    <QrCode size={20} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/inspection-view')}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                  disabled={submitting}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !scannedAssetId?.trim()}
                  className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (t('common.creating') || 'Creating...') : (t('inspectionView.createManualInspection') || 'Trigger Inspection')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {activeTab === 'select' && (
        <div
          className={`bg-white rounded shadow transition-all duration-300 ${
            isMaximized ? 'fixed inset-4 z-40 overflow-auto' : ''
          }`}
        >
          <div className="bg-white rounded shadow">
            <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm flex items-center justify-between">
              {t('assets.availableAssets') || 'Available Assets'}
              <button
                type="button"
                onClick={() => setIsMaximized((prev) => !prev)}
                className="text-[#0E2F4B] hover:opacity-80"
              >
                {isMaximized ? <Minimize size={18} /> : <Maximize size={18} />}
              </button>
            </div>
            <div className="bg-[#0E2F4B] text-white text-sm overflow-hidden">
              {assets.length > 0 && (
                <div
                  className="grid px-4 py-2 font-semibold border-b-4 border-yellow-400"
                  style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)' }}
                >
                  <div>{t('employees.assetTypeName') || 'Asset Type'}</div>
                  <div>{t('assets.assetName') || 'Asset Name'}</div>
                  <div className="flex justify-center">{t('common.actions') || 'Actions'}</div>
                </div>
              )}
              <div className={isMaximized ? 'max-h-[60vh] overflow-y-auto' : ''}>
                {loadingAssets ? (
                  <div className="px-4 py-8 text-center text-gray-600 bg-white">
                    {t('common.loading') || 'Loading...'}
                  </div>
                ) : assets.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-white rounded-b">
                    {selectedAssetType
                      ? t('assets.noInactiveAssetsFound') || 'No available assets for this type.'
                      : t('assets.selectAssetTypeToContinue') || 'Select an asset type to see available assets.'}
                  </div>
                ) : (
                  assets.map((asset, i) => (
                    <div
                      key={asset.asset_id}
                      className={`grid px-4 py-2 items-center border-b text-gray-800 ${
                        i % 2 === 0 ? 'bg-white' : 'bg-gray-100'
                      } hover:bg-gray-50`}
                      style={{ gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr) minmax(0,1fr)' }}
                    >
                      <div className="min-w-0 truncate" title={asset.asset_type_name}>
                        {asset.asset_type_name || '-'}
                      </div>
                      <div className="min-w-0 truncate" title={asset.description}>
                        {asset.description || asset.text || asset.asset_id || '-'}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => createInspectionForAsset(asset)}
                          disabled={submitting}
                          className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submitting ? (t('common.creating') || 'Creating...') : (t('inspectionView.createManualInspection') || 'Trigger Inspection')}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {t('assets.scanBarcode') || 'Scan Barcode'}
              </h3>
              <button type="button" onClick={stopScanner} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="relative">
              <div id="manual-insp-qr-reader" className="aspect-[4/3] bg-black">
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg" />
                </div>
              </div>
            </div>
            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">
                {t('assets.positionBarcodeInScanningArea') || 'Position the barcode within the scanning area.'}
              </p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                type="button"
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateManualInspection;
