import { showBackendTextToast } from '../../utils/errorTranslation';
import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Maximize, Minimize } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../ui/SearchableDropdown';
import { useAuthStore } from '../../store/useAuthStore';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';

const CreateManualMaintenanceModal = ({ isOpen, onClose, onSuccess }) => {
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
    if (isOpen) {
      setSelectedAssetType('');
      setAssets([]);
      setScannedAssetId('');
      setActiveTab('select');
    }
  }, [isOpen]);

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
      const scanner = new Html5Qrcode('manual-maint-qr-reader');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error('Error starting scanner:', err);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_COULDNOTACCESSCAMERA_7EF238B6', fallbackText: t('assets.couldNotAccessCamera') || 'Could not access camera');
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

  const onScanError = () => {}

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
          exclude_in_maintenance: true,
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

  const createMaintenanceForAsset = async (asset) => {
    if (!asset?.asset_id || !asset?.asset_type_id) {
      toast.error(t('maintenanceSupervisor.pleaseSelectAsset') || 'Please select an asset');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.post('/maintenance-schedules/create-manual', {
        asset_id: asset.asset_id,
        asset_type_id: asset.asset_type_id,
        org_id: user?.org_id,
      });
      if (res.data?.success) {
        toast.success(t('maintenanceSupervisor.maintenanceCreatedSuccessfully') || 'Maintenance created successfully');
        onSuccess?.();
        onClose();
      } else {
        toast.error(res.data?.message || (t('maintenanceSupervisor.failedToCreateMaintenance') || 'Failed to create maintenance'), type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create maintenance:', err);
      toast.error(err.response?.data?.message || (t('maintenanceSupervisor.failedToCreateMaintenance') || 'Failed to create maintenance'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId?.trim()) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_PLEASEENTERASSETID_5202CAD4', fallbackText: t('assets.pleaseEnterAssetId') || 'Please enter or scan asset ID');
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.get(`/assets/${encodeURIComponent(scannedAssetId.trim(), type: 'error' })}`);
      const asset = res.data;
      if (!asset?.asset_id) {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_ASSETNOTFOUNDORNOTAVAILABLE_6BCC1309', fallbackText: t('assets.assetNotFoundOrNotAvailable') || 'Asset not found');
        setSubmitting(false);
        return;
      }
      await createMaintenanceForAsset(asset);
    } catch (err) {
      console.error('Failed to resolve scanned asset:', err);
      const msg = err.response?.status === 404
        ? (t('assets.assetNotFoundOrNotAvailable') || 'Asset not found')
        : (err.response?.data?.message || t('assets.assetNotFoundOrNotAvailable') || 'Asset not found or already in maintenance');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const assetTypeOptions = [
    { id: '', text: t('assets.allAssetTypes') || 'All Asset Types' },
    ...(assetTypes || []).map((at) => ({
      id: at.asset_type_id,
      text: at.text || at.asset_type_name || at.name || at.asset_type_id,
    }), type: 'error' }),
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-semibold">
            {t('maintenanceSupervisor.createManualMaintenance') || 'Create Manual Maintenance'}
          </h2>
          <button type="button" onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <div className="border-b border-gray-200 shrink-0">
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

        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          {activeTab === 'select' ? (
            <>
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
              </div>

              <div
                className={`bg-white rounded shadow border transition-all duration-300 ${
                  isMaximized ? 'fixed inset-4 z-50 overflow-auto' : ''
                }`}
              >
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
                  <div className={isMaximized ? 'max-h-[50vh] overflow-y-auto' : ''}>
                    {loadingAssets ? (
                      <div className="px-4 py-8 text-center text-gray-600 bg-white">
                        {t('common.loading') || 'Loading...'}
                      </div>
                    ) : assets.length === 0 ? (
                      <div className="px-4 py-8 text-center text-gray-500 bg-white rounded-b">
                        {selectedAssetType
                          ? t('assets.noInactiveAssetsFound') || 'No available assets for this type (or all are already in maintenance).'
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
                              onClick={() => createMaintenanceForAsset(asset)}
                              disabled={submitting}
                              className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {submitting ? (t('common.creating') || 'Creating...') : (t('maintenanceSupervisor.createMaintenance') || 'Create Maintenance')}
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <form onSubmit={handleScanSubmit} className="space-y-4">
              <div className="w-full max-w-md">
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
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-50"
                  disabled={submitting}
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !scannedAssetId?.trim()}
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm font-medium hover:bg-[#1a4971] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (t('common.creating') || 'Creating...') : (t('maintenanceSupervisor.createMaintenance') || 'Create Maintenance')}
                </button>
              </div>
            </form>
          )}
        </div>

        {activeTab === 'select' && (
          <div className="px-6 py-3 border-t bg-gray-50 flex justify-end shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-sm font-medium hover:bg-gray-100"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
          </div>
        )}
      </div>

      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
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
              <div id="manual-maint-qr-reader" className="aspect-[4/3] bg-black">
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

export default CreateManualMaintenanceModal;
