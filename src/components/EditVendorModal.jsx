import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import API from '../lib/axios';

const EditVendorModal = ({ show, onClose, onConfirm, vendor }) => {
  const [formData, setFormData] = useState({
    vendor_name: '',
    company_name: '',
    company_email: '',
    contact_person_name: '',
    contact_person_email: '',
    contact_person_number: '',
    gst_number: '',
    cin_number: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    pincode: '',
    int_status: 1
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [docs, setDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);

  useEffect(() => {
    if (vendor) {
      setFormData({
        vendor_name: vendor.vendor_name || '',
        company_name: vendor.company_name || '',
        company_email: vendor.company_email || '',
        contact_person_name: vendor.contact_person_name || '',
        contact_person_email: vendor.contact_person_email || '',
        contact_person_number: vendor.contact_person_number || '',
        gst_number: vendor.gst_number || '',
        cin_number: vendor.cin_number || '',
        address_line1: vendor.address_line1 || '',
        address_line2: vendor.address_line2 || '',
        city: vendor.city || '',
        state: vendor.state || '',
        pincode: vendor.pincode || '',
        int_status: vendor.int_status === 'Active' ? 1 : 0
      });
    }
  }, [vendor]);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!vendor?.vendor_id) return;
      setDocsLoading(true);
      try {
        const res = await API.get(`/vendors/${vendor.vendor_id}/documents`);
        const arr = Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []);
        setDocs(arr);
      } catch (err) {
        console.warn('Failed to fetch vendor documents', err);
        setDocs([]);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, [vendor?.vendor_id]);

  // Fetch document types on component mount
  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for vendors...');
      const res = await API.get('/doc-type-objects/object-type/vendor');
      console.log('Document types response:', res.data);

      if (res.data && res.data.success && Array.isArray(res.data.data)) {
        // Transform API data to dropdown format
        const docTypes = res.data.data.map(docType => ({
          id: docType.doc_type,
          text: docType.doc_type_text
        }));
        setDocumentTypes(docTypes);
        console.log('Document types loaded:', docTypes);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitAttempted(true);
    
    // Validate required fields
    if (!formData.vendor_name || !formData.company_name || !formData.company_email) {
      toast.error('Vendor name, company name and company email are required');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.company_email)) {
      toast.error('Please enter a valid company email');
      return;
    }
    if (formData.contact_person_email && !emailRegex.test(formData.contact_person_email)) {
      toast.error('Please enter a valid contact person email');
      return;
    }

    // Validate phone number format
    if (formData.contact_person_number && !/^\d{10}$/.test(formData.contact_person_number)) {
      toast.error('Contact number should be 10 digits');
      return;
    }

    // Validate pincode format
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      toast.error('Pincode should be 6 digits');
      return;
    }

    onConfirm(formData);
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
          const fd = new FormData();
          fd.append('file', r.file);
          fd.append('doc_type', r.type);
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          await API.post(`/vendors/${vendor.vendor_id}/documents`, fd, { 
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
        const res = await API.get(`/vendors/${vendor.vendor_id}/documents`);
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

  // Helper for invalid field
  const isFieldInvalid = (val) => submitAttempted && !val.trim();

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[800px] rounded shadow-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t sticky top-0">
          <span>Edit Vendor</span>
          <button
            onClick={onClose}
            className="text-yellow-400 text-xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Divider */}
        <div className="h-[3px] bg-[#ffc107]" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vendor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="vendor_name"
                  value={formData.vendor_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${isFieldInvalid(formData.vendor_name) ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${isFieldInvalid(formData.company_name) ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="company_email"
                  value={formData.company_email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded text-sm ${isFieldInvalid(formData.company_email) ? 'border-red-500' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  GST Number
                </label>
                <input
                  type="text"
                  name="gst_number"
                  value={formData.gst_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CIN Number
                </label>
                <input
                  type="text"
                  name="cin_number"
                  value={formData.cin_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  name="int_status"
                  value={formData.int_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pincode
                </label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>
            </div>

            {/* Contact and Address Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Name (Optional)
                </label>
                <input
                  type="text"
                  name="contact_person_name"
                  value={formData.contact_person_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Person Email (Optional)
                </label>
                <input
                  type="email"
                  name="contact_person_email"
                  value={formData.contact_person_email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Number (Optional)
                </label>
                <input
                  type="text"
                  name="contact_person_number"
                  value={formData.contact_person_number}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1
                </label>
                <input
                  type="text"
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded text-sm"
                />
              </div>

              {/* Documents */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Documents
                </label>
                <div className="border rounded bg-white overflow-hidden mb-6">
                  {docsLoading ? (
                    <div className="p-2 text-sm text-gray-500">Loading documents…</div>
                  ) : docs.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No documents uploaded.</div>
                  ) : (
                    <div className="max-h-[150px] overflow-y-auto">
                      {docs.map((d, i) => (
                        <div key={i} className={`flex items-center justify-between gap-2 p-2 text-sm ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">
                              {d.doc_type || d.type || '-'}
                              {d.doc_type_name && d.doc_type === 'OT' && (
                                <span className="text-gray-500 ml-1">({d.doc_type_name})</span>
                              )}
                            </div>
                            <div className="text-gray-500 text-xs truncate">{d.file_name || d.name || 'document'}</div>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <a 
                              href={d.url || d.download_url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="px-2 py-1 rounded bg-[#0E2F4B] text-white text-xs hover:bg-[#1a4971] transition-colors"
                            >
                              View
                            </a>
                            <a 
                              href={(d.url || d.download_url) + ((d.url || d.download_url)?.includes('?') ? '&' : '?') + 'download=1'} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="px-2 py-1 rounded border border-gray-300 text-xs hover:bg-gray-50 transition-colors"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>


              </div>
            </div>
          </div>

          {/* Upload New Documents - Full Width */}
          <div className="mt-6 border-t pt-6">
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
                      Upload All Files
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-[#ffc107] hover:bg-[#e0a800] text-white text-sm font-medium py-1.5 px-5 rounded"
            >
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditVendorModal; 