import React, { useState, useEffect, useRef, useMemo } from "react";
import { CheckCircle, ArrowLeft, ClipboardCheck, FileText, Upload, Eye, Download, X, Plus, MoreVertical, Archive, ArchiveRestore } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { createPortal } from "react-dom";
import API from "../lib/axios";
import ChecklistModal from "./ChecklistModal";
import SearchableDropdown from "./ui/SearchableDropdown";
import { generateUUID } from '../utils/uuid';
import { useLanguage } from "../contexts/LanguageContext";
import { useNavigation } from "../hooks/useNavigation";

export default function MaintSupervisorApproval() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  // Access control
  const { getAccessLevel } = useNavigation();
  const accessLevel = getAccessLevel('SUPERVISORAPPROVAL');
  const isReadOnly = accessLevel === 'D';
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [loadingChecklist, setLoadingChecklist] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // NULL VALIDATION
  const [empty, setEmpty] = useState(false);
  
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
  
  // State for showing all group assets
  const [showAllAssets, setShowAllAssets] = useState(false);
  
  // Vendor SLA states
  const [vendorSLAs, setVendorSLAs] = useState([]);
  const [slaRecords, setSlaRecords] = useState({}); // { "SLA-1": { value: "", technician_name: "", technician_phno: "" }, ... }
  const [slaRating, setSlaRating] = useState(""); // Single rating for all SLAs
  const [expandedSLA, setExpandedSLA] = useState(null);
  const [loadingSLAs, setLoadingSLAs] = useState(false);
  const [slaDataLoaded, setSlaDataLoaded] = useState(false); // Track if SLA data has been loaded
  const autoSaveTimeoutRef = useRef(null); // For debouncing auto-save
  const slaModifiedRef = useRef({}); // Track which SLAs have been modified: { "SLA-1": true, ... }
  
  // Refs to ensure we always have latest values in timeout callbacks
  const maintenanceDataRef = useRef(null);
  const slaDataLoadedRef = useRef(false);
  const slaRatingRef = useRef("");
  const slaRecordsRef = useRef({});
  
  // Check if this is a subscription renewal (MT001)
  const isSubscriptionRenewal = maintenanceData?.maint_type_id === 'MT001' || 
                                 maintenanceData?.maintenance_type_name?.toLowerCase().includes('subscription');
  
  // Filter document types - exclude work order for subscription renewal
  const filteredMaintenanceDocTypes = useMemo(() => {
    if (isSubscriptionRenewal) {
      return maintenanceDocTypes.filter(docType => 
        !docType.doc_type?.toLowerCase().includes('wo') &&
        !docType.doc_type?.toLowerCase().includes('workorder') &&
        !docType.text?.toLowerCase().includes('work order') &&
        !docType.text?.toLowerCase().includes('workorder')
      );
    }
    return maintenanceDocTypes;
  }, [maintenanceDocTypes, isSubscriptionRenewal]);
  
  // Form state for updatable fields
  const [formData, setFormData] = useState({
    notes: "",
    status: "",
    po_number: "",
    invoice: "",
    technician_name: "",
    technician_email: "",
    technician_phno: "",
    cost: "",
    hours_spent: "",
    maint_notes: ""
  });

  // Validation state for each field
  const [validationErrors, setValidationErrors] = useState({
    status: false,
    po_number: false,
    invoice: false,
    technician_name: false,
    technician_email: false,
    technician_phno: false,
    cost: false,
    hours_spent: false,
    maint_notes: false
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

  // Keep refs in sync with state
  useEffect(() => {
    maintenanceDataRef.current = maintenanceData;
  }, [maintenanceData]);

  useEffect(() => {
    slaDataLoadedRef.current = slaDataLoaded;
  }, [slaDataLoaded]);

  useEffect(() => {
    slaRatingRef.current = slaRating;
  }, [slaRating]);

  useEffect(() => {
    slaRecordsRef.current = slaRecords;
  }, [slaRecords]);

  // Fetch vendor SLAs when maintenance data is available and has vendor_id
  useEffect(() => {
    if (maintenanceData?.vendor_id) {
      fetchVendorSLAs();
      fetchSlaRecords();
    }
  }, [maintenanceData?.vendor_id, id]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, []);


  const fetchMaintenanceData = async () => {
    try {
      setLoadingData(true);
      const apiUrl = `/maintenance-schedules/${id}`;
      // Pass context so logs go to SUPERVISORAPPROVAL CSV
      const res = await API.get(apiUrl, {
        params: { context: 'SUPERVISORAPPROVAL' }
      });
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
          technician_phno: res.data.data.technician_phno || "",
          cost: res.data.data.cost || "",
          hours_spent: res.data.data.hours_spent || "",
          maint_notes: res.data.data.maint_notes || ""
        });
      } else {
        toast.error(res.data.message || t('maintenanceSupervisor.failedToFetchMaintenanceData'));
      }
    } catch (err) {
      console.error("Failed to fetch maintenance data:", err);
      toast.error(t('maintenanceSupervisor.failedToFetchMaintenanceData'));
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
        // Pass context so logs go to SUPERVISORAPPROVAL CSV
        const res = await API.get(apiUrl, {
          params: { context: 'SUPERVISORAPPROVAL' }
        });
        
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
      toast.error(t('maintenanceSupervisor.failedToFetchChecklist'));
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
      toast.error(t('maintenanceSupervisor.failedToLoadDocumentTypes'));
      setMaintenanceDocTypes([]);
      setPhotoDocTypes([]);
    }
  };


  const fetchVendorSLAs = async () => {
    if (!maintenanceData?.vendor_id) return;
    
    setLoadingSLAs(true);
    try {
      const res = await API.get(`/vendor/${maintenanceData.vendor_id}/slas`, {
        params: { context: 'SUPERVISORAPPROVAL' }
      });
      
      if (res.data.success) {
        // Filter only SLAs that have values (are filled)
        const filledSLAs = res.data.data.filter(sla => sla.value && sla.value.trim() !== '');
        setVendorSLAs(filledSLAs);
        
        // Initialize SLA records state with SLA values from vendor SLAs
        const initialRecords = {};
        filledSLAs.forEach(sla => {
          initialRecords[sla.sla_id] = {
            value: sla.value || "",
            technician_name: "",
            technician_phno: ""
          };
        });
        // Don't overwrite existing records, just merge
        setSlaRecords(prev => {
          const merged = { ...initialRecords };
          Object.keys(prev).forEach(key => {
            if (merged[key]) {
              merged[key] = { ...merged[key], ...prev[key] };
            }
          });
          return merged;
        });
        // Mark as loaded after a short delay to allow fetchSlaRecords to complete first
        setTimeout(() => setSlaDataLoaded(true), 100);
      } else {
        setVendorSLAs([]);
      }
    } catch (err) {
      console.error("Failed to fetch vendor SLAs:", err);
      setVendorSLAs([]);
    } finally {
      setLoadingSLAs(false);
    }
  };

  const fetchSlaRecords = async () => {
    if (!id || !maintenanceData?.vendor_id) return;
    
    try {
      const res = await API.get(`/vendor-sla-records/maintenance/${id}`, {
        params: { context: 'SUPERVISORAPPROVAL' }
      });
      
      if (res.data.success && res.data.data && Array.isArray(res.data.data)) {
        // Transform API response to state format
        const records = {};
        let ratingValue = "";
        
        res.data.data.forEach(record => {
          records[record.sla_id] = {
            value: record.sla_value || "",
            technician_name: record.technician_name || "",
            technician_phno: record.technician_phno || ""
          };
          // Get rating from first record (since it's the same for all)
          if (!ratingValue && record.rating) {
            ratingValue = record.rating;
          }
        });
        
        setSlaRecords(prev => ({ ...prev, ...records }));
        if (ratingValue) {
          setSlaRating(ratingValue);
        }
        setSlaDataLoaded(true); // Mark that data has been loaded
      } else {
        setSlaDataLoaded(true); // Mark as loaded even if no data
      }
    } catch (err) {
      // If endpoint doesn't exist yet or no records, that's okay
      console.log("No existing SLA records found or endpoint not available yet");
    }
  };

  const handleSlaRecordChange = (slaId, field, value) => {
    console.log(`handleSlaRecordChange called for ${slaId}, field: ${field}, value:`, value);
    
    // Mark this SLA as modified
    slaModifiedRef.current[slaId] = true;
    
    setSlaRecords(prev => {
      const currentRecord = prev[slaId] || { value: "", technician_name: "", technician_phno: "" };
      const updated = {
        ...prev,
        [slaId]: {
          ...currentRecord,
          [field]: value
        }
      };
      console.log(`State updated for ${slaId}.${field}:`, value);
      return updated;
    });
  };

  // Check if all fields for a specific SLA are filled (excluding rating which is separate)
  const isSlaRecordComplete = (slaId) => {
    const record = slaRecords[slaId];
    if (!record) return false;
    
    return (
      record.value && record.value.trim() !== '' &&
      record.technician_name && record.technician_name.trim() !== '' &&
      record.technician_phno && record.technician_phno.trim() !== ''
    );
  };

  // Auto-save function - only saves if all fields are filled for each SLA
  // Accepts currentRecords parameter to use latest state
  const autoSaveSlaRecords = async (currentRecords = null, currentRating = null) => {
    // Use refs to get latest values (important for timeout callbacks)
    const latestMaintenanceData = maintenanceDataRef.current;
    const latestSlaDataLoaded = slaDataLoadedRef.current;
    
    if (!id || !latestMaintenanceData?.vendor_id || !latestSlaDataLoaded) {
      console.log("Auto-save skipped:", { 
        id, 
        vendor_id: latestMaintenanceData?.vendor_id, 
        slaDataLoaded: latestSlaDataLoaded 
      });
      return; // Don't auto-save if data hasn't been loaded yet
    }

    // Use provided records or ref (which has latest state)
    const recordsToCheck = currentRecords || slaRecordsRef.current;
    const ratingToUse = currentRating !== null ? currentRating : slaRatingRef.current;

    console.log("Auto-save triggered. Current SLA records:", recordsToCheck);
    console.log("Current rating:", ratingToUse);

    // Filter to only include SLAs where all fields are filled
    const recordsToSave = Object.entries(recordsToCheck)
      .filter(([slaId, data]) => {
        const isComplete = (
          data && data.value && data.value.trim() !== '' &&
          data.technician_name && data.technician_name.trim() !== '' &&
          data.technician_phno && data.technician_phno.trim() !== ''
        );
        console.log(`SLA ${slaId} complete check:`, { isComplete, data });
        return isComplete;
      })
      .map(([slaId, data]) => ({
        sla_id: slaId,
        sla_value: data.value,
        technician_name: data.technician_name,
        technician_phno: data.technician_phno,
        rating: ratingToUse || null // Use single rating for all SLAs (can be null)
      }));

    // Only save if there are complete records (rating can be added later)
    if (recordsToSave.length === 0) {
      console.log("No complete SLA records to save");
      return; // Don't save if no complete records
    }

    console.log("Saving SLA records to tblvendorslarecs:", {
      maintenanceId: id,
      vendor_id: latestMaintenanceData.vendor_id,
      recordsCount: recordsToSave.length,
      records: recordsToSave
    });

    try {
      const response = await API.post(`/vendor-sla-records/maintenance/${id}`, {
        vendor_id: latestMaintenanceData.vendor_id,
        ams_id: id,
        records: recordsToSave
      }, {
        params: { context: 'SUPERVISORAPPROVAL' }
      });

      // Show success toast for auto-save
      console.log("✅ SLA records auto-saved successfully to tblvendorslarecs", {
        savedCount: recordsToSave.length,
        rating: ratingToUse || 'not set',
        response: response.data
      });
      toast.success(`SLA records saved successfully (${recordsToSave.length} SLA${recordsToSave.length > 1 ? 's' : ''})`);
    } catch (err) {
      console.error("❌ Failed to auto-save SLA records to tblvendorslarecs:", err);
      console.error("Error details:", err.response?.data);
      console.error("Request data:", {
        vendor_id: latestMaintenanceData.vendor_id,
        ams_id: id,
        records: recordsToSave
      });
      // Show error toast for auto-save failures so user knows something went wrong
      toast.error("Failed to auto-save SLA records. Please try again.");
    }
  };

  // Debounced auto-save handler - checks if all fields are filled before saving
  const handleSlaRecordBlur = (slaId, field, value, event) => {
    console.log(`handleSlaRecordBlur called for ${slaId}, field: ${field}, value:`, value);
    
    // First, update the state with the latest value
    setSlaRecords(currentRecords => {
      const record = currentRecords[slaId] || { value: "", technician_name: "", technician_phno: "" };
      
      // IMPORTANT: Update the record with the latest value from the blur event
      // This ensures we use the actual value from the input, not stale state
      const updatedRecord = {
        ...record,
        [field]: value // This is the value from the blur event, guaranteed to be current
      };

      // CRITICAL FIX: Read all field values directly from DOM to ensure we have the latest values
      // This prevents issues where state hasn't updated yet
      if (event && event.target) {
        try {
          // Try multiple strategies to find the inputs
          // Strategy 1: Find by data attributes anywhere in the document (most reliable)
          const valueInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="value"]`);
          const nameInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="technician_name"]`);
          const phoneInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="technician_phno"]`);
          
          console.log(`🔍 DOM search for ${slaId}:`, {
            valueInput: valueInput ? `found (value: "${valueInput.value}")` : 'not found',
            nameInput: nameInput ? `found (value: "${nameInput.value}")` : 'not found',
            phoneInput: phoneInput ? `found (value: "${phoneInput.value}")` : 'not found'
          });
          
          // Update record with actual DOM values (these are always current)
          // Always use DOM values if they exist, even if empty (to ensure we have the latest state)
          if (valueInput) {
            updatedRecord.value = valueInput.value || '';
            if (valueInput.value) {
              console.log(`✅ Read value from DOM: "${valueInput.value}"`);
            }
          }
          if (nameInput) {
            updatedRecord.technician_name = nameInput.value || '';
            if (nameInput.value) {
              console.log(`✅ Read name from DOM: "${nameInput.value}"`);
            }
          }
          if (phoneInput) {
            updatedRecord.technician_phno = phoneInput.value || '';
            if (phoneInput.value) {
              console.log(`✅ Read phone number from DOM: "${phoneInput.value}"`);
            }
          }
        } catch (err) {
          console.warn("Could not read values from DOM:", err);
        }
      }

      console.log(`Updated record for ${slaId}:`, updatedRecord);
      console.log(`Field being updated: ${field}, New value: "${value}"`);

      // Check if complete with the updated value
      const isComplete = (
        updatedRecord.value && updatedRecord.value.trim() !== '' &&
        updatedRecord.technician_name && updatedRecord.technician_name.trim() !== '' &&
        updatedRecord.technician_phno && updatedRecord.technician_phno.trim() !== ''
      );

      console.log(`SLA ${slaId} completeness check:`, {
        value: updatedRecord.value,
        technician_name: updatedRecord.technician_name,
        technician_phno: updatedRecord.technician_phno,
        valueFilled: !!(updatedRecord.value && updatedRecord.value.trim() !== ''),
        nameFilled: !!(updatedRecord.technician_name && updatedRecord.technician_name.trim() !== ''),
        phoneFilled: !!(updatedRecord.technician_phno && updatedRecord.technician_phno.trim() !== ''),
        isComplete
      });

      // Update state first
      const updatedRecords = {
        ...currentRecords,
        [slaId]: updatedRecord
      };

      // Then check and trigger save after state is updated
      // Only save if all fields are complete AND this SLA was modified
      const wasModified = slaModifiedRef.current[slaId] === true;
      
      if (isComplete && wasModified) {
        console.log(`✅ SLA ${slaId} is complete and modified, will trigger auto-save...`, updatedRecord);

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
        }
        
        // Set new timeout for auto-save (100ms delay for debouncing) - use the updated records
        autoSaveTimeoutRef.current = setTimeout(() => {
          console.log("Executing auto-save for SLA records with updated state...");
          // Use the updated records with the latest value and rating from ref
          // Also update the ref immediately so it has the latest value
          slaRecordsRef.current = updatedRecords;
          autoSaveSlaRecords(updatedRecords, slaRatingRef.current);
          
          // Reset modified flag after saving
          slaModifiedRef.current[slaId] = false;
        }, 100); // Reduced from 500ms to 100ms for faster auto-save
      } else {
        console.log(`⚠️ SLA ${slaId} is not complete yet, skipping auto-save`, updatedRecord);
        console.log(`Missing fields:`, {
          value: !updatedRecord.value || updatedRecord.value.trim() === '' ? 'MISSING' : 'OK',
          technician_name: !updatedRecord.technician_name || updatedRecord.technician_name.trim() === '' ? 'MISSING' : 'OK',
          technician_phno: !updatedRecord.technician_phno || updatedRecord.technician_phno.trim() === '' ? 'MISSING' : 'OK'
        });
      }

      // Always return updated state
      return updatedRecords;
    });
  };

  // Handle rating change (single rating for all SLAs)
  const handleSlaRatingChange = (value) => {
    setSlaRating(value);
    // Auto-save when rating is changed if there are any complete SLA records
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      // Use ref to get latest records (important for timeout callbacks)
      const latestRecords = slaRecordsRef.current;
      // Check if at least one SLA is complete before saving
      const hasCompleteSLA = Object.keys(latestRecords).some(slaId => {
        const record = latestRecords[slaId];
        return record && 
          record.value && record.value.trim() !== '' &&
          record.technician_name && record.technician_name.trim() !== '' &&
          record.technician_phno && record.technician_phno.trim() !== '';
      });
      if (hasCompleteSLA) {
        console.log("Rating changed, triggering auto-save...");
        autoSaveSlaRecords(latestRecords, value);
      }
    }, 500);
  };


  const fetchMaintenanceDocuments = async () => {
    if (!maintenanceData?.ams_id && !maintenanceData?.asset_id) {
      console.log('No ams_id or asset_id available for fetching maintenance documents');
      return;
    }
    
    setLoadingMaintenanceDocs(true);
    try {
      let res;
      
      // For group maintenance or when ams_id is available, fetch by work order (ams_id)
      // This ensures we get documents uploaded for the maintenance schedule
      if (maintenanceData?.ams_id) {
        console.log('Fetching maintenance documents for work order:', maintenanceData.ams_id);
        res = await API.get(`/asset-maint-docs/work-order/${maintenanceData.ams_id}`, {
          validateStatus: function (status) {
            return status === 200 || status === 404;
          },
          params: { context: 'SUPERVISORAPPROVAL' }
        });
      } else {
        // Fallback to asset documents if ams_id is not available
        console.log('Fetching all documents for asset:', maintenanceData.asset_id);
        res = await API.get(`/assets/${maintenanceData.asset_id}/docs`, {
          validateStatus: function (status) {
            return status === 200 || status === 404;
          },
          params: { context: 'SUPERVISORAPPROVAL' }
        });
      }
      
      console.log('Documents API response:', res.data);
      
      // If 404, set empty arrays
      if (res.status === 404) {
        console.log('No documents found');
        setMaintenanceDocs([]);
        setArchivedDocs([]);
        setManualDocs([]);
        return;
      }
      
      // Process the response - API returns { success: true, data: [...] } for work order endpoint
      // or array directly for asset endpoint
      const allDocs = res.data?.data ? res.data.data : (Array.isArray(res.data) ? res.data : []);
      console.log('All documents from assets endpoint:', allDocs);
      
      // Debug each document's structure
      allDocs.forEach((doc, index) => {
        console.log(`Document ${index + 1}:`, {
          amd_id: doc.amd_id,
          a_d_id: doc.a_d_id,
          doc_type: doc.doc_type,
          doc_type_text: doc.doc_type_text,
          doc_type_name: doc.doc_type_name,
          file_name: doc.file_name,
          is_archived: doc.is_archived,
          source: maintenanceData?.ams_id ? 'maintenance' : 'asset'
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
            amd_id: doc.amd_id,
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
          id: doc.amd_id || doc.a_d_id,
          doc_type_text: doc.doc_type_text,
          file_name: doc.file_name,
          doc_type_name: doc.doc_type_name,
          source: maintenanceData?.ams_id ? 'maintenance' : 'asset'
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
      toast.error(t('maintenanceSupervisor.failedToFetchDocuments'));
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
    
    // Use amd_id for maintenance documents, fallback to a_d_id for asset documents
    const docId = doc.amd_id || doc.a_d_id;
    
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
    
    // Close dropdown immediately
    setActiveDropdown(null);
    
    try {
      // Use amd_id for maintenance documents, fallback to a_d_id for asset documents
      const docId = doc.amd_id || doc.a_d_id;
      
      if (!docId) {
        throw new Error('Document ID not found');
      }
      
      if (action === 'view') {
        // Use maintenance document API if amd_id exists, otherwise use asset document API
        const endpoint = doc.amd_id 
          ? `/asset-maint-docs/${docId}/download?mode=view`
          : `/asset-docs/${docId}/download-url?mode=view`;
        const res = await API.get(endpoint);
        console.log('View response:', res.data);
        if (res.data && res.data.url) {
          window.open(res.data.url, '_blank');
        } else {
          throw new Error('No URL returned from API');
        }
      } else if (action === 'download') {
        // Use maintenance document API if amd_id exists, otherwise use asset document API
        const endpoint = doc.amd_id 
          ? `/asset-maint-docs/${docId}/download?mode=download`
          : `/asset-docs/${docId}/download-url?mode=download`;
        const res = await API.get(endpoint);
        console.log('Download response:', res.data);
        if (res.data && res.data.url) {
          window.open(res.data.url, '_blank');
        } else {
          throw new Error('No URL returned from API');
        }
      } else if (action === 'archive') {
        // Use maintenance document API if amd_id exists, otherwise use asset document API
        const endpoint = doc.amd_id 
          ? `/asset-maint-docs/${docId}/archive-status`
          : `/asset-docs/${docId}/archive-status`;
        const res = await API.put(endpoint, {
          is_archived: true
        });
        console.log('Archive response:', res.data);
        if (res.data && res.data.message && res.data.message.includes('successfully')) {
          toast.success(t('maintenanceSupervisor.documentArchivedSuccessfully'));
          // Refresh documents
          fetchMaintenanceDocuments();
        } else {
          toast.error(t('maintenanceSupervisor.failedToArchiveDocument'));
        }
      } else if (action === 'unarchive') {
        // Use maintenance document API if amd_id exists, otherwise use asset document API
        const endpoint = doc.amd_id 
          ? `/asset-maint-docs/${docId}/archive-status`
          : `/asset-docs/${docId}/archive-status`;
        const res = await API.put(endpoint, {
          is_archived: false
        });
        console.log('Unarchive response:', res.data);
        if (res.data && res.data.message && res.data.message.includes('successfully')) {
          toast.success(t('maintenanceSupervisor.documentUnarchivedSuccessfully'));
          // Refresh documents
          fetchMaintenanceDocuments();
        } else {
          toast.error(t('maintenanceSupervisor.failedToUnarchiveDocument'));
        }
      }
    } catch (err) {
      console.error(`Failed to ${action} document:`, err);
      console.error('Error response:', err.response?.data);
      toast.error(err.response?.data?.message || t('maintenanceSupervisor.failedToActionDocument', { action }));
    }
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
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
  };

  // Document upload handlers
  const addInvoiceUpload = () => {
    setInvoiceUploads(prev => ([...prev, { 
      id: generateUUID(), 
      type: '', 
      docTypeName: '', 
      file: null, 
      previewUrl: '' 
    }]));
  };

  const addBeforeAfterUpload = () => {
    setBeforeAfterUploads(prev => ([...prev, { 
      id: generateUUID(), 
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
      toast.error(t('maintenanceSupervisor.addAtLeastOneInvoiceFile'));
      return;
    }

    // Validate all uploads
    for (const upload of invoiceUploads) {
      if (!upload.type || !upload.file) {
        toast.error(t('maintenanceSupervisor.selectDocumentTypeAndChooseFile'));
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = maintenanceDocTypes.find(dt => dt.id === upload.type);
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !upload.docTypeName?.trim()) {
        toast.error(t('maintenanceSupervisor.enterCustomNameForDocument', { docType: selectedDocType.text }));
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
          toast.success(t('maintenanceSupervisor.allInvoiceFilesUploadedSuccessfully'));
        } else {
          toast.success(t('maintenanceSupervisor.filesUploadedFailed', { successCount, failCount }));
        }
        setInvoiceUploads([]); // Clear uploads after successful upload
        // Refresh maintenance documents
        fetchMaintenanceDocuments();
      } else {
        toast.error(t('maintenanceSupervisor.failedToUploadAnyFiles'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('maintenanceSupervisor.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleBeforeAfterUpload = async () => {
    if (beforeAfterUploads.length === 0) {
      toast.error(t('maintenanceSupervisor.addAtLeastOneImageFile'));
      return;
    }

    // Validate all uploads
    for (const upload of beforeAfterUploads) {
      if (!upload.type || !upload.file) {
        toast.error(t('maintenanceSupervisor.selectImageTypeAndChooseFile'));
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = photoDocTypes.find(dt => dt.id === upload.type);
      if (selectedDocType && selectedDocType.text.toLowerCase().includes('other') && !upload.docTypeName?.trim()) {
        toast.error(t('maintenanceSupervisor.enterCustomNameForImage', { docType: selectedDocType.text }));
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
          toast.success(t('maintenanceSupervisor.allImagesUploadedSuccessfully'));
        } else {
          toast.success(t('maintenanceSupervisor.imagesUploadedFailed', { successCount, failCount }));
        }
        setBeforeAfterUploads([]); // Clear uploads after successful upload
        // Refresh maintenance documents
        fetchMaintenanceDocuments();
      } else {
        toast.error(t('maintenanceSupervisor.failedToUploadAnyImages'));
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error(t('maintenanceSupervisor.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Comprehensive validation
    const errors = {};
    let hasErrors = false;
    
    // Validation differs for subscription renewal vs regular maintenance
    if (isSubscriptionRenewal) {
      // For subscription renewal: status is required (used as payment status)
      if (!formData.status || formData.status.trim() === '') {
        errors.status = true;
        hasErrors = true;
      }
    } else {
      // For regular maintenance: status and technician fields are required
      if (!formData.status || formData.status.trim() === '') {
        errors.status = true;
        hasErrors = true;
      }
      
      if (!formData.technician_name || formData.technician_name.trim() === '') {
        errors.technician_name = true;
        hasErrors = true;
      }
      
      if (!formData.technician_email || formData.technician_email.trim() === '') {
        errors.technician_email = true;
        hasErrors = true;
      }
      
      if (!formData.technician_phno || formData.technician_phno.trim() === '') {
        errors.technician_phno = true;
        hasErrors = true;
      }
      
      // Email format validation
      if (formData.technician_email && formData.technician_email.trim() !== '') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.technician_email)) {
          errors.technician_email = true;
          hasErrors = true;
        }
      }
    }
    
    // Common required fields for both types
    if (!formData.po_number || formData.po_number.trim() === '') {
      errors.po_number = true;
      hasErrors = true;
    }
    
    if (!formData.invoice || formData.invoice.trim() === '') {
      errors.invoice = true;
      hasErrors = true;
    }
    
    if (!formData.cost || formData.cost.trim() === '') {
      errors.cost = true;
      hasErrors = true;
    }
    
    // Cost validation - must be a positive number
    if (formData.cost && formData.cost.trim() !== '') {
      const costValue = parseFloat(formData.cost);
      if (isNaN(costValue) || costValue < 0) {
        errors.cost = true;
        hasErrors = true;
      }
    }

    // Time Tracking Validation
    const hoursSpent = parseFloat(formData.hours_spent || 0);
    const hoursRequired = parseFloat(maintenanceData?.hours_required || 0);
    
    // Check if delayed
    if (hoursSpent > hoursRequired && hoursRequired > 0) {
      if (!formData.maint_notes || formData.maint_notes.trim() === '') {
        errors.maint_notes = true;
        hasErrors = true;
      }
    }
    
    // Set validation errors
    setValidationErrors(errors);
    
    if (hasErrors) {
      toast.error(t('maintenanceSupervisor.pleaseFillAllRequiredFields'));
      return;
    }
    
    try {
      // Prepare update data
      const updateData = {
        ...formData,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        hours_spent: formData.hours_spent ? parseFloat(formData.hours_spent) : null
      };
      
      // For subscription renewal, status represents payment status:
      // CO = Payment Done/Completed
      // IP = Payment Pending
      // IN = Payment Initiated
      // CA = Payment Cancelled
      
      const res = await API.put(`/maintenance-schedules/${id}`, updateData, {
        params: { context: 'SUPERVISORAPPROVAL' }
      });
      
      if (res.data.success) {
        toast.success(t('maintenanceSupervisor.maintenanceScheduleUpdatedSuccessfully'));
        navigate("/maintenance-list");
      } else {
        toast.error(res.data.message || t('maintenanceSupervisor.failedToUpdateMaintenanceSchedule'));
      }
    } catch (err) {
      console.error("Failed to update maintenance schedule:", err);
      toast.error(t('maintenanceSupervisor.failedToUpdateMaintenanceSchedule'));
    }
  };

  if (loadingData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-gray-500">{t('maintenanceSupervisor.loadingMaintenanceData')}</div>
      </div>
    );
  }

  if (!maintenanceData) {
    return (
      <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
        <div className="text-center text-red-500">{t('maintenanceSupervisor.maintenanceRecordNotFound')}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto min-h-[600px] overflow-y-auto p-8 bg-white md:rounded shadow-lg mt-155">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate("/maintenance-list")}
          className="flex items-center gap-2 text-[#0E2F4B] hover:text-blue-700"
        >
          <ArrowLeft size={20} />
          {t('maintenanceSupervisor.backToSupervisorApprovals')}
        </button>
      </div>

      {/* Group Maintenance Info Section */}
      {maintenanceData?.is_group_maintenance && maintenanceData?.group_assets && maintenanceData.group_assets.length > 0 && (
        <div className="mb-6 pb-4 border-b border-gray-200">
          {(() => {
            const assetsToShow = showAllAssets ? maintenanceData.group_assets : maintenanceData.group_assets.slice(0, 4);
            const hasMoreAssets = maintenanceData.group_assets.length > 4;
            
            return (
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">
                  {maintenanceData.group_name || 'Group Maintenance'}
                </h2>
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-600 mb-2">
                    Assets in Group ({maintenanceData.group_assets.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {assetsToShow.map((asset, index) => (
                      <span
                        key={asset.asset_id || index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                      >
                        {asset.asset_name || asset.asset_id}
                        {asset.serial_number && (
                          <span className="ml-2 text-xs text-blue-600">
                            ({asset.serial_number})
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                  {hasMoreAssets && (
                    <button
                      onClick={() => setShowAllAssets(!showAllAssets)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium underline"
                    >
                      {showAllAssets ? 'Show Less' : `Show ${maintenanceData.group_assets.length - 4} More`}
                    </button>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {/* Checklist Section - At the Top */}
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{t('maintenanceSupervisor.maintenanceChecklist')}</h2>
              {maintenanceData?.is_group_maintenance && (
                <p className="text-sm text-gray-600 mt-1">Applies to all {maintenanceData.group_asset_count} assets in the group</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowChecklist(true)}
              disabled={loadingChecklist || checklist.length === 0}
              className="px-4 py-2 border border-blue-300 rounded bg-[#0E2F4B] text-white text-sm font-semibold flex items-center gap-2 justify-center hover:bg-[#14395c] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="View and complete the asset maintenance checklist"
            >
              <ClipboardCheck className="w-4 h-4" />
              {loadingChecklist ? t('maintenanceSupervisor.loading') : t('maintenanceSupervisor.viewChecklist')}
            </button>
          </div>
        </div>

        {/* View Manual Section - Hide for subscription renewal */}
        {!isSubscriptionRenewal && (
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">{t('maintenanceSupervisor.technicalManual')}</h2>
              {maintenanceData?.is_group_maintenance && (
                <p className="text-sm text-gray-600 mt-1">Applies to all {maintenanceData.group_asset_count} assets in the group</p>
              )}
            </div>
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
                {loadingMaintenanceDocs ? t('maintenanceSupervisor.loading') : `${t('maintenanceSupervisor.viewManual')} ${manualDocs.length > 0 ? `(${manualDocs.length})` : ''}`}
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
                    <div key={doc.amd_id || doc.a_d_id || index}>
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
                        {t('maintenanceSupervisor.view')}
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
                        {t('maintenanceSupervisor.download')}
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
              {t('maintenanceSupervisor.technicalManualDocumentsAvailable', { count: manualDocs.length })}
            </div>
          )}
          
        </div>
        )}

        {/* Doc Upload Section */}
        {!isReadOnly && (
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('maintenanceSupervisor.docUpload')}</h2>
            {maintenanceData?.is_group_maintenance && (
              <p className="text-sm text-gray-600 mt-1">Documents will be associated with the group maintenance record</p>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-3">{t('maintenanceSupervisor.uploadMaintenanceDocuments')}</div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">{t('maintenanceSupervisor.uploadDocuments')}</div>
            <button 
              type="button" 
              onClick={addInvoiceUpload} 
              className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              {t('maintenanceSupervisor.addDocument')}
            </button>
          </div>
          
          {invoiceUploads.length === 0 ? (
            <div className="text-sm text-gray-500">{t('maintenanceSupervisor.noDocumentsAdded')}</div>
          ) : (
            <div className="space-y-3">
              {invoiceUploads.map(upload => (
                <div key={upload.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.documentType')}</label>
                    <SearchableDropdown
                      options={filteredMaintenanceDocTypes}
                      value={upload.type}
                      onChange={(value) => updateInvoiceUpload(upload.id, { type: value })}
                      placeholder={t('maintenanceSupervisor.selectType')}
                      searchPlaceholder={t('maintenanceSupervisor.searchTypes')}
                      className="w-full"
                      displayKey="text"
                      valueKey="id"
                    />
                  </div>

                  {(() => {
                    const selectedDocType = filteredMaintenanceDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                    return needsCustomName && (
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.customName')}</label>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-2 text-sm h-[38px] bg-white"
                          value={upload.docTypeName}
                          onChange={(e) => updateInvoiceUpload(upload.id, { docTypeName: e.target.value })}
                          placeholder={t('maintenanceSupervisor.enterCustomNameFor', { docType: selectedDocType?.text })}
                        />
                      </div>
                    );
                  })()}

                  <div className={(() => {
                    const selectedDocType = filteredMaintenanceDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                    return needsCustomName ? 'col-span-4' : 'col-span-7';
                  })()}>
                    <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.fileMax10MB')}</label>
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
                            {upload.file ? upload.file.name : t('maintenanceSupervisor.chooseFile')}
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
                          {t('maintenanceSupervisor.preview')}
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeInvoiceUpload(upload.id)} 
                        className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('maintenanceSupervisor.remove')}
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
                    {t('maintenanceSupervisor.uploading')}
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('maintenanceSupervisor.uploadAllInvoices')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Before/After Images Upload Section - Hide for subscription renewal */}
        {!isReadOnly && !isSubscriptionRenewal && (
        <div className="p-6 rounded-lg border border-gray-200">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('maintenanceSupervisor.beforeAfterImages')}</h2>
            {maintenanceData?.is_group_maintenance && (
              <p className="text-sm text-gray-600 mt-1">Images will be associated with the group maintenance record</p>
            )}
          </div>
          <div className="text-sm text-gray-600 mb-3">{t('maintenanceSupervisor.uploadImagesBeforeAfter')}</div>
          
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium text-gray-700">{t('maintenanceSupervisor.uploadImages')}</div>
            <button 
              type="button" 
              onClick={addBeforeAfterUpload} 
              className="h-[38px] px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 inline-flex items-center"
            >
              <Plus size={16} className="mr-2" />
              {t('maintenanceSupervisor.addImage')}
            </button>
          </div>
          
          {beforeAfterUploads.length === 0 ? (
            <div className="text-sm text-gray-500">{t('maintenanceSupervisor.noImagesAdded')}</div>
          ) : (
            <div className="space-y-3">
              {beforeAfterUploads.map(upload => (
                <div key={upload.id} className="grid grid-cols-12 gap-3 items-start bg-white border border-gray-200 rounded p-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.imageType')}</label>
                    <SearchableDropdown
                      options={photoDocTypes}
                      value={upload.type}
                      onChange={(value) => updateBeforeAfterUpload(upload.id, { type: value })}
                      placeholder={t('maintenanceSupervisor.selectType')}
                      searchPlaceholder={t('maintenanceSupervisor.searchTypes')}
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
                        <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.customName')}</label>
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-2 text-sm h-[38px] bg-white"
                          value={upload.docTypeName}
                          onChange={(e) => updateBeforeAfterUpload(upload.id, { docTypeName: e.target.value })}
                          placeholder={t('maintenanceSupervisor.enterCustomNameFor', { docType: selectedDocType?.text })}
                        />
                      </div>
                    );
                  })()}

                  <div className={(() => {
                    const selectedDocType = photoDocTypes.find(dt => dt.id === upload.type);
                    const needsCustomName = selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT');
                    return needsCustomName ? 'col-span-6' : 'col-span-9';
                  })()}>
                    <label className="block text-xs font-medium mb-1">{t('maintenanceSupervisor.imageFileMax10MB')}</label>
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
                            {upload.file ? upload.file.name : t('maintenanceSupervisor.chooseImage')}
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
                          {t('maintenanceSupervisor.preview')}
                        </a>
                      )}
                      <button 
                        type="button" 
                        onClick={() => removeBeforeAfterUpload(upload.id)} 
                        className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <X className="w-4 h-4 mr-2" />
                        {t('maintenanceSupervisor.remove')}
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
                    {t('maintenanceSupervisor.uploading')}
                  </span>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    {t('maintenanceSupervisor.uploadAllImages')}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        )}

        {/* Maintenance Documents Display Section */}
        <div className="p-6 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">{t('maintenanceSupervisor.uploadedMaintenanceDocuments')}</h2>
          
          {loadingMaintenanceDocs ? (
            <div className="text-center text-gray-500 py-4">{t('maintenanceSupervisor.loadingDocuments')}</div>
          ) : maintenanceDocs.length === 0 && archivedDocs.length === 0 ? (
            <div className="text-center text-gray-500 py-4">{t('maintenanceSupervisor.noMaintenanceDocumentsYet')}</div>
          ) : (
            <div className="space-y-6">
              {/* Active Documents */}
              {maintenanceDocs.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-3">{t('maintenanceSupervisor.activeDocuments')} ({maintenanceDocs.length})</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.documentTypeColumn')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.fileName')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.uploadedDate')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.status')}</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {maintenanceDocs.map((doc) => (
                          <tr key={doc.amd_id || doc.a_d_id}>
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
                                {t('maintenanceSupervisor.active')}
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
                                
                                {activeDropdown === (doc.amd_id || doc.a_d_id) && createPortal(
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
                                      {t('maintenanceSupervisor.view')}
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
                                      {t('maintenanceSupervisor.download')}
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
                                      {t('maintenanceSupervisor.archive')}
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
                    <h3 className="text-lg font-medium text-gray-700">{t('maintenanceSupervisor.archivedDocuments')} ({archivedDocs.length})</h3>
                    <button
                      onClick={() => setShowArchived(!showArchived)}
                      className="text-sm text-[#0E2F4B] hover:text-[#1a4971] font-medium"
                    >
                      {showArchived ? t('maintenanceSupervisor.hideArchived') : t('maintenanceSupervisor.showArchived')}
                    </button>
                  </div>
                  
                  {showArchived && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.documentTypeColumn')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.fileName')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.archivedDate')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('maintenanceSupervisor.status')}</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {archivedDocs.map((doc) => (
                            <tr key={doc.amd_id || doc.a_d_id}>
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
                                  {t('maintenanceSupervisor.archived')}
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
                                  
                                  {activeDropdown === (doc.amd_id || doc.a_d_id) && createPortal(
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
                                        {t('maintenanceSupervisor.view')}
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
                                        {t('maintenanceSupervisor.download')}
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
                                        {t('maintenanceSupervisor.unarchive')}
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
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{t('maintenanceSupervisor.updateMaintenanceSchedule')}</h2>
            {maintenanceData?.is_group_maintenance && (
              <p className="text-sm text-gray-600 mt-1">Updating this maintenance schedule will update the single record that represents all {maintenanceData.group_asset_count} assets in the group</p>
            )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vendor SLA Section - At the Top */}
            {!isSubscriptionRenewal && maintenanceData?.vendor_id && (
              <div className="mb-6 pb-6 border-b border-gray-200">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">Vendor SLA</h3>
                    <p className="text-sm text-gray-600 mt-1">Fill in all fields (marked with *) for each SLA. Data will be saved automatically when all fields are completed.</p>
                  </div>
                  <div className="flex-shrink-0 w-48">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={slaRating}
                      onChange={(e) => handleSlaRatingChange(e.target.value)}
                      disabled={isReadOnly}
                      required
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                      placeholder="Enter rating (0-5)"
                    />
                  </div>
                </div>

                {loadingSLAs ? (
                  <div className="text-center text-gray-500 py-4">Loading SLAs...</div>
                ) : vendorSLAs.length === 0 ? (
                  <div className="text-center text-gray-500 py-4">No SLAs configured for this vendor</div>
                ) : (
                  <div className="space-y-2">
                    {vendorSLAs.map((sla, index) => {
                      const slaId = sla.sla_id || `SLA-${index + 1}`;
                      const isExpanded = expandedSLA === slaId;
                      const record = slaRecords[slaId] || { value: "", technician_name: "", technician_phno: "" };

                      return (
                        <div
                          key={slaId}
                          className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200"
                          onMouseEnter={() => setExpandedSLA(slaId)}
                          onMouseLeave={(e) => {
                            // Don't collapse if mouse is moving to an input field
                            const relatedTarget = e.relatedTarget;
                            if (!relatedTarget || !relatedTarget.closest(`[data-sla-id="${slaId}"]`)) {
                              setExpandedSLA(null);
                              
                              // Only trigger auto-save if this SLA was modified
                              const wasModified = slaModifiedRef.current[slaId] === true;
                              
                              if (!wasModified) {
                                console.log(`ℹ️ SLA ${slaId} section collapsed but no changes were made, skipping auto-save`);
                                return;
                              }
                              
                              // Trigger auto-save when SLA section collapses
                              // Read latest values directly from DOM to ensure we have current data
                              setTimeout(() => {
                                try {
                                  const valueInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="value"]`);
                                  const nameInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="technician_name"]`);
                                  const phoneInput = document.querySelector(`input[data-sla-id="${slaId}"][data-field="technician_phno"]`);
                                  
                                  const record = {
                                    value: valueInput ? (valueInput.value || '') : (slaRecords[slaId]?.value || ''),
                                    technician_name: nameInput ? (nameInput.value || '') : (slaRecords[slaId]?.technician_name || ''),
                                    technician_phno: phoneInput ? (phoneInput.value || '') : (slaRecords[slaId]?.technician_phno || '')
                                  };
                                  
                                  const isComplete = (
                                    record.value && record.value.trim() !== '' &&
                                    record.technician_name && record.technician_name.trim() !== '' &&
                                    record.technician_phno && record.technician_phno.trim() !== ''
                                  );
                                  
                                  if (isComplete) {
                                    console.log(`✅ SLA ${slaId} section collapsed with complete data and modifications, triggering auto-save...`, record);
                                    
                                    // Update state with latest values from DOM
                                    setSlaRecords(currentRecords => {
                                      const updatedRecords = {
                                        ...currentRecords,
                                        [slaId]: record
                                      };
                                      slaRecordsRef.current = updatedRecords;
                                      
                                      // Trigger auto-save with updated records
                                      autoSaveSlaRecords(updatedRecords, slaRatingRef.current);
                                      
                                      // Reset modified flag after saving
                                      slaModifiedRef.current[slaId] = false;
                                      
                                      return updatedRecords;
                                    });
                                  } else {
                                    console.log(`⚠️ SLA ${slaId} section collapsed but data is incomplete, skipping auto-save`, record);
                                  }
                                } catch (err) {
                                  console.warn("Error reading values when SLA section collapsed:", err);
                                }
                              }, 150); // Small delay to ensure blur events have fired
                            }
                          }}
                        >
                          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-700">
                                  {sla.description || slaId}
                                </span>
                                {sla.value && (
                                  <span className="text-sm text-blue-600 font-semibold bg-blue-50 px-2 py-1 rounded">
                                    Agreed SLA: {sla.value} hr/days
                                  </span>
                                )}
                              </div>
                              {isSlaRecordComplete(slaId) && (
                                <span className="text-xs text-green-600 font-medium">✓ Complete</span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500">
                              {isExpanded ? "▼" : "▶"}
                            </div>
                          </div>
                          
                          {isExpanded && (
                            <div className="p-4 bg-white space-y-4 animate-in slide-in-from-top-2 duration-200">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    SLA Value <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    data-sla-id={slaId}
                                    data-field="value"
                                    value={record.value}
                                    onChange={(e) => handleSlaRecordChange(slaId, 'value', e.target.value)}
                                    onBlur={(e) => handleSlaRecordBlur(slaId, 'value', e.target.value, e)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.target.blur(); // Trigger blur to save
                                      }
                                    }}
                                    disabled={isReadOnly}
                                    required
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                                    placeholder="Enter SLA value"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Technician Name <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    data-sla-id={slaId}
                                    data-field="technician_name"
                                    value={record.technician_name}
                                    onChange={(e) => handleSlaRecordChange(slaId, 'technician_name', e.target.value)}
                                    onBlur={(e) => handleSlaRecordBlur(slaId, 'technician_name', e.target.value, e)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.target.blur(); // Trigger blur to save
                                      }
                                    }}
                                    disabled={isReadOnly}
                                    required
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                                    placeholder="Enter technician name"
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Technician Phone Number <span className="text-red-500">*</span>
                                  </label>
                                  <input
                                    type="tel"
                                    data-sla-id={slaId}
                                    data-field="technician_phno"
                                    value={record.technician_phno}
                                    onChange={(e) => handleSlaRecordChange(slaId, 'technician_phno', e.target.value)}
                                    onBlur={(e) => handleSlaRecordBlur(slaId, 'technician_phno', e.target.value, e)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        e.target.blur(); // Trigger blur to save
                                      }
                                    }}
                                    disabled={isReadOnly}
                                    required
                                    className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                                    placeholder="Enter technician phone number"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!isReadOnly && vendorSLAs.length > 0 && (
                  <div className="mt-4 text-sm text-gray-600">
                    <p className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span>Data will be saved automatically when all fields are filled for each SLA</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Technician fields - hide for subscription renewal */}
              {!isSubscriptionRenewal && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.name')}</label>
                    <input
                      type="text"
                      name="technician_name"
                      value={formData.technician_name}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-3 py-2 border ${validationErrors.technician_name ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                      placeholder={t('maintenanceSupervisor.enterTechnicianName')}
                    />
                    {validationErrors.technician_name && (
                      <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.nameIsRequired')}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.phone')}</label>
                    <input
                      type="tel"
                      name="technician_phno"
                      value={formData.technician_phno}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-3 py-2 border ${validationErrors.technician_phno ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                      placeholder={t('maintenanceSupervisor.enterTechnicianPhone')}
                    />
                    {validationErrors.technician_phno && (
                      <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.phoneIsRequired')}</p>
                    )}
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.costOfMaintenance')}</label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border ${validationErrors.cost ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                  placeholder={t('maintenanceSupervisor.enterCost')}
                  min="0"
                  step="0.01"
                />
                {validationErrors.cost && (
                  <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.costIsRequired')}</p>
                )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.poNumber')}</label>
                  <input
                    type="text"
                    name="po_number"
                    value={formData.po_number}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border ${validationErrors.po_number ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                    placeholder={t('maintenanceSupervisor.enterPONumber')}
                  />
                  {validationErrors.po_number && (
                    <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.poNumberIsRequired')}</p>
                  )}
                </div>
              </div>

              {/* Email field - hide for subscription renewal */}
              {!isSubscriptionRenewal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.email')}</label>
                  <input
                    type="email"
                    name="technician_email"
                    value={formData.technician_email}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    className={`w-full px-3 py-2 border ${validationErrors.technician_email ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                    placeholder={t('maintenanceSupervisor.enterTechnicianEmail')}
                    required
                  />
                  {validationErrors.technician_email && (
                    <p className="mt-1 text-sm text-red-600">
                      {formData.technician_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.technician_email) 
                        ? t('maintenanceSupervisor.invalidEmailFormat')
                        : t('maintenanceSupervisor.emailIsRequired')
                      }
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.invoice')}</label>
                <input
                  type="text"
                  name="invoice"
                  value={formData.invoice}
                  onChange={handleInputChange}
                  disabled={isReadOnly}
                  className={`w-full px-3 py-2 border ${validationErrors.invoice ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                  placeholder={t('maintenanceSupervisor.enterInvoiceNumber')}
                />
                {validationErrors.invoice && (
                  <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.invoiceIsRequired')}</p>
                )}
              </div>
            </div>

            {/* Time Tracking Section */}
            <div className="p-4 bg-blue-50 rounded-md border border-blue-100">
               <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceSupervisor.actualHoursSpent')} <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="hours_spent"
                    value={formData.hours_spent}
                    onChange={handleInputChange}
                    disabled={isReadOnly}
                    step="0.1"
                    min="0"
                    placeholder={t('maintenanceSupervisor.enterHours')}
                    className={`w-full px-3 py-2 border ${validationErrors.hours_spent ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                  />
                   {validationErrors.hours_spent && (
                    <p className="mt-1 text-sm text-red-600">{t('maintenanceSupervisor.hoursSpentIsRequired')}</p>
                  )}
               </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {parseFloat(formData.hours_spent || 0) > parseFloat(maintenanceData?.hours_required || 0) && parseFloat(maintenanceData?.hours_required || 0) > 0 
                  ? <span className="text-red-700 font-bold flex items-center gap-1">{t('maintenanceSupervisor.reasonForDelay')} <span className="text-red-500">*</span></span>
                  : t('maintenanceSupervisor.maintenanceNotesOptional')}
              </label>
              <textarea
                name="maint_notes"
                value={formData.maint_notes}
                onChange={handleInputChange}
                rows={3}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border ${validationErrors.maint_notes ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                placeholder={parseFloat(formData.hours_spent || 0) > parseFloat(maintenanceData?.hours_required || 0) && parseFloat(maintenanceData?.hours_required || 0) > 0 
                  ? t('maintenanceSupervisor.explainWhyLonger') 
                  : t('maintenanceSupervisor.enterMaintRemarks')}
              />
              {validationErrors.maint_notes && (
                <p className="mt-1 text-sm text-red-600 font-medium italic">{t('maintenanceSupervisor.maintNotesMandatoryDelay')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('maintenanceApproval.notes')}</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                placeholder={t('maintenanceSupervisor.enterAdditionalNotes')}
              />
            </div>

            {/* Status Dropdown - Highlighted */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {isSubscriptionRenewal ? 'Payment Status' : t('maintenanceSupervisor.status')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                disabled={isReadOnly}
                className={`w-full px-3 py-2.5 border-2 ${validationErrors.status ? 'border-red-500' : 'border-gray-400'} rounded-md shadow-md bg-white font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                required
              >
                <option value="">{t('maintenanceSupervisor.selectStatus')}</option>
                <option value="IN">{t('maintenanceSupervisor.initiated')}</option>
                <option value="IP">{t('maintenanceSupervisor.inProgress')}</option>
                <option value="CO">{t('maintenanceSupervisor.completed')}</option>
                <option value="CA">{t('maintenanceSupervisor.cancelled')}</option>
              </select>
              {validationErrors.status && (
                <p className="mt-1 text-sm text-red-600 font-medium">
                  {isSubscriptionRenewal ? 'Payment status is required' : t('maintenanceSupervisor.statusIsRequired')}
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/maintenance-list")}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('maintenanceSupervisor.cancel')}
              </button>
              {!isReadOnly && (
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#0E2F4B] hover:bg-[#14395c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('maintenanceSupervisor.submit')}
              </button>
              )}
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