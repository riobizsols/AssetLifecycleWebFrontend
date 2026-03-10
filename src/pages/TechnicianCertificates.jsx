import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Trash2, Filter, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import { filterData } from "../utils/filterData";
import { useLanguage } from "../contexts/LanguageContext";

const TechnicianCertificates = () => {
  const { t } = useLanguage();
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
        toast.error(t("technicianCertificates.invalidCertificateData"));
        return;
      }
      
      if (data.length === 0) {
        console.warn("No certificates found in database");
        toast.info(t("technicianCertificates.noCertificatesCreateInAdmin"));
      }
      
      setCertificates(data);
    } catch (error) {
      console.error("Failed to fetch certificate options:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(t("technicianCertificates.failedToLoadCertificates"));
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
      toast.error(t("technicianCertificates.failedToLoadUploaded"));
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
        toast.error(t("technicianCertificates.failedToLoadEmployees"));
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

  const filterColumns = useMemo(
    () => [
      { label: t("technicianCertificates.employeeName"), value: "employee_name" },
      { label: t("technicianCertificates.employeeId"), value: "emp_int_id" },
      { label: t("technicianCertificates.certificateName"), value: "cert_name" },
      { label: t("technicianCertificates.certificateNumber"), value: "cert_number" },
      { label: t("technicianCertificates.certificateDate"), value: "certificate_date" },
      { label: t("technicianCertificates.expiryDate"), value: "certificate_expiry" },
      { label: t("technicianCertificates.status"), value: "status" },
    ],
    [t]
  );

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
      toast.error(t("technicianCertificates.pleaseSelectCertificate"));
      return;
    }
    if (!editCertificateDate) {
      toast.error(t("technicianCertificates.pleaseSelectCertificateDate"));
      return;
    }
    if (!editCertificateExpiry) {
      toast.error(t("technicianCertificates.pleaseSelectExpiryDate"));
      return;
    }

    setIsUpdating(true);
    try {
      await API.put(`/employee-tech-certificates/${editingId}`, {
        tc_id: editCertId,
        certificate_date: editCertificateDate,
        certificate_expiry: editCertificateExpiry
      });
      toast.success(t("technicianCertificates.certificateUpdatedSuccessfully"));
      cancelEdit();
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to update certificate:", error);
      toast.error(error.response?.data?.message || t("technicianCertificates.failedToUpdateCertificate"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(t("technicianCertificates.deleteThisCertificate"));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await API.delete(`/employee-tech-certificates/${id}`);
      toast.success(t("technicianCertificates.certificateDeletedSuccessfully"));
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to delete certificate:", error);
      toast.error(error.response?.data?.message || t("technicianCertificates.failedToDeleteCertificate"));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedRows.length === 0) {
      toast.error(t("technicianCertificates.selectAtLeastOneToDelete"));
      return;
    }

    const confirmed = window.confirm(t("technicianCertificates.deleteSelectedConfirm", { count: selectedRows.length }));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await Promise.all(selectedRows.map((id) => API.delete(`/employee-tech-certificates/${id}`)));
      toast.success(t("technicianCertificates.certificatesDeletedSuccessfully", { count: selectedRows.length }));
      setSelectedRows([]);
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to delete selected certificates:", error);
      toast.error(t("technicianCertificates.failedToDeleteSome"));
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
        toast.error(t("technicianCertificates.noFileForDownload"));
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to get download URL:", error);
      toast.error(error.response?.data?.message || t("technicianCertificates.failedToDownload"));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedEmployeeId) {
      toast.error(t("technicianCertificates.pleaseSelectEmployee"));
      return;
    }

    if (!selectedCertId) {
      toast.error(t("technicianCertificates.pleaseSelectCertificate"));
      return;
    }

    if (!certificateDate) {
      toast.error(t("technicianCertificates.pleaseSelectCertificateDate"));
      return;
    }

    if (!certificateExpiry) {
      toast.error(t("technicianCertificates.pleaseSelectExpiryDate"));
      return;
    }

    if (!certificateFile) {
      toast.error(t("technicianCertificates.pleaseChooseFileToUpload"));
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

      toast.success(t("technicianCertificates.certificateUploadedSuccessfully"));
      resetForm();
      setShowAddForm(false);
      await fetchUploadedCertificates();
    } catch (error) {
      console.error("Failed to upload certificate:", error);
      toast.error(error.response?.data?.message || t("technicianCertificates.failedToUploadCertificate"));
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
    <div className="min-h-screen bg-gray-50 pt-2 px-4 pb-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 border-b border-gray-200">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t("technicianCertificates.title")}</h1>
              <p className="text-sm text-gray-500">{t("technicianCertificates.subtitle")}</p>
            </div>
          </div>

          {filterOpen && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {columnFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                      {columnFilters.length > 1 && (
                        <button
                          onClick={() => removeColumnFilter(index)}
                          className="bg-gray-200 text-gray-700 px-1 rounded-full"
                          title={t("technicianCertificates.removeFilter")}
                        >
                          <Minus size={12} />
                        </button>
                      )}
                      <select
                        className="border text-sm px-2 py-1"
                        value={filter.column}
                        onChange={(e) => updateColumnFilter(index, "column", e.target.value)}
                      >
                        <option value="">{t("technicianCertificates.selectColumn")}</option>
                        {filterColumns.map((col) => (
                          <option key={col.value} value={col.value}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="border text-sm px-2 py-1"
                        placeholder={t("technicianCertificates.searchValue")}
                        value={filter.value}
                        onChange={(e) => updateColumnFilter(index, "value", e.target.value)}
                      />
                      {index === columnFilters.length - 1 && (
                        <button
                          onClick={addColumnFilter}
                          className="bg-[#0E2F4B] text-[#FFC107] px-1 rounded"
                          title={t("technicianCertificates.addFilter")}
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
                  {t("technicianCertificates.clear")}
                </button>
              </div>
            </div>
          )}

          {showAddForm && (
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("technicianCertificates.employeeName")}</label>
                    <select
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    >
                      <option value="">{t("technicianCertificates.selectEmployee")}</option>
                      {employees.map((emp) => (
                        <option key={emp.emp_int_id} value={emp.emp_int_id}>
                          {emp.name || emp.full_name || emp.employee_id || emp.emp_int_id}
                        </option>
                      ))}
                    </select>
                    {loadingEmployees && (
                      <p className="text-xs text-gray-400 mt-1">{t("technicianCertificates.loadingEmployees")}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("technicianCertificates.certificateName")}</label>
                    <select
                      value={selectedCertId}
                      onChange={(e) => setSelectedCertId(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                      disabled={loadingOptions || certificates.length === 0}
                    >
                      <option value="">
                        {loadingOptions 
                          ? t("technicianCertificates.loadingCertificates") 
                          : certificates.length === 0 
                          ? t("technicianCertificates.noCertificatesAvailable") 
                          : t("technicianCertificates.selectCertificate")}
                      </option>
                      {certificateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {loadingOptions && (
                      <p className="text-xs text-blue-600 mt-1">⏳ {t("technicianCertificates.loadingCertificates")}</p>
                    )}
                    {!loadingOptions && certificates.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">⚠️ {t("technicianCertificates.noCertificatesFoundHint")}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("technicianCertificates.certificateDate")}</label>
                    <input
                      type="date"
                      value={certificateDate}
                      onChange={(e) => setCertificateDate(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("technicianCertificates.expiryDate")}</label>
                    <input
                      type="date"
                      value={certificateExpiry}
                      onChange={(e) => setCertificateExpiry(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("technicianCertificates.uploadCertificateFile")}</label>
                  <input
                    type="file"
                    onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  />
                  {certificateFile && (
                    <p className="text-xs text-gray-500 mt-1">{t("technicianCertificates.selectedFile", { name: certificateFile.name })}</p>
                  )}
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition disabled:opacity-60"
                >
                  {isSubmitting ? t("technicianCertificates.uploading") : t("technicianCertificates.upload")}
                </button>
              </div>
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{t("technicianCertificates.uploadedCertificates")}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterOpen((prev) => !prev)}
                  className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                  title={t("technicianCertificates.filter")}
                >
                  <Filter size={18} />
                </button>
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting || selectedRows.length === 0}
                  className="flex items-center justify-center text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-60 px-3 py-2"
                  title={t("technicianCertificates.delete")}
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setShowAddForm((prev) => !prev)}
                  className="flex items-center justify-center text-white bg-[#0E2F4B] rounded-md hover:bg-[#12395c] transition px-3 py-2"
                  title={showAddForm ? t("technicianCertificates.close") : t("technicianCertificates.add")}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>
            {loadingList ? (
              <div className="text-sm text-gray-500">{t("technicianCertificates.loadingCertificatesList")}</div>
            ) : filteredUploadedCertificates.length === 0 ? (
              <div className="text-sm text-gray-500">{t("technicianCertificates.noCertificatesUploadedYet")}</div>
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
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.employee")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.certificate")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.certificateDate")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.expiryDate")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.status")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.file")}</th>
                      <th className="px-4 py-3 text-left">{t("technicianCertificates.actions")}</th>
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
                              <option value="">{t("technicianCertificates.selectCertificate")}</option>
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
                              {downloadingId === cert.etc_id ? t("technicianCertificates.preparing") : t("technicianCertificates.view")}
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
                                {isUpdating ? t("technicianCertificates.saving") : t("technicianCertificates.save")}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                {t("technicianCertificates.cancel")}
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 items-center">
                              <button
                                onClick={() => startEdit(cert)}
                                className="p-1 text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                                title={t("technicianCertificates.edit")}
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(cert.etc_id)}
                                disabled={isDeleting}
                                className="p-1 text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                                title={t("technicianCertificates.delete")}
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
