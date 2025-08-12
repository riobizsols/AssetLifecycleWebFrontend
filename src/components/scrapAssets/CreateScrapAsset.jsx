import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Plus, Search, QrCode, X, Maximize, Minimize } from 'lucide-react';
import ContentBox from '../ContentBox';
import CustomTable from '../CustomTable';
import { Html5Qrcode } from "html5-qrcode";

const CreateScrapAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [scrapAssets, setScrapAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [notes, setNotes] = useState('');
  
  // Asset selection states
  const [showAssetSelection, setShowAssetSelection] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [activeTab, setActiveTab] = useState('select');
  const [scannedAssetId, setScannedAssetId] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const scannerRef = useRef(null);

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
  }, [showScanner]);

  const initializeScanner = async () => {
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
      toast.error("Could not access camera. Please check permissions.");
      setShowScanner(false);
    }
  };

  const startScanner = () => {
    setShowScanner(true);
  };

  const onScanSuccess = (decodedText) => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setScannedAssetId(decodedText);
    setShowScanner(false);
    toast.success(`Asset ID scanned successfully`);
  };

  const onScanError = (error) => {
    // Handle scan error silently
    console.warn("Scan error:", error);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
      scannerRef.current = null;
    }
    setShowScanner(false);
  };

  // Mock data for available assets to scrap
  const mockAvailableAssets = [
    {
      asset_id: 'ASSET001',
      asset_name: 'Dell Laptop',
      serial_number: 'SN12345',
      category: 'Computers',
      location: 'Head Office',
      expiry_date: '2025-01-15',
      action: 'Create Scrap',
      asset_type_id: 1
    },
    {
      asset_id: 'ASSET002',
      asset_name: 'HP Printer',
      serial_number: 'SN11223',
      category: 'Computers',
      location: 'Remote Site',
      expiry_date: '2025-02-20',
      action: 'Create Scrap',
      asset_type_id: 1
    },
    {
      asset_id: 'ASSET003',
      asset_name: 'Office Desk',
      serial_number: 'SN67890',
      category: 'Furniture',
      location: 'Warehouse A',
      expiry_date: '2025-03-25',
      action: 'Create Scrap',
      asset_type_id: 2
    },
    {
      asset_id: 'ASSET004',
      asset_name: 'Conference Chair',
      serial_number: 'SN7',
      category: 'Furniture',
      location: 'Warehouse A',
      expiry_date: '2025-04-30',
      action: 'Create Scrap',
      asset_type_id: 2
    },
    {
      asset_id: 'ASSET005',
      asset_name: 'Company Van',
      serial_number: 'SN20',
      category: 'Vehicles',
      location: 'Logistics',
      expiry_date: '2025-06-15',
      action: 'Create Scrap',
      asset_type_id: 3
    },
    {
      asset_id: 'ASSET006',
      asset_name: 'Industrial Drill',
      serial_number: 'SN21',
      category: 'Machinery',
      location: 'Operations',
      expiry_date: '2025-08-20',
      action: 'Create Scrap',
      asset_type_id: 4
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setScrapAssets(mockAvailableAssets);
      setLoading(false);
    }, 1000);

    // Fetch asset types
    fetchAssetTypes();
  }, []);

  const fetchAssetTypes = async () => {
    try {
      const response = await API.get('/assets/types');
      if (response.data && response.data.asset_types) {
        setAssetTypes(response.data.asset_types);
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      // Use mock asset types if API fails
      setAssetTypes([
        { asset_type_id: 1, text: 'Computers' },
        { asset_type_id: 2, text: 'Furniture' },
        { asset_type_id: 3, text: 'Vehicles' },
        { asset_type_id: 4, text: 'Machinery' }
      ]);
    }
  };

  const handleAssetTypeChange = (e) => {
    setSelectedAssetType(e.target.value);
    
    // Auto-scroll to table when asset type is selected
    if (e.target.value) {
      scrollToTable();
    }
  };

  const handleScanSubmit = (e) => {
    e.preventDefault();
    if (!scannedAssetId) {
      toast.error("Please enter an asset ID");
      return;
    }
    
    // Find the asset by ID or serial number
    const asset = scrapAssets.find(a => a.asset_id === scannedAssetId || a.serial_number === scannedAssetId);
    if (!asset) {
      toast.error("Asset not found");
      return;
    }
    
    // Set the asset type to show this asset in the table
    setSelectedAssetType(asset.asset_type_id.toString());
    setScannedAssetId('');
    toast.success(`Asset ${asset.asset_name} found and displayed`);
    
    // Auto-scroll to table when asset is found via scan
    scrollToTable();
  };

  const toggleAssetSelection = () => {
    setShowAssetSelection(!showAssetSelection);
    if (!showAssetSelection) {
      // Reset filters when opening
      setSelectedAssetType('');
      setScannedAssetId('');
      setScrapAssets(mockAvailableAssets);
    } else {
      // Reset filters when closing
      setSelectedAssetType('');
      setScannedAssetId('');
      setScrapAssets(mockAvailableAssets);
    }
  };

  // Filter assets based on selection and add expiry status
  const getFilteredAssets = () => {
    // Only show assets when an asset type is selected
    if (!selectedAssetType) {
      return [];
    }
    
    let filteredAssets = scrapAssets.filter(asset => asset.asset_type_id.toString() === selectedAssetType);
    
    // Add expiry status to each asset
    return filteredAssets.map(asset => ({
      ...asset,
      expiry_status: calculateExpiryStatus(asset.expiry_date)
    }));
  };

  // Function to scroll to table and center it vertically
  const scrollToTable = () => {
    setTimeout(() => {
      const tableElement = document.querySelector('[data-table-section]');
      if (tableElement) {
        const windowHeight = window.innerHeight;
        const elementTop = tableElement.offsetTop;
        const elementHeight = tableElement.offsetHeight;
        const scrollTo = elementTop - (windowHeight / 2) + (elementHeight / 2);
        
        window.scrollTo({
          top: scrollTo,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to ensure DOM is updated
  };

  // Function to calculate days/months until expiry
  const calculateExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: 'Expired', color: 'bg-red-100 text-red-800' };
    } else if (diffDays <= 30) {
      return { text: `${diffDays} days`, color: 'bg-yellow-100 text-yellow-800' };
    } else if (diffDays <= 365) {
      const months = Math.ceil(diffDays / 30);
      return { text: `${months} months`, color: 'bg-blue-100 text-blue-800' };
    } else {
      const years = Math.ceil(diffDays / 365);
      return { text: `${years} years`, color: 'bg-green-100 text-green-800' };
    }
  };

  const columns = [
    { key: 'asset_name', name: 'asset_name', label: 'ASSET NAME', sortable: true, visible: true },
    { key: 'serial_number', name: 'serial_number', label: 'SERIAL NUMBER', sortable: true, visible: true },
    { key: 'category', name: 'category', label: 'CATEGORY', sortable: true, visible: true },
    { key: 'location', name: 'location', label: 'LOCATION', sortable: true, visible: true },
    { key: 'expiry_date', name: 'expiry_date', label: 'EXPIRY DATE', sortable: true, visible: true },
    { key: 'expiry_status', name: 'expiry_status', label: 'EXPIRY STATUS', sortable: true, visible: true },
    { key: 'action', name: 'action', label: 'ACTION', sortable: false, visible: true }
  ];

  const handleScrap = (row) => {
    setSelectedAsset(row);
    setShowModal(true);
  };

  const handleSubmitScrap = async () => {
    try {
      console.log('Submitting scrap asset:', selectedAsset, 'with notes:', notes);
      
      // Validate that user has emp_int_id
      if (!user?.emp_int_id) {
        toast.error('User employee ID not found. Please contact administrator.');
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
      const response = await API.post('/scrap-assets', scrapData);
      
      if (response.data.success) {
        toast.success(`Asset ${selectedAsset.asset_name} successfully marked for scrapping!`);
        
        // Remove the asset from the list since it's now scrapped
        setScrapAssets(prev => prev.filter(asset => asset.asset_id !== selectedAsset.asset_id));
        
        // Close modal and reset state
        setShowModal(false);
        setSelectedAsset(null);
        setNotes('');
      } else {
        toast.error('Failed to mark asset for scrapping');
      }
    } catch (error) {
      console.error('❌ Error submitting scrap asset:', error);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
        
        if (error.response.status === 400) {
          toast.error(`Validation error: ${error.response.data.error}`);
        } else if (error.response.status === 401) {
          toast.error('Unauthorized. Please log in again.');
        } else if (error.response.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(`Error: ${error.response.data.error || 'Failed to mark asset for scrapping'}`);
        }
      } else {
        toast.error('Network error. Please check your connection.');
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

    const filterData = (data, filters, visibleColumns) => {
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

  const visibleColumns = columns.filter(col => col.visible);
  const filteredData = filterData(getFilteredAssets(), filterValues, visibleColumns);
  const sortedData = sortData(filteredData);

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
              <h1 className="text-2xl font-bold text-gray-900">Create Scrap Asset</h1>
              <p className="text-sm text-gray-600">Select assets to mark for scrapping</p>
            </div>
          </div>
        </div>
      </div>

      {/* Asset Selection Interface - Inline below Plus icon */}
      {showAssetSelection && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6 mx-6">
          <div className="bg-[#EDF3F7] px-4 py-2 rounded-t text-[#0E2F4B] font-semibold text-sm mb-4">
            Asset Selection
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
                Select Asset Type
              </button>
              <button
                onClick={() => setActiveTab('scan')}
                className={`py-2 px-4 text-sm font-medium ${
                  activeTab === 'scan'
                    ? 'border-b-2 border-[#0E2F4B] text-[#0E2F4B]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Scan Asset
              </button>
            </nav>
          </div>

          <div className="p-4">
            {activeTab === 'select' ? (
              // Select Asset Type Content
              <div className="space-y-4">
                <div className="flex gap-4 items-end">
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type *</label>
                    <select
                      className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                      value={selectedAssetType || ""}
                      onChange={handleAssetTypeChange}
                    >
                      <option value="">Select an asset type...</option>
                      {assetTypes.map((type) => (
                        <option key={type.asset_type_id} value={type.asset_type_id}>
                          {type.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded text-sm"
                      onClick={() => {
                        setSelectedAssetType('');
                      }}
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>
                

              </div>
            ) : (
              // Scan Asset Content
              <div className="space-y-4">
                <form onSubmit={handleScanSubmit} className="flex gap-4 items-end">
                  <div className="w-64">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                    <div className="relative">
                      <input
                        type="text"
                        className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                        placeholder="Scan or enter asset ID"
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
                      Find Asset
                    </button>
                  </div>
                </form>
                
                <p className="text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
                      💡 <strong>Tip:</strong> Scan or enter an asset ID to find and display that specific asset in the table below.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Table Section - Only show when asset type is selected */}
      {selectedAssetType ? (
        <div data-table-section>
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
              const filteredData = filterData(getFilteredAssets(), filterValues, visibleColumns);
              const sortedData = sortData(filteredData);

              return (
                <CustomTable
                  visibleColumns={visibleColumns}
                  data={sortedData}
                  selectedRows={[]}
                  setSelectedRows={() => {}}
                  showActions={showActions}
                  onRowAction={handleScrap}
                  actionLabel="Create Scrap"
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
              {!showAssetSelection ? "Click the Plus Icon to Start" : "Select Asset Type to Continue"}
            </h3>
            <p className="text-gray-500">
              {!showAssetSelection 
                ? "Click on the Plus icon above to open the asset selection interface and choose an asset type to view available assets for scrapping."
                : "Please select an asset type from the dropdown above to view available assets for scrapping."
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
              <h3 className="text-lg font-medium text-gray-900">Scan Barcode</h3>
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
                Position the barcode within the scanning area
              </p>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button
                onClick={stopScanner}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
              >
                Cancel
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
              <h3 className="text-lg font-semibold text-gray-900">Create Scrap Asset</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">Asset: <span className="font-medium text-gray-900">{selectedAsset?.asset_name}</span></p>
                <p className="text-sm text-gray-600">Serial: <span className="font-medium text-gray-900">{selectedAsset?.serial_number}</span></p>
                <p className="text-sm text-gray-600">Category: <span className="font-medium text-gray-900">{selectedAsset?.category}</span></p>
              </div>
              
              <div className="mb-6">
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any additional notes about this scrap asset..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitScrap}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Submit
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