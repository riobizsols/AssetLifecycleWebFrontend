import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import ChecklistModal from "./ChecklistModal";
import { ClipboardCheck } from "lucide-react";
import API from "../lib/axios";

const mockApiResponse = {
  steps: [
    {
      id: 1,
      title: "Approval Initiated",
      status: "completed",
      description: "Initiated by Billy Morganey",
      date: "18/02/2025",
      time: "10:15",
      user: { id: "u1", name: "Billy Morganey" },
    },
    {
      id: 2,
      title: "Process",
      status: "current",
      description: "Approved by Sarah Morgan",
      date: "",
      time: "",
      user: { id: "u2", name: "Sarah Morgan" },
    },
    {
      id: 3,
      title: "Inprogress",
      status: "pending",
      description: "Awaiting Approval from You",
      date: "",
      time: "",
      user: { id: "u3", name: "You" },
    },
    {
      id: 4,
      title: "Inprogress",
      status: "pending",
      description: "Awaiting Approval from Stefan",
      date: "",
      time: "",
      user: { id: "u4", name: "Stefan" },
    },
  ],
  currentUserId: "u2"
};

const getStepIcon = (status) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-5 h-5 text-white" />;
    case 'current':
      return <Clock className="w-5 h-5 text-white" />;
    default:
      return <Clock className="w-5 h-5 text-white" />;
  }
};

const getStepColor = (status) => {
  switch (status) {
    case 'completed':
      return 'bg-[#8BC34A]';
    case 'current':
      return 'bg-[#2196F3]';
    default:
      return 'bg-gray-400';
  }
};

// Helper for rendering a read-only input
const ReadOnlyInput = ({ label, value, type = "text" }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      readOnly
      className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 text-gray-700 cursor-not-allowed focus:outline-none"
    />
  </div>
);

const vendorDetails = {
  vendorName: "VendorX",
  vendorId: "V001",
  contact: "9876543210",
  email: "vendorx@email.com",
  address: "123, Main Street, City",
};

const assetTabDetails = {
  assetType: "Hardware",
  assetId: "1234553",
  serialNumber: "SN-987654",
  model: "Model X",
  brand: "Brand Y",
  purchaseDate: "01/01/2024",
};

const historyDetails = {
  lastMaintenance: "10/01/2024",
  lastMaintainedBy: "Sarah Morgan",
  status: "Completed",
  notes: "Routine check completed.",
};

const historyTable = [
  {
    date: "18/02/2025 10:15",
    action: "Request Initiated",
    actionType: "initiated",
    user: "Billy Morganey",
    notes: "Initial maintenance request created",
  },
  {
    date: "18/02/2025 11:11",
    action: "Approved",
    actionType: "approved",
    user: "Sarah Morgan",
    notes: "First level approval completed",
  },
  {
    date: "18/02/2025 11:15",
    action: "Pending",
    actionType: "pending",
    user: "System",
    notes: "Awaiting second level approval",
  },
];

const getActionColor = (type) => {
  switch (type) {
    case "approved":
      return "text-green-600 font-medium";
    case "pending":
      return "text-yellow-500 font-medium";
    case "initiated":
      return "text-blue-600 font-medium";
    default:
      return "text-gray-700";
  }
};

const MaintenanceApprovalDetail = () => {
  const { id } = useParams();
  const [maintenance, setMaintenance] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(""); // Simulate auth user
  const [activeTab, setActiveTab] = useState("approval");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Simulate current user (replace with real auth)
  useEffect(() => {
    setCurrentUserId("u2"); // Example: set from auth
  }, []);

  useEffect(() => {
    // Simulate API call to fetch maintenance by id
    setTimeout(() => {
      setMaintenance({ ...mockApiResponse, id });
      setSteps(mockApiResponse.steps);
    }, 300);
    // TODO: Replace above with real API call using id
  }, [id]);

  // Find the current step and user
  const currentStep = steps.find((step) => step.status === "current");
  const isCurrentApprover = currentStep && currentStep.user.id === currentUserId;
  const isRejected = steps.some((step) => step.status === "rejected");

  // Approve handler
  const handleApprove = async () => {
    setIsSubmitting(true);
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    // TODO: Call API to approve
    // await API.post(`/maintenance/${id}/approve`, { userId: currentUserId });
    // Simulate step update
    setSteps((prev) => prev.map((step) =>
      step.status === "current"
        ? { ...step, status: "completed", date: dateStr, time: timeStr }
        : step
    ));
    try {
      // Call API to update DB (replace endpoint as needed)
      await API.post(`/api/maintenance/${id}/approve`, {
        userId: currentUserId,
        date: dateStr,
        time: timeStr,
      });
    } catch (error) {
      alert("Failed to approve. Please try again.");
    }
    setIsSubmitting(false);
  };

  // Reject handler
  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setIsSubmitting(true);
    // TODO: Call API to reject
    // await API.post(`/maintenance/${id}/reject`, { userId: currentUserId, note: rejectNote });
    // Simulate rejection
    setSteps((prev) => prev.map((step) =>
      step.status === "current"
        ? { ...step, status: "rejected", note: rejectNote }
        : step
    ));
    setShowRejectModal(false);
    setRejectNote("");
    setIsSubmitting(false);
  };

  // Mock data - replace with actual data from API
  const assetDetails = {
    assetType: "Hardware",
    assetId: "1234553",
    scheduledDate: "21/02/2025",
    vendorId: "V001",
    maintenanceType: "scheduled",
    department: "Hr",
    employee: "AF101 - Alvin",
    notes: "Slight crack on the bottom right",
    dynamicProperties: [
      { name: "Color", value: "Red" },
      { name: "Weight", value: "10kg" },
      { name: "Material", value: "Wood" },
    ],
  };
  // Mock approval details
  const approvalDetails = {
    alertType: "Maintenance Alert",
    alertDueOn: "20/02/2025",
    actionBy: "John Doe",
    cutoffDate: "19/02/2025",
    proposal: "Replace part X",
    vendor: "VendorX",
    assetType: assetDetails.assetType,
    assetId: assetDetails.assetId,
    notes: assetDetails.notes,
  };

  return (
    <div className="p-3 max-w-7xl mx-auto">
      <Card className="mb-8 min-h-[530px]">
        <CardContent className="p-0">
          {/* Themed Page Header */}
          <div className="bg-[#0E2F4B] text-white py-4 px-8 rounded-md border-b-4 border-[#FFC107] flex justify-center items-center">
            {/* <span className="text-2xl font-semibold text-center w-full">Maintenance Approval</span> */}
          </div>
          <div className="p-6">
            {/* Progress Steps with Details */}
            <div className="mb-8">
              <div className="flex items-center">
                {steps.map((step, index) => (
                  <div key={step.id} className={`arrow-step ${getStepColor(step.status)} text-white`}>
                    <div className="flex items-center space-x-2">
                      {getStepIcon(step.status)}
                      <span className="font-medium text-sm">{step.title}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Details directly under steps */}
              <div className="flex mt-2">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex-1 px-3">
                    <p className="text-sm text-gray-700">{step.description}</p>
                    {step.date && (
                      <div className="flex items-center text-xs text-gray-500 mt-1">
                        <Clock className="w-3.5 h-3.5 mr-1" style={{ color: '#FFC107' }} />
                        <span>{step.date} • {step.time}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                {['approval', 'vendor', 'asset', 'history'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab
                        ? 'border-[#0E2F4B] text-[#0E2F4B]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)} Details
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'approval' && (
                <>
                  {/* Approval Details Section */}
                  <div className="bg-white rounded shadow p-6 mb-8">
                    <div className="grid grid-cols-5 gap-6 mb-6">
                      <ReadOnlyInput label="Alert Type" value={approvalDetails.alertType || "-"} />
                      <ReadOnlyInput label="Alert Due On" value={approvalDetails.alertDueOn || "-"} />
                      <ReadOnlyInput label="Action By" value={approvalDetails.actionBy || "-"} />
                      <ReadOnlyInput label="Cut-off Date" value={approvalDetails.cutoffDate || "-"} />
                      <ReadOnlyInput label="Proposal" value={approvalDetails.proposal || "-"} />
                      <ReadOnlyInput label="Vendor" value={approvalDetails.vendor || "-"} />
                      <ReadOnlyInput label="Asset Type" value={approvalDetails.assetType || "-"} />
                      <ReadOnlyInput label="Asset ID" value={approvalDetails.assetId || "-"} />
                      <ReadOnlyInput label="Notes" value={approvalDetails.notes || "-"} />
                      <div className="flex flex-col justify-end">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Checklist</label>
                        <button
                          onClick={() => setShowChecklist(true)}
                          className="w-full px-3 py-2 border border-gray-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition"
                          title="View and complete the asset maintenance checklist"
                          type="button"
                        >
                          <ClipboardCheck className="w-5 h-5" />
                          View Checklist
                        </button>
                      </div>
                    </div>
                  </div>
                  <ChecklistModal
                    assetType={approvalDetails.assetType}
                    open={showChecklist}
                    onClose={() => setShowChecklist(false)}
                  />
                </>
              )}
              {activeTab === 'vendor' && (
                <div className="bg-white rounded shadow p-6">
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="Vendor Name" value={vendorDetails.vendorName || "-"} />
                    <ReadOnlyInput label="Company" value={vendorDetails.company || "-"} />
                    <ReadOnlyInput label="Email" value={vendorDetails.email || "-"} />
                    <ReadOnlyInput label="Contact Number" value={vendorDetails.contact || "-"} />
                    <ReadOnlyInput label="GST Number" value={vendorDetails.gst_number || "-"} />
                  </div>
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="CIN Number" value={vendorDetails.cin_number || "-"} />
                    <ReadOnlyInput label="Address Line 1" value={vendorDetails.address || "-"} />
                    <ReadOnlyInput label="City" value={vendorDetails.city || "-"} />
                    <ReadOnlyInput label="State" value={vendorDetails.state || "-"} />
                    <ReadOnlyInput label="Pincode" value={vendorDetails.pincode || "-"} />
                  </div>
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="Contact Person Name" value={vendorDetails.contact_person_name || "-"} />
                    <ReadOnlyInput label="Contact Person Email" value={vendorDetails.contact_person_email || "-"} />
                  </div>
                  <div className="flex gap-8 mt-4">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!vendorDetails.product_supply} readOnly className="accent-[#0E2F4B] w-5 h-5" />
                      <span className="text-gray-700">Product Supply</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={!!vendorDetails.service_supply} readOnly className="accent-[#0E2F4B] w-5 h-5" />
                      <span className="text-gray-700">Service Supply</span>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'asset' && (
                <div className="bg-white rounded shadow p-6">
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="Asset Type" value={assetDetails.assetType || "-"} />
                    <ReadOnlyInput label="Serial Number" value={assetDetails.serialNumber || "-"} />
                    <ReadOnlyInput label="Maintenance Schedule" value={assetDetails.maintenanceSchedule || "-"} />
                    <ReadOnlyInput label="Expiry Date" value={assetDetails.expiryDate || "-"} />
                    <ReadOnlyInput label="Warranty Period" value={assetDetails.warrantyPeriod || "-"} />
                  </div>
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="Purchase Date" value={assetDetails.purchaseDate || "-"} />
                    <ReadOnlyInput label="Purchase Cost" value={assetDetails.purchaseCost || "-"} />
                    <ReadOnlyInput label="Purchase By" value={assetDetails.purchaseBy || "-"} />
                    <ReadOnlyInput label="Vendor Brand" value={assetDetails.vendorBrand || "-"} />
                    <ReadOnlyInput label="Vendor Model" value={assetDetails.vendorModel || "-"} />
                  </div>
                  <div className="grid grid-cols-5 gap-6 mb-6">
                    <ReadOnlyInput label="Product Supply" value={assetDetails.productSupply ? "Yes" : "No"} />
                    <ReadOnlyInput label="Service Supply" value={assetDetails.serviceSupply ? "Yes" : "No"} />
                    <ReadOnlyInput label="Vendor ID" value={assetDetails.vendorId || "-"} />
                    <ReadOnlyInput label="Parent Asset" value={assetDetails.parentAsset || "-"} />
                    <ReadOnlyInput label="Status" value={assetDetails.status || "-"} />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm mb-1 font-medium">Description</label>
                    <textarea
                      value={assetDetails.description || "-"}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                      rows={3}
                    />
                  </div>
                  {/* Dynamic Properties Section */}
                  <div className="mb-6">
                    <label className="block text-sm mb-1 font-medium">Other Details</label>
                    {assetDetails.dynamicProperties && assetDetails.dynamicProperties.length > 0 ? (
                      <div className="grid grid-cols-5 gap-6">
                        {assetDetails.dynamicProperties.map((prop) => (
                          <div key={prop.name}>
                            <label className="block text-sm mb-1 font-medium">{prop.name}</label>
                            <input
                              value={prop.value}
                              readOnly
                              className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">No dynamic properties for this asset.</div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === 'history' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Date</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Action</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">User</th>
                        <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyTable.map((row, idx) => (
                        <tr key={idx} className="bg-white border border-gray-200 rounded-md shadow-sm">
                          <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.date}</td>
                          <td className={`px-6 py-3 text-sm whitespace-nowrap ${getActionColor(row.actionType)}`}>{row.action}</td>
                          <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.user}</td>
                          <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              {isCurrentApprover && !isRejected && (
                <>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#0a2339] transition-colors"
                    disabled={isSubmitting}
                  >
                    Approve
                  </button>
                </>
              )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-[500px]">
                  <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                    <h3 className="text-lg font-semibold">Reject Maintenance Request</h3>
                  </div>
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                        !rejectNote.trim() && isSubmitting ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Please provide a reason for rejection..."
                    />
                    {!rejectNote.trim() && isSubmitting && (
                      <div className="text-red-500 text-xs mt-1">Note is required to reject.</div>
                    )}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceApprovalDetail;