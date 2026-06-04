import { showBackendTextToast } from '../utils/errorTranslation';
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
import { translateMasterDataLabel } from '../utils/masterDataLabel';

const CreateManualInspection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuthStore();
  const { assetTypes } = useAppData();
  const [activeTab, setActiveTab] = useState('select');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingAssetTypeCounts, setLoadingAssetTypeCounts] = useState(false);
  const [assetTypeCounts, setAssetTypeCounts] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [creatingAssetId, setCreatingAssetId] = useState(null);
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const scannerRef = useRef(null);

  const getCreateInspectionErrorConfig = (rawMessage) => {
    const message = String(rawMessage || '').trim();
    const normalized = message.toLowerCase();

    if (normalized.includes('no inspection frequency configured for this asset type')) {
      return {
        tmdId: 'TMD_I18N_CREATEINSPECTION_NOINSPFREQUENCYCONFIGURED_E6D3B9F4',
        fallbackText: t('inspectionView.noInspectionFrequencyConfigured'),
      };
    }

    return {
      tmdId: 'TMD_I18N_INSPECTIONVIEW_FAILEDTOCREATEINSPECTION_58DA658B',
      fallbackText: message || t('inspectionView.failedToCreateInspection'),
    };
  };

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

  useEffect(() => {
    fetchAssetTypeCounts();
  }, [assetTypes, user?.org_id]);

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
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_ASSETS_COULDNOTACCESSCAMERA_7EF238B6',
        fallbackText: t('assets.couldNotAccessCamera'),
        type: 'error',
      });
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
    showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_ASSETIDSCANNEDSUCCESSFULLY_5A8AF033', fallbackText: t('assets.assetIdScannedSuccessfully'), type: 'success' });
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
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_FAILEDTOFETCHASSETS_59117016', fallbackText: t('assets.failedToFetchAssets'), type: 'error' });
      setAssets([]);
    } finally {
      setLoadingAssets(false);
    }
  };

  const fetchAssetTypeCounts = async () => {
    try {
      if (!Array.isArray(assetTypes) || assetTypes.length === 0) {
        setAssetTypeCounts({});
        return;
      }

      setLoadingAssetTypeCounts(true);
      const responses = await Promise.all(
        assetTypes.map((at) =>
          API.get('/assets', {
            params: {
              asset_type_id: at.asset_type_id,
              org_id: user?.org_id,
            },
          })
        )
      );

      const counts = {};
      assetTypes.forEach((at, index) => {
        const res = responses[index];
        const list = Array.isArray(res.data) ? res.data : res.data?.data || [];
        counts[at.asset_type_id] = list.length;
      });
      setAssetTypeCounts(counts);
    } catch (err) {
      console.error('Failed to fetch asset type counts:', err);
      setAssetTypeCounts({});
    } finally {
      setLoadingAssetTypeCounts(false);
    }
  };

  const createInspectionForAsset = async (asset) => {
    if (!asset?.asset_id) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_MAINTENANCESUPERVISOR_PLEASESELECTASSET_0DAB20A5',
        fallbackText: t('maintenanceSupervisor.pleaseSelectAsset'),
        type: 'error',
      });
      return;
    }
    setCreatingAssetId(asset.asset_id);
    try {
      const res = await API.post('/inspection/create-manual', {
        asset_id: asset.asset_id,
      });
      if (res.data?.success) {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_INSPECTIONVIEW_INSPECTIONCREATEDSUCCESSFULLY_05A4A5E6', fallbackText: t('inspectionView.inspectionCreatedSuccessfully'), type: 'success' });
        navigate('/inspection-view');
      } else {
        const errorConfig = getCreateInspectionErrorConfig(res.data?.message);
        showBackendTextToast({ toast, tmdId: errorConfig.tmdId, fallbackText: errorConfig.fallbackText, type: 'error' });
      }
    } catch (err) {
      console.error('Failed to create inspection:', err);
      const errorConfig = getCreateInspectionErrorConfig(err.response?.data?.message);
      showBackendTextToast({ toast, tmdId: errorConfig.tmdId, fallbackText: errorConfig.fallbackText, type: 'error' });
    } finally {
      setCreatingAssetId(null);
    }
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId?.trim()) {
      showBackendTextToast({
        toast,
        tmdId: 'TMD_I18N_ASSETS_PLEASEENTERASSETID_5202CAD4',
        fallbackText: t('assets.pleaseEnterAssetId'),
        type: 'error',
      });
      return;
    }
    setSubmitting(true);
    try {
      const res = await API.get(`/assets/${encodeURIComponent(scannedAssetId.trim())}`);
      const asset = res.data;
      if (!asset?.asset_id) {
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_ASSETS_ASSETNOTFOUNDORNOTAVAILABLE_6BCC1309',
          fallbackText: t('assets.assetNotFoundOrNotAvailable'),
          type: 'error',
        });
        setSubmitting(false);
        return;
      }
      await createInspectionForAsset(asset);
    } catch (err) {
      console.error('Failed to resolve scanned asset:', err);
      const msg = err.response?.status === 404
        ? t('assets.assetNotFound')
        : (err.response?.data?.message || t('assets.assetNotFound'));
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_ASSETS_ASSETNOTFOUNDORNOTAVAILABLE_6BCC1309', fallbackText: msg, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const assetTypeOptions = [
    {
      id: '',
      text: t('assets.allAssetTypes'),
      count: Object.values(assetTypeCounts).reduce((sum, count) => sum + (count || 0), 0),
    },
    ...(assetTypes || []).map((at) => ({
      id: at.asset_type_id,
      text: translateMasterDataLabel(at.text || at.asset_type_name || at.name || at.asset_type_id, t),
      count: assetTypeCounts[at.asset_type_id] || 0,
    })),
  ];

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <div className="bg-white rounded shadow mb-4">
        <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm">
          {t('inspectionView.createManualInspection')}
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
              {t('assets.selectAsset')}
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
              {t('assets.scanAsset')}
            </button>
          </nav>
        </div>

        <div className="p-4">
          {activeTab === 'select' ? (
            <div className="flex gap-4 items-end mb-4">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetType')} <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={assetTypeOptions}
                  value={selectedAssetType}
                  onChange={setSelectedAssetType}
                  placeholder={t('assets.selectAssetType')}
                  searchPlaceholder={t('assets.searchAssetType')}
                  displayKey="text"
                  valueKey="id"
                  secondaryDisplayKey="count"
                  secondaryLoading={loadingAssetTypeCounts}
                />
              </div>
              <button
                type="button"
                onClick={() => navigate('/inspection-view')}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleScanSubmit} className="flex gap-4 items-end flex-wrap">
              <div className="w-64">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('assets.assetId')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    className="border border-gray-300 px-3 py-2 text-sm w-full bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] rounded"
                    placeholder={t('assets.scanOrEnterAssetId')}
                    value={scannedAssetId}
                    onChange={(e) => setScannedAssetId(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-[#0E2F4B]"
                    title={t('assets.scanBarcode')}
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
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting || !scannedAssetId?.trim()}
                  className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? t('common.creating') : t('inspectionView.triggerInspection')}
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
              {t('assets.availableAssets')}
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
                  <div>{t('employees.assetTypeName')}</div>
                  <div>{t('assets.assetName')}</div>
                  <div className="flex justify-center">{t('common.actions')}</div>
                </div>
              )}
              <div className={isMaximized ? 'max-h-[60vh] overflow-y-auto' : ''}>
                {loadingAssets ? (
                  <div className="px-4 py-8 text-center text-gray-600 bg-white">
                    {t('common.loading')}
                  </div>
                ) : assets.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-500 bg-white rounded-b">
                    {selectedAssetType
                      ? t('assets.noInactiveAssetsFound')
                      : t('assets.selectAssetTypeToContinue')}
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
                        {translateMasterDataLabel(asset.asset_type_name, t) || '-'}
                      </div>
                      <div className="min-w-0 truncate" title={asset.description}>
                        {translateMasterDataLabel(asset.description || asset.text, t) || asset.asset_id || '-'}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => createInspectionForAsset(asset)}
                          disabled={Boolean(creatingAssetId)}
                          className="bg-[#0E2F4B] text-white px-3 py-1 rounded text-sm hover:bg-[#1a4971] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {creatingAssetId === asset.asset_id
                            ? t('common.creating')
                            : t('inspectionView.triggerInspection')}
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
                {t('assets.scanBarcode')}
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
                {t('assets.positionBarcodeInScanningArea')}
              </p>
            </div>
            <div className="p-4 border-t flex justify-end">
              <button
                type="button"
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateManualInspection;
