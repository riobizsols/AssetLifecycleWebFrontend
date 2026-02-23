import React, { useState, useEffect, useMemo } from "react";
import { useParams, useLocation, useSearchParams } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import ChecklistModal from "./ChecklistModal";
import { ClipboardCheck } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { useLanguage } from "../contexts/LanguageContext";
import { toast } from "react-hot-toast";

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
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  
  // Get context from URL or state (MAINTENANCEAPPROVAL)
  const context = searchParams.get('context') || location.state?.context || 'MAINTENANCEAPPROVAL';
  
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
  const [technicians, setTechnicians] = useState([]);
  const [assignedTechnician, setAssignedTechnician] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [loadingAssignedTechnician, setLoadingAssignedTechnician] = useState(false);
  const [loadingApprovalDetails, setLoadingApprovalDetails] = useState(false);
  const [assetDetails, setAssetDetails] = useState(null);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState(false);
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllAssets, setShowAllAssets] = useState(false);
  const [activeVendors, setActiveVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [maintenanceDate, setMaintenanceDate] = useState("");
  const [vendorStatusError, setVendorStatusError] = useState("");
  const [displayedVendorDetails, setDisplayedVendorDetails] = useState(null);
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);

  // Check if this is a subscription renewal (MT001) or vendor contract renewal (MT005)
  const isSubscriptionRenewal = useMemo(() => {
    if (!approvalDetails) return false;
    const maintType = (approvalDetails.maintenanceType || '').toLowerCase();
    const maintTypeId = approvalDetails.maint_type_id || '';
    const result = maintType.includes('subscription') || maintTypeId === 'MT001';
    return result;
  }, [approvalDetails]);

  const isVendorContractRenewal = useMemo(() => {
    if (!approvalDetails) return false;
    const maintType = (approvalDetails.maintenanceType || '').toLowerCase();
    const maintTypeId = approvalDetails.maint_type_id || '';
    const result = maintType.includes('vendor contract') || maintType.includes('contract renewal') || maintTypeId === 'MT005';
    console.log('Vendor contract renewal check:', { maintType, maintTypeId, result, approvalDetails });
    return result;
  }, [approvalDetails]);
  
  // Reset active tab if it's vendor contract renewal and user is on asset tab
  useEffect(() => {
    if (isVendorContractRenewal && activeTab === 'asset') {
      console.log('Resetting tab from', activeTab, 'to approval for vendor contract renewal');
      setActiveTab('approval');
    }
  }, [isVendorContractRenewal, activeTab]);
  
  // Reset active tab if it's subscription renewal and user is on vendor/asset tab
  useEffect(() => {
    if (isSubscriptionRenewal && (activeTab === 'vendor' || activeTab === 'asset')) {
      console.log('Resetting tab from', activeTab, 'to approval for subscription renewal');
      setActiveTab('approval');
    }
  }, [isSubscriptionRenewal, activeTab]);

  // Reset active tab when switching between vendor and in-house maintenance
  useEffect(() => {
    if (!approvalDetails) return;
    const hasEmpIntId = approvalDetails?.header_emp_int_id;
    const maint = (approvalDetails?.maintained_by || '').toString().toLowerCase();
    const isInhouse = hasEmpIntId || (maint && (maint.includes('inhouse') || maint.includes('in-house')));
    
    if (isInhouse && activeTab === 'vendor') {
      console.log('Resetting tab from vendor to approval for in-house maintenance');
      setActiveTab('approval');
    } else if (!isInhouse && activeTab === 'technician') {
      console.log('Resetting tab from technician to approval for vendor maintenance');
      setActiveTab('approval');
    }
  }, [approvalDetails?.header_emp_int_id, approvalDetails?.maintained_by, activeTab]);

  // Set current user from auth store
  useEffect(() => {
    if (user && user.emp_int_id) {
      setCurrentUserEmpId(user.emp_int_id);
    }
  }, [user]);

  // Fetch approval details from API
  const fetchApprovalDetails = async (forceRefresh = false) => {
      if (!id) { return; }
      
      setLoadingApprovalDetails(true);
      try {
        
        // Add cache-busting timestamp to prevent stale data
        const timestamp = Date.now();
        const response = await API.get(`/approval-detail/workflow/${id}?t=${timestamp}`);
        
        
        if (response.data.success) {
          
          
          const workflowData = response.data.data;
          
          // Debug logging
          console.log('📦 Full workflow data from API:', workflowData);
          console.log('🔍 Group maintenance check:', {
            isGroupMaintenance: workflowData.isGroupMaintenance,
            groupId: workflowData.groupId,
            groupName: workflowData.groupName,
            groupAssets: workflowData.groupAssets,
            groupAssetsLength: workflowData.groupAssets?.length
          });
            
          // Transform the workflow data to match the expected format
          const transformedData = {
            wfamsdId: workflowData.workflowDetails?.[0]?.wfamsd_id || workflowData.wfamshId,
            wfamshId: workflowData.wfamshId,
            assetId: workflowData.assetId,
            assetName: workflowData.assetName,
            assetSerialNumber: workflowData.assetSerialNumber,
            assetTypeId: workflowData.assetTypeId,
            assetTypeName: workflowData.assetTypeName,
            vendorId: workflowData.vendorId,
            vendorName: workflowData.vendorName,
            maintenanceType: workflowData.maintenanceType,
            maint_type_id: workflowData.maint_type_id,
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
            maintained_by: workflowData.maintained_by || null,
            header_emp_int_id: workflowData.header_emp_int_id || null,
            at_main_freq_id: workflowData.at_main_freq_id || null,
            vendorDetails: workflowData.vendorDetails,
            workflowSteps: workflowData.workflowSteps,
            // Group asset maintenance information
            groupId: workflowData.groupId || null,
            groupName: workflowData.groupName || null,
            groupAssetCount: workflowData.groupAssetCount || null,
            isGroupMaintenance: workflowData.isGroupMaintenance || false,
            groupAssets: workflowData.groupAssets || [] // All assets in the group
          };
          
          console.log('✅ Transformed data:', {
            isGroupMaintenance: transformedData.isGroupMaintenance,
            groupAssets: transformedData.groupAssets,
            groupAssetsLength: transformedData.groupAssets?.length
          });
            
          setApprovalDetails(transformedData);
          setSteps(workflowData.workflowSteps || []);
        } else {
          console.error("Failed to fetch maintenance workflow:", response.data.message);
        }
      } catch (error) {
        console.error("Error fetching maintenance workflow:", error);
        // Fallback to a safe minimal state if API fails - do NOT set assetId to the workflow id
        setApprovalDetails({
          alertType: "Maintenance Alert",
          alertDueOn: "20/02/2025",
          actionBy: "John Doe",
          cutoffDate: "19/02/2025",
          proposal: "Replace part X",
          vendor: "VendorX",
          assetType: "Hardware",
          assetId: null, // avoid calling /api/assets/{wfamshId}
          notes: null,
          checklist: [] // Empty array - real checklist should come from API
        });
        // Fallback to mock steps (limited)
        setSteps(mockApiResponse.steps);
      } finally {
        setLoadingApprovalDetails(false);
      }
    };

  useEffect(() => {
    fetchApprovalDetails();
  }, [id]);

  useEffect(() => {
    // Simulate API call to fetch maintenance by id
    setTimeout(() => {
      setMaintenance({ ...mockApiResponse, id });
    }, 300);
    // TODO: Replace above with real API call using id
  }, [id]);

  // ROLE-BASED: Get current user's job roles from auth store
  const userRoles = user?.roles || [];
  const userRoleIds = userRoles.map(role => role.job_role_id);
  
  console.log('🔍 Current user roles:', userRoleIds);
  console.log('📋 Workflow steps:', steps);
  
  // Find ALL current steps and users (after escalation, there can be multiple current approvers)
  const currentSteps = steps.filter((step) => step.status === "current");
  
  // ROLE-BASED: Check if user has ANY of the required roles for current approval steps
  const isCurrentApprover = currentSteps.some((step) => {
    // Backend sends role info in step.role.id (job_role_id)
    const stepRoleId = step.role?.id || step.user?.id;
    const hasRole = userRoleIds.includes(stepRoleId);
    console.log(`🔍 Checking step: Required role=${stepRoleId}, User has role=${hasRole}`);
    return hasRole;
  });
  
  const isRejected = steps.some((step) => step.status === "rejected");

  // Find ALL steps with AP status (current action pending)
  const currentActionSteps = steps.filter((step) => {
    // Look for steps that should be current action users
    // They should have 'current' status and 'Action pending by' or similar description
    const isCurrentAction = step.title !== 'System' && 
           step.title !== 'Approval Initiated' &&
           step.status === 'current';
    return isCurrentAction;
  });
  
  // ROLE-BASED: Check if current user has ANY of the roles requiring action
  const isSystemAdmin = userRoleIds.includes('JR001');
  
  const isCurrentActionUser = isSystemAdmin || currentActionSteps.some((step) => {
    // Backend sends role info in step.role.id (job_role_id)
    const stepRoleId = step.role?.id || step.user?.id;
    const hasRole = userRoleIds.includes(stepRoleId);
    console.log(`🔍 Checking action step: Required role=${stepRoleId}, User has role=${hasRole}`);
    return hasRole;
  });
  
  console.log('✅ User can approve:', isCurrentActionUser, ' (System Admin:', isSystemAdmin, ')');
  console.log('📊 Current action steps:', currentActionSteps);
  
  

  // Approve handler
  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    
    setIsSubmitting(true);
    let loadingToastId = null;
    
    try {
      // Show loading toast
      loadingToastId = toast.loading(t('maintenanceApproval.approving') || "Approving maintenance...", {
        duration: Infinity, // Keep it until we dismiss it
      });
      
      console.log("Approving maintenance for asset:", id, "by emp:", currentUserEmpId);
      
      // Always send vendor and maintenance date if they have been set/changed
      // Use selectedVendorId if changed, otherwise use original vendorId
      const vendorToSend = selectedVendorId !== null ? selectedVendorId : approvalDetails?.vendorId;
      // Use maintenanceDate if changed, otherwise use original dueDate
      const dateToSend = maintenanceDate ? maintenanceDate : (approvalDetails?.dueDate ? new Date(approvalDetails.dueDate).toISOString().split('T')[0] : null);
      
      console.log("Sending approval with:", { 
        vendorId: vendorToSend, 
        maintenanceDate: dateToSend,
        selectedVendorId: selectedVendorId,
        originalVendorId: approvalDetails?.vendorId,
        maintenanceDateState: maintenanceDate,
        originalDueDate: approvalDetails?.dueDate
      });
      
      const response = await API.post(`/approval-detail/${id}/approve`, {
        empIntId: currentUserEmpId,
        note: approveNote,
        vendorId: vendorToSend,
        maintenanceDate: dateToSend
      });
      
      // Dismiss loading toast
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      
      if (response.data.success) {
        console.log("Maintenance approved successfully");
        toast.success(t('maintenanceApproval.approvedSuccessfully') || "Maintenance approved successfully");
        setShowApproveModal(false);
        setApproveNote("");
        setVendorStatusError("");
        
        // Refresh approval details to show updated vendor and date
        // Wait a bit for the database to be updated
        setTimeout(() => {
          fetchApprovalDetails(true);
        }, 500);
      } else {
        // Check if it's a vendor status message (not an error)
        if (response.data.message && (response.data.message.includes("Inactive") || response.data.message.includes("CR Approved"))) {
          toast.error(response.data.message);
          setVendorStatusError(response.data.message);
          setShowApproveModal(false);
          // Switch to vendor tab to show the message
          setActiveTab('vendor');
        } else {
          toast.error(response.data.message || t('maintenanceApproval.failedToApprove'));
        }
      }
    } catch (error) {
      console.error("Error approving maintenance:", error);
      
      // Dismiss loading toast
      if (loadingToastId) {
        toast.dismiss(loadingToastId);
      }
      
      const errorMessage = error.response?.data?.message || error.message || "Failed to approve. Please try again.";
      
      // Check if it's a vendor status message (not an error)
      if (errorMessage.includes("Inactive") || errorMessage.includes("CR Approved")) {
        toast.error(errorMessage);
        setVendorStatusError(errorMessage);
        setShowApproveModal(false);
        // Switch to vendor tab to show the message
        setActiveTab('vendor');
      } else {
        toast.error(errorMessage);
      }
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
        // Pass context parameter so logs go to MAINTENANCEAPPROVAL CSV
        const response = await API.get(`/assets/${approvalDetails.assetId}`, {
          params: { context }
        });
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

  // Fetch technicians or assigned technician when approvalDetails is loaded
  useEffect(() => {
    const fetchAssignedTechnician = async (empIntId) => {
      if (!empIntId) return;
      setLoadingAssignedTechnician(true);
      try {
        const response = await API.get(`/inspection-approval/technician-header/${empIntId}`);
        if (response.data?.success && response.data.data && response.data.data.length > 0) {
          setAssignedTechnician(response.data.data[0]);
          setSelectedTechnician(response.data.data[0].emp_int_id);
        } else {
          setAssignedTechnician(null);
        }
      } catch (e) {
        console.error('Error fetching assigned technician:', e);
        setAssignedTechnician(null);
      } finally {
        setLoadingAssignedTechnician(false);
      }
    };

    const fetchCertifiedTechnicians = async (assetTypeId) => {
      if (!assetTypeId) return;
      setLoadingTechnicians(true);
      try {
        const resp = await API.get(`/inspection-approval/technicians/${assetTypeId}`);
        if (resp.data?.success) {
          setTechnicians(resp.data.data || []);
        } else {
          setTechnicians([]);
        }
      } catch (e) {
        console.error('Error fetching certified technicians:', e);
        setTechnicians([]);
      } finally {
        setLoadingTechnicians(false);
      }
    };

    if (!approvalDetails) return;
    const hasEmpIntId = approvalDetails?.header_emp_int_id;
    const maintained = (approvalDetails?.maintained_by || '').toString().toLowerCase();
    const isInhouse = hasEmpIntId || (maintained && (maintained.includes('inhouse') || maintained.includes('in-house')));
    
    if (isInhouse) {
      // Fetch assigned technician from header if present
      if (approvalDetails?.header_emp_int_id) {
        fetchAssignedTechnician(approvalDetails.header_emp_int_id);
      }
      // Also fetch certified technicians for asset type to allow selection
      if (approvalDetails?.assetTypeId) {
        fetchCertifiedTechnicians(approvalDetails.assetTypeId);
      }
    }
  }, [approvalDetails]);

  // Save technician change to workflow header
  const saveTechnicianChange = async (newTechnicianId) => {
    if (!approvalDetails?.wfamshId) return;
    if (!newTechnicianId) return;
    try {
      const resp = await API.put(`/approval-detail/workflow-header/${approvalDetails.wfamshId}`, { technicianId: newTechnicianId });
      if (resp.data?.success) {
        toast.success('Technician updated');
        setSelectedTechnician(newTechnicianId);
        try {
          const assignedResp = await API.get(`/inspection-approval/technician-header/${newTechnicianId}`);
          if (assignedResp.data?.success && assignedResp.data.data && assignedResp.data.data.length > 0) {
            setAssignedTechnician(assignedResp.data.data[0]);
          }
        } catch (e) {
          console.error('Error fetching technician after update:', e);
        }
      } else {
        toast.error(resp.data?.message || 'Failed to update technician');
      }
    } catch (e) {
      console.error('Error saving technician change:', e);
      toast.error('Failed to update technician');
    }
  };

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

  // Fetch active service vendors for dropdown
  useEffect(() => {
    const fetchActiveServiceVendors = async () => {
      try {
        const response = await API.get('/get-vendors');
        if (response.data && Array.isArray(response.data)) {
          // Filter only active service vendors (int_status = 1 AND service_supply = true)
          const activeServiceVendors = response.data
            .filter(vendor => {
              // Active vendors (int_status = 1)
              const isActive = vendor.int_status === 1;
              // Service vendors (service_supply = true, or if field doesn't exist, include all active vendors as fallback)
              const isServiceVendor = vendor.service_supply === true || vendor.service_supply === 'true' || vendor.service_supply === 1;
              // If service_supply field doesn't exist, show all active vendors (fallback)
              const hasServiceSupplyField = 'service_supply' in vendor;
              return isActive && (hasServiceSupplyField ? isServiceVendor : true);
            })
            .map(vendor => ({
              value: vendor.vendor_id,
              label: vendor.vendor_name || vendor.company_name || `Vendor ${vendor.vendor_id}`
            }));
          setActiveVendors(activeServiceVendors);
        }
      } catch (error) {
        console.error("Error fetching active service vendors:", error);
      }
    };

    fetchActiveServiceVendors();
  }, []);

  // Save vendor change independently
  const saveVendorChange = async (newVendorId) => {
    if (!approvalDetails?.wfamshId) {
      toast.error("Workflow ID not found");
      return;
    }
    
    try {
      const response = await API.put(`/approval-detail/workflow-header/${approvalDetails.wfamshId}`, {
        vendorId: newVendorId
      });
      
      if (response.data.success) {
        toast.success("Vendor updated successfully");
        // Refresh approval details to show updated vendor
        fetchApprovalDetails(true);
      } else {
        toast.error(response.data.message || "Failed to update vendor");
      }
    } catch (error) {
      console.error("Error saving vendor change:", error);
      toast.error(error.response?.data?.message || "Failed to update vendor");
    }
  };
  
  // Save maintenance date change independently
  const saveMaintenanceDateChange = async (newDate) => {
    if (!approvalDetails?.wfamshId) {
      toast.error("Workflow ID not found");
      return;
    }
    
    try {
      const response = await API.put(`/approval-detail/workflow-header/${approvalDetails.wfamshId}`, {
        maintenanceDate: newDate
      });
      
      if (response.data.success) {
        toast.success("Maintenance date updated successfully");
        // Refresh approval details to show updated date
        fetchApprovalDetails(true);
      } else {
        toast.error(response.data.message || "Failed to update maintenance date");
      }
    } catch (error) {
      console.error("Error saving maintenance date change:", error);
      toast.error(error.response?.data?.message || "Failed to update maintenance date");
    }
  };

  // Initialize selected vendor and maintenance date from approval details
  useEffect(() => {
    if (approvalDetails) {
      // Always update vendor from approval details (to reflect saved changes)
      setSelectedVendorId(approvalDetails.vendorId || null);
      
      // Always update maintenance date from approval details (to reflect saved changes)
      if (approvalDetails.dueDate) {
        const date = new Date(approvalDetails.dueDate);
        setMaintenanceDate(date.toISOString().split('T')[0]);
      } else {
        setMaintenanceDate("");
      }
      
      // Set initial displayed vendor details
      if (approvalDetails.vendorDetails) {
        setDisplayedVendorDetails(approvalDetails.vendorDetails);
      }
      
      // If maintenance is inhouse we ignore vendor status entirely
      if (approvalDetails?.maintained_by && approvalDetails.maintained_by.toLowerCase().includes('inhouse')) {
        setVendorStatusError("");
      } else {
        // Check vendor status on load
        const currentVendorStatus = approvalDetails?.vendorDetails?.vendor_status || approvalDetails?.vendorDetails?.int_status;
        if (currentVendorStatus === 0 || currentVendorStatus === 3) {
          setVendorStatusError("The specified Service Vendor is Inactive or CR Approved. Please choose another vendor for service.");
        } else {
          setVendorStatusError("");
        }
      }
    }
  }, [approvalDetails]);

  // Fetch vendor details when a new vendor is selected
  useEffect(() => {
    const fetchSelectedVendorDetails = async () => {
      if (!selectedVendorId || selectedVendorId === approvalDetails?.vendorId) {
        // If no vendor selected or same as original, use original vendor details
        if (approvalDetails?.vendorDetails) {
          setDisplayedVendorDetails(approvalDetails.vendorDetails);
        }
        return;
      }

      setLoadingVendorDetails(true);
      try {
        const response = await API.get(`/vendor/${selectedVendorId}`);
        if (response.data?.success && response.data?.data) {
          const vendorData = response.data.data;
          // Format vendor details to match the expected structure
          setDisplayedVendorDetails({
            vendor_id: vendorData.vendor_id,
            vendor_name: vendorData.vendor_name,
            company_name: vendorData.company_name,
            company_email: vendorData.company_email,
            contact_person_name: vendorData.contact_person_name,
            contact_person_email: vendorData.contact_person_email,
            contact_person_number: vendorData.contact_person_number,
            address_line1: vendorData.address_line1,
            address_line2: vendorData.address_line2,
            city: vendorData.city,
            state: vendorData.state,
            pincode: vendorData.pincode,
            gst_number: vendorData.gst_number,
            cin_number: vendorData.cin_number,
            contract_start_date: vendorData.contract_start_date,
            contract_end_date: vendorData.contract_end_date,
            rating: vendorData.rating || vendorData.vendor_rating,
            int_status: vendorData.int_status,
            vendor_status: vendorData.int_status
          });
        }
      } catch (error) {
        console.error("Error fetching selected vendor details:", error);
        // On error, keep original vendor details
        if (approvalDetails?.vendorDetails) {
          setDisplayedVendorDetails(approvalDetails.vendorDetails);
        }
      } finally {
        setLoadingVendorDetails(false);
      }
    };

    fetchSelectedVendorDetails();
  }, [selectedVendorId, approvalDetails]);

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
            {/* Asset Name(s) at the top */}
            {(assetDetails?.asset_name || approvalDetails?.assetName) && (
              <div className="mb-6 pb-4 border-b border-gray-200">
                {(() => {
                  console.log('🎨 Rendering asset name section:', {
                    isGroupMaintenance: approvalDetails?.isGroupMaintenance,
                    groupAssets: approvalDetails?.groupAssets,
                    groupAssetsLength: approvalDetails?.groupAssets?.length,
                    groupName: approvalDetails?.groupName
                  });
                  
                  if (approvalDetails?.isGroupMaintenance && approvalDetails?.groupAssets && approvalDetails.groupAssets.length > 0) {
                    const assetsToShow = showAllAssets ? approvalDetails.groupAssets : approvalDetails.groupAssets.slice(0, 4);
                    const hasMoreAssets = approvalDetails.groupAssets.length > 4;
                    
                    return (
                      <div>
                        <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                          {approvalDetails.groupName || 'Group Maintenance'}
                        </h2>
                        <div className="mt-3">
                          <p className="text-sm font-medium text-gray-600 mb-2">
                            Assets in Group ({approvalDetails.groupAssets.length}):
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {assetsToShow.map((asset, index) => (
                              <span
                                key={asset.assetId || index}
                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                              >
                                {asset.assetName || asset.assetId}
                                {asset.serialNumber && (
                                  <span className="ml-2 text-xs text-blue-600">
                                    ({asset.serialNumber})
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                          {hasMoreAssets && (
                            <button
                              onClick={() => setShowAllAssets(!showAllAssets)}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                            >
                              {showAllAssets ? 'Show Less' : `Show ${approvalDetails.groupAssets.length - 4} More`}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    return (
                <h2 className="text-2xl font-semibold text-gray-800">
                  {assetDetails?.asset_name || approvalDetails?.assetName}
                </h2>
                    );
                  }
                })()}
              </div>
            )}
            
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
                {(() => {
                  // For subscription renewal (MT001): show only approval and history
                  if (isSubscriptionRenewal) {
                    return ['approval', 'history'];
                  }
                  // For vendor contract renewal (MT005): show approval, vendor, and history (no asset)
                  if (isVendorContractRenewal) {
                    return ['approval', 'vendor', 'history'];
                  }
                  // For regular maintenance: show technician tab when has emp_int_id (in-house), otherwise vendor
                  const hasEmpIntId = approvalDetails?.header_emp_int_id;
                  const maint = (approvalDetails?.maintained_by || '').toString().toLowerCase();
                  console.log('🔍 Tab Logic Debug:', {
                    hasEmpIntId,
                    maintained_by: approvalDetails?.maintained_by,
                    maint,
                    approvalDetails
                  });
                  if (hasEmpIntId || (maint && (maint.includes('inhouse') || maint.includes('in-house')))) {
                    return ['approval', 'technician', 'asset', 'history'];
                  }
                  return ['approval', 'vendor', 'asset', 'history'];
                })().map((tab) => (
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
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">{t('maintenanceApproval.alertDueOn')}</label>
                          <input
                            type="date"
                            value={maintenanceDate || ""}
                            onChange={async (e) => {
                              const newDate = e.target.value;
                              setMaintenanceDate(newDate);
                              console.log("Maintenance date changed to:", newDate);
                              
                              // Save maintenance date change immediately
                              if (newDate && newDate !== (approvalDetails?.dueDate ? new Date(approvalDetails.dueDate).toISOString().split('T')[0] : "")) {
                                await saveMaintenanceDateChange(newDate);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                          />
                          <p className="text-xs text-gray-500 mt-1">Changes are saved automatically.</p>
                        </div>
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
                        {!isVendorContractRenewal && (
                          <>
                        <ReadOnlyInput 
                          label={t('maintenanceApproval.assetType')} 
                          value={approvalDetails?.assetTypeName || "-"} 
                        />
                         <ReadOnlyInput 
                           label={t('maintenanceApproval.assetID')} 
                           value={approvalDetails?.assetId || "-"} 
                         />
                          </>
                        )}
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
                  {loadingApprovalDetails || loadingVendorDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B]"></div>
                      <span className="ml-2 text-gray-600">{t('maintenanceApproval.loadingVendorDetails')}</span>
                    </div>
                  ) : displayedVendorDetails || approvalDetails?.vendorDetails ? (
                    <>
                      {/* Vendor Status Warning Message */}
                      {vendorStatusError && (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-yellow-800 text-sm font-medium">{vendorStatusError}</p>
                              <p className="text-yellow-700 text-xs mt-1">Please select an active service vendor from the dropdown above to proceed with approval.</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        {/* Vendor Name as Dropdown */}
                        <div>
                          <label className="block text-sm font-medium mb-1 text-gray-700">{t('maintenanceApproval.vendorName')}</label>
                          <select
                            value={selectedVendorId !== null ? selectedVendorId : (approvalDetails?.vendorId || "")}
                            onChange={async (e) => {
                              const newVendorId = e.target.value || null;
                              setSelectedVendorId(newVendorId);
                              setVendorStatusError(""); // Clear error when vendor changes
                              console.log("Vendor changed to:", newVendorId);
                              
                              // Save vendor change immediately
                              if (newVendorId && newVendorId !== approvalDetails?.vendorId) {
                                await saveVendorChange(newVendorId);
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                          >
                            <option value="">Select Service Vendor</option>
                            {activeVendors.map(vendor => (
                              <option key={vendor.value} value={vendor.value}>
                                {vendor.label}
                              </option>
                            ))}
                          </select>
                          <p className="text-xs text-gray-500 mt-1">Select another vendor to change service vendor. Changes are saved automatically.</p>
                        </div>
                        <ReadOnlyInput label={t('maintenanceApproval.company')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.company_name || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.email')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.company_email || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.contactNumber')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.contact_person_number || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.gstNumber')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.gst_number || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.cinNumber')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.cin_number || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.addressLine1')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.address_line1 || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.city')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.city || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.state')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.state || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.pincode')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.pincode || "-"} />
                      </div>
                      <div className="grid grid-cols-5 gap-6 mb-6">
                        <ReadOnlyInput label={t('maintenanceApproval.contactPersonName')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.contact_person_name || "-"} />
                        <ReadOnlyInput label={t('maintenanceApproval.contactPersonEmail')} value={(displayedVendorDetails || approvalDetails.vendorDetails)?.contact_person_email || "-"} />
                        <ReadOnlyInput label="Contract Start Date" value={(displayedVendorDetails || approvalDetails.vendorDetails)?.contract_start_date ? new Date((displayedVendorDetails || approvalDetails.vendorDetails).contract_start_date).toLocaleDateString() : "-"} />
                        <ReadOnlyInput label="Contract End Date" value={(displayedVendorDetails || approvalDetails.vendorDetails)?.contract_end_date ? new Date((displayedVendorDetails || approvalDetails.vendorDetails).contract_end_date).toLocaleDateString() : "-"} />
                        <ReadOnlyInput label="Rating" value={(displayedVendorDetails || approvalDetails.vendorDetails)?.rating || (displayedVendorDetails || approvalDetails.vendorDetails)?.vendor_rating || "-"} />
                      </div>

                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {t('maintenanceApproval.noVendorDetailsAvailable')}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'technician' && (
                <div className="bg-white rounded shadow p-6 mb-8">
                  {/* Technician tab - similar to InspectionApprovalDetail behavior */}
                  <>
                    <h3 className="text-lg font-medium mb-4">Technician Details</h3>

                    <div className="mb-4">
                      <label className="block text-sm font-medium mb-1 text-gray-700">Select Technician</label>
                      <select
                        value={selectedTechnician || (assignedTechnician?.emp_int_id || "")}
                        onChange={async (e) => {
                          const newId = e.target.value || null;
                          setSelectedTechnician(newId);
                          if (newId) {
                            const found = technicians.find(t => String(t.emp_int_id) === String(newId));
                            if (found) setAssignedTechnician(found);
                            await saveTechnicianChange(newId);
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none"
                      >
                        <option value="">Select Technician</option>
                        {technicians.map(t => (
                          <option key={t.emp_int_id} value={t.emp_int_id}>{t.full_name} ({t.emp_int_id})</option>
                        ))}
                      </select>
                    </div>

                    {loadingAssignedTechnician ? (
                      <div className="flex items-center text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        <span>Loading assigned technician...</span>
                      </div>
                    ) : assignedTechnician ? (
                      <div className="p-4 bg-white border border-gray-200 rounded-lg">
                        <div className="grid grid-cols-2 gap-4">
                          <ReadOnlyInput label="Name" value={assignedTechnician.full_name} />
                          <ReadOnlyInput label="Employee ID" value={assignedTechnician.emp_int_id} />
                          <ReadOnlyInput label="Email" value={assignedTechnician.email_id || 'N/A'} />
                          <ReadOnlyInput label="Phone" value={assignedTechnician.phone_number || 'N/A'} />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-yellow-800">No technician assigned for this maintenance</p>
                      </div>
                    )}
                  </>
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
                            <span className="font-medium">{t('maintenanceApproval.groupID')}:</span> {assetDetails.group_id || approvalDetails?.groupId || "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.maintenanceScheduleID')}:</span> {assetDetails.maintsch_id || "-"}
                          </div>
                          <div>
                            <span className="font-medium">{t('maintenanceApproval.organizationID')}:</span> {assetDetails.org_id || "-"}
                          </div>
                          {/* Group Maintenance Information */}
                          {approvalDetails?.isGroupMaintenance && approvalDetails?.groupName && (
                            <>
                              <div className="col-span-2 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="flex items-center gap-2 mb-3">
                                  <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-800">
                                    Group Maintenance
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="font-medium">Group Name:</span> {approvalDetails.groupName || "-"}
                                  </div>
                                  <div>
                                    <span className="font-medium">Assets in Group:</span> {approvalDetails.groupAssetCount || "-"}
                                  </div>
                                </div>
                                {approvalDetails?.groupAssets && approvalDetails.groupAssets.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-blue-200">
                                    <p className="text-sm font-medium text-gray-700 mb-2">All Assets:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {(showAllAssets ? approvalDetails.groupAssets : approvalDetails.groupAssets.slice(0, 4)).map((asset, index) => (
                                        <span
                                          key={asset.assetId || index}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 border border-blue-200"
                                        >
                                          {asset.assetName || asset.assetId}
                                          {asset.serialNumber && (
                                            <span className="ml-1 text-gray-500">
                                              ({asset.serialNumber})
                                            </span>
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                    {approvalDetails.groupAssets.length > 4 && (
                                      <button
                                        onClick={() => setShowAllAssets(!showAllAssets)}
                                        className="mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                                      >
                                        {showAllAssets ? 'Show Less' : `Show ${approvalDetails.groupAssets.length - 4} More`}
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
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
                    onClick={() => {
                      // Check vendor status before opening approve modal
                      const currentVendorId = selectedVendorId !== null ? selectedVendorId : approvalDetails?.vendorId;
                      const vendorToCheck = displayedVendorDetails || approvalDetails?.vendorDetails;
                      const vendorStatus = vendorToCheck?.vendor_status || vendorToCheck?.int_status;
                      
                      // If this is inhouse maintenance, ignore vendor status
                      if (!approvalDetails?.maintained_by || !approvalDetails.maintained_by.toLowerCase().includes('inhouse')) {
                        // If vendor is inactive (0) or CR Approved (3), prevent approval
                        if (currentVendorId && (vendorStatus === 0 || vendorStatus === 3)) {
                          toast.error("The specified Service Vendor is Inactive or CR Approved. Please choose another vendor for service.");
                          // Switch to vendor tab to show the message
                          setActiveTab('vendor');
                          setVendorStatusError("The specified Service Vendor is Inactive or CR Approved. Please choose another vendor for service.");
                          return;
                        }
                      }
                      // If no vendor selected, also prevent
                      if (!currentVendorId) {
                        toast.error("Please select a vendor before approving.");
                        setActiveTab('vendor');
                        return;
                      }
                      
                      // Vendor is valid, open approve modal
                      setShowApproveModal(true);
                    }}
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
                          // ROLE-BASED: Show role name instead of user name
                          const roleName = currentActionSteps[0].role?.name || currentActionSteps[0].user?.name;
                          return t('maintenanceApproval.waitingForActionFrom', { userName: `any ${roleName}` });
                        } else {
                          // ROLE-BASED: Show all role names
                          const roleNames = currentActionSteps.map(step => {
                            const roleName = step.role?.name || step.user?.name;
                            return `any ${roleName}`;
                          }).join(', ');
                          return t('maintenanceApproval.waitingForActionFrom', { userName: roleNames });
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