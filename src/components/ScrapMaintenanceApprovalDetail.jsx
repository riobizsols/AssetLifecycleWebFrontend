import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

// Keep the same look & feel as MaintenanceApprovalDetail
const getStepIcon = (status) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-white" />;
    case "current":
      return <Clock className="w-5 h-5 text-white" />;
    default:
      return <Clock className="w-5 h-5 text-white" />;
  }
};

const getStepColor = (status, title) => {
  if (title === "Approval Initiated") return "bg-[#2196F3]";
  switch (status) {
    case "completed":
      return "bg-[#8BC34A]";
    case "approved":
      return "bg-[#2196F3]";
    case "current":
      return "bg-[#8BC34A]";
    case "rejected":
      return "bg-red-500";
    case "pending":
    default:
      return "bg-gray-400";
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
};

const formatTime = (dateString) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const ReadOnlyInput = ({ label, value, type = "text", className = "" }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
    <input
      type={type}
      value={value ?? ""}
      readOnly
      className={`w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 text-gray-700 cursor-not-allowed focus:outline-none ${className}`}
    />
  </div>
);

const ScrapMaintenanceApprovalDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context") || location.state?.context || "SCRAPMAINTENANCEAPPROVAL";

  const { user } = useAuthStore();
  const userRoles = user?.roles || [];
  const userRoleIds = userRoles.map((r) => r.job_role_id);

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [activeTab, setActiveTab] = useState("approval");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/scrap-maintenance/workflow/${id}`);
      if (!res.data?.success) {
        toast.error(res.data?.message || "Failed to load scrap workflow");
        setDetail(null);
        return;
      }
      setDetail({
        header: res.data.header,
        assets: res.data.assets || [],
        workflowSteps: res.data.workflowSteps || [],
      });
    } catch (e) {
      console.error("Failed to load scrap workflow detail", e);
      toast.error("Failed to load scrap workflow detail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const steps = useMemo(() => {
    if (!detail?.header) return [];

    const initDate = formatDate(detail.header.created_on);
    const initTime = formatTime(detail.header.created_on);

    const out = [
      {
        id: "init",
        title: "Approval Initiated",
        status: "completed",
        description: `Initiated by ${detail.header.created_by || "System"}`,
        date: initDate,
        time: initTime,
        role: null,
        notes: null,
      },
    ];

    const wfRows = [...(detail.workflowSteps || [])].sort((a, b) => {
      const seqDiff = Number(a.seq || 0) - Number(b.seq || 0);
      if (seqDiff !== 0) return seqDiff;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    for (const r of wfRows) {
      let status = "pending";
      if (r.status === "AP") status = "current";
      if (r.status === "UA") status = "approved";
      if (r.status === "UR") status = "rejected";

      const canThisUserApprove = userRoleIds.includes(r.job_role_id);
      const roleName = r.job_role_name || r.job_role_id || "Role";

      const description =
        status === "current"
          ? canThisUserApprove
            ? "Awaiting Approval from You"
            : `Awaiting Approval from ${roleName}`
          : status === "approved"
            ? `Approved by ${roleName}`
            : status === "rejected"
              ? `Rejected by ${roleName}`
              : `Awaiting ${roleName}`;

      const date = r.changed_on ? formatDate(r.changed_on) : "";
      const time = r.changed_on ? formatTime(r.changed_on) : "";

      out.push({
        id: r.id,
        title: roleName,
        status,
        description,
        date,
        time,
        role: { id: r.job_role_id, name: roleName },
        notes: r.notes || null,
      });
    }

    return out;
  }, [detail, userRoleIds]);

  const currentActionSteps = useMemo(() => steps.filter((s) => s.status === "current"), [steps]);

  const isCurrentActionUser = useMemo(() => {
    return currentActionSteps.some((s) => (s.role?.id ? userRoleIds.includes(s.role.id) : false));
  }, [currentActionSteps, userRoleIds]);

  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    setIsSubmitting(true);
    let toastId = null;
    try {
      toastId = toast.loading("Approving scrap...", { duration: Infinity });
      const res = await API.post(`/scrap-maintenance/${id}/approve`, {
        note: approveNote,
        empIntId: user?.emp_int_id,
      });
      if (toastId) toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success(res.data?.message || "Approved");
        setShowApproveModal(false);
        setApproveNote("");
        await fetchDetail();
      } else {
        toast.error(res.data?.message || "Failed to approve");
      }
    } catch (e) {
      if (toastId) toast.dismiss(toastId);
      toast.error(e.response?.data?.message || "Failed to approve");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setIsSubmitting(true);
    let toastId = null;
    try {
      toastId = toast.loading("Rejecting scrap...", { duration: Infinity });
      const res = await API.post(`/scrap-maintenance/${id}/reject`, {
        reason: rejectNote,
        empIntId: user?.emp_int_id,
      });
      if (toastId) toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success(res.data?.message || "Rejected");
        setShowRejectModal(false);
        setRejectNote("");
        await fetchDetail();
      } else {
        toast.error(res.data?.message || "Failed to reject");
      }
    } catch (e) {
      if (toastId) toast.dismiss(toastId);
      toast.error(e.response?.data?.message || "Failed to reject");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E2F4B]" />
      </div>
    );
  }

  if (!detail?.header) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] p-6">
        <div className="text-red-600 font-medium">Scrap workflow not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {detail.header.asset_group_name || detail.header.assetgroup_id || "Scrap Maintenance Approval"}
            </h2>
            <div className="text-xs text-gray-500 mt-1">Context: {context}</div>
          </div>

          {/* Progress Steps (same UI as maintenance approval) */}
          <div className="mb-8">
            <div className="flex items-center">
              {steps.map((step) => (
                <div key={step.id} className={`arrow-step ${getStepColor(step.status, step.title)} text-white`}>
                  <div className="flex items-center space-x-2">
                    {getStepIcon(step.status)}
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex mt-2">
              {steps.map((step) => (
                <div key={step.id} className="flex-1 px-3">
                  <p className="text-sm text-gray-700">{step.description}</p>
                  {step.notes && step.status === "rejected" && (
                    <p className="text-xs text-red-600 mt-1">
                      <strong>Reason:</strong> {step.notes}
                    </p>
                  )}
                  {step.notes && step.status === "approved" && (
                    <p className="text-xs text-green-600 mt-1">
                      <strong>Notes:</strong> {step.notes}
                    </p>
                  )}
                  {step.date && (step.status === "completed" || step.status === "approved" || step.status === "rejected") && (
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="w-3.5 h-3.5 mr-1" style={{ color: "#FFC107" }} />
                      <span>
                        {step.date} • {step.time}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tabs (same style as maintenance) */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {["approval", "asset"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab
                      ? "border-[#0E2F4B] text-[#0E2F4B]"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {tab === "approval" ? "Approval Details" : "Asset Details"}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "approval" && (
              <div className="bg-white rounded shadow p-6 mb-8">
                <div className="grid grid-cols-5 gap-6 mb-6">
                  <ReadOnlyInput label="Alert Type" value="Scrap Maintenance" />
                  <ReadOnlyInput label="Created On" value={formatDate(detail.header.created_on)} />
                  <ReadOnlyInput label="Action By" value={currentActionSteps[0]?.role?.name || "Unassigned"} />
                  <ReadOnlyInput label="Scrap Sales" value={detail.header.is_scrap_sales === "Y" ? "Yes" : "No"} />
                  <ReadOnlyInput label="Asset Type" value={detail.header.asset_type_name || "-"} />
                  <ReadOnlyInput label="Group ID" value={detail.header.assetgroup_id || "-"} />
                  <ReadOnlyInput label="Group Name" value={detail.header.asset_group_name || "-"} />
                  <ReadOnlyInput label="Workflow ID" value={detail.header.wfscrap_h_id || "-"} />
                  <ReadOnlyInput label="Branch" value={detail.header.branch_code || "-"} />
                  <ReadOnlyInput label="Status" value={detail.header.header_status || "-"} />
                </div>
              </div>
            )}

            {activeTab === "asset" && (
              <div className="bg-white rounded shadow p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Assets in Group ({detail.assets.length})</h3>
                  <div className="mt-3">
                    {(() => {
                      const assetsToShow = showAllAssets ? detail.assets : detail.assets.slice(0, 4);
                      const hasMoreAssets = detail.assets.length > 4;
                      return (
                        <>
                          <div className="flex flex-wrap gap-2">
                            {assetsToShow.map((a) => (
                              <span
                                key={a.asset_id}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {a.asset_name || "N/A"}
                                {a.serial_number && <span className="ml-2 text-xs text-blue-600">({a.serial_number})</span>}
                              </span>
                            ))}
                          </div>
                          {hasMoreAssets && (
                            <button
                              onClick={() => setShowAllAssets(!showAllAssets)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              {showAllAssets ? "Show Less" : `Show ${detail.assets.length - 4} More`}
                            </button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border px-4 py-2 text-left text-xs font-semibold text-gray-700">Name</th>
                        <th className="border px-4 py-2 text-left text-xs font-semibold text-gray-700">Serial</th>
                        <th className="border px-4 py-2 text-left text-xs font-semibold text-gray-700">Current Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.assets.map((a) => (
                        <tr key={a.asset_id} className="border-t">
                          <td className="border px-4 py-2 text-sm">{a.asset_name}</td>
                          <td className="border px-4 py-2 text-sm">{a.serial_number}</td>
                          <td className="border px-4 py-2 text-sm">{a.current_status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 mt-8">
            {isCurrentActionUser && detail.header.header_status !== "CO" && detail.header.header_status !== "CA" && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#0a2339] transition-colors"
                  disabled={isSubmitting}
                >
                  Approve
                </button>
              </>
            )}

            {!isCurrentActionUser && (
              <div className="text-gray-500 text-sm italic">
                {currentActionSteps.length > 0 ? "Waiting for approval from the current approver role(s)." : "No action required from you."}
              </div>
            )}
          </div>

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-[500px]">
                <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                  <h3 className="text-lg font-semibold">Reject Scrap Request</h3>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                      !rejectNote.trim() && isSubmitting ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Please provide reason for rejection"
                  />
                  {!rejectNote.trim() && isSubmitting && <div className="text-red-500 text-xs mt-1">Note is required to reject</div>}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      disabled={!rejectNote.trim() || isSubmitting}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Approve Modal */}
          {showApproveModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-[500px]">
                <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                  <h3 className="text-lg font-semibold">Approve Scrap Request</h3>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Approval note <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                      !approveNote.trim() && isSubmitting ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Please provide approval note"
                  />
                  {!approveNote.trim() && isSubmitting && <div className="text-red-500 text-xs mt-1">Note is required to approve</div>}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowApproveModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#0a2339] transition-colors"
                      disabled={!approveNote.trim() || isSubmitting}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScrapMaintenanceApprovalDetail;

