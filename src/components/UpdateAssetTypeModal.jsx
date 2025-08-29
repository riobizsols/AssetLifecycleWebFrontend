import React, { useState, useEffect } from "react";
import API from "../lib/axios";
import { toast } from "react-hot-toast";

const UpdateAssetTypeModal = ({ isOpen, onClose, assetData }) => {
  const [assetType, setAssetType] = useState("");
  const [assignmentType, setAssignmentType] = useState("user");
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
  
  // New state variables for maintenance fields
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState("");
  const [maintenanceLeadType, setMaintenanceLeadType] = useState("");

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
  }, []);

  // Fetch checklist when asset type is loaded and requires maintenance
  useEffect(() => {
    if (assetData?.asset_type_id && requireMaintenance) {
      fetchChecklist();
    }
  }, [assetData?.asset_type_id, requireMaintenance]);

  const fetchChecklist = async () => {
    if (!assetData?.asset_type_id) return;
    setChecklistLoading(true);
    try {
      const res = await API.get(`/asset-types/${assetData.asset_type_id}/checklist`);
      const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      setChecklist(arr);
    } catch (err) {
      // Only show error if it's not a 404 (no checklist yet)
      if (err.response?.status !== 404) {
        console.error('Failed to fetch checklist:', err);
        toast.error('Failed to load checklist');
      }
      setChecklist([]);
    } finally {
      setChecklistLoading(false);
    }
  };

  const handleDocumentAction = async (doc, action) => {
    const actionKey = `${doc.id}-${action}`;
    if (loadingActions[actionKey]) return;

    try {
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
      
      const url = new URL(doc.url || doc.download_url);
      if (action === 'download') {
        url.searchParams.append('download', '1');
      }

      // First verify the URL is accessible
      const checkResponse = await fetch(url.toString(), { method: 'HEAD' });
      if (!checkResponse.ok) {
        throw new Error('Document not accessible');
      }

      // Open in new tab
      window.open(url.toString(), '_blank');
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
      if (!r.file) {
        toast.error('Choose a file for all rows');
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
          
          await API.post(`/asset-types/${assetData.asset_type_id}/checklist`, fd, { 
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

              {/* Checklist Documents */}
              <div className="col-span-2 mt-4">
                <div className="text-sm font-medium text-gray-900 mb-2">Maintenance Checklist</div>
                <div className="border rounded-lg overflow-hidden bg-white mb-6">
                  {checklistLoading ? (
                    <div className="p-4 text-sm text-gray-500">Loading checklist...</div>
                  ) : checklist.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">No checklist documents uploaded.</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-3 py-2">File Name</th>
                          <th className="text-left px-3 py-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {checklist.map((doc) => {
                          const viewLoading = loadingActions[`${doc.id}-view`];
                          const downloadLoading = loadingActions[`${doc.id}-download`];
                          
                          return (
                            <tr key={doc.id || doc.file_name} className="odd:bg-white even:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="max-w-md truncate">{doc.file_name || doc.name || 'document'}</div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleDocumentAction(doc, 'view')}
                                    disabled={viewLoading}
                                    className="px-3 py-1 rounded bg-[#0E2F4B] text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                                  >
                                    {viewLoading ? '...' : 'View'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDocumentAction(doc, 'download')}
                                    disabled={downloadLoading}
                                    className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                                  >
                                    {downloadLoading ? '...' : 'Download'}
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

                {/* Upload New Checklist Documents */}
                <div className="border-t pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-md font-medium text-gray-900">Upload New Checklist Documents</h3>
                    <button 
                      type="button" 
                      className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                      onClick={() => setUploadRows(prev => ([...prev, { id: crypto.randomUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
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
                        <div className="col-span-4">
                          <label className="block text-xs font-medium mb-1">File (Max 10MB)</label>
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
                        disabled={isUploading || uploadRows.some(r => !r.file)}
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
    </div>
  );
};

export default UpdateAssetTypeModal; 