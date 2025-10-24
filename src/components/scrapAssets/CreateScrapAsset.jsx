import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Search, QrCode, X, Maximize, Minimize } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';
import { Html5Qrcode } from "html5-qrcode";
import SearchableDropdown from '../ui/SearchableDropdown';
import { useLanguage } from '../../contexts/LanguageContext';

const CreateScrapAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [scrapAssets, setScrapAssets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');
  const [columns, setColumns] = useState([]);
  
  // Asset selection states
  const [showAssetSelection, setShowAssetSelection] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [activeTab, setActiveTab] = useState('select');
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

  const onScanSuccess = useCallback((decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setScannedAssetId(decodedText);
    setShowScanner(false);
    toast.success(t('createScrapAsset.assetIdScannedSuccessfully'));
  }, [t]);

  const onScanError = useCallback((error) => {
    // Handle scan error silently
    console.warn("Scan error:", error);
  }, []);

  const initializeScanner = useCallback(async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Error starting scanner:", err);
      toast.error(t('createScrapAsset.couldNotAccessCamera'));
      setShowScanner(false);
    }
  }, [t, onScanSuccess, onScanError]);

  // Initialize scanner when modal opens
  useEffect(() => {
    if (showScanner && !scannerRef.current) {
      initializeScanner();
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [showScanner, initializeScanner]);

  const startScanner = () => {
    setShowScanner(true);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  // Fetch available assets by selected asset type
  const fetchAvailableAssetsByType = async (assetTypeId) => {
    if (!assetTypeId) {
      setScrapAssets([]);
      setColumns([]);
      return;
    }
    try {
      const res = await API.get(`/scrap-assets/available-by-type/${assetTypeId}`, {
        params: { context: 'SCRAPASSETS' }
      });
      const apiAssets = Array.isArray(res.data?.assets)
        ? res.data.assets
        : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
            ? res.data
            : [];

      // Normalize strictly to fields present in the response
      const normalized = apiAssets.map((asset) => ({
        asset_id: asset.asset_id || '',
        asset_name: asset.asset_name || '',
        serial_number: asset.serial_number || '',
        asset_type_id: asset.asset_type_id || assetTypeId,
        asset_type_name: asset.asset_type_name || '',
        org_id: asset.org_id || ''
      }));

      setScrapAssets(normalized);
      // Derive columns strictly from keys present in normalized data
      if (normalized.length > 0) {
        const keys = Object.keys(normalized[0]);
        const labels = {
          asset_id: 'ASSET ID',
          asset_name: 'ASSET NAME',
          serial_number: 'SERIAL NUMBER',
          asset_type_id: 'ASSET TYPE ID',
          asset_type_name: 'ASSET TYPE',
          org_id: 'ORG ID'
        };
        const derived = keys.map((k) => ({ key: k, name: k, label: labels[k] || k.toUpperCase(), sortable: true, visible: true }));
        // Append action column for Scrap button
        const actionCol = { key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true };
        setColumns([...derived, actionCol]);
      } else {
        setColumns([]);
      }
    } catch (error) {
      console.error('Error fetching available assets by type:', error);
      toast.error(t('createScrapAsset.failedToLoadAssetsForSelectedType'));
      setScrapAssets([]);
      setColumns([]);
    }
  };

  useEffect(() => {
    // Initial: load asset types; assets loaded on asset type selection
    fetchAssetTypes();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/asset-types', {
        params: { context: 'SCRAPASSETS' }
      });
      const types = (res.data?.asset_types) || res.data?.rows || res.data || [];
      setAssetTypes(Array.isArray(types) ? types : []);
    } catch (error) {
      console.error('Error fetching asset types:', error);
      setAssetTypes([]);
    }
  };

  const handleAssetTypeChange = (e) => {
    setSelectedAssetType(e.target.value);
    // Fetch available assets for the selected asset type
    fetchAvailableAssetsByType(e.target.value);
  };

  const handleScanSubmit = async (e) => {
    e.preventDefault();
    if (!scannedAssetId) {
      toast.error(t('createScrapAsset.pleaseEnterAssetId'));
      return;
    }

    try {
      // Fetch the asset by ID
      const assetResp = await API.get(`/assets/${encodeURIComponent(scannedAssetId)}`, {
        params: { context: 'SCRAPASSETS' }
      });
      if (!assetResp || !assetResp.data) {
        toast.error(t('createScrapAsset.assetNotFound'));
        return;
      }

      // Normalize asset object
      const data = assetResp.data;
      const asset = Array.isArray(data?.rows) ? data.rows[0] : (data.asset || data);
      if (!asset) {
        toast.error(t('createScrapAsset.assetNotFound'));
        return;
      }

      const typeId = String(
        asset.asset_type_id || asset.asset_type || asset.asset_type_fk || asset.assetTypeId || ''
      );
      if (!typeId) {
        toast.error(t('createScrapAsset.assetTypeNotFoundForThisAsset'));
        return;
      }

      // Build a single-row dataset strictly with fields from response
      const singleRow = [{
        asset_id: asset.asset_id || asset.id || scannedAssetId,
        asset_name: asset.asset_name || asset.text || asset.name || '',
        serial_number: asset.serial_number || asset.serial || asset.sn || '',
        asset_type_id: typeId,
        asset_type_name: asset.asset_type_name || asset.type_name || '',
        org_id: asset.org_id || ''
      }];

      // Set asset type (to display table section) and populate table with this single asset
      setSelectedAssetType(typeId);
      setScrapAssets(singleRow);
      // Derive columns from singleRow
      const keys = Object.keys(singleRow[0]);
      const labels = {
        asset_id: 'ASSET ID',
        asset_name: 'ASSET NAME',
        serial_number: 'SERIAL NUMBER',
        asset_type_id: 'ASSET TYPE ID',
        asset_type_name: 'ASSET TYPE',
        org_id: 'ORG ID'
      };
      const derived = keys.map((k) => ({ key: k, name: k, label: labels[k] || k.toUpperCase(), sortable: true, visible: true }));
      const actionCol = { key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true };
      setColumns([...derived, actionCol]);
      setScannedAssetId('');
      toast.success(t('createScrapAsset.assetFoundAndDisplayed'));
    } catch (error) {
      console.error('Error finding asset by scan:', error);
      toast.error(t('createScrapAsset.failedToFindAsset'));
    }
  };

  const toggleAssetSelection = () => {
    setShowAssetSelection(!showAssetSelection);
    if (!showAssetSelection) {
      // Reset filters when opening
      setSelectedAssetType('');
      setScannedAssetId('');
      setScrapAssets([]);
    } else {
      // Reset filters when closing
      setSelectedAssetType('');
      setScannedAssetId('');
      setScrapAssets([]);
    }
  };

  // Use API-fetched assets for selected type
  const getFilteredAssets = () => {
    // Only show assets when an asset type is selected
    if (!selectedAssetType) {
      return [];
    }

    // API already returns assets for selected type
    return scrapAssets;
  };

  // Removed scroll behavior


  // Columns are derived dynamically from API responses

  const handleScrap = (row) => {
    setSelectedAsset(row);
    setShowModal(true);
  };

  const handleSubmitScrap = async () => {
    try {
      console.log('Submitting scrap asset:', selectedAsset, 'with notes:', notes);
      
      // Validate that user has emp_int_id
      if (!user?.emp_int_id) {
        toast.error(t('createScrapAsset.userEmployeeIdNotFound'));
        return;
      }
      
      // Prepare scrap asset data
      const scrapData = {
        asset_id: selectedAsset.asset_id,
        scrapped_date: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD format
        scrapped_by: user.emp_int_id.toString(), // Use emp_int_id from user
        location: selectedAsset.location || null,
        notes: notes || null,
        org_id: user?.org_id || 1 // Default org_id if not available
      };

      console.log('📤 Sending scrap data to API:', scrapData);

      // Call the scrap asset API
      const response = await API.post('/scrap-assets', scrapData, {
        params: { context: 'SCRAPASSETS' }
      });
      
      if (response.data.success) {
        toast.success(t('createScrapAsset.assetSuccessfullyMarkedForScrapping', { assetName: selectedAsset.asset_name }));
        
        // Remove the asset from the list since it's now scrapped
        setScrapAssets(prev => prev.filter(asset => asset.asset_id !== selectedAsset.asset_id));
        
        // Close modal and reset state
        setShowModal(false);
        setSelectedAsset(null);
        setNotes('');
      } else {
        toast.error(t('createScrapAsset.failedToMarkAssetForScrapping'));
      }
    } catch (error) {
      console.error('❌ Error submitting scrap asset:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.status === 400) {
          toast.error(t('createScrapAsset.validationError', { error: error.response.data.error }));
        } else if (error.response.status === 401) {
          toast.error(t('createScrapAsset.unauthorizedPleaseLogInAgain'));
        } else if (error.response.status === 500) {
          toast.error(t('createScrapAsset.serverErrorPleaseTryAgainLater'));
        } else {
          toast.error(t('createScrapAsset.error', { error: error.response.data.error || t('createScrapAsset.failedToMarkAssetForScrapping') }));
        }
      } else {
        toast.error(t('createScrapAsset.networkErrorPleaseCheckConnection'));
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAsset(null);
    setNotes('');
  };

  const [filterValues, setFilterValues] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (column) => {
    setSortConfig(prev => ({
      key: column,
      direction: prev.key === column && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortData = (data) => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
        return 0;
      });
    };

    const filterData = (data, filters) => {
      return data.filter(item => {
        // Handle column-specific filters
        if (filters.columnFilters && filters.columnFilters.length > 0) {
          const columnFilterMatch = filters.columnFilters.every(filter => {
          if (!filter.column || !filter.value) return true;
          
          let itemValue = item[filter.column];
          
          // Handle object values (like days_until_expiry: {days: 5})
          if (itemValue && typeof itemValue === 'object' && itemValue.days !== undefined) {
            itemValue = `${itemValue.days} days`;
          }
          // Handle other object values by converting to string
          else if (itemValue && typeof itemValue === 'object') {
            itemValue = JSON.stringify(itemValue);
          }
          // Handle null/undefined values
          else if (itemValue === null || itemValue === undefined) {
            itemValue = 'N/A';
          }
          
          const itemValueStr = String(itemValue).toLowerCase();
          const filterValueStr = filter.value.toLowerCase();
          
          return itemValueStr.includes(filterValueStr);
        });
        
        if (!columnFilterMatch) return false;
      }
      
      // Handle date range filters
      if (filters.fromDate && filters.fromDate !== '') {
        const itemDate = new Date(item.expiry_date);
        const fromDate = new Date(filters.fromDate);
        if (itemDate < fromDate) return false;
      }
      
      if (filters.toDate && filters.toDate !== '') {
        const itemDate = new Date(item.expiry_date);
        const toDate = new Date(filters.toDate);
        if (itemDate > toDate) return false;
      }
      
      return true;
    });
  };

  const handleFilterChange = (filterType, value) => {
    setFilterValues(prev => ({
      ...prev,
      [filterType]: value
    }));
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex justify-between items-center mb-6 p-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/scrap-assets')}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAssetSelection}
              className={`p-2 rounded-full transition-colors ${
                showAssetSelection 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
              }`}
              title={showAssetSelection ? "Hide Asset Selection" : "Click to open Asset Selection"}
            >
              <Plus className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('createScrapAsset.createScrapAsset')}</h1>
              <p className="text-sm text-gray-600">{t('createScrapAsset.selectAssetsToMarkForScrapping')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selection Interface - Inline below Plus icon */}
      {showAssetSelection && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 mx-6">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm mb-4">
{t('createScrapAsset.assetSelection')}
          </div>
          
          <div className="border-b border-gray-200 mb-4"> 
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('select')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'select'
                    ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
{t('createScrapAsset.selectAssetType')}
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'scan'
                    ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
{t('createScrapAsset.scanAsset')}
              </button>
            </nav>
          </div>

          <div className="p-4">
            {activeTab === 'select' ? (
              // Select Asset Type Content
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createScrapAsset.assetType')} *</label>
                    <SearchableDropdown
                      options={assetTypes}
                      value={selectedAssetType || ""}
                      onChange={(value) => handleAssetTypeChange({ target: { value } })}
                      placeholder={t('createScrapAsset.selectAnAssetType')}
                      searchPlaceholder={t('createScrapAsset.searchAssetTypes')}
                      className="h-10"
                      displayKey="text"
                      valueKey="asset_type_id"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                      onClick={() => {
                        setSelectedAssetType('');
                      }}
                    >
{t('createScrapAsset.clearSelection')}
                    </button>
                  </div>
                </div>
                

              </div>
            ) : (
              // Scan Asset Content
              <div className="space-y-4">
                <form onSubmit={handleScanSubmit} className="flex gap-4 items-end">
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('createScrapAsset.assetId')}</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                        placeholder={t('createScrapAsset.scanOrEnterAssetId')}
                        value={scannedAssetId}
                        onChange={(e) => setScannedAssetId(e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={startScanner}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <QrCode size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm disabled:opacity-50"
                      disabled={!scannedAssetId}
                    >
{t('createScrapAsset.findAsset')}
                    </button>
                  </div>
                </form>
                
                <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                      💡 <strong>{t('createScrapAsset.tip')}:</strong> {t('createScrapAsset.scanOrEnterAssetIdTip')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table Section - Only show when asset type is selected */}
      {selectedAssetType ? (
        <div>
          <ContentBox
            filters={columns}
            onFilterChange={handleFilterChange}
            onSort={handleSort}
            sortConfig={sortConfig}
            onDeleteSelected={() => {}}
            data={getFilteredAssets()}
            selectedRows={[]}
            setSelectedRows={() => {}}
            onAdd={null}
            showAddButton={false}
            showActions={false}
          >
            {({ visibleColumns, showActions }) => {
              const filteredData = filterData(getFilteredAssets(), filterValues);
              const sortedData = sortData(filteredData);

              return (
                <CustomTable
                  visibleColumns={visibleColumns}
                  data={sortedData}
                  selectedRows={[]}
                  setSelectedRows={() => {}}
                  showActions={showActions}
                  onRowAction={handleScrap}
                  actionLabel={t('createScrapAsset.createScrap')}
                  rowKey="asset_id"
                />
              );
            }}
          </ContentBox>
        </div>
      ) : (
        /* Placeholder when no asset type is selected */
        <div className="mx-6 mb-6">
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {!showAssetSelection ? t('createScrapAsset.clickPlusIconToStart') : t('createScrapAsset.selectAssetTypeToContinue')}
            </h3>
            <p className="text-gray-500">
              {!showAssetSelection 
                ? t('createScrapAsset.clickPlusIconToOpenAssetSelection')
                : t('createScrapAsset.pleaseSelectAssetTypeFromDropdown')
              }
            </p>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">{t('createScrapAsset.scanBarcode')}</h3>
              <button
                onClick={stopScanner}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative">
              <div id="qr-reader" className="aspect-[4/3] bg-black">
                {/* The scanner will automatically inject the video element here */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-64 border-2 border-white rounded-lg"></div>
                </div>
              </div>
            </div>

            <div className="p-4 text-center">
              <p className="text-sm text-gray-600">
{t('createScrapAsset.positionBarcodeWithinScanningArea')}
              </p>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                {t('createScrapAsset.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scrap Asset Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">{t('createScrapAsset.createScrapAsset')}</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">{t('createScrapAsset.asset')}: <span className="font-medium text-gray-900">{selectedAsset?.asset_name}</span></p>
                <p className="text-sm text-gray-600">{t('createScrapAsset.serial')}: <span className="font-medium text-gray-900">{selectedAsset?.serial_number}</span></p>
                <p className="text-sm text-gray-600">{t('createScrapAsset.category')}: <span className="font-medium text-gray-900">{selectedAsset?.category}</span></p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
{t('createScrapAsset.notesOptional')}
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('createScrapAsset.enterAdditionalNotesAboutScrapAsset')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
{t('createScrapAsset.cancel')}
                </button>
                <button
                  onClick={handleSubmitScrap}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
{t('createScrapAsset.submit')}
                </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateScrapAsset; 