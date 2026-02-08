import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";
import EnhancedDropdown from "../ui/EnhancedDropdown";
import { useLanguage } from "../../contexts/LanguageContext";
import { useNavigation } from "../../hooks/useNavigation";

const EditBreakdownReport = () => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const breakdown = state?.breakdown;
  const hideDecisionCode = state?.hideDecisionCode === true;

  // Access control
  const { getAccessLevel } = useNavigation();
  const accessLevel = getAccessLevel("REPORTBREAKDOWN");
  const isReadOnly = accessLevel === "D";

  // Debug logging
  console.log("EditBreakdownReport - Access Level:", accessLevel);
  console.log("EditBreakdownReport - Is Read Only:", isReadOnly);

  const [reasonCodes, setReasonCodes] = useState([]);
  const [brCode, setBrCode] = useState("");
  const [description, setDescription] = useState("");
  const [decisionCode, setDecisionCode] = useState("");
  const [upcomingMaintenanceDate, setUpcomingMaintenanceDate] = useState("");
  const [assetTypeDetails, setAssetTypeDetails] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create new reason code modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReasonCodeText, setNewReasonCodeText] = useState("");
  const [isCreatingReasonCode, setIsCreatingReasonCode] = useState(false);

  const assetId = breakdown?.asset_id || "";
  const [assetTypeId, setAssetTypeId] = useState(
    breakdown?.asset_type_id || "",
  );

  useEffect(() => {
    if (breakdown) {
      console.log("Breakdown data received:", breakdown);
      // Populate form with existing breakdown data
      setBrCode(breakdown.atbrrc_id || "");
      setDescription(breakdown.description || "");
      setDecisionCode(breakdown.decision_code || "");

      // Set asset type ID if available in breakdown
      if (breakdown.asset_type_id) {
        console.log("Asset type ID from breakdown:", breakdown.asset_type_id);
        setAssetTypeId(breakdown.asset_type_id);
      } else {
        console.log("No asset_type_id in breakdown data");
      }
    }
  }, [breakdown]);

  // Fetch asset type ID from asset if not available in breakdown
  useEffect(() => {
    const fetchAssetTypeId = async () => {
      if (assetId && !assetTypeId) {
        try {
          console.log("Fetching asset type ID for asset:", assetId);
          const res = await API.get(`/assets/${assetId}`);
          console.log("Asset response:", res.data);
          if (res.data?.asset_type_id) {
            console.log("Setting asset type ID:", res.data.asset_type_id);
            setAssetTypeId(res.data.asset_type_id);
          }
        } catch (err) {
          console.error("Failed to fetch asset type ID:", err);
        }
      }
    };
    fetchAssetTypeId();
  }, [assetId, assetTypeId]);

  useEffect(() => {
    // Fetch asset type details when asset type changes
    const fetchAssetTypeDetails = async () => {
      if (assetTypeId) {
        try {
          const res = await API.get(`/dept-assets/asset-types/${assetTypeId}`);
          setAssetTypeDetails(res.data);
        } catch (err) {
          console.error(
            t("breakdownDetails.failedToFetchAssetTypeDetails"),
            err,
          );
        }
      }
    };
    fetchAssetTypeDetails();
  }, [assetTypeId]);

  const fetchReasonCodes = async () => {
    if (!assetTypeId) {
      console.warn(
        "assetTypeId not available, skipping reason codes fetch. Current assetTypeId:",
        assetTypeId,
        "assetId:",
        assetId,
      );
      setReasonCodes([]);
      return;
    }
    try {
      console.log("Fetching reason codes for asset type:", assetTypeId);
      const res = await API.get("/reportbreakdown/reason-codes", {
        params: {
          asset_type_id: assetTypeId,
          org_id: user?.org_id,
        },
      });
      console.log("Reason codes API response:", res.data);
      const arr = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      console.log("Parsed reason codes array:", arr);

      // Deduplicate by id (atbrrc_id) to ensure unique entries
      const uniqueCodes = arr.reduce((acc, code) => {
        if (!acc.find((item) => item.id === code.id)) {
          acc.push(code);
        }
        return acc;
      }, []);

      console.log("Deduplicated reason codes:", uniqueCodes);
      setReasonCodes(uniqueCodes);
    } catch (err) {
      console.error(t("breakdownDetails.failedToFetchReasonCodes"), err);
      toast.error(t("breakdownDetails.failedToFetchReasonCodes"));
      setReasonCodes([]);
    }
  };

  useEffect(() => {
    fetchReasonCodes();
  }, [user?.org_id, assetTypeId]);

  useEffect(() => {
    // Fetch upcoming maintenance date
    const fetchUpcomingMaintenance = async () => {
      if (assetId) {
        try {
          const res = await API.get(
            `/reportbreakdown/upcoming-maintenance/${assetId}`,
          );
          if (res.data?.data?.upcoming_maintenance_date) {
            setUpcomingMaintenanceDate(res.data.data.upcoming_maintenance_date);
          }
        } catch (err) {
          console.error(
            t("breakdownDetails.failedToFetchUpcomingMaintenanceDate"),
            err,
          );
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
      if (!hideDecisionCode && !decisionCode) {
        toast.error(t("breakdownDetails.pleaseSelectDecisionCode"));
        return;
      }

      const breakdownData = {
        atbrrc_id: brCode,
        description,
        ...(hideDecisionCode ? {} : { decision_code: decisionCode }),
      };

      await API.put(
        `/reportbreakdown/update/${breakdown.abr_id}`,
        breakdownData,
      );

      toast.success(t("breakdownDetails.breakdownReportUpdatedSuccessfully"));
      navigate("/report-breakdown");
    } catch (err) {
      console.error(t("breakdownDetails.failedToUpdateBreakdownReport"), err);
      toast.error(
        err.response?.data?.error ||
          t("breakdownDetails.failedToUpdateBreakdownReport"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle create new reason code
  const handleCreateNewReasonCode = async () => {
    if (!newReasonCodeText.trim()) {
      toast.error("Please enter a breakdown reason code");
      return;
    }

    if (!assetTypeId) {
      toast.error("Asset type is required to create a reason code");
      return;
    }

    setIsCreatingReasonCode(true);
    try {
      const res = await API.post("/breakdown-reason-codes", {
        asset_type_id: assetTypeId,
        text: newReasonCodeText.trim(),
      });

      if (res.data && res.data.success) {
        toast.success("Breakdown reason code created successfully");
        setNewReasonCodeText("");
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
      console.error("Error creating breakdown reason code:", error);
      toast.error(
        error.response?.data?.message ||
          "Failed to create breakdown reason code",
      );
    } finally {
      setIsCreatingReasonCode(false);
    }
  };

  // Handle dropdown change - check if "Create New" was selected
  const handleBrCodeChange = (value) => {
    if (value === "CREATE_NEW") {
      setShowCreateModal(true);
    } else {
      setBrCode(value);
    }
  };

  const handleCancel = () => {
    navigate("/report-breakdown");
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return dateString; // Return original string if formatting fails
    }
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return "";

    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = date - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return t("breakdownDetails.today");
      } else if (diffDays === 1) {
        return t("breakdownDetails.tomorrow");
      } else if (diffDays === -1) {
        return t("breakdownDetails.yesterday");
      } else if (diffDays > 0) {
        return t("breakdownDetails.inDays", { days: diffDays });
      } else {
        return t("breakdownDetails.daysAgo", { days: Math.abs(diffDays) });
      }
    } catch (error) {
      console.error("Error calculating relative time:", error);
      return "";
    }
  };

  const decisionCodeOptions = [
    {
      value: "BF01",
      label: t("breakdownDetails.bf01Label"),
      description: t("breakdownDetails.bf01Description"),
    },
    {
      value: "BF02",
      label: t("breakdownDetails.bf02Label"),
      description: t("breakdownDetails.bf02Description"),
    },
    {
      value: "BF03",
      label: t("breakdownDetails.bf03Label"),
      description: t("breakdownDetails.bf03Description"),
    },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("breakdownDetails.editTitle")}
          </h1>
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            {t("breakdownDetails.cancel")}
          </button>
        </div>

        {/* Create New Reason Code Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-lg border-b-4 border-[#FFC107]">
                <h2 className="text-xl font-semibold">
                  Create New Breakdown Reason Code
                </h2>
              </div>

              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Breakdown Reason Code{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newReasonCodeText}
                    onChange={(e) => setNewReasonCodeText(e.target.value)}
                    placeholder="Enter breakdown reason code (e.g., Power Supply Damage, Screen Damage)"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
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
                      setNewReasonCodeText("");
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
                    {isCreatingReasonCode ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Information */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {t("breakdownDetails.assetDetails")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("breakdownDetails.assetId")}
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
                  {t("breakdownDetails.breakdownId")}
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
            <h3 className="text-lg font-semibold text-gray-900">
              {t("breakdownDetails.breakdownInformation")}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("breakdownDetails.breakdownCode")} *
                </label>
                <EnhancedDropdown
                  options={[
                    ...reasonCodes.map((code) => ({
                      value: code.id || code.atbrrc_id,
                      label: `${code.id || code.atbrrc_id} - ${code.text || code.name || code.description || code.code || code.id}`,
                      description: code.description || "",
                    })),
                    {
                      value: "CREATE_NEW",
                      label: "+ Create New",
                      description: "Create a new breakdown reason code",
                      isCreateNew: true,
                    },
                  ]}
                  value={brCode}
                  onChange={handleBrCodeChange}
                  placeholder={t("breakdownDetails.selectBreakdownCode")}
                  required
                  disabled={isReadOnly}
                />
              </div>

              {!hideDecisionCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("breakdownDetails.decisionCode")} *
                  </label>
                  <EnhancedDropdown
                    options={decisionCodeOptions}
                    value={decisionCode}
                    onChange={setDecisionCode}
                    placeholder={t("breakdownDetails.selectDecisionCode")}
                    required
                    disabled={isReadOnly}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {t("breakdownDetails.decisionCodeDescription")}
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("breakdownDetails.description")} *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? "bg-gray-50 text-gray-600 cursor-not-allowed" : ""}`}
                rows={3}
                placeholder={t("breakdownDetails.enterBreakdownDescription")}
                required
              />
            </div>
          </div>

          {/* Upcoming Maintenance Info */}
          {upcomingMaintenanceDate && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("breakdownDetails.maintenancePlanning")}
              </h3>
              <div className="text-sm text-gray-600">
                <p>
                  {t("breakdownDetails.nextScheduledMaintenance", {
                    date: formatDate(upcomingMaintenanceDate),
                  })}
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
              {t("breakdownDetails.cancel")}
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                disabled={
                  isSubmitting ||
                  !brCode ||
                  !description ||
                  (!hideDecisionCode && !decisionCode)
                }
                className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting
                  ? t("breakdownDetails.updating")
                  : t("breakdownDetails.updateBreakdownReport")}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBreakdownReport;
