import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import ChecklistModal from "./ChecklistModal";
import { ClipboardCheck } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";

const mockApiResponse = {
  steps: [
    {
      id: 1,
      title: "{t('maintenanceApproval.approvalInitiated')}", // Will be translated in UI
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
      description: "{t('maintenanceApproval.approved')} by Sarah Morgan",
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
      return 'bg-[#8BC34A]'; // Green for completed
    case 'approved':
      return 'bg-[#2196F3]'; // Blue for approved
    case 'current':
      return 'bg-[#8BC34A]'; // Green for approval pending (AP)
    case 'rejected':
      return 'bg-red-500'; // Red for rejected
    case 'pending':
      return 'bg-gray-400'; // Gray for awaiting
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
  const { t } = useLanguage();
  
  
  const [maintenance, setMaintenance] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentUserEmpId, setCurrentUserEmpId] = useState(""); // Will be set from auth
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
    if (user && user.emp_int_id) {
      setCurrentUserEmpId(user.emp_int_id);
    }
  }, [user]);

  // Fetch approval details from API
  useEffect(() => {
    const fetchApprovalDetails = async () => {
      if (!id) { return; }
      
      setLoadingApprovalDetails(true);
      try {
        
        // Add cache-busting timestamp to prevent stale data
        const timestamp = Date.now();
        const response = await API.get(`/approval-detail/workflow/${id}?t=${timestamp}`);
        
        
        if (response.data.success) {
          
          
          const workflowData = response.data.data;
            
          // Transform the workflow data to match the expected format
          const transformedData = {
            wfamsdId: workflowData.workflowDetails?.[0]?.wfamsd_id || workflowData.wfamshId,
            wfamshId: workflowData.wfamshId,
            assetId: workflowData.assetId,
            assetTypeId: workflowData.assetTypeId,
            assetTypeName: workflowData.assetTypeName,
            vendorId: workflowData.vendorId,
            vendorName: workflowData.vendorName,
            maintenanceType: workflowData.maintenanceType,
            dueDate: workflowData.dueDate,
            cutoffDate: workflowData.cutoffDate,
            actionBy: workflowData.workflowDetails?.[0]?.user_name || 'Unassigned',
            userId: workflowData.workflowDetails?.[0]?.user_id,
            userEmail: workflowData.workflowDetails?.[0]?.email,
            status: workflowData.workflowDetails?.[0]?.detail_status,
            sequence: workflowData.workflowDetails?.[0]?.sequence,
            daysUntilDue: workflowData.daysUntilDue,
            daysUntilCutoff: workflowData.daysUntilCutoff,
            isUrgent: workflowData.isUrgent,
            isOverdue: workflowData.isOverdue,
            notes: workflowData.notes,
            checklist: workflowData.checklist,
            vendorDetails: workflowData.vendorDetails,
            workflowSteps: workflowData.workflowSteps
          };
            
          setApprovalDetails(transformedData);
          setSteps(workflowData.workflowSteps || []);
        } else {
          console.error("Failed to fetch maintenance workflow:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching maintenance workflow:", error);
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
          notes: null,
          checklist: [] // Empty array - real checklist should come from API
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

  // Find ALL current steps and users (after escalation, there can be multiple current approvers)
  const currentSteps = steps.filter((step) => step.status === "current");
  const isCurrentApprover = currentSteps.some((step) => step.user.id === currentUserEmpId);
  const isRejected = steps.some((step) => step.status === "rejected");

  // Find ALL users with AP status (current action pending users)
  const currentActionSteps = steps.filter((step) => {
    // Look for steps that should be current action users
    // They should have 'current' status and 'Action pending by' description
    const isCurrentAction = step.title !== 'System' && 
           step.status === 'current' && 
           step.description.includes('Action pending by');
    return isCurrentAction;
  });
  
  // Check if current user is among ANY of the users with AP status
  const isCurrentActionUser = currentActionSteps.some((step) => 
    step.user.id === currentUserEmpId || 
    step.user.name === user?.full_name
  );
  
  

  // Approve handler
  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    setIsSubmitting(true);
    try {
      console.log("Approving maintenance for asset:", id, "by emp:", currentUserEmpId);
      const response = await API.post(`/approval-detail/${id}/approve`, {
        empIntId: currentUserEmpId,
        note: approveNote
      });
      
      if (response.data.success) {
        console.log("Maintenance approved successfully");
        setShowApproveModal(false);
        setApproveNote("");
        // Refresh the page to show updated workflow
        window.location.reload();
      } else {
        alert(t('maintenanceApproval.failedToApprove'));
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
      console.log("Rejecting maintenance for asset:", id, "by emp:", currentUserEmpId);
      const response = await API.post(`/approval-detail/${id}/reject`, {
        empIntId: currentUserEmpId,
        reason: rejectNote
      });
      
      if (response.data.success) {
        console.log("Maintenance rejected successfully");
        setShowRejectModal(false);
        setRejectNote("");
        // Refresh the page to show updated workflow
        window.location.reload();
      } else {
        alert(t('maintenanceApproval.failedToReject'));
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
      if (!approvalDetails?.wfamshId) {
        console.log("No wfamsh_id available to fetch workflow history");
        return;
      }
      
      setLoadingHistory(true);
      try {
        console.log("Fetching workflow history for wfamsh_id:", approvalDetails.wfamshId);
        const response = await API.get(`/approval-detail/workflow-history/${approvalDetails.wfamshId}`);
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
  }, [approvalDetails?.wfamshId]);

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
                        <strong>{t('maintenanceApproval.notes')}:</strong> {step.notes}
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
                    {t(`maintenanceApproval.${tab}Details`)}
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
                        <span className="ml-2 text-gray-600">{t('maintenanceApproval.loadingApprovalDetails')}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.alertType')} 
                          value={approvalDetails?.maintenanceType || "-"} 
                        />
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.alertDueOn')} 
                          value={formatDate(approvalDetails?.dueDate) || "-"} 
                        />
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.actionBy')} 
                          value={approvalDetails?.actionBy || "-"} 
                        />
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.cutoffDate')} 
                          value={formatDate(approvalDetails?.cutoffDate) || "-"} 
                          className={`${
                            approvalDetails?.daysUntilCutoff !== undefined && approvalDetails.daysUntilCutoff <= 2 
                              ? 'border-red-500 bg-red-50 text-red-700' 
                              : ''
                          }`}
                        />
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.vendor')} 
                          value={approvalDetails?.vendorName || "-"} 
                        />
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.assetType')} 
                          value={approvalDetails?.assetTypeName || "-"} 
                        />
                         <ReadOnlyInput 
                           label={t('maintenanceApproval.assetID')} 
                           value={approvalDetails?.assetId || "-"} 
                         />
                         <ReadOnlyInput 
                           label="Workflow ID" 
                           value={approvalDetails?.wfamshId || "-"} 
                         />
                         <ReadOnlyInput 
                           label={t('maintenanceApproval.notes')} 
                           value={approvalDetails?.notes || "-"} 
                         />
                        <div className="flex flex-col justify-end">
                          <label className="block text-sm font-medium mb-1 text-gray-700">{t('maintenanceApproval.checklist')}</label>
                          <button
                            onClick={() => {
                              console.log('Opening checklist with data:', approvalDetails?.checklist);
                              setShowChecklist(true);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition"
                            title="View and complete the asset maintenance checklist"
                            type="button"
                          >
                            <ClipboardCheck className="w-5 h-5" />
                            {t('maintenanceApproval.viewChecklist')}
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
                      <span className="ml-2 text-gray-600">{t('maintenanceApproval.loadingVendorDetails')}</span>
                    </div>
                  ) : approvalDetails?.vendorDetails ? (
                    <>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.vendorName')} value={approvalDetails.vendorDetails.vendor_name || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.company')} value={approvalDetails.vendorDetails.company_name || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.email')} value={approvalDetails.vendorDetails.company_email || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.contactNumber')} value={approvalDetails.vendorDetails.contact_person_number || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.gstNumber')} value={approvalDetails.vendorDetails.gst_number || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.cinNumber')} value={approvalDetails.vendorDetails.cin_number || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.addressLine1')} value={approvalDetails.vendorDetails.address_line1 || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.city')} value={approvalDetails.vendorDetails.city || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.state')} value={approvalDetails.vendorDetails.state || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.pincode')} value={approvalDetails.vendorDetails.pincode || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.contactPersonName')} value={approvalDetails.vendorDetails.contact_person_name || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.contactPersonEmail')} value={approvalDetails.vendorDetails.contact_person_email || "-"} />
                      </div>

                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {t('maintenanceApproval.noVendorDetailsAvailable')}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'asset' && (
                <div className="bg-white rounded shadow p-6">
                  {loadingAssetDetails ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                      <p className="text-gray-500 mt-2">{t('maintenanceApproval.loadingAssetDetails')}</p>
                    </div>
                  ) : assetDetails ? (
                    <>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.assetType')} value={assetDetails.asset_type_id || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.serialNumber')} value={assetDetails.serial_number || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.assetID')} value={assetDetails.asset_id || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.expiryDate')} value={formatDate(assetDetails.expiry_date) || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.warrantyPeriod')} value={assetDetails.warranty_period || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.purchaseDate')} value={formatDate(assetDetails.purchased_on) || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.purchaseCost')} value={assetDetails.purchased_cost || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.purchaseBy')} value={assetDetails.purchased_by || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.purchaseVendor')} value={assetDetails.purchase_vendor_id || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.serviceVendor')} value={assetDetails.service_vendor_id || "-"} />
                      </div>
                      <div className="grid grid-cols-3 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.productServiceID')} value={assetDetails.prod_serv_id || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.parentAsset')} value={assetDetails.parent_asset_id || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.status')} value={assetDetails.current_status || "-"} />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm mb-1 font-medium">{t('maintenanceApproval.description')}</label>
                        <textarea
                          value={assetDetails.description || "-"}
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm"
                          rows={3}
                        />
                      </div>
                      <div className="mb-6">
                        <label className="block text-sm mb-1 font-medium">{t('maintenanceApproval.additionalInfo')}</label>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.branchID')}:</span> {assetDetails.branch_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.groupID')}:</span> {assetDetails.group_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.maintenanceScheduleID')}:</span> {assetDetails.maintsch_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.organizationID')}:</span> {assetDetails.org_id || "-"}
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {t('maintenanceApproval.noAssetDetailsAvailable')}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'history' && (
                <div className="overflow-x-auto">
                  {loadingHistory ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                      <p className="text-gray-500 mt-2">{t('maintenanceApproval.loadingWorkflowHistory')}</p>
                    </div>
                  ) : workflowHistory.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                      <table className="min-w-full border-separate border-spacing-y-2">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.date')}</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.action')}</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.user')}</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.jobRole')}</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.department')}</th>
                            <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{t('maintenanceApproval.notes')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {workflowHistory.map((row, idx) => (
                            <tr key={row.id || idx} className="bg-white border border-gray-200 rounded-md shadow-sm">
                              <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.date}</td>
                              <td className={`px-6 py-3 text-sm whitespace-nowrap font-medium ${row.actionColor || 'text-gray-600'}`}>{row.action}</td>
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
                  {currentActionSteps.length > 0 
                    ? (() => {
                        if (currentActionSteps.length === 1) {
                          return t('maintenanceApproval.waitingForActionFrom', { userName: currentActionSteps[0].user.name });
                        } else {
                          const userNames = currentActionSteps.map(step => step.user.name).join(', ');
                          return t('maintenanceApproval.waitingForActionFrom', { userName: userNames });
                        }
                      })()
                    : t('maintenanceApproval.noActionRequiredFromYou')
                  }
                </div>
              )}
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl w-[500px]">
                  <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                    <h3 className="text-lg font-semibold">{t('maintenanceApproval.rejectMaintenanceRequest')}</h3>
                  </div>
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
{t('maintenanceApproval.reasonForRejection')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                        !rejectNote.trim() && isSubmitting ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('maintenanceApproval.pleaseProvideReasonForRejection')}
                    />
                    {!rejectNote.trim() && isSubmitting && (
                      <div className="text-red-500 text-xs mt-1">{t('maintenanceApproval.noteRequiredToReject')}</div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setShowRejectModal(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
{t('common.cancel')}
                      </button>
                      <button
                        onClick={handleReject}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        disabled={!rejectNote.trim() || isSubmitting}
                      >
{t('maintenanceApproval.reject')}
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
                    <h3 className="text-lg font-semibold">{t('maintenanceApproval.approveMaintenanceRequest')}</h3>
                  </div>
                  <div className="p-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
{t('maintenanceApproval.approvalNote')} <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                        !approveNote.trim() && isSubmitting ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder={t('maintenanceApproval.pleaseProvideApprovalNote')}
                    />
                    {!approveNote.trim() && isSubmitting && (
                      <div className="text-red-500 text-xs mt-1">{t('maintenanceApproval.noteRequiredToApprove')}</div>
                    )}
                    <div className="flex justify-end gap-3 mt-6">
                      <button
                        onClick={() => setShowApproveModal(false)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
{t('common.cancel')}
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