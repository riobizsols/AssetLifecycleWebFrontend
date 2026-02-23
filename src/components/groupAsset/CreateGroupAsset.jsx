import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { generateUUID } from '../../utils/uuid';
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
import { useAuditLog } from '../../hooks/useAuditLog';
import { GROUP_ASSETS_APP_ID } from '../../constants/groupAssetsAuditEvents';
import { useLanguage } from '../../contexts/LanguageContext';

const CreateGroupAsset = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(GROUP_ASSETS_APP_ID);
  
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
      toast.error(t('groupAsset.createGroupAsset.failedToLoadDocumentTypes'));
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
        toast.error(t('groupAsset.createGroupAsset.failedToFetchAssetTypes'));
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error(t('groupAsset.createGroupAsset.failedToFetchAssetTypes'));
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
        toast.error(t('groupAsset.createGroupAsset.failedToFetchAssets'));
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error(t('groupAsset.createGroupAsset.failedToFetchAssets'));
    } finally {
      setLoadingAssets(false);
    }
  };

  // Fetch assets for all selected asset types
  const fetchAssetsForSelectedType = async (assetTypeId = null) => {
    const typeId = assetTypeId || selectedAssetType;
    if (!typeId) {
      setAvailableAssets([]);
      return;
    }
    setLoadingAssets(true);
    try {
      const response = await API.get(`/group-assets/available/${typeId}`);
      const list = Array.isArray(response.data?.assets)
        ? response.data.assets
        : Array.isArray(response.data?.data)
          ? response.data.data
          : Array.isArray(response.data)
            ? response.data
            : [];
      
      // Filter assets to ensure they match the selected asset type, org_id, and branch_id (client-side safety check)
      const filteredList = list.filter(asset => {
        const matchesAssetType = asset.asset_type_id === typeId;
        const matchesOrg = !user?.org_id || asset.org_id === user.org_id;
        const matchesBranch = !user?.branch_id || asset.branch_id === user.branch_id;
        return matchesAssetType && matchesOrg && matchesBranch;
      });
      
      // Log for debugging if there's a mismatch
      if (filteredList.length !== list.length) {
        console.warn(`Warning: Backend returned ${list.length} assets, but only ${filteredList.length} match filters`);
        const assetTypeMismatch = list.filter(asset => asset.asset_type_id !== typeId);
        const orgMismatch = list.filter(asset => user?.org_id && asset.org_id !== user.org_id);
        const branchMismatch = list.filter(asset => user?.branch_id && asset.branch_id !== user.branch_id);
        
        if (assetTypeMismatch.length > 0) {
          console.warn('Assets with mismatched asset_type_id:', assetTypeMismatch);
        }
        if (orgMismatch.length > 0) {
          console.warn('Assets with mismatched org_id:', orgMismatch);
        }
        if (branchMismatch.length > 0) {
          console.warn('Assets with mismatched branch_id:', branchMismatch);
        }
      }
      
      setAvailableAssets(filteredList);
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error(t('groupAsset.createGroupAsset.failedToFetchAssets'));
    } finally {
      setLoadingAssets(false);
    }
  };

  const filteredAvailableAssets = availableAssets.filter(asset => {
    // First, filter by selected asset type to ensure correct assets are shown
    const matchesAssetType = !selectedAssetType || asset.asset_type_id === selectedAssetType;
    
    // Filter by user's organization and branch
    const matchesOrg = !user?.org_id || asset.org_id === user.org_id;
    const matchesBranch = !user?.branch_id || asset.branch_id === user.branch_id;
    
    // Then filter by search term
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.asset_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    return matchesAssetType && matchesOrg && matchesBranch && matchesSearch;
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
    const newAssetTypeId = assetType.asset_type_id;
    // Clear existing assets and selected assets when changing asset type
    setAvailableAssets([]);
    setSelectedAssets([]);
    setSelectedAssetType(newAssetTypeId);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
    // Fetch assets for the newly selected type (pass the ID directly to avoid race condition)
    fetchAssetsForSelectedType(newAssetTypeId);
  };

  // Remove asset type from selection
  // Not needed for single select

  const handleSave = async () => {
    if (!groupName.trim()) {
      toast.error(t('groupAsset.createGroupAsset.pleaseEnterGroupName'));
      return;
    }

    if (!selectedAssetType) {
      toast.error(t('groupAsset.createGroupAsset.pleaseSelectAssetType'));
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error(t('groupAsset.createGroupAsset.pleaseSelectAtLeastOneAsset'));
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
        
        // Log audit event for group creation
        await recordActionByNameWithFetch('Create', { 
          groupId: assetGroupId,
          groupName: groupName.trim(),
          assetCount: selectedAssets.length,
          action: 'Group Asset Created Successfully'
        });
        
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
              
              // Log audit event for document upload
              await recordActionByNameWithFetch('Add Document', { 
                groupId: assetGroupId,
                docTypeId: r.type,
                action: 'Document Added to Group Asset'
              });
            } catch (upErr) {
              console.error('Asset group doc upload failed', upErr);
            }
          }
        } else {
          console.log('CreateGroupAsset - No documents to upload or no assetGroupId');
          console.log('CreateGroupAsset - assetGroupId:', assetGroupId);
          console.log('CreateGroupAsset - uploadRows.length:', uploadRows.length);
        }
        
        toast.success(t('groupAsset.createGroupAsset.assetGroupCreatedSuccessfully'));
        navigate('/group-asset');
      } else {
        toast.error(response.data?.message || t('groupAsset.createGroupAsset.failedToCreateAssetGroup'));
      }
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(t('groupAsset.createGroupAsset.failedToCreateAssetGroup'));
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
      toast.error(t('groupAsset.createGroupAsset.addAtLeastOneFile'));
      return;
    }

    // Validate all attachments
    for (const r of uploadRows) {
      if (!r.type || !r.file) {
        toast.error(t('groupAsset.createGroupAsset.selectDocumentTypeAndChooseFile'));
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !r.docTypeName?.trim()) {
        toast.error(t('groupAsset.createGroupAsset.enterCustomNameFor', { docType: selectedDocType.text }));
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
          toast.success(t('groupAsset.createGroupAsset.allFilesProcessedSuccessfully'));
        } else {
          toast.success(t('groupAsset.createGroupAsset.filesProcessed', { successCount, failCount }));
        }
        // Don't clear attachments - they'll be uploaded with the group asset
      } else {
        toast.error(t('groupAsset.createGroupAsset.failedToProcessAnyFiles'));
      }
    } catch (err) {
      console.error('Process error:', err);
      toast.error(t('groupAsset.createGroupAsset.processFailed'));
    } finally {
      setIsUploading(false);
    }
  };



  // Get names of all selected asset types
  // Not needed for single select

  // Get display text for dropdown button
  const getDropdownDisplayText = () => {
    if (!selectedAssetType) return t('groupAsset.createGroupAsset.selectAssetType');
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
                {t('groupAsset.createGroupAsset.groupName')}
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('groupAsset.createGroupAsset.enterGroupName')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Main Content Area - Fixed height for tables */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Available Assets - Fixed height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('groupAsset.createGroupAsset.assetsList')}</h2>
                
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
                              placeholder={t('groupAsset.createGroupAsset.selectAssetType')}
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
                            <div className="px-3 py-2 text-sm text-gray-500">{t('groupAsset.createGroupAsset.loadingAssetTypes')}</div>
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
                              {t('groupAsset.createGroupAsset.noAssetTypesFound')}
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
                            {t('groupAsset.createGroupAsset.createNewAssetType')}
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
                      <div className="text-gray-500">{t('groupAsset.createGroupAsset.loadingAssets')}</div>
                    </div>
                  ) : availableAssets.length === 0 ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="text-gray-500">{selectedAssetType ? t('groupAsset.createGroupAsset.noAssetsFoundForSelectedType') : t('groupAsset.createGroupAsset.pleaseSelectAssetTypeToViewAssets')}</div>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('groupAsset.createGroupAsset.name')}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('groupAsset.createGroupAsset.description')}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('groupAsset.createGroupAsset.purchasedOn')}
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
                  title={t('groupAsset.createGroupAsset.addOneAsset')}
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('groupAsset.createGroupAsset.addAllAssets')}
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('groupAsset.createGroupAsset.removeOneAsset')}
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('groupAsset.createGroupAsset.removeAllAssets')}
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
                title={t('groupAsset.createGroupAsset.addAllAssets')}
              >
                {t('groupAsset.createGroupAsset.addAll')}
              </button>
              <button
                onClick={handleDeselectAll}
                disabled={filteredSelectedAssets.length === 0}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                title={t('groupAsset.createGroupAsset.removeAllAssets')}
              >
                {t('groupAsset.createGroupAsset.removeAll')}
              </button>
            </div>

            {/* Selected Assets - Fixed height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('groupAsset.createGroupAsset.selectedAssets')}</h2>
                
                {/* Search in selected assets */}
                <div className="relative mb-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder={t('groupAsset.createGroupAsset.searchSelectedAssets')}
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
                            {t('groupAsset.createGroupAsset.name')}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('groupAsset.createGroupAsset.description')}
                          </th>
                          <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {t('groupAsset.createGroupAsset.purchasedOn')}
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('groupAsset.createGroupAsset.documents')}</h3>
              <div className="text-sm text-gray-600 mb-3">{t('groupAsset.createGroupAsset.documentTypesLoadedFromSystem')}</div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-700">{t('groupAsset.createGroupAsset.uploadDocuments')}</div>
                <button 
                  type="button" 
                  onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                  className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  {t('groupAsset.createGroupAsset.addDocument')}
                </button>
              </div>
              
              {uploadRows.length === 0 ? (
                <div className="text-sm text-gray-500">{t('groupAsset.createGroupAsset.noDocumentsAdded')}</div>
              ) : (
                <div className="space-y-3">
                  {uploadRows.map(r => (
                    <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">{t('groupAsset.createGroupAsset.documentType')}</label>
                        <SearchableDropdown
                          options={documentTypes}
                          value={r.type}
                          onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                          placeholder={t('groupAsset.createGroupAsset.selectType')}
                          searchPlaceholder={t('groupAsset.createGroupAsset.searchTypes')}
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
                            <label className="block text-xs font-medium mb-1">{t('groupAsset.createGroupAsset.customName')}</label>
                            <input
                              className="w-full border rounded px-2 py-2 text-sm h-[38px]"
                              value={r.docTypeName}
                              onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))}
                              placeholder={t('groupAsset.createGroupAsset.enterCustomNameFor', { docType: selectedDocType?.text })}
                            />
                          </div>
                        );
                      })()}

                      <div className={(() => {
                        const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                        const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                        return needsCustomName ? 'col-span-4' : 'col-span-7';
                      })()}>
                        <label className="block text-xs font-medium mb-1">{t('groupAsset.createGroupAsset.fileMaxSize')}</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-md">
                            <input
                              type="file"
                              id={`file-${r.id}`}
                              onChange={e => {
                                const f = e.target.files?.[0] || null;
                                if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                                  toast.error(t('groupAsset.createGroupAsset.fileSizeExceedsLimit'));
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
                                {r.file ? r.file.name : t('groupAsset.createGroupAsset.chooseFile')}
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
                              {t('groupAsset.createGroupAsset.preview')}
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
                            {t('groupAsset.createGroupAsset.remove')}
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
                        {t('groupAsset.createGroupAsset.processing')}
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {t('groupAsset.createGroupAsset.processAllFiles')}
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
                  {t('groupAsset.createGroupAsset.totalAssetsSelected', { count: selectedAssets.length })}
                </p>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={handleCancel}
                  className="px-3 sm:px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm sm:text-base"
                >
                  {t('groupAsset.createGroupAsset.cancel')}
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
                  {t('groupAsset.createGroupAsset.save')}
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
