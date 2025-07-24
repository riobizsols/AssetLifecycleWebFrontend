import React, { useState, useEffect } from "react";
import API from "../lib/axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

const AddAssetType = () => {
  const navigate = useNavigate();
  const [assetType, setAssetType] = useState("");
  const [assignmentType, setAssignmentType] = useState("user"); // "user" or "department"
  const [groupRequired, setGroupRequired] = useState(false);
  const [requireInspection, setRequireInspection] = useState(false);
  const [requireMaintenance, setRequireMaintenance] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [parentChild, setParentChild] = useState("parent"); // Default to parent
  const [parentAssetTypes, setParentAssetTypes] = useState([]);
  const [selectedParentType, setSelectedParentType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  useEffect(() => {
    // Reset parent selection when parentChild changes
    setSelectedParentType("");
    
    // Fetch parent asset types if "child" is selected
    if (parentChild === "child") {
      fetchParentAssetTypes();
    }
  }, [parentChild]);

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

    setIsSubmitting(true);

    try {
      const formData = {
        text: assetType.trim(),
        assignment_type: assignmentType,
        int_status: isActive ? 1 : 0,
        group_required: groupRequired,
        inspection_required: requireInspection,
        maintenance_schedule: requireMaintenance ? 1 : 0,
        is_child: parentChild === "child",
        parent_asset_type_id: parentChild === "child" ? selectedParentType : null
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
                  className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isFieldInvalid(selectedParentType) ? 'border-red-500' : 'border-gray-300'}`}
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
