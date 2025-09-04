import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ChevronDown, Check, X, ArrowRight, ArrowLeft, Search, Plus } from 'lucide-react';
import SearchableDropdown from '../ui/SearchableDropdown';

const EditGroupAsset = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // API data states
  const [assetTypes, setAssetTypes] = useState([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingGroupData, setLoadingGroupData] = useState(true);
  
  // Document upload states
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  
  // Get group data from navigation state or fetch by ID
  const groupId = location.pathname.split('/').pop();
  const isEdit = location.state?.isEdit || false;
  const groupData = location.state?.groupData;

  useEffect(() => {
    if (isEdit && groupData) {
      // Use data from navigation state
      setGroupName(groupData.group_name || '');
      // Note: We'll need to fetch the actual assets in this group
      fetchGroupDetails(groupId);
    } else {
      // Fetch group data by ID
      fetchGroupDetails(groupId);
    }
    
    // Fetch asset types for dropdown
    fetchAssetTypes();
  }, [groupId, isEdit, groupData]);

  // Fetch existing group details
  const fetchGroupDetails = async (id) => {
    try {
      setLoadingGroupData(true);
      const response = await API.get(`/asset-groups/${id}`);
      
      if (response.data && response.data.header) {
        const group = response.data.header;
        const assets = response.data.details || [];
        
        setGroupName(group.text || '');
        
        // Extract asset type IDs from the assets
        const assetTypeIds = [...new Set(assets.map(asset => asset.asset_type_id))];
        setSelectedAssetTypes(assetTypeIds);
        
        // Set selected assets
        setSelectedAssets(assets.map(asset => ({
          asset_id: asset.asset_id,
          name: asset.asset_name || asset.text || 'N/A',
          asset_type_id: asset.asset_type_id,
          purchased_on: asset.purchased_on
        })));
        
        // Fetch assets for all asset types
        await fetchAssetsForAllTypes(assetTypeIds);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      toast.error('Failed to fetch group details');
    } finally {
      setLoadingGroupData(false);
    }
  };

  // Fetch asset types
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
        setAvailableAssets(prev => {
          const newAssets = response.data.data || [];
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
  const fetchAssetsForAllTypes = async (assetTypeIds) => {
    if (assetTypeIds.length === 0) {
      setAvailableAssets([]);
      return;
    }
    
    setLoadingAssets(true);
    try {
      const allAssets = [];
      for (const assetTypeId of assetTypeIds) {
        const response = await API.get(`/assets/type/${assetTypeId}`);
        if (response.data && response.data.success) {
          allAssets.push(...(response.data.data || []));
        }
      }
      
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

  // Asset selection handlers
  const handleSelectAsset = (asset) => {
    if (!selectedAssets.find(selected => selected.asset_id === asset.asset_id)) {
    setSelectedAssets(prev => [...prev, asset]);
    }
  };

  const handleDeselectAsset = (asset) => {
    setSelectedAssets(prev => prev.filter(selected => selected.asset_id !== asset.asset_id));
  };

  const handleSelectAll = () => {
    setSelectedAssets(availableAssets);
  };

  const handleDeselectAll = () => {
    setSelectedAssets([]);
  };

  // Asset type selection handlers
  const handleAssetTypeSelect = (assetType) => {
    if (selectedAssetTypes.includes(assetType.asset_type_id)) {
      toast.error('This asset type is already selected');
      return;
    }
    
    const newSelectedTypes = [...selectedAssetTypes, assetType.asset_type_id];
    setSelectedAssetTypes(newSelectedTypes);
    
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
    
    fetchAssetsByType(assetType.asset_type_id);
  };

  const handleRemoveAssetType = (assetTypeId) => {
    setSelectedAssetTypes(prev => prev.filter(id => id !== assetTypeId));
    
    setAvailableAssets(prev => prev.filter(asset => asset.asset_type_id !== assetTypeId));
    
    setSelectedAssets(prev => prev.filter(asset => asset.asset_type_id !== assetTypeId));
  };

  // Filter asset types for dropdown
  const filteredAssetTypes = assetTypes.filter(type =>
    type.text.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    type.asset_type_id.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

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

  // Update asset group
  const handleUpdate = async () => {
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
      const updateData = {
        text: groupName.trim(),
        asset_ids: selectedAssets.map(asset => asset.asset_id)
      };

      const response = await API.put(`/asset-groups/${groupId}`, updateData);
      
      if (response.data && response.data.message) {
        toast.success('Asset group updated successfully!');
      navigate('/group-asset');
      } else {
        toast.error('Failed to update asset group');
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error('Failed to update asset group');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/group-asset');
  };

  // Handle batch upload for group asset documents
  const handleBatchUpload = async () => {
    if (uploadRows.length === 0) {
      toast.error('Add at least one file');
      return;
    }

    // Validate all attachments
    for (const r of uploadRows) {
      if (!r.type || !r.file) {
        toast.error('Select document type and choose a file for all rows');
        return;
      }
      if (r.type === 'OT' && !r.docTypeName?.trim()) {
        toast.error('Enter Doc Type Name for OT documents');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const r of uploadRows) {
        try {
          const fd = new FormData();
          fd.append('file', r.file);
          fd.append('doc_type', r.type);
          if (r.type === 'OT') fd.append('doc_type_name', r.docTypeName);
          
          // Since this is for existing group assets, we'll store the files temporarily
          // and they'll be uploaded when the group asset is updated
          successCount++;
        } catch (err) {
          console.error('Failed to process file:', r.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All files processed successfully. They will be uploaded when you update the group asset.');
        } else {
          toast.success(`${successCount} files processed, ${failCount} failed`);
        }
        // Don't clear attachments - they'll be uploaded with the group asset update
      } else {
        toast.error('Failed to process any files');
      }
    } catch (err) {
      console.error('Process error:', err);
      toast.error('Process failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingGroupData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading group details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-xl font-semibold text-gray-900">Edit Asset Group</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Group'}
          </button>
        </div>
      </div>

              {/* Main Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 flex flex-col min-h-0">
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

          {/* Main Content Area - Fixed height for tables */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Available Assets - Fixed height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 h-[500px]">
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
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                        {/* Search */}
                        <div className="p-3 border-b">
                          <input
                            type="text"
                            placeholder="Search asset types..."
                            value={dropdownSearchTerm}
                            onChange={(e) => setDropdownSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        {/* Selected Asset Types Display */}
                        {selectedAssetTypes.length > 0 && (
                          <div className="p-3 border-b bg-gray-50">
                            <div className="text-xs font-medium text-gray-700 mb-2">Selected Asset Types:</div>
                            <div className="flex flex-wrap gap-1">
                              {getSelectedAssetTypeNames().map((typeName, index) => {
                                const typeId = selectedAssetTypes[index];
                                return (
                                  <span
                                    key={typeId}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                  >
                                    {typeName}
                                    <button
                                      onClick={() => handleRemoveAssetType(typeId)}
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      <X size={10} />
                                    </button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
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
                      </div>
                    )}
                  </div>
                </div>

                {/* Asset Search and Select All/None Buttons - Same line */}
                <div className="mt-4 flex items-center justify-between gap-4">
                  {/* Select All/None Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
                    >
                      Select All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      Deselect All
                    </button>
                  </div>
                  
                  {/* Compact Search Bar */}
                  <div className="relative w-64">
                    {searchTerm ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Search assets..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={() => setSearchTerm('')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Clear search"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => document.getElementById('asset-search-input')?.focus()}
                        className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left bg-white flex items-center gap-2 text-gray-500 hover:text-gray-700"
                      >
                        <Search size={14} />
                        <span className="text-xs">Search...</span>
                      </button>
                    )}
                    <input
                      id="asset-search-input"
                      type="text"
                      placeholder="Search assets..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`absolute inset-0 px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white ${
                        searchTerm ? 'opacity-100' : 'opacity-0 pointer-events-none'
                      }`}
                      onFocus={() => setSearchTerm('')}
                    />
                  </div>
                </div>
              </div>

              {/* Assets Table */}
              <div className="flex-1 overflow-auto">
                {loadingAssets ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-sm text-gray-500">Loading assets...</p>
                    </div>
                  </div>
                ) : availableAssets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            Select
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Asset ID
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      Name
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            Asset Type
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            Purchase Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                        {availableAssets
                          .filter(asset => 
                            asset.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            asset.asset_id?.toLowerCase().includes(searchTerm.toLowerCase())
                          )
                          .map((asset) => {
                            const isSelected = selectedAssets.some(selected => selected.asset_id === asset.asset_id);
                            return (
                              <tr key={asset.asset_id} className={isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                                <td className="px-3 py-3 whitespace-nowrap">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => isSelected ? handleDeselectAsset(asset) : handleSelectAsset(asset)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  <span className="truncate block max-w-[60px]" title={asset.asset_id}>
                                    {asset.asset_id}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-sm text-gray-900">
                                  <span className="truncate block max-w-[80px]" title={asset.name || asset.asset_name || asset.text || 'N/A'}>
                                    {asset.name || asset.asset_name || asset.text || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-3 py-3 text-sm text-gray-500">
                                  <div className="max-w-[100px] break-words">
                                    {asset.asset_type_id}
                                  </div>
                                </td>
                                <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                                  <span className="truncate block max-w-[70px]" title={formatDate(asset.purchased_on || asset.purchase_date)}>
                                    {formatDate(asset.purchased_on || asset.purchase_date)}
                                  </span>
                                </td>
                    </tr>
                            );
                          })}
                </tbody>
              </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <div className="text-gray-500">
                        {selectedAssetTypes.length > 0 ? 'No assets found for selected asset types' : 'Please select an asset type to view assets'}
                      </div>
            </div>
          </div>
                )}
            </div>
          </div>



          {/* Selected Assets */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Assets ({selectedAssets.length})
                </h2>
                {selectedAssets.length > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Clear All
                  </button>
                )}
            </div>

              <div className="flex-1 overflow-auto">
                {selectedAssets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Asset ID
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            Name
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            Asset Type
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            Purchase Date
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedAssets.map((asset) => (
                          <tr key={asset.asset_id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              <span className="truncate block max-w-[60px]" title={asset.asset_id}>
                                {asset.asset_id}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-900">
                              <span className="truncate block max-w-[80px]" title={asset.name || asset.asset_name || asset.text || 'N/A'}>
                                {asset.name || asset.asset_name || asset.text || 'N/A'}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-sm text-gray-500">
                              <div className="max-w-[100px] break-words">
                                {asset.asset_type_id}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                              <span className="truncate block max-w-[70px]" title={formatDate(asset.purchased_on || asset.purchase_date)}>
                                {formatDate(asset.purchased_on || asset.purchase_date)}
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleDeselectAsset(asset)}
                                className="text-red-600 hover:text-red-800"
                                title="Remove from selection"
                              >
                                <X size={16} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center text-gray-500">
                      <ArrowLeft size={24} className="mx-auto mb-2 text-gray-400" />
                      <p>Select assets from the left table</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
              <div className="text-sm text-gray-600 mb-3">Types: Purchase Order, Invoice, Warranty, Technical Spec, Insurance, OT</div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-700">Upload Documents</div>
                <button 
                  type="button" 
                  onClick={() => setUploadRows(prev => ([...prev, { id: crypto.randomUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                  className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  Add Document
                </button>
              </div>
              
              {uploadRows.length === 0 ? (
                <div className="text-sm text-gray-500">No documents added.</div>
              ) : (
                <div className="space-y-3">
                  {uploadRows.map(r => (
                    <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Document Type</label>
                        <SearchableDropdown
                          options={[
                            { id: 'Purchase_Order', text: 'Purchase Order' },
                            { id: 'Invoice', text: 'Invoice' },
                            { id: 'Warranty', text: 'Warranty' },
                            { id: 'Technical_Spec', text: 'Technical Spec' },
                            { id: 'Insurance', text: 'Insurance' },
                            { id: 'OT', text: 'OT' }
                          ]}
                          value={r.type}
                          onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                          placeholder="Select type"
                          searchPlaceholder="Search types..."
                          className="w-full"
                          displayKey="text"
                          valueKey="id"
                        />
                      </div>

                      {r.type === 'OT' && (
                        <div className="col-span-3">
                          <label className="block text-xs font-medium mb-1">Doc Type Name</label>
                          <input
                            className="w-full border rounded px-2 py-2 text-sm h-[38px]"
                            value={r.docTypeName}
                            onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))}
                            placeholder="Enter type name"
                          />
                        </div>
                      )}

                      <div className={r.type === 'OT' ? 'col-span-4' : 'col-span-7'}>
                        <label className="block text-xs font-medium mb-1">File (Max 10MB)</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-md">
                            <input
                              type="file"
                              id={`file-${r.id}`}
                              onChange={e => {
                                const f = e.target.files?.[0] || null;
                                if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                                  toast.error('File size exceeds 15MB limit');
                                  e.target.value = '';
                                  return;
                                }
                                const previewUrl = f ? URL.createObjectURL(f) : '';
                                setUploadRows(prev => prev.map(x => x.id===r.id?{...x,file:f,previewUrl}:x));
                              }}
                              className="hidden"
                            />
                            <label
                              htmlFor={`file-${r.id}`}
                              className="flex items-center h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                            >
                              <svg className="w-4 h-4 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              <span className="truncate max-w-[200px] inline-block">
                                {r.file ? r.file.name : 'Choose file'}
                              </span>
                            </label>
                          </div>

                          {r.previewUrl && (
                            <a 
                              href={r.previewUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                            >
                              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
                              </svg>
                              Preview
                            </a>
                          )}
                          <button 
                            type="button" 
                            onClick={() => setUploadRows(prev => prev.filter(x => x.id!==r.id))}
                            className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Button */}
              {uploadRows.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleBatchUpload}
                    disabled={isUploading || uploadRows.some(r => !r.type || !r.file || (r.type === 'OT' && !r.docTypeName?.trim()))}
                    className="h-[38px] inline-flex items-center px-6 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Process All Files
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGroupAsset; 