import React, { useState, useEffect } from "react";
import API from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";
import SearchableDropdown from './ui/SearchableDropdown';

const AddAssetType = () => {
  const navigate = useNavigate();
  const [assetType, setAssetType] = useState("");
  const [assignmentType, setAssignmentType] = useState("user"); // "user" or "department"
  const [groupRequired, setGroupRequired] = useState(false);
  const [requireInspection, setRequireInspection] = useState(false);
  const [requireMaintenance, setRequireMaintenance] = useState(false);
  const [checklistFiles, setChecklistFiles] = useState([]); // files to upload when maintenance required
  const [checklistUploads, setChecklistUploads] = useState([]); // {id, type, docTypeName, file, previewUrl}
  const [isActive, setIsActive] = useState(true);
  const [parentChild, setParentChild] = useState("parent"); // Default to parent
  const [parentAssetTypes, setParentAssetTypes] = useState([]);
  const [selectedParentType, setSelectedParentType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  
  // New state variables for maintenance fields
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState("");
  const [maintenanceLeadType, setMaintenanceLeadType] = useState("");
  
  // New state variable for depreciation type
  const [depreciationType, setDepreciationType] = useState("ND");
  
  // Document types from API
  const [documentTypes, setDocumentTypes] = useState([]);

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
  }, []);

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

    // Helper functions for checklist uploads
  const addChecklistUpload = () => {
    setChecklistUploads(prev => ([...prev, { 
      id: crypto.randomUUID(), 
      type: '', 
      docTypeName: '', 
      file: null, 
      previewUrl: '' 
    }]));
  };

  const updateChecklistUpload = (id, patch) => {
    setChecklistUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const removeChecklistUpload = (id) => {
    setChecklistUploads(prev => prev.filter(u => u.id !== id));
  };

  const onSelectChecklistFile = (id, file) => {
    const previewUrl = file ? URL.createObjectURL(file) : '';
    updateChecklistUpload(id, { file, previewUrl });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
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

    // Validate document uploads
    if (checklistUploads.length > 0) {
      for (const upload of checklistUploads) {
        if (!upload.type || !upload.file) {
          toast(
            "Please select document type and choose a file for all documents",
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
        
        // Check if the selected document type requires a custom name
        const selectedDocType = documentTypes.find(dt => dt.id === upload.type);
        if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !upload.docTypeName?.trim()) {
          toast(
            `Please enter a custom name for ${selectedDocType.text} documents`,
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
      }
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
        maint_lead_type: requireMaintenance ? maintenanceLeadType : null,
        depreciation_type: depreciationType
      };

      // Make API call
      const response = await API.post('/asset-types', formData);

      toast(
        `Asset type "${assetType}" created successfully`,
        {
          icon: '✅',
          style: {
            borderRadius: '8px',
            background: '#064E3B',
            color: '#fff',
          },
        }
      );
      // Upload checklist files if any are provided
      const newId = response.data?.asset_type?.asset_type_id;
      console.log('Asset type creation response:', response.data);
      console.log('Extracted asset type ID:', newId);
      console.log('Checklist uploads:', checklistUploads);
      
      if (newId && checklistUploads.length > 0) {
        for (const upload of checklistUploads) {
          if (upload.file) {
            const fd = new FormData();
            fd.append('file', upload.file);
            fd.append('asset_type_id', newId);
            fd.append('dto_id', upload.type);  // Send dto_id instead of doc_type
            if (upload.type && upload.docTypeName?.trim()) {
              fd.append('doc_type_name', upload.docTypeName);
            }
            try {
              console.log(`Uploading file: ${upload.file.name} for asset type: ${newId}`);
              const uploadResponse = await API.post('/asset-type-docs/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
              console.log('Upload successful:', uploadResponse.data);
            } catch (upErr) {
              console.error('Checklist upload failed', upErr);
              console.error('Upload error details:', upErr.response?.data);
              toast.error(`Failed to upload ${upload.file.name}: ${upErr.response?.data?.message || upErr.message}`);
            }
          }
        }
      }
      navigate('/master-data/asset-types');
    } catch (error) {
      const errorMessage = error.response?.data?.error || "Failed to create asset type";
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

  const handleCancel = () => {
    navigate('/master-data/asset-types');
  };

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val.trim();

  return (
    <div className="max-w-6xl mx-auto bg-white rounded-xl shadow">
      <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center">
        {/* <h1 className="text-2xl font-semibold">Add Asset Type</h1> */}
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* First Row: Asset Type, Assignment Type, Status, Depreciation Method */}
        <div className="grid grid-cols-4 gap-6 mb-6">
          {/* Asset Type Input */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Asset Type <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assetType}
              onChange={(e) => setAssetType(e.target.value)}
              className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFieldInvalid(assetType) ? 'border-red-500' : 'border-gray-300'}`}
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

          {/* Depreciation Method Dropdown */}
          <div>
            <label className="block text-sm font-medium mb-1">Depreciation Method</label>
            <select
              value={depreciationType}
              onChange={(e) => setDepreciationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ND">No Depreciation (ND)</option>
              <option value="SL">Straight Line (SL)</option>
              <option value="RB">Reducing Balance (RB)</option>
              <option value="DD">Double Decline (DD)</option>
            </select>
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
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${submitAttempted && requireMaintenance && !selectedMaintenanceType ? 'border-red-500' : 'border-gray-300'}`}
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
            {/* Checklist upload with improved UI */}
            <div className="col-span-2 mt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-medium text-gray-900">Doc Upload</label>
                <button 
                  type="button" 
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                  onClick={addChecklistUpload}
                >
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Document
                </button>
              </div>
              
              <div className="space-y-3">
                {checklistUploads.length === 0 && <div className="text-sm text-gray-500">No checklist documents added.</div>}
                {checklistUploads.map(upload => (
                  <div key={upload.id} className="bg-white border rounded p-3 space-y-3">
                    {/* First row: Document Type and Custom Name */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Document Type</label>
                        <select 
                          className="w-full border rounded h-[38px] px-2 text-sm" 
                          value={upload.type} 
                          onChange={e => updateChecklistUpload(upload.id, { type: e.target.value })}
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
                        const selectedDocType = documentTypes.find(dt => dt.id === upload.type);
                        const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                        return needsCustomName && (
                          <div>
                            <label className="block text-xs font-medium mb-1">Custom Name</label>
                            <input 
                              className="w-full border rounded h-[38px] px-2 text-sm" 
                              value={upload.docTypeName} 
                              onChange={e => updateChecklistUpload(upload.id, { docTypeName: e.target.value })} 
                              placeholder={`Enter custom name for ${selectedDocType?.text}`}
                            />
                          </div>
                        );
                      })()}
                    </div>
                    
                    {/* Second row: File input and buttons */}
                    <div>
                      <label className="block text-xs font-medium mb-1">File (Max 15MB)</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <input
                            type="file"
                            id={`file-${upload.id}`}
                            onChange={e => {
                              const f = e.target.files?.[0] || null;
                              if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                                toast.error('File size exceeds 15MB limit');
                                e.target.value = '';
                                return;
                              }
                              onSelectChecklistFile(upload.id, f);
                            }}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx"
                          />
                          <label
                            htmlFor={`file-${upload.id}`}
                            className="flex items-center h-[38px] px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                          >
                            <svg className="flex-shrink-0 w-5 h-4 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="truncate">
                              {upload.file ? upload.file.name : 'Choose file'}
                            </span>
                          </label>
                        </div>
                        
                        <div className="flex gap-2">
                          {upload.previewUrl && (
                            <a 
                              href={upload.previewUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="h-[38px] inline-flex items-center px-3 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors whitespace-nowrap"
                            >
                              Preview
                            </a>
                          )}
                          <button 
                            type="button" 
                            onClick={() => removeChecklistUpload(upload.id)}
                            className="h-[38px] inline-flex items-center px-3 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 text-xs text-gray-500">
                Upload maintenance checklist documents. These will be available when performing maintenance on assets of this type.
              </div>
            </div>
          </div>
        )}

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
              <div className="max-w-xs w-full">
                <label className="block text-sm font-medium mb-1">
                  Parent Asset Type <span className="text-red-500">*</span>
                </label>
                <SearchableDropdown
                  options={parentAssetTypes.map(type => ({
                    id: type.asset_type_id,
                    text: type.text
                  }))}
                  value={selectedParentType}
                  onChange={setSelectedParentType}
                  placeholder="Select parent asset type"
                  searchPlaceholder="Search parent types..."
                  className={isFieldInvalid(selectedParentType) ? 'border-red-500' : ''}
                  displayKey="text"
                  valueKey="id"
                />
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-20">
          <button
            type="button"
            onClick={handleCancel}
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
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddAssetType;
