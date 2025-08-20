import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useAuthStore } from "../../store/useAuthStore";
import API from "../../lib/axios";

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
  const [createMaintenance, setCreateMaintenance] = useState("Yes");
  const [upcomingMaintenanceDate, setUpcomingMaintenanceDate] = useState("");
  const [assetTypeDetails, setAssetTypeDetails] = useState(null);

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
      if (existingBreakdown.create_maintenance !== undefined) {
        setCreateMaintenance(
          existingBreakdown.create_maintenance ? "Yes" : "No"
        );
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
        const res = await API.get(`/maintenance-schedules/asset/${assetId}`);
        const wf = res.data?.workflow_schedules || [];
        const reg = res.data?.maintenance_schedules || [];
        const extractDate = (s) =>
          s.pl_sch_date ||
          s.planned_schedule_date ||
          s.plannedDate ||
          s.planned_date;
        const dates = [
          ...wf.map(extractDate).filter(Boolean),
          ...reg.map(extractDate).filter(Boolean),
        ]
          .map((d) => new Date(d))
          .filter((d) => !isNaN(d));
        if (dates.length) {
          const min = new Date(Math.min(...dates));
          const yyyy = min.getFullYear();
          const mm = String(min.getMonth() + 1).padStart(2, "0");
          const dd = String(min.getDate()).padStart(2, "0");
          setUpcomingMaintenanceDate(`${yyyy}-${mm}-${dd}`);
        }
      } catch (err) {
        console.warn("Failed to fetch upcoming maintenance");
      }
    };
    fetchUpcomingMaintenance();
  }, [assetId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    // Submit payload stub
    const payload = {
      asset_id: assetId,
      br_code: brCode,
      description,
      reported_by_type: reportedByType,
      reported_by_dept_id:
        reportedByType === "Department" ? reportedByDeptId : null,
      reported_by_user_id: reportedByType === "User" ? reportedByUserId : null,
      create_maintenance: createMaintenance === "Yes",
      upcoming_maintenance_date: upcomingMaintenanceDate,
    };
    console.log("Create breakdown payload", payload);
    toast.success("Breakdown draft created");
    navigate("/report-breakdown");
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
                  Status
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 mr-2"></div>
                  <span className="text-base font-medium text-gray-900">
                    Breakdown Reported
                  </span>
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
                <div className="relative">
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all appearance-none"
                    value={brCode}
                    onChange={(e) => setBrCode(e.target.value)}
                    disabled={isReadOnly}
                    required
                  >
                    <option value="">Select code</option>
                    {reasonCodes.map((c) => (
                      <option key={c.code || c.id} value={c.code || c.id}>
                        {c.text || c.name || c.description || c.code}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Reported By Type
                </label>
                <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <span className="text-gray-800">
                    {assetTypeDetails?.assignment_type || "Loading..."}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all min-h-[120px]"
                placeholder="Describe the issue, symptoms, and observations in detail..."
                disabled={isReadOnly}
                required
              />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-[#0E2F4B] mb-4">
              Maintenance Planning
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Create Maintenance
                </label>
                <div className="relative">
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all appearance-none"
                    value={createMaintenance}
                    onChange={(e) => setCreateMaintenance(e.target.value)}
                    disabled={isReadOnly}
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Upcoming Maintenance Date
                </label>
                <input
                  type="date"
                  value={upcomingMaintenanceDate}
                  onChange={(e) => setUpcomingMaintenanceDate(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-800 focus:ring-2 focus:ring-blue-100 focus:border-blue-300 focus:outline-none transition-all"
                  disabled
                />
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
              <button
                type="submit"
                className="px-6 py-2.5 rounded-lg bg-[#0E2F4B] text-white font-medium hover:bg-[#1a4a76] transition-all focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Report Breakdown
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BreakdownDetails;
