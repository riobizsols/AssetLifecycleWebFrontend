import React, { useEffect, useMemo, useState, useRef } from "react";
import { 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Filter, 
  Plus, 
  Minus, 
  ArrowRight, 
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  Search,
  ChevronDown,
  Check
} from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { DropdownMultiSelect } from "../../components/reportModels/ReportComponents";
import { filterData } from "../../utils/filterData";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import { generateUUID } from "../../utils/uuid";

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
  
  const [selectedAssetType, setSelectedAssetType] = useState("");
  const [selectedMaintType, setSelectedMaintType] = useState("");
  const [mappedCertificates, setMappedCertificates] = useState([]);
  const [selectedCertificateIds, setSelectedCertificateIds] = useState([]);
  const [selectedCertificateRows, setSelectedCertificateRows] = useState([]);
  const [allMappedCertificates, setAllMappedCertificates] = useState([]); // Store all mappings for display

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
  
  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteType, setDeleteType] = useState(null); // 'certificates', 'mapped', or 'inspection'
  
  // Mapping form - split certificate lists
  const [availableCertificatesForMapping, setAvailableCertificatesForMapping] = useState([]);
  const [selectedCertificatesForMapping, setSelectedCertificatesForMapping] = useState([]);
  const [mappingFormSearchAvailable, setMappingFormSearchAvailable] = useState("");
  const [mappingFormSearchSelected, setMappingFormSearchSelected] = useState("");
  
  // Track last mapping initialization to avoid re-syncing while user is editing
  const mappingFormInitRef = useRef({ assetType: '', maintType: '' });
  const inspectionFormInitRef = useRef({ assetType: '' });

  // Inspection Certificates states
  const [inspectionCertificates, setInspectionCertificates] = useState([]);
  const [selectedInspectionAssetType, setSelectedInspectionAssetType] = useState("");
  const [inspectionFilterOpen, setInspectionFilterOpen] = useState(false);
  const [inspectionColumnFilters, setInspectionColumnFilters] = useState([
    { column: "", value: "" }
  ]);
  const [selectedInspectionRows, setSelectedInspectionRows] = useState([]);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [availableCertificatesForInspection, setAvailableCertificatesForInspection] = useState([]);
  const [selectedCertificatesForInspection, setSelectedCertificatesForInspection] = useState([]);
  const [inspectionFormSearchAvailable, setInspectionFormSearchAvailable] = useState("");
  const [inspectionFormSearchSelected, setInspectionFormSearchSelected] = useState("");
  
  // Document upload states for inspection certificates
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  
  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedCertForUpdate, setSelectedCertForUpdate] = useState(null);
  const [updateCertName, setUpdateCertName] = useState("");
  const [updateCertNumber, setUpdateCertNumber] = useState("");
  const [isUpdatingCert, setIsUpdatingCert] = useState(false);
  
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Helper functions for inspection certificate selection
  const handleSelectInspectionCert = (cert) => {
    setSelectedCertificatesForInspection(prev => [...prev, cert]);
    // Note: availableCertificatesForInspection is usually the full 'certificates' list, 
    // and we filter it in the UI to exclude selected ones.
  };

  const handleDeselectInspectionCert = (cert) => {
    setSelectedCertificatesForInspection(prev => 
      prev.filter(c => c.tech_cert_id !== cert.tech_cert_id)
    );
  };

  const handleSelectAllInspectionCert = (filteredAvailable) => {
    setSelectedCertificatesForInspection(prev => [...prev, ...filteredAvailable]);
  };

  const handleDeselectAllInspectionCert = (filteredSelected) => {
    setSelectedCertificatesForInspection(prev => 
      prev.filter(cert => !filteredSelected.some(s => s.tech_cert_id === cert.tech_cert_id))
    );
  };

  const fetchCertificates = async () => {
    setIsLoading(true);
    try {
      const response = await API.get("/tech-certificates");
      const data = response.data?.data || [];
      console.log("✅ Fetched technical certificates:", data);
      setCertificates(data);
    } catch (error) {
      console.error("❌ Failed to fetch certificates:", error);
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

  const formatDate = (dateString) => {
    if (!dateString || dateString === 'NULL' || dateString === 'null') return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (err) {
      return 'N/A';
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for inspection certificates...');
      // Using 'inspection certificate' object type
      const res = await API.get('/doc-type-objects/object-type/inspection certificate');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        const docTypes = res.data.data.map(docType => ({
          id: docType.dto_id,
          text: docType.doc_type_text,
          doc_type: docType.doc_type
        }));
        setDocumentTypes(docTypes);
      } else {
        setDocumentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching document types:', err);
      setDocumentTypes([]);
    }
  };

  const fetchInspectionCertificates = async () => {
    try {
      const response = await API.get("/asset-types/inspection-certificates");
      const data = response.data?.data || [];
      console.log("📍 Fetched all inspection certificates:", data);
      setInspectionCertificates(data);
    } catch (error) {
      console.error("Failed to fetch inspection certificates:", error);
      // Don't show error toast on initial load
    }
  };

  useEffect(() => {
    if (activeTab === "inspection") {
      fetchInspectionCertificates();
      fetchDocumentTypes();
    }
  }, [activeTab]);

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
      console.log("📍 Fetched mapped certificates for asset type:", assetTypeId, "Data:", data);
      setMappedCertificates(data);
      setSelectedCertificateIds(data.map((cert) => cert.tech_cert_id));
      const maintTypeId = data.find((cert) => cert.maint_type_id)?.maint_type_id || "";
      setSelectedMaintType(maintTypeId);
    } catch (error) {
      console.error("❌ Failed to fetch mapped certificates:", error);
      // Don't show toast here to avoid interfering with success messages from save operations
      setMappedCertificates([]);
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
    fetchInspectionCertificates();
    
    // Restore last selected asset type from localStorage
    const saved = localStorage.getItem("lastSelectedAssetType");
    if (saved) {
      console.log("📌 Restoring last selected asset type:", saved);
      setSelectedAssetType(saved);
    }
  }, []);

  useEffect(() => {
    if (selectedAssetType) {
      // Save to localStorage whenever asset type changes
      localStorage.setItem("lastSelectedAssetType", selectedAssetType);
      console.log("🔄 Asset Type selected, fetching mapped certificates for:", selectedAssetType);
      fetchMappedCertificates(selectedAssetType);
      fetchMaintenanceTypesForAssetType(selectedAssetType);
    } else {
      console.log("⚪ No asset type selected, clearing mapped certificates");
      fetchMappedCertificates(selectedAssetType);
      fetchMaintenanceTypesForAssetType(selectedAssetType);
    }
  }, [selectedAssetType]);

  // Auto-select first asset type when asset types are loaded
  useEffect(() => {
    if (assetTypes.length > 0 && !selectedAssetType) {
      const firstAssetTypeId = assetTypes[0].asset_type_id;
      console.log("🔶 Auto-selecting first asset type:", firstAssetTypeId);
      setSelectedAssetType(firstAssetTypeId);
    }
  }, [assetTypes]);

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

  // Sync Mapping Form lists (Available vs Selected) based on current mapping in DB
  useEffect(() => {
    if (showMappingForm && selectedAssetType && selectedMaintType) {
      // If the selection has changed, we should re-initialize the available/selected lists
      if (mappingFormInitRef.current.assetType !== selectedAssetType || 
          mappingFormInitRef.current.maintType !== selectedMaintType) {
        
        console.log("🛠️ Syncing mapping lists for:", selectedAssetType, selectedMaintType);
        
        const existingMappings = mappedCertificates.filter(
          (cert) => String(cert.maint_type_id) === String(selectedMaintType)
        );
        
        const existingMappingIds = existingMappings.map(c => c.tech_cert_id);
        
        setSelectedCertificatesForMapping(existingMappings);
        setAvailableCertificatesForMapping(
          certificates.filter(c => !existingMappingIds.includes(c.tech_cert_id))
        );
        
        mappingFormInitRef.current = { assetType: selectedAssetType, maintType: selectedMaintType };
      }
    } else if (!showMappingForm) {
      // Reset ref when form is closed so it re-initializes next time
      mappingFormInitRef.current = { assetType: '', maintType: '' };
    }
  }, [showMappingForm, selectedAssetType, selectedMaintType, mappedCertificates, certificates]);

  // Sync Inspection Form lists (Available vs Selected) based on current inspection in DB
  useEffect(() => {
    if (showInspectionForm && selectedInspectionAssetType) {
      // If the selection has changed, we should re-initialize the available/selected lists
      if (inspectionFormInitRef.current.assetType !== selectedInspectionAssetType) {
        
        console.log("🛠️ Syncing inspection list for:", selectedInspectionAssetType);
        
        // Find certificates already mapped to this asset type for inspection
        const existingInspections = inspectionCertificates.filter(
          (cert) => String(cert.asset_type_id) === String(selectedInspectionAssetType)
        );
        
        // We need them in the structure of technical certificates for the transfer component
        // Typically they are fetched from the DB but associated with the tech_cert records
        const existingTechCertIds = existingInspections.map(c => c.tech_cert_id);
        
        const mappedTechCerts = certificates.filter(c => existingTechCertIds.includes(c.tech_cert_id));
        
        setSelectedCertificatesForInspection(mappedTechCerts);
        setAvailableCertificatesForInspection(
          certificates.filter(c => !existingTechCertIds.includes(c.tech_cert_id))
        );
        
        inspectionFormInitRef.current = { assetType: selectedInspectionAssetType };
      }
    } else if (!showInspectionForm) {
      // Reset ref when form is closed so it re-initializes next time
      inspectionFormInitRef.current = { assetType: '' };
    }
  }, [showInspectionForm, selectedInspectionAssetType, inspectionCertificates, certificates]);

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

  const openUpdateModal = (cert) => {
    setSelectedCertForUpdate(cert);
    setUpdateCertName(cert.cert_name || "");
    setUpdateCertNumber(cert.cert_number || "");
    setShowUpdateModal(true);
  };

  const handleUpdateCertificate = async () => {
    if (!updateCertName.trim()) {
      toast.error("Certificate name is required");
      return;
    }

    if (!updateCertNumber.trim()) {
      toast.error("Certificate number is required");
      return;
    }

    setIsUpdatingCert(true);
    try {
      const response = await API.put(`/tech-certificates/${selectedCertForUpdate.tech_cert_id}`, {
        cert_name: updateCertName.trim(),
        cert_number: updateCertNumber.trim()
      });

      if (response.data?.success) {
        toast.success("Certificate updated successfully");
        setShowUpdateModal(false);
        fetchCertificates(); // Refresh to catch all changes
        if (selectedAssetType) fetchMappedCertificates(selectedAssetType);
        if (selectedInspectionAssetType) fetchInspectionCertificates(selectedInspectionAssetType);
      }
    } catch (error) {
      console.error("Failed to update certificate:", error);
      toast.error(error.response?.data?.message || "Failed to update certificate");
    } finally {
      setIsUpdatingCert(false);
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

    setDeleteType('certificates');
    setShowDeleteModal(true);
  };

  const confirmDeleteCertificates = async () => {
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
      setShowDeleteModal(false);
      setDeleteType(null);
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
      const certIds = selectedCertificatesForMapping.map(cert => cert.tech_cert_id);
      console.log("📤 Saving maintenance certificates:", { selectedAssetType, certIds, selectedMaintType });
      
      const response = await API.post(`/asset-types/${selectedAssetType}/maintenance-certificates`, {
        certificate_ids: certIds,
        maint_type_id: selectedMaintType
      });

      console.log("📥 Save response:", response.data);

      // Use the response data if available, otherwise refetch
      if (response.data?.data) {
        console.log("✅ Using response data to update state:", response.data.data);
        setMappedCertificates(response.data.data);
        setSelectedCertificateIds(response.data.data.map((cert) => cert.tech_cert_id));
        const maintTypeId = response.data.data.find((cert) => cert.maint_type_id)?.maint_type_id || "";
        setSelectedMaintType(maintTypeId);
      } else {
        console.log("🔄 No response data, refetching mapped certificates");
        // Refetch the mapped certificates from backend to ensure persistence
        await fetchMappedCertificates(selectedAssetType);
      }
      
      toast.success("Certificates mapped successfully");
    } catch (error) {
      console.error("❌ Failed to map certificates:", error);
      toast.error(error.response?.data?.message || "Failed to map certificates");
    } finally {
      setIsSaving(false);
      setShowMappingForm(false);
      setAvailableCertificatesForMapping([]);
      setSelectedCertificatesForMapping([]);
      setMappingFormSearchAvailable("");
      setMappingFormSearchSelected("");
      // Keep selectedAssetType and selectedMaintType to show the list for that category after save
    }
  };

  // Helper functions for moving certificates
  const moveToSelected = (cert) => {
    setSelectedCertificatesForMapping(prev => [...prev, cert]);
    setAvailableCertificatesForMapping(prev => prev.filter(c => c.tech_cert_id !== cert.tech_cert_id));
  };

  const moveToAvailable = (cert) => {
    setAvailableCertificatesForMapping(prev => [...prev, cert]);
    setSelectedCertificatesForMapping(prev => prev.filter(c => c.tech_cert_id !== cert.tech_cert_id));
  };

  const moveAllToSelected = () => {
    setSelectedCertificatesForMapping(prev => [...prev, ...filteredAvailableCertsMapping]);
    setAvailableCertificatesForMapping(prev => 
      prev.filter(cert => !filteredAvailableCertsMapping.some(c => c.tech_cert_id === cert.tech_cert_id))
    );
  };

  const moveAllToAvailable = () => {
    setAvailableCertificatesForMapping(prev => [...prev, ...filteredSelectedCertsMapping]);
    setSelectedCertificatesForMapping(prev =>
      prev.filter(cert => !filteredSelectedCertsMapping.some(c => c.tech_cert_id === cert.tech_cert_id))
    );
  };

  // Filtered lists for mapping form
  const filteredAvailableCertsMapping = useMemo(() => {
    return availableCertificatesForMapping.filter(cert =>
      (cert.cert_name?.toLowerCase() || '').includes(mappingFormSearchAvailable.toLowerCase()) ||
      (cert.cert_number?.toLowerCase() || '').includes(mappingFormSearchAvailable.toLowerCase())
    );
  }, [availableCertificatesForMapping, mappingFormSearchAvailable]);

  const filteredSelectedCertsMapping = useMemo(() => {
    return selectedCertificatesForMapping.filter(cert =>
      (cert.cert_name?.toLowerCase() || '').includes(mappingFormSearchSelected.toLowerCase()) ||
      (cert.cert_number?.toLowerCase() || '').includes(mappingFormSearchSelected.toLowerCase())
    );
  }, [selectedCertificatesForMapping, mappingFormSearchSelected]);

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

    setDeleteType('mapped');
    setShowDeleteModal(true);
  };

  const confirmUnmapSelected = async () => {
    const nextIds = mappedCertificates
      .map((cert) => cert.tech_cert_id)
      .filter((id) => id && !selectedMappedRows.includes(id));

    setIsSaving(true);
    try {
      await API.post(`/asset-types/${selectedAssetType}/maintenance-certificates`, {
        certificate_ids: nextIds,
        maint_type_id: selectedMaintType
      });

      // Refetch the mapped certificates from backend to ensure persistence
      await fetchMappedCertificates(selectedAssetType);
      setSelectedMappedRows([]);
      toast.success("Certificates unmapped successfully");
    } catch (error) {
      console.error("Failed to unmap selected certificates:", error);
      toast.error(error.response?.data?.message || "Failed to unmap certificates");
    } finally {
      setIsSaving(false);
      setShowDeleteModal(false);
      setDeleteType(null);
    }
  };

  const handleSaveInspectionCertificates = async () => {
    if (!selectedInspectionAssetType) {
      toast.error("Please select an asset type");
      return;
    }

    if (selectedCertificatesForInspection.length === 0) {
      toast.error("Please select at least one certificate");
      return;
    }

    setIsSaving(true);
    try {
      const certIds = selectedCertificatesForInspection.map(cert => cert.tech_cert_id);
      const response = await API.post(`/asset-types/${selectedInspectionAssetType}/inspection-certificates`, {
        certificate_ids: certIds
      });

      // Handle document uploads if any
      if (uploadRows.length > 0) {
        // We'll need to know which record to associate the documents with.
        // Usually, these are associated with the asset_type_id if it's a general config,
        // or specific records. The backend for /asset-types/:id/inspection-certificates
        // likely creates rows in tblATInspCert.
        
        for (const r of uploadRows) {
          if (!r.type || !r.file) continue;
          
          const fd = new FormData();
          fd.append('file', r.file);
          fd.append('dto_id', r.type);
          fd.append('asset_type_id', selectedInspectionAssetType); // Associate with asset type
          if (r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          try {
            await API.post('/asset-type-docs/upload', fd, { 
              headers: { 'Content-Type': 'multipart/form-data' }
            });
          } catch (upErr) {
            console.error('Document upload failed', upErr);
          }
        }
      }

      // Refetch inspection certificates from backend to ensure persistence
      await fetchInspectionCertificates();
      toast.success("Inspection certificates added successfully");
    } catch (error) {
      console.error("Failed to add inspection certificates:", error);
      
      // Check if the error is about the database table not existing
      if (error.response?.data?.error && error.response.data.error.includes('tblATInspCert')) {
        toast.error("Database setup required. Please contact your administrator to run the inspection certificates migration.");
      } else {
        toast.error(error.response?.data?.message || "Failed to add inspection certificates");
      }
    } finally {
      setIsSaving(false);
      setShowInspectionForm(false);
      setAvailableCertificatesForInspection([]);
      setSelectedCertificatesForInspection([]);
      setInspectionFormSearchAvailable("");
      setInspectionFormSearchSelected("");
      // Keep selectedInspectionAssetType to show the list for that category after save
      setUploadRows([]);
    }
  };

  const handleDeleteInspectionCertificates = () => {
    if (selectedInspectionRows.length === 0) {
      toast.error("Please select certificates to remove");
      return;
    }
    setDeleteType('inspection');
    setShowDeleteModal(true);
  };

  const confirmDeleteInspectionCertificates = async () => {
    setIsSaving(true);
    try {
      await Promise.all(selectedInspectionRows.map(id => API.delete(`/asset-types/inspection-certificates/${id}`)));
      await fetchInspectionCertificates();
      setSelectedInspectionRows([]);
      toast.success("Inspection certificates removed");
    } catch (error) {
      console.error("Failed to remove inspection certificates:", error);
      toast.error("Failed to remove some certificates");
    } finally {
      setIsSaving(false);
      setShowDeleteModal(false);
      setDeleteType(null);
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
              Certificate
            </button>
            <button
              onClick={() => setActiveTab("mapping")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "mapping"
                  ? "border-[#0E2F4B] text-[#0E2F4B]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Maintenance Certificate
            </button>
            <button
              onClick={() => setActiveTab("inspection")}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "inspection"
                  ? "border-[#0E2F4B] text-[#0E2F4B]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Inspection Certificates
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
                  onClick={() => setShowCreateForm((prev) => !prev)}
                  className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                  title={showCreateForm ? "Close" : "Add"}
                >
                  <Plus size={16} />
                </button>
                <button
                  onClick={() => setCreateFilterOpen((prev) => !prev)}
                  className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                  title="Filter"
                >
                  <Filter size={16} />
                </button>
                <button
                  onClick={handleDeleteSelectedCertificates}
                  disabled={isBulkDeleting}
                  className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                  title="Delete"
                >
                  <Trash2 size={16} />
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
                    onClick={() => {
                      clearColumnFilters(setCreateColumnFilters);
                      setCreateFilterOpen(false);
                    }}
                    className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {showCreateForm && (
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Add New Certificate</h3>
                
                <div className="space-y-4 mb-6">
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
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setCertName("");
                      setCertNumber("");
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateCertificate}
                    disabled={isCreating}
                    className="px-4 py-2 bg-[#0E2F4B] text-white text-sm font-medium rounded-md hover:bg-[#12395c] transition disabled:opacity-60"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}

            {!showCreateForm && (
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
                          {cert.cert_name}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          {cert.cert_number}
                        </td>
                        <td className="px-4 py-3 text-gray-800">
                          <button
                            onClick={() => openUpdateModal(cert)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                            title="Edit"
                          >
                            <Pencil size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "mapping" && (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Maintenance Certificates</h2>
              </div>
              <div className="flex items-center gap-2">
                {!showMappingForm && (
                  <button
                    onClick={() => {
                      setShowMappingForm(true);
                      setAvailableCertificatesForMapping(certificates);
                      setSelectedCertificatesForMapping([]);
                      setMappingFormSearchAvailable("");
                      setMappingFormSearchSelected("");
                    }}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Add"
                  >
                    <Plus size={16} />
                  </button>
                )}
                {!showMappingForm && (
                  <button
                    onClick={() => setMappingFilterOpen((prev) => !prev)}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Filter"
                  >
                    <Filter size={16} />
                  </button>
                )}
                {!showMappingForm && (
                  <button
                    onClick={handleUnmapSelected}
                    disabled={isSaving}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
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
                    onClick={() => {
                      clearColumnFilters(setMappingColumnFilters);
                      setMappingFilterOpen(false);
                    }}
                    className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {showMappingForm && (
              <>
<<<<<<< HEAD
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
                  <div className="relative z-50">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Certificates</label>
                    <DropdownMultiSelect
                      values={selectedCertificateIds}
                      onChange={setSelectedCertificateIds}
                      options={certificateOptions}
                      placeholder="Select certificates"
                    />
=======
                {/* Asset Type & Maintenance Type Section */}
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Asset & Maintenance Type</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
>>>>>>> origin/main
                  </div>
                </div>

                {/* Two-Column Certificates Section - Table Layout */}
                <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 mb-6">
                  {/* Available Certificates - Left Side */}
                  <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
                    <div className="p-4 border-b flex-shrink-0">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Certificates</h2>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search available certificates..."
                          value={mappingFormSearchAvailable}
                          onChange={(e) => setMappingFormSearchAvailable(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-auto text-sm">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Number</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredAvailableCertsMapping.length > 0 ? (
                              filteredAvailableCertsMapping.map((cert) => (
                                <tr 
                                  key={cert.tech_cert_id}
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => moveToSelected(cert)}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_number}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="2" className="px-4 py-8 text-center text-gray-500">No certificates available</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Middle Buttons */}
                  <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
                    <button
                      onClick={() => moveToSelected(filteredAvailableCertsMapping[0])}
                      disabled={filteredAvailableCertsMapping.length === 0}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Add selected"
                    >
                      <span className="text-lg font-bold">→</span>
                    </button>
                    <button
                      onClick={moveAllToSelected}
                      disabled={filteredAvailableCertsMapping.length === 0}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Add all"
                    >
                      <span className="text-lg font-bold">{'>>'}</span>
                    </button>
                    <button
                      onClick={() => moveToAvailable(filteredSelectedCertsMapping[0])}
                      disabled={filteredSelectedCertsMapping.length === 0}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove selected"
                    >
                      <span className="text-lg font-bold">←</span>
                    </button>
                    <button
                      onClick={moveAllToAvailable}
                      disabled={filteredSelectedCertsMapping.length === 0}
                      className="p-2 text-gray-600 hover:text-gray-900 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove all"
                    >
                      <span className="text-lg font-bold">{'<<'}</span>
                    </button>
                  </div>

                  {/* Selected Certificates - Right Side */}
                  <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
                    <div className="p-4 border-b flex-shrink-0">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Certificates</h2>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder="Search selected certificates..."
                          value={mappingFormSearchSelected}
                          onChange={(e) => setMappingFormSearchSelected(e.target.value)}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="h-full overflow-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Number</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {filteredSelectedCertsMapping.length > 0 ? (
                              filteredSelectedCertsMapping.map((cert) => (
                                <tr 
                                  key={cert.tech_cert_id}
                                  className="hover:bg-gray-50 cursor-pointer"
                                  onClick={() => moveToAvailable(cert)}
                                >
                                  <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_name}</td>
                                  <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_number}</td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="2" className="px-4 py-8 text-center text-gray-500">No certificates selected</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Footer for Certificates */}
                <div className="bg-white rounded-lg shadow-sm border p-4 mb-6 flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total Certificates Selected: <span className="font-semibold text-gray-900">{selectedCertificatesForMapping.length}</span>
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 mb-6">
                  <button
                    onClick={() => {
                      setShowMappingForm(false);
                      setAvailableCertificatesForMapping([]);
                      setSelectedCertificatesForMapping([]);
                      setMappingFormSearchAvailable("");
                      setMappingFormSearchSelected("");
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-400 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMapping}
                    disabled={isSaving}
                    className="px-4 py-2 bg-[#0E2F4B] text-white text-sm font-medium rounded-md hover:bg-[#12395c] transition disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                </div>
              </>
            )}

            {!showMappingForm && (
            <div>
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
                            {cert.cert_name}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {selectedAssetTypeLabel || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {selectedMaintTypeLabel || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {cert.cert_number}
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            <button
                              onClick={() => openUpdateModal(cert)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                              title="Edit"
                            >
                              <Pencil size={18} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "inspection" && (
        <div className="p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Inspection Certificates</h2>
              </div>
              <div className="flex items-center gap-2">
                {!showInspectionForm && (
                  <button
                    onClick={() => {
                      setShowInspectionForm(true);
                      setAvailableCertificatesForInspection(certificates);
                      setSelectedCertificatesForInspection([]);
                      setInspectionFormSearchAvailable("");
                      setInspectionFormSearchSelected("");
                      setUploadRows([]);
                    }}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Add"
                  >
                    <Plus size={16} />
                  </button>
                )}
                {!showInspectionForm && (
                  <button
                    onClick={() => setInspectionFilterOpen((prev) => !prev)}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Filter"
                  >
                    <Filter size={16} />
                  </button>
                )}
                {!showInspectionForm && (
                  <button
                    onClick={handleDeleteInspectionCertificates}
                    disabled={isSaving}
                    className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {inspectionFilterOpen && (
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {inspectionColumnFilters.map((filter, index) => (
                      <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                        {inspectionColumnFilters.length > 1 && (
                          <button
                            onClick={() => removeColumnFilter(setInspectionColumnFilters, index)}
                            className="bg-gray-200 text-gray-700 px-1 rounded-full"
                            title="Remove filter"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                        <select
                          className="border text-sm px-2 py-1"
                          value={filter.column}
                          onChange={(e) => updateColumnFilter(setInspectionColumnFilters, index, "column", e.target.value)}
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
                          onChange={(e) => updateColumnFilter(setInspectionColumnFilters, index, "value", e.target.value)}
                        />
                        {index === inspectionColumnFilters.length - 1 && (
                          <button
                            onClick={() => addColumnFilter(setInspectionColumnFilters)}
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
                    onClick={() => {
                      clearColumnFilters(setInspectionColumnFilters);
                      setInspectionFilterOpen(false);
                    }}
                    className="text-sm px-3 py-1 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}

            {showInspectionForm ? (
              <div className="flex flex-col h-full mt-4">
                <div className="sm:p-6 flex-1">
                  {/* Asset Type Selection - Separate Space */}
                  <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Asset Type</label>
                    <div className="relative max-w-md">
                      <button
                        type="button"
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm text-left bg-white flex items-center justify-between"
                      >
                        <span className={selectedInspectionAssetType ? 'text-gray-900' : 'text-gray-500'}>
                          {selectedInspectionAssetType ? 
                            (assetTypes.find(t => t.asset_type_id === selectedInspectionAssetType)?.text || selectedInspectionAssetType) 
                            : "Select Asset Type"}
                        </span>
                        <ChevronDown size={16} className="text-gray-400" />
                      </button>
                      
                      {isDropdownOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                          <div className="p-2 border-b border-gray-200">
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                              <input
                                type="text"
                                placeholder="Search asset types..."
                                value={dropdownSearchTerm}
                                onChange={(e) => setDropdownSearchTerm(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm"
                                autoFocus
                              />
                            </div>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {assetTypes
                              .filter(type => 
                                type.text?.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
                                type.asset_type_id?.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
                              )
                              .map((type) => (
                                <button
                                  key={type.asset_type_id}
                                  onClick={() => {
                                    setSelectedInspectionAssetType(type.asset_type_id);
                                    setIsDropdownOpen(false);
                                    setDropdownSearchTerm('');
                                    setAvailableCertificatesForInspection(certificates);
                                  }}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                                >
                                  <span className="text-sm text-gray-900">{type.text}</span>
                                  {selectedInspectionAssetType === type.asset_type_id && (
                                    <Check size={16} className="text-blue-600" />
                                  )}
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Main Content Area - Fixed height for tables */}
                  <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                    {/* Available Certificates - Left Side */}
                    <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
                      <div className="p-4 border-b flex-shrink-0">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Certificates</h2>
                        
                        {/* Search in Available */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search available certificates..."
                            value={inspectionFormSearchAvailable}
                            onChange={(e) => setInspectionFormSearchAvailable(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm"
                          />
                        </div>
                      </div>

                      {/* Table Container for Available */}
                      <div className="flex-1 overflow-hidden">
                        <div className="h-full overflow-auto text-sm">
                          {!selectedInspectionAssetType ? (
                            <div className="flex items-center justify-center h-32">
                              <div className="text-gray-500">Please select an asset type to view available certificates</div>
                            </div>
                          ) : (
                            <table className="w-full">
                              <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Name</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Number</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {certificates
                                  .filter(c => !selectedCertificatesForInspection.some(sc => sc.tech_cert_id === c.tech_cert_id))
                                  .filter(c => 
                                    c.cert_name.toLowerCase().includes(inspectionFormSearchAvailable.toLowerCase()) ||
                                    c.cert_number.toLowerCase().includes(inspectionFormSearchAvailable.toLowerCase())
                                  )
                                  .map((cert, index) => (
                                    <tr 
                                      key={cert.tech_cert_id}
                                      className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                      onClick={() => handleSelectInspectionCert(cert)}
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_name}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_number}</td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle Buttons */}
                    <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
                      <button
                        onClick={() => {
                           const available = certificates.filter(c => !selectedCertificatesForInspection.some(sc => sc.tech_cert_id === c.tech_cert_id));
                           if (available.length > 0) handleSelectInspectionCert(available[0]);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Add one"
                      >
                        <span className="text-lg font-bold">→</span>
                      </button>
                      <button
                        onClick={() => {
                          const available = certificates.filter(c => !selectedCertificatesForInspection.some(sc => sc.tech_cert_id === c.tech_cert_id));
                          handleSelectAllInspectionCert(available);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Add all"
                      >
                        <span className="text-lg font-bold">{'>>'}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (selectedCertificatesForInspection.length > 0) handleDeselectInspectionCert(selectedCertificatesForInspection[0]);
                        }}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Remove one"
                      >
                        <span className="text-lg font-bold">←</span>
                      </button>
                      <button
                        onClick={() => handleDeselectAllInspectionCert(selectedCertificatesForInspection)}
                        className="p-2 text-gray-600 hover:text-gray-900"
                        title="Remove all"
                      >
                        <span className="text-lg font-bold">{'<<'}</span>
                      </button>
                    </div>

                    {/* Selected Certificates - Right Side */}
                    <div className="bg-white rounded-lg shadow-sm border flex flex-col flex-1 lg:flex-[2] h-[500px]">
                      <div className="p-4 border-b flex-shrink-0">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Selected Certificates</h2>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder="Search selected certificates..."
                            value={inspectionFormSearchSelected}
                            onChange={(e) => setInspectionFormSearchSelected(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 text-sm"
                          />
                        </div>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="h-full overflow-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Certificate Number</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {selectedCertificatesForInspection
                                .filter(c => 
                                  c.cert_name.toLowerCase().includes(inspectionFormSearchSelected.toLowerCase()) ||
                                  c.cert_number.toLowerCase().includes(inspectionFormSearchSelected.toLowerCase())
                                )
                                .map((cert, index) => (
                                  <tr 
                                    key={cert.tech_cert_id}
                                    className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                    onClick={() => handleDeselectInspectionCert(cert)}
                                  >
                                    <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_name}</td>
                                    <td className="px-4 py-3 text-sm text-gray-900">{cert.cert_number}</td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents Section */}
                  <div className="mt-6 bg-white rounded-lg shadow-sm border p-4 sm:p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
                    <div className="text-sm text-gray-600 mb-3">Document types are loaded from the system configuration</div>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm font-medium text-gray-700">Upload Documents</div>
                      <button 
                        type="button" 
                        onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                        className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
                      >
                        <Plus size={16} className="mr-2" />
                        Add Document
                      </button>
                    </div>
                    
                    {uploadRows.length === 0 ? (
                      <div className="text-sm text-gray-500">No documents added.</div>
                    ) : (
                      <div className="space-y-3">
                        {uploadRows.map(r => (
                          <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                            <div className="col-span-3">
                              <label className="block text-xs font-medium mb-1">Document Type</label>
                              <SearchableDropdown
                                options={documentTypes}
                                value={r.type}
                                onChange={(value) => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:value}:x))}
                                placeholder="Select Type"
                                searchPlaceholder="Search types..."
                                className="w-full"
                                displayKey="text"
                                valueKey="id"
                              />
                            </div>
                            {(() => {
                              const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                              const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                              return needsCustomName && (
                                <div className="col-span-3">
                                  <label className="block text-xs font-medium mb-1">Custom Name</label>
                                  <input
                                    className="w-full border rounded px-2 py-2 text-sm h-[38px]"
                                    value={r.docTypeName}
                                    onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))}
                                    placeholder={`Enter custom name for ${selectedDocType?.text}`}
                                  />
                                </div>
                              );
                            })()}
                            <div className={(() => {
                              const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                              const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                              return needsCustomName ? 'col-span-6' : 'col-span-9';
                            })()}>
                              <label className="block text-xs font-medium mb-1">File (Max 15MB)</label>
                              <div className="flex items-center gap-2">
                                <div className="relative flex-1">
                                  <input
                                    type="file"
                                    id={`file-${r.id}`}
                                    onChange={e => {
                                      const f = e.target.files?.[0] || null;
                                      if (f && f.size > 15 * 1024 * 1024) {
                                        toast.error("File size exceeds 15MB limit");
                                        e.target.value = '';
                                        return;
                                      }
                                      const previewUrl = f ? URL.createObjectURL(f) : '';
                                      setUploadRows(prev => prev.map(x => x.id===r.id?{...x,file:f,previewUrl}:x));
                                    }}
                                    className="hidden"
                                  />
                                  <label
                                    htmlFor={`file-${r.id}`}
                                    className="flex items-center h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                                  >
                                    <span className="truncate">{r.file ? r.file.name : "Choose File"}</span>
                                  </label>
                                </div>
                                <button 
                                  type="button" 
                                  onClick={() => setUploadRows(prev => prev.filter(x => x.id!==r.id))}
                                  className="h-[38px] px-3 border border-gray-300 rounded-md text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">
                      Total Certificates Selected: <span className="font-semibold text-gray-900">{selectedCertificatesForInspection.length}</span>
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowInspectionForm(false);
                        setAvailableCertificatesForInspection([]);
                        setSelectedCertificatesForInspection([]);
                        setInspectionFormSearchAvailable("");
                        setInspectionFormSearchSelected("");
                        setSelectedInspectionAssetType("");
                        setUploadRows([]);
                      }}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveInspectionCertificates}
                      disabled={isSaving || !selectedInspectionAssetType || selectedCertificatesForInspection.length === 0}
                      className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Save size={16} />
                      )}
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ) : (
            <div>
              {/* Inspection Certificates Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full border border-gray-200 text-sm">
                  <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                    <tr className="text-white text-sm font-medium">
                      <th className="px-4 py-3 text-left w-12">
                        <input
                          type="checkbox"
                          checked={selectedInspectionRows.length === (inspectionCertificates?.length || 0) && inspectionCertificates.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInspectionRows(inspectionCertificates.map((c) => c.id));
                            } else {
                              setSelectedInspectionRows([]);
                            }
                          }}
                          className="accent-yellow-400"
                        />
                      </th>
                      <th className="px-4 py-3 text-left">Certificate Name</th>
                      <th className="px-4 py-3 text-left">Asset Type</th>
                      <th className="px-4 py-3 text-left">Certificate Number</th>
                      <th className="px-4 py-3 text-left w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inspectionCertificates.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                          No inspection certificates found. Click the Plus icon to add certificates.
                        </td>
                      </tr>
                    ) : (
                      inspectionCertificates.map((cert) => (
                        <tr key={cert.id} className="border-t border-gray-200 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedInspectionRows.includes(cert.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInspectionRows([...selectedInspectionRows, cert.id]);
                                } else {
                                  setSelectedInspectionRows(selectedInspectionRows.filter((id) => id !== cert.id));
                                }
                              }}
                              className="accent-yellow-400"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-800">
                            {cert.cert_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800">{cert.asset_type_name || "-"}</td>
                          <td className="px-4 py-3 text-gray-800">
                            {cert.cert_number || "-"}
                          </td>
                          <td className="px-4 py-3 text-gray-800 text-center">
                            <button
                                onClick={() => openUpdateModal(cert)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit"
                              >
                                <Pencil size={18} />
                              </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeleteType(null);
        }}
        onConfirm={() => {
          if (deleteType === 'certificates') {
            confirmDeleteCertificates();
          } else if (deleteType === 'mapped') {
            confirmUnmapSelected();
          } else if (deleteType === 'inspection') {
            confirmDeleteInspectionCertificates();
          }
        }}
        message={
          deleteType === 'certificates'
            ? `Are you sure you want to delete ${selectedCertificateRows.length} certificate(s)? This action cannot be undone.`
            : deleteType === 'mapped'
            ? `Are you sure you want to remove ${selectedMappedRows.length} certificate(s) from the mapping? This action cannot be undone.`
            : `Are you sure you want to remove ${selectedInspectionRows.length} inspection certificate(s)? This action cannot be undone.`
        }
      />

      {/* Update Certificate Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center justify-between">
                      Update Certificate
                      <button 
                        onClick={() => setShowUpdateModal(false)}
                        className="text-gray-400 hover:text-gray-500 transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Name</label>
                        <input
                          type="text"
                          value={updateCertName}
                          onChange={(e) => setUpdateCertName(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                          placeholder="Enter certificate name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Number</label>
                        <input
                          type="text"
                          value={updateCertNumber}
                          onChange={(e) => setUpdateCertNumber(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
                          placeholder="Enter certificate number"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-3">
                <button
                  type="button"
                  onClick={handleUpdateCertificate}
                  disabled={isUpdatingCert}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#0E2F4B] text-base font-medium text-white hover:bg-[#12395c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-60 transition-colors"
                >
                  {isUpdatingCert ? "Updating..." : "Update"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Certifications;
