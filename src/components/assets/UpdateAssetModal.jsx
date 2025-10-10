import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import API from '../../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuthStore } from '../../store/useAuthStore';
import useAuditLog from '../../hooks/useAuditLog';
import { ASSETS_APP_ID } from '../../constants/assetsAuditEvents';
import { generateUUID } from '../../utils/uuid';
import { useAppData } from '../../contexts/AppDataContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '../../hooks/useNavigation';

const UpdateAssetModal = ({ isOpen, onClose, assetData }) => {
  // Initialize audit logging
  const { recordActionByNameWithFetch } = useAuditLog(ASSETS_APP_ID);
  const { t } = useLanguage();
  
  // Get access level for read-only check
  const { getAccessLevel } = useNavigation();
  const accessLevel = getAccessLevel('ASSETS');
  const isReadOnly = accessLevel === 'D';
  
  // Translate property names
  const translatePropertyName = (propertyName) => {
    const propertyMap = {
      'Brand': t('assets.brand'),
      'Printer Type': t('assets.printerType'),
      'Ram Size': t('assets.ramSize'),
      'Template': t('assets.template'),
      'Connectivity': t('assets.connectivity'),
      'Type': t('assets.type'),
      'IP_ADDRESS': 'IP_ADDRESS', // Keep technical terms as-is
    };
    return propertyMap[propertyName] || propertyName;
  };
  
  const { user } = useAuthStore();
  const { 
    users, 
    vendors, 
    assetTypes, 
    loading: appDataLoading,
    getUserBranchId,
    getUserBranchName,
    getUserDepartmentName 
  } = useAppData();
  
  const [form, setForm] = useState({
    assetType: '',
    serialNumber: '',
    description: '',
    expiryDate: '',
    warrantyPeriod: '',
    purchaseDate: '',
    purchaseCost: '',
    purchaseBy: '',
    vendorBrand: '',
    vendorModel: '',
    purchaseSupply: '',
    serviceSupply: '',
    vendorId: '',
    properties: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseByOptions, setPurchaseByOptions] = useState([]);
  const [vendorBrandOptions, setVendorBrandOptions] = useState([]);
  const [vendorModelOptions, setVendorModelOptions] = useState([]);
  const [purchaseSupplyOptions, setPurchaseSupplyOptions] = useState([]);
  const [serviceSupplyOptions, setServiceSupplyOptions] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState("");
  const assetTypeDropdownRef = useRef(null);
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
  const [dynamicProperties, setDynamicProperties] = useState([]);
  const [assetTypePropsMap, setAssetTypePropsMap] = useState({});
  const [docs, setDocs] = useState([]); // existing documents
  const [docsLoading, setDocsLoading] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [showQSNPrintModal, setShowQSNPrintModal] = useState(false);
  const [qsnPrintReason, setQsnPrintReason] = useState("");
  const [isQSNPrintLoading, setIsQSNPrintLoading] = useState(false);

  // Fetch full asset data with properties
  const fetchAssetWithProperties = async (assetId) => {
    try {
      const response = await API.get(`/assets/${assetId}`);
      if (response.data) {
        return response.data;
      }
    } catch (error) {
      console.error('Error fetching asset with properties:', error);
    }
    return null;
  };

  // Load asset data when modal opens
  useEffect(() => {
    const loadAssetData = async () => {
      if (assetData?.asset_id) {
        // Fetch full asset data with properties
        const fullAssetData = await fetchAssetWithProperties(assetData.asset_id);
        const dataToUse = fullAssetData || assetData;

        // Format dates to YYYY-MM-DD for input type="date"
        const formatDate = (dateString) => {
          if (!dateString) return '';
          try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return ''; // Invalid date
            return date.toISOString().split('T')[0];
          } catch (err) {
            console.error('Error formatting date:', err);
            return '';
          }
        };

        // Clean numeric values by removing currency symbols and formatting
        const cleanNumericValue = (value) => {
          if (!value) return '';
          // Remove currency symbols, commas, and other non-numeric characters except decimal point
          const cleaned = String(value).replace(/[^\d.-]/g, '');
          // Ensure it's a valid number
          const num = parseFloat(cleaned);
          return isNaN(num) ? '' : num.toString();
        };

        console.log('Loading asset data:', dataToUse);
        console.log('Asset properties from API:', dataToUse.properties);
        console.log('Purchased by value:', dataToUse.purchased_by);
        console.log('Available purchase by options:', purchaseByOptions);
        
        setForm({
          assetType: dataToUse.asset_type_id || '',
          serialNumber: dataToUse.serial_number || '',
          description: dataToUse.description || '',
          expiryDate: formatDate(dataToUse.expiry_date),
          warrantyPeriod: dataToUse.warranty_period || '',
          purchaseDate: formatDate(dataToUse.purchased_on),
          purchaseCost: cleanNumericValue(dataToUse.purchased_cost),
          purchaseBy: dataToUse.purchased_by || '',
          vendorBrand: '',
          vendorModel: '',
          purchaseSupply: dataToUse.purchase_vendor_id || '',
          serviceSupply: dataToUse.service_vendor_id || '',
          vendorId: dataToUse.purchase_vendor_id || '',
          properties: dataToUse.properties || {}
        });

        // Fetch dynamic properties for the asset type
        if (dataToUse.asset_type_id) {
          await fetchDynamicProperties(dataToUse.asset_type_id);
        }
      }
    };

    loadAssetData();
  }, [assetData]);

  // Populate dropdowns when context data is available
  useEffect(() => {
    if (users.length > 0) {
      const userOptions = [
        { value: '', label: t('assets.selectUser') },
        ...users.map(user => ({
          value: user.user_id,
          label: user.full_name || user.email || `User ${user.user_id}`
        }))
      ];
      setPurchaseByOptions(userOptions);
    }
  }, [users]);

  useEffect(() => {
    if (vendors.length > 0) {
      const vendorOptions = [
        { value: '', label: 'Select Vendor' },
        ...vendors.map(vendor => ({
          value: vendor.vendor_id,
          label: vendor.vendor_name || vendor.company_name || `Vendor ${vendor.vendor_id}`
        }))
      ];
      setPurchaseSupplyOptions(vendorOptions);
      setServiceSupplyOptions(vendorOptions);
    }
  }, [vendors]);

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown-container') && !event.target.closest('.dropdown-portal')) {
        closeAllDropdowns();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  // Fetch attached documents for this asset
  useEffect(() => {
    const fetchDocs = async () => {
      if (!assetData?.asset_id) return;
      setDocsLoading(true);
      try {
        const res = await API.get(`/assets/${assetData.asset_id}/docs`, {
          // Add validateStatus to prevent Axios from treating 404 as an error
          validateStatus: function (status) {
            return status === 200 || status === 404; // Accept both 200 and 404
          }
        });
        
        // If 404, set empty array
        if (res.status === 404) {
          setDocs([]);
          return;
        }
        
        // Otherwise process the response
        const arr = Array.isArray(res.data) ? res.data : [];
        // Separate active and archived documents
        const activeDocs = arr.filter(doc => !doc.is_archived || doc.is_archived === false);
        const archivedDocs = arr.filter(doc => doc.is_archived === true || doc.is_archived === 'true');
        setDocs(activeDocs);
        setArchivedDocs(archivedDocs);
      } catch (err) {
        // Only show error for non-404 errors (network issues, etc.)
        console.error('Document fetch error:', err);
        toast.error('Failed to load documents due to network error');
        setDocs([]);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, [assetData?.asset_id]);

  const handleDocumentAction = async (doc, action) => {
    const actionKey = `${doc.a_d_id || doc.id}-${action}`;
    if (loadingActions[actionKey]) return;

    try {
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
      
      // Get the download URL from the API
      const res = await API.get(`/asset-docs/${doc.a_d_id || doc.id}/download-url?mode=${action}`);
      
      if (res.data && res.data.url) {
        // Open in new tab
        window.open(res.data.url, '_blank');
        
        // Log document view/download action
        const eventName = action === 'view' ? 'Create' : 'Download';
        console.log('Document action:', action, 'Event name:', eventName);
        await recordActionByNameWithFetch(eventName, { 
          assetId: assetData.asset_id,
          docId: doc.a_d_id || doc.id
        });
      } else {
        throw new Error('No URL returned from API');
      }
    } catch (err) {
      console.error(`Error ${action}ing document:`, err);
      toast.error(`Failed to ${action} document. Please try again.`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const handleArchiveDocument = async (doc, archiveStatus) => {
    const actionKey = `${doc.a_d_id || doc.id}-archive`;
    if (loadingActions[actionKey]) return;

    try {
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
      
      // Update archive status
      const res = await API.put(`/asset-docs/${doc.a_d_id || doc.id}/archive-status`, {
        is_archived: archiveStatus
      });
      
      console.log('Archive response:', res.data); // Debug log
      
      if (res.data && res.data.message && res.data.message.includes('successfully')) {
        toast.success(`Document ${archiveStatus ? 'archived' : 'unarchived'} successfully`);
        // Refresh the documents list and separate active/archived
        const refreshRes = await API.get(`/assets/${assetData.asset_id}/docs`);
        const arr = Array.isArray(refreshRes.data) ? refreshRes.data : [];
        const activeDocs = arr.filter(doc => !doc.is_archived || doc.is_archived === false);
        const archivedDocs = arr.filter(doc => doc.is_archived === true || doc.is_archived === 'true');
        setDocs(activeDocs);
        setArchivedDocs(archivedDocs);
      } else {
        console.error('Archive response error:', res.data);
        throw new Error(res.data?.message || 'Failed to update archive status');
      }
    } catch (err) {
      console.error('Error updating archive status:', err);
      toast.error(`Failed to ${archiveStatus ? 'archive' : 'unarchive'} document. ${err.message || 'Please try again.'}`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const toggleDropdown = (docId, event) => {
    if (activeDropdown === docId) {
      setActiveDropdown(null);
      return;
    }

    // Get button position
    const buttonRect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      top: buttonRect.bottom + window.scrollY + 8,
      left: buttonRect.right - 192 // 192px is the width of the dropdown (w-48)
    });
    setActiveDropdown(docId);
  };

  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };



  const fetchProdServs = async () => {
    try {
      console.log('Fetching product/services...');
      const res = await API.get('/prodserv');
      console.log('ProdServ API response:', res.data);
      if (res.data && Array.isArray(res.data)) {
        // Extract unique brands
        const uniqueBrands = [...new Set(res.data.map(item => item.brand).filter(Boolean))];
        const brandOptions = [
          { value: '', label: 'Select' },
          ...uniqueBrands.map(brand => ({
            value: brand,
            label: brand
          }))
        ];
        setVendorBrandOptions(brandOptions);

        // Extract unique models
        const uniqueModels = [...new Set(res.data.map(item => item.model).filter(Boolean))];
        const modelOptions = [
          { value: '', label: 'Select' },
          ...uniqueModels.map(model => ({
            value: model,
            label: model
          }))
        ];
        setVendorModelOptions(modelOptions);
        
        // Set service supply options to product/services
        const prodServOptions = [
          { value: '', label: 'Select Service' },
          ...res.data.map(item => {
            let label = '';
            if (item.description) {
              // For services, use the description
              label = item.description;
            } else if (item.brand && item.model) {
              // For products, use brand + model
              label = `${item.brand} ${item.model}`;
            } else if (item.brand) {
              // If only brand is available
              label = item.brand;
            } else if (item.model) {
              // If only model is available
              label = item.model;
            } else {
              // Fallback to ID
              label = item.prod_serv_id;
            }
            
            return {
              value: item.prod_serv_id,
              label: label
            };
          })
        ];
        console.log('Service Supply Options:', prodServOptions);
        setServiceSupplyOptions(prodServOptions);
      }
    } catch (err) {
      console.error('Error fetching product/services:', err);
      setServiceSupplyOptions([]);
    }
  };


  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for assets...');
      const res = await API.get('/doc-type-objects/object-type/asset');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const docTypes = res.data.data.map(docType => ({
          id: docType.dto_id,  // Use dto_id instead of doc_type
          text: docType.doc_type_text,
          doc_type: docType.doc_type  // Keep doc_type for reference
        }));
        setDocumentTypes(docTypes);
        console.log('Document types loaded:', docTypes);
        console.log('Available dto_ids:', docTypes.map(dt => dt.id));
      } else {
        console.log('No document types found, using fallback');
        setDocumentTypes([]);
      }
    } catch (err) {
      console.error('Error fetching document types:', err);
      toast.error('Failed to load document types');
      setDocumentTypes([]);
    }
  };

  const fetchDynamicProperties = async (assetTypeId) => {
    if (!assetTypeId) {
      setDynamicProperties([]);
      setAssetTypePropsMap({});
      return;
    }

    try {
      console.log(`Fetching properties for asset type: ${assetTypeId}`);
      const res = await API.get(`/properties/asset-types/${assetTypeId}/properties-with-values`);
      console.log('Properties response:', res.data);

      if (res.data && res.data.data) {
        setDynamicProperties(res.data.data);

        // Create mapping from prop_id to asset_type_prop_id
        const propsMap = {};
        res.data.data.forEach(property => {
          propsMap[property.prop_id] = property.asset_type_prop_id;
        });
        setAssetTypePropsMap(propsMap);
        
        console.log('Dynamic properties loaded:', res.data.data);
        console.log('Current form properties:', form.properties);
      } else {
        setDynamicProperties([]);
        setAssetTypePropsMap({});
      }
    } catch (err) {
      console.error('Error fetching dynamic properties:', err);
      setDynamicProperties([]);
      setAssetTypePropsMap({});
    }
  };

  const handlePropChange = (propertyName, value) => {
    setForm(prev => ({
      ...prev,
      properties: {
        ...prev.properties,
        [propertyName]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }

    setIsSubmitting(true);
    try {
      // Get user's branch ID automatically
      const userBranchId = getUserBranchId(user?.user_id);
      console.log('User branch ID for asset update:', userBranchId);

      // Prepare the asset data according to backend requirements
      const updateData = {
        asset_type_id: form.assetType,
        serial_number: form.serialNumber,
        description: form.description,
        branch_id: userBranchId, // Auto-populate user's branch
        purchase_vendor_id: form.purchaseSupply || null,
        service_vendor_id: form.serviceSupply || null, // Service Supply is service vendor
        prod_serv_id: null, // Product/Service is not used in this form
        maintsch_id: null,
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: 'Active',
        warranty_period: form.warrantyPeriod || null,
        properties: form.properties || {}
      };

      // Use the asset_id from the passed assetData prop
      await API.put(`/assets/${assetData.asset_id}`, updateData);
      
      // Log asset update action
      await recordActionByNameWithFetch('Update', { 
        assetId: assetData.asset_id,
        serialNumber: form.serialNumber,
        changes: {
          assetType: form.assetType,
          description: form.description,
          purchaseCost: form.purchaseCost
        },
        action: 'Asset Updated Successfully'
      });
      
      toast.success(t('assets.assetUpdatedSuccessfully'));
      onClose(true);
    } catch (err) {
      console.error('Error updating asset:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update asset';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle document uploads
  const handleUploadDocuments = async () => {
    if (uploadRows.length === 0) {
      toast.error('Add at least one file');
      return;
    }

    // Validate all attachments
    for (const r of uploadRows) {
      if (!r.type || !r.file) {
        toast.error('Select document type and choose a file for all rows');
        return;
      }
      // Check if the selected document type requires a custom name
      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
      if (selectedDocType && selectedDocType.text.toLowerCase().includes('other') && !r.docTypeName?.trim()) {
        toast.error(`Enter custom name for ${selectedDocType.text} documents`);
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const r of uploadRows) {
        try {
          console.log('Uploading file:', r.file.name, 'with dto_id:', r.type);
          const fd = new FormData();
          fd.append('file', r.file);
          fd.append('dto_id', r.type);  // Send dto_id instead of doc_type
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          // Get org_id from auth store
          const user = useAuthStore.getState().user;
          if (user?.org_id) {
            fd.append('org_id', user.org_id);
          }
          
          // Use the correct API endpoint for asset documents
          await API.post(`/assets/${assetData.asset_id}/docs/upload`, fd, { 
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          successCount++;
          
          // Log document upload
          await recordActionByNameWithFetch('Add Document', { 
            assetId: assetData.asset_id,
            docTypeId: r.type
          });
        } catch (err) {
          console.error('Failed to upload file:', r.file.name, err);
          console.error('Error details:', err.response?.data);
          failCount++;
        }
      }

      if (successCount > 0) {
        if (failCount === 0) {
          toast.success('All files uploaded successfully');
        } else {
          toast.success(`${successCount} files uploaded, ${failCount} failed`);
        }
        setUploadRows([]); // Clear all attachments after upload
        // Refresh the documents list using the correct endpoint
        const res = await API.get(`/assets/${assetData.asset_id}/docs`);
        const arr = Array.isArray(res.data) ? res.data : [];
        setDocs(arr);
      } else {
        toast.error('Failed to upload any files');
      }
    } catch (err) {
      console.error('Upload process error:', err);
      toast.error('Upload process failed');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-visible">
        <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center">
          <h1 className="text-2xl font-semibold">{t('assets.editAsset')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-visible">
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Asset Type Dropdown - Read Only */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.assetType')}</label>
              <div className="relative w-full">
                <div className="border text-gray-600 px-3 py-2 text-xs w-full bg-gray-50 rounded flex justify-between items-center h-9">
                  <span className="text-xs truncate">
                    {form.assetType
                      ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || "Select"
                      : "Select"}
                  </span>
                  <span className="text-xs text-gray-400">(Read Only)</span>
                </div>
              </div>
            </div>

            {/* Serial Number - Read Only */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.serialNumber')}</label>
              <input
                type="text"
                value={form.serialNumber}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50 text-gray-600 cursor-not-allowed"
                placeholder={t('assets.enterSerialNumber')}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.description')}</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                placeholder="Enter description"
              />
            </div>

            {/* Purchase Cost */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.purchaseCost')}</label>
              <input
                type="number"
                step="0.01"
                value={form.purchaseCost || ''}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseCost: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                placeholder="Enter purchase cost"
                required
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.purchaseDate')}</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                required
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.expiryDate')}</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              />
            </div>

            {/* Warranty Period */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.warrantyPeriod')}</label>
              <input
                type="text"
                value={form.warrantyPeriod}
                onChange={(e) => setForm(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
                placeholder="Enter warranty period"
              />
            </div>

            {/* Purchase By */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.purchaseBy')}</label>
              <select
                value={form.purchaseBy}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseBy: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              >
                <option value="">{t('assets.selectUser')}</option>
                {purchaseByOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.purchaseSupply')}</label>
              <select
                value={form.purchaseSupply}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseSupply: e.target.value, vendorId: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Purchase Vendor</option>
                {purchaseSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">{t('assets.serviceSupply')}</label>
              <select
                value={form.serviceSupply}
                onChange={(e) => setForm(prev => ({ ...prev, serviceSupply: e.target.value }))}
                disabled={isReadOnly}
                className={`w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}`}
              >
                <option value="">Select Service Vendor</option>
                {serviceSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Asset Properties */}
          {form.assetType && dynamicProperties.length > 0 && (
            <div className="mt-6">
              <div className="border-b flex gap-8 mb-4">
                <button type="button" className="text-base font-semibold border-b-2 border-[#0E2F4B] text-[#0E2F4B] px-4 py-2 bg-transparent">
                  {t('assets.assetProperties')}
                </button>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {dynamicProperties.map((property) => {
                  const hasValues = property.values && property.values.length > 0;
                  const hasValidValues = hasValues && property.values.some(v => v.value && v.value.trim() !== '');
                  const currentValue = form.properties[property.property] || '';
                  
                  console.log(`Property ${property.property} (${property.prop_id}):`, {
                    currentValue,
                    hasValues,
                    hasValidValues,
                    availableValues: property.values?.map(v => v.value)
                  });
                  
                  return (
                    <div key={property.prop_id}>
                      <label className="block text-sm mb-1 font-medium">{translatePropertyName(property.property)}</label>
                      {hasValidValues ? (
                        // Show dropdown if there are valid values
                        <select
                          name={`property_${property.prop_id}`}
                          value={currentValue}
                          onChange={(e) => handlePropChange(property.property, e.target.value)}
                          disabled={isReadOnly}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm h-9 scrollable-dropdown ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'}`}
                        >
                          <option value="">{t('assets.select')} {translatePropertyName(property.property)}</option>
                          {property.values.map((value) => (
                            <option key={value.aplv_id} value={value.value}>
                              {value.value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        // Show input field if no valid values exist
                        <input
                          type="text"
                          name={`property_${property.prop_id}`}
                          value={currentValue}
                          onChange={(e) => handlePropChange(property.property, e.target.value)}
                          disabled={isReadOnly}
                          placeholder={`${t('assets.enter')} ${translatePropertyName(property.property)}`}
                          className={`w-full px-2 py-1 border border-gray-300 rounded text-sm h-9 ${isReadOnly ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : 'bg-white'}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Attached Documents */}
          <div className="mt-4">
            <div className="text-md font-semibold mb-2">{t('assets.documents')}</div>
            <div className="border rounded-lg bg-white mb-6 overflow-visible">
              {docsLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading documents…</div>
              ) : docs.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">{t('assets.noDocumentsUploaded')}</div>
              ) : (
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">{t('assets.type')}</th>
                      <th className="text-left px-3 py-2">{t('assets.name')}</th>
                      <th className="text-left px-3 py-2">{t('assets.status')}</th>
                      <th className="text-left px-3 py-2">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc) => {
                      const docId = doc.a_d_id || doc.id;
                      const viewLoading = loadingActions[`${docId}-view`];
                      const downloadLoading = loadingActions[`${docId}-download`];
                      const archiveLoading = loadingActions[`${docId}-archive`];
                      const isArchived = doc.is_archived === true || doc.is_archived === 'true';
                      
                      return (
                        <tr key={docId} className={`odd:bg-white even:bg-gray-50 ${isArchived ? 'opacity-60' : ''}`}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {doc.doc_type_text || doc.doc_type || doc.type || '-'}
                            {doc.doc_type_name && (doc.doc_type === 'OT' || doc.doc_type_text?.toLowerCase().includes('other')) && (
                              <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="max-w-md truncate">
                              {doc.file_name || doc.name || 'document'}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              isArchived 
                                ? 'bg-gray-100 text-gray-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {isArchived ? 'Archived' : 'Active'}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="relative dropdown-container">
                              <button
                                type="button"
                                onClick={(e) => toggleDropdown(docId, e)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                              
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Archived Documents Section */}
            {archivedDocs.length > 0 && (
              <div className="mt-6 border-t pt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-md font-semibold text-gray-700">{t('assets.archivedDocuments')} ({archivedDocs.length})</h3>
                  <button
                    type="button"
                    onClick={() => setShowArchived(!showArchived)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    {showArchived ? t('common.hide') : t('common.show')} {t('common.archived')}
                    <svg className={`w-4 h-4 transition-transform ${showArchived ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                
                {showArchived && (
                  <div className="border rounded-lg overflow-hidden bg-gray-50">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-3 py-2">{t('assets.type')}</th>
                          <th className="text-left px-3 py-2">{t('assets.name')}</th>
                          <th className="text-left px-3 py-2">{t('assets.status')}</th>
                          <th className="text-left px-3 py-2">{t('common.actions')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedDocs.map((doc) => {
                          const docId = doc.a_d_id || doc.id;
                          const viewLoading = loadingActions[`${docId}-view`];
                          const downloadLoading = loadingActions[`${docId}-download`];
                          const archiveLoading = loadingActions[`${docId}-archive`];
                          const isArchived = doc.is_archived === true || doc.is_archived === 'true';
                          
                          return (
                            <tr key={docId} className="odd:bg-white even:bg-gray-50 opacity-75">
                              <td className="px-3 py-2 whitespace-nowrap">
                                {doc.doc_type_text || doc.doc_type || doc.type || '-'}
                                {doc.doc_type_name && (doc.doc_type === 'OT' || doc.doc_type_text?.toLowerCase().includes('other')) && (
                                  <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <div className="max-w-md truncate">
                                  {doc.file_name || doc.name || 'document'}
                                </div>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Archived
                                </span>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <div className="relative dropdown-container">
                                  <button
                                    type="button"
                                    onClick={(e) => toggleDropdown(docId, e)}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                                  >
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Upload New Documents */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-900">{t('assets.uploadNewDocuments')}</h3>
                {!isReadOnly && (
                  <button 
                    type="button" 
                    className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                    onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                  >
                    <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {t('assets.addDocument')}
                  </button>
                )}
              </div>
              
              <div className="space-y-3">
                {uploadRows.length === 0 && <div className="text-sm text-gray-500">{t('assets.noNewFilesAdded')}</div>}
                {uploadRows.map(r => (
                  <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border rounded p-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">{t('assets.documentType')}</label>
                      <select 
                        className="w-full border rounded h-[38px] px-2 text-sm" 
                        value={r.type} 
                        onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:e.target.value}:x))}
                      >
                        <option value="">{t('assets.selectType')}</option>
                        {documentTypes.map(docType => (
                          <option key={docType.id} value={docType.id}>
                            {docType.text}
                          </option>
                        ))}
                      </select>
                    </div>
                    {(() => {
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName && (
                        <div className="col-span-3">
                          <label className="block text-xs font-medium mb-1">Custom Name</label>
                          <input 
                            className="w-full border rounded h-[38px] px-2 text-sm" 
                            value={r.docTypeName} 
                            onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))} 
                            placeholder={`Enter custom name for ${selectedDocType?.text}`}
                          />
                        </div>
                      );
                    })()}
                    <div className={(() => {
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName ? 'col-span-4' : 'col-span-7';
                    })()}>
                      <label className="block text-xs font-medium mb-1">{t('assets.file')} ({t('assets.maxFileSize')})</label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <input
                            type="file"
                            id={`file-${r.id}`}
                            onChange={e => {
                              const f = e.target.files?.[0] || null;
                              if (f && f.size > 15 * 1024 * 1024) { // 15MB limit
                                toast.error('File size exceeds 15MB limit');
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
                            className="flex items-center h-[38px] px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer w-full"
                          >
                            <svg className="flex-shrink-0 w-5 h-4 mr-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="truncate max-w-[200px] inline-block">
                              {r.file ? r.file.name : t('assets.chooseFile')}
                            </span>
                          </label>
                        </div>
                        {r.previewUrl && (
                          <a 
                            href={r.previewUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="h-[38px] inline-flex items-center px-4 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors"
                          >
                            Preview
                          </a>
                        )}
                        <button 
                          type="button" 
                          onClick={() => setUploadRows(prev => prev.filter(x => x.id!==r.id))}
                          className="h-[38px] inline-flex items-center px-4 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          {t('assets.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Upload Button */}
              {uploadRows.length > 0 && (
                <div className="mt-6 flex justify-end">
                  <button
                    type="button"
                    onClick={handleUploadDocuments}
                    disabled={isUploading || uploadRows.some(r => {
                      if (!r.type || !r.file) return true;
                      const selectedDocType = documentTypes.find(dt => dt.id === r.type);
                      const needsCustomName = selectedDocType && selectedDocType.text.toLowerCase().includes('other');
                      return needsCustomName && !r.docTypeName?.trim();
                    })}
                    className="h-[38px] inline-flex items-center px-6 bg-[#0E2F4B] text-white rounded shadow-sm text-sm font-medium hover:bg-[#1a4971] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {t('assets.uploadAllFiles')}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between items-center mt-6">
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setShowQSNPrintModal(true)}
                className={`px-6 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] transition-colors flex items-center gap-2 ${
                  isSubmitting || isQSNPrintLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-[#0E2F4B] text-white hover:bg-[#1a4971]'
                }`}
                disabled={isSubmitting || isQSNPrintLoading}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {t('assets.qsnPrint')}
              </button>
            )}
            
            <div className={`flex gap-3 ${isReadOnly ? 'w-full justify-end' : ''}`}>
              <button
                type="button"
                onClick={() => onClose(false)}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? t('common.loading') : t('common.save')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Portal Dropdown */}
      {activeDropdown && createPortal(
        <div 
          className="dropdown-portal fixed w-48 bg-white rounded-md shadow-xl z-[9999] border border-gray-200"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left
          }}
        >
          <div className="py-1">
            <button
              type="button"
              onClick={() => {
                const doc = [...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown);
                if (doc) {
                  handleDocumentAction(doc, 'view');
                  closeAllDropdowns();
                }
              }}
              disabled={loadingActions[`${activeDropdown}-view`]}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {loadingActions[`${activeDropdown}-view`] ? 'Loading...' : 'View'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                const doc = [...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown);
                if (doc) {
                  handleDocumentAction(doc, 'download');
                  closeAllDropdowns();
                }
              }}
              disabled={loadingActions[`${activeDropdown}-download`]}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {loadingActions[`${activeDropdown}-download`] ? 'Loading...' : 'Download'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                const doc = [...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown);
                if (doc) {
                  const isArchived = doc.is_archived === true || doc.is_archived === 'true';
                  handleArchiveDocument(doc, !isArchived);
                  closeAllDropdowns();
                }
              }}
              disabled={loadingActions[`${activeDropdown}-archive`]}
              className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed ${
                [...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown)?.is_archived ? 'text-green-700' : 'text-orange-700'
              }`}
            >
              <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {[...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown)?.is_archived ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l6 6 6-6" />
                )}
              </svg>
              {loadingActions[`${activeDropdown}-archive`] ? 'Loading...' : 
                [...docs, ...archivedDocs].find(d => (d.a_d_id || d.id) === activeDropdown)?.is_archived ? 'Unarchive' : 'Archive'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* QSN Print Modal */}
      {showQSNPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{t('assets.qsnPrint')}</h3>
              <button
                onClick={() => {
                  setShowQSNPrintModal(false);
                  setQsnPrintReason("");
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <div className="p-3 bg-gray-50 rounded-lg mb-4">
                <span className="text-sm font-medium text-gray-700">{t('assets.assetSerialNumber')}</span>
                <div className="text-lg font-mono text-gray-900 mt-1">{form.serialNumber}</div>
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('assets.reasonForQsnPrint')} <span className="text-red-500">*</span>
              </label>
              <textarea
                value={qsnPrintReason}
                onChange={(e) => setQsnPrintReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] focus:border-transparent"
                placeholder={t('assets.enterReasonForPrinting')}
                rows={4}
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowQSNPrintModal(false);
                  setQsnPrintReason("");
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (isQSNPrintLoading) return; // Prevent multiple clicks
                  
                  if (!qsnPrintReason.trim()) {
                    toast.error(t('assets.pleaseEnterReasonForQsn'));
                    return;
                  }
                  
                  setIsQSNPrintLoading(true);
                  
                  try {
                    console.log('QSN Print requested:', {
                      serialNumber: form.serialNumber,
                      reason: qsnPrintReason,
                      assetId: assetData.asset_id
                    });
                    
                    // Call the asset serial print API
                    const response = await API.post('/asset-serial-print/', {
                      serial_no: form.serialNumber,
                      status: 'New',
                      reason: qsnPrintReason.trim()
                    });
                    
                    console.log('QSN Print API response:', response.data);
                    
                    // Log QSN print action
                    await recordActionByNameWithFetch('Save', { 
                      serialNumber: form.serialNumber,
                      assetId: assetData.asset_id,
                      reason: qsnPrintReason.trim()
                    });
                    
                    toast.success('QSN print request submitted successfully');
                    setShowQSNPrintModal(false);
                    setQsnPrintReason("");
                  } catch (error) {
                    console.error('Error submitting QSN print request:', error);
                    
                    // Handle specific cases
                    if (error.response?.status === 409) {
                      // Serial number already exists in print queue
                      toast.error('This serial number is already in the print queue');
                    } else {
                      // Other errors
                      const errorMessage = error.response?.data?.message || 'Failed to submit QSN print request';
                      toast.error(errorMessage);
                    }
                  } finally {
                    setIsQSNPrintLoading(false);
                  }
                }}
                disabled={isQSNPrintLoading}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] ${
                  isQSNPrintLoading 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed' 
                    : 'bg-[#0E2F4B] text-white hover:bg-[#1a4971]'
                }`}
              >
                {isQSNPrintLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  t('assets.printQsn')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      <style>{`
        .scrollable-dropdown {
          max-height: 180px;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

export default UpdateAssetModal;