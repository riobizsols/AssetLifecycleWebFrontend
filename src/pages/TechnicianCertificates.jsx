import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Trash2, Filter, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";

const TechnicianCertificates = () => {
  const [certificates, setCertificates] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [uploadedCertificates, setUploadedCertificates] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editCertId, setEditCertId] = useState("");
  const [editCertificateDate, setEditCertificateDate] = useState("");
  const [editCertificateExpiry, setEditCertificateExpiry] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const [filterOpen, setFilterOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState([{ column: "", value: "" }]);
  const [selectedRows, setSelectedRows] = useState([]);

  const [selectedCertId, setSelectedCertId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [certificateDate, setCertificateDate] = useState("");
  const [certificateExpiry, setCertificateExpiry] = useState("");
  const [certificateFile, setCertificateFile] = useState(null);

  const fetchCertificateOptions = async () => {
    setLoadingOptions(true);
    try {
      const response = await API.get("/tech-certificates");
      console.log("Certificate Response:", response);
      
      // Handle both data.data and direct data formats
      const data = response.data?.data || response.data || [];
      console.log("Processed Certificate Data:", data);
      
      if (!Array.isArray(data)) {
        console.error("Certificate data is not an array:", data);
        setCertificates([]);
        toast.error("Invalid certificate data format");
        return;
      }
      
      if (data.length === 0) {
        console.warn("No certificates found in database");
        toast.info("No certificates available. Please create certificates in Admin Settings first.");
      }
      
      setCertificates(data);
    } catch (error) {
      console.error("Failed to fetch certificate options:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error("Failed to load certificates - Check browser console for details");
    } finally {
      setLoadingOptions(false);
    }
  };

  const fetchUploadedCertificates = async () => {
    setLoadingList(true);
    try {
      const response = await API.get("/employee-tech-certificates/approvals");
      const data = response.data?.data || [];
      const allowedStatuses = ["approved", "confirmed", "approval pending", "pending"];
      const filtered = data.filter((cert) =>
        allowedStatuses.includes(String(cert.status || "").toLowerCase())
      );

      if (selectedEmployeeId) {
        setUploadedCertificates(
          filtered.filter((cert) => String(cert.emp_int_id) === String(selectedEmployeeId))
        );
      } else {
        setUploadedCertificates(filtered);
      }
    } catch (error) {
      console.error("Failed to fetch uploaded certificates:", error);
      toast.error("Failed to load uploaded certificates");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchCertificateOptions();
    fetchUploadedCertificates();
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const response = await API.get("/employees");
        const data = response.data?.data || response.data || [];
        setEmployees(data);
      } catch (error) {
        console.error("Failed to fetch employees:", error);
        toast.error("Failed to load employees");
      } finally {
        setLoadingEmployees(false);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchUploadedCertificates();
  }, [selectedEmployeeId]);

  const certificateOptions = useMemo(() => {
    return certificates.map((cert) => ({
      value: cert.tech_cert_id,
      label: `${cert.cert_name || ""}${cert.cert_number ? ` (${cert.cert_number})` : ""}`.trim()
    }));
  }, [certificates]);

  const filterColumns = [
    { label: "Employee Name", value: "employee_name" },
    { label: "Employee ID", value: "emp_int_id" },
    { label: "Certificate Name", value: "cert_name" },
    { label: "Certificate Number", value: "cert_number" },
    { label: "Certificate Date", value: "certificate_date" },
    { label: "Expiry Date", value: "certificate_expiry" },
    { label: "Status", value: "status" }
  ];

  const filteredUploadedCertificates = useMemo(() => {
    return filterData(uploadedCertificates, { columnFilters }, []);
  }, [uploadedCertificates, columnFilters]);

  const selectableRowIds = useMemo(() => {
    return filteredUploadedCertificates
      .map((cert) => cert.etc_id)
      .filter((id) => id !== null && id !== undefined);
  }, [filteredUploadedCertificates]);

  const isAllSelected = selectableRowIds.length > 0 && selectableRowIds.every((id) => selectedRows.includes(id));

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

  const resetForm = () => {
    setSelectedCertId("");
    setCertificateDate("");
    setCertificateExpiry("");
    setCertificateFile(null);
  };

  const startEdit = (cert) => {
    setEditingId(cert.etc_id);
    setEditCertId(cert.tc_id || "");
    setEditCertificateDate(cert.certificate_date ? String(cert.certificate_date).slice(0, 10) : "");
    setEditCertificateExpiry(cert.certificate_expiry ? String(cert.certificate_expiry).slice(0, 10) : "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCertId("");
    setEditCertificateDate("");
    setEditCertificateExpiry("");
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!editCertId) {
      toast.error("Please select a certificate");
      return;
    }
    if (!editCertificateDate) {
      toast.error("Please select certificate date");
      return;
    }
    if (!editCertificateExpiry) {
      toast.error("Please select expiry date");
      return;
    }

    setIsUpdating(true);
    try {
      await API.put(`/employee-tech-certificates/${editingId}`, {
        tc_id: editCertId,
        certificate_date: editCertificateDate,
        certificate_expiry: editCertificateExpiry
      });
      toast.success("Certificate updated successfully");
      cancelEdit();
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to update certificate:", error);
      toast.error(error.response?.data?.message || "Failed to update certificate");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this certificate?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await API.delete(`/employee-tech-certificates/${id}`);
      toast.success("Certificate deleted successfully");
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to delete certificate:", error);
      toast.error(error.response?.data?.message || "Failed to delete certificate");
    } finally {
      setIsDeleting(false);
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
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to delete selected certificates:", error);
      toast.error("Failed to delete some certificates");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (id) => {
    if (!id) return;
    setDownloadingId(id);
    try {
      const response = await API.get(`/employee-tech-certificates/${id}/download`);
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

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error("Please select employee");
      return;
    }

    if (!selectedCertId) {
      toast.error("Please select a certificate");
      return;
    }

    if (!certificateDate) {
      toast.error("Please select certificate date");
      return;
    }

    if (!certificateExpiry) {
      toast.error("Please select expiry date");
      return;
    }

    if (!certificateFile) {
      toast.error("Please choose a file to upload");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("emp_int_id", selectedEmployeeId);
      formData.append("tc_id", selectedCertId);
      formData.append("certificate_date", certificateDate);
      formData.append("certificate_expiry", certificateExpiry);
      if (certificateFile) {
        formData.append("file", certificateFile);
      }

      await API.post("/employee-tech-certificates", formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Certificate uploaded successfully");
      resetForm();
      setShowAddForm(false);
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to upload certificate:", error);
      toast.error(error.response?.data?.message || "Failed to upload certificate");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusStyle = (status) => {
    const normalized = String(status || "").toLowerCase();
    if (normalized.includes("pending")) {
      return "bg-yellow-100 text-yellow-800";
    }
    if (normalized.includes("reject")) {
      return "bg-red-100 text-red-700";
    }
    if (normalized.includes("confirmed") || normalized.includes("approved")) {
      return "bg-green-100 text-green-700";
    }
    return "bg-gray-100 text-gray-700";
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 p-6 border-b border-gray-200">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Technician Certificates</h1>
              <p className="text-sm text-gray-500">
                Upload and manage your technical certificates. New uploads will remain in Approval
                Pending status until HR or Manager confirmation.
              </p>
            </div>
          </div>

          {filterOpen && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
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
                        {filterColumns.map((col) => (
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

          {showAddForm && (
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee Name</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    >
                      <option value="">Select employee</option>
                      {employees.map((emp) => (
                        <option key={emp.emp_int_id} value={emp.emp_int_id}>
                          {emp.name || emp.full_name || emp.employee_id || emp.emp_int_id}
                        </option>
                      ))}
                    </select>
                    {loadingEmployees && (
                      <p className="text-xs text-gray-400 mt-1">Loading employees...</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name</label>
                    <select
                      value={selectedCertId}
                      onChange={(e) => setSelectedCertId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                      disabled={loadingOptions || certificates.length === 0}
                    >
                      <option value="">
                        {loadingOptions 
                          ? "Loading certificates..." 
                          : certificates.length === 0 
                          ? "No certificates available" 
                          : "Select certificate"}
                      </option>
                      {certificateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {loadingOptions && (
                      <p className="text-xs text-blue-600 mt-1">⏳ Loading certificates...</p>
                    )}
                    {!loadingOptions && certificates.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ No certificates found. Admin Settings → Certifications to create one.
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Date</label>
                    <input
                      type="date"
                      value={certificateDate}
                      onChange={(e) => setCertificateDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={certificateExpiry}
                      onChange={(e) => setCertificateExpiry(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Certificate File</label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  />
                  {certificateFile && (
                    <p className="text-xs text-gray-500 mt-1">Selected: {certificateFile.name}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-60"
                >
                  {isSubmitting ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Uploaded Certificates</h2>
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
                <button
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="flex items-center justify-center text-white bg-[#0E2F4B] rounded-md hover:bg-[#12395c] transition px-3 py-2"
                  title={showAddForm ? "Close" : "Add"}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {loadingList ? (
              <div className="text-sm text-gray-500">Loading certificates...</div>
            ) : filteredUploadedCertificates.length === 0 ? (
              <div className="text-sm text-gray-500">No certificates uploaded yet.</div>
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
                              setSelectedRows(selectableRowIds);
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
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUploadedCertificates.map((cert, index) => (
                      <tr
                        key={cert.etc_id || `${cert.tc_id}-${cert.certificate_date || ""}`}
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
                          {editingId === cert.etc_id ? (
                            <select
                              value={editCertId}
                              onChange={(e) => setEditCertId(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                            >
                              <option value="">Select certificate</option>
                              {certificateOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <>
                              <div className="font-medium">{cert.cert_name || "-"}</div>
                              {cert.cert_number && (
                                <div className="text-xs text-gray-500">{cert.cert_number}</div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {editingId === cert.etc_id ? (
                            <input
                              type="date"
                              value={editCertificateDate}
                              onChange={(e) => setEditCertificateDate(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                            />
                          ) : (
                            formatDate(cert.certificate_date)
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {editingId === cert.etc_id ? (
                            <input
                              type="date"
                              value={editCertificateExpiry}
                              onChange={(e) => setEditCertificateExpiry(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                            />
                          ) : (
                            formatDate(cert.certificate_expiry)
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                              cert.status
                            )}`}
                          >
                            {cert.status || "-"}
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
                          {editingId === cert.etc_id ? (
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
                              >
                                {isUpdating ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <button
                                onClick={() => startEdit(cert)}
                                className="p-1 text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(cert.etc_id)}
                                disabled={isDeleting}
                                className="p-1 text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnicianCertificates;
