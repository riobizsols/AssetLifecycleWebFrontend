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
    navigate("/reports-view");
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow p-6">
        {(selectedAsset || existingBreakdown) && (
          <div className="mb-6 text-sm text-gray-700">
            <div className="font-semibold mb-2">Selected Asset</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <span className="text-gray-500">Asset ID:</span> {assetId}
              </div>
              <div>
                <span className="text-gray-500">Type:</span>{" "}
                {selectedAsset?.text ||
                  existingBreakdown?.asset_type_name ||
                  "-"}
              </div>
              <div>
                <span className="text-gray-500">Name:</span>{" "}
                {selectedAsset?.description ||
                  existingBreakdown?.asset_name ||
                  "-"}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Breakdown Code (BR Code)
              </label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
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
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Create Maintenance
              </label>
              <select
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                value={createMaintenance}
                onChange={(e) => setCreateMaintenance(e.target.value)}
                disabled={isReadOnly}
              >
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded min-h-[120px]"
              placeholder="Describe the issue, symptoms, and observations"
              disabled={isReadOnly}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reported By Type
              </label>
              <div className="px-3 py-2 text-sm border rounded bg-gray-50">
                {assetTypeDetails?.assignment_type || "Loading..."}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upcoming Maintenance Date
              </label>
              <input
                type="date"
                value={upcomingMaintenanceDate}
                onChange={(e) => setUpcomingMaintenanceDate(e.target.value)}
                className="border px-3 py-2 text-sm w-full bg-white text-black focus:outline-none rounded"
                disabled
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm hover:bg-gray-300"
            >
              Back
            </button>
            {!isReadOnly && (
              <button
                type="submit"
                className="bg-[#0E2F4B] text-white px-4 py-2 rounded text-sm"
              >
                Create Breakdown
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default BreakdownDetails;
