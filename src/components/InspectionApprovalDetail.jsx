import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams, useSearchParams } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import { Clock, CheckCircle2 } from "lucide-react";
import API from "../lib/axios";
import { useAuthStore } from "../store/useAuthStore";
import { getAppLocale, translateJobRoleName } from "../utils/jobRoleTranslations";

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

const getStepColor = (status, isInitStep) => {
  if (isInitStep) return "bg-[#2196F3]";
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

const formatDate = (dateString, locale) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale);
};

const formatTime = (dateString, locale) => {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
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
  const { t, i18n } = useTranslation();
  const ia = (key, options) => t(`inspectionApproval.${key}`, options);
  const ma = (key, options) => t(`maintenanceApproval.${key}`, options);

  const translateHeaderStatus = (status) => {
    switch (status) {
      case "IN":
        return ia("inProgress");
      case "AP":
        return ia("approved");
      case "CO":
        return ia("statusCompleted");
      case "CA":
        return t("vendorRenewalApproval.cancelled");
      case "UR":
        return ia("rejected");
      default:
        return status;
    }
  };

  const translateUomText = (uomText) => {
    if (!uomText) return uomText;
    if (String(uomText).toLowerCase() === "days") return ia("daysUom");
    return uomText;
  };

  const translateWorkflowAction = (action) => {
    const normalized = String(action || "").toLowerCase();
    if (normalized === "approved" || action === "UA") return ia("approved");
    if (normalized === "rejected" || action === "UR") return ia("rejected");
    return action;
  };

  const appLocale = getAppLocale(i18n.language);
  const trRole = (name, id) => translateJobRoleName(t, name, id);
  const fmtDate = (dateString) => formatDate(dateString, appLocale);
  const fmtTime = (dateString) => formatTime(dateString, appLocale);
  const { id } = useParams();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const context = searchParams.get("context") || location.state?.context || "INSPECTIONAPPROVAL";

  const { user } = useAuthStore();
  const [userRoleIds, setUserRoleIds] = useState([]);

  useEffect(() => {
    const loadUserRoleIds = async () => {
      const ids = new Set();
      (user?.roles || []).forEach((role) => {
        if (role?.job_role_id) ids.add(role.job_role_id);
      });
      if (user?.job_role_id) ids.add(user.job_role_id);

      if (user?.user_id) {
        try {
          const res = await API.get(`/employees/users/${user.user_id}/roles`);
          (res.data?.data || []).forEach((role) => {
            if (role?.job_role_id) ids.add(role.job_role_id);
          });
        } catch (err) {
          console.warn("Could not refresh user roles for inspection approval:", err);
        }
      }

      setUserRoleIds([...ids]);
    };

    if (user) {
      loadUserRoleIds();
    } else {
      setUserRoleIds([]);
    }
  }, [user]);

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
        showBackendTextToast({
          toast,
          tmdId: 'TMD_FAILED_TO_LOAD_INSPECTION_APPROVAL_FAAEA185',
          fallbackText: res.data?.message || ia("failedToLoad"),
          type: 'error',
        });
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
          header_status_text: translateHeaderStatus(inspectionData.header.status),
          branch_code: inspectionData.header.branch_code,
          branch_name: inspectionData.header.branch_name,
          inspection_frequency: inspectionData.header.inspection_frequency,
          inspection_uom: inspectionData.header.inspection_uom,
          inspection_uom_text: inspectionData.header.inspection_uom_text,
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
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_INSPECTION_APPROVAL_DETAIL_0EE1C166', fallbackText: ia('failedToLoadDetail'), type: 'error' });
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
          actionOn: item.action_on,
          actionKey: item.action_display || item.action,
          jobRole: item.job_role_name,
          jobRoleId: item.job_role_id,
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
      setVendorStatusError(ia('vendorInactiveMessage'));
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
        showBackendTextToast({ toast, tmdId: 'TMD_VENDOR_UPDATED_525C2603', fallbackText: ia('vendorUpdated'), type: 'success' });
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
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_VENDOR_3F2744FD', fallbackText: resp.data?.message || ia('failedToUpdateVendor'), type: 'error' });
      }
    } catch (e) {
      console.error('Error saving inspection vendor change:', e);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_VENDOR_3F2744FD', fallbackText: ia('failedToUpdateVendor'), type: 'error' });
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
        showBackendTextToast({ toast, tmdId: 'TMD_TECHNICIAN_UPDATED_2F615E1F', fallbackText: ia('technicianUpdated'), type: 'success' });
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
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_TECHNICIAN_6DD97967', fallbackText: resp.data?.message || ia('failedToUpdateTechnician'), type: 'error' });
      }
    } catch (e) {
      console.error('Error saving technician change:', e);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_TECHNICIAN_6DD97967', fallbackText: ia('failedToUpdateTechnician'), type: 'error' });
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

    const initDate = fmtDate(detail.header.created_on);
    const initTime = fmtTime(detail.header.created_on);

    const out = [
      {
        id: "init",
        title: ia("approvalInitiated"),
        isInitStep: true,
        status: "completed",
        description: ia("initiatedBy", {
          name:
            !detail.header.created_by || String(detail.header.created_by).toUpperCase() === "SYSTEM"
              ? ia("system")
              : detail.header.created_by,
        }),
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
      const roleName = trRole(r.job_role_name, r.job_role_id);

      const description =
        status === "current"
          ? canThisUserApprove
            ? ia("awaitingApprovalFromYou")
            : ia("awaitingApprovalFrom", { roleName })
          : status === "approved"
            ? ia("approvedBy", { roleName })
            : status === "rejected"
              ? ia("rejectedBy", { roleName })
              : ia("awaitingRole", { roleName });

      const date = r.approval_date ? fmtDate(r.approval_date) : "";
      const time = r.approval_date ? fmtTime(r.approval_date) : "";

      out.push({
        id: r.wfaiisd_id,
        title: roleName,
        isInitStep: false,
        status,
        description,
        date,
        time,
        role: { id: r.job_role_id, name: roleName },
        notes: r.comments || null,
      });
    }

    return out;
  }, [detail, userRoleIds, t, i18n.language]);

  const currentActionSteps = useMemo(() => steps.filter((s) => s.status === "current"), [steps]);

  const isCurrentActionUser = useMemo(() => {
    return currentActionSteps.some((s) => (s.role?.id ? userRoleIds.includes(s.role.id) : false));
  }, [currentActionSteps, userRoleIds]);

  const displayTitle = useMemo(() => {
    if (!detail?.assets || detail.assets.length === 0) {
      return ia("title");
    }

    // Single asset - show asset name from assetDetails if available, fallback to asset_type_name
    if (detail.assets.length === 1) {
      const assetName = assetDetails?.asset_name || 
                       assetDetails?.description || 
                       detail.header?.asset_type_name || 
                       detail.assets[0].asset_id || 
                       ia("title");
      return assetName;
    }

    // Multiple assets
    const assetNames = detail.assets.map(a => 
      assetDetails?.asset_name || 
      assetDetails?.description ||
      detail.header?.asset_type_name ||
      a.asset_id
    ).filter(Boolean).join(", ");
    return assetNames ? `${ia("title")} (${assetNames})` : ia("title");
  }, [detail, assetDetails, t, i18n.language]);

  const handleApprove = async () => {
    if (!approveNote.trim()) return;
    
    // Check if technician selection/assignment is required
    const maintainedBy = detail?.header?.maintained_by;
    const isInternalMaintenance = maintainedBy && maintainedBy.toLowerCase() === 'inhouse';
    const isVendorMaintenance = maintainedBy && maintainedBy.toLowerCase() === 'vendor';
    
    // Validation for internal maintenance - check if technician is assigned
    if (isInternalMaintenance) {
      if (!assignedTechnician && !selectedTechnician) {
        showBackendTextToast({ toast, tmdId: 'TMD_TECHNICIAN_ASSIGNMENT_IS_REQUIRED_FOR_INTERNAL_MAINT_2698B69A', fallbackText: ia('technicianRequired'), type: 'error' });
        return;
      }
    } else if (isVendorMaintenance) {
      // Validation for vendor maintenance - check if technician is selected
      if (technicians.length > 0 && !selectedTechnician) {
        showBackendTextToast({ toast, tmdId: 'TMD_PLEASE_SELECT_A_TECHNICIAN_TO_PROCEED_WITH_THE_APPRO_5E6998D6', fallbackText: ia('selectTechnicianToProceed'), type: 'error' });
        return;
      }
    }
    
    // Find current step
    const currentStep = detail?.workflowSteps?.find(step => step.status === 'AP');
    if (!currentStep) {
      showBackendTextToast({ toast, tmdId: 'TMD_NO_PENDING_STEP_FOUND_FOR_APPROVAL_00A1A05C', fallbackText: ia('noPendingStepForApproval'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    let toastId = null;
    try {
      const loadingToastId = `inspection-approve-loading-${id}`;
      toastId = showBackendTextToast({
        toast,
        tmdId: 'TMD_APPROVING_INSPECTION_IN_PROGRESS_2696953C',
        fallbackText: ia("approvingInspection"),
        type: 'loading',
        toastOptions: { duration: Infinity, id: loadingToastId },
      });
      if (!toastId) toastId = loadingToastId;
      
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
        showBackendTextToast({ toast, tmdId: 'TMD_INSPECTION_APPROVED_SUCCESSFULLY_396498FA', fallbackText: ia('inspectionApprovedSuccessfully'), type: 'success' });
        setShowApproveModal(false);
        setApproveNote("");
        setSelectedTechnician("");
        await fetchDetail();
        await fetchWorkflowHistory();
      } else {
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_APPROVE_INSPECTION_476A2BD6', fallbackText: res.data?.message || ia("failedToApprove"), type: 'error' });
      }
    } catch (e) {
      if (toastId) toast.dismiss(toastId);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_APPROVE_INSPECTION_476A2BD6', fallbackText: e.response?.data?.message || ia("failedToApprove"), type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) return;
    
    // Find current step
    const currentStep = detail?.workflowSteps?.find(step => step.status === 'AP');
    if (!currentStep) {
      showBackendTextToast({ toast, tmdId: 'TMD_NO_PENDING_STEP_FOUND_FOR_REJECTION_05F24138', fallbackText: ia('noPendingStepForRejection'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    let toastId = null;
    try {
      const loadingToastId = `inspection-reject-loading-${id}`;
      toastId = showBackendTextToast({
        toast,
        tmdId: 'TMD_REJECTING_INSPECTION_IN_PROGRESS_96661A83',
        fallbackText: ia("rejectingInspection"),
        type: 'loading',
        toastOptions: { duration: Infinity, id: loadingToastId },
      });
      if (!toastId) toastId = loadingToastId;
      const res = await API.post("/inspection-approval/action", {
        action: 'REJECT',
        wfaiisd_id: currentStep.wfaiisd_id,
        comments: rejectNote,
        wfaiish_id: id
      });
      if (toastId) toast.dismiss(toastId);
      if (res.data?.success) {
        showBackendTextToast({ toast, tmdId: 'TMD_INSPECTION_REJECTED_SUCCESSFULLY_1F1F9603', fallbackText: res.data?.message || ia("inspectionRejectedSuccessfully"), type: 'success' });
        setShowRejectModal(false);
        setRejectNote("");
        await fetchDetail();
        await fetchWorkflowHistory();
      } else {
        showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_REJECT_INSPECTION_DB1F3FF5', fallbackText: res.data?.message || ia("failedToReject"), type: 'error' });
      }
    } catch (e) {
      if (toastId) toast.dismiss(toastId);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_REJECT_INSPECTION_DB1F3FF5', fallbackText: e.response?.data?.message || ia("failedToReject"), type: 'error' });
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
        <div className="text-red-600 font-medium">{ia("detailNotFound")}</div>
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
                <div key={step.id} className={`arrow-step ${getStepColor(step.status, step.isInitStep)} text-white`}>
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
                      <strong>{ia("reason")}:</strong> {step.notes}
                    </p>
                  )}
                  {step.notes && step.status === "approved" && (
                    <p className="text-xs text-green-600 mt-1">
                      <strong>{ia("notes")}:</strong> {step.notes}
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
                    {tab === "approval" ? ma('approvalDetails') : 
                     tab === "asset" ? ma('assetDetails') : 
                     tab === "technician" ? ma('technicianDetails') :
                     tab === "vendor" ? ma('vendorDetails') :
                     ma('historyDetails')}
                  </button>
                ));
              })()}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "approval" && (
              <div className="bg-white rounded shadow p-6 mb-8">
                <div className="grid grid-cols-5 gap-6 mb-6">
                  <ReadOnlyInput label={ia("alertType")} value={ia("inspectionRequest")} />
                  <ReadOnlyInput label={ia("createdOn")} value={fmtDate(detail.header.created_on)} />
                  <ReadOnlyInput label={ia("actionBy")} value={currentActionSteps[0]?.role ? trRole(currentActionSteps[0].role.name, currentActionSteps[0].role.id) : ia("unassigned")} />
                  <ReadOnlyInput label={ia("frequency")} value={[detail.header.inspection_frequency, translateUomText(detail.header.inspection_uom_text || detail.header.inspection_uom)].filter(Boolean).join(' ') || '—'} />
                  <ReadOnlyInput label={ia("assetType")} value={detail.header.asset_type_name || "-"} />
                  <ReadOnlyInput label={ia("assetCode")} value={detail.header.asset_code || "-"} />
                  <ReadOnlyInput label={ia("scheduledDate")} value={fmtDate(detail.header.pl_sch_date)} />
                  <ReadOnlyInput label={ia("inspectionId")} value={detail.header.wfaiish_id || "-"} />
                  <ReadOnlyInput label={ia("branch")} value={detail.header.branch_name || detail.header.branch_code || "-"} />
                  <ReadOnlyInput label={ia("status")} value={translateHeaderStatus(detail.header.header_status) || detail.header.header_status || "-"} />
                </div>
              </div>
            )}

            {activeTab === "asset" && (
              <div className="bg-white rounded shadow p-6">
                {loadingAssetDetails ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                    <p className="text-gray-500 mt-2">{ia("loadingAssetDetails")}</p>
                  </div>
                ) : detail.assets.length === 1 && assetDetails ? (
                  <>
                    <div className="grid grid-cols-5 gap-6 mb-6">
                      <ReadOnlyInput label={ia("assetType")} value={assetDetails.asset_type_name || assetDetails.asset_type_id || "-"} />
                      <ReadOnlyInput label={ia("serialNumber")} value={assetDetails.serial_number || "-"} />
                      <ReadOnlyInput label={ia("assetId")} value={assetDetails.asset_id || "-"} />
                      <ReadOnlyInput label={ia("assetName")} value={assetDetails.description || detail.header.asset_name || detail.header.asset_code || "-"} />
                      <ReadOnlyInput label={ma("expiryDate")} value={fmtDate(assetDetails.expiry_date) || "-"} />
                    </div>
                    <div className="grid grid-cols-5 gap-6 mb-6">
                      <ReadOnlyInput label={ma("purchaseDate")} value={fmtDate(assetDetails.purchased_on) || "-"} />
                      <ReadOnlyInput label={ma("purchaseCost")} value={assetDetails.purchased_cost || "-"} />
                      <ReadOnlyInput label={ma("purchaseBy")} value={assetDetails.purchased_by_name || assetDetails.purchased_by || "-"} />
                      <ReadOnlyInput label={ma("purchaseVendor")} value={assetDetails.purchase_vendor_name || assetDetails.purchase_vendor_id || "-"} />
                      <ReadOnlyInput label={ma("warrantyPeriod")} value={fmtDate(assetDetails.warranty_period) || "-"} />
                    </div>
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <ReadOnlyInput label={ma("productServiceID")} value={assetDetails.prod_serv_id || "-"} />
                      <ReadOnlyInput label={ma("parentAsset")} value={assetDetails.parent_asset_id || "-"} />
                      <ReadOnlyInput label={ma("serviceVendor")} value={assetDetails.service_vendor_name || assetDetails.service_vendor_id || "-"} />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm mb-1 font-medium text-gray-700">{ma("description")}</label>
                      <textarea
                        value={assetDetails.description || "-"}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-100 text-sm text-gray-700 cursor-not-allowed focus:outline-none"
                        rows={3}
                      />
                    </div>
                    <div className="mb-6">
                      <label className="block text-sm mb-1 font-medium text-gray-700">{ma("additionalInfo")}</label>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">{ia("branchName")}:</span> {assetDetails.branch_name || assetDetails.branch_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">{ma("groupID")}:</span> {assetDetails.group_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">{ia("inspectionId")}:</span> {detail.header.wfaiish_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">{ia("orgName")}:</span> {assetDetails.org_name || assetDetails.org_id || "-"}
                        </div>
                        <div>
                          <span className="font-medium">{ia("status")}:</span>{' '}
                          <span className={String(assetDetails.current_status || '').toLowerCase() === 'active' ? 'text-green-600 font-medium' : String(assetDetails.current_status || '').toLowerCase() === 'inactive' ? 'text-red-600 font-medium' : ''}>
                            {assetDetails.current_status || "-"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {ia("noAssetDetailsAvailable")}
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
                        <h3 className="text-lg font-medium mb-4">{ia("assignedTechnicianInhouse")}</h3>

                        <div className="mb-4">
                          <label className="block text-sm font-medium mb-1 text-gray-700">{ia("selectTechnician")}</label>
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
                            <option value="">{ia("selectTechnician")}</option>
                            {technicians.map(tech => (
                              <option key={tech.emp_int_id} value={tech.emp_int_id}>{tech.full_name || tech.name}</option>
                            ))}
                          </select>
                        </div>

                        {loadingAssignedTechnician ? (
                          <div className="flex items-center text-blue-600">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                            <span>{ia("loadingAssignedTechnician")}</span>
                          </div>
                        ) : assignedTechnician ? (
                          <div className="p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-4">
                              <ReadOnlyInput label={ia("name")} value={assignedTechnician.full_name} />
                              <ReadOnlyInput label={ia("employeeId")} value={assignedTechnician.emp_int_id} />
                              <ReadOnlyInput label={ma("email")} value={assignedTechnician.email_id || ia('notAvailable')} />
                              <ReadOnlyInput label={ia("phone")} value={assignedTechnician.phone_number || ia('notAvailable')} />
                            </div>
                          </div>
                        ) : (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800">{ia("noTechnicianAssigned")}</p>
                          </div>
                        )}
                      </>
                    );
                  }

                  // Vendor-maintained: allow selection from certified technicians and show details
                  return (
                    <>
                      <h3 className="text-lg font-medium mb-4">{ia("selectCertifiedTechnician")}</h3>

                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-1 text-gray-700">{ia("selectTechnician")}</label>
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
                          <option value="">{ia("selectTechnician")}</option>
                          {technicians.map(tech => (
                            <option key={tech.emp_int_id} value={tech.emp_int_id}>{tech.full_name || tech.name}</option>
                          ))}
                        </select>
                      </div>

                      {loadingTechnicians ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E2F4B] mx-auto"></div>
                          <p className="text-gray-500 mt-2">{ia("loadingCertifiedTechnicians")}</p>
                        </div>
                      ) : (
                        <>
                          {assignedTechnician ? (
                            <div className="p-4 bg-white border border-gray-200 rounded-lg mb-4">
                              <div className="grid grid-cols-2 gap-4">
                                <ReadOnlyInput label={ia("name")} value={assignedTechnician.full_name} />
                                <ReadOnlyInput label={ia("employeeId")} value={assignedTechnician.emp_int_id} />
                                <ReadOnlyInput label={ma("email")} value={assignedTechnician.email_id || '-'} />
                                <ReadOnlyInput label={ia("phone")} value={assignedTechnician.phone_number || '-'} />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              <p className="text-lg mb-2">{ia("noTechnicianSelected")}</p>
                            </div>
                          )}

                          {technicians.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="min-w-full border border-gray-200 rounded-lg">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">{ia("name")}</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">{ma("email")}</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">{ia("phone")}</th>
                                    <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">{ia("expiry")}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {technicians.map((tech, idx) => (
                                    <tr key={tech.emp_int_id || idx} className="border-b border-gray-200 hover:bg-gray-50">
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.full_name}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.email_id || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.phone_number || "-"}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{tech.expiry_date ? fmtDate(tech.expiry_date) : ia("noExpiry")}</td>
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
                    <p className="text-gray-500 mt-2">{ia("loadingVendorDetails")}</p>
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
                              <p className="text-yellow-700 text-xs mt-1">{ia("selectActiveVendor")}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <label className="block text-sm font-medium mb-1 text-gray-700">{ma("serviceVendor")}</label>
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
                        <option value="">{ia("selectServiceVendor")}</option>
                        {activeVendors.map(v => (
                          <option key={v.value} value={v.value}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    {displayedVendorDetails ? (
                      <div className="grid grid-cols-2 gap-6">
                        <ReadOnlyInput label={ia("vendorId")} value={displayedVendorDetails.vendor_id || '-'} />
                        <ReadOnlyInput label={ma("vendorName")} value={displayedVendorDetails.vendor_name || displayedVendorDetails.company_name || '-'} />
                        <ReadOnlyInput label={ia("contactPerson")} value={displayedVendorDetails.contact_person_name || '-'} />
                        <ReadOnlyInput label={ia("contactEmail")} value={displayedVendorDetails.contact_person_email || displayedVendorDetails.company_email || '-'} />
                        <ReadOnlyInput label={ia("contactPhone")} value={displayedVendorDetails.contact_person_number || '-'} />
                        <ReadOnlyInput label={ia("contractFrom")} value={displayedVendorDetails.contract_start_date ? fmtDate(displayedVendorDetails.contract_start_date) : '-'} />
                        <ReadOnlyInput label={ia("contractTo")} value={displayedVendorDetails.contract_end_date ? fmtDate(displayedVendorDetails.contract_end_date) : '-'} />
                        <ReadOnlyInput label={ia("address")} value={`${displayedVendorDetails.address_line1 || ''} ${displayedVendorDetails.address_line2 || ''} ${displayedVendorDetails.city || ''}`.trim() || '-'} />
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p className="text-lg mb-2">{ia("noVendorInformation")}</p>
                        {detail?.header?.asset_type_name && (
                          <p className="text-sm mt-2">{ia("assetType")}: {detail.header.asset_type_name}</p>
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
                    <p className="text-gray-500 mt-2">{ia("loadingWorkflowHistory")}</p>
                  </div>
                ) : workflowHistory.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full border-separate border-spacing-y-2">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{ma("date")}</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{ma("action")}</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{ma("jobRole")}</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{ia("department")}</th>
                          <th className="text-left px-6 py-3 text-sm font-semibold text-gray-700 bg-gray-50">{ia("notes")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {workflowHistory.map((row, idx) => (
                          <tr key={row.id || idx} className="bg-white border border-gray-200 rounded-md shadow-sm">
                            <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{fmtDate(row.actionOn)}</td>
                            <td className={`px-6 py-3 text-sm whitespace-nowrap font-medium ${row.actionColor || 'text-gray-600'}`}>{translateWorkflowAction(row.actionKey)}</td>
                            <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{trRole(row.jobRole, row.jobRoleId) || "-"}</td>
                            <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.department || "-"}</td>
                            <td className="px-6 py-3 text-sm text-gray-900 whitespace-nowrap">{row.notes || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    {ia("noWorkflowHistory")}
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
                  {ia("reject")}
                </button>
                <button
                  onClick={() => setShowApproveModal(true)}
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#0a2339] transition-colors"
                  disabled={isSubmitting}
                >
                  {ia("approve")}
                </button>
              </>
            )}

            {!isCurrentActionUser && (
              <div className="text-gray-500 text-sm italic">
                {currentActionSteps.length > 0 ? ia("waitingForApprover") : ma("noActionRequiredFromYou")}
              </div>
            )}
          </div>

          {/* Reject Modal */}
          {showRejectModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-[500px]">
                <div className="bg-[#0E2F4B] text-white px-6 py-4 rounded-t-lg border-b-4 border-[#FFC107]">
                  <h3 className="text-lg font-semibold">{ia("rejectInspectionRequest")}</h3>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ia("reasonForRejection")} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                      !rejectNote.trim() && isSubmitting ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder={ia("pleaseProvideReasonForRejection")}
                  />
                  {!rejectNote.trim() && isSubmitting && <div className="text-red-500 text-xs mt-1">{ia("noteRequiredToReject")}</div>}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowRejectModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      {ia("cancel")}
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      disabled={!rejectNote.trim() || isSubmitting}
                    >
                      {ia("reject")}
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
                  <h3 className="text-lg font-semibold">{ia("approveInspectionRequest")}</h3>
                </div>
                <div className="p-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {ia("approvalNote")} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    className={`w-full h-32 px-3 py-2 border rounded focus:outline-none ${
                      !approveNote.trim() && isSubmitting ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder={ia("pleaseProvideApprovalNote")}
                  />
                  {!approveNote.trim() && isSubmitting && <div className="text-red-500 text-xs mt-1">{ia("noteRequiredToApprove")}</div>}
                  
                  {/* Technician selection removed from approve modal. Please use the Technician Details tab to change technician. */}
                  <div className="flex justify-end gap-3 mt-6">
                    <button
                      onClick={() => setShowApproveModal(false)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                    >
                      {ia("cancel")}
                    </button>
                    <button
                      onClick={handleApprove}
                      className="px-4 py-2 bg-[#0E2F4B] text-white rounded hover:bg-[#0a2339] transition-colors"
                      disabled={
                        !approveNote.trim() || isSubmitting
                      }
                    >
                      {ia("approve")}
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
