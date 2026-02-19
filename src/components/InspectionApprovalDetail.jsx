import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";

// Keep the same look & feel as ScrapMaintenanceApprovalDetail
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

const InspectionApprovalDetail = () => {
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context") || location.state?.context || "INSPECTIONAPPROVAL";

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
  const [workflowHistory, setWorkflowHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [assetDetails, setAssetDetails] = useState(null);
  const [loadingAssetDetails, setLoadingAssetDetails] = useState(false);
  // Vendor states
  const [vendor, setVendor] = useState(null);
  const [loadingVendor, setLoadingVendor] = useState(false);
  const [activeVendors, setActiveVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState(null);
  const [vendorStatusError, setVendorStatusError] = useState("");
  const [loadingVendorDetails, setLoadingVendorDetails] = useState(false);
  const [displayedVendorDetails, setDisplayedVendorDetails] = useState(null);
  
  // Technician related states
  const [technicians, setTechnicians] = useState([]);
  const [assignedTechnician, setAssignedTechnician] = useState(null);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [loadingAssignedTechnician, setLoadingAssignedTechnician] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await API.get(`/inspection-approval/detail/${id}`);
      if (!res.data?.success) {
        toast.error(res.data?.message || "Failed to load inspection approval");
        setDetail(null);
        return;
      }
      
      // Transform data to match expected structure
      const inspectionData = res.data.data;
      const maintainedBy = inspectionData.header.maintained_by;
      
      setDetail({
        header: {
          ...inspectionData.header,
          wfaiish_id: inspectionData.header.wfaiish_id,
          asset_code: inspectionData.header.asset_code,
          asset_name: inspectionData.header.asset_code, // Use asset_code as asset_name
          asset_type_name: inspectionData.header.asset_type_name,
          asset_type_id: inspectionData.header.asset_type_id,
          created_on: inspectionData.header.created_on,
          created_by: inspectionData.header.created_by,
          header_status: inspectionData.header.status,
          header_status_text: inspectionData.header.status === 'IN' ? 'In Progress' : 
                              inspectionData.header.status === 'AP' ? 'Approved' :
                              inspectionData.header.status === 'CO' ? 'Completed' : 
                              inspectionData.header.status,
          branch_code: inspectionData.header.branch_code,
          branch_name: inspectionData.header.branch_name,
          inspection_frequency: inspectionData.header.inspection_frequency,
          inspection_uom: inspectionData.header.inspection_uom,
          maintained_by: maintainedBy
        },
        assets: [{
          asset_id: inspectionData.header.asset_id,
          asset_name: inspectionData.header.asset_code,
          serial_number: inspectionData.header.serial_number,
          current_status: inspectionData.header.status
        }],
        workflowSteps: inspectionData.approvalLevels || [],
      });
      
      // Fetch technician data: always load certified technicians for this asset type (if available)
      if (inspectionData.header.asset_type_id) {
        fetchCertifiedTechnicians(inspectionData.header.asset_type_id);
      }

      // If header has an assigned technician (inhouse), fetch its details
      if (inspectionData.header.emp_int_id) {
        fetchAssignedTechnician(inspectionData.header.emp_int_id);
      }
    } catch (e) {
      console.error("Failed to load inspection approval detail", e);
      toast.error("Failed to load inspection approval detail");
      setDetail(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowHistory = async () => {
    if (!id) {
      console.log("No inspection ID available to fetch workflow history");
      return;
    }
    
    setLoadingHistory(true);
    try {
      console.log("Fetching workflow history for inspection ID:", id);
      const response = await API.get(`/inspection-approval/history/${id}`);
      console.log("Workflow history API response:", response.data);
      
      if (response.data.success) {
        // Transform history data to match expected format
        const historyData = response.data.data.map(item => ({
          id: item.wfaihis_id,
          date: formatDate(item.action_on),
          action: item.action_display || item.action,
          jobRole: item.job_role_name,
          department: '-',
          notes: item.notes,
          actionColor: item.action === 'UA' || item.action === 'Approved' ? 'text-green-600' : 
                      item.action === 'UR' || item.action === 'Rejected' ? 'text-red-600' : 
                      'text-gray-600'
        }));
        setWorkflowHistory(historyData);
      } else {
        console.error("Failed to fetch workflow history:", response.data.message);
      }
    } catch (error) {
      console.error("Error fetching workflow history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch assigned technician from workflow header (for inhouse maintenance)
  const fetchAssignedTechnician = async (empIntId) => {
    if (!empIntId) {
      console.log("No emp_int_id available to fetch assigned technician");
      return;
    }

    setLoadingAssignedTechnician(true);
    try {
      console.log("Fetching assigned technician for emp_int_id:", empIntId);
      const response = await API.get(`/inspection-approval/technician-header/${empIntId}`);
      console.log("Assigned technician API response:", response.data);
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const technicianData = response.data.data[0];
        setAssignedTechnician(technicianData);
        setSelectedTechnician(technicianData.emp_int_id);
      } else {
        console.error("No technician found for emp_int_id:", empIntId);
        setAssignedTechnician(null);
      }
    } catch (error) {
      console.error("Error fetching assigned technician:", error);
      setAssignedTechnician(null);
    } finally {
      setLoadingAssignedTechnician(false);
    }
  };

  // Fetch certified technicians (for vendor maintenance or technician selection)
  const fetchCertifiedTechnicians = async (assetTypeId) => {
    if (!assetTypeId) {
      console.log("No asset type ID available to fetch technicians");
      return;
    }
    
    setLoadingTechnicians(true);
    try {
      console.log("Fetching certified technicians for asset type:", assetTypeId);
      const response = await API.get(`/inspection-approval/technicians/${assetTypeId}`);
      console.log("Technicians API response:", response.data);
      
      if (response.data.success) {
        setTechnicians(response.data.data || []);
      } else {
        console.error("Failed to fetch technicians:", response.data.message);
        setTechnicians([]);
      }
    } catch (error) {
      console.error("Error fetching technicians:", error);
      setTechnicians([]);
    } finally {
      setLoadingTechnicians(false);
    }
  };

  useEffect(() => {
    fetchDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch vendor when detail or assetDetails change
  useEffect(() => {
    // Prefer vendor info returned with inspection detail (header vendor fields)
    if (detail?.header?.vendor_name) {
      const vd = {
        vendor_id: detail.header.vendor_id,
        vendor_name: detail.header.vendor_name,
        contact_person_name: detail.header.vendor_contact_person,
        contact_person_email: detail.header.vendor_contact_email,
        contact_person_number: detail.header.vendor_contact_number,
        company_email: detail.header.vendor_company_email,
        address_line1: detail.header.vendor_address_line1,
        contract_start_date: detail.header.vendor_contract_start_date,
        contract_end_date: detail.header.vendor_contract_end_date,
        int_status: detail.header.vendor_status || detail.header.vendor_int_status || detail.header.vendor_int_status
      };
      setVendor(vd);
      setDisplayedVendorDetails(vd);
      return;
    }

    const vendorId = assetDetails?.service_vendor_id || assetDetails?.purchase_vendor_id || detail?.header?.vendor_id;
    if (!vendorId) {
      setVendor(null);
      return;
    }

    const fetchVendor = async (vid) => {
      setLoadingVendor(true);
      try {
        const resp = await API.get(`/vendors/vendor/${vid}`);
        if (resp.data?.success) setVendor(resp.data.data);
        else setVendor(null);
      } catch (err) {
        console.error('Error fetching vendor:', err);
        setVendor(null);
      } finally {
        setLoadingVendor(false);
      }
    };

    fetchVendor(vendorId);
  }, [detail?.header?.vendor_id, assetDetails]);

  // When vendor object changes, update displayedVendorDetails and status error
  useEffect(() => {
    if (!vendor) {
      setDisplayedVendorDetails(null);
      setVendorStatusError("");
      return;
    }
    setDisplayedVendorDetails(vendor);
    const status = vendor.vendor_status || vendor.int_status || vendor.vendor_status;
    if (status === 0 || status === 3 || status === '0' || status === '3') {
      setVendorStatusError('The specified Service Vendor is Inactive or CR Approved. Please choose another vendor.');
    } else {
      setVendorStatusError('');
    }
  }, [vendor]);

  // Fetch active service vendors for dropdown (for vendor-maintained inspections)
  useEffect(() => {
    const fetchActiveServiceVendors = async () => {
      try {
        const resp = await API.get('/get-vendors');
        if (resp.data && Array.isArray(resp.data)) {
          const active = resp.data
            .filter(v => v.int_status === 1)
            .map(v => ({ value: v.vendor_id, label: v.vendor_name || v.company_name || v.vendor_id }));
          setActiveVendors(active);
        }
      } catch (e) {
        console.error('Error fetching vendors for dropdown:', e);
      }
    };

    fetchActiveServiceVendors();
  }, []);

  // Save vendor change for inspection header
  const saveVendorChange = async (newVendorId) => {
    if (!detail?.header?.wfaiish_id) return;
    if (!newVendorId) return;
    setLoadingVendorDetails(true);
    try {
      const resp = await API.put(`/inspection-approval/workflow-header/${detail.header.wfaiish_id}`, { vendorId: newVendorId });
      if (resp.data?.success) {
        toast.success('Vendor updated');
        setSelectedVendorId(newVendorId);
        // Refresh detail
        await fetchDetail();
        // Also fetch vendor details to display
        try {
          const vresp = await API.get(`/vendors/vendor/${newVendorId}`);
          if (vresp.data?.success) setDisplayedVendorDetails(vresp.data.data);
        } catch (e) {
          console.error('Error fetching vendor after update:', e);
        }
      } else {
        toast.error(resp.data?.message || 'Failed to update vendor');
      }
    } catch (e) {
      console.error('Error saving inspection vendor change:', e);
      toast.error('Failed to update vendor');
    } finally {
      setLoadingVendorDetails(false);
    }
  };

  // Save technician change to workflow header (persist emp_int_id)
  const saveTechnicianChange = async (newTechnicianId) => {
    if (!detail?.header?.wfaiish_id) return;
    if (!newTechnicianId) return;
    try {
      const resp = await API.put(`/inspection-approval/workflow-header/${detail.header.wfaiish_id}`, { technicianId: newTechnicianId });
      if (resp.data?.success) {
        toast.success('Technician updated');
        // Update local selected and fetch details
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

  // Fetch workflow history when detail is loaded
  useEffect(() => {
    fetchWorkflowHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch asset details when there's a single asset
  useEffect(() => {
    const fetchAssetDetailsFunction = async () => {
      if (!detail?.assets || detail.assets.length !== 1) {
        console.log("Not fetching asset details - either no assets or multiple assets");
        setAssetDetails(null);
        return;
      }

      const assetId = detail.assets[0].asset_id;
      if (!assetId) {
        console.log("No asset ID available");
        return;
      }

      setLoadingAssetDetails(true);
      try {
        console.log("Fetching asset details for asset ID:", assetId);
        const response = await API.get(`/assets/${assetId}`, {
          params: { context: 'INSPECTIONAPPROVAL' }
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

    fetchAssetDetailsFunction();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.assets]);

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
      const seqDiff = Number(a.sequence || a.wf_level || 0) - Number(b.sequence || b.wf_level || 0);
      if (seqDiff !== 0) return seqDiff;
      return String(a.wfaiisd_id || "").localeCompare(String(b.wfaiisd_id || ""));
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

      const date = r.approval_date ? formatDate(r.approval_date) : "";
      const time = r.approval_date ? formatTime(r.approval_date) : "";

      out.push({
        id: r.wfaiisd_id,
        title: roleName,
        status,
        description,
        date,
        time,
        role: { id: r.job_role_id, name: roleName },
        notes: r.comments || null,
      });
    }

    return out;
  }, [detail, userRoleIds]);

  const currentActionSteps = useMemo(() => steps.filter((s) => s.status === "current"), [steps]);

  const isCurrentActionUser = useMemo(() => {
    return currentActionSteps.some((s) => (s.role?.id ? userRoleIds.includes(s.role.id) : false));
  }, [currentActionSteps, userRoleIds]);

  const displayTitle = useMemo(() => {
    if (!detail?.assets || detail.assets.length === 0) {
      return "Inspection Approval";
    }

    // Single asset - show asset name from assetDetails if available, fallback to asset_type_name
    if (detail.assets.length === 1) {
      const assetName = assetDetails?.asset_name || 
                       assetDetails?.description || 
                       detail.header?.asset_type_name || 
                       detail.assets[0].asset_id || 
                       "Inspection Approval";
      return assetName;
    }

    // Multiple assets
    const assetNames = detail.assets.map(a => 
      assetDetails?.asset_name || 
      assetDetails?.description ||
      detail.header?.asset_type_name ||
      a.asset_id
    ).filter(Boolean).join(", ");
    return assetNames ? `Inspection Approval (${assetNames})` : "Inspection Approval";
  }, [detail, assetDetails]);

  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    
    // Check if technician selection/assignment is required
    const maintainedBy = detail?.header?.maintained_by;
    const isInternalMaintenance = maintainedBy && maintainedBy.toLowerCase() === 'inhouse';
    const isVendorMaintenance = maintainedBy && maintainedBy.toLowerCase() === 'vendor';
    
    // Validation for internal maintenance - check if technician is assigned
    if (isInternalMaintenance) {
      if (!assignedTechnician && !selectedTechnician) {
        toast.error('Technician assignment is required for internal maintenance inspections.');
        return;
      }
    } else if (isVendorMaintenance) {
      // Validation for vendor maintenance - check if technician is selected
      if (technicians.length > 0 && !selectedTechnician) {
        toast.error('Please select a technician to proceed with the approval.');
        return;
      }
    }
    
    // Find current step
    const currentStep = detail?.workflowSteps?.find(step => step.status === 'AP');
    if (!currentStep) {
      toast.error("No pending step found for approval");
      return;
    }

    setIsSubmitting(true);
    let toastId = null;
    try {
      toastId = toast.loading("Approving inspection...", { duration: Infinity });
      
      const requestBody = {
        action: 'APPROVE',
        wfaiisd_id: currentStep.wfaiisd_id,
        comments: approveNote,
        wfaiish_id: id
      };
      
      // Add technician ID if selected
      if (selectedTechnician) {
        requestBody.technicianId = selectedTechnician;
      }
      
      const res = await API.post("/inspection-approval/action", requestBody);
      if (toastId) toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success(res.data?.message || "Approved");
        setShowApproveModal(false);
        setApproveNote("");
        setSelectedTechnician("");
        await fetchDetail();
        await fetchWorkflowHistory();
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
    
    // Find current step
    const currentStep = detail?.workflowSteps?.find(step => step.status === 'AP');
    if (!currentStep) {
      toast.error("No pending step found for rejection");
      return;
    }

    setIsSubmitting(true);
    let toastId = null;
    try {
      toastId = toast.loading("Rejecting inspection...", { duration: Infinity });
      const res = await API.post("/inspection-approval/action", {
        action: 'REJECT',
        wfaiisd_id: currentStep.wfaiisd_id,
        comments: rejectNote,
        wfaiish_id: id
      });
      if (toastId) toast.dismiss(toastId);
      if (res.data?.success) {
        toast.success(res.data?.message || "Rejected");
        setShowRejectModal(false);
        setRejectNote("");
        await fetchDetail();
        await fetchWorkflowHistory();
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
        <div className="text-red-600 font-medium">Inspection approval not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] p-4">
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">
              {displayTitle}
            </h2>
          </div>

          {/* Progress Steps (same UI as scrap maintenance approval) */}
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

          {/* Tabs (same style as scrap maintenance) */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {(() => {
                const maintainedBy = detail?.header?.maintained_by;
                const baseTabs = ["approval", "asset"];
                
                // Add technician or vendor tab based on maintained_by
                if (maintainedBy && maintainedBy.toLowerCase() === 'inhouse') {
                  baseTabs.push("technician");
                } else {
                  baseTabs.push("vendor");
                }
                
                baseTabs.push("history");
                
                return baseTabs.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm
                      ${activeTab === tab
                        ? "border-[#0E2F4B] text-[#0E2F4B]"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                  >
                    {tab === "approval" ? "Approval Details" : 
                     tab === "asset" ? "Asset Details" : 
                     tab === "technician" ? "Technician Details" :
                     tab === "vendor" ? "Vendor Details" :
                     "History Details"}
                  </button>
                ));
              })()}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "approval" && (
              <div className="bg-white rounded shadow p-6 mb-8">
                <div className="grid grid-cols-5 gap-6 mb-6">
                  <ReadOnlyInput label="Alert Type" value="Inspection Request" />
                  <ReadOnlyInput label="Created On" value={formatDate(detail.header.created_on)} />
                  <ReadOnlyInput label="Action By" value={currentActionSteps[0]?.role?.name || "Unassigned"} />
                  <ReadOnlyInput label="Frequency" value={`${detail.header.inspection_frequency || 'Monthly'} ${detail.header.inspection_uom || 'Month'}`} />
                  <ReadOnlyInput label="Asset Type" value={detail.header.asset_type_name || "-"} />
                  <ReadOnlyInput label="Asset Code" value={detail.header.asset_code || "-"} />
                  <ReadOnlyInput label="Scheduled Date" value={formatDate(detail.header.pl_sch_date)} />
                  <ReadOnlyInput label="Inspection ID" value={detail.header.wfaiish_id || "-"} />
                  <ReadOnlyInput label="Branch" value={detail.header.branch_name || detail.header.branch_code || "-"} />
                  <ReadOnlyInput label="Status" value={detail.header.header_status_text || detail.header.header_status || "-"} />
                </div>
              </div>
            )}

            {activeTab === "asset" && (
              <div className="bg-white rounded shadow p-6">
                {loadingAssetDetails ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading asset details...</p>
                  </div>
                ) : detail.assets.length === 1 && assetDetails ? (
                  <>
                    <div className="grid grid-cols-5 gap-6 mb-6">
                      <ReadOnlyInput label="Asset Type" value={assetDetails.asset_type_id || "-"} />
                      <ReadOnlyInput label="Serial Number" value={assetDetails.serial_number || "-"} />
                      <ReadOnlyInput label="Asset ID" value={assetDetails.asset_id || "-"} />
                      <ReadOnlyInput label="Asset Name" value={detail.header.asset_name || detail.header.asset_code || "-"} />
                      <ReadOnlyInput label="Expiry Date" value={formatDate(assetDetails.expiry_date) || "-"} />
                    </div>
                    <div className="grid grid-cols-5 gap-6 mb-6">
                      <ReadOnlyInput label="Purchase Date" value={formatDate(assetDetails.purchased_on) || "-"} />
                      <ReadOnlyInput label="Purchase Cost" value={assetDetails.purchased_cost || "-"} />
                      <ReadOnlyInput label="Purchase By" value={assetDetails.purchased_by || "-"} />
                      <ReadOnlyInput label="Purchase Vendor" value={assetDetails.purchase_vendor_id || "-"} />
                      <ReadOnlyInput label="Warranty Period" value={assetDetails.warranty_period || "-"} />
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <ReadOnlyInput label="Product/Service ID" value={assetDetails.prod_serv_id || "-"} />
                      <ReadOnlyInput label="Parent Asset" value={assetDetails.parent_asset_id || "-"} />
                      <ReadOnlyInput label="Service Vendor" value={assetDetails.service_vendor_id || "-"} />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm mb-1 font-medium text-gray-700">Description</label>
                      <textarea
                        value={assetDetails.description || "-"}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm text-gray-700 cursor-not-allowed focus:outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm mb-1 font-medium text-gray-700">Additional Info</label>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Branch ID:</span> {assetDetails.branch_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Group ID:</span> {assetDetails.group_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Inspection ID:</span> {detail.header.wfaiish_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Organization ID:</span> {assetDetails.org_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">Status:</span> {assetDetails.current_status || "-"}
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

            {activeTab === "technician" && (
              <div className="bg-white rounded shadow p-6 mb-8">
                {(() => {
                  const maintainedBy = detail?.header?.maintained_by;
                  const isInhouse = maintainedBy && maintainedBy.toLowerCase() === 'inhouse';
                  
                  if (isInhouse) {
                    // Show assigned technician with the ability to change from available certified technicians
                    return (
                      <>
                        <h3 className="text-lg font-medium mb-4">Assigned Technician (Inhouse Maintenance)</h3>

                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1 text-gray-700">Select Technician</label>
                          <select
                            value={selectedTechnician || (assignedTechnician?.emp_int_id || "")}
                            onChange={async (e) => {
                              const newId = e.target.value || null;
                              setSelectedTechnician(newId);
                              if (newId) {
                                // find details locally first
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
                              <ReadOnlyInput label="Certification" value={assignedTechnician.cert_name || '-'} />
                              <ReadOnlyInput label="Cert Number" value={assignedTechnician.cert_number || '-'} />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">No technician assigned for this inspection</p>
                          </div>
                        )}
                      </>
                    );
                  }

                  // Vendor-maintained: allow selection from certified technicians and show details
                  return (
                    <>
                      <h3 className="text-lg font-medium mb-4">Select Technician (Certified for this Asset Type)</h3>

                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700">Select Technician</label>
                        <select
                          value={selectedTechnician || ""}
                          onChange={async (e) => {
                            const newId = e.target.value || null;
                            setSelectedTechnician(newId);
                            if (newId) {
                              const found = technicians.find(t => String(t.emp_int_id) === String(newId));
                              if (found) setAssignedTechnician(found);
                              await saveTechnicianChange(newId);
                            } else {
                              setAssignedTechnician(null);
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

                      {loadingTechnicians ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                          <p className="text-gray-500 mt-2">Loading certified technicians...</p>
                        </div>
                      ) : (
                        <>
                          {assignedTechnician ? (
                            <div className="p-4 bg-white border border-gray-200 rounded-lg mb-4">
                              <div className="grid grid-cols-2 gap-4">
                                <ReadOnlyInput label="Name" value={assignedTechnician.full_name} />
                                <ReadOnlyInput label="Employee ID" value={assignedTechnician.emp_int_id} />
                                <ReadOnlyInput label="Email" value={assignedTechnician.email_id || '-'} />
                                <ReadOnlyInput label="Phone" value={assignedTechnician.phone_number || '-'} />
                                <ReadOnlyInput label="Certification" value={assignedTechnician.cert_name || '-'} />
                                <ReadOnlyInput label="Cert Number" value={assignedTechnician.cert_number || '-'} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-lg mb-2">No technician selected</p>
                            </div>
                          )}

                          {technicians.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Name</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Email</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Phone</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Certification</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Cert Number</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Expiry</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {technicians.map((tech, idx) => (
                                    <tr key={tech.emp_int_id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.full_name}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.email_id || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.phone_number || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.cert_name || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.cert_number || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.expiry_date ? formatDate(tech.expiry_date) : "No Expiry"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === "vendor" && (
              <div className="bg-white rounded shadow p-6 mb-8">
                {loadingVendor ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                    <p className="text-gray-500 mt-2">Loading vendor details...</p>
                  </div>
                ) : (
                  <>
                    {/* Vendor selection always visible */}
                    <div className="mb-4">
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
                              <p className="text-yellow-700 text-xs mt-1">Please select an active service vendor from the dropdown below to proceed with approval.</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="block text-sm font-medium mb-1 text-gray-700">Service Vendor</label>
                      <select
                        value={selectedVendorId !== null ? selectedVendorId : (displayedVendorDetails?.vendor_id || "")}
                        onChange={async (e) => {
                          const newVid = e.target.value || null;
                          setSelectedVendorId(newVid);
                          setVendorStatusError("");
                          if (newVid) {
                            await saveVendorChange(newVid);
                            try {
                              const vresp = await API.get(`/vendors/vendor/${newVid}`);
                              if (vresp.data?.success) setDisplayedVendorDetails(vresp.data.data);
                            } catch (err) {
                              console.error('Error fetching vendor after select:', err);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none mb-3"
                      >
                        <option value="">Select Service Vendor</option>
                        {activeVendors.map(v => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    {displayedVendorDetails ? (
                      <div className="grid grid-cols-2 gap-6">
                        <ReadOnlyInput label="Vendor ID" value={displayedVendorDetails.vendor_id || '-'} />
                        <ReadOnlyInput label="Vendor Name" value={displayedVendorDetails.vendor_name || displayedVendorDetails.company_name || '-'} />
                        <ReadOnlyInput label="Contact Person" value={displayedVendorDetails.contact_person_name || '-'} />
                        <ReadOnlyInput label="Contact Email" value={displayedVendorDetails.contact_person_email || displayedVendorDetails.company_email || '-'} />
                        <ReadOnlyInput label="Contact Phone" value={displayedVendorDetails.contact_person_number || '-'} />
                        <ReadOnlyInput label="Contract From" value={displayedVendorDetails.contract_start_date ? formatDate(displayedVendorDetails.contract_start_date) : '-'} />
                        <ReadOnlyInput label="Contract To" value={displayedVendorDetails.contract_end_date ? formatDate(displayedVendorDetails.contract_end_date) : '-'} />
                        <ReadOnlyInput label="Address" value={`${displayedVendorDetails.address_line1 || ''} ${displayedVendorDetails.address_line2 || ''} ${displayedVendorDetails.city || ''}`.trim() || '-'} />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-lg mb-2">No vendor information available</p>
                        {detail?.header?.asset_type_name && (
                          <p className="text-sm mt-2">Asset Type: {detail.header.asset_type_name}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === "history" && (
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
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Job Role</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Department</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowHistory.map((row, idx) => (
                          <tr key={row.id || idx} className="bg-white border border-gray-200 rounded-md shadow-sm">
                            <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.date}</td>
                            <td className={`px-6 py-3 text-sm whitespace-nowrap font-medium ${row.actionColor || 'text-gray-600'}`}>{row.action}</td>
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
                  <h3 className="text-lg font-semibold">Reject Inspection Request</h3>
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
                  <h3 className="text-lg font-semibold">Approve Inspection Request</h3>
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
                  
                  {/* Technician Dropdown - Only show if maintained internally and technicians are available */}
                  {detail?.header?.maintained_by && 
                   (detail.header.maintained_by.toLowerCase() === 'internal' || detail.header.maintained_by.toLowerCase() === 'inhouse') && 
                   technicians.length > 0 && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Technician <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={selectedTechnician}
                        onChange={(e) => setSelectedTechnician(e.target.value)}
                        className={`w-full px-3 py-2 border rounded focus:outline-none ${
                          !selectedTechnician && isSubmitting ? "border-red-500" : "border-gray-300"
                        }`}
                      >
                        <option value="">Select a certified technician...</option>
                        {technicians.map((tech) => (
                          <option key={tech.emp_int_id} value={tech.emp_int_id}>
                            {tech.full_name} - {tech.cert_name || 'No Certification'}
                          </option>
                        ))}
                      </select>
                      {!selectedTechnician && isSubmitting && (
                        <div className="text-red-500 text-xs mt-1">Please select a technician</div>
                      )}
                    </div>
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
                      disabled={
                        !approveNote.trim() || 
                        isSubmitting ||
                        (detail?.header?.maintained_by && 
                         (detail.header.maintained_by.toLowerCase() === 'internal' || detail.header.maintained_by.toLowerCase() === 'inhouse') &&
                         technicians.length > 0 && 
                         !selectedTechnician)
                      }
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

export default InspectionApprovalDetail;
