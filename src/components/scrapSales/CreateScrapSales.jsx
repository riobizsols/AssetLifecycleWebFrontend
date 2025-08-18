import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Plus
} from 'lucide-react';
import API from '../../lib/axios';

const CreateScrapSales = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]); // Multi-select
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  // Asset types from API
  const [assetTypes, setAssetTypes] = useState([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [error, setError] = useState(null);

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

  // Fetch asset types from API
  useEffect(() => {
    const fetchAssetTypes = async () => {
      setLoadingAssetTypes(true);
      try {
        const res = await API.get('/asset-types');
        const types = (res.data?.asset_types) || res.data?.rows || res.data || [];
        setAssetTypes(Array.isArray(types) ? types : []);
      } catch (error) {
        console.error('Error fetching asset types:', error);
        setAssetTypes([]);
        toast.error('Failed to fetch asset types');
      } finally {
        setLoadingAssetTypes(false);
      }
    };
    fetchAssetTypes();
  }, []);


  useEffect(() => {
    const fetchAvailableAssets = async () => {
      if (selectedAssetTypes.length === 0) {
        setAvailableAssets([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const fetchPromises = selectedAssetTypes.map(typeId =>
          API.get(`/scrap-assets-by-type/${typeId}`)
        );
        const responses = await Promise.all(fetchPromises);

        // Correctly access the 'scrap_assets' array from each response
        const newAssets = responses.flatMap(response => response.data.scrap_assets);

        console.log('Fetched assets for selected types:', newAssets);

        setAvailableAssets(newAssets);
        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
        setError('Failed to load assets. Please try again.');
        setLoading(false);
      }
    };

    fetchAvailableAssets();
  }, [selectedAssetTypes]);

  const filteredAvailableAssets = availableAssets.filter(asset =>
    asset.asset_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.asset_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (asset.asset_description && asset.asset_description.toLowerCase().includes(searchTerm.toLowerCase())) ||
    asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return (asset.name?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
      (asset.description?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
      (asset.asset_id?.toLowerCase() || '').includes(filterTerm.toLowerCase());
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = assetTypes.filter(type =>
    (type.text || '').toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    (type.asset_type_id || '').toLowerCase().includes(dropdownSearchTerm.toLowerCase())
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
    // Avoid duplicates
    if (selectedAssetTypes.includes(assetType.asset_type_id)) {
      toast.error('This asset type is already selected');
      return;
    }
    setSelectedAssetTypes(prev => [...prev, assetType.asset_type_id]);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleRemoveAssetType = (assetTypeId) => {
    setSelectedAssetTypes(prev => prev.filter(id => id !== assetTypeId));
    // Remove selected assets of this type and return them to available
    setAvailableAssets(prev => {
      const removed = selectedAssets.filter(a => a.asset_type_id === assetTypeId);
      return [...prev, ...removed];
    });
    setSelectedAssets(prev => prev.filter(a => a.asset_type_id !== assetTypeId));
    // Clean individual values for removed assets
    setIndividualValues(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        const asset = selectedAssets.find(a => a.asset_id === k);
        if (asset && asset.asset_type_id === assetTypeId) delete next[k];
      });
      return next;
    });
  };

  const getSelectedAssetTypeNames = () => {
    return selectedAssetTypes.map(typeId => {
      const type = assetTypes.find(t => t.asset_type_id === typeId);
      return type ? `${type.asset_type_id} - ${type.text}` : typeId;
    });
  };

  const getDropdownDisplayText = () => {
    if (selectedAssetTypes.length === 0) return 'Select Asset Type';
    if (selectedAssetTypes.length === 1) return getSelectedAssetTypeNames()[0];
    return `${selectedAssetTypes.length} Asset Types Selected`;
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

      // Generate scrap ID
      const scrapId = `SCR${Date.now()}`;

      const scrapSaleData = {
        scrap_id: scrapId,
        group_name: groupName,
        selected_assets: selectedAssets.map(asset => ({
          ...asset,
          scrap_value: individualValues[asset.asset_id] || 0
        })),
        total_scrap_value: totalScrapValue || totalIndividualValues,
        buyer_details: buyerDetails,
        status: 'Pending',
        created_by: user?.name || 'Admin User',
        created_date: new Date().toISOString().split('T')[0]
      };

      console.log('Creating scrap sale:', scrapSaleData);
      toast.success('Scrap sale created successfully!');
      navigate('/scrap-sales');
    } catch (error) {
      console.error('Error creating scrap sale:', error);
      toast.error('Failed to create scrap sale');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/scrap-sales');
  };

  // Multi-select display handled via helpers above

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
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Create Scrap Sale</h1>
              <p className="text-sm text-gray-600">Select assets and configure scrap sale details</p>
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
                <span className={selectedAssetTypes.length > 0 ? 'text-gray-900' : 'text-gray-500'}>
                  {getDropdownDisplayText()}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {/* Selected Asset Type Badges */}
              {selectedAssetTypes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {getSelectedAssetTypeNames().map((typeName, index) => {
                    const typeId = selectedAssetTypes[index];
                    return (
                      <div
                        key={typeId}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        <span>{typeName}</span>
                        <button
                          onClick={() => handleRemoveAssetType(typeId)}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                          title="Remove asset type"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="p-2">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        placeholder="Search asset types..."
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>

                    {/* Dropdown Options */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAssetTypes.length > 0 ? (
                        filteredAssetTypes.map((type) => {
                          const isSelected = selectedAssetTypes.includes(type.asset_type_id);
                          return (
                            <button
                              key={type.asset_type_id}
                              onClick={() => handleAssetTypeSelect(type)}
                              disabled={isSelected}
                              className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${isSelected ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}`}
                            >
                              <span className="text-sm text-gray-900">
                                {type.asset_type_id} - {type.text}
                              </span>
                              {isSelected && (
                                <Check size={16} className="text-blue-600" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          No asset types found
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setDropdownSearchTerm('');
                        navigate('/master-data/asset-types/add');
                      }}
                      className="w-full px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md flex items-center justify-center gap-2 font-medium"
                    >
                      <Plus size={16} />
                      Create New Asset Type
                    </button>
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
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
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
  {loading ? (
    <tr>
      <td colSpan="4" className="text-center py-4 text-gray-500">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
          Loading assets...
        </div>
      </td>
    </tr>
  ) : error ? (
    <tr>
      <td colSpan="4" className="text-center py-4 text-red-500">
        {error}
      </td>
    </tr>
  ) : filteredAvailableAssets.length > 0 ? (
    filteredAvailableAssets.map((asset, index) => (
      <tr 
        key={asset.asd_id}
        className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
        onClick={() => handleSelectAsset(asset)}
      >
        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_name}</td>
        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_description}</td>
        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.serial_number}</td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="4" className="text-center py-4 text-gray-500">
        No assets found for the selected asset types.
      </td>
    </tr>
  )}
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
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
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
                            <X size={16} />
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
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Scrap Sale
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateScrapSales; 