import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";
import EnhancedDropdown from "../ui/EnhancedDropdown";

const EditBreakdownReport = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthStore();
  const breakdown = state?.breakdown;

  const [reasonCodes, setReasonCodes] = useState([]);
  const [brCode, setBrCode] = useState("");
  const [description, setDescription] = useState("");
  const [decisionCode, setDecisionCode] = useState("");
  const [upcomingMaintenanceDate, setUpcomingMaintenanceDate] = useState("");
  const [assetTypeDetails, setAssetTypeDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetId = breakdown?.asset_id || "";
  const assetTypeId = breakdown?.asset_type_id || "";

  useEffect(() => {
    if (breakdown) {
      // Populate form with existing breakdown data
      setBrCode(breakdown.atbrrc_id || "");
      setDescription(breakdown.description || "");
      setDecisionCode(breakdown.decision_code || "");
    }
  }, [breakdown]);

  useEffect(() => {
    // Fetch asset type details when asset type changes
    const fetchAssetTypeDetails = async () => {
      if (assetTypeId) {
        try {
          const res = await API.get(`/dept-assets/asset-types/${assetTypeId}`);
          setAssetTypeDetails(res.data);
        } catch (err) {
          console.error("Failed to fetch asset type details", err);
        }
      }
    };
    fetchAssetTypeDetails();
  }, [assetTypeId]);

  useEffect(() => {
    // Fetch reason codes
    const fetchReasonCodes = async () => {
      try {
        const res = await API.get("/reportbreakdown/reason-codes", {
          params: {
            asset_type_id: assetTypeId || undefined,
            org_id: user?.org_id,
          },
        });
        const arr = Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : [];
        setReasonCodes(arr);
      } catch (err) {
        console.error("Failed to fetch reason codes", err);
        toast.error("Failed to fetch reason codes");
      }
    };
    fetchReasonCodes();
  }, [user?.org_id, assetTypeId]);

  useEffect(() => {
    // Fetch upcoming maintenance date
    const fetchUpcomingMaintenance = async () => {
      if (assetId) {
        try {
          const res = await API.get(`/reportbreakdown/upcoming-maintenance/${assetId}`);
          if (res.data?.data?.upcoming_maintenance_date) {
            setUpcomingMaintenanceDate(res.data.data.upcoming_maintenance_date);
          }
        } catch (err) {
          console.error("Failed to fetch upcoming maintenance", err);
          // Don't show error toast for this as it's not critical
        }
      }
    };
    fetchUpcomingMaintenance();
  }, [assetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const breakdownData = {
        atbrrc_id: brCode,
        description,
        decision_code: decisionCode,
      };

      await API.put(`/reportbreakdown/update/${breakdown.abr_id}`, breakdownData);
      
      toast.success("Breakdown report updated successfully");
      navigate("/report-breakdown");
    } catch (err) {
      console.error("Failed to update breakdown report", err);
      toast.error(err.response?.data?.error || "Failed to update breakdown report");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate("/report-breakdown");
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateString; // Return original string if formatting fails
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Tomorrow';
      } else if (diffDays === -1) {
        return 'Yesterday';
      } else if (diffDays > 0) {
        return `In ${diffDays} day${diffDays > 1 ? 's' : ''}`;
      } else {
        return `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
      }
    } catch (error) {
      console.error('Error calculating relative time:', error);
      return '';
    }
  };

  const decisionCodeOptions = [
    { 
      value: "BF01", 
      label: "BF01 - Maintenance Request & Breakdown Fix",
      description: "Create maintenance request along with breakdown fix"
    },
    { 
      value: "BF02", 
      label: "BF02 - Create Breakdown fix only",
      description: "Create Breakdown fix only"
    },
    { 
      value: "BF03", 
      label: "BF03 - Postpone fix to next maintenance",
      description: "Postpone breakdown fix until next maintenance"
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Edit Breakdown Report</h1>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset ID
                </label>
                <input
                  type="text"
                  value={assetId}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breakdown ID
                </label>
                <input
                  type="text"
                  value={breakdown?.abr_id || ""}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Breakdown Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Breakdown Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Breakdown Code *
                </label>
                <EnhancedDropdown
                  options={reasonCodes.map(code => ({
                    value: code.id,
                    label: `${code.id} - ${code.text}`
                  }))}
                  value={brCode}
                  onChange={setBrCode}
                  placeholder="Select breakdown code"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Decision Code *
                </label>
                <EnhancedDropdown
                  options={decisionCodeOptions}
                  value={decisionCode}
                  onChange={setDecisionCode}
                  placeholder="Select decision code"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Enter breakdown description"
                required
              />
            </div>

          </div>

          {/* Upcoming Maintenance Info */}
          {upcomingMaintenanceDate && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upcoming Maintenance</h3>
              <div className="text-sm text-gray-600">
                <p>
                  Next scheduled maintenance: <span className="font-medium text-blue-800">{formatDate(upcomingMaintenanceDate)}</span>
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  ({getRelativeTime(upcomingMaintenanceDate)})
                </p>
              </div>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={handleCancel}
              className="px-6 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !brCode || !description || !decisionCode}
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? "Updating..." : "Update Breakdown Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBreakdownReport;
