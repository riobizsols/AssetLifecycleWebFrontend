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
import SearchableDropdown from '../ui/SearchableDropdown';

const CreateGroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
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
  
  // Document upload states
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);

  // Fetch asset types on component mount
  useEffect(() => {
    fetchAssetTypes();
    fetchDocumentTypes();
  }, []);

  // Fetch document types on component mount
  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for asset groups...');
      const res = await API.get('/doc-type-objects/object-type/asset group');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const docTypes = res.data.data.map(docType => ({
          id: docType.dto_id,  // Use dto_id instead of doc_type
          text: docType.doc_type_text,
          doc_type: docType.doc_type  // Keep doc_type for reference
        }));
        setDocumentTypes(docTypes);
        console.log('Document types loaded:', docTypes);
      } else {
        console.log('No document types found, using fallback');
        setDocumentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching document types:', err);
      toast.error('Failed to load document types');
      setDocumentTypes([]);
    }
  };

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
  const fetchAssetsForSelectedType = async () => {
    if (!selectedAssetType) {
      setAvailableAssets([]);
      return;
    }
    setLoadingAssets(true);
    try {
      const response = await API.get(`/group-assets/available/${selectedAssetType}`);
      const list = Array.isArray(response.data?.assets)
        ? response.data.assets
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
      setAvailableAssets(list);
    } catch (error) {
      console.error('Error fetching assets:', error);
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
    setSelectedAssetType(assetType.asset_type_id);
    setSelectedAssets([]);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
    fetchAssetsForSelectedType();
  };

  // Remove asset type from selection
  // Not needed for single select

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }

    if (!selectedAssetType) {
      toast.error('Please select an asset type');
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
        asset_type_ids: [selectedAssetType]
      };

      // Call the API to create asset group
      const response = await API.post('/asset-groups', groupData);
      
      // Check if the response indicates success (201 status or has asset_group data)
      if (response.status === 201 || (response.data && response.data.asset_group)) {
        console.log('CreateGroupAsset - Full response:', response);
        console.log('CreateGroupAsset - Response data:', response.data);
        console.log('CreateGroupAsset - Response data keys:', Object.keys(response.data || {}));
        
        // Extract asset group ID from the correct response structure
        const assetGroupId = response.data?.asset_group?.header?.assetgroup_h_id;
        
        console.log('CreateGroupAsset - Extracted assetGroupId:', assetGroupId);
        
        // Upload documents if any
        if (assetGroupId && uploadRows.length > 0) {
          console.log('CreateGroupAsset - Uploading documents for assetGroupId:', assetGroupId);
          console.log('CreateGroupAsset - Upload rows:', uploadRows);
          
          for (const r of uploadRows) {
            if (!r.type || !r.file) continue;
            
            console.log('CreateGroupAsset - Uploading document:', r.file.name, 'Type:', r.type);
            
            const fd = new FormData();
            fd.append('file', r.file);
            fd.append('dto_id', r.type);
            fd.append('asset_group_id', assetGroupId);
            if (r.type && r.docTypeName?.trim()) {
              fd.append('doc_type_name', r.docTypeName);
            }
            
            try {
              const uploadResponse = await API.post('/asset-group-docs/upload', fd, { 
                headers: { 'Content-Type': 'multipart/form-data' }
              });
              console.log('CreateGroupAsset - Document upload success:', uploadResponse.data);
            } catch (upErr) {
              console.error('Asset group doc upload failed', upErr);
            }
          }
        } else {
          console.log('CreateGroupAsset - No documents to upload or no assetGroupId');
          console.log('CreateGroupAsset - assetGroupId:', assetGroupId);
          console.log('CreateGroupAsset - uploadRows.length:', uploadRows.length);
        }
        
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
      // Check if the selected document type requires a custom name
      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !r.docTypeName?.trim()) {
        toast.error(`Enter custom name for ${selectedDocType.text} documents`);
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
          fd.append('dto_id', r.type);  // Send dto_id instead of doc_type
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          // Since this is for new group assets, we'll store the files temporarily
          // and they'll be uploaded when the group asset is created
          successCount++;
        } catch (err) {
          console.error('Failed to process file:', r.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All files processed successfully. They will be uploaded when you save the group asset.');
        } else {
          toast.success(`${successCount} files processed, ${failCount} failed`);
        }
        // Don't clear attachments - they'll be uploaded with the group asset
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



  // Get names of all selected asset types
  // Not needed for single select

  // Get display text for dropdown button
  const getDropdownDisplayText = () => {
    if (!selectedAssetType) return 'Select Asset Type';
    const type = assetTypes.find(t => t.asset_type_id === selectedAssetType);
    return type ? `${type.asset_type_id} - ${type.text}` : selectedAssetType;
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
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
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
                      <span className={selectedAssetType ? 'text-gray-900' : 'text-gray-500'}>
                        {getDropdownDisplayText()}
                      </span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                    
                    {/* Selected Asset Type Badges */}
                    {/* No badges for single selection */}
                    
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
                              return (
                                <button
                                  key={type.asset_type_id}
                                  onClick={() => handleAssetTypeSelect(type)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                                >
                                  <span className="text-sm text-gray-900">
                                    {type.asset_type_id} - {type.text}
                                  </span>
                                  {selectedAssetType === type.asset_type_id && (
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
                      <div className="text-gray-500">{selectedAssetType ? 'No assets found for selected asset type' : 'Please select an asset type to view assets'}</div>
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

            {/* Selected Assets - Fixed height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
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

          {/* Documents Section */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
              <div className="text-sm text-gray-600 mb-3">Document types are loaded from the system configuration</div>
              
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
                          options={documentTypes}
                          value={r.type}
                          onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                          placeholder="Select type"
                          searchPlaceholder="Search types..."
                          className="w-full"
                          displayKey="text"
                          valueKey="id"
                        />
                      </div>

                      {(() => {
                        const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                        const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                        return needsCustomName && (
                          <div className="col-span-3">
                            <label className="block text-xs font-medium mb-1">Custom Name</label>
                            <input
                              className="w-full border rounded px-2 py-2 text-sm h-[38px]"
                              value={r.docTypeName}
                              onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))}
                              placeholder={`Enter custom name for ${selectedDocType?.text}`}
                            />
                          </div>
                        );
                      })()}

                      <div className={(() => {
                        const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                        const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                        return needsCustomName ? 'col-span-4' : 'col-span-7';
                      })()}>
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
                    disabled={isUploading || uploadRows.some(r => {
                      if (!r.type || !r.file) return true;
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                      return needsCustomName && !r.docTypeName?.trim();
                    })}
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