import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { CheckCircle, XCircle, Ban, Filter, Plus, Minus, Trash2 } from "lucide-react";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";

const TechCertApprovals = () => {
  const [activeTab, setActiveTab] = useState("approvals");
  const [certificates, setCertificates] = useState([]);
  const [employeeList, setEmployeeList] = useState([]);
  const [certMasterList, setCertMasterList] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [upcomingJobs, setUpcomingJobs] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [loadingTechnicians, setLoadingTechnicians] = useState(false);
  const [loadingCerts, setLoadingCerts] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingUpcoming, setLoadingUpcoming] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState([{ column: "", value: "" }]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const response = await API.get("/employee-tech-certificates/approvals", {
        params: { status: "Approval Pending" }
      });
      const data = response.data?.data || [];
      setCertificates(data);
    } catch (error) {
      console.error("Failed to fetch approvals:", error);
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    setLoadingTechnicians(true);
    try {
      const response = await API.get("/employees/with-roles");
      const data = response.data || [];
      setEmployeeList(data);
    } catch (error) {
      console.error("Failed to fetch technicians:", error);
      toast.error("Failed to load technicians");
    } finally {
      setLoadingTechnicians(false);
    }
  };

  const fetchCertificateMaster = async () => {
    setLoadingCerts(true);
    try {
      const response = await API.get("/tech-certificates");
      const data = response.data?.data || [];
      setCertMasterList(data);
    } catch (error) {
      console.error("Failed to fetch certificates:", error);
      toast.error("Failed to load certificate list");
    } finally {
      setLoadingCerts(false);
    }
  };

  const fetchMaintenanceHistory = async (technicianName) => {
    if (!technicianName) {
      setMaintenanceHistory([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const advancedConditions = [
        { field: "technicianName", operator: "contains", value: technicianName }
      ];
      const response = await API.get("/maintenance-history", {
        params: {
          page: 1,
          limit: 50,
          advancedConditions: JSON.stringify(advancedConditions)
        }
      });
      const data = response.data?.data || [];
      setMaintenanceHistory(data);
    } catch (error) {
      console.error("Failed to fetch technician job history:", error);
      toast.error("Failed to load job history");
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchUpcomingJobs = async () => {
    setLoadingUpcoming(true);
    try {
      const response = await API.get("/work-orders/all");
      const data = response.data?.data || [];
      setUpcomingJobs(data);
    } catch (error) {
      console.error("Failed to fetch upcoming jobs:", error);
      toast.error("Failed to load upcoming jobs");
    } finally {
      setLoadingUpcoming(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
    fetchTechnicians();
    fetchCertificateMaster();
    fetchUpcomingJobs();
  }, []);

  useEffect(() => {
    if (activeTab === "jobHistory" && selectedTechnicianId) {
      const tech = employeeList.find((emp) => emp.emp_int_id === selectedTechnicianId);
      const techName = tech?.name || tech?.full_name || "";
      fetchMaintenanceHistory(techName);
    }
  }, [activeTab, selectedTechnicianId, employeeList]);

  const handleApprove = async (etcId) => {
    setIsApproving(true);
    try {
      await API.put(`/employee-tech-certificates/${etcId}/status`, {
        status: "Approved"
      });
      toast.success("Certificate approved successfully");
      await fetchApprovals();
    } catch (error) {
      console.error("Failed to approve certificate:", error);
      toast.error(error.response?.data?.message || "Failed to approve certificate");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async (etcId) => {
    setIsApproving(true);
    try {
      await API.put(`/employee-tech-certificates/${etcId}/status`, {
        status: "Rejected"
      });
      toast.success("Certificate rejected successfully");
      await fetchApprovals();
    } catch (error) {
      console.error("Failed to reject certificate:", error);
      toast.error(error.response?.data?.message || "Failed to reject certificate");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error("Please select at least one certificate to delete");
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedRows.length} selected certificate(s)?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedRows.map((id) => API.delete(`/employee-tech-certificates/${id}`)));
      toast.success(`${selectedRows.length} certificate(s) deleted successfully`);
      setSelectedRows([]);
      await fetchApprovals();
    } catch (error) {
      console.error("Failed to delete selected certificates:", error);
      toast.error("Failed to delete some certificates");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (etcId) => {
    if (!etcId) return;
    setDownloadingId(etcId);
    try {
      const response = await API.get(`/employee-tech-certificates/${etcId}/download`);
      const url = response.data?.url;
      if (!url) {
        toast.error("No file available for download");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to get download URL:", error);
      toast.error(error.response?.data?.message || "Failed to download file");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBlock = async (empIntId) => {
    const confirmed = window.confirm("Block this technician? They will be removed from the list.");
    if (!confirmed) return;

    setIsBlocking(true);
    try {
      await API.put(`/employees/${empIntId}/status`, { int_status: 0 });
      toast.success("Technician blocked successfully");
      setEmployeeList((prev) => prev.filter((emp) => emp.emp_int_id !== empIntId));
      if (selectedTechnicianId === empIntId) {
        setSelectedTechnicianId("");
      }
    } catch (error) {
      console.error("Failed to block technician:", error);
      toast.error(error.response?.data?.error || "Failed to block technician");
    } finally {
      setIsBlocking(false);
    }
  };

  const technicianOptions = useMemo(() => {
    return employeeList.map((emp) => ({
      value: emp.emp_int_id,
      label: emp.name || emp.full_name || emp.employee_id || emp.emp_int_id
    }));
  }, [employeeList]);

  const selectedTechnician = useMemo(() => {
    return employeeList.find((emp) => emp.emp_int_id === selectedTechnicianId) || null;
  }, [employeeList, selectedTechnicianId]);

  const filteredUpcomingJobs = useMemo(() => {
    if (!selectedTechnician) return upcomingJobs;
    const name = selectedTechnician.name || selectedTechnician.full_name || "";
    if (!name) return upcomingJobs;
    return upcomingJobs.filter((job) =>
      String(job.technician_name || "").toLowerCase().includes(String(name).toLowerCase())
    );
  }, [upcomingJobs, selectedTechnician]);

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  const approvalFilterColumns = [
    { label: "Employee Name", value: "employee_name" },
    { label: "Employee ID", value: "emp_int_id" },
    { label: "Certificate Name", value: "cert_name" },
    { label: "Certificate Number", value: "cert_number" },
    { label: "Certificate Date", value: "certificate_date" },
    { label: "Expiry Date", value: "certificate_expiry" },
    { label: "Status", value: "status" }
  ];

  const filteredCertificates = useMemo(() => {
    return filterData(certificates, { columnFilters }, []);
  }, [certificates, columnFilters]);

  const selectableIds = useMemo(() => {
    return filteredCertificates
      .map((cert) => cert.etc_id)
      .filter((id) => id !== null && id !== undefined);
  }, [filteredCertificates]);

  const isAllSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedRows.includes(id));

  const updateColumnFilter = (index, key, value) => {
    setColumnFilters((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const addColumnFilter = () => {
    setColumnFilters((prev) => [...prev, { column: "", value: "" }]);
  };

  const removeColumnFilter = (index) => {
    setColumnFilters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearColumnFilters = () => {
    setColumnFilters([{ column: "", value: "" }]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-semibold text-gray-900">HR/Manager Approval</h1>
            <p className="text-sm text-gray-500">
              Review technician certificates, manage technicians, and monitor activity.
            </p>
          </div>

          <div className="px-6 pt-4">
            <div className="flex flex-wrap gap-3">
              {[
                { id: "approvals", label: "Certificate Approvals" },
                { id: "technicians", label: "Technician List" },
                { id: "certificates", label: "Certificate List" },
                { id: "ratings", label: "Technician Ratings" },
                { id: "jobHistory", label: "Technician Job History" },
                { id: "upcoming", label: "Upcoming Jobs" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm rounded-md border transition ${
                    activeTab === tab.id
                      ? "bg-[#0E2F4B] text-white border-[#0E2F4B]"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === "approvals" && (
              <>
                <div className="flex items-center justify-end mb-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilterOpen((prev) => !prev)}
                      className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                      title="Filter"
                    >
                      <Filter size={18} />
                    </button>
                    <button
                      onClick={handleDeleteSelected}
                      disabled={isDeleting || selectedRows.length === 0}
                      className="flex items-center justify-center text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-60 px-3 py-2"
                      title="Delete"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                {filterOpen && (
                  <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {columnFilters.map((filter, index) => (
                          <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                            {columnFilters.length > 1 && (
                              <button
                                onClick={() => removeColumnFilter(index)}
                                className="bg-gray-200 text-gray-700 px-1 rounded-full"
                                title="Remove filter"
                              >
                                <Minus size={12} />
                              </button>
                            )}
                            <select
                              className="border text-sm px-2 py-1"
                              value={filter.column}
                              onChange={(e) => updateColumnFilter(index, "column", e.target.value)}
                            >
                              <option value="">Select column</option>
                              {approvalFilterColumns.map((col) => (
                                <option key={col.value} value={col.value}>
                                  {col.label}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              className="border text-sm px-2 py-1"
                              placeholder="Search value"
                              value={filter.value}
                              onChange={(e) => updateColumnFilter(index, "value", e.target.value)}
                            />
                            {index === columnFilters.length - 1 && (
                              <button
                                onClick={addColumnFilter}
                                className="bg-[#0E2F4B] text-[#FFC107] px-1 rounded"
                                title="Add filter"
                              >
                                <Plus size={12} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={clearColumnFilters}
                        className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {loading ? (
                  <div className="text-sm text-gray-500">Loading approvals...</div>
                ) : filteredCertificates.length === 0 ? (
                  <div className="text-sm text-gray-500">No pending approvals.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200 text-sm">
                      <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                        <tr className="text-white text-sm font-medium">
                          <th className="px-4 py-3 text-left w-10">
                            <input
                              type="checkbox"
                              checked={isAllSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedRows(selectableIds);
                                } else {
                                  setSelectedRows([]);
                                }
                              }}
                              className="accent-yellow-400"
                            />
                          </th>
                          <th className="px-4 py-3 text-left">Employee</th>
                          <th className="px-4 py-3 text-left">Certificate</th>
                          <th className="px-4 py-3 text-left">Certificate Date</th>
                          <th className="px-4 py-3 text-left">Expiry Date</th>
                          <th className="px-4 py-3 text-left">Status</th>
                          <th className="px-4 py-3 text-left">File</th>
                          <th className="px-4 py-3 text-left">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredCertificates.map((cert, index) => (
                          <tr
                            key={cert.etc_id || `${cert.tc_id}-${cert.emp_int_id}`}
                            className={`border-t ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                          >
                            <td className="px-4 py-3 text-gray-900">
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
                            <td className="px-4 py-3 text-gray-900">
                              <div className="font-medium">{cert.employee_name || "-"}</div>
                              {cert.emp_int_id && (
                                <div className="text-xs text-gray-500">{cert.emp_int_id}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-900">
                              <div className="font-medium">{cert.cert_name || "-"}</div>
                              {cert.cert_number && (
                                <div className="text-xs text-gray-500">{cert.cert_number}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(cert.certificate_date)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(cert.certificate_expiry)}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                {cert.status || "Approval Pending"}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {cert.file_path ? (
                                <button
                                  onClick={() => handleDownload(cert.etc_id)}
                                  disabled={downloadingId === cert.etc_id}
                                  className="text-xs font-medium text-blue-700 hover:text-blue-800 disabled:opacity-60"
                                >
                                  {downloadingId === cert.etc_id ? "Preparing..." : "View"}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                <button
                                  onClick={() => handleApprove(cert.etc_id)}
                                  disabled={isApproving}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 rounded hover:bg-green-100 disabled:opacity-60"
                                >
                                  <CheckCircle size={14} />
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReject(cert.etc_id)}
                                  disabled={isApproving}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                                >
                                  <XCircle size={14} />
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "technicians" && (
              <>
                {loadingTechnicians ? (
                  <div className="text-sm text-gray-500">Loading technicians...</div>
                ) : employeeList.length === 0 ? (
                  <div className="text-sm text-gray-500">No technicians found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Employee</th>
                          <th className="px-4 py-3 text-left font-medium">Role</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                          <th className="px-4 py-3 text-left font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {employeeList.map((emp) => (
                          <tr key={emp.emp_int_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">
                              <div className="font-medium">{emp.name || emp.full_name || "-"}</div>
                              <div className="text-xs text-gray-500">{emp.emp_int_id}</div>
                            </td>
                            <td className="px-4 py-3 text-gray-700">{emp.job_role_name || "-"}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                Active
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <button
                                onClick={() => handleBlock(emp.emp_int_id)}
                                disabled={isBlocking}
                                className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                              >
                                <Ban size={14} />
                                Block
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "certificates" && (
              <>
                {loadingCerts ? (
                  <div className="text-sm text-gray-500">Loading certificate list...</div>
                ) : certMasterList.length === 0 ? (
                  <div className="text-sm text-gray-500">No certificates found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Certificate Name</th>
                          <th className="px-4 py-3 text-left font-medium">Certificate Number</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {certMasterList.map((cert) => (
                          <tr key={cert.tech_cert_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{cert.cert_name || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{cert.cert_number || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}

            {activeTab === "ratings" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Technician</label>
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  >
                    <option value="">Select technician</option>
                    {technicianOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
                  {selectedTechnician ? (
                    <>
                      <div className="font-medium text-gray-900">{selectedTechnician.name || selectedTechnician.full_name}</div>
                      <div className="text-xs text-gray-500">{selectedTechnician.emp_int_id}</div>
                      <div className="mt-2">No ratings available yet for this technician.</div>
                    </>
                  ) : (
                    "Select a technician to view ratings."
                  )}
                </div>
              </div>
            )}

            {activeTab === "jobHistory" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Technician</label>
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  >
                    <option value="">Select technician</option>
                    {technicianOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingHistory ? (
                  <div className="text-sm text-gray-500">Loading job history...</div>
                ) : !selectedTechnician ? (
                  <div className="text-sm text-gray-500">Select a technician to view job history.</div>
                ) : maintenanceHistory.length === 0 ? (
                  <div className="text-sm text-gray-500">No job history found for this technician.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Work Order</th>
                          <th className="px-4 py-3 text-left font-medium">Asset</th>
                          <th className="px-4 py-3 text-left font-medium">Maintenance Type</th>
                          <th className="px-4 py-3 text-left font-medium">Start Date</th>
                          <th className="px-4 py-3 text-left font-medium">End Date</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {maintenanceHistory.map((row) => (
                          <tr key={row.ams_id || row.wo_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{row.wo_id || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{row.asset_id || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{row.maintenance_type_name || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(row.act_maint_st_date)}</td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(row.act_main_end_date)}</td>
                            <td className="px-4 py-3 text-gray-700">{row.status || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "upcoming" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Technician</label>
                  <select
                    value={selectedTechnicianId}
                    onChange={(e) => setSelectedTechnicianId(e.target.value)}
                    className="w-full max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  >
                    <option value="">All technicians</option>
                    {technicianOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {loadingUpcoming ? (
                  <div className="text-sm text-gray-500">Loading upcoming jobs...</div>
                ) : filteredUpcomingJobs.length === 0 ? (
                  <div className="text-sm text-gray-500">No upcoming jobs found.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-gray-600">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Work Order</th>
                          <th className="px-4 py-3 text-left font-medium">Technician</th>
                          <th className="px-4 py-3 text-left font-medium">Maintenance Type</th>
                          <th className="px-4 py-3 text-left font-medium">Start Date</th>
                          <th className="px-4 py-3 text-left font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredUpcomingJobs.map((job) => (
                          <tr key={job.ams_id || job.wo_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-900">{job.wo_id || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{job.technician_name || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{job.maintenance_type_name || "-"}</td>
                            <td className="px-4 py-3 text-gray-700">{formatDate(job.act_maint_st_date)}</td>
                            <td className="px-4 py-3 text-gray-700">{job.status || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechCertApprovals;
