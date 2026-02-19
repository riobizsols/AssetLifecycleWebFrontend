import React, { useEffect, useMemo, useState } from "react";
import { Edit2, Trash2, Save, X, Filter, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { DropdownMultiSelect } from "../../components/reportModels/ReportComponents";
import { filterData } from "../../utils/filterData";

const Certifications = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [certificates, setCertificates] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [maintTypes, setMaintTypes] = useState([]);
  const [assetTypeMaintTypeIds, setAssetTypeMaintTypeIds] = useState([]);
  const [filteredMaintTypes, setFilteredMaintTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const [certName, setCertName] = useState("");
  const [certNumber, setCertNumber] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [mappedEditingId, setMappedEditingId] = useState(null);
  const [mappedEditName, setMappedEditName] = useState("");
  const [mappedEditNumber, setMappedEditNumber] = useState("");

  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [selectedMaintType, setSelectedMaintType] = useState("");
  const [mappedCertificates, setMappedCertificates] = useState([]);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState([]);
  const [selectedCertificateRows, setSelectedCertificateRows] = useState([]);

  const [createFilterOpen, setCreateFilterOpen] = useState(false);
  const [createColumnFilters, setCreateColumnFilters] = useState([
    { column: "", value: "" }
  ]);

  const [mappingFilterOpen, setMappingFilterOpen] = useState(false);
  const [mappingColumnFilters, setMappingColumnFilters] = useState([
    { column: "", value: "" }
  ]);
  const [selectedMappedRows, setSelectedMappedRows] = useState([]);
  const [showMappingForm, setShowMappingForm] = useState(false);

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const response = await API.get("/tech-certificates");
      const data = response.data?.data || [];
      setCertificates(data);
    } catch (error) {
      console.error("Failed to fetch certificates:", error);
      toast.error("Failed to load certificates");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const response = await API.get("/asset-types");
      const data = response.data || [];
      setAssetTypes(data);
    } catch (error) {
      console.error("Failed to fetch asset types:", error);
      toast.error("Failed to load asset types");
    }
  };

  const fetchMaintTypes = async () => {
    try {
      const response = await API.get("/maint-types");
      const data = response.data || [];
      setMaintTypes(data);
    } catch (error) {
      console.error("Failed to fetch maintenance types:", error);
      toast.error("Failed to load maintenance types");
    }
  };

  const fetchMappedCertificates = async (assetTypeId) => {
    if (!assetTypeId) {
      setMappedCertificates([]);
      setSelectedCertificateIds([]);
      setSelectedMaintType("");
      setAssetTypeMaintTypeIds([]);
      return;
    }

    try {
      const response = await API.get(`/asset-types/${assetTypeId}/maintenance-certificates`);
      const data = response.data?.data || [];
      setMappedCertificates(data);
      setSelectedCertificateIds(data.map((cert) => cert.tech_cert_id));
      const maintTypeId = data.find((cert) => cert.maint_type_id)?.maint_type_id || "";
      setSelectedMaintType(maintTypeId);
    } catch (error) {
      console.error("Failed to fetch mapped certificates:", error);
      toast.error("Failed to load mapped certificates");
    }
  };

  const fetchMaintenanceTypesForAssetType = async (assetTypeId) => {
    if (!assetTypeId) {
      setAssetTypeMaintTypeIds([]);
      return;
    }

    try {
      const response = await API.get(`/maintenance-schedules/frequency/${assetTypeId}`);
      const rows = Array.isArray(response.data) ? response.data : response.data?.data || [];
      const ids = rows.map((row) => row.maint_type_id).filter(Boolean);
      setAssetTypeMaintTypeIds(Array.from(new Set(ids)));
    } catch (error) {
      console.error("Failed to fetch maintenance types for asset type:", error);
      toast.error("Failed to load maintenance types for selected asset type");
      setAssetTypeMaintTypeIds([]);
    }
  };

  useEffect(() => {
    fetchCertificates();
    fetchAssetTypes();
    fetchMaintTypes();
  }, []);

  useEffect(() => {
    fetchMappedCertificates(selectedAssetType);
    fetchMaintenanceTypesForAssetType(selectedAssetType);
  }, [selectedAssetType]);

  useEffect(() => {
    if (!selectedAssetType) {
      setFilteredMaintTypes([]);
      return;
    }

    if (assetTypeMaintTypeIds.length === 0) {
      setFilteredMaintTypes([]);
      return;
    }

    const filtered = maintTypes.filter((type) => assetTypeMaintTypeIds.includes(type.maint_type_id));
    setFilteredMaintTypes(filtered);
  }, [maintTypes, assetTypeMaintTypeIds, selectedAssetType]);

  useEffect(() => {
    if (!selectedMaintType) return;
    const stillValid = filteredMaintTypes.some((type) => type.maint_type_id === selectedMaintType);
    if (!stillValid) {
      setSelectedMaintType("");
    }
  }, [filteredMaintTypes, selectedMaintType]);

  const handleCreateCertificate = async () => {
    if (!certName.trim()) {
      toast.error("Certificate name is required");
      return;
    }

    if (!certNumber.trim()) {
      toast.error("Certificate number is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await API.post("/tech-certificates", {
        cert_name: certName.trim(),
        cert_number: certNumber.trim()
      });

      const created = response.data?.data;
      if (created) {
        setCertificates((prev) => [created, ...prev]);
      } else {
        await fetchCertificates();
      }

      setCertName("");
      setCertNumber("");
      setShowCreateForm(false);
      toast.success("Certificate created successfully");
    } catch (error) {
      console.error("Failed to create certificate:", error);
      toast.error(error.response?.data?.message || "Failed to create certificate");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (cert) => {
    setEditingId(cert.tech_cert_id);
    setEditName(cert.cert_name || "");
    setEditNumber(cert.cert_number || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditNumber("");
  };

  const handleUpdateCertificate = async (id) => {
    if (!editName.trim()) {
      toast.error("Certificate name is required");
      return;
    }

    if (!editNumber.trim()) {
      toast.error("Certificate number is required");
      return;
    }

    setIsCreating(true);
    try {
      const response = await API.put(`/tech-certificates/${id}`, {
        cert_name: editName.trim(),
        cert_number: editNumber.trim()
      });

      const updated = response.data?.data;
      if (updated) {
        setCertificates((prev) =>
          prev.map((cert) => (cert.tech_cert_id === id ? updated : cert))
        );
      } else {
        await fetchCertificates();
      }

      cancelEdit();
      toast.success("Certificate updated successfully");
    } catch (error) {
      console.error("Failed to update certificate:", error);
      toast.error(error.response?.data?.message || "Failed to update certificate");
    } finally {
      setIsCreating(false);
    }
  };

  const startMappedEdit = (cert) => {
    setMappedEditingId(cert.tech_cert_id);
    setMappedEditName(cert.cert_name || "");
    setMappedEditNumber(cert.cert_number || "");
  };

  const cancelMappedEdit = () => {
    setMappedEditingId(null);
    setMappedEditName("");
    setMappedEditNumber("");
  };

  const handleMappedUpdate = async (id) => {
    if (!mappedEditName.trim()) {
      toast.error("Certificate name is required");
      return;
    }

    if (!mappedEditNumber.trim()) {
      toast.error("Certificate number is required");
      return;
    }

    setIsSaving(true);
    try {
      const response = await API.put(`/tech-certificates/${id}`, {
        cert_name: mappedEditName.trim(),
        cert_number: mappedEditNumber.trim()
      });

      const updated = response.data?.data;
      if (updated) {
        setCertificates((prev) =>
          prev.map((cert) => (cert.tech_cert_id === id ? updated : cert))
        );
        setMappedCertificates((prev) =>
          prev.map((cert) => (cert.tech_cert_id === id ? { ...cert, ...updated } : cert))
        );
      } else {
        await fetchCertificates();
        await fetchMappedCertificates(selectedAssetType);
      }

      cancelMappedEdit();
      toast.success("Certificate updated successfully");
    } catch (error) {
      console.error("Failed to update certificate:", error);
      toast.error(error.response?.data?.message || "Failed to update certificate");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnmapCertificate = async (certId) => {
    if (!selectedAssetType) {
      toast.error("Please select an asset type");
      return;
    }

    if (!selectedMaintType) {
      toast.error("Please select a maintenance type");
      return;
    }

    const confirmed = window.confirm("Remove this certificate from the mapping?");
    if (!confirmed) return;

    const nextIds = selectedCertificateIds.filter((id) => id !== certId);
    setIsSaving(true);
    try {
      const response = await API.post(`/asset-types/${selectedAssetType}/maintenance-certificates`, {
        certificate_ids: nextIds,
        maint_type_id: selectedMaintType
      });

      setSelectedCertificateIds(nextIds);
      setMappedCertificates(response.data?.data || []);
      toast.success("Certificate unmapped successfully");
    } catch (error) {
      console.error("Failed to unmap certificate:", error);
      toast.error(error.response?.data?.message || "Failed to unmap certificate");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCertificate = async (id) => {
    const confirmed = window.confirm("Delete this certificate? This action cannot be undone.");
    if (!confirmed) return;

    setIsCreating(true);
    try {
      await API.delete(`/tech-certificates/${id}`);
      setCertificates((prev) => prev.filter((cert) => cert.tech_cert_id !== id));
      toast.success("Certificate deleted successfully");
    } catch (error) {
      console.error("Failed to delete certificate:", error);
      toast.error(error.response?.data?.message || "Failed to delete certificate");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteSelectedCertificates = async () => {
    if (selectedCertificateRows.length === 0) {
      toast.error("Please select at least one certificate to delete");
      return;
    }

    const confirmed = window.confirm(`Delete ${selectedCertificateRows.length} certificate(s)? This action cannot be undone.`);
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await Promise.all(selectedCertificateRows.map((id) => API.delete(`/tech-certificates/${id}`)));
      toast.success(`${selectedCertificateRows.length} certificate(s) deleted successfully`);
      setSelectedCertificateRows([]);
      await fetchCertificates();
      if (selectedAssetType) {
        await fetchMappedCertificates(selectedAssetType);
      }
    } catch (error) {
      console.error("Failed to delete selected certificates:", error);
      toast.error("Failed to delete some certificates");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!selectedAssetType) {
      toast.error("Please select an asset type");
      return;
    }

    if (!selectedMaintType) {
      toast.error("Please select a maintenance type");
      return;
    }

    setIsSaving(true);
    try {
      const response = await API.post(`/asset-types/${selectedAssetType}/maintenance-certificates`, {
        certificate_ids: selectedCertificateIds,
        maint_type_id: selectedMaintType
      });

      setMappedCertificates(response.data?.data || []);
      toast.success("Certificates mapped successfully");
    } catch (error) {
      console.error("Failed to map certificates:", error);
      toast.error(error.response?.data?.message || "Failed to map certificates");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnmapSelected = async () => {
    if (!selectedAssetType) {
      toast.error("Please select an asset type");
      return;
    }

    if (!selectedMaintType) {
      toast.error("Please select a maintenance type");
      return;
    }

    if (selectedMappedRows.length === 0) {
      toast.error("Please select at least one certificate to unmap");
      return;
    }

    const confirmed = window.confirm(`Remove ${selectedMappedRows.length} certificate(s) from the mapping?`);
    if (!confirmed) return;

    const nextIds = mappedCertificates
      .map((cert) => cert.tech_cert_id)
      .filter((id) => id && !selectedMappedRows.includes(id));

    setIsSaving(true);
    try {
      const response = await API.post(`/asset-types/${selectedAssetType}/maintenance-certificates`, {
        certificate_ids: nextIds,
        maint_type_id: selectedMaintType
      });

      setSelectedCertificateIds(nextIds);
      setMappedCertificates(response.data?.data || []);
      setSelectedMappedRows([]);
      toast.success("Certificates unmapped successfully");
    } catch (error) {
      console.error("Failed to unmap selected certificates:", error);
      toast.error(error.response?.data?.message || "Failed to unmap certificates");
    } finally {
      setIsSaving(false);
    }
  };

  const certificateOptions = useMemo(() => {
    return certificates.map((cert) => ({
      value: cert.tech_cert_id,
      label: `${cert.cert_name || ""}${cert.cert_number ? ` (${cert.cert_number})` : ""}`.trim()
    }));
  }, [certificates]);

  const selectedAssetTypeLabel = useMemo(() => {
    return assetTypes.find((type) => type.asset_type_id === selectedAssetType)?.text || "";
  }, [assetTypes, selectedAssetType]);

  const selectedMaintTypeLabel = useMemo(() => {
    return maintTypes.find((type) => type.maint_type_id === selectedMaintType)?.text || "";
  }, [maintTypes, selectedMaintType]);

  const certificateFilterColumns = [
    { label: "Certificate Name", value: "cert_name" },
    { label: "Certificate Number", value: "cert_number" }
  ];

  const filteredCertificates = useMemo(() => {
    return filterData(certificates, { columnFilters: createColumnFilters }, []);
  }, [certificates, createColumnFilters]);

  const selectableCertificateIds = useMemo(() => {
    return filteredCertificates
      .map((cert) => cert.tech_cert_id)
      .filter((id) => id !== null && id !== undefined);
  }, [filteredCertificates]);

  const isAllCertificatesSelected =
    selectableCertificateIds.length > 0 &&
    selectableCertificateIds.every((id) => selectedCertificateRows.includes(id));

  const filteredMappedCertificates = useMemo(() => {
    return filterData(mappedCertificates, { columnFilters: mappingColumnFilters }, []);
  }, [mappedCertificates, mappingColumnFilters]);

  const selectableMappedIds = useMemo(() => {
    return filteredMappedCertificates
      .map((cert) => cert.tech_cert_id)
      .filter((id) => id !== null && id !== undefined);
  }, [filteredMappedCertificates]);

  const isAllMappedSelected =
    selectableMappedIds.length > 0 &&
    selectableMappedIds.every((id) => selectedMappedRows.includes(id));

  const updateColumnFilter = (setFilters, index, key, value) => {
    setFilters((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const addColumnFilter = (setFilters) => {
    setFilters((prev) => [...prev, { column: "", value: "" }]);
  };

  const removeColumnFilter = (setFilters, index) => {
    setFilters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearColumnFilters = (setFilters) => {
    setFilters([{ column: "", value: "" }]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <nav className="flex flex-wrap -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab("create")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "create"
                  ? "border-[#0E2F4B] text-[#0E2F4B]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Certificate Creation
            </button>
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "mapping"
                  ? "border-[#0E2F4B] text-[#0E2F4B]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Mapping Asset Types
            </button>
          </nav>
        </div>
      </div>

      {activeTab === "create" && (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Existing Certificates</h2>
                <p className="text-sm text-gray-500">Manage maintenance certificates stored in the system.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCreateFilterOpen((prev) => !prev)}
                  className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                  title="Filter"
                >
                  <Filter size={18} />
                </button>
                <button
                  onClick={handleDeleteSelectedCertificates}
                  disabled={isBulkDeleting || selectedCertificateRows.length === 0}
                  className="flex items-center justify-center text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-60 px-3 py-2"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
                <button
                  onClick={() => setShowCreateForm((prev) => !prev)}
                  className="flex items-center justify-center bg-[#0E2F4B] text-white rounded-md hover:bg-[#12395c] transition px-3 py-2"
                  title={showCreateForm ? "Close" : "Add"}
                >
                  <Plus size={18} />
                </button>
              </div>
            </div>

            {createFilterOpen && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {createColumnFilters.map((filter, index) => (
                      <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                        {createColumnFilters.length > 1 && (
                          <button
                            onClick={() => removeColumnFilter(setCreateColumnFilters, index)}
                            className="bg-gray-200 text-gray-700 px-1 rounded-full"
                            title="Remove filter"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                        <select
                          className="border text-sm px-2 py-1"
                          value={filter.column}
                          onChange={(e) => updateColumnFilter(setCreateColumnFilters, index, "column", e.target.value)}
                        >
                          <option value="">Select column</option>
                          {certificateFilterColumns.map((col) => (
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
                          onChange={(e) => updateColumnFilter(setCreateColumnFilters, index, "value", e.target.value)}
                        />
                        {index === createColumnFilters.length - 1 && (
                          <button
                            onClick={() => addColumnFilter(setCreateColumnFilters)}
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
                    onClick={() => clearColumnFilters(setCreateColumnFilters)}
                    className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {showCreateForm && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name</label>
                  <input
                    type="text"
                    value={certName}
                    onChange={(e) => setCertName(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    placeholder="Enter certificate name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                  <input
                    type="text"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                    placeholder="Enter certificate number"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleCreateCertificate}
                    disabled={isCreating}
                    className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                  <tr className="text-white text-sm font-medium">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={isAllCertificatesSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCertificateRows(selectableCertificateIds);
                          } else {
                            setSelectedCertificateRows([]);
                          }
                        }}
                        className="accent-yellow-400"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Certificate Name</th>
                    <th className="px-4 py-3 text-left">Certificate Number</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-500">Loading certificates...</td>
                    </tr>
                  ) : filteredCertificates.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-gray-500">No certificates found.</td>
                    </tr>
                  ) : (
                    filteredCertificates.map((cert, index) => (
                      <tr
                        key={cert.tech_cert_id}
                        className={`border-t ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                      >
                        <td className="px-4 py-3 text-gray-800">
                          <input
                            type="checkbox"
                            checked={selectedCertificateRows.includes(cert.tech_cert_id)}
                            onChange={() => {
                              setSelectedCertificateRows((prev) =>
                                prev.includes(cert.tech_cert_id)
                                  ? prev.filter((id) => id !== cert.tech_cert_id)
                                  : [...prev, cert.tech_cert_id]
                              );
                            }}
                            className="accent-yellow-400"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {editingId === cert.tech_cert_id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                            />
                          ) : (
                            cert.cert_name
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {editingId === cert.tech_cert_id ? (
                            <input
                              type="text"
                              value={editNumber}
                              onChange={(e) => setEditNumber(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                            />
                          ) : (
                            cert.cert_number
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {editingId === cert.tech_cert_id ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleUpdateCertificate(cert.tech_cert_id)}
                                disabled={isCreating}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-60"
                                title="Save"
                              >
                                <Save size={18} />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                                title="Cancel"
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEdit(cert)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDeleteCertificate(cert.tech_cert_id)}
                                disabled={isCreating}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-60"
                                title="Delete"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === "mapping" && (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Map Certificates to Asset Types</h2>
            </div>

            {mappingFilterOpen && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {mappingColumnFilters.map((filter, index) => (
                      <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                        {mappingColumnFilters.length > 1 && (
                          <button
                            onClick={() => removeColumnFilter(setMappingColumnFilters, index)}
                            className="bg-gray-200 text-gray-700 px-1 rounded-full"
                            title="Remove filter"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                        <select
                          className="border text-sm px-2 py-1"
                          value={filter.column}
                          onChange={(e) => updateColumnFilter(setMappingColumnFilters, index, "column", e.target.value)}
                        >
                          <option value="">Select column</option>
                          {certificateFilterColumns.map((col) => (
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
                          onChange={(e) => updateColumnFilter(setMappingColumnFilters, index, "value", e.target.value)}
                        />
                        {index === mappingColumnFilters.length - 1 && (
                          <button
                            onClick={() => addColumnFilter(setMappingColumnFilters)}
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
                    onClick={() => clearColumnFilters(setMappingColumnFilters)}
                    className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Create New Mapping</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                  <select
                    value={selectedAssetType}
                    onChange={(e) => setSelectedAssetType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  >
                    <option value="">Select asset type</option>
                    {assetTypes.map((type) => (
                      <option key={type.asset_type_id} value={type.asset_type_id}>
                        {type.text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
                  <select
                    value={selectedMaintType}
                    onChange={(e) => setSelectedMaintType(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                  >
                    <option value="">Select maintenance type</option>
                    {filteredMaintTypes.map((type) => (
                      <option key={type.maint_type_id} value={type.maint_type_id}>
                        {type.text}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificates</label>
                  <DropdownMultiSelect
                    values={selectedCertificateIds}
                    onChange={setSelectedCertificateIds}
                    options={certificateOptions}
                    placeholder="Select certificates"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleSaveMapping}
                    disabled={isSaving}
                    className="px-1 py-2 bg-[#0E2F4B] text-white text-sm font-medium rounded-md hover:bg-[#12395c] transition disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-md font-semibold text-gray-900">Mapped Certificates</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMappingFilterOpen((prev) => !prev)}
                    className="flex items-center justify-center text-white border border-gray-300 rounded px-3 py-2 hover:bg-[#143d65] bg-[#0E2F4B]"
                    title="Filter"
                  >
                    <Filter size={18} />
                  </button>
                  <button
                    onClick={handleUnmapSelected}
                    disabled={isSaving || selectedMappedRows.length === 0}
                    className="flex items-center justify-center text-white bg-red-600 rounded-md hover:bg-red-700 transition disabled:opacity-60 px-3 py-2"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                    <tr className="text-white text-sm font-medium">
                      <th className="px-4 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={isAllMappedSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMappedRows(selectableMappedIds);
                            } else {
                              setSelectedMappedRows([]);
                            }
                          }}
                          className="accent-yellow-400"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Certificate Name</th>
                      <th className="px-4 py-3 text-left">Asset Type</th>
                      <th className="px-4 py-3 text-left">Maintenance Type</th>
                      <th className="px-4 py-3 text-left">Certificate Number</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedAssetType && filteredMappedCertificates.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">No certificates mapped.</td>
                      </tr>
                    ) : !selectedAssetType ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">Select an asset type to view mappings.</td>
                      </tr>
                    ) : (
                      filteredMappedCertificates.map((cert, index) => (
                        <tr
                          key={`${cert.tech_cert_id}-${cert.cert_name}`}
                          className={`border-t ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                        >
                          <td className="px-4 py-3 text-gray-800">
                            <input
                              type="checkbox"
                              checked={selectedMappedRows.includes(cert.tech_cert_id)}
                              onChange={() => {
                                setSelectedMappedRows((prev) =>
                                  prev.includes(cert.tech_cert_id)
                                    ? prev.filter((id) => id !== cert.tech_cert_id)
                                    : [...prev, cert.tech_cert_id]
                                );
                              }}
                              className="accent-yellow-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {mappedEditingId === cert.tech_cert_id ? (
                              <input
                                type="text"
                                value={mappedEditName}
                                onChange={(e) => setMappedEditName(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                              />
                            ) : (
                              cert.cert_name
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {selectedAssetTypeLabel || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {selectedMaintTypeLabel || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {mappedEditingId === cert.tech_cert_id ? (
                              <input
                                type="text"
                                value={mappedEditNumber}
                                onChange={(e) => setMappedEditNumber(e.target.value)}
                                className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                              />
                            ) : (
                              cert.cert_number
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {mappedEditingId === cert.tech_cert_id ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleMappedUpdate(cert.tech_cert_id)}
                                  disabled={isSaving}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-60"
                                  title="Save"
                                >
                                  <Save size={18} />
                                </button>
                                <button
                                  onClick={cancelMappedEdit}
                                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors"
                                  title="Cancel"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => startMappedEdit(cert)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                  title="Edit"
                                >
                                  <Edit2 size={18} />
                                </button>
                                <button
                                  onClick={() => handleUnmapCertificate(cert.tech_cert_id)}
                                  disabled={isSaving}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-60"
                                  title="Delete"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certifications;
