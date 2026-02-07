  // --- Confirm/Reopen UI state ---
  const [reopenNotes, setReopenNotes] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [isReopening, setIsReopening] = useState(false);
  const canShowConfirmReopen = existingBreakdown && (existingBreakdown.status === "CO" || existingBreakdown.status === "Completed");
  const isAlreadyConfirmed = existingBreakdown && (existingBreakdown.status === "CF" || existingBreakdown.status === "Confirmed");

  // Confirm action
  const handleConfirm = async () => {
    if (!existingBreakdown) return;
    setIsConfirming(true);
    try {
      const res = await API.post(`/reportbreakdown/${existingBreakdown.abr_id}/confirm`);
      toast.success("Breakdown confirmed.");
      navigate(0); // reload
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to confirm.");
    } finally {
      setIsConfirming(false);
    }
  };

  // Reopen action
  const handleReopen = async () => {
    if (!existingBreakdown) return;
    if (!reopenNotes.trim()) {
      toast.error("Notes are required to reopen.");
      return;
    }
    setIsReopening(true);
    try {
      const res = await API.post(`/reportbreakdown/${existingBreakdown.abr_id}/reopen`, { notes: reopenNotes });
      toast.success("Breakdown reopened.");
      navigate(0); // reload
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to reopen.");
    } finally {
      setIsReopening(false);
    }
  };
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";
import EnhancedDropdown from "../ui/EnhancedDropdown";
import { useLanguage } from "../../contexts/LanguageContext";



