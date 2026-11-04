import { showBackendTextToast } from '../utils/errorTranslation';
import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import {
  Ban,
  CheckCircle,
  ClipboardCheck,
  Filter,
  Minus,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  XCircle,
  FileBadge2,
  BriefcaseBusiness,
  CalendarClock,
} from "lucide-react";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useLanguage } from "../contexts/LanguageContext";
import { useRevalidateOnFocus } from "../hooks/useRevalidateOnFocus";
import { useTechCertApprovalsStore } from "../store/useTechCertApprovalsStore";
import { invalidateCache } from "../utils/apiCache";

const NAVY = "#0E2F4B";
const GOLD = "#FFC107";

const statusTone = (status) => {
  const value = String(status || "").toLowerCase();
  if (value.includes("approved") || value === "co" || value === "active") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  if (value.includes("reject") || value === "ur" || value === "rj" || value === "blocked") {
    return "bg-rose-50 text-rose-700 ring-rose-200";
  }
  if (value.includes("pending") || value === "in" || value === "ip" || value === "pn" || value === "ap") {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  return "bg-slate-100 text-slate-700 ring-slate-200";
};

const StatusPill = ({ children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusTone(children)}`}>
    {children}
  </span>
);

const EmptyState = ({ title, hint }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-16 text-center">
    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-slate-200">
      <Search size={18} className="text-slate-400" />
    </div>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {hint ? <p className="mt-1 max-w-sm text-xs text-slate-500">{hint}</p> : null}
  </div>
);

const LoadingState = ({ label }) => (
  <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-6 py-16 text-sm text-slate-500">
    <RefreshCw size={16} className="animate-spin text-[#0E2F4B]" />
    {label}
  </div>
);

const FilterPanel = ({
  open,
  filters,
  columns,
  onUpdate,
  onAdd,
  onRemove,
  onClear,
  t,
}) => {
  if (!open) return null;
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/90 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{t("techCertApprovals.filter")}</p>
          <p className="text-xs text-slate-500">{t("techCertApprovals.filterHint")}</p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          {t("techCertApprovals.clear")}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((filter, index) => (
          <div
            key={index}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
          >
            {filters.length > 1 && (
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="rounded-full bg-slate-100 p-1 text-slate-600 hover:bg-slate-200"
                title={t("techCertApprovals.removeFilter")}
              >
                <Minus size={12} />
              </button>
            )}
            <select
              className="rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-[#0E2F4B]"
              value={filter.column}
              onChange={(e) => onUpdate(index, "column", e.target.value)}
            >
              <option value="">{t("techCertApprovals.selectColumn")}</option>
              {columns.map((col) => (
                <option key={col.value} value={col.value}>
                  {col.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="w-40 rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-[#0E2F4B]"
              placeholder={t("techCertApprovals.searchValue")}
              value={filter.value}
              onChange={(e) => onUpdate(index, "value", e.target.value)}
            />
            {index === filters.length - 1 && (
              <button
                type="button"
                onClick={onAdd}
                className="rounded-md px-1.5 py-1 text-[#FFC107]"
                style={{ backgroundColor: NAVY }}
                title={t("techCertApprovals.addFilter")}
              >
                <Plus size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const DataTable = ({ headers, children, checkboxHeader }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="sticky top-0 z-10 border-b-4" style={{ backgroundColor: NAVY, borderBottomColor: GOLD }}>
          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-white">
            {checkboxHeader}
            {headers.map((header) => (
              <th key={header} className="px-4 py-3.5 whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  </div>
);

const TechCertApprovals = () => {
  const { t } = useLanguage();
  const certificates = useTechCertApprovalsStore((s) => s.approvals);
  const employeeList = useTechCertApprovalsStore((s) => s.technicians);
  const certMasterList = useTechCertApprovalsStore((s) => s.certMasterList);
  const upcomingJobs = useTechCertApprovalsStore((s) => s.upcomingJobs);
  const listLoading = useTechCertApprovalsStore((s) => s.listLoading);
  const loadPageData = useTechCertApprovalsStore((s) => s.loadPageData);
  const fetchApprovalsStore = useTechCertApprovalsStore((s) => s.fetchApprovals);
  const loading = listLoading && certificates.length === 0;

  const [activeTab, setActiveTab] = useState("approvals");
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [isApproving, setIsApproving] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const [approvalFilterOpen, setApprovalFilterOpen] = useState(false);
  const [techFilterOpen, setTechFilterOpen] = useState(false);
  const [certFilterOpen, setCertFilterOpen] = useState(false);
  const [approvalFilters, setApprovalFilters] = useState([{ column: "", value: "" }]);
  const [techFilters, setTechFilters] = useState([{ column: "", value: "" }]);
  const [certFilters, setCertFilters] = useState([{ column: "", value: "" }]);
  const [techSearch, setTechSearch] = useState("");

  const fetchApprovals = async ({ force = false } = {}) => {
    try {
      await fetchApprovalsStore({ revalidate: true, force });
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOLOADAPPROVALS_59166FE2', fallbackText: t("techCertApprovals.failedToLoadApprovals"), type: 'error' });
    }
  };

  const fetchTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      await useTechCertApprovalsStore.getState().fetchTechnicians({ revalidate: true, force: true });
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOLOADTECHNICIANS_3F57659D', fallbackText: t("techCertApprovals.failedToLoadTechnicians"), type: 'error' });
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const fetchCertificateMaster = async () => {
    setLoadingCerts(true);
    try {
      await useTechCertApprovalsStore.getState().fetchCertificateMaster({ revalidate: true });
    } catch (error) {
      console.error("Failed to fetch certificates:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOLOADCERTIFICATELIST_00CC0DE3', fallbackText: t("techCertApprovals.failedToLoadCertificateList"), type: 'error' });
    } finally {
      setLoadingCerts(false);
    }
  };

  const fetchMaintenanceHistory = async (technicianId, technicianName) => {
    if (!technicianId && !technicianName) {
      setMaintenanceHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const requests = [];
      if (technicianId) {
        requests.push(
          API.get("/maintenance-history", {
            params: {
              page: 1,
              limit: 50,
              advancedConditions: JSON.stringify([{ field: "empIntId", op: "=", val: technicianId }]),
            },
          })
        );
      }
      if (technicianName) {
        requests.push(
          API.get("/maintenance-history", {
            params: {
              page: 1,
              limit: 50,
              advancedConditions: JSON.stringify([{ field: "technicianName", op: "contains", val: technicianName }]),
            },
          })
        );
      }

      const responses = await Promise.all(requests);
      const byId = new Map();
      responses.forEach((response) => {
        (response.data?.data || []).forEach((row) => {
          const key = row.ams_id || row.wo_id;
          if (key) byId.set(key, row);
        });
      });
      setMaintenanceHistory(Array.from(byId.values()));
    } catch (error) {
      console.error("Failed to fetch technician job history:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOLOADJOBHISTORY_2DDBD9B7', fallbackText: t("techCertApprovals.failedToLoadJobHistory"), type: 'error' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchUpcomingJobs = async () => {
    setLoadingUpcoming(true);
    try {
      await useTechCertApprovalsStore.getState().fetchUpcomingJobs({ revalidate: true });
    } catch (error) {
      console.error("Failed to fetch upcoming jobs:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOLOADUPCOMINGJOBS_2E48D4BC', fallbackText: t("techCertApprovals.failedToLoadUpcomingJobs"), type: 'error' });
    } finally {
      setLoadingUpcoming(false);
    }
  };

  useEffect(() => {
    loadPageData({ revalidate: true }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRevalidateOnFocus(() => {
    fetchApprovalsStore({ revalidate: true });
  });

  useEffect(() => {
    if (activeTab === "jobHistory" && selectedTechnicianId) {
      const tech = employeeList.find((emp) => emp.emp_int_id === selectedTechnicianId);
      const techName = tech?.name || tech?.full_name || "";
      fetchMaintenanceHistory(selectedTechnicianId, techName);
    } else if (activeTab === "jobHistory" && !selectedTechnicianId) {
      setMaintenanceHistory([]);
    }
  }, [activeTab, selectedTechnicianId, employeeList]);

  useEffect(() => {
    if (activeTab === "technicians") fetchTechnicians();
    if (activeTab === "certificates") fetchCertificateMaster();
    if (activeTab === "upcoming") fetchUpcomingJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleApprove = async (etcId) => {
    setIsApproving(true);
    try {
      await API.put(`/employee-tech-certificates/${etcId}/status`, { status: "Approved" });
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_CERTIFICATEAPPROVEDSUCCESSFUL_628A343F', fallbackText: t("techCertApprovals.certificateApprovedSuccessfully"), type: 'success' });
      invalidateCache('tech-cert-approvals:');
      invalidateCache('technician-certs:');
      await fetchApprovals({ force: true });
    } catch (error) {
      console.error("Failed to approve certificate:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOAPPROVECERTIFICATE_1A2F8E53', fallbackText: error.response?.data?.message || t("techCertApprovals.failedToApproveCertificate"), type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (etcId) => {
    setIsApproving(true);
    try {
      await API.put(`/employee-tech-certificates/${etcId}/status`, { status: "Rejected" });
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_CERTIFICATEREJECTEDSUCCESSFUL_2E4A0708', fallbackText: t("techCertApprovals.certificateRejectedSuccessfully"), type: 'success' });
      invalidateCache('tech-cert-approvals:');
      invalidateCache('technician-certs:');
      await fetchApprovals({ force: true });
    } catch (error) {
      console.error("Failed to reject certificate:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOREJECTCERTIFICATE_18E3E6D5', fallbackText: error.response?.data?.message || t("techCertApprovals.failedToRejectCertificate"), type: 'error' });
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_PLEASESELECTATLEASTONETODELET_0D5971D0', fallbackText: t("techCertApprovals.pleaseSelectAtLeastOneToDelete"), type: 'error' });
      return;
    }
    const confirmed = window.confirm(t("techCertApprovals.deleteSelectedConfirm", { count: selectedRows.length }));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedRows.map((id) => API.delete(`/employee-tech-certificates/${id}`)));
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_CERTIFICATESDELETEDSUCCESSFUL_57E08D70', fallbackText: t("techCertApprovals.certificatesDeletedSuccessfully", { count: selectedRows.length }), type: 'success' });
      setSelectedRows([]);
      invalidateCache('tech-cert-approvals:');
      invalidateCache('technician-certs:');
      await fetchApprovals({ force: true });
    } catch (error) {
      console.error("Failed to delete selected certificates:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTODELETESOME_45FF5E15', fallbackText: t("techCertApprovals.failedToDeleteSome"), type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (etcId) => {
    if (!etcId) return;
    setDownloadingId(etcId);
    try {
      const response = await API.get(`/employee-tech-certificates/${etcId}/download`, {
        params: { mode: 'view' },
        responseType: 'blob',
        timeout: 120000,
      });
      const contentType = String(response.headers?.['content-type'] || '');
      if (contentType.includes('application/json')) {
        const text = await (response.data instanceof Blob
          ? response.data.text()
          : Promise.resolve(String(response.data)));
        let payload = {};
        try {
          payload = JSON.parse(text);
        } catch {
          payload = { message: text };
        }
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_TECHCERTAPPROVALS_NOFILEFORDOWNLOAD_61156FE0',
          fallbackText: payload.message || t("techCertApprovals.noFileForDownload"),
          type: 'error',
        });
        return;
      }
      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob([response.data], { type: contentType || 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      console.error("Failed to get download URL:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTODOWNLOAD_2BCF20D3', fallbackText: error.response?.data?.message || t("techCertApprovals.failedToDownload"), type: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBlock = async (empIntId) => {
    const confirmed = window.confirm(t("techCertApprovals.blockTechnicianConfirm"));
    if (!confirmed) return;

    setIsBlocking(true);
    try {
      await API.put(`/employees/${empIntId}/status`, { int_status: 0 });
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_TECHNICIANBLOCKEDSUCCESSFULLY_280A6A3B', fallbackText: t("techCertApprovals.technicianBlockedSuccessfully"), type: 'success' });
      invalidateCache('tech-cert-approvals:');
      await fetchTechnicians();
      if (selectedTechnicianId === empIntId) setSelectedTechnicianId("");
    } catch (error) {
      console.error("Failed to block technician:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_TECHCERTAPPROVALS_FAILEDTOBLOCKTECHNICIAN_3F95E62A', fallbackText: error.response?.data?.error || t("techCertApprovals.failedToBlockTechnician"), type: 'error' });
    } finally {
      setIsBlocking(false);
    }
  };

  const technicianOptions = useMemo(() => (
    employeeList.map((emp) => ({
      value: emp.emp_int_id,
      label: emp.name || emp.full_name || emp.employee_id || emp.emp_int_id,
    }))
  ), [employeeList]);

  const upcomingTechnicianOptions = useMemo(() => {
    const withData = [];
    const withoutData = [];

    employeeList.forEach((emp) => {
      const name = emp.name || emp.full_name || "";
      const id = emp.emp_int_id;
      const jobCount = upcomingJobs.filter((job) =>
        String(job.emp_int_id || "") === String(id || "")
        || (name && String(job.technician_name || "").toLowerCase().includes(String(name).toLowerCase()))
      ).length;

      const option = {
        value: id,
        label: name || emp.employee_id || id,
        jobCount,
      };

      if (jobCount > 0) withData.push(option);
      else withoutData.push(option);
    });

    withData.sort((a, b) => b.jobCount - a.jobCount || String(a.label).localeCompare(String(b.label)));
    withoutData.sort((a, b) => String(a.label).localeCompare(String(b.label)));

    return { withData, withoutData };
  }, [employeeList, upcomingJobs]);

  const selectedTechnician = useMemo(
    () => employeeList.find((emp) => emp.emp_int_id === selectedTechnicianId) || null,
    [employeeList, selectedTechnicianId]
  );

  const technicianRows = useMemo(() => (
    employeeList.map((emp) => ({
      ...emp,
      employee_name: emp.name || emp.full_name || "",
      employee_id: emp.employee_id || emp.emp_int_id || "",
      email: emp.email || emp.company_email || "",
      role: emp.job_role_name || emp.role_name || "",
      status_label: Number(emp.int_status) === 0 ? t("techCertApprovals.blocked") : t("techCertApprovals.active"),
    }))
  ), [employeeList, t]);

  const filteredUpcomingJobs = useMemo(() => {
    if (!selectedTechnician) return upcomingJobs;
    const name = selectedTechnician.name || selectedTechnician.full_name || "";
    if (!name) return upcomingJobs;
    return upcomingJobs.filter((job) =>
      String(job.technician_name || "").toLowerCase().includes(String(name).toLowerCase())
      || String(job.emp_int_id || "") === String(selectedTechnician.emp_int_id || "")
    );
  }, [upcomingJobs, selectedTechnician]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const approvalFilterColumns = useMemo(() => [
    { label: t("techCertApprovals.employeeName"), value: "employee_name" },
    { label: t("techCertApprovals.employeeId"), value: "emp_int_id" },
    { label: t("techCertApprovals.certificateName"), value: "cert_name" },
    { label: t("techCertApprovals.certificateNumber"), value: "cert_number" },
    { label: t("techCertApprovals.certificateDate"), value: "certificate_date" },
    { label: t("techCertApprovals.expiryDate"), value: "certificate_expiry" },
    { label: t("techCertApprovals.status"), value: "status" },
  ], [t]);

  const techFilterColumns = useMemo(() => [
    { label: t("techCertApprovals.employeeName"), value: "employee_name" },
    { label: t("techCertApprovals.employeeId"), value: "employee_id" },
    { label: t("techCertApprovals.role"), value: "role" },
    { label: t("techCertApprovals.email"), value: "email" },
    { label: t("techCertApprovals.status"), value: "status_label" },
  ], [t]);

  const certFilterColumns = useMemo(() => [
    { label: t("techCertApprovals.certificateName"), value: "cert_name" },
    { label: t("techCertApprovals.certificateNumber"), value: "cert_number" },
  ], [t]);

  const filteredCertificates = useMemo(
    () => filterData(certificates, { columnFilters: approvalFilters }, []),
    [certificates, approvalFilters]
  );

  const filteredTechnicians = useMemo(() => {
    let rows = filterData(technicianRows, { columnFilters: techFilters }, []);
    const q = techSearch.trim().toLowerCase();
    if (q) {
      rows = rows.filter((emp) =>
        [emp.employee_name, emp.employee_id, emp.role, emp.email, emp.status_label]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return rows;
  }, [technicianRows, techFilters, techSearch]);

  const filteredCertMaster = useMemo(
    () => filterData(certMasterList, { columnFilters: certFilters }, []),
    [certMasterList, certFilters]
  );

  const selectableIds = useMemo(
    () => filteredCertificates.map((cert) => cert.etc_id).filter(Boolean),
    [filteredCertificates]
  );
  const isAllSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedRows.includes(id));

  const makeFilterHelpers = (setter) => ({
    onUpdate: (index, key, value) => {
      setter((prev) => prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item)));
    },
    onAdd: () => setter((prev) => [...prev, { column: "", value: "" }]),
    onRemove: (index) => setter((prev) => prev.filter((_, idx) => idx !== index)),
    onClear: () => setter([{ column: "", value: "" }]),
  });

  const approvalFilterHelpers = makeFilterHelpers(setApprovalFilters);
  const techFilterHelpers = makeFilterHelpers(setTechFilters);
  const certFilterHelpers = makeFilterHelpers(setCertFilters);

  const tabs = [
    { id: "approvals", label: t("techCertApprovals.tabCertificateApprovals"), icon: ClipboardCheck, count: certificates.length },
    { id: "technicians", label: t("techCertApprovals.tabTechnicianList"), icon: Users, count: employeeList.length },
    { id: "certificates", label: t("techCertApprovals.tabCertificateList"), icon: FileBadge2, count: certMasterList.length },
    { id: "jobHistory", label: t("techCertApprovals.tabJobHistory"), icon: BriefcaseBusiness },
    { id: "upcoming", label: t("techCertApprovals.tabUpcomingJobs"), icon: CalendarClock, count: upcomingJobs.length },
  ];

  const kpis = [
    { label: t("techCertApprovals.kpiPending"), value: certificates.length, tone: "text-amber-700" },
    { label: t("techCertApprovals.kpiTechnicians"), value: employeeList.length, tone: "text-sky-700" },
    { label: t("techCertApprovals.kpiCertificates"), value: certMasterList.length, tone: "text-indigo-700" },
    { label: t("techCertApprovals.kpiUpcoming"), value: upcomingJobs.length, tone: "text-emerald-700" },
  ];

  const ToolbarButton = ({ onClick, disabled, title, children, danger = false }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
        danger ? "bg-rose-600 hover:bg-rose-700" : "hover:brightness-110"
      }`}
      style={danger ? undefined : { backgroundColor: NAVY }}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#F4F7FA] p-3 md:p-5">
      <div className="mx-auto w-full max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-gradient-to-r from-[#0E2F4B] via-[#143d65] to-[#1b4f7f] px-6 py-6 text-white">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#FFC107]">
                  {t("techCertApprovals.moduleLabel")}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-tight">
                  {t("navigation.hrManagerApproval")}
                </h1>
                <p className="mt-1 max-w-2xl text-sm text-white/75">
                  {t("techCertApprovals.subtitle")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => loadPageData({ revalidate: true })}
                className="inline-flex items-center gap-2 self-start rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/15"
              >
                <RefreshCw size={15} />
                {t("techCertApprovals.refresh")}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map((kpi) => (
                <div key={kpi.label} className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">{kpi.label}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{kpi.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="border-b border-slate-200 px-3 md:px-4">
            <div className="flex gap-1 overflow-x-auto py-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-[#0E2F4B] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon size={15} />
                    {tab.label}
                    {typeof tab.count === "number" ? (
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                        active ? "bg-white/15 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 md:p-6">
            {activeTab === "approvals" && (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t("techCertApprovals.tabCertificateApprovals")}</h2>
                    <p className="text-xs text-slate-500">{t("techCertApprovals.approvalsHint")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ToolbarButton
                      onClick={() => setApprovalFilterOpen((prev) => !prev)}
                      title={t("techCertApprovals.filter")}
                    >
                      <Filter size={16} />
                      {t("techCertApprovals.filter")}
                    </ToolbarButton>
                    <ToolbarButton
                      onClick={handleDeleteSelected}
                      disabled={isDeleting || selectedRows.length === 0}
                      title={t("techCertApprovals.delete")}
                      danger
                    >
                      <Trash2 size={16} />
                      {t("techCertApprovals.delete")}
                      {selectedRows.length > 0 ? ` (${selectedRows.length})` : ""}
                    </ToolbarButton>
                  </div>
                </div>

                <FilterPanel
                  open={approvalFilterOpen}
                  filters={approvalFilters}
                  columns={approvalFilterColumns}
                  t={t}
                  {...approvalFilterHelpers}
                />

                {loading ? (
                  <LoadingState label={t("techCertApprovals.loadingApprovals")} />
                ) : filteredCertificates.length === 0 ? (
                  <EmptyState title={t("techCertApprovals.noPendingApprovals")} />
                ) : (
                  <DataTable
                    headers={[
                      t("techCertApprovals.employee"),
                      t("techCertApprovals.certificate"),
                      t("techCertApprovals.certificateDate"),
                      t("techCertApprovals.expiryDate"),
                      t("techCertApprovals.status"),
                      t("techCertApprovals.file"),
                      t("techCertApprovals.action"),
                    ]}
                    checkboxHeader={(
                      <th className="px-4 py-3.5 w-10">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={(e) => setSelectedRows(e.target.checked ? selectableIds : [])}
                          className="accent-yellow-400"
                        />
                      </th>
                    )}
                  >
                    {filteredCertificates.map((cert, index) => (
                      <tr key={cert.etc_id || `${cert.tc_id}-${cert.emp_int_id}`} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            disabled={!cert.etc_id}
                            checked={cert.etc_id ? selectedRows.includes(cert.etc_id) : false}
                            onChange={() => {
                              if (!cert.etc_id) return;
                              setSelectedRows((prev) =>
                                prev.includes(cert.etc_id)
                                  ? prev.filter((id) => id !== cert.etc_id)
                                  : [...prev, cert.etc_id]
                              );
                            }}
                            className="accent-yellow-400"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{cert.employee_name || "-"}</div>
                          {cert.emp_int_id ? <div className="text-xs text-slate-500">{cert.emp_int_id}</div> : null}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{cert.cert_name || "-"}</div>
                          {cert.cert_number ? <div className="text-xs text-slate-500">{cert.cert_number}</div> : null}
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDate(cert.certificate_date)}</td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDate(cert.certificate_expiry)}</td>
                        <td className="px-4 py-3.5">
                          <StatusPill>{cert.status || t("techCertApprovals.approvalPending")}</StatusPill>
                        </td>
                        <td className="px-4 py-3.5">
                          {cert.file_path ? (
                            <button
                              type="button"
                              onClick={() => handleDownload(cert.etc_id)}
                              disabled={downloadingId === cert.etc_id}
                              className="text-xs font-semibold text-sky-700 hover:text-sky-800 disabled:opacity-60"
                            >
                              {downloadingId === cert.etc_id ? t("techCertApprovals.preparing") : t("techCertApprovals.view")}
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleApprove(cert.etc_id)}
                              disabled={isApproving}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200 hover:bg-emerald-100 disabled:opacity-60"
                            >
                              <CheckCircle size={14} />
                              {t("techCertApprovals.approve")}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(cert.etc_id)}
                              disabled={isApproving}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:opacity-60"
                            >
                              <XCircle size={14} />
                              {t("techCertApprovals.reject")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </>
            )}

            {activeTab === "technicians" && (
              <>
                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t("techCertApprovals.tabTechnicianList")}</h2>
                    <p className="text-xs text-slate-500">{t("techCertApprovals.techniciansHint")}</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-[240px]">
                      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder={t("techCertApprovals.searchTechnicians")}
                        className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#0E2F4B]"
                      />
                    </div>
                    <ToolbarButton
                      onClick={() => setTechFilterOpen((prev) => !prev)}
                      title={t("techCertApprovals.filter")}
                    >
                      <Filter size={16} />
                      {t("techCertApprovals.filter")}
                    </ToolbarButton>
                  </div>
                </div>

                <FilterPanel
                  open={techFilterOpen}
                  filters={techFilters}
                  columns={techFilterColumns}
                  t={t}
                  {...techFilterHelpers}
                />

                {loadingTechnicians ? (
                  <LoadingState label={t("techCertApprovals.loadingTechnicians")} />
                ) : filteredTechnicians.length === 0 ? (
                  <EmptyState title={t("techCertApprovals.noTechniciansFound")} />
                ) : (
                  <DataTable
                    headers={[
                      t("techCertApprovals.employee"),
                      t("techCertApprovals.role"),
                      t("techCertApprovals.email"),
                      t("techCertApprovals.status"),
                      t("techCertApprovals.action"),
                    ]}
                  >
                    {filteredTechnicians.map((emp, index) => (
                      <tr key={emp.emp_int_id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-slate-900">{emp.employee_name || "-"}</div>
                          <div className="text-xs text-slate-500">{emp.employee_id || emp.emp_int_id}</div>
                        </td>
                        <td className="px-4 py-3.5 text-slate-700">{emp.role || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{emp.email || "-"}</td>
                        <td className="px-4 py-3.5">
                          <StatusPill>{emp.status_label}</StatusPill>
                        </td>
                        <td className="px-4 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleBlock(emp.emp_int_id)}
                            disabled={isBlocking || Number(emp.int_status) === 0}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200 hover:bg-rose-100 disabled:opacity-60"
                          >
                            <Ban size={14} />
                            {t("techCertApprovals.block")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </>
            )}

            {activeTab === "certificates" && (
              <>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t("techCertApprovals.tabCertificateList")}</h2>
                    <p className="text-xs text-slate-500">{t("techCertApprovals.certificatesHint")}</p>
                  </div>
                  <ToolbarButton
                    onClick={() => setCertFilterOpen((prev) => !prev)}
                    title={t("techCertApprovals.filter")}
                  >
                    <Filter size={16} />
                    {t("techCertApprovals.filter")}
                  </ToolbarButton>
                </div>

                <FilterPanel
                  open={certFilterOpen}
                  filters={certFilters}
                  columns={certFilterColumns}
                  t={t}
                  {...certFilterHelpers}
                />

                {loadingCerts ? (
                  <LoadingState label={t("techCertApprovals.loadingCertificateList")} />
                ) : filteredCertMaster.length === 0 ? (
                  <EmptyState title={t("techCertApprovals.noCertificatesFound")} />
                ) : (
                  <DataTable
                    headers={[
                      t("techCertApprovals.certificateName"),
                      t("techCertApprovals.certificateNumber"),
                    ]}
                  >
                    {filteredCertMaster.map((cert, index) => (
                      <tr key={cert.tech_cert_id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="px-4 py-3.5 font-medium text-slate-900">{cert.cert_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{cert.cert_number || "-"}</td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </>
            )}

            {activeTab === "jobHistory" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t("techCertApprovals.tabJobHistory")}</h2>
                    <p className="text-xs text-slate-500">{t("techCertApprovals.jobHistoryHint")}</p>
                  </div>
                  <div className="w-full max-w-md">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t("techCertApprovals.selectTechnician")}
                    </label>
                    <select
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0E2F4B]"
                    >
                      <option value="">{t("techCertApprovals.selectTechnicianOption")}</option>
                      {technicianOptions.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingHistory ? (
                  <LoadingState label={t("techCertApprovals.loadingJobHistory")} />
                ) : !selectedTechnician ? (
                  <EmptyState title={t("techCertApprovals.selectTechnicianToViewHistory")} />
                ) : maintenanceHistory.length === 0 ? (
                  <EmptyState title={t("techCertApprovals.noJobHistoryFound")} />
                ) : (
                  <DataTable
                    headers={[
                      t("techCertApprovals.workOrder"),
                      t("techCertApprovals.asset"),
                      t("techCertApprovals.maintenanceType"),
                      t("techCertApprovals.startDate"),
                      t("techCertApprovals.endDate"),
                      t("techCertApprovals.status"),
                    ]}
                  >
                    {maintenanceHistory.map((row, index) => (
                      <tr key={row.ams_id || row.wo_id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="px-4 py-3.5 font-medium text-slate-900">{row.wo_id || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{row.asset_id || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{row.maintenance_type_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDate(row.act_maint_st_date)}</td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDate(row.act_main_end_date)}</td>
                        <td className="px-4 py-3.5"><StatusPill>{row.status || "-"}</StatusPill></td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </div>
            )}

            {activeTab === "upcoming" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{t("techCertApprovals.tabUpcomingJobs")}</h2>
                    <p className="text-xs text-slate-500">{t("techCertApprovals.upcomingHint")}</p>
                  </div>
                  <div className="w-full max-w-md">
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      {t("techCertApprovals.selectTechnician")}
                    </label>
                    <select
                      value={selectedTechnicianId}
                      onChange={(e) => setSelectedTechnicianId(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-[#0E2F4B]"
                    >
                      <option value="">{t("techCertApprovals.allTechnicians")}</option>
                      {upcomingTechnicianOptions.withData.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label} ({option.jobCount})
                        </option>
                      ))}
                      {upcomingTechnicianOptions.withData.length > 0 && upcomingTechnicianOptions.withoutData.length > 0 && (
                        <option disabled value="__upcoming_separator__">
                          ──────── {t("techCertApprovals.noUpcomingJobsDivider")} ────────
                        </option>
                      )}
                      {upcomingTechnicianOptions.withoutData.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {loadingUpcoming ? (
                  <LoadingState label={t("techCertApprovals.loadingUpcomingJobs")} />
                ) : filteredUpcomingJobs.length === 0 ? (
                  <EmptyState title={t("techCertApprovals.noUpcomingJobsFound")} />
                ) : (
                  <DataTable
                    headers={[
                      t("techCertApprovals.workOrder"),
                      t("techCertApprovals.technician"),
                      t("techCertApprovals.maintenanceType"),
                      t("techCertApprovals.startDate"),
                      t("techCertApprovals.status"),
                    ]}
                  >
                    {filteredUpcomingJobs.map((job, index) => (
                      <tr key={job.ams_id || job.wo_id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50/70"}>
                        <td className="px-4 py-3.5 font-medium text-slate-900">{job.wo_id || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{job.technician_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{job.maintenance_type_name || "-"}</td>
                        <td className="px-4 py-3.5 text-slate-700">{formatDate(job.act_maint_st_date)}</td>
                        <td className="px-4 py-3.5"><StatusPill>{job.status || "-"}</StatusPill></td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default TechCertApprovals;
