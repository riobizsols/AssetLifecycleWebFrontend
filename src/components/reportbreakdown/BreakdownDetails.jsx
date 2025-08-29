import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";
import EnhancedDropdown from "../ui/EnhancedDropdown";



const BreakdownDetails = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthStore();
  const selectedAsset = state?.asset;
  const existingBreakdown = state?.breakdown;

  const isReadOnly = !!existingBreakdown;

  const [reasonCodes, setReasonCodes] = useState([]);
  const [brCode, setBrCode] = useState("");
  const [description, setDescription] = useState("");
  const [reportedByType, setReportedByType] = useState("");
  const [decisionCode, setDecisionCode] = useState("");
  const [priority, setPriority] = useState("");
  const [upcomingMaintenanceDate, setUpcomingMaintenanceDate] = useState("");
  const [assetTypeDetails, setAssetTypeDetails] = useState(null);
  const [reportedByUserId, setReportedByUserId] = useState("");
  const [reportedByDeptId, setReportedByDeptId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const assetId = useMemo(
    () => existingBreakdown?.asset_id || selectedAsset?.asset_id || "",
    [existingBreakdown, selectedAsset]
  );
  const assetTypeId = useMemo(
    () =>
      existingBreakdown?.asset_type_id || selectedAsset?.asset_type_id || "",
    [existingBreakdown, selectedAsset]
  );

  useEffect(() => {
    // Fetch asset type details when asset type changes
    const fetchAssetTypeDetails = async () => {
      if (!assetTypeId) return;
      try {
        const response = await API.get(`/asset-types/${assetTypeId}`);
        const typeDetails = response.data;
        if (!typeDetails?.assignment_type) {
          throw new Error("No assignment type found for this asset type");
        }
        setAssetTypeDetails(typeDetails);
        setReportedByType(typeDetails.assignment_type);
      } catch (err) {
        console.error("Failed to fetch asset type details:", err);
        toast.error(err.message || "Failed to fetch asset type details");
        navigate(-1); // Go back if we can't get the required assignment type
      }
    };

    fetchAssetTypeDetails();
  }, [assetTypeId]);

  useEffect(() => {
    // Prefill when viewing existing breakdown
    if (existingBreakdown) {
      setBrCode(
        existingBreakdown.br_code || existingBreakdown.reason_code || ""
      );
      setDescription(existingBreakdown.description || "");
      setReportedByType(assetTypeDetails?.assignment_type || "Department");
      if (existingBreakdown.reported_by_user_id) {
        setReportedByUserId(existingBreakdown.reported_by_user_id);
      } else if (existingBreakdown.reported_by_dept_id) {
        setReportedByDeptId(existingBreakdown.reported_by_dept_id);
      }
             if (existingBreakdown.decision_code) {
         setDecisionCode(existingBreakdown.decision_code);
       }
       if (existingBreakdown.priority) {
         setPriority(existingBreakdown.priority);
       }
      if (existingBreakdown.upcoming_maintenance_date) {
        try {
          const d = new Date(existingBreakdown.upcoming_maintenance_date);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, "0");
          const dd = String(d.getDate()).padStart(2, "0");
          setUpcomingMaintenanceDate(`${yyyy}-${mm}-${dd}`);
        } catch {}
      }
    }
  }, [existingBreakdown, assetTypeDetails]);

  useEffect(() => {
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
        console.warn("Failed to fetch reason codes");
        setReasonCodes([]);
      }
    };
    fetchReasonCodes();
  }, [assetTypeId, user?.org_id]);

  useEffect(() => {
    const fetchUpcomingMaintenance = async () => {
      if (!assetId) return;
      try {
        const res = await API.get(`/reportbreakdown/upcoming-maintenance/${assetId}`);
        const maintenanceData = res.data?.data;
        
        if (maintenanceData?.upcoming_maintenance_date) {
          const date = new Date(maintenanceData.upcoming_maintenance_date);
          const yyyy = date.getFullYear();
          const mm = String(date.getMonth() + 1).padStart(2, "0");
          const dd = String(date.getDate()).padStart(2, "0");
          setUpcomingMaintenanceDate(`${yyyy}-${mm}-${dd}`);
        }
      } catch (err) {
        console.warn("Failed to fetch upcoming maintenance date:", err);
      }
    };
    fetchUpcomingMaintenance();
  }, [assetId]);

  // Handle decision code change and update priority options
  const handleDecisionCodeChange = (newDecisionCode) => {
    setDecisionCode(newDecisionCode);
    // Reset priority when decision code changes
    setPriority("");
  };
  
      const resetForm = () => {
    setBrCode("");
    setDescription("");
    setDecisionCode("");
    setPriority("");
    setReportedByUserId("");
    setReportedByDeptId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!assetId) {
      toast.error("Asset ID is required");
      return;
    }
    if (!assetTypeId) {
      toast.error("Asset type ID is required");
      return;
    }
    if (!user?.org_id) {
      toast.error("Organization ID is required");
      return;
    }
    if (reasonCodes.length === 0) {
      toast.error("No breakdown reason codes available");
      return;
    }
    if (!brCode) {
      toast.error("Please select a breakdown code");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description");
      return;
    }
    if (description.trim().length > 50) {
      toast.error("Description cannot exceed 50 characters");
      return;
    }
    if (!decisionCode) {
      toast.error("Please select a decision code");
      return;
    }
    if (!priority) {
      toast.error("Please select a priority");
      return;
    }

    // Validate breakdown code exists in reason codes
    const selectedReasonCode = reasonCodes.find(rc => rc.id === brCode || rc.atbrrc_id === brCode);
    if (!selectedReasonCode) {
      toast.error("Selected breakdown code is invalid");
      return;
    }

    // Validate decision code is valid
    const validDecisionCodes = ['BF01', 'BF02', 'BF03'];
    if (!validDecisionCodes.includes(decisionCode)) {
      toast.error("Invalid decision code");
      return;
    }

    // Validate priority is valid for the selected decision code
    const validPriorities = {
      'BF01': ['High', 'Very High'],
      'BF02': ['High', 'Very High'],
      'BF03': ['Medium', 'Low']
    };
    
    if (!validPriorities[decisionCode].includes(priority)) {
      toast.error(`Invalid priority for decision code ${decisionCode}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate asset type details are loaded
      if (!assetTypeDetails) {
        toast.error("Asset type details not loaded");
        return;
      }

      // Determine reported_by value based on asset type assignment
      let reportedBy = 'SYSTEM';
      
      if (assetTypeDetails?.assignment_type === 'User') {
        reportedBy = reportedByUserId || user?.user_id || user?.emp_int_id || 'SYSTEM';
        if (!reportedByUserId && !user?.user_id && !user?.emp_int_id) {
          toast.error("User ID is required for User assignment type");
          return;
        }
      } else if (assetTypeDetails?.assignment_type === 'Department') {
        reportedBy = reportedByDeptId || user?.dept_id || 'SYSTEM';
        if (!reportedByDeptId && !user?.dept_id) {
          toast.error("Department ID is required for Department assignment type");
          return;
        }
      } else {
        // Default to current user
        reportedBy = user?.user_id || user?.emp_int_id || 'SYSTEM';
        if (!user?.user_id && !user?.emp_int_id) {
          toast.error("User ID is required");
          return;
        }
      }

      // Validate reported_by field is not empty
      if (!reportedBy || reportedBy === 'SYSTEM') {
        toast.error("Reported by field is required");
        return;
      }

      const payload = {
        asset_id: assetId,
        atbrrc_id: brCode,
        reported_by: reportedBy,
        description: description,
        decision_code: decisionCode
      };

      // Validate payload structure
      if (!payload.asset_id || !payload.atbrrc_id || !payload.reported_by || !payload.description || !payload.decision_code) {
        toast.error("Invalid payload structure");
        console.error("Invalid payload:", payload);
        return;
      }

      console.log("Create breakdown payload", payload);
      console.log("API endpoint: /reportbreakdown/create");
      console.log("User context:", { 
        user_id: user?.user_id, 
        emp_int_id: user?.emp_int_id, 
        dept_id: user?.dept_id,
        org_id: user?.org_id 
      });
      
      // Add timeout to the API call
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 seconds
      });

      const response = await Promise.race([
        API.post('/reportbreakdown/create', payload),
        timeoutPromise
      ]);
      
      console.log("API response:", response);
      
      // Validate response structure
      if (!response.data) {
        toast.error("Invalid response from server");
        return;
      }
      
      if (response.data.success) {
        toast.success("Breakdown report created successfully");
        resetForm(); // Reset the form
        try {
          navigate("/report-breakdown");
        } catch (navError) {
          console.error("Navigation error:", navError);
          // Fallback: try to navigate to the reports page
          navigate("/reports");
        }
      } else {
        toast.error(response.data.message || "Failed to create breakdown report");
      }
    } catch (error) {
      console.error("Error creating breakdown report:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      if (error.message === 'Request timeout') {
        toast.error("Request timeout - Please try again");
        resetForm(); // Reset form on timeout
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.error || "Invalid request data");
        resetForm(); // Reset form on validation error
      } else if (error.response?.status === 401) {
        toast.error("Unauthorized - Please log in again");
        resetForm(); // Reset form on unauthorized error
      } else if (error.response?.status === 500) {
        toast.error("Server error - Please try again later");
        resetForm(); // Reset form on server error
      } else {
        toast.error(error.response?.data?.error || "Failed to create breakdown report");
        resetForm(); // Reset form on other errors
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        {/* <span className="text-2xl font-semibold text-center w-full">Add Asset</span> */}
      </div>
      <div className="bg-white rounded-b-lg shadow p-6">
        {(selectedAsset || existingBreakdown) && (
          <div className="mb-8 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0E2F4B]">
                Asset Details
              </h2>
              <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                ID: {assetId}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Asset Type
                </div>
                <div className="text-base font-medium text-gray-900">
                  {selectedAsset?.text ||
                    existingBreakdown?.asset_type_name ||
                    "-"}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Asset Name
                </div>
                <div className="text-base font-medium text-gray-900">
                  {selectedAsset?.description ||
                    existingBreakdown?.asset_name ||
                    "-"}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Asset ID
                </div>
                <div className="text-base font-medium text-gray-900">
                  {selectedAsset?.asset_id ||
                    existingBreakdown?.asset_name ||
                    "-"}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#0E2F4B] mb-4">
              Breakdown Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Breakdown Code (BR Code)
                </label>
                <EnhancedDropdown
                  options={reasonCodes.map((c) => ({
                    value: c.id || c.atbrrc_id,
                    label: c.text || c.name || c.description || c.code || c.id,
                    description: c.description || ""
                  }))}
                  value={brCode}
                  onChange={setBrCode}
                  placeholder="Select Breakdown Code"
                  disabled={isReadOnly}
                  required
                />
                {reasonCodes.length === 0 && (
                  <p className="text-xs text-red-500">
                    No breakdown reason codes available for this asset type
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reported By
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">Type: <span className="text-gray-800">{assetTypeDetails?.assignment_type || 'Loading...'}</span></div>
                  {assetTypeDetails?.assignment_type === 'User' && (
                    <input
                      type="text"
                      value={reportedByUserId}
                      onChange={(e) => setReportedByUserId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                      placeholder="Enter user ID or leave empty for current user"
                      disabled={isReadOnly}
                    />
                  )}
                  {assetTypeDetails?.assignment_type === 'Department' && (
                    <input
                      type="text"
                      value={reportedByDeptId}
                      onChange={(e) => setReportedByDeptId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                      placeholder="Enter department ID or leave empty for current department"
                      disabled={isReadOnly}
                    />
                  )}
                  {assetTypeDetails?.assignment_type === 'User' && (
                    <p className="mt-1 text-xs text-gray-500">Leave empty to use your current user ID: {user?.user_id || user?.emp_int_id || 'Not available'}</p>
                  )}
                  {assetTypeDetails?.assignment_type === 'Department' && (
                    <p className="mt-1 text-xs text-gray-500">Leave empty to use your current department ID: {user?.dept_id || 'Not available'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 50))}
                maxLength={50}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all min-h-[120px]"
                placeholder="Max 50 characters..."
                disabled={isReadOnly}
                required
              />
              <p className="text-xs text-gray-500">
                Max 50 characters. Provide concise details about the breakdown.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#0E2F4B] mb-4">
              Maintenance Planning
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Decision Code
                </label>
                                                 <EnhancedDropdown
                  options={[
                    {
                      value: "BF01",
                      label: "BF01 – Maintenance Request & Breakdown Fix",
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
                    }
                  ]}
                  value={decisionCode}
                  onChange={handleDecisionCodeChange}
                  placeholder="Select Decision Code"
                  disabled={isReadOnly}
                  required
                />
                <p className="text-xs text-gray-500">
                  Choose how to handle this breakdown: immediate fix, create maintenance request, or postpone
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Priority
                </label>
                                                                  <EnhancedDropdown
                  options={
                    (decisionCode === "BF01" || decisionCode === "BF02") 
                      ? [
                          { value: "High", label: "High", description: "High priority breakdown fix" },
                          { value: "Very High", label: "Very High", description: "Very high priority breakdown fix" }
                        ]
                      : decisionCode === "BF03"
                      ? [
                          { value: "Medium", label: "Medium", description: "Medium priority - can wait until maintenance" },
                          { value: "Low", label: "Low", description: "Low priority - can wait until maintenance" }
                        ]
                      : []
                  }
                  value={priority}
                  onChange={setPriority}
                  placeholder={!decisionCode ? "Select Decision Code First" : "Select Priority"}
                  disabled={isReadOnly || !decisionCode}
                  required
                />
                <p className="text-xs text-gray-500">
                  Priority depends on decision code: High/Very High for immediate fixes, Medium/Low for postponed fixes
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Upcoming Maintenance Date
                </label>
                {upcomingMaintenanceDate ? (
                  <input
                    type="date"
                    value={upcomingMaintenanceDate}
                    onChange={(e) => setUpcomingMaintenanceDate(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                    disabled
                  />
                ) : (
                  <div className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-500">
                    No maintenance scheduled
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  This date is automatically fetched from the asset's maintenance schedule
                </p>
              </div>
            </div>
          </div>

          

          <div className="flex items-center justify-end gap-4 pt-6">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              Cancel
            </button>
            {!isReadOnly && (
              <>
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg bg-[#0E2F4B] text-white font-medium hover:bg-[#1a4a76] transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Submitting..." : "Report Breakdown"}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BreakdownDetails;
