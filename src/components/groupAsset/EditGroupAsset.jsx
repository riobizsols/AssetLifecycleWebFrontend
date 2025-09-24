import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import API from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { ChevronDown, Check, X, ArrowRight, ArrowLeft, Search, Plus, MoreVertical, Eye, Download, Archive, ArchiveRestore } from 'lucide-react';
import { createPortal } from 'react-dom';
import SearchableDropdown from '../ui/SearchableDropdown';
import { generateUUID } from '../../utils/uuid';
import { useAuditLog } from '../../hooks/useAuditLog';
import { GROUP_ASSETS_APP_ID } from '../../constants/groupAssetsAuditEvents';
import { useLanguage } from '../../contexts/LanguageContext';

const EditGroupAsset = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedAssetTypes, setSelectedAssetTypes] = useState([]);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(GROUP_ASSETS_APP_ID);
  
  // API data states
  const [assetTypes, setAssetTypes] = useState([]);
  const [loadingAssetTypes, setLoadingAssetTypes] = useState(false);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingGroupData, setLoadingGroupData] = useState(true);
  
  // Document upload states
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  
  // Document management states
  const [docs, setDocs] = useState([]);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showArchived, setShowArchived] = useState(false);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-container') && !event.target.closest('[data-dropdown-menu]')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  // Toggle dropdown for document actions
  const toggleDropdown = (docId, event) => {
    console.log('Toggle dropdown clicked for doc:', docId);
    event.stopPropagation();
    if (activeDropdown === docId) {
      console.log('Closing dropdown for doc:', docId);
      setActiveDropdown(null);
    } else {
      console.log('Opening dropdown for doc:', docId);
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      setActiveDropdown(docId);
      console.log('Dropdown position set:', {
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };
  
  // Get group data from navigation state or fetch by ID
  const groupId = location.pathname.split('/').pop();
  const isEdit = location.state?.isEdit || false;
  const groupData = location.state?.groupData;

  // Fetch documents for the asset group
  const fetchDocs = async () => {
    if (!groupId) return;
    console.log('EditGroupAsset - Fetching documents for groupId:', groupId);
    setDocsLoading(true);
    try {
      const res = await API.get(`/asset-group-docs/${groupId}`);
      console.log('EditGroupAsset - Documents API response:', res.data);
      console.log('EditGroupAsset - Response status:', res.status);
      console.log('EditGroupAsset - Response data keys:', Object.keys(res.data || {}));
      
      const allDocs = res.data?.documents || res.data?.data || [];
      console.log('EditGroupAsset - All documents:', allDocs);
      
      // Separate active and archived documents
      const active = allDocs.filter(doc => !doc.is_archived);
      const archived = allDocs.filter(doc => doc.is_archived);
      
      console.log('EditGroupAsset - Active documents:', active);
      console.log('EditGroupAsset - Archived documents:', archived);
      
      setDocs(active);
      setArchivedDocs(archived);
    } catch (err) {
      console.error('Failed to fetch asset group documents', err);
      console.error('Error details:', err.response?.data);
      setDocs([]);
      setArchivedDocs([]);
    } finally {
      setDocsLoading(false);
    }
  };

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
    fetchDocumentTypes();
    fetchDocs();
  }, [groupId, isEdit, groupData]);

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
      toast.error(t('editGroupAsset.failedToLoadDocumentTypes'));
      setDocumentTypes([]);
    }
  };

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
      toast.error(t('editGroupAsset.failedToFetchGroupDetails'));
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
        toast.error(t('editGroupAsset.failedToFetchAssetTypes'));
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
      toast.error(t('editGroupAsset.failedToFetchAssetTypes'));
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
        toast.error(t('editGroupAsset.failedToFetchAssets'));
      }
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error(t('editGroupAsset.failedToFetchAssets'));
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
      toast.error(t('editGroupAsset.failedToFetchAssets'));
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
      toast.error(t('editGroupAsset.assetTypeAlreadySelected'));
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
    if (selectedAssetTypes.length === 0) return t('editGroupAsset.selectAssetType');
    if (selectedAssetTypes.length === 1) {
      const type = assetTypes.find(t => t.asset_type_id === selectedAssetTypes[0]);
      return type ? `${type.asset_type_id} - ${type.text}` : selectedAssetTypes[0];
    }
    return t('editGroupAsset.assetTypesSelected', { count: selectedAssetTypes.length });
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
      toast.error(t('editGroupAsset.pleaseEnterGroupName'));
      return;
    }

    if (selectedAssetTypes.length === 0) {
      toast.error(t('editGroupAsset.pleaseSelectAtLeastOneAssetType'));
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error(t('editGroupAsset.pleaseSelectAtLeastOneAsset'));
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
        // Log audit event for group update
        await recordActionByNameWithFetch('Update', { 
          groupId: groupId,
          groupName: groupName.trim(),
          assetCount: selectedAssets.length,
          action: 'Group Asset Updated Successfully'
        });
        
        toast.success(t('editGroupAsset.assetGroupUpdatedSuccessfully'));
        navigate('/group-asset');
      } else {
        toast.error(t('editGroupAsset.failedToUpdateAssetGroup'));
      }
    } catch (error) {
      console.error('Error updating group:', error);
      toast.error(t('editGroupAsset.failedToUpdateAssetGroup'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/group-asset');
  };

  // Handle document actions
  const handleDocumentAction = async (doc, action) => {
    console.log('Document action triggered:', action, 'for doc:', doc.agd_id);
    try {
      if (action === 'view') {
        console.log('Opening view for document:', doc.agd_id);
        const res = await API.get(`/asset-group-docs/${doc.agd_id}/download?mode=view`);
        window.open(res.data.url, '_blank');
      } else if (action === 'download') {
        console.log('Downloading document:', doc.agd_id);
        const res = await API.get(`/asset-group-docs/${doc.agd_id}/download?mode=download`);
        
        // Log audit event for document download
        await recordActionByNameWithFetch('Download', { 
          groupId: groupId,
          docId: doc.agd_id,
          docTypeId: doc.dto_id,
          action: 'Document Downloaded from Group Asset'
        });
        
        window.open(res.data.url, '_blank');
      } else if (action === 'archive') {
        console.log('Archiving document:', doc.agd_id);
        await API.put(`/asset-group-docs/${doc.agd_id}/archive-status`, {
          is_archived: true
        });
          
        // Log audit event for document archive (treating as document update)
        await recordActionByNameWithFetch('Add Document', { 
          groupId: groupId,
          docId: doc.agd_id,
          docTypeId: doc.dto_id,
          action: 'Document Archived in Group Asset'
        });
        
        toast.success(t('editGroupAsset.documentArchivedSuccessfully'));
        // Refresh documents
        const res = await API.get(`/asset-group-docs/${groupId}`);
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(d => !d.is_archived);
        const archived = allDocs.filter(d => d.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
      } else if (action === 'unarchive') {
        console.log('Unarchiving document:', doc.agd_id);
        await API.put(`/asset-group-docs/${doc.agd_id}/archive-status`, {
          is_archived: false
        });
        
        // Log audit event for document unarchive (treating as document update)
        await recordActionByNameWithFetch('Add Document', { 
          groupId: groupId,
          docId: doc.agd_id,
          docTypeId: doc.dto_id,
          action: 'Document Unarchived in Group Asset'
        });
        
        toast.success(t('editGroupAsset.documentUnarchivedSuccessfully'));
        // Refresh documents
        const res = await API.get(`/asset-group-docs/${groupId}`);
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(d => !d.is_archived);
        const archived = allDocs.filter(d => d.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
      }
    } catch (error) {
      console.error('Document action failed:', error);
      console.error('Error details:', error.response?.data);
      toast.error(t('editGroupAsset.failedToActionDocument', { action }));
    }
  };

  // Handle batch upload for group asset documents
  const handleBatchUpload = async () => {
    if (uploadRows.length === 0) {
      toast.error(t('editGroupAsset.addAtLeastOneFile'));
      return;
    }

    // Validate all attachments
    for (const r of uploadRows) {
      if (!r.type || !r.file) {
        toast.error(t('editGroupAsset.selectDocumentTypeAndChooseFile'));
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !r.docTypeName?.trim()) {
        toast.error(t('editGroupAsset.enterCustomNameFor', { docType: selectedDocType.text }));
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
          fd.append('asset_group_id', groupId);  // Add asset group ID
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          await API.post('/asset-group-docs/upload', fd, { 
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          
          // Log audit event for document upload
          await recordActionByNameWithFetch('Add Document', { 
            groupId: groupId,
            docTypeId: r.type,
            action: 'Document Added to Group Asset'
          });
          
          successCount++;
        } catch (err) {
          console.error('Failed to upload file:', r.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success(t('editGroupAsset.allFilesUploadedSuccessfully'));
        } else {
          toast.success(t('editGroupAsset.filesUploaded', { successCount, failCount }));
        }
        setUploadRows([]); // Clear all attachments after upload
        // Refresh the documents list
        const res = await API.get(`/asset-group-docs/${groupId}`);
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(doc => !doc.is_archived);
        const archived = allDocs.filter(doc => doc.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
      } else {
        toast.error(t('editGroupAsset.failedToUploadAnyFiles'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('editGroupAsset.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingGroupData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('editGroupAsset.loadingGroupDetails')}</p>
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
          <h1 className="text-xl font-semibold text-gray-900">{t('editGroupAsset.editAssetGroup')}</h1>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            {t('editGroupAsset.cancel')}
          </button>
          <button
            onClick={handleUpdate}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? t('editGroupAsset.updating') : t('editGroupAsset.updateGroup')}
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
                {t('editGroupAsset.groupName')}:
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder={t('editGroupAsset.enterGroupName')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
              />
            </div>
          </div>

          {/* Main Content Area - Fixed height for tables */}
          <div className="flex-1 flex flex-col lg:flex-row gap-4 sm:gap-6">
            {/* Available Assets - Fixed height */}
            <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 h-[500px]">
              <div className="p-4 border-b flex-shrink-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('editGroupAsset.assetsList')}</h2>
                
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
                            placeholder={t('editGroupAsset.searchAssetTypes')}
                            value={dropdownSearchTerm}
                            onChange={(e) => setDropdownSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        </div>
                        
                        {/* Selected Asset Types Display */}
                        {selectedAssetTypes.length > 0 && (
                          <div className="p-3 border-b bg-gray-50">
                            <div className="text-xs font-medium text-gray-700 mb-2">{t('editGroupAsset.selectedAssetTypes')}:</div>
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
                            <div className="px-3 py-2 text-sm text-gray-500">{t('editGroupAsset.loadingAssetTypes')}</div>
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
                              {t('editGroupAsset.noAssetTypesFound')}
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
                      {t('editGroupAsset.selectAll')}
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                    >
                      {t('editGroupAsset.deselectAll')}
                    </button>
                  </div>
                  
                  {/* Compact Search Bar */}
                  <div className="relative w-64">
                    {searchTerm ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder={t('editGroupAsset.searchAssets')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                        <button
                          onClick={() => setSearchTerm('')}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title={t('editGroupAsset.clearSearch')}
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
                        <span className="text-xs">{t('editGroupAsset.search')}...</span>
                      </button>
                    )}
                    <input
                      id="asset-search-input"
                      type="text"
                      placeholder={t('editGroupAsset.searchAssets')}
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
                      <p className="text-sm text-gray-500">{t('editGroupAsset.loadingAssets')}</p>
                    </div>
                  </div>
                ) : availableAssets.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            {t('editGroupAsset.select')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            {t('editGroupAsset.assetId')}
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                      {t('editGroupAsset.name')}
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            {t('editGroupAsset.assetType')}
                    </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            {t('editGroupAsset.purchaseDate')}
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
                        {selectedAssetTypes.length > 0 ? t('editGroupAsset.noAssetsFoundForSelectedType') : t('editGroupAsset.pleaseSelectAssetTypeToViewAssets')}
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
                  {t('editGroupAsset.selectedAssets')} ({selectedAssets.length})
                </h2>
                {selectedAssets.length > 0 && (
                  <button
                    onClick={handleDeselectAll}
                    className="text-sm text-red-600 hover:text-red-800 underline"
                  >
                    {t('editGroupAsset.clearAll')}
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
                            {t('editGroupAsset.assetId')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            {t('editGroupAsset.name')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                            {t('editGroupAsset.assetType')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                            {t('editGroupAsset.purchaseDate')}
                          </th>
                          <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                            {t('editGroupAsset.action')}
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
                                title={t('editGroupAsset.removeFromSelection')}
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
                      <p>{t('editGroupAsset.selectAssetsFromLeftTable')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div className="mt-4 sm:mt-6 bg-white rounded-lg shadow-sm border p-4 flex-shrink-0">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('editGroupAsset.documents')}</h3>
              <div className="text-sm text-gray-600 mb-3">{t('editGroupAsset.documentTypesLoadedFromSystem')}</div>
              
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-700">{t('editGroupAsset.uploadDocuments')}</div>
                <button 
                  type="button" 
                  onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                  className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
                >
                  <Plus size={16} className="mr-2" />
                  {t('editGroupAsset.addDocument')}
                </button>
              </div>
              
              {uploadRows.length === 0 ? (
                <div className="text-sm text-gray-500">{t('editGroupAsset.noDocumentsAdded')}</div>
              ) : (
                <div className="space-y-3">
                  {uploadRows.map(r => (
                    <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">{t('editGroupAsset.documentType')}</label>
                        <SearchableDropdown
                          options={documentTypes}
                          value={r.type}
                          onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                          placeholder={t('editGroupAsset.selectType')}
                          searchPlaceholder={t('editGroupAsset.searchTypes')}
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
                            <label className="block text-xs font-medium mb-1">{t('editGroupAsset.customName')}</label>
                            <input
                              className="w-full border rounded px-2 py-2 text-sm h-[38px]"
                              value={r.docTypeName}
                              onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))}
                              placeholder={t('editGroupAsset.enterCustomNameFor', { docType: selectedDocType?.text })}
                            />
                          </div>
                        );
                      })()}

                      <div className={(() => {
                        const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                        const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                        return needsCustomName ? 'col-span-4' : 'col-span-7';
                      })()}>
                        <label className="block text-xs font-medium mb-1">{t('editGroupAsset.fileMaxSize')}</label>
                        <div className="flex items-center gap-2">
                          <div className="relative flex-1 max-w-md">
                            <input
                              type="file"
                              id={`file-${r.id}`}
                              onChange={e => {
                                const f = e.target.files?.[0] || null;
                                if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                                  toast.error(t('editGroupAsset.fileSizeExceedsLimit'));
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
                                {r.file ? r.file.name : t('editGroupAsset.chooseFile')}
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
                              {t('editGroupAsset.preview')}
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
                            {t('editGroupAsset.remove')}
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
                        {t('editGroupAsset.processing')}
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {t('editGroupAsset.processAllFiles')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Document Management Section */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('editGroupAsset.documentManagement')}</h3>
              
              {/* Active Documents */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">{t('editGroupAsset.activeDocuments')}</h3>
                <div className="border rounded-lg overflow-hidden bg-white">
                  {docsLoading ? (
                    <div className="p-4 text-sm text-gray-500 text-center">{t('editGroupAsset.loadingDocuments')}</div>
                  ) : docs.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">{t('editGroupAsset.noActiveDocumentsFound')}</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.fileName')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.type')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.status')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {docs.map((doc) => (
                            <tr key={doc.agd_id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{doc.file_name || 'document'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{doc.doc_type_text || doc.doc_type_name || 'N/A'}</td>
                              <td className="px-4 py-3">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {t('editGroupAsset.active')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="relative dropdown-container">
                                  <button
                                    onClick={(e) => toggleDropdown(doc.agd_id, e)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                  >
                                    <MoreVertical size={16} />
                                  </button>
                                  
                                  {activeDropdown === doc.agd_id && (() => {
                                    console.log('Rendering dropdown for doc:', doc.agd_id);
                                    return createPortal(
                                      <div
                                        data-dropdown-menu
                                        className="absolute z-50 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200"
                                        style={{
                                          top: dropdownPosition.top,
                                          left: dropdownPosition.left,
                                          transform: 'translateX(-100%)'
                                        }}
                                      >
                                        <div className="py-1">
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              console.log('View button clicked for doc:', doc.agd_id);
                                              handleDocumentAction(doc, 'view');
                                              closeAllDropdowns();
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            <Eye size={16} className="mr-3" />
                                            {t('editGroupAsset.view')}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              console.log('Download button clicked for doc:', doc.agd_id);
                                              handleDocumentAction(doc, 'download');
                                              closeAllDropdowns();
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            <Download size={16} className="mr-3" />
                                            {t('editGroupAsset.download')}
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              console.log('Archive button clicked for doc:', doc.agd_id);
                                              handleDocumentAction(doc, 'archive');
                                              closeAllDropdowns();
                                            }}
                                            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                          >
                                            <Archive size={16} className="mr-3" />
                                            {t('editGroupAsset.archive')}
                                          </button>
                                        </div>
                                      </div>,
                                      document.body
                                    );
                                  })()}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Archived Documents */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-900">{t('editGroupAsset.archivedDocuments')}</h3>
                  <button
                    onClick={() => setShowArchived(!showArchived)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showArchived ? t('editGroupAsset.hideArchived') : t('editGroupAsset.showArchived', { count: archivedDocs.length })}
                  </button>
                </div>
                
                {showArchived && (
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    {archivedDocs.length === 0 ? (
                      <div className="p-4 text-sm text-gray-500 text-center">
                        {t('editGroupAsset.noArchivedDocumentsFound')}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.fileName')}</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.type')}</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.status')}</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('editGroupAsset.actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {archivedDocs.map((doc) => (
                              <tr key={doc.agd_id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">{doc.file_name || 'document'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{doc.doc_type_text || doc.doc_type_name || 'N/A'}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {t('editGroupAsset.archived')}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-500">
                                  <div className="relative dropdown-container">
                                    <button
                                      onClick={(e) => toggleDropdown(doc.agd_id, e)}
                                      className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                    
                                    {activeDropdown === doc.agd_id && (() => {
                                      console.log('Rendering archived dropdown for doc:', doc.agd_id);
                                      return createPortal(
                                        <div
                                          data-dropdown-menu
                                          className="absolute z-50 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200"
                                          style={{
                                            top: dropdownPosition.top,
                                            left: dropdownPosition.left,
                                            transform: 'translateX(-100%)'
                                          }}
                                        >
                                          <div className="py-1">
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('View button clicked for archived doc:', doc.agd_id);
                                                handleDocumentAction(doc, 'view');
                                                closeAllDropdowns();
                                              }}
                                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                              <Eye size={16} className="mr-3" />
                                              {t('editGroupAsset.view')}
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('Download button clicked for archived doc:', doc.agd_id);
                                                handleDocumentAction(doc, 'download');
                                                closeAllDropdowns();
                                              }}
                                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                              <Download size={16} className="mr-3" />
                                              {t('editGroupAsset.download')}
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                console.log('Unarchive button clicked for archived doc:', doc.agd_id);
                                                handleDocumentAction(doc, 'unarchive');
                                                closeAllDropdowns();
                                              }}
                                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                            >
                                              <ArchiveRestore size={16} className="mr-3" />
                                              {t('editGroupAsset.unarchive')}
                                            </button>
                                          </div>
                                        </div>,
                                        document.body
                                      );
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditGroupAsset; 