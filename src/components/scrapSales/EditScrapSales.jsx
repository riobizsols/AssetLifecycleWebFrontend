import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  X,
  Search,
  Filter,
  ChevronDown,
  Check,
  Plus,
  ArrowLeft as BackArrow
} from 'lucide-react';
import API from '../../lib/axios';

const EditScrapSales = () => {
  const navigate = useNavigate();
  const { scrapId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // Buyer details
  const [buyerDetails, setBuyerDetails] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_contact: '',
    company_name: ''
  });
  
  // Scrap value management
  const [totalScrapValue, setTotalScrapValue] = useState('');
  const [individualValues, setIndividualValues] = useState({});
  const [groupName, setGroupName] = useState('');

  // Mock data for demonstration - replace with actual API calls
  const mockAssetTypes = [
    { asset_type_id: 'AT001', asset_type_name: 'Laptop', asset_type_code: 'AT001' },
    { asset_type_id: 'AT002', asset_type_name: 'Desktop', asset_type_code: 'AT002' },
    { asset_type_id: 'AT003', asset_type_name: 'Monitor', asset_type_code: 'AT003' },
    { asset_type_id: 'AT004', asset_type_name: 'Printer', asset_type_code: 'AT004' },
    { asset_type_id: 'AT005', asset_type_name: 'Furniture', asset_type_code: 'AT005' },
    { asset_type_id: 'AT006', asset_type_name: 'Vehicle', asset_type_code: 'AT006' }
  ];

  const mockAssets = [
    { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN12345' },
    { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN11223' },
    { asset_id: 'A003', name: 'Lenovo ThinkPad', description: 'Laptop - Lenovo ThinkPad', purchased_on: '2023-03-10', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN67890' },
    { asset_id: 'A004', name: 'Dell OptiPlex', description: 'Desktop - Dell OptiPlex', purchased_on: '2023-04-05', asset_type_id: 'AT002', asset_type_name: 'Desktop', serial_number: 'SN33445' },
    { asset_id: 'A005', name: 'Samsung 24"', description: 'Monitor - Samsung 24 inch', purchased_on: '2023-01-10', asset_type_id: 'AT003', asset_type_name: 'Monitor', serial_number: 'SN54321' },
    { asset_id: 'A006', name: 'LG 27"', description: 'Monitor - LG 27 inch', purchased_on: '2023-01-12', asset_type_id: 'AT003', asset_type_name: 'Monitor', serial_number: 'SN77889' },
    { asset_id: 'A007', name: 'HP LaserJet', description: 'Printer - HP LaserJet', purchased_on: '2023-02-15', asset_type_id: 'AT004', asset_type_name: 'Printer', serial_number: 'SN98765' },
    { asset_id: 'A008', name: 'Canon Printer', description: 'Printer - Canon', purchased_on: '2023-02-18', asset_type_id: 'AT004', asset_type_name: 'Printer', serial_number: 'SN44778' }
  ];

  // Mock existing scrap sale data for editing
  const mockExistingScrapSale = {
    scrap_id: 'SCR001',
    group_name: 'Old Electronics Batch',
    selected_assets: [
      { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN12345', scrap_value: 500 },
      { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN11223', scrap_value: 400 }
    ],
    total_scrap_value: 900,
    buyer_details: {
      buyer_name: 'John Doe',
      buyer_email: 'john@example.com',
      buyer_contact: '+91 98765 43210',
      company_name: 'Tech Recyclers Ltd'
    },
    status: 'Pending'
  };

  useEffect(() => {
    // Load existing scrap sale data
    let selectedAssetsData = [];
    
    console.log('EditScrapSales - location.state:', location.state);
    console.log('EditScrapSales - scrapId:', scrapId);
    
    if (location.state?.isEdit && location.state?.scrapData) {
      const data = location.state.scrapData;
      console.log('EditScrapSales - Received data:', data);
      
      setGroupName(data.group_name || '');
      setTotalScrapValue(data.total_scrap_value || '');
      
      // Set buyer details
      setBuyerDetails({
        buyer_name: data.buyer_details?.buyer_name || '',
        buyer_email: data.buyer_details?.buyer_email || '',
        buyer_contact: data.buyer_details?.buyer_contact || '',
        company_name: data.buyer_details?.company_name || ''
      });

      // Set selected assets (assuming the data has selected_assets array)
      if (data.selected_assets && Array.isArray(data.selected_assets)) {
        selectedAssetsData = data.selected_assets;
        setSelectedAssets(data.selected_assets);
        // Set individual values
        const values = {};
        data.selected_assets.forEach(asset => {
          values[asset.asset_id] = asset.scrap_value || '';
        });
        setIndividualValues(values);
      }

      // Set asset type if available
      if (data.selected_assets && data.selected_assets.length > 0) {
        setSelectedAssetType(data.selected_assets[0].asset_type_id || '');
      }
    } else {
      console.log('EditScrapSales - Using mock data');
      // Load mock data for demonstration
      setGroupName(mockExistingScrapSale.group_name);
      setTotalScrapValue(mockExistingScrapSale.total_scrap_value);
      setBuyerDetails(mockExistingScrapSale.buyer_details);
      selectedAssetsData = mockExistingScrapSale.selected_assets;
      setSelectedAssets(mockExistingScrapSale.selected_assets);
      
      // Set individual values
      const values = {};
      mockExistingScrapSale.selected_assets.forEach(asset => {
        values[asset.asset_id] = asset.scrap_value || '';
      });
      setIndividualValues(values);
      
      if (mockExistingScrapSale.selected_assets.length > 0) {
        setSelectedAssetType(mockExistingScrapSale.selected_assets[0].asset_type_id);
      }
    }

    // Load available assets (excluding already selected ones)
    const selectedAssetIds = selectedAssetsData.map(asset => asset.asset_id);
    console.log('EditScrapSales - Selected asset IDs:', selectedAssetIds);
    setAvailableAssets(mockAssets.filter(asset => !selectedAssetIds.includes(asset.asset_id)));
  }, [location.state, scrapId]);

  const filteredAvailableAssets = availableAssets.filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.asset_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = selectedAssetType === '' || asset.asset_type_id === selectedAssetType;
    return matchesSearch && matchesFilter;
  });

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return (asset.name?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.description?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.asset_id?.toLowerCase() || '').includes(filterTerm.toLowerCase());
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = mockAssetTypes.filter(type => 
    type.asset_type_name.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    type.asset_type_code.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

  const handleSelectAsset = (asset) => {
    setSelectedAssets(prev => [...prev, asset]);
    setAvailableAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
    // Initialize individual value for new asset
    setIndividualValues(prev => ({
      ...prev,
      [asset.asset_id]: ''
    }));
  };

  const handleDeselectAsset = (asset) => {
    setAvailableAssets(prev => [...prev, asset]);
    setSelectedAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
    // Remove individual value for deselected asset
    setIndividualValues(prev => {
      const newValues = { ...prev };
      delete newValues[asset.asset_id];
      return newValues;
    });
  };

  const handleSelectAll = () => {
    setSelectedAssets(prev => [...prev, ...filteredAvailableAssets]);
    setAvailableAssets(prev => prev.filter(asset => 
      !filteredAvailableAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
    // Initialize individual values for all selected assets
    const newValues = {};
    filteredAvailableAssets.forEach(asset => {
      newValues[asset.asset_id] = '';
    });
    setIndividualValues(prev => ({ ...prev, ...newValues }));
  };

  const handleDeselectAll = () => {
    setAvailableAssets(prev => [...prev, ...filteredSelectedAssets]);
    setSelectedAssets(prev => prev.filter(asset => 
      !filteredSelectedAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
    // Remove individual values for all deselected assets
    setIndividualValues(prev => {
      const newValues = { ...prev };
      filteredSelectedAssets.forEach(asset => {
        delete newValues[asset.asset_id];
      });
      return newValues;
    });
  };

  const handleAssetTypeSelect = (assetType) => {
    setSelectedAssetType(assetType.asset_type_id);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleIndividualValueChange = (assetId, value) => {
    setIndividualValues(prev => ({
      ...prev,
      [assetId]: value
    }));
  };

  const handleBuyerDetailChange = (field, value) => {
    setBuyerDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate total of individual values
  const totalIndividualValues = Object.values(individualValues).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  // Validation function
  const validateScrapValues = () => {
    const hasTotalValue = totalScrapValue && parseFloat(totalScrapValue) > 0;
    const hasIndividualValues = Object.values(individualValues).some(value => value && parseFloat(value) > 0);
    
    if (!hasTotalValue && !hasIndividualValues) {
      toast.error('Please provide either total scrap value or individual asset values');
      return false;
    }
    
    if (hasTotalValue && hasIndividualValues) {
      const total = parseFloat(totalScrapValue);
      const individualTotal = totalIndividualValues;
      
      if (Math.abs(total - individualTotal) > 0.01) { // Allow for small floating point differences
        toast.error(`Total scrap value (${total}) does not match sum of individual values (${individualTotal})`);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    if (!validateScrapValues()) {
      return;
    }

    if (!buyerDetails.buyer_name || !buyerDetails.buyer_email || !buyerDetails.buyer_contact) {
      toast.error('Please fill in all required buyer details');
      return;
    }

    setLoading(true);
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedScrapData = {
        scrap_id: scrapId,
        group_name: groupName,
        selected_assets: selectedAssets.map(asset => ({
          ...asset,
          scrap_value: individualValues[asset.asset_id] || 0
        })),
        total_scrap_value: totalScrapValue || totalIndividualValues,
        buyer_details: buyerDetails,
        status: 'Pending',
        updated_by: user?.name || 'Admin User',
        updated_date: new Date().toISOString().split('T')[0]
      };

      console.log('Updating scrap sale:', updatedScrapData);
      toast.success('Scrap sale updated successfully!');
      navigate('/scrap-sales');
    } catch (error) {
      console.error('Error updating scrap sale:', error);
      toast.error('Failed to update scrap sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/scrap-sales');
  };

  const selectedAssetTypeName = mockAssetTypes.find(type => type.asset_type_id === selectedAssetType);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            >
              <BackArrow size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Scrap Sale</h1>
              <p className="text-sm text-gray-600">Update scrap sale details</p>
            </div>
          </div>
        </div>

        {/* Asset Type Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Type</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
              Asset Type:
            </label>
            <div className="relative flex-1">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left bg-white flex items-center justify-between"
              >
                <span className={selectedAssetType ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedAssetTypeName ? `${selectedAssetTypeName.asset_type_code} - ${selectedAssetTypeName.asset_type_name}` : 'Select Asset Type'}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search asset types..."
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAssetTypes.length > 0 ? (
                        filteredAssetTypes.map((type) => (
                          <button
                            key={type.asset_type_id}
                            onClick={() => handleAssetTypeSelect(type)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-900">
                              {type.asset_type_code} - {type.asset_type_name}
                            </span>
                            {selectedAssetType === type.asset_type_id && (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No asset types found
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Asset Selection Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Asset Selection</h2>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Available Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Available Assets</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Available Assets Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset ID
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial Number
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAvailableAssets.map((asset, index) => (
                      <tr 
                        key={asset.asset_id}
                        className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        onClick={() => handleSelectAsset(asset)}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.serial_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Controls */}
              <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg mt-2">
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title="Add all assets"
                >
                  Add All
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title="Remove all assets"
                >
                  Remove All
                </button>
              </div>
            </div>

            {/* Desktop Transfer Controls */}
            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              {/* Transfer buttons in order: right single, right all, left single, left all */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add one asset"
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add all assets"
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove one asset"
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove all assets"
                >
                  <span className="text-lg font-bold">{'<<'}</span>
                </button>
              </div>
            </div>

            {/* Selected Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Selected Scrap Assets</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search selected assets..."
                      value={filterTerm}
                      onChange={(e) => setFilterTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Assets Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset ID
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial Number
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value (₹)
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSelectedAssets.map((asset, index) => (
                      <tr 
                        key={asset.asset_id}
                        className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.serial_number}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <input
                            type="number"
                            placeholder="0"
                            value={individualValues[asset.asset_id] || ''}
                            onChange={(e) => handleIndividualValueChange(asset.asset_id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <button
                            onClick={() => handleDeselectAsset(asset)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  Total Assets Selected: <span className="font-semibold text-gray-900">{selectedAssets.length}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Total Individual Values: <span className="font-semibold text-gray-900">₹{totalIndividualValues.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrap Value Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Scrap Value Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Group Name</label>
              <input
                type="text"
                placeholder="e.g. Old Electronics"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Optional: Provide a name for this scrap sale group
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Total Scrap Value (₹)</label>
              <input
                type="number"
                placeholder="Enter total scrap value"
                value={totalScrapValue}
                onChange={(e) => setTotalScrapValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty if using individual values, or provide total to validate against individual values
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <p>Individual Values Total: ₹{totalIndividualValues.toFixed(2)}</p>
              {totalScrapValue && (
                <p className={Math.abs(parseFloat(totalScrapValue) - totalIndividualValues) > 0.01 ? 'text-red-600' : 'text-green-600'}>
                  Difference: ₹{(parseFloat(totalScrapValue) - totalIndividualValues).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Buyer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Buyer Name *</label>
              <input
                type="text"
                placeholder="Full Name"
                value={buyerDetails.buyer_name}
                onChange={(e) => handleBuyerDetailChange('buyer_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
              <input
                type="email"
                placeholder="email@example.com"
                value={buyerDetails.buyer_email}
                onChange={(e) => handleBuyerDetailChange('buyer_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Number *</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={buyerDetails.buyer_contact}
                onChange={(e) => handleBuyerDetailChange('buyer_contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
              <input
                type="text"
                placeholder="Company Name"
                value={buyerDetails.company_name}
                onChange={(e) => handleBuyerDetailChange('company_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedAssets.length === 0}
            className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Updating...
              </>
            ) : (
              <>
                <Save size={16} />
                Update Scrap Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditScrapSales; 