const BreakdownDetails2 = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const selectedAsset = state?.asset;
  const existingBreakdown = state?.breakdown;

  // Debug: Log navigation state
  console.log("=== BreakdownDetails2 Loaded ===");
  console.log("Navigation state:", state);
  console.log("Selected Asset:", selectedAsset);
  console.log("User:", user);

  const isReadOnly = !!existingBreakdown;

  const [reasonCodes, setReasonCodes] = useState([]);
  const [brCode, setBrCode] = useState("");
  const [description, setDescription] = useState("");
  const [reportedByType, setReportedByType] = useState("");
  const [assetTypeDetails, setAssetTypeDetails] = useState(null);
  const [reportedByUserId, setReportedByUserId] = useState("");
  const [reportedByDeptId, setReportedByDeptId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create new reason code modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReasonCodeText, setNewReasonCodeText] = useState("");
  const [isCreatingReasonCode, setIsCreatingReasonCode] = useState(false);

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
          throw new Error(t('breakdownDetails.noAssignmentTypeFound'));
        }
        setAssetTypeDetails(typeDetails);
        setReportedByType(typeDetails.assignment_type);
      } catch (err) {
        console.error(t('breakdownDetails.failedToFetchAssetTypeDetails'), err);
        toast.error(err.message || t('breakdownDetails.failedToFetchAssetTypeDetails'));
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
    }
  }, [existingBreakdown, assetTypeDetails]);

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
      console.warn(t('breakdownDetails.failedToFetchReasonCodes'));
      setReasonCodes([]);
    }
  };

  useEffect(() => {
    fetchReasonCodes();
  }, [assetTypeId, user?.org_id]);

  // Handle create new reason code
  const handleCreateNewReasonCode = async () => {
    if (!newReasonCodeText.trim()) {
      toast.error('Please enter a breakdown reason code');
      return;
    }

    if (!assetTypeId) {
      toast.error('Asset type is required to create a reason code');
      return;
    }

    setIsCreatingReasonCode(true);
    try {
      const res = await API.post('/breakdown-reason-codes', {
        asset_type_id: assetTypeId,
        text: newReasonCodeText.trim()
      });

      if (res.data && res.data.success) {
        toast.success('Breakdown reason code created successfully');
        setNewReasonCodeText('');
        setShowCreateModal(false);
        
        // Refresh reason codes list
        await fetchReasonCodes();
        
        // Select the newly created reason code
        const newCode = res.data.data;
        if (newCode && (newCode.atbrrc_id || newCode.id)) {
          setBrCode(newCode.atbrrc_id || newCode.id);
        }
      }
    } catch (error) {
      console.error('Error creating breakdown reason code:', error);
      toast.error(error.response?.data?.message || 'Failed to create breakdown reason code');
    } finally {
      setIsCreatingReasonCode(false);
    }
  };

  // Handle dropdown change - check if "Create New" was selected
  const handleBrCodeChange = (value) => {
    if (value === 'CREATE_NEW') {
      setShowCreateModal(true);
    } else {
      setBrCode(value);
    }
  };

  const resetForm = () => {
    setBrCode("");
    setDescription("");
    setReportedByUserId("");
    setReportedByDeptId("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Debug: Log form state before validation
    console.log("=== Form State on Submit ===");
    console.log("assetId:", assetId);
    console.log("assetTypeId:", assetTypeId);
    console.log("brCode:", brCode);
    console.log("description:", description);
    console.log("reportedByUserId:", reportedByUserId);
    console.log("reportedByDeptId:", reportedByDeptId);
    console.log("user:", user);
    console.log("assetTypeDetails:", assetTypeDetails);
    
    // Validate required fields
    if (!assetId) {
      toast.error(t('breakdownDetails.assetIdRequired'));
      return;
    }
    if (!assetTypeId) {
      toast.error(t('breakdownDetails.assetTypeIdRequired'));
      return;
    }
    if (!user?.org_id) {
      toast.error(t('breakdownDetails.organizationIdRequired'));
      return;
    }
    if (reasonCodes.length === 0) {
      toast.error(t('breakdownDetails.noBreakdownReasonCodesAvailable'));
      return;
    }
    if (!brCode) {
      toast.error(t('breakdownDetails.pleaseSelectBreakdownCode'));
      return;
    }
    if (!description.trim()) {
      toast.error(t('breakdownDetails.pleaseEnterDescription'));
      return;
    }
    if (description.trim().length > 50) {
      toast.error(t('breakdownDetails.descriptionCannotExceed50Characters'));
      return;
    }

    // Validate breakdown code exists in reason codes
    const selectedReasonCode = reasonCodes.find(rc => rc.id === brCode || rc.atbrrc_id === brCode);
    if (!selectedReasonCode) {
      toast.error(t('breakdownDetails.selectedBreakdownCodeInvalid'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Validate asset type details are loaded
      if (!assetTypeDetails) {
        toast.error(t('breakdownDetails.assetTypeDetailsNotLoaded'));
        return;
      }

      // Determine reported_by value based on asset type assignment
      let reportedBy = 'SYSTEM';
      
      if (assetTypeDetails?.assignment_type === 'User') {
        reportedBy = reportedByUserId || user?.user_id || user?.emp_int_id || 'SYSTEM';
        if (!reportedByUserId && !user?.user_id && !user?.emp_int_id) {
          toast.error(t('breakdownDetails.userIdRequiredForUserAssignment'));
          return;
        }
      } else if (assetTypeDetails?.assignment_type === 'Department') {
        reportedBy = reportedByDeptId || user?.dept_id || 'SYSTEM';
        if (!reportedByDeptId && !user?.dept_id) {
          toast.error(t('breakdownDetails.departmentIdRequiredForDepartmentAssignment'));
          return;
        }
      } else {
        // Default to current user
        reportedBy = user?.user_id || user?.emp_int_id || 'SYSTEM';
        if (!user?.user_id && !user?.emp_int_id) {
          toast.error(t('breakdownDetails.userIdRequired'));
          return;
        }
      }

      // Validate reported_by field is not empty
      if (!reportedBy || reportedBy === 'SYSTEM') {
        toast.error(t('breakdownDetails.reportedByFieldRequired'));
        return;
      }

      const payload = {
        asset_id: assetId,
        atbrrc_id: brCode,
        reported_by: reportedBy,
        description: description,
        decision_code: null
      };

      // Validate payload structure
      if (!payload.asset_id || !payload.atbrrc_id || !payload.reported_by || !payload.description) {
        toast.error(t('breakdownDetails.invalidPayloadStructure'));
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
        toast.success(t('breakdownDetails.breakdownReportCreatedSuccessfully'));
        resetForm(); // Reset the form
        try {
          navigate("/employee-report-breakdown");
        } catch (navError) {
          console.error("Navigation error:", navError);
          // Fallback: try to navigate to the reports page
          navigate("/reports");
        }
      } else {
        toast.error(response.data.message || t('breakdownDetails.failedToCreateBreakdownReport'));
      }
    } catch (error) {
      console.error("Error creating breakdown report:", error);
      console.error("Error response:", error.response);
      console.error("Error status:", error.response?.status);
      console.error("Error data:", error.response?.data);
      
      if (error.message === 'Request timeout') {
        toast.error(t('breakdownDetails.requestTimeout'));
        resetForm(); // Reset form on timeout
      } else if (error.response?.status === 400) {
        toast.error(error.response.data.error || t('breakdownDetails.invalidRequestData'));
        resetForm(); // Reset form on validation error
      } else if (error.response?.status === 401) {
        toast.error(t('breakdownDetails.unauthorized'));
        resetForm(); // Reset form on unauthorized error
      } else if (error.response?.status === 500) {
        toast.error(t('breakdownDetails.serverError'));
        resetForm(); // Reset form on server error
      } else {
        toast.error(error.response?.data?.error || t('breakdownDetails.failedToCreateBreakdownReport'));
        resetForm(); // Reset form on other errors
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-t-xl border-b-4 border-[#FFC107] flex justify-center items-center">
        <span className="text-2xl font-semibold text-center w-full">{t('breakdownDetails.title')}</span>
      </div>
      <div className="bg-white rounded-b-lg shadow p-6">
        {(selectedAsset || existingBreakdown) && (
          <div className="mb-8 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[#0E2F4B]">
                {t('breakdownDetails.assetDetails')}
              </h2>
              <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                ID: {assetId}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t('breakdownDetails.assetType')}
                </div>
                <div className="text-base font-medium text-gray-900">
                  {selectedAsset?.text ||
                    existingBreakdown?.asset_type_name ||
                    "-"}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t('breakdownDetails.assetName')}
                </div>
                <div className="text-base font-medium text-gray-900">
                  {selectedAsset?.description ||
                    existingBreakdown?.asset_name ||
                    "-"}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  {t('breakdownDetails.assetId')}
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

        {/* Create New Reason Code Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
                <h2 className="text-xl font-semibold">Create New Breakdown Reason Code</h2>
              </div>
              
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breakdown Reason Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReasonCodeText}
                    onChange={(e) => setNewReasonCodeText(e.target.value)}
                    placeholder="Enter breakdown reason code (e.g., Power Supply Damage, Screen Damage)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewReasonCode();
                      }
                    }}
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewReasonCodeText('');
                    }}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    disabled={isCreatingReasonCode}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNewReasonCode}
                    disabled={isCreatingReasonCode || !newReasonCodeText.trim()}
                    className="px-6 py-2.5 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingReasonCode ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#0E2F4B] mb-4">
              {t('breakdownDetails.breakdownInformation')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('breakdownDetails.breakdownCode')} *
                </label>
                <EnhancedDropdown
                  options={[
                    ...reasonCodes.map((c) => ({
                      value: c.id || c.atbrrc_id,
                      label: c.text || c.name || c.description || c.code || c.id,
                      description: c.description || ""
                    })),
                    {
                      value: 'CREATE_NEW',
                      label: '+ Create New',
                      description: 'Create a new breakdown reason code',
                      isCreateNew: true
                    }
                  ]}
                  value={brCode}
                  onChange={handleBrCodeChange}
                  placeholder={t('breakdownDetails.selectBreakdownCode')}
                  disabled={isReadOnly}
                  required
                />
                {reasonCodes.length === 0 && (
                  <p className="text-xs text-red-500">
                    {t('breakdownDetails.noBreakdownReasonCodes')}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('breakdownDetails.reportedBy')}
                </label>
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div className="text-xs text-gray-500 mb-1">{t('breakdownDetails.type')}: <span className="text-gray-800">{assetTypeDetails?.assignment_type || t('breakdownDetails.loading')}</span></div>
                  {assetTypeDetails?.assignment_type === 'User' && (
                    <input
                      type="text"
                      value={reportedByUserId}
                      onChange={(e) => setReportedByUserId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                      placeholder={t('breakdownDetails.enterUserId')}
                      disabled={isReadOnly}
                    />
                  )}
                  {assetTypeDetails?.assignment_type === 'Department' && (
                    <input
                      type="text"
                      value={reportedByDeptId}
                      onChange={(e) => setReportedByDeptId(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                      placeholder={t('breakdownDetails.enterDepartmentId')}
                      disabled={isReadOnly}
                    />
                  )}
                  {assetTypeDetails?.assignment_type === 'User' && (
                    <p className="mt-1 text-xs text-gray-500">{t('breakdownDetails.leaveEmptyForCurrentUser', { userId: user?.user_id || user?.emp_int_id || t('breakdownDetails.notAvailable') })}</p>
                  )}
                  {assetTypeDetails?.assignment_type === 'Department' && (
                    <p className="mt-1 text-xs text-gray-500">{t('breakdownDetails.leaveEmptyForCurrentDepartment', { deptId: user?.dept_id || t('breakdownDetails.notAvailable') })}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {t('breakdownDetails.description')} *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value.slice(0, 50))}
                maxLength={50}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all min-h-[120px]"
                placeholder={t('breakdownDetails.maxCharacters')}
                disabled={isReadOnly}
                required
              />
              <p className="text-xs text-gray-500">
                {t('breakdownDetails.maxCharactersDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-4 pt-6">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                {t('breakdownDetails.cancel')}
              </button>
              {!isReadOnly && (
                <>
                  <button
                    type="button"
                    onClick={resetForm}
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('breakdownDetails.reset')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 rounded-lg bg-[#0E2F4B] text-white font-medium hover:bg-[#1a4a76] transition-all focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? t('breakdownDetails.submitting') : t('breakdownDetails.reportBreakdown')}
                  </button>
                </>
              )}
            </div>
            {/* Confirm/Reopen Buttons for Employee Verification Stage */}
            {canShowConfirmReopen && !isAlreadyConfirmed && (
              <div className="flex flex-col gap-2 w-full md:w-2/3 mt-4">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={isConfirming}
                    className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isConfirming ? "Confirming..." : "Confirm (Asset Fixed)"}
                  </button>
                  <button
                    type="button"
                    onClick={handleReopen}
                    disabled={isReopening || !reopenNotes.trim()}
                    className="px-6 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReopening ? "Reopening..." : "Reopen (Still Not Working)"}
                  </button>
                </div>
                <textarea
                  className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-400"
                  placeholder="Enter reason/notes for reopening (required)"
                  value={reopenNotes}
                  onChange={e => setReopenNotes(e.target.value)}
                  rows={2}
                  disabled={isReopening}
                  required
                />
                <span className="text-xs text-gray-500">Notes required only for Reopen.</span>
              </div>
            )}
            {isAlreadyConfirmed && (
              <div className="mt-4 text-green-700 font-semibold">Breakdown already confirmed. No further action possible.</div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BreakdownDetails2;

