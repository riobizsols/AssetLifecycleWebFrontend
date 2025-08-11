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

const CreateGroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]); // Changed to array for multiple selection
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // New state for API data
  const [assetTypes, setAssetTypes] = useState([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);

  // Fetch asset types on component mount
  useEffect(() => {
    fetchAssetTypes();
  }, []);

  // Fetch asset types from API
  const fetchAssetTypes = async () => {
    setLoadingAssetTypes(true);
    try {
      const response = await API.get('/asset-types/group-required');
      if (response.data && response.data.success) {
        setAssetTypes(response.data.data || []);
      } else {
        toast.error('Failed to fetch asset types');
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error('Failed to fetch asset types');
    } finally {
      setLoadingAssetTypes(false);
    }
  };

  // Fetch assets by asset type
  const fetchAssetsByType = async (assetTypeId) => {
    if (!assetTypeId) return;
    
    setLoadingAssets(true);
    try {
      const response = await API.get(`/assets/type/${assetTypeId}`);
      if (response.data && response.data.success) {
        // Add new assets to existing ones instead of replacing
        setAvailableAssets(prev => {
          const newAssets = response.data.data || [];
          // Filter out assets that are already in the list to avoid duplicates
          const existingAssetIds = prev.map(asset => asset.asset_id);
          const uniqueNewAssets = newAssets.filter(asset => !existingAssetIds.includes(asset.asset_id));
          return [...prev, ...uniqueNewAssets];
        });
      } else {
        toast.error('Failed to fetch assets');
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to fetch assets');
    } finally {
      setLoadingAssets(false);
    }
  };

  // Fetch assets for all selected asset types
  const fetchAssetsForAllTypes = async () => {
    if (selectedAssetTypes.length === 0) {
      setAvailableAssets([]);
      return;
    }
    
    setLoadingAssets(true);
    try {
      // Fetch assets for each selected asset type
      const allAssets = [];
      for (const assetTypeId of selectedAssetTypes) {
        const response = await API.get(`/assets/type/${assetTypeId}`);
        if (response.data && response.data.success) {
          allAssets.push(...(response.data.data || []));
        }
      }
      
      // Remove duplicates based on asset_id
      const uniqueAssets = allAssets.filter((asset, index, self) => 
        index === self.findIndex(a => a.asset_id === asset.asset_id)
      );
      
      setAvailableAssets(uniqueAssets);
    } catch (error) {
      console.error('Error fetching assets for all types:', error);
      toast.error('Failed to fetch assets');
    } finally {
      setLoadingAssets(false);
    }
  };

  const filteredAvailableAssets = availableAssets.filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.asset_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return (asset.name?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.description?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.asset_id?.toLowerCase() || '').includes(filterTerm.toLowerCase());
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = assetTypes.filter(type => 
    type.text?.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    type.asset_type_id?.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

  const handleSelectAsset = (asset) => {
    setSelectedAssets(prev => [...prev, asset]);
    setAvailableAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
  };

  const handleDeselectAsset = (asset) => {
    setAvailableAssets(prev => [...prev, asset]);
    setSelectedAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
  };

  const handleSelectAll = () => {
    setSelectedAssets(prev => [...prev, ...filteredAvailableAssets]);
    setAvailableAssets(prev => prev.filter(asset => 
      !filteredAvailableAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
  };

  const handleDeselectAll = () => {
    setAvailableAssets(prev => [...prev, ...filteredSelectedAssets]);
    setSelectedAssets(prev => prev.filter(asset => 
      !filteredSelectedAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
  };

  const handleAssetTypeSelect = (assetType) => {
    // Check if asset type is already selected
    if (selectedAssetTypes.includes(assetType.asset_type_id)) {
      toast.error('This asset type is already selected');
      return;
    }
    
    // Add new asset type to selection
    const newSelectedTypes = [...selectedAssetTypes, assetType.asset_type_id];
    setSelectedAssetTypes(newSelectedTypes);
    
    // Keep existing selected assets (don't clear them)
    // setSelectedAssets([]); // Removed this line
    
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
    
    // Fetch assets for the newly selected asset type and add to existing ones
    fetchAssetsByType(assetType.asset_type_id);
  };

  // Remove asset type from selection
  const handleRemoveAssetType = (assetTypeId) => {
    setSelectedAssetTypes(prev => prev.filter(id => id !== assetTypeId));
    
    // Remove assets that belong to the removed asset type
    setAvailableAssets(prev => prev.filter(asset => asset.asset_type_id !== assetTypeId));
    
    // Remove selected assets that belong to the removed asset type
    setSelectedAssets(prev => prev.filter(asset => asset.asset_type_id !== assetTypeId));
  };

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (selectedAssetTypes.length === 0) {
      toast.error('Please select at least one asset type');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    setLoading(true);
    try {
      // Prepare data for API
      const groupData = {
        text: groupName.trim(),
        asset_ids: selectedAssets.map(asset => asset.asset_id),
        asset_type_ids: selectedAssetTypes // Include selected asset types
      };

      // Call the API to create asset group
      const response = await API.post('/asset-groups', groupData);
      
      // Check if the response indicates success (201 status or has asset_group data)
      if (response.status === 201 || (response.data && response.data.asset_group)) {
        toast.success('Asset group created successfully!');
        navigate('/group-asset');
      } else {
        toast.error(response.data?.message || 'Failed to create asset group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create asset group');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/group-asset');
  };



  // Get names of all selected asset types
  const getSelectedAssetTypeNames = () => {
    return selectedAssetTypes.map(typeId => {
      const type = assetTypes.find(t => t.asset_type_id === typeId);
      return type ? `${type.asset_type_id} - ${type.text}` : typeId;
    });
  };

  // Get display text for dropdown button
  const getDropdownDisplayText = () => {
    if (selectedAssetTypes.length === 0) return 'Select Asset Type';
    if (selectedAssetTypes.length === 1) {
      const type = assetTypes.find(t => t.asset_type_id === selectedAssetTypes[0]);
      return type ? `${type.asset_type_id} - ${type.text}` : selectedAssetTypes[0];
    }
    return `${selectedAssetTypes.length} Asset Types Selected`;
  };

  // Format date for user display
  const formatDate = (dateString) => {
    if (!dateString || dateString === 'NULL') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return 'N/A';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Main Content - Flexible height */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 h-full flex flex-col">
          {/* Group Name Section - Fixed height */}
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6 flex-shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
                Group Name:
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Main Content Area - Flexible height */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6 min-h-0">
            {/* Available Assets - Flexible height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Assets List</h2>
                
                {/* Asset Type Filter - Searchable Dropdown */}
                <div className="mb-0">
                 
                  <div className="relative">
                    <button
                      type="button"
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
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                        {/* Search Input */}
                        <div className="p-2 border-b border-gray-200">
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
                        </div>
                        
                        {/* Dropdown Options */}
                        <div className="max-h-48 overflow-y-auto">
                          {loadingAssetTypes ? (
                            <div className="px-3 py-2 text-sm text-gray-500">Loading asset types...</div>
                          ) : filteredAssetTypes.length > 0 ? (
                            filteredAssetTypes.map((type) => {
                              const isSelected = selectedAssetTypes.includes(type.asset_type_id);
                              return (
                                <button
                                  key={type.asset_type_id}
                                  onClick={() => handleAssetTypeSelect(type)}
                                  disabled={isSelected}
                                  className={`w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between ${
                                    isSelected ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''
                                  }`}
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
                        
                        {/* Sticky Create New Button */}
                        <div className="border-t border-gray-200 bg-gray-50 sticky bottom-0">
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

              {/* Table Container - Flexible height */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  {loadingAssets ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">Loading assets...</div>
                    </div>
                  ) : availableAssets.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">
                        {selectedAssetTypes.length > 0 ? 'No assets found for selected asset types' : 'Please select an asset type to view assets'}
                      </div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Asset Id
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Name
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Description
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchased On
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
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name || asset.asset_name || asset.text || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description || asset.asset_description || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{formatDate(asset.purchased_on || asset.purchase_date || asset.purchased_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons - Fixed width on desktop, hidden on mobile */}
            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              {/* Transfer buttons in order: right single, right all, left single, left all */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add one asset"
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Add all assets"
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove one asset"
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove all assets"
                >
                  <span className="text-lg font-bold">{'<<'}</span>
                </button>
              </div>
            </div>

            {/* Mobile Action Buttons - Visible only on mobile */}
            <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg">
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

            {/* Selected Assets - Flexible height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] min-h-0">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Assets</h2>
                
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search selected assets..."
                    value={filterTerm}
                    onChange={(e) => setFilterTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Table Container - Flexible height */}
              <div className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset Id
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Purchased On
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredSelectedAssets.map((asset, index) => (
                          <tr 
                            key={asset.asset_id}
                            className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                            onClick={() => handleDeselectAsset(asset)}
                          >
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.asset_id}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name || asset.asset_name || asset.text || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description || asset.asset_description || 'N/A'}</td>
                            <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{formatDate(asset.purchased_on || asset.purchase_date || asset.purchased_cost)}</td>
                          </tr>
                        ))}
                      </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Summary - Fixed height */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
              <div>
                <p className="text-sm text-gray-600">
                  Total Assets Selected: <span className="font-semibold text-gray-900">{selectedAssets.length}</span>
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || !groupName.trim() || selectedAssets.length === 0}
                  className="px-4 sm:px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Save size={16} />
                  )}
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupAsset; 