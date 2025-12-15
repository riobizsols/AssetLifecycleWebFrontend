import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  ArrowLeft, 
  CheckSquare,
  Square,
  Eye,
  Download,
  AlertCircle,
  RefreshCw,
  Package,
  X
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import ContentBox from '../../components/ContentBox';
import CustomTable from '../../components/CustomTable';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import BulkPrintLabelScreen from '../../components/BulkPrintLabelScreen';
import { labelTemplates, assetTypeTemplateMapping } from '../../templates/labelTemplates';

const BulkSerialNumberPrint = () => {
  const navigate = useNavigate();
  
  // State management
  const [step, setStep] = useState(1); // 1: Select Asset Type, 2: Select Assets, 3: Print
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showPrintScreen, setShowPrintScreen] = useState(false);
  
  // Print settings
  const [printSettings, setPrintSettings] = useState({
    printerId: '',
    template: ''
  });
  const [printers, setPrinters] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);

  // Fetch asset types
  useEffect(() => {
    fetchAssetTypes();
    fetchPrinters();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      setIsLoading(true);
      const response = await API.get('/asset-types');
      const assetTypesData = response.data || [];
      setAssetTypes(assetTypesData.map(type => ({
        id: type.asset_type_id,
        text: type.text || type.asset_type_name
      })));
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to load asset types');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssetsByType = async (assetTypeId) => {
    try {
      setIsLoadingAssets(true);
      // Add excludePrinted=true query parameter to exclude assets already in print queue
      const response = await API.get(`/assets/type/${assetTypeId}?excludePrinted=true`);
      const assetsData = response.data?.data || response.data?.assets || response.data || [];
      
      // Transform assets to include serial_number if not present
      const transformedAssets = assetsData.map(asset => ({
        asset_id: asset.asset_id,
        asset_name: asset.description || asset.asset_name || asset.name, // Use description for asset name
        serial_number: asset.serial_number || asset.asset_serial_number || `SN-${asset.asset_id}`,
        asset_type_id: asset.asset_type_id,
        asset_type_name: selectedAssetType?.text || asset.asset_type_name || asset.text, // Use text for asset type name
        current_status: asset.current_status,
        purchased_on: asset.purchased_on,
        expiry_date: asset.expiry_date,
        purchased_cost: asset.purchased_cost,
        description: asset.description || ''
      }));
      
      setAssets(transformedAssets);
      setFilteredAssets(transformedAssets);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
      setAssets([]);
      setFilteredAssets([]);
    } finally {
      setIsLoadingAssets(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      const res = await API.get('/assets/printers');
      const assets = res.data?.data || [];
      const mapped = assets.map((asset, idx) => ({
        id: String(asset.asset_id || `printer_${idx + 1}`),
        printer_id: asset.asset_id,
        name: asset.text || asset.description || `Printer ${idx + 1}`,
        location: asset.branch_id || 'Unknown',
        ip_address: 'N/A',
        status: asset.current_status || 'Online',
        type: 'Label',
        paper_size: 'A4',
        paper_type: 'Paper',
        paper_quality: 'High',
        description: asset.description || ''
      }));
      setPrinters(mapped);
    } catch (error) {
      console.error('Error loading printers:', error);
      setPrinters([]);
    }
  };

  const handleAssetTypeSelect = (assetTypeId) => {
    if (!assetTypeId) {
      setSelectedAssetType(null);
      setAssets([]);
      setFilteredAssets([]);
      setSelectedAssets([]);
      return;
    }

    const assetType = assetTypes.find(type => type.id === assetTypeId);
    setSelectedAssetType(assetType);
    setSelectedAssets([]);
    setStep(2);
    fetchAssetsByType(assetTypeId);
  };

  const handleSelectAll = () => {
    if (selectedAssets.length === filteredAssets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets([...filteredAssets]);
    }
  };

  const handleSelectAsset = (asset) => {
    setSelectedAssets(prev => {
      const isSelected = prev.some(a => a.asset_id === asset.asset_id);
      if (isSelected) {
        return prev.filter(a => a.asset_id !== asset.asset_id);
      } else {
        return [...prev, asset];
      }
    });
  };

  const handleProceedToPrint = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    try {
      setIsAddingToQueue(true);
      let successCount = 0;
      let failCount = 0;

      // Add each selected asset to the print queue
      for (const asset of selectedAssets) {
        try {
          const response = await API.post('/asset-serial-print/', {
            serial_no: asset.serial_number,
            status: 'New',
            reason: null // Reason can be empty for bulk print
          });

          if (response.data && response.data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          if (error.response?.status === 409) {
            // Serial number already in queue - this is okay, count as success
            successCount++;
          } else {
            failCount++;
            console.error(`Error adding ${asset.asset_name} to queue:`, error);
          }
        }
      }

      // Show results
      if (successCount > 0) {
        toast.success(`Added ${successCount} asset(s) to print queue successfully`);
      }
      if (failCount > 0) {
        toast.error(`Failed to add ${failCount} asset(s) to print queue`);
      }

      // Navigate to print screen
      setStep(3);
      setShowPrintScreen(true);
      
      // Auto-select recommended template
      if (selectedAssets.length > 0) {
        const firstAsset = selectedAssets[0];
        const recommendedTemplateIds = assetTypeTemplateMapping[firstAsset.asset_type_name] || ['standard-small'];
        const primaryTemplate = recommendedTemplateIds.length > 0 ? recommendedTemplateIds[0] : 'standard-small';
        
        setPrintSettings({
          printerId: '',
          template: primaryTemplate
        });
      }
    } catch (error) {
      console.error('Error adding assets to print queue:', error);
      toast.error('Failed to add assets to print queue');
    } finally {
      setIsAddingToQueue(false);
    }
  };

  const handleBackToAssetSelection = () => {
    setShowPrintScreen(false);
    setStep(2);
    setPrintSettings({ printerId: '', template: '' });
  };

  const handleBackToAssetTypeSelection = () => {
    setStep(1);
    setSelectedAssetType(null);
    setAssets([]);
    setFilteredAssets([]);
    setSelectedAssets([]);
  };

  // Table columns for assets
  const assetColumns = [
    { name: 'asset_name', label: 'Asset Name', visible: true },
    { name: 'serial_number', label: 'Serial Number', visible: true },
    { name: 'current_status', label: 'Status', visible: true },
    { name: 'purchased_on', label: 'Purchased On', visible: true },
    { name: 'purchased_cost', label: 'Cost', visible: false }
  ];

  // Render functions
  const renderCheckbox = (col, row) => {
    if (col.name === 'select') {
      const isSelected = selectedAssets.some(a => a.asset_id === row.asset_id);
      return (
        <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSelectAsset(row);
            }}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            type="button"
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600 fill-current" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      );
    }
    return row[col.name];
  };

  const renderSerialNumber = (col, row) => {
    if (col.name === 'serial_number') {
      return (
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-blue-600" />
          <span className="font-mono text-sm font-medium">{row.serial_number}</span>
        </div>
      );
    }
    return row[col.name];
  };

  const renderDate = (col, row) => {
    if (col.name === 'purchased_on') {
      return row.purchased_on ? new Date(row.purchased_on).toLocaleDateString() : 'N/A';
    }
    return row[col.name];
  };

  // Show print screen
  if (showPrintScreen && selectedAssets.length > 0) {
    return (
      <BulkPrintLabelScreen
        selectedAssets={selectedAssets}
        onBack={handleBackToAssetSelection}
        printers={printers}
        labelTemplates={labelTemplates}
        assetTypeTemplateMapping={assetTypeTemplateMapping}
        printSettings={printSettings}
        setPrintSettings={setPrintSettings}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
      />
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {step > 1 && (
              <button
                onClick={step === 2 ? handleBackToAssetTypeSelection : handleBackToAssetSelection}
                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                title="Go Back"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Serial Number Print</h1>
              <p className="text-gray-600 mt-1">
                {step === 1 && 'Select an asset type to begin bulk printing'}
                {step === 2 && `Select assets from ${selectedAssetType?.text || ''} to print`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Asset Type Selection */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold mb-4">Step 1: Select Asset Type</h2>
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asset Type <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={assetTypes}
              value={selectedAssetType?.id || ''}
              onChange={handleAssetTypeSelect}
              placeholder="Select asset type..."
              className="w-full"
            />
            {isLoading && (
              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading asset types...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Asset Selection */}
      {step === 2 && (
        <>
          {/* Summary Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-sm">
                  <span className="text-gray-600">Asset Type:</span>
                  <span className="font-semibold ml-1">{selectedAssetType?.text}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Total Assets:</span>
                  <span className="font-semibold ml-1">{filteredAssets.length}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">Selected:</span>
                  <span className="font-semibold ml-1">{selectedAssets.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  {selectedAssets.length === filteredAssets.length ? 'Deselect All' : 'Select All'}
                </button>
                <button
                  onClick={handleProceedToPrint}
                  disabled={selectedAssets.length === 0 || isAddingToQueue}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAddingToQueue ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Adding to Queue...
                    </>
                  ) : (
                    <>
                      <Printer className="w-5 h-5" />
                      Proceed to Print ({selectedAssets.length})
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Assets Table */}
          {isLoadingAssets ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Loading assets...</p>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No assets found</h3>
              <p className="text-sm text-gray-500">
                No assets found for the selected asset type.
              </p>
            </div>
          ) : (
             <ContentBox
               filters={[{ name: 'select', label: 'Select', visible: true }, ...assetColumns]}
               data={filteredAssets}
               selectedRows={selectedAssets.map(a => a.asset_id)}
               setSelectedRows={(ids) => {
                 const selected = filteredAssets.filter(a => ids.includes(a.asset_id));
                 setSelectedAssets(selected);
               }}
               showAddButton={false}
               showActions={false}
               showFilterButton={false}
             >
               {({ visibleColumns, showActions }) => (
                 <CustomTable
                   visibleColumns={visibleColumns}
                   data={filteredAssets}
                   selectedRows={selectedAssets.map(a => a.asset_id)}
                   setSelectedRows={(ids) => {
                     const selected = filteredAssets.filter(a => ids.includes(a.asset_id));
                     setSelectedAssets(selected);
                   }}
                   showActions={false}
                   showCheckbox={false}
                   onRowClick={(row) => handleSelectAsset(row)}
                   rowKey="asset_id"
                   renderCell={(col, row) => {
                     if (col.name === 'select') return renderCheckbox(col, row);
                     if (col.name === 'serial_number') return renderSerialNumber(col, row);
                     if (col.name === 'purchased_on') return renderDate(col, row);
                     return row[col.name];
                   }}
                 />
               )}
             </ContentBox>
          )}
        </>
      )}
    </div>
  );
};

export default BulkSerialNumberPrint;

