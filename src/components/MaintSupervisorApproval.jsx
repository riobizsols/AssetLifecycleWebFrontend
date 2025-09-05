import React, { useState, useEffect, useRef } from "react";
import { CheckCircle, ArrowLeft, ClipboardCheck, FileText, Upload, Eye, Download, X, Plus, MoreVertical, Archive, ArchiveRestore } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";
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
  const [selectedManual, setSelectedManual] = useState(null);
  
  // Asset maintenance documents states
  const [maintenanceDocs, setMaintenanceDocs] = useState([]);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [manualDocs, setManualDocs] = useState([]);
  const [loadingMaintenanceDocs, setLoadingMaintenanceDocs] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  // Dropdown states
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const dropdownRef = useRef(null);
  
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
      fetchMaintenanceDocuments();
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
            id: docType.dto_id,  // Use dto_id instead of doc_type
            text: docType.doc_type_text,
            doc_type: docType.doc_type  // Keep doc_type for reference
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
          id: docType.dto_id,  // Use dto_id instead of doc_type
          text: docType.doc_type_text,
          doc_type: docType.doc_type  // Keep doc_type for reference
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


  const fetchMaintenanceDocuments = async () => {
    if (!maintenanceData?.asset_id) {
      console.log('No asset_id available for fetching maintenance documents');
      return;
    }
    
    setLoadingMaintenanceDocs(true);
    try {
      console.log('Fetching all documents for asset:', maintenanceData.asset_id);
      
      // Use the same endpoint as the Assets screen - this returns all documents for the asset
      const res = await API.get(`/assets/${maintenanceData.asset_id}/docs`, {
        // Add validateStatus to prevent Axios from treating 404 as an error
        validateStatus: function (status) {
          return status === 200 || status === 404; // Accept both 200 and 404
        }
      });
      
      console.log('Assets documents API response:', res.data);
      
      // If 404, set empty arrays
      if (res.status === 404) {
        console.log('No documents found for asset');
        setMaintenanceDocs([]);
        setArchivedDocs([]);
        setManualDocs([]);
        return;
      }
      
      // Process the response - should be an array of documents
      const allDocs = Array.isArray(res.data) ? res.data : [];
      console.log('All documents from assets endpoint:', allDocs);
      
      // Debug each document's structure
      allDocs.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`, {
          a_d_id: doc.a_d_id,
          doc_type: doc.doc_type,
          doc_type_text: doc.doc_type_text,
          doc_type_name: doc.doc_type_name,
          file_name: doc.file_name,
          is_archived: doc.is_archived,
          source: 'asset'
        });
      });
      
      if (allDocs.length > 0) {
        // Filter documents for technical manual display (case-insensitive)
        const manualDocs = allDocs.filter(doc => {
          const docTypeText = (doc.doc_type_text || '').toLowerCase();
          const docType = (doc.doc_type || '').toLowerCase();
          const fileName = (doc.file_name || '').toLowerCase();
          const docTypeName = (doc.doc_type_name || '').toLowerCase();
          
          // Check for technical manual by document type code 'TM' or text 'technical manual'
          const hasTechnicalManualCode = docType === 'tm';
          const hasTechnicalManualText = docTypeText.includes('technical manual') || docTypeText === 'technical manual';
          const hasTechnicalManualName = docTypeName.includes('technical manual') || docTypeName === 'technical manual';
          
          // Also check if the original text (not lowercased) contains "Technical Manual"
          const hasTechnicalManualOriginal = (doc.doc_type_text || '').includes('Technical Manual');
          
          const isTechnicalManual = hasTechnicalManualCode || hasTechnicalManualText || hasTechnicalManualName || hasTechnicalManualOriginal;
          
          console.log('Technical Manual filter check:', {
            a_d_id: doc.a_d_id,
            doc_type: doc.doc_type,
            doc_type_text: doc.doc_type_text,
            file_name: doc.file_name,
            doc_type_name: doc.doc_type_name,
            hasTechnicalManualCode: hasTechnicalManualCode,
            hasTechnicalManualText: hasTechnicalManualText,
            hasTechnicalManualName: hasTechnicalManualName,
            hasTechnicalManualOriginal: hasTechnicalManualOriginal,
            isTechnicalManual: isTechnicalManual
          });
          
          return isTechnicalManual;
        });
        
        console.log('Filtered manualDocs result:', manualDocs);
        
        // Separate active and archived documents (same logic as Assets screen)
        const active = allDocs.filter(doc => !doc.is_archived || doc.is_archived === false);
        const archived = allDocs.filter(doc => doc.is_archived === true || doc.is_archived === 'true');
        
        setMaintenanceDocs(active);
        setArchivedDocs(archived);
        setManualDocs(manualDocs);
        
        console.log('All documents loaded:', { 
          total: allDocs.length,
          active: active.length, 
          archived: archived.length,
          manualDocs: manualDocs.length,
          activeDocs: active,
          archivedDocs: archived,
          manualDocsList: manualDocs
        });
        
        console.log('Technical Manual documents found:', manualDocs.map(doc => ({
          id: doc.a_d_id,
          doc_type_text: doc.doc_type_text,
          file_name: doc.file_name,
          doc_type_name: doc.doc_type_name,
          source: 'asset'
        })));
        
        // Test the specific case for technical manual
        const testDoc = { doc_type: 'TM', doc_type_text: 'Technical Manual', file_name: 'test.pdf', doc_type_name: 'technical manual' };
        const testDocType = (testDoc.doc_type || '').toLowerCase();
        const testDocTypeText = (testDoc.doc_type_text || '').toLowerCase();
        const testDocTypeName = (testDoc.doc_type_name || '').toLowerCase();
        const testHasTechnicalManualCode = testDocType === 'tm';
        const testHasTechnicalManualText = testDocTypeText.includes('technical manual');
        const testHasTechnicalManualName = testDocTypeName.includes('technical manual');
        const testIsTechnicalManual = testHasTechnicalManualCode || testHasTechnicalManualText || testHasTechnicalManualName;
        
        console.log('Test case "Technical Manual (TM)":', {
          doc_type: testDoc.doc_type,
          doc_type_text: testDoc.doc_type_text,
          doc_type_name: testDoc.doc_type_name,
          hasTechnicalManualCode: testHasTechnicalManualCode,
          hasTechnicalManualText: testHasTechnicalManualText,
          hasTechnicalManualName: testHasTechnicalManualName,
          isTechnicalManual: testIsTechnicalManual
        });
      } else {
        console.log('No documents found for asset');
        setMaintenanceDocs([]);
        setArchivedDocs([]);
        setManualDocs([]);
      }
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      console.error("Error details:", err.response?.data);
      setMaintenanceDocs([]);
      setArchivedDocs([]);
      setManualDocs([]);
    } finally {
      setLoadingMaintenanceDocs(false);
    }
  };

  // Dropdown functionality
  const handleClickOutside = (event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target) && !event.target.closest('[data-dropdown-menu]')) {
      setActiveDropdown(null);
    }
  };

  const toggleDropdown = (doc, event) => {
    event.preventDefault();
    event.stopPropagation();
    
    const docId = doc.a_d_id;
    
    if (activeDropdown === docId) {
      setActiveDropdown(null);
    } else {
      const rect = event.target.closest('button').getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
      setActiveDropdown(docId);
    }
  };

  const handleDocumentAction = async (action, doc) => {
    console.log(`Document action: ${action} for doc:`, doc);
    
    try {
      const docId = doc.a_d_id;
      
      if (action === 'view') {
        // Use the same API as Assets screen
        const res = await API.get(`/asset-docs/${docId}/download-url?mode=view`);
        if (res.data && res.data.url) {
          window.open(res.data.url, '_blank');
        } else {
          throw new Error('No URL returned from API');
        }
      } else if (action === 'download') {
        // Use the same API as Assets screen
        const res = await API.get(`/asset-docs/${docId}/download-url?mode=download`);
        if (res.data && res.data.url) {
          window.open(res.data.url, '_blank');
        } else {
          throw new Error('No URL returned from API');
        }
      } else if (action === 'archive') {
        const res = await API.put(`/asset-docs/${docId}/archive-status`, {
          is_archived: true
        });
        
        if (res.data && res.data.message && res.data.message.includes('successfully')) {
          toast.success('Document archived successfully');
          // Refresh documents
          fetchMaintenanceDocuments();
        } else {
          toast.error('Failed to archive document');
        }
      } else if (action === 'unarchive') {
        const res = await API.put(`/asset-docs/${docId}/archive-status`, {
          is_archived: false
        });
        
        if (res.data && res.data.message && res.data.message.includes('successfully')) {
          toast.success('Document unarchived successfully');
          // Refresh documents
          fetchMaintenanceDocuments();
        } else {
          toast.error('Failed to unarchive document');
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} document:`, err);
      toast.error(`Failed to ${action} document`);
    }
    
    setActiveDropdown(null);
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
      type: '', // Will be selected from photoDocTypes
      docTypeName: '', // For custom names
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
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !upload.docTypeName?.trim()) {
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
          fd.append('dto_id', upload.type);  // Send dto_id instead of doc_type
          if (upload.type === 'OT') fd.append('doc_type_name', upload.docTypeName);
          fd.append('asset_id', maintenanceData.asset_id);
          
          // Upload to asset maintenance documents
          const res = await API.post(`/asset-maint-docs/upload`, fd);
          console.log('Invoice upload response:', res.data);
          if (res.data.message && res.data.message.includes('successfully')) {
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
        // Refresh maintenance documents
        fetchMaintenanceDocuments();
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
      // Check if the selected document type requires a custom name
      const selectedDocType = photoDocTypes.find(dt => dt.id === upload.type);
      if (selectedDocType && selectedDocType.text.toLowerCase().includes('other') && !upload.docTypeName?.trim()) {
        toast.error(`Enter custom name for ${selectedDocType.text} documents`);
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
          fd.append('dto_id', upload.type);  // Use dto_id for photo types
          if (upload.type === 'OT') fd.append('doc_type_name', upload.docTypeName);
          fd.append('asset_id', maintenanceData.asset_id);
          
          // Upload to asset maintenance documents
          const res = await API.post(`/asset-maint-docs/upload`, fd);
          console.log('Image upload response:', res.data);
          if (res.data.message && res.data.message.includes('successfully')) {
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
        // Refresh maintenance documents
        fetchMaintenanceDocuments();
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
            <div className="relative">
              <button
                type="button"
                onClick={(e) => {
                  console.log('View Manual clicked - manualDocs:', manualDocs);
                  console.log('View Manual clicked - maintenanceDocs:', maintenanceDocs);
                  
                  if (activeDropdown === 'manual-dropdown') {
                    setActiveDropdown(null);
                  } else {
                    const rect = e.target.getBoundingClientRect();
                    setDropdownPosition({
                      top: rect.bottom + window.scrollY + 5,
                      left: rect.left + window.scrollX
                    });
                    setActiveDropdown('manual-dropdown');
                  }
                }}
                disabled={loadingMaintenanceDocs || manualDocs.length === 0}
                className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="View technical specifications and manuals"
              >
                <FileText className="w-4 h-4" />
                {loadingMaintenanceDocs ? "Loading..." : `View Manual ${manualDocs.length > 0 ? `(${manualDocs.length})` : ''}`}
                <MoreVertical className="w-4 h-4" />
              </button>
              
              {activeDropdown === 'manual-dropdown' && manualDocs.length > 0 && createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[160px]"
                  style={{
                    top: dropdownPosition.top,
                    left: dropdownPosition.left
                  }}
                  data-dropdown-menu
                >
                  {manualDocs.map((doc, index) => (
                    <div key={doc.a_d_id || index}>
                      <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-100 last:border-b-0">
                        {doc.file_name || 'Document'}
                      </div>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDocumentAction('view', doc);
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleDocumentAction('download', doc);
                          setActiveDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </div>
                  ))}
                </div>,
                document.body
              )}
            </div>
          </div>
          
          {manualDocs.length > 0 && (
            <div className="text-sm text-gray-600">
              {manualDocs.length} technical manual document(s) available
            </div>
          )}
          
          {/* Debug info */}
          <div className="mt-2 text-xs text-gray-400">
            Debug: technicalManualDocs.length = {manualDocs.length}, totalDocs.length = {maintenanceDocs.length + archivedDocs.length}
            {maintenanceDocs.length > 0 && (
              <div className="mt-1">
                Available docs: {maintenanceDocs.map(doc => `${doc.doc_type_name || doc.doc_type_text || doc.doc_type} (${doc.file_name})`).join(', ')}
              </div>
            )}
          </div>
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
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
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
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
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
                  const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
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

                  {(() => {
                    const selectedDocType = photoDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                    return needsCustomName && (
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Custom Name</label>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-2 text-sm h-[38px] bg-white"
                          value={upload.docTypeName}
                          onChange={(e) => updateBeforeAfterUpload(upload.id, { docTypeName: e.target.value })}
                          placeholder={`Enter custom name for ${selectedDocType?.text}`}
                        />
                      </div>
                    );
                  })()}

                  <div className={(() => {
                    const selectedDocType = photoDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                    return needsCustomName ? 'col-span-6' : 'col-span-9';
                  })()}>
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
                disabled={isUploading || beforeAfterUploads.some(u => {
                  if (!u.type || !u.file) return true;
                  const selectedDocType = photoDocTypes.find(dt => dt.id === u.type);
                  const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
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
                    Upload All Images
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Maintenance Documents Display Section */}
        <div className="p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Uploaded Maintenance Documents</h2>
          
          {loadingMaintenanceDocs ? (
            <div className="text-center text-gray-500 py-4">Loading documents...</div>
          ) : maintenanceDocs.length === 0 && archivedDocs.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No maintenance documents uploaded yet.</div>
          ) : (
            <div className="space-y-6">
              {/* Active Documents */}
              {maintenanceDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">Active Documents ({maintenanceDocs.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded Date</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {maintenanceDocs.map((doc) => (
                          <tr key={doc.a_d_id}>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {doc.doc_type_text || doc.doc_type || 'Unknown'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {doc.file_name || 'Document'}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              N/A
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Active
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => toggleDropdown(doc, e)}
                                  className="inline-flex items-center px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
                                >
                                  <MoreVertical className="w-3 h-3" />
                                </button>
                                
                                {activeDropdown === doc.a_d_id && createPortal(
                                  <div
                                    ref={dropdownRef}
                                    className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
                                    style={{
                                      top: dropdownPosition.top,
                                      left: dropdownPosition.left
                                    }}
                                    data-dropdown-menu
                                  >
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDocumentAction('view', doc);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                      <Eye className="w-3 h-3 mr-2" />
                                      View
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDocumentAction('download', doc);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                      <Download className="w-3 h-3 mr-2" />
                                      Download
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        handleDocumentAction('archive', doc);
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                    >
                                      <Archive className="w-3 h-3 mr-2" />
                                      Archive
                                    </button>
                                  </div>,
                                  document.body
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Archived Documents */}
              {archivedDocs.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-700">Archived Documents ({archivedDocs.length})</h3>
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="text-sm text-[#0E2F4B] hover:text-[#1a4971] font-medium"
                    >
                      {showArchived ? 'Hide Archived' : 'Show Archived'}
                    </button>
                  </div>
                  
                  {showArchived && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Archived Date</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {archivedDocs.map((doc) => (
                            <tr key={doc.a_d_id}>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {doc.doc_type_text || doc.doc_type || 'Unknown'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {doc.file_name || 'Document'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                N/A
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Archived
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={(e) => toggleDropdown(doc, e)}
                                    className="inline-flex items-center px-2 py-1 border border-gray-300 text-gray-700 text-xs rounded hover:bg-gray-50 transition-colors"
                                  >
                                    <MoreVertical className="w-3 h-3" />
                                  </button>
                                  
                                  {activeDropdown === doc.a_d_id && createPortal(
                                    <div
                                      ref={dropdownRef}
                                      className="absolute z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]"
                                      style={{
                                        top: dropdownPosition.top,
                                        left: dropdownPosition.left
                                      }}
                                      data-dropdown-menu
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDocumentAction('view', doc);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                      >
                                        <Eye className="w-3 h-3 mr-2" />
                                        View
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDocumentAction('download', doc);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                      >
                                        <Download className="w-3 h-3 mr-2" />
                                        Download
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          handleDocumentAction('unarchive', doc);
                                        }}
                                        className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-100 flex items-center"
                                      >
                                        <ArchiveRestore className="w-3 h-3 mr-2" />
                                        Unarchive
                                      </button>
                                    </div>,
                                    document.body
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
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

    </div>
  );
}