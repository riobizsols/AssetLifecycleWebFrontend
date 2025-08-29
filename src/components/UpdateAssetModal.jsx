import React, { useState, useEffect, useRef } from 'react';
import API from '../lib/axios';
import toast from 'react-hot-toast';
import { MdKeyboardArrowDown } from 'react-icons/md';
import { useAuthStore } from '../store/useAuthStore';

const UpdateAssetModal = ({ isOpen, onClose, assetData }) => {
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
    vendorId: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assetTypes, setAssetTypes] = useState([]);
  const [purchaseByOptions, setPurchaseByOptions] = useState([]);
  const [vendorBrandOptions, setVendorBrandOptions] = useState([]);
  const [vendorModelOptions, setVendorModelOptions] = useState([]);
  const [purchaseSupplyOptions, setPurchaseSupplyOptions] = useState([]);
  const [serviceSupplyOptions, setServiceSupplyOptions] = useState([]);
  const [searchAssetType, setSearchAssetType] = useState("");
  const assetTypeDropdownRef = useRef(null);
  const [assetTypeDropdownOpen, setAssetTypeDropdownOpen] = useState(false);
  const [docs, setDocs] = useState([]); // existing documents
  const [docsLoading, setDocsLoading] = useState(false);
  const [loadingActions, setLoadingActions] = useState({});
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);

  // Load asset data when modal opens
  useEffect(() => {
    if (assetData) {
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

      setForm({
        assetType: assetData.asset_type_id || '',
        serialNumber: assetData.serial_number || '',
        description: assetData.description || '',
        expiryDate: formatDate(assetData.expiry_date),
        warrantyPeriod: assetData.warranty_period || '',
        purchaseDate: formatDate(assetData.purchased_on),
        purchaseCost: assetData.purchased_cost || '',
        purchaseBy: assetData.purchased_by || '',
        vendorBrand: '',
        vendorModel: '',
        purchaseSupply: assetData.vendor_id || '',
        serviceSupply: assetData.prod_serv_id || '',
        vendorId: assetData.vendor_id || ''
      });
    }
  }, [assetData]);

  useEffect(() => {
    fetchAssetTypes();
    fetchUsers();
    fetchProdServs();
    fetchVendors();
  }, []);

  // Fetch attached documents for this asset
  useEffect(() => {
    const fetchDocs = async () => {
      if (!assetData?.asset_id) return;
      setDocsLoading(true);
      try {
        const res = await API.get(`/assets/${assetData.asset_id}/documents`, {
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
        const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setDocs(arr);
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
    const actionKey = `${doc.id}-${action}`;
    if (loadingActions[actionKey]) return;

    const baseUrl = doc.url || doc.download_url;
    if (!baseUrl) {
      toast.error('Document URL not available');
      return;
    }

    try {
      setLoadingActions(prev => ({ ...prev, [actionKey]: true }));
      
      const url = new URL(baseUrl);
      if (action === 'download') {
        url.searchParams.append('download', '1');
      }

      // First verify the URL is accessible
      const checkResponse = await fetch(url.toString(), { method: 'HEAD' });
      if (!checkResponse.ok) {
        throw new Error('Document not accessible');
      }

      // Open in new tab
      window.open(url.toString(), '_blank');
    } catch (err) {
      console.error(`Error ${action}ing document:`, err);
      toast.error(`Failed to ${action} document. Please try again.`);
    } finally {
      setLoadingActions(prev => ({ ...prev, [actionKey]: false }));
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const res = await API.get('/dept-assets/asset-types');
      setAssetTypes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Error fetching asset types:', err);
      setAssetTypes([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get('/users/get-users');
      if (res.data && Array.isArray(res.data)) {
        // Transform API data to dropdown format
        const users = [
          { value: '', label: 'Select' },
          ...res.data.map(user => ({
            value: user.user_id,
            label: user.full_name
          }))
        ];
        setPurchaseByOptions(users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setPurchaseByOptions([]);
    }
  };

  const fetchProdServs = async () => {
    try {
      const res = await API.get('/prodserv');
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
      }
    } catch (err) {
      console.error('Error fetching product/services:', err);
      setPurchaseSupplyOptions([]);
      setServiceSupplyOptions([]);
    }
  };

  const fetchVendors = async () => {
    try {
      const res = await API.get('/get-vendors');
      if (res.data && Array.isArray(res.data)) {
        // Transform API data to dropdown format - only show active vendors
        const vendors = [
          { value: '', label: 'Select' },
          ...res.data
            .filter(vendor => vendor.int_status === 1) // Only active vendors
            .map(vendor => ({
              value: vendor.vendor_id,
              label: vendor.vendor_name || vendor.company_name || `Vendor ${vendor.vendor_id}`
            }))
        ];
        setPurchaseSupplyOptions(vendors);
        setServiceSupplyOptions(vendors);
      }
    } catch (err) {
      console.error('Error fetching vendors:', err);
      setPurchaseSupplyOptions([]);
      setServiceSupplyOptions([]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assetType || !form.serialNumber || !form.purchaseDate || !form.purchaseCost) {
      toast.error('Required fields missing');
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the asset data according to backend requirements
      const updateData = {
        asset_type_id: form.assetType,
        serial_number: form.serialNumber,
        description: form.description,
        vendor_id: form.purchaseSupply || null,
        prod_serv_id: form.serviceSupply || null,
        maintsch_id: null,
        purchased_cost: form.purchaseCost,
        purchased_on: form.purchaseDate,
        purchased_by: form.purchaseBy || null,
        expiry_date: form.expiryDate || null,
        current_status: 'Active',
        warranty_period: form.warrantyPeriod || null
      };

      // Use the asset_id from the passed assetData prop
      await API.put(`/assets/${assetData.asset_id}`, updateData);
      toast.success('Asset updated successfully');
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
      if (r.type === 'OT' && !r.docTypeName?.trim()) {
        toast.error('Enter Doc Type Name for OT documents');
        return;
      }
    }

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const r of uploadRows) {
        try {
          const fd = new FormData();
          fd.append('file', r.file);
          fd.append('doc_type', r.type);
          if (r.type === 'OT') fd.append('doc_type_name', r.docTypeName);
          
          await API.post(`/assets/${assetData.asset_id}/documents`, fd, { 
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          successCount++;
        } catch (err) {
          console.error('Failed to upload file:', r.file.name, err);
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
        // Refresh the documents list
        const res = await API.get(`/assets/${assetData.asset_id}/documents`);
        const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
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
      <div className="bg-white rounded-xl shadow-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="bg-[#0E2F4B] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] text-center">
          <h1 className="text-2xl font-semibold">Update Asset</h1>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Asset Type Dropdown */}
            <div>
              <label className="block text-sm font-medium mb-1">Asset Type</label>
              <div className="relative w-full">
                <button
                  type="button"
                  className="border text-black px-3 py-2 text-xs w-full bg-white rounded focus:outline-none flex justify-between items-center h-9"
                  onClick={() => setAssetTypeDropdownOpen((open) => !open)}
                >
                  <span className="text-xs truncate">
                    {form.assetType
                      ? assetTypes.find((at) => at.asset_type_id === form.assetType)?.text || "Select"
                      : "Select"}
                  </span>
                  <MdKeyboardArrowDown className="ml-2 w-4 h-4 text-gray-500" />
                </button>
                {assetTypeDropdownOpen && (
                  <div
                    ref={assetTypeDropdownRef}
                    className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg max-h-48 overflow-y-auto z-10"
                    style={{ minWidth: "100%" }}
                  >
                    <div className="sticky top-0 bg-white px-2 py-2 border-b z-20">
                      <input
                        type="text"
                        className="w-full border px-2 py-1 rounded text-xs"
                        placeholder="Search by name or ID..."
                        value={searchAssetType}
                        onChange={e => setSearchAssetType(e.target.value)}
                        autoFocus
                      />
                    </div>
                    {assetTypes
                      .filter(at => 
                        at.text?.toLowerCase().includes(searchAssetType.toLowerCase()) ||
                        at.asset_type_id?.toLowerCase().includes(searchAssetType.toLowerCase())
                      )
                      .map((at) => (
                        <div
                          key={at.asset_type_id}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-xs ${form.assetType === at.asset_type_id ? "bg-gray-200" : ""}`}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, assetType: at.asset_type_id }));
                            setAssetTypeDropdownOpen(false);
                            setSearchAssetType("");
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span>{at.text}</span>
                            <span className="text-gray-500">
                              {at.asset_type_id} 
                              {at.is_child ? ' (Child)' : ' (Parent)'}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Serial Number */}
            <div>
              <label className="block text-sm font-medium mb-1">Serial Number</label>
              <input
                type="text"
                value={form.serialNumber}
                onChange={(e) => setForm(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter serial number"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter description"
              />
            </div>

            {/* Purchase Cost */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Cost</label>
              <input
                type="number"
                value={form.purchaseCost}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseCost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter purchase cost"
                required
              />
            </div>

            {/* Purchase Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Date</label>
              <input
                type="date"
                value={form.purchaseDate}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Expiry Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <input
                type="date"
                value={form.expiryDate}
                onChange={(e) => setForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Warranty Period */}
            <div>
              <label className="block text-sm font-medium mb-1">Warranty Period</label>
              <input
                type="text"
                value={form.warrantyPeriod}
                onChange={(e) => setForm(prev => ({ ...prev, warrantyPeriod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter warranty period"
              />
            </div>

            {/* Purchase By */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase By</label>
              <select
                value={form.purchaseBy}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseBy: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select User</option>
                {purchaseByOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Purchase Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Supply</label>
              <select
                value={form.purchaseSupply}
                onChange={(e) => setForm(prev => ({ ...prev, purchaseSupply: e.target.value, vendorId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Vendor</option>
                {purchaseSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Supply */}
            <div>
              <label className="block text-sm font-medium mb-1">Service Supply</label>
              <select
                value={form.serviceSupply}
                onChange={(e) => setForm(prev => ({ ...prev, serviceSupply: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Service</option>
                {serviceSupplyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Attached Documents */}
          <div className="mt-4">
            <div className="text-md font-semibold mb-2">Documents</div>
            <div className="border rounded-lg overflow-hidden bg-white mb-6">
              {docsLoading ? (
                <div className="p-4 text-sm text-gray-500">Loading documents…</div>
              ) : docs.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">No documents uploaded.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">Name</th>
                      <th className="text-left px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {docs.map((doc) => {
                      const viewLoading = loadingActions[`${doc.id}-view`];
                      const downloadLoading = loadingActions[`${doc.id}-download`];
                      
                      return (
                        <tr key={doc.id || doc.file_name} className="odd:bg-white even:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap">
                            {doc.doc_type || doc.type || '-'}
                            {doc.doc_type_name && doc.doc_type === 'OT' && (
                              <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="max-w-md truncate">{doc.file_name || doc.name || 'document'}</div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleDocumentAction(doc, 'view')}
                                disabled={viewLoading}
                                className="px-3 py-1 rounded bg-[#0E2F4B] text-white disabled:opacity-50 disabled:cursor-not-allowed min-w-[60px]"
                              >
                                {viewLoading ? '...' : 'View'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDocumentAction(doc, 'download')}
                                disabled={downloadLoading}
                                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                              >
                                {downloadLoading ? '...' : 'Download'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Upload New Documents */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-md font-medium text-gray-900">Upload New Documents</h3>
                <button 
                  type="button" 
                  className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                  onClick={() => setUploadRows(prev => ([...prev, { id: crypto.randomUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
                >
                  <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Document
                </button>
              </div>
              
              <div className="space-y-3">
                {uploadRows.length === 0 && <div className="text-sm text-gray-500">No new files added.</div>}
                {uploadRows.map(r => (
                  <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border rounded p-3">
                    <div className="col-span-3">
                      <label className="block text-xs font-medium mb-1">Document Type</label>
                      <select 
                        className="w-full border rounded h-[38px] px-2 text-sm" 
                        value={r.type} 
                        onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:e.target.value}:x))}
                      >
                        <option value="">Select type</option>
                        <option value="Purchase_Order">Purchase Order</option>
                        <option value="Invoice">Invoice</option>
                        <option value="Warranty">Warranty</option>
                        <option value="Technical_Spec">Technical Spec</option>
                        <option value="Insurance">Insurance</option>
                        <option value="OT">OT</option>
                      </select>
                    </div>
                    {r.type==='OT' && (
                      <div className="col-span-3">
                        <label className="block text-xs font-medium mb-1">Doc Type Name</label>
                        <input 
                          className="w-full border rounded h-[38px] px-2 text-sm" 
                          value={r.docTypeName} 
                          onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,docTypeName:e.target.value}:x))} 
                          placeholder="Enter type name" 
                        />
                      </div>
                    )}
                    <div className={r.type==='OT' ? 'col-span-4':'col-span-7'}>
                      <label className="block text-xs font-medium mb-1">File (Max 10MB)</label>
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
                              {r.file ? r.file.name : 'Choose file'}
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
                          Remove
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
                    disabled={isUploading || uploadRows.some(r => !r.type || !r.file || (r.type === 'OT' && !r.docTypeName?.trim()))}
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
                        Upload All Files
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={() => onClose(false)}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateAssetModal;