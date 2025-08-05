import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import ChecklistModal from "./ChecklistModal";
import { ClipboardCheck } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

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

const getStepColor = (status, title) => {
  // Approval Initiated step is always blue
  if (title === 'Approval Initiated') {
    return 'bg-[#2196F3]'; // Blue for Approval Initiated
  }
  
  switch (status) {
    case 'completed':
      return 'bg-[#8BC34A]'; // Green for current action user (In Progress)
    case 'approved':
      return 'bg-[#2196F3]'; // Blue for approved (Approved)
    case 'rejected':
      return 'bg-red-500'; // Red for rejected (Rejected)
    case 'pending':
      return 'bg-gray-400'; // Gray for awaiting (Awaiting)
    default:
      return 'bg-gray-400';
  }
};

// Helper for rendering a read-only input
const ReadOnlyInput = ({ label, value, type = "text", className = "" }) => (
  <div>
    <label className="block text-sm font-medium mb-1 text-gray-700">{label}</label>
    <input
      type={type}
      value={value}
      readOnly
      className={`w-full px-3 py-2 border border-gray-300 rounded text-sm bg-gray-100 text-gray-700 cursor-not-allowed focus:outline-none ${className}`}
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



const getActionColor = (type) => {
  switch (type) {
    case "approved":
      return "text-green-600 font-medium";
    case "rejected":
      return "text-red-600 font-medium";
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
  const { user } = useAuthStore();
  
  console.log("MaintenanceApprovalDetail component mounted");
  console.log("Asset ID from URL params:", id);
  console.log("User from auth store:", user);
  const [maintenance, setMaintenance] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(""); // Will be set from auth
  const [activeTab, setActiveTab] = useState("approval");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [approvalDetails, setApprovalDetails] = useState(null);
  const [loadingApprovalDetails, setLoadingApprovalDetails] = useState(false);
  const [assetDetails, setAssetDetails] = useState(null);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Set current user from auth store
  useEffect(() => {
    if (user && user.user_id) {
      setCurrentUserId(user.user_id);
    }
  }, [user]);

  // Fetch approval details from API
  useEffect(() => {
    const fetchApprovalDetails = async () => {
      if (!id) {
        console.log("No asset ID found in URL params");
        return;
      }
      
      setLoadingApprovalDetails(true);
      try {
        console.log("Fetching approval details for asset ID:", id);
        console.log("Full API URL:", `/approval-detail/${id}`);
        const response = await API.get(`/approval-detail/${id}`);
        console.log("Approval details API response:", response.data);
        
        if (response.data.success) {
          console.log('Full approval details response:', response.data.data);
          console.log('All keys in response:', Object.keys(response.data.data));
          console.log('Vendor details in response:', response.data.data?.vendorDetails);
          console.log('Response data type:', typeof response.data.data);
          setApprovalDetails(response.data.data);
          // Set workflow steps from API data
          setSteps(response.data.data.workflowSteps || []);
        } else {
          console.error("Failed to fetch approval details:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching approval details:", error);
        // Fallback to mock data if API fails
        setApprovalDetails({
          alertType: "Maintenance Alert",
          alertDueOn: "20/02/2025",
          actionBy: "John Doe",
          cutoffDate: "19/02/2025",
          proposal: "Replace part X",
          vendor: "VendorX",
          assetType: "Hardware",
          assetId: id,
          notes: null
        });
        // Fallback to mock steps
        setSteps(mockApiResponse.steps);
      } finally {
        setLoadingApprovalDetails(false);
      }
    };

    fetchApprovalDetails();
  }, [id]);

  useEffect(() => {
    // Simulate API call to fetch maintenance by id
    setTimeout(() => {
      setMaintenance({ ...mockApiResponse, id });
    }, 300);
    // TODO: Replace above with real API call using id
  }, [id]);

  // Find the current step and user
  const currentStep = steps.find((step) => step.status === "current");
  const isCurrentApprover = currentStep && currentStep.user.id === currentUserId;
  const isRejected = steps.some((step) => step.status === "rejected");

  // Find the user with AP status (current action pending user)
  const currentActionStep = steps.find((step) => {
    console.log("Checking step:", step);
    console.log("Step title:", step.title);
    console.log("Step status:", step.status);
    console.log("Step description:", step.description);
    console.log("Is not System:", step.title !== 'System');
    console.log("Is completed:", step.status === 'completed');
    console.log("Has Action pending:", step.description.includes('Action pending by'));
    
    // Look for the step that should be the current action user
    // It should be the one with 'completed' status and 'Action pending by' description
    const isCurrentAction = step.title !== 'System' && 
           step.status === 'completed' && 
           step.description.includes('Action pending by');
    
    console.log("Is current action step:", isCurrentAction);
    return isCurrentAction;
  });
  
  // Check if current user is the one with AP status
  const isCurrentActionUser = currentActionStep && (
    currentActionStep.user.id === currentUserId || 
    currentActionStep.user.name === user?.full_name
  );
  
  // Debug logging
  console.log("Current user ID:", currentUserId);
  console.log("Current user from auth:", user);
  console.log("All steps:", steps);
  console.log("Steps details:", steps.map(step => ({
    id: step.id,
    title: step.title,
    status: step.status,
    description: step.description,
    user: step.user
  })));
  console.log("Current action step:", currentActionStep);
  console.log("Is current action user:", isCurrentActionUser);
  console.log("Current action step user ID:", currentActionStep?.user.id);
  console.log("Current action step user name:", currentActionStep?.user.name);
  
  // Additional debug: Check if any step has 'completed' status
  const completedSteps = steps.filter(step => step.status === 'completed');
  console.log("Steps with 'completed' status:", completedSteps);
  
  // Additional debug: Check if any step has 'Action pending by' in description
  const actionPendingSteps = steps.filter(step => step.description.includes('Action pending by'));
  console.log("Steps with 'Action pending by' in description:", actionPendingSteps);

  // Approve handler
  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    setIsSubmitting(true);
    try {
      console.log("Approving maintenance for asset:", id, "by user:", currentUserId);
      const response = await API.post(`/approval-detail/${id}/approve`, {
        userId: currentUserId,
        note: approveNote
      });
      
      if (response.data.success) {
        console.log("Maintenance approved successfully");
        setShowApproveModal(false);
        setApproveNote("");
        // Refresh the page to show updated workflow
        window.location.reload();
      } else {
        alert("Failed to approve. Please try again.");
      }
    } catch (error) {
      console.error("Error approving maintenance:", error);
      alert("Failed to approve. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject handler
  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    setIsSubmitting(true);
    try {
      console.log("Rejecting maintenance for asset:", id, "by user:", currentUserId);
      const response = await API.post(`/approval-detail/${id}/reject`, {
        userId: currentUserId,
        reason: rejectNote
      });
      
      if (response.data.success) {
        console.log("Maintenance rejected successfully");
        setShowRejectModal(false);
        setRejectNote("");
        // Refresh the page to show updated workflow
        window.location.reload();
      } else {
        alert("Failed to reject. Please try again.");
      }
    } catch (error) {
      console.error("Error rejecting maintenance:", error);
      alert("Failed to reject. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch asset details when approval details are loaded
  useEffect(() => {
    const fetchAssetDetails = async () => {
      if (!approvalDetails?.assetId) {
        console.log("No asset ID available to fetch asset details");
        return;
      }
      
      setLoadingAssetDetails(true);
      try {
        console.log("Fetching asset details for asset ID:", approvalDetails.assetId);
        const response = await API.get(`/assets/${approvalDetails.assetId}`);
        console.log("Asset details API response:", response.data);
        
        if (response.data) {
          setAssetDetails(response.data);
        } else {
          console.error("Failed to fetch asset details");
        }
      } catch (error) {
        console.error("Error fetching asset details:", error);
      } finally {
        setLoadingAssetDetails(false);
      }
    };

    fetchAssetDetails();
  }, [approvalDetails?.assetId]);

  // Fetch workflow history when approval details are loaded
  useEffect(() => {
    const fetchWorkflowHistory = async () => {
      if (!approvalDetails?.assetId) {
        console.log("No asset ID available to fetch workflow history");
        return;
      }
      
      setLoadingHistory(true);
      try {
        console.log("Fetching workflow history for asset ID:", approvalDetails.assetId);
        const response = await API.get(`/approval-detail/history/${approvalDetails.assetId}`);
        console.log("Workflow history API response:", response.data);
        
        if (response.data.success) {
          setWorkflowHistory(response.data.data);
        } else {
          console.error("Failed to fetch workflow history:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching workflow history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchWorkflowHistory();
  }, [approvalDetails?.assetId]);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString();
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
                  <div key={step.id} className={`arrow-step ${getStepColor(step.status, step.title)} text-white`}>
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
                    {step.notes && step.status === 'rejected' && (
                      <p className="text-xs text-red-600 mt-1">
                        <strong>Reason:</strong> {step.notes}
                      </p>
                    )}
                    {step.notes && step.status === 'approved' && (
                      <p className="text-xs text-green-600 mt-1">
                        <strong>Note:</strong> {step.notes}
                      </p>
                    )}
                    {step.date && (step.status === 'completed' || step.status === 'approved' || step.status === 'rejected') && (
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
                    {loadingApprovalDetails ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B]"></div>
                        <span className="ml-2 text-gray-600">Loading approval details...</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput 
                          label="Alert Type" 
                          value={approvalDetails?.maintenanceType || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Alert Due On" 
                          value={formatDate(approvalDetails?.dueDate) || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Action By" 
                          value={approvalDetails?.actionBy || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Cut-off Date" 
                          value={formatDate(approvalDetails?.cutoffDate) || "-"} 
                          className={`${
                            approvalDetails?.daysUntilCutoff !== undefined && approvalDetails.daysUntilCutoff <= 2 
                              ? 'border-red-500 bg-red-50 text-red-700' 
                              : ''
                          }`}
                        />
                        <ReadOnlyInput 
                          label="Vendor" 
                          value={approvalDetails?.vendorName || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Asset Type" 
                          value={approvalDetails?.assetTypeName || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Asset ID" 
                          value={approvalDetails?.assetId || "-"} 
                        />
                        <ReadOnlyInput 
                          label="Notes" 
                          value={approvalDetails?.notes || "-"} 
                        />
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
                    )}
                  </div>
                  <ChecklistModal
                    assetType={approvalDetails?.assetTypeName || "Asset"}
                    open={showChecklist}
                    onClose={() => setShowChecklist(false)}
                    checklist={approvalDetails?.checklist || []}
                  />
                </>
              )}
              {activeTab === 'vendor' && (
                <div className="bg-white rounded shadow p-6">
                  {loadingApprovalDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B]"></div>
                      <span className="ml-2 text-gray-600">Loading vendor details...</span>
                    </div>
                  ) : approvalDetails?.vendorDetails ? (
                    <>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label="Vendor Name" value={approvalDetails.vendorDetails.vendor_name || "-"} />
                        <ReadOnlyInput label="Company" value={approvalDetails.vendorDetails.company_name || "-"} />
                        <ReadOnlyInput label="Email" value={approvalDetails.vendorDetails.company_email || "-"} />
                        <ReadOnlyInput label="Contact Number" value={approvalDetails.vendorDetails.contact_person_number || "-"} />
                        <ReadOnlyInput label="GST Number" value={approvalDetails.vendorDetails.gst_number || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label="CIN Number" value={approvalDetails.vendorDetails.cin_number || "-"} />
                        <ReadOnlyInput label="Address Line 1" value={approvalDetails.vendorDetails.address_line1 || "-"} />
                        <ReadOnlyInput label="City" value={approvalDetails.vendorDetails.city || "-"} />
                        <ReadOnlyInput label="State" value={approvalDetails.vendorDetails.state || "-"} />
                        <ReadOnlyInput label="Pincode" value={approvalDetails.vendorDetails.pincode || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label="Contact Person Name" value={approvalDetails.vendorDetails.contact_person_name || "-"} />
                        <ReadOnlyInput label="Contact Person Email" value={approvalDetails.vendorDetails.contact_person_email || "-"} />
                      </div>

                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No vendor details available
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'asset' && (
                <div className="bg-white rounded shadow p-6">
                  {loadingAssetDetails ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading asset details...</p>
                    </div>
                  ) : assetDetails ? (
                    <>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label="Asset Type" value={assetDetails.asset_type_id || "-"} />
                        <ReadOnlyInput label="Serial Number" value={assetDetails.serial_number || "-"} />
                        <ReadOnlyInput label="Asset ID" value={assetDetails.asset_id || "-"} />
                        <ReadOnlyInput label="Expiry Date" value={formatDate(assetDetails.expiry_date) || "-"} />
                        <ReadOnlyInput label="Warranty Period" value={assetDetails.warranty_period || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label="Purchase Date" value={formatDate(assetDetails.purchased_on) || "-"} />
                        <ReadOnlyInput label="Purchase Cost" value={assetDetails.purchased_cost || "-"} />
                        <ReadOnlyInput label="Purchase By" value={assetDetails.purchased_by || "-"} />
                        <ReadOnlyInput label="Purchase Vendor" value={assetDetails.purchase_vendor_id || "-"} />
                        <ReadOnlyInput label="Service Vendor" value={assetDetails.service_vendor_id || "-"} />
                      </div>
                      <div className="grid grid-cols-3 gap-6 mb-6">
                        <ReadOnlyInput label="Product/Service ID" value={assetDetails.prod_serv_id || "-"} />
                        <ReadOnlyInput label="Parent Asset" value={assetDetails.parent_asset_id || "-"} />
                        <ReadOnlyInput label="Status" value={assetDetails.current_status || "-"} />
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
                      <div className="mb-6">
                        <label className="block text-sm mb-1 font-medium">Additional Info</label>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Branch ID:</span> {assetDetails.branch_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Group ID:</span> {assetDetails.group_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Maintenance Schedule ID:</span> {assetDetails.maintsch_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">Organization ID:</span> {assetDetails.org_id || "-"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No asset details available
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'history' && (
                <div className="overflow-x-auto">
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                      <p className="text-gray-500 mt-2">Loading workflow history...</p>
                    </div>
                  ) : workflowHistory.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full border-separate border-spacing-y-2">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Date</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Action</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">User</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Job Role</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Department</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workflowHistory.map((row, idx) => (
                            <tr key={row.id || idx} className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.date}</td>
                              <td className={`px-6 py-3 text-sm whitespace-nowrap ${getActionColor(row.actionType)}`}>{row.action}</td>
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.user}</td>
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.jobRole || "-"}</td>
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.department || "-"}</td>
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.notes || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No workflow history available
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 mt-8">
              {isCurrentActionUser && (
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
                  {currentActionStep 
                    ? `Waiting for action from ${currentActionStep.user.name}`
                    : "No action required from you"
                  }
                </div>
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

            {/* Approve Modal */}
            {showApproveModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-[500px]">
                  <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                    <h3 className="text-lg font-semibold">Approve Maintenance Request</h3>
                  </div>
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Approval Note <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                        !approveNote.trim() && isSubmitting ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Please provide an approval note..."
                    />
                    {!approveNote.trim() && isSubmitting && (
                      <div className="text-red-500 text-xs mt-1">Note is required to approve.</div>
                    )}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenanceApprovalDetail;