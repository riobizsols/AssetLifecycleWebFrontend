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
  
  // New state variables for maintenance fields
  const [maintenanceTypes, setMaintenanceTypes] = useState([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState("");
  const [maintenanceLeadType, setMaintenanceLeadType] = useState("");

  useEffect(() => {
    if (assetData) {
      setAssetType(assetData.text || "");
      setAssignmentType(assetData.assignment_type || "user");
      setGroupRequired(assetData.group_required === "Yes");
      setRequireInspection(assetData.inspection_required === "Yes");
      setRequireMaintenance(assetData.maint_required === "Yes" || assetData.maint_required === 1);
      setIsActive(assetData.int_status === "Active");
      setParentChild(assetData.is_child ? "child" : "parent");
      setSelectedParentType(assetData.parent_asset_type_id || "");
      setSelectedMaintenanceType(assetData.maint_type_id || "");
      setMaintenanceLeadType(assetData.maint_lead_type || "");
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