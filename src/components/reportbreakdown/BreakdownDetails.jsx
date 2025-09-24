import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";
import EnhancedDropdown from "../ui/EnhancedDropdown";
import { useLanguage } from "../../contexts/LanguageContext";



const BreakdownDetails = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthStore();
  const { t } = useLanguage();
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
        console.warn(t('breakdownDetails.failedToFetchReasonCodes'));
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
        console.warn(t('breakdownDetails.failedToFetchUpcomingMaintenanceDate'), err);
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
    if (!decisionCode) {
      toast.error(t('breakdownDetails.pleaseSelectDecisionCode'));
      return;
    }
    if (!priority) {
      toast.error(t('breakdownDetails.pleaseSelectPriority'));
      return;
    }

    // Validate breakdown code exists in reason codes
    const selectedReasonCode = reasonCodes.find(rc => rc.id === brCode || rc.atbrrc_id === brCode);
    if (!selectedReasonCode) {
      toast.error(t('breakdownDetails.selectedBreakdownCodeInvalid'));
      return;
    }

    // Validate decision code is valid
    const validDecisionCodes = ['BF01', 'BF02', 'BF03'];
    if (!validDecisionCodes.includes(decisionCode)) {
      toast.error(t('breakdownDetails.invalidDecisionCode'));
      return;
    }

    // Validate priority is valid for the selected decision code
    const validPriorities = {
      'BF01': ['High', 'Very High'],
      'BF02': ['High', 'Very High'],
      'BF03': ['Medium', 'Low']
    };
    
    if (!validPriorities[decisionCode].includes(priority)) {
      toast.error(t('breakdownDetails.invalidPriorityForDecisionCode', { decisionCode }));
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
        decision_code: decisionCode
      };

      // Validate payload structure
      if (!payload.asset_id || !payload.atbrrc_id || !payload.reported_by || !payload.description || !payload.decision_code) {
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
          navigate("/report-breakdown");
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
                  options={reasonCodes.map((c) => ({
                    value: c.id || c.atbrrc_id,
                    label: c.text || c.name || c.description || c.code || c.id,
                    description: c.description || ""
                  }))}
                  value={brCode}
                  onChange={setBrCode}
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

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#0E2F4B] mb-4">
              {t('breakdownDetails.maintenancePlanning')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('breakdownDetails.decisionCode')} *
                </label>
                                                 <EnhancedDropdown
                  options={[
                    {
                      value: "BF01",
                      label: t('breakdownDetails.bf01Label'),
                      description: t('breakdownDetails.bf01Description')
                    },
                    {
                      value: "BF02", 
                      label: t('breakdownDetails.bf02Label'),
                      description: t('breakdownDetails.bf02Description')
                    },
                    {
                      value: "BF03",
                      label: t('breakdownDetails.bf03Label'), 
                      description: t('breakdownDetails.bf03Description')
                    }
                  ]}
                  value={decisionCode}
                  onChange={handleDecisionCodeChange}
                  placeholder={t('breakdownDetails.selectDecisionCode')}
                  disabled={isReadOnly}
                  required
                />
                <p className="text-xs text-gray-500">
                  {t('breakdownDetails.decisionCodeDescription')}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('breakdownDetails.priority')} *
                </label>
                                                                  <EnhancedDropdown
                  options={
                    (decisionCode === "BF01" || decisionCode === "BF02") 
                      ? [
                          { value: "High", label: t('breakdownDetails.highPriority'), description: t('breakdownDetails.highPriorityDescription') },
                          { value: "Very High", label: t('breakdownDetails.veryHighPriority'), description: t('breakdownDetails.veryHighPriorityDescription') }
                        ]
                      : decisionCode === "BF03"
                      ? [
                          { value: "Medium", label: t('breakdownDetails.mediumPriority'), description: t('breakdownDetails.mediumPriorityDescription') },
                          { value: "Low", label: t('breakdownDetails.lowPriority'), description: t('breakdownDetails.lowPriorityDescription') }
                        ]
                      : []
                  }
                  value={priority}
                  onChange={setPriority}
                  placeholder={!decisionCode ? t('breakdownDetails.selectDecisionCodeFirst') : t('breakdownDetails.selectPriority')}
                  disabled={isReadOnly || !decisionCode}
                  required
                />
                <p className="text-xs text-gray-500">
                  {t('breakdownDetails.priorityDescription')}
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  {t('breakdownDetails.upcomingMaintenanceDate')}
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
                    {t('breakdownDetails.noMaintenanceScheduled')}
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {t('breakdownDetails.upcomingMaintenanceDescription')}
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
        </form>
      </div>
    </div>
  );
};

export default BreakdownDetails;
