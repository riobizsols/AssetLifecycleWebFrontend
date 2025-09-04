import React, { useState, useEffect } from "react";
import { CheckCircle, ArrowLeft, ClipboardCheck, FileText, Upload, Eye, Download, X, Plus } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import API from "../lib/axios";
import ChecklistModal from "./ChecklistModal";
import SearchableDropdown from "./ui/SearchableDropdown";

export default function MaintSupervisorApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  
  // New states for documents and images
  const [assetDocuments, setAssetDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [selectedManual, setSelectedManual] = useState(null);
  
  // Upload states
  const [invoiceUploads, setInvoiceUploads] = useState([]);
  const [beforeAfterUploads, setBeforeAfterUploads] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // Document types from API
  const [maintenanceDocTypes, setMaintenanceDocTypes] = useState([]);
  const [photoDocTypes, setPhotoDocTypes] = useState([]);
  
  // Form state for updatable fields
  const [formData, setFormData] = useState({
    notes: "",
    status: "",
    po_number: "",
    invoice: "",
    technician_name: "",
    technician_email: "",
    technician_phno: ""
  });

  useEffect(() => {
    if (id) {
      fetchMaintenanceData();
      fetchDocumentTypes();
    }
  }, [id]);

  // Fetch checklist when maintenance data is available
  useEffect(() => {
    if (maintenanceData?.asset_type_id) {
      fetchChecklist();
      fetchAssetDocuments();
    }
  }, [maintenanceData]);

  const fetchMaintenanceData = async () => {
    try {
      setLoadingData(true);
      const apiUrl = `/maintenance-schedules/${id}`;
      const res = await API.get(apiUrl);
      if (res.data.success) {
        setMaintenanceData(res.data.data);
        // Initialize form data with existing values
        setFormData({
          notes: res.data.data.notes || "",
          status: res.data.data.status || "",
          po_number: res.data.data.po_number || "",
          invoice: res.data.data.invoice || "",
          technician_name: res.data.data.technician_name || "",
          technician_email: res.data.data.technician_email || "",
          technician_phno: res.data.data.technician_phno || ""
        });
      } else {
        toast.error(res.data.message || "Failed to fetch maintenance data");
      }
    } catch (err) {
      console.error("Failed to fetch maintenance data:", err);
      toast.error("Failed to fetch maintenance data");
    } finally {
      setLoadingData(false);
    }
  };

  const fetchChecklist = async () => {
    setLoadingChecklist(true);
    try {
      // Get checklist for the specific asset type
      if (maintenanceData?.asset_type_id) {
        const apiUrl = `/checklist/asset-type/${maintenanceData.asset_type_id}`;
        const res = await API.get(apiUrl);
        
        // The API returns { success: true, data: [...], count: 3 }
        if (res.data && res.data.success && Array.isArray(res.data.data)) {
          setChecklist(res.data.data);
        } else {
          setChecklist([]);
        }
      } else {
        setChecklist([]);
      }
    } catch (err) {
      console.error("Failed to fetch checklist:", err);
      setChecklist([]);
    } finally {
      setLoadingChecklist(false);
    }
  };

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for maintenance...');
      
      // Fetch maintenance document types
      const maintenanceRes = await API.get('/doc-type-objects/object-type/maintenance');
      console.log('Maintenance document types response:', maintenanceRes.data);

      if (maintenanceRes.data && maintenanceRes.data.success && Array.isArray(maintenanceRes.data.data)) {
        // Transform API data to dropdown format, excluding photo types
        const docTypes = maintenanceRes.data.data
          .filter(docType => 
            docType.doc_type !== 'BP' && docType.doc_type !== 'AP' && 
            !docType.doc_type_text.toLowerCase().includes('photo') &&
            !docType.doc_type_text.toLowerCase().includes('before') &&
            !docType.doc_type_text.toLowerCase().includes('after')
          )
          .map(docType => ({
            id: docType.doc_type,
            text: docType.doc_type_text
          }));
        setMaintenanceDocTypes(docTypes);
        console.log('Maintenance document types loaded (excluding photos):', docTypes);
      } else {
        console.log('No maintenance document types found');
        setMaintenanceDocTypes([]);
      }

      // Filter photo document types (Before Photos, After Photos)
      const photoTypes = maintenanceRes.data.data
        .filter(docType => 
          docType.doc_type === 'BP' || docType.doc_type === 'AP' || 
          docType.doc_type_text.toLowerCase().includes('photo') ||
          docType.doc_type_text.toLowerCase().includes('before') ||
          docType.doc_type_text.toLowerCase().includes('after')
        )
        .map(docType => ({
          id: docType.doc_type,
          text: docType.doc_type_text
        }));
      
      setPhotoDocTypes(photoTypes);
      console.log('Photo document types loaded:', photoTypes);
      
    } catch (err) {
      console.error('Error fetching document types:', err);
      toast.error('Failed to load document types');
      setMaintenanceDocTypes([]);
      setPhotoDocTypes([]);
    }
  };

  const fetchAssetDocuments = async () => {
    if (!maintenanceData?.asset_id) return;
    
    setLoadingDocuments(true);
    try {
      const res = await API.get(`/assets/${maintenanceData.asset_id}/documents`, {
        validateStatus: (status) => status < 500 // Don't treat 404 as error
      });
      
      if (res.status === 404) {
        setAssetDocuments([]);
      } else if (res.data && res.data.success) {
        setAssetDocuments(res.data.data || []);
      } else {
        setAssetDocuments([]);
      }
    } catch (err) {
      console.error("Failed to fetch asset documents:", err);
      setAssetDocuments([]);
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Document upload handlers
  const addInvoiceUpload = () => {
    setInvoiceUploads(prev => ([...prev, { 
      id: crypto.randomUUID(), 
      type: '', 
      docTypeName: '', 
      file: null, 
      previewUrl: '' 
    }]));
  };

  const addBeforeAfterUpload = () => {
    setBeforeAfterUploads(prev => ([...prev, { 
      id: crypto.randomUUID(), 
      type: 'Before', // Default to Before
      file: null, 
      previewUrl: '' 
    }]));
  };

  const updateInvoiceUpload = (id, patch) => {
    setInvoiceUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const updateBeforeAfterUpload = (id, patch) => {
    setBeforeAfterUploads(prev => prev.map(u => u.id === id ? { ...u, ...patch } : u));
  };

  const removeInvoiceUpload = (id) => {
    setInvoiceUploads(prev => prev.filter(u => u.id !== id));
  };

  const removeBeforeAfterUpload = (id) => {
    setBeforeAfterUploads(prev => prev.filter(u => u.id !== id));
  };

  const onSelectInvoiceFile = (id, file) => {
    const previewUrl = file ? URL.createObjectURL(file) : '';
    updateInvoiceUpload(id, { file, previewUrl });
  };

  const onSelectBeforeAfterFile = (id, file) => {
    const previewUrl = file ? URL.createObjectURL(file) : '';
    updateBeforeAfterUpload(id, { file, previewUrl });
  };

  const handleInvoiceUpload = async () => {
    if (invoiceUploads.length === 0) {
      toast.error('Add at least one invoice file');
      return;
    }

    // Validate all uploads
    for (const upload of invoiceUploads) {
      if (!upload.type || !upload.file) {
        toast.error('Select document type and choose a file for all rows');
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = maintenanceDocTypes.find(dt => dt.id === upload.type);
      if (selectedDocType && selectedDocType.text.toLowerCase().includes('other') && !upload.docTypeName?.trim()) {
        toast.error(`Enter custom name for ${selectedDocType.text} documents`);
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const upload of invoiceUploads) {
        try {
          const fd = new FormData();
          fd.append('file', upload.file);
          fd.append('doc_type', upload.type);
          if (upload.type === 'OT') fd.append('doc_type_name', upload.docTypeName);
          
          // Upload to maintenance schedule documents
          const res = await API.post(`/maintenance-schedules/${id}/documents`, fd);
          if (res.data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error('Failed to upload file:', upload.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All invoice files uploaded successfully');
        } else {
          toast.success(`${successCount} files uploaded, ${failCount} failed`);
        }
        setInvoiceUploads([]); // Clear uploads after successful upload
      } else {
        toast.error('Failed to upload any files');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleBeforeAfterUpload = async () => {
    if (beforeAfterUploads.length === 0) {
      toast.error('Add at least one image file');
      return;
    }

    // Validate all uploads
    for (const upload of beforeAfterUploads) {
      if (!upload.type || !upload.file) {
        toast.error('Select image type and choose a file for all rows');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const upload of beforeAfterUploads) {
        try {
          const fd = new FormData();
          fd.append('file', upload.file);
          fd.append('doc_type', upload.type === 'Before' ? 'Before_Image' : 'After_Image');
          
          // Upload to maintenance schedule documents
          const res = await API.post(`/maintenance-schedules/${id}/documents`, fd);
          if (res.data.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error('Failed to upload file:', upload.file.name, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All images uploaded successfully');
        } else {
          toast.success(`${successCount} images uploaded, ${failCount} failed`);
        }
        setBeforeAfterUploads([]); // Clear uploads after successful upload
      } else {
        toast.error('Failed to upload any images');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validation
    if (!formData.status) {
      toast.error("Status is required");
      return;
    }
    
    try {
      const updateData = {
        ...formData
      };
      
      const res = await API.put(`/maintenance-schedules/${id}`, updateData);
      
      if (res.data.success) {
        toast.success("Maintenance schedule updated successfully!");
        navigate("/supervisor-approval");
      } else {
        toast.error(res.data.message || "Failed to update maintenance schedule");
      }
    } catch (err) {
      console.error("Failed to update maintenance schedule:", err);
      toast.error("Failed to update maintenance schedule");
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-gray-500">Loading maintenance data...</div>
      </div>
    );
  }

  if (!maintenanceData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-red-500">Maintenance record not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/supervisor-approval")}
          className="flex items-center gap-2 text-[#0E2F4B] hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          Back to Supervisor Approvals
        </button>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Checklist Section - At the Top */}
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Maintenance Checklist</h2>
            <button
              type="button"
              onClick={() => setShowChecklist(true)}
              disabled={loadingChecklist || checklist.length === 0}
              className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="View and complete the asset maintenance checklist"
            >
              <ClipboardCheck className="w-4 h-4" />
              {loadingChecklist ? "Loading..." : "View Checklist"}
            </button>
          </div>
        </div>

        {/* View Manual Section */}
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Technical Manual</h2>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              disabled={loadingDocuments || assetDocuments.length === 0}
              className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="View technical specifications and manuals"
            >
              <FileText className="w-4 h-4" />
              {loadingDocuments ? "Loading..." : "View Manual"}
            </button>
          </div>
          
          {assetDocuments.length > 0 && (
            <div className="text-sm text-gray-600">
              {assetDocuments.filter(doc => 
                doc.doc_type === 'Technical_Spec' || 
                doc.doc_type === 'Manual' || 
                doc.doc_type === 'OT'
              ).length} technical document(s) available
            </div>
          )}
        </div>

        {/* Doc Upload Section */}
        <div className="p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Doc Upload</h2>
          <div className="text-sm text-gray-600 mb-3">Upload maintenance documents (Work Order, Invoice, etc.)</div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">Upload Documents</div>
            <button 
              type="button" 
              onClick={addInvoiceUpload} 
              className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Document
            </button>
          </div>
          
          {invoiceUploads.length === 0 ? (
            <div className="text-sm text-gray-500">No documents added.</div>
          ) : (
            <div className="space-y-3">
              {invoiceUploads.map(upload => (
                <div key={upload.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1">Document Type</label>
                    <SearchableDropdown
                      options={maintenanceDocTypes}
                      value={upload.type}
                      onChange={(value) => updateInvoiceUpload(upload.id, { type: value })}
                      placeholder="Select type"
                      searchPlaceholder="Search types..."
                      className="w-full"
                      displayKey="text"
                      valueKey="id"
                    />
                  </div>

                  {(() => {
                    const selectedDocType = maintenanceDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                    return needsCustomName && (
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Custom Name</label>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-2 text-sm h-[38px] bg-white"
                          value={upload.docTypeName}
                          onChange={(e) => updateInvoiceUpload(upload.id, { docTypeName: e.target.value })}
                          placeholder={`Enter custom name for ${selectedDocType?.text}`}
                        />
                      </div>
                    );
                  })()}

                  <div className={(() => {
                    const selectedDocType = maintenanceDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                    return needsCustomName ? 'col-span-4' : 'col-span-7';
                  })()}>
                    <label className="block text-xs font-medium mb-1">File (Max 10MB)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="file"
                          id={`invoice-file-${upload.id}`}
                          onChange={(e) => onSelectInvoiceFile(upload.id, e.target.files?.[0] || null)}
                          className="hidden"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                        />
                        <label
                          htmlFor={`invoice-file-${upload.id}`}
                          className="flex items-center h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          <span className="truncate max-w-[200px] inline-block">
                            {upload.file ? upload.file.name : 'Choose file'}
                          </span>
                        </label>
                      </div>

                      {upload.previewUrl && (
                        <a 
                          href={upload.previewUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeInvoiceUpload(upload.id)} 
                        className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {invoiceUploads.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleInvoiceUpload}
                disabled={isUploading || invoiceUploads.some(u => {
                  if (!u.type || !u.file) return true;
                  const selectedDocType = maintenanceDocTypes.find(dt => dt.id === u.type);
                  const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                  return needsCustomName && !u.docTypeName?.trim();
                })}
                className="h-[38px] inline-flex items-center px-6 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All Invoices
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Before/After Images Upload Section */}
        <div className="p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Before & After Images</h2>
          <div className="text-sm text-gray-600 mb-3">Upload images showing asset condition before and after maintenance (Optional)</div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">Upload Images</div>
            <button 
              type="button" 
              onClick={addBeforeAfterUpload} 
              className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              Add Image
            </button>
          </div>
          
          {beforeAfterUploads.length === 0 ? (
            <div className="text-sm text-gray-500">No images added.</div>
          ) : (
            <div className="space-y-3">
              {beforeAfterUploads.map(upload => (
                <div key={upload.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1">Image Type</label>
                    <SearchableDropdown
                      options={photoDocTypes}
                      value={upload.type}
                      onChange={(value) => updateBeforeAfterUpload(upload.id, { type: value })}
                      placeholder="Select type"
                      searchPlaceholder="Search types..."
                      className="w-full"
                      displayKey="text"
                      valueKey="id"
                    />
                  </div>

                  <div className="col-span-9">
                    <label className="block text-xs font-medium mb-1">Image File (Max 10MB)</label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1 max-w-md">
                        <input
                          type="file"
                          id={`image-file-${upload.id}`}
                          onChange={(e) => onSelectBeforeAfterFile(upload.id, e.target.files?.[0] || null)}
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif"
                        />
                        <label
                          htmlFor={`image-file-${upload.id}`}
                          className="flex items-center h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          <span className="truncate max-w-[200px] inline-block">
                            {upload.file ? upload.file.name : 'Choose image'}
                          </span>
                        </label>
                      </div>

                      {upload.previewUrl && (
                        <a 
                          href={upload.previewUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeBeforeAfterUpload(upload.id)} 
                        className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upload Button */}
          {beforeAfterUploads.length > 0 && (
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={handleBeforeAfterUpload}
                disabled={isUploading || beforeAfterUploads.some(u => !u.type || !u.file)}
                className="h-[38px] inline-flex items-center px-6 bg-[#0E2F4B] text-white rounded-md shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload All Images
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Update Form - Only Fields That Need to be Updated */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Update Maintenance Schedule</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="technician_name"
                  value={formData.technician_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  name="technician_phno"
                  value={formData.technician_phno}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician phone"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select status</option>
                  <option value="IN">Initiated</option>
                  <option value="IP">In Progress</option>
                  <option value="CO">Completed</option>
                  <option value="CA">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input
                  type="text"
                  name="po_number"
                  value={formData.po_number}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter PO number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice</label>
                <input
                  type="text"
                  name="invoice"
                  value={formData.invoice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter invoice number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="technician_email"
                  value={formData.technician_email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technician email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter any additional notes..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/supervisor-approval")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0E2F4B] hover:bg-[#14395c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Checklist Modal */}
      <ChecklistModal
        assetType={maintenanceData?.asset_type_name || "Asset"}
        open={showChecklist}
        onClose={() => setShowChecklist(false)}
        checklist={checklist}
      />

      {/* Manual View Modal */}
      {showManual && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Technical Manual & Specifications</h2>
                <button
                  onClick={() => setShowManual(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {loadingDocuments ? (
                <div className="text-center text-gray-500">Loading documents...</div>
              ) : assetDocuments.length === 0 ? (
                <div className="text-center text-gray-500">No technical documents available for this asset.</div>
              ) : (
                <div className="space-y-4">
                  {assetDocuments
                    .filter(doc => 
                      doc.doc_type === 'Technical_Spec' || 
                      doc.doc_type === 'Manual' || 
                      doc.doc_type === 'OT'
                    )
                    .map((doc, index) => (
                      <div key={doc.id || index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {doc.doc_type === 'OT' && doc.doc_type_name 
                                ? `${doc.doc_type} (${doc.doc_type_name})`
                                : doc.doc_type
                              }
                            </div>
                            <div className="text-sm text-gray-500">{doc.file_name || doc.name || 'Document'}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={doc.file_url || doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-[#0E2F4B] text-white text-sm rounded hover:bg-[#1a4971] transition-colors"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </a>
                            <a
                              href={doc.file_url || doc.url}
                              download
                              className="inline-flex items-center px-3 py-1 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}