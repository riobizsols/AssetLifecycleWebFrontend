import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import API from "../lib/axios";
import { toast } from "react-hot-toast";
import SearchableDropdown from "./ui/SearchableDropdown";
import { generateUUID } from '../utils/uuid';
import useAuditLog from "../hooks/useAuditLog";
import { ASSET_TYPES_APP_ID } from "../constants/assetTypesAuditEvents";

const UpdateAssetTypeModal = ({ isOpen, onClose, assetData }) => {
  const [assetType, setAssetType] = useState("");
  const [assignmentType, setAssignmentType] = useState("user");

  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ASSET_TYPES_APP_ID);
  const [groupRequired, setGroupRequired] = useState(false);
  const [requireInspection, setRequireInspection] = useState(false);
  const [requireMaintenance, setRequireMaintenance] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [parentChild, setParentChild] = useState("parent");
  const [parentAssetTypes, setParentAssetTypes] = useState([]);
  const [selectedParentType, setSelectedParentType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checklist, setChecklist] = useState([]);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [showArchived, setShowArchived] = useState(true);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // New state variables for maintenance fields
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState("");
  const [maintenanceLeadType, setMaintenanceLeadType] = useState("");
  
  // Properties state variables
  const [properties, setProperties] = useState([]);
  const [selectedProperties, setSelectedProperties] = useState([]);
  const [existingProperties, setExistingProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);

  useEffect(() => {
    if (assetData) {
      // Set form values from original data
      setAssetType(assetData.text || "");
      setAssignmentType(assetData.assignment_type || "user");
      setGroupRequired(!!assetData.group_required); // Convert to boolean
      setRequireInspection(!!assetData.inspection_required); // Convert to boolean
      setRequireMaintenance(!!assetData.maint_required); // Convert to boolean
      setIsActive(assetData.int_status === 1 || assetData.int_status === "1" || assetData.int_status === true);
      setParentChild(assetData.is_child ? "child" : "parent");
      setSelectedParentType(assetData.parent_asset_type_id || "");
      setSelectedMaintenanceType(assetData.maint_type_id || "");
      setMaintenanceLeadType(assetData.maint_lead_type || "");

      // Log the data for debugging
      console.log('Asset Type Data:', {
        text: assetData.text,
        assignment_type: assetData.assignment_type,
        group_required: assetData.group_required,
        inspection_required: assetData.inspection_required,
        maint_required: assetData.maint_required,
        int_status: assetData.int_status,
        is_child: assetData.is_child,
        parent_asset_type_id: assetData.parent_asset_type_id,
        maint_type_id: assetData.maint_type_id,
        maint_lead_type: assetData.maint_lead_type
      });
    }
  }, [assetData]);

  useEffect(() => {
    // Reset parent selection when parentChild changes
    setSelectedParentType("");
    
    // Fetch parent asset types if "child" is selected
    if (parentChild === "child") {
      fetchParentAssetTypes();
    }
  }, [parentChild]);

  // Fetch maintenance types when component mounts
  useEffect(() => {
    fetchMaintenanceTypes();
    fetchDocumentTypes();
    fetchProperties();
  }, []);

  // Fetch checklist and properties when asset type is loaded
  useEffect(() => {
    if (assetData?.asset_type_id) {
      fetchChecklist();
      fetchExistingProperties();
    }
  }, [assetData?.asset_type_id]);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-portal') && !event.target.closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeDropdown]);

  const fetchChecklist = async () => {
    if (!assetData?.asset_type_id) return;
    setChecklistLoading(true);
    try {
      const res = await API.get(`/asset-type-docs/${assetData.asset_type_id}`);
      const arr = Array.isArray(res.data?.documents) ? res.data.documents : (Array.isArray(res.data) ? res.data : []);
      
      // Separate active and archived documents
      const activeDocs = arr.filter(doc => !doc.is_archived || doc.is_archived === false);
      const archivedDocs = arr.filter(doc => doc.is_archived === true || doc.is_archived === 'true');
      
      console.log('📋 Document filtering:', {
        total: arr.length,
        active: activeDocs.length,
        archived: archivedDocs.length,
        allDocs: arr,
        activeDocs,
        archivedDocs
      });
      
      setChecklist(activeDocs);
      setArchivedDocs(archivedDocs);
    } catch (err) {
      // Only show error if it's not a 404 (no checklist yet)
      if (err.response?.status !== 404) {
        console.error('Failed to fetch checklist:', err);
        toast.error('Failed to load checklist');
      }
      setChecklist([]);
      setArchivedDocs([]);
    } finally {
      setChecklistLoading(false);
    }
  };

  const toggleDropdown = (docId, event) => {
    event.stopPropagation();
    if (activeDropdown === docId) {
      setActiveDropdown(null);
    } else {
      const rect = event.target.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
      setActiveDropdown(docId);
    }
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };

  const handleDocumentAction = async (doc, action) => {
    const actionKey = `${doc.atd_id || doc.id}-${action}`;
    if (loadingActions[actionKey]) return;

    try {
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
      
      if (action === 'archive' || action === 'unarchive') {
        // Handle archive/unarchive
        const archiveStatus = action === 'archive';
        const res = await API.put(`/asset-type-docs/${doc.atd_id || doc.id}/archive-status`, {
          is_archived: archiveStatus
        });
        
        if (res.data && res.data.message && res.data.message.includes('successfully')) {
          toast.success(`Document ${archiveStatus ? 'archived' : 'unarchived'} successfully`);
          console.log('🔄 Refreshing documents after archive action...');
          // Refresh the documents list
          fetchChecklist();
        } else {
          throw new Error(res.data?.message || 'Failed to update archive status');
        }
      } else {
        // Handle view/download
        const res = await API.get(`/asset-type-docs/${doc.atd_id || doc.id}/download?mode=${action}`);
        const url = res.data.url;

        if (!url) {
          throw new Error('No URL returned from server');
        }

        // Open in new tab
        window.open(url, '_blank');
      }
      
      // Close dropdown after action
      closeAllDropdowns();
    } catch (err) {
      console.error(`Error ${action}ing document:`, err);
      toast.error(`Failed to ${action} document. Please try again.`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const fetchParentAssetTypes = async () => {
    try {
      const res = await API.get('/asset-types/parents');
      setParentAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching parent asset types:', err);
      toast.error('Failed to fetch parent asset types');
      setParentAssetTypes([]);
    }
  };

  const fetchMaintenanceTypes = async () => {
    try {
      const res = await API.get('/maint-types');
      setMaintenanceTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching maintenance types:', err);
      toast.error('Failed to fetch maintenance types');
      setMaintenanceTypes([]);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for asset types...');
      const res = await API.get('/doc-type-objects/object-type/asset type');
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

  const fetchProperties = async () => {
    try {
      console.log('Fetching properties from tblProps...');
      const res = await API.get('/properties');
      console.log('Properties response:', res.data);
      console.log('Response status:', res.status);
      console.log('Response headers:', res.headers);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const props = res.data.data.map(prop => ({
          id: prop.prop_id || prop.id,
          text: prop.property || prop.prop_name || prop.name,
          value: prop.prop_id || prop.id
        }));
        setProperties(props);
        console.log('Properties loaded:', props);
        console.log('Properties count:', props.length);
      } else {
        console.log('No properties found or invalid response format');
        console.log('Response data structure:', {
          hasData: !!res.data,
          hasSuccess: res.data?.success,
          hasDataArray: Array.isArray(res.data?.data),
          dataType: typeof res.data,
          dataKeys: res.data ? Object.keys(res.data) : 'no data'
        });
        setProperties([]);
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      toast.error('Failed to load properties');
      setProperties([]);
    }
  };

  const fetchExistingProperties = async () => {
    if (!assetData?.asset_type_id) {
      console.log('❌ No asset_type_id provided');
      return;
    }
    
    setIsLoadingProperties(true);
    try {
      console.log('🔍 Fetching existing properties for asset type:', assetData.asset_type_id);
      const url = `/asset-types/${assetData.asset_type_id}/properties`;
      console.log('API URL:', url);
      
      const res = await API.get(url);
      console.log('Existing properties response:', res.data);
      console.log('Response status:', res.status);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        setExistingProperties(res.data.data);
        console.log('✅ Existing properties loaded:', res.data.data);
        console.log('Properties count:', res.data.data.length);
      } else {
        console.log('❌ No properties found or invalid response format');
        console.log('Response structure:', {
          hasData: !!res.data,
          hasSuccess: res.data?.success,
          hasDataArray: Array.isArray(res.data?.data),
          dataType: typeof res.data,
          dataKeys: res.data ? Object.keys(res.data) : 'no data'
        });
        setExistingProperties([]);
      }
    } catch (err) {
      console.error('❌ Error fetching existing properties:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error message:', err.message);
      toast.error('Failed to load existing properties');
      setExistingProperties([]);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  const handleAddProperty = async (propertyId) => {
    if (!assetData?.asset_type_id || !propertyId) return;

    try {
      console.log('Adding property to asset type:', { asset_type_id: assetData.asset_type_id, property_id: propertyId });
      const res = await API.post(`/asset-types/${assetData.asset_type_id}/properties`, {
        properties: [propertyId]
      });
      
      console.log('Add property response:', res.data);
      
      if (res.data && res.data.success) {
        toast.success('Property added successfully');
        // Clear the selected property
        setSelectedProperties([]);
        // Refresh existing properties
        fetchExistingProperties();
      } else {
        const errorMessage = res.data?.error || res.data?.message || 'Failed to add property';
        toast.error(errorMessage);
      }
    } catch (err) {
      console.error('Error adding property:', err);
      console.error('Error response:', err.response?.data);
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Failed to add property';
      toast.error(errorMessage);
    }
  };

  const handleRemoveProperty = async (assetTypePropId) => {
    if (!assetTypePropId) return;

    try {
      console.log('Removing property from asset type:', assetTypePropId);
      const res = await API.delete(`/asset-types/properties/${assetTypePropId}`);
      
      if (res.data && res.data.success) {
        toast.success('Property removed successfully');
        // Refresh existing properties
        fetchExistingProperties();
      } else {
        throw new Error(res.data?.message || 'Failed to remove property');
      }
    } catch (err) {
      console.error('Error removing property:', err);
      toast.error('Failed to remove property');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form
    if (!assetType.trim()) {
      toast(
        "Asset type name is required",
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
        }
      );
      return;
    }

    // Validate parent selection for child asset types
    if (parentChild === "child" && !selectedParentType) {
      toast(
        "Please select a parent asset type",
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
        }
      );
      return;
    }

    // Validate maintenance fields when maintenance is required
    if (requireMaintenance && !selectedMaintenanceType) {
      toast(
        "Please select a maintenance type when maintenance is required",
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
        }
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = {
        text: assetType.trim(),
        assignment_type: assignmentType,
        int_status: isActive ? 1 : 0,
        group_required: groupRequired,
        inspection_required: requireInspection,
        maint_required: requireMaintenance ? 1 : 0,
        is_child: parentChild === "child",
        parent_asset_type_id: parentChild === "child" ? selectedParentType : null,
        maint_type_id: requireMaintenance ? selectedMaintenanceType : null,
        maint_lead_type: requireMaintenance ? maintenanceLeadType : null
      };

      // Make API call
      const response = await API.put(`/asset-types/${assetData.asset_type_id}`, formData);

      // Log update action after successful update
      await recordActionByNameWithFetch('Update', {
        assetTypeId: assetData.asset_type_id,
        assetTypeName: assetType.trim(),
        assignmentType: assignmentType,
        maintenanceSchedule: requireMaintenance,
        inspectionRequired: requireInspection,
        groupRequired: groupRequired,
        status: isActive ? 'Active' : 'Inactive',
        parentAssetType: parentChild === "child" ? selectedParentType : null,
        action: 'Asset Type Updated'
      });

      toast(
        `Asset type "${assetType}" updated successfully`,
        {
          icon: '✅',
          style: {
            borderRadius: '8px',
            background: '#064E3B',
            color: '#fff',
          },
        }
      );
      onClose();
      // Refresh the parent component
      window.location.reload();
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to update asset type";
      const errorDetails = error.response?.data?.details || "";
      const errorHint = error.response?.data?.hint || "";
      
      let fullError = errorMessage;
      if (errorDetails) fullError += `\n${errorDetails}`;
      if (errorHint) fullError += `\n\nHint: ${errorHint}`;

      toast(
        fullError,
        {
          icon: '❌',
          style: {
            borderRadius: '8px',
            background: '#7F1D1D',
            color: '#fff',
          },
          duration: 5000,
        }
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle checklist uploads
  const handleUploadChecklist = async () => {
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
      if (selectedDocType && selectedDocType.text.toLowerCase().includes('other') && !r.docTypeName?.trim()) {
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
          fd.append('asset_type_id', assetData.asset_type_id);
          fd.append('dto_id', r.type);  // Send dto_id instead of doc_type
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          await API.post('/asset-type-docs/upload', fd, { 
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          successCount++;
        } catch (err) {
          console.error('Failed to upload file:', r.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All files uploaded successfully');
        } else {
          toast.success(`${successCount} files uploaded, ${failCount} failed`);
        }
        setUploadRows([]); // Clear all attachments after upload
        // Refresh the checklist
        fetchChecklist();
      } else {
        toast.error('Failed to upload any files');
      }
    } catch (err) {
      console.error('Upload process error:', err);
      toast.error('Upload process failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Update Asset Type</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* First Row: Asset Type, Assignment Type, Status */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Asset Type Input */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Asset Type <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter asset type name"
              />
            </div>

            {/* Assignment Type Radio Buttons */}
            <div>
              <label className="block text-sm font-medium mb-1">Assignment Type</label>
              <div className="space-y-2 mt-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="user"
                    checked={assignmentType === "user"}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2">User - wise</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="department"
                    checked={assignmentType === "department"}
                    onChange={(e) => setAssignmentType(e.target.value)}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2">Department - wise</span>
                </label>
              </div>
            </div>

            {/* Status Toggle */}
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <div className="flex items-center space-x-2 mt-2">
                <span className={`text-sm ${!isActive ? 'text-gray-900' : 'text-gray-500'}`}>Inactive</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isActive ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <span className={`text-sm ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>Active</span>
              </div>
            </div>
          </div>

          {/* Properties Management Section */}
          <div className="mb-6">
            <div className="text-md font-medium text-gray-900 mb-4">Properties Management</div>
            
            {/* Add New Property */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Add Property</label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <SearchableDropdown
                    options={properties.filter(prop => 
                      !existingProperties.some(existing => existing.prop_id === prop.id)
                    )}
                    value={selectedProperties.length > 0 ? selectedProperties[0] : ""}
                    onChange={(value) => {
                      if (value) {
                        setSelectedProperties([value]);
                      }
                    }}
                    placeholder="Select property to add"
                    searchPlaceholder="Search properties..."
                    displayKey="text"
                    valueKey="id"
                    className="w-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedProperties.length > 0) {
                      handleAddProperty(selectedProperties[0]);
                      setSelectedProperties([]);
                    }
                  }}
                  disabled={selectedProperties.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Existing Properties */}
            <div>
              <label className="block text-sm font-medium mb-2">Current Properties</label>
              {isLoadingProperties ? (
                <div className="text-sm text-gray-500">Loading properties...</div>
              ) : existingProperties.length === 0 ? (
                <div className="text-sm text-gray-500">No properties assigned</div>
              ) : (
                <div className="space-y-2">
                  {existingProperties.map((prop) => (
                    <div key={prop.asset_type_prop_id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-gray-900">{prop.prop_name || prop.property}</span>
                        <span className="ml-2 text-xs text-gray-500">({prop.prop_id})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveProperty(prop.asset_type_prop_id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                        title="Remove property"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Second Row: Checkboxes */}
          <div className="space-y-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={groupRequired}
                onChange={(e) => setGroupRequired(e.target.checked)}
                className="form-checkbox text-blue-500 rounded"
              />
              <span>Group Required</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={requireInspection}
                onChange={(e) => setRequireInspection(e.target.checked)}
                className="form-checkbox text-blue-500 rounded"
              />
              <span>Require Inspection</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={requireMaintenance}
                onChange={(e) => setRequireMaintenance(e.target.checked)}
                className="form-checkbox text-blue-500 rounded"
              />
              <span>Require Maintenance</span>
            </label>
          </div>

          {/* Maintenance Fields - Conditional Rendering */}
          {requireMaintenance && (
            <div className="mt-6 grid grid-cols-2 gap-6">
              {/* Maintenance Type Dropdown */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Select Maint Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedMaintenanceType}
                  onChange={(e) => setSelectedMaintenanceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select maintenance type</option>
                  {maintenanceTypes.map((type) => (
                    <option key={type.maint_type_id} value={type.maint_type_id}>
                      {type.text}
                    </option>
                  ))}
                </select>
              </div>

              {/* Maintenance Lead Type Input */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Maintenance Lead Type
                </label>
                <input
                  type="text"
                  value={maintenanceLeadType}
                  onChange={(e) => setMaintenanceLeadType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter maintenance lead type"
                />
              </div>
            </div>
          )}

          {/* Document Management Section - Always Visible */}
          <div className="mt-6">
            <div className="text-md font-medium text-gray-900 mb-2">Asset Type Documents</div>
            <div className="border rounded-lg overflow-hidden bg-white mb-6">
              {checklistLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading documents...</div>
              ) : checklist.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No documents uploaded.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">File Name</th>
                      <th className="text-left px-3 py-2">Status</th>
                      <th className="text-left px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checklist.map((doc) => {
                      const docId = doc.atd_id || doc.id;
                      const viewLoading = loadingActions[`${docId}-view`];
                      const downloadLoading = loadingActions[`${docId}-download`];
                      const archiveLoading = loadingActions[`${docId}-archive`];
                      
                      return (
                        <tr key={docId} className="odd:bg-white even:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {doc.doc_type_text || doc.doc_type || doc.type || '-'}
                            {doc.doc_type_name && (doc.doc_type === 'OT' || doc.doc_type_text?.toLowerCase().includes('other')) && (
                              <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="max-w-md truncate">
                              {doc.file_name || doc.name || 'document'}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              doc.is_archived === true || doc.is_archived === 'true'
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {doc.is_archived === true || doc.is_archived === 'true' ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => toggleDropdown(docId, e)}
                                className="dropdown-trigger p-2 rounded-full hover:bg-gray-100 transition-colors"
                                disabled={viewLoading || downloadLoading || archiveLoading}
                              >
                                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Upload New Documents */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-900">Upload New Documents</h3>
                <button 
                  type="button" 
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                  onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                >
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Document
                </button>
              </div>
              
              <div className="space-y-3">
                {uploadRows.length === 0 && <div className="text-sm text-gray-500">No new files added.</div>}
                {uploadRows.map(r => (
                  <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border rounded p-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">Document Type</label>
                      <select 
                        className="w-full border rounded h-[38px] px-2 text-sm" 
                        value={r.type} 
                        onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:e.target.value}:x))}
                      >
                        <option value="">Select type</option>
                        {documentTypes.map(docType => (
                          <option key={docType.id} value={docType.id}>
                            {docType.text}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName && (
                        <div className="col-span-3">
                          <label className="block text-xs font-medium mb-1">Custom Name</label>
                          <input 
                            className="w-full border rounded h-[38px] px-2 text-sm" 
                            value={r.docTypeName} 
                            onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))} 
                            placeholder={`Enter custom name for ${selectedDocType?.text}`}
                          />
                        </div>
                      );
                    })()}
                    <div className={(() => {
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName ? 'col-span-4' : 'col-span-7';
                    })()}>
                      <label className="block text-xs font-medium mb-1">File (Max 15MB)</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
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
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                          />
                          <label
                            htmlFor={`file-${r.id}`}
                            className="flex items-center h-[38px] px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                          >
                            <svg className="flex-shrink-0 w-5 h-4 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                            className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                          >
                            Preview
                          </a>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setUploadRows(prev => prev.filter(x => x.id!==r.id))}
                          className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              {uploadRows.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleUploadChecklist}
                    disabled={isUploading || uploadRows.some(r => {
                      if (!r.type || !r.file) return true;
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName && !r.docTypeName?.trim();
                    })}
                    className="h-[38px] inline-flex items-center px-6 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Upload All Files
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Archived Documents Section */}
            <div className="mt-6 border-t pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">Archived Documents</h3>
                <button
                  type="button"
                  onClick={() => setShowArchived(!showArchived)}
                  className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
                >
                  {showArchived ? 'Hide Archived' : 'Show Archived'} ({archivedDocs.length})
                </button>
              </div>
                
              {showArchived && (
                <div className="border rounded-lg overflow-hidden bg-gray-50">
                  {archivedDocs.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500 text-center">
                      No archived documents found.
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2">Type</th>
                          <th className="text-left px-3 py-2">File Name</th>
                          <th className="text-left px-3 py-2">Status</th>
                          <th className="text-left px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedDocs.map((doc) => {
                          const docId = doc.atd_id || doc.id;
                          const viewLoading = loadingActions[`${docId}-view`];
                          const downloadLoading = loadingActions[`${docId}-download`];
                          const unarchiveLoading = loadingActions[`${docId}-unarchive`];
                          
                          return (
                            <tr key={docId} className="odd:bg-gray-50 even:bg-gray-100">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {doc.doc_type_text || doc.doc_type || doc.type || '-'}
                                {doc.doc_type_name && (doc.doc_type === 'OT' || doc.doc_type_text?.toLowerCase().includes('other')) && (
                                  <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="max-w-md truncate">
                                  {doc.file_name || doc.name || 'document'}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Archived
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleDropdown(docId, e)}
                                    className="dropdown-trigger p-2 rounded-full hover:bg-gray-200 transition-colors"
                                    disabled={viewLoading || downloadLoading || unarchiveLoading}
                                  >
                                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Parent/Child Selection */}
          <div className="mt-6">
            <div className="flex gap-6">
              <div className="max-w-xs">
                <label className="block text-sm font-medium mb-1">Parent / Child</label>
                <select
                  value={parentChild}
                  onChange={(e) => setParentChild(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="parent">Parent</option>
                  <option value="child">Child</option>
                </select>
              </div>

              {/* Parent Asset Type Dropdown (shown only when Child is selected) */}
              {parentChild === "child" && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium mb-1">
                    Parent Asset Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedParentType}
                    onChange={(e) => setSelectedParentType(e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select parent asset type</option>
                    {parentAssetTypes.map((type) => (
                      <option key={type.asset_type_id} value={type.asset_type_id}>
                        {type.text}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Updating..." : "Update"}
            </button>
          </div>
        </form>
      </div>

      {/* Dropdown Portal */}
      {activeDropdown && createPortal(
        <div 
          className="dropdown-portal fixed w-48 bg-white rounded-md shadow-xl z-[9999] border border-gray-200"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left
          }}
        >
          <div className="py-1">
            {(() => {
              const doc = [...checklist, ...archivedDocs].find(d => (d.atd_id || d.id) === activeDropdown);
              if (!doc) return null;
              
              const isArchived = archivedDocs.some(d => (d.atd_id || d.id) === activeDropdown);
              const docId = doc.atd_id || doc.id;
              const viewLoading = loadingActions[`${docId}-view`];
              const downloadLoading = loadingActions[`${docId}-download`];
              const archiveLoading = loadingActions[`${docId}-archive`];
              const unarchiveLoading = loadingActions[`${docId}-unarchive`];
              
              return (
                <>
                  <button
                    onClick={() => handleDocumentAction(doc, 'view')}
                    disabled={viewLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {viewLoading ? 'Loading...' : 'View'}
                  </button>
                  
                  <button
                    onClick={() => handleDocumentAction(doc, 'download')}
                    disabled={downloadLoading}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {downloadLoading ? 'Loading...' : 'Download'}
                  </button>
                  
                  {isArchived ? (
                    <button
                      onClick={() => handleDocumentAction(doc, 'unarchive')}
                      disabled={unarchiveLoading}
                      className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {unarchiveLoading ? 'Loading...' : 'Unarchive'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleDocumentAction(doc, 'archive')}
                      disabled={archiveLoading}
                      className="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3" />
                      </svg>
                      {archiveLoading ? 'Loading...' : 'Archive'}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default UpdateAssetTypeModal; 