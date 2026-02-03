import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import { toast } from 'react-hot-toast';
import { generateUUID } from '../../utils/uuid';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  X,
  Search,
  Filter,
  ChevronDown,
  Check,
  Plus,
  ArrowLeft as BackArrow
} from 'lucide-react';
import API from '../../lib/axios';

const EditScrapSales = () => {
  const navigate = useNavigate();
  const { scrapId } = useParams();
  const location = useLocation();
  const { user } = useAuthStore();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [selectedAssetType, setSelectedAssetType] = useState('');
  const [availableAssets, setAvailableAssets] = useState([]);
  const [selectedAssets, setSelectedAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [dropdownSearchTerm, setDropdownSearchTerm] = useState('');
  
  // Buyer details
  const [buyerDetails, setBuyerDetails] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_contact: '',
    company_name: ''
  });
  
  // Scrap value management
  const [totalScrapValue, setTotalScrapValue] = useState('');
  const [individualValues, setIndividualValues] = useState({});
  const [groupName, setGroupName] = useState('');
  const [saleDate, setSaleDate] = useState('');
  const [collectionDate, setCollectionDate] = useState('');

  // Mock data for demonstration - replace with actual API calls
  const mockAssetTypes = [
    { asset_type_id: 'AT001', asset_type_name: 'Laptop', asset_type_code: 'AT001' },
    { asset_type_id: 'AT002', asset_type_name: 'Desktop', asset_type_code: 'AT002' },
    { asset_type_id: 'AT003', asset_type_name: 'Monitor', asset_type_code: 'AT003' },
    { asset_type_id: 'AT004', asset_type_name: 'Printer', asset_type_code: 'AT004' },
    { asset_type_id: 'AT005', asset_type_name: 'Furniture', asset_type_code: 'AT005' },
    { asset_type_id: 'AT006', asset_type_name: 'Vehicle', asset_type_code: 'AT006' }
  ];

  const mockAssets = [
    { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN12345' },
    { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN11223' },
    { asset_id: 'A003', name: 'Lenovo ThinkPad', description: 'Laptop - Lenovo ThinkPad', purchased_on: '2023-03-10', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN67890' },
    { asset_id: 'A004', name: 'Dell OptiPlex', description: 'Desktop - Dell OptiPlex', purchased_on: '2023-04-05', asset_type_id: 'AT002', asset_type_name: 'Desktop', serial_number: 'SN33445' },
    { asset_id: 'A005', name: 'Samsung 24"', description: 'Monitor - Samsung 24 inch', purchased_on: '2023-01-10', asset_type_id: 'AT003', asset_type_name: 'Monitor', serial_number: 'SN54321' },
    { asset_id: 'A006', name: 'LG 27"', description: 'Monitor - LG 27 inch', purchased_on: '2023-01-12', asset_type_id: 'AT003', asset_type_name: 'Monitor', serial_number: 'SN77889' },
    { asset_id: 'A007', name: 'HP LaserJet', description: 'Printer - HP LaserJet', purchased_on: '2023-02-15', asset_type_id: 'AT004', asset_type_name: 'Printer', serial_number: 'SN98765' },
    { asset_id: 'A008', name: 'Canon Printer', description: 'Printer - Canon', purchased_on: '2023-02-18', asset_type_id: 'AT004', asset_type_name: 'Printer', serial_number: 'SN44778' }
  ];

  // Mock existing scrap sale data for editing
  const mockExistingScrapSale = {
    scrap_id: 'SCR001',
    group_name: 'Old Electronics Batch',
    selected_assets: [
      { asset_id: 'A001', name: 'Dell XPS 13', description: 'Laptop - Dell XPS 13', purchased_on: '2023-01-15', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN12345', scrap_value: 500 },
      { asset_id: 'A002', name: 'HP Pavilion', description: 'Laptop - HP Pavilion', purchased_on: '2023-02-20', asset_type_id: 'AT001', asset_type_name: 'Laptop', serial_number: 'SN11223', scrap_value: 400 }
    ],
    total_scrap_value: 900,
    buyer_details: {
      buyer_name: 'John Doe',
      buyer_email: 'john@example.com',
      buyer_contact: '+91 98765 43210',
      company_name: 'Tech Recyclers Ltd'
    },
    status: 'Pending'
  };

  useEffect(() => {
    const fetchScrapSaleData = async () => {
      if (!scrapId) return;
      
      setLoading(true);
      try {
        // Fetch scrap sale data from API
        const res = await API.get(`/scrap-sales/${scrapId}`, {
          params: { context: 'SCRAPSALES' }
        });
        
        const scrapSale = res.data?.scrap_sale || res.data?.data;
        if (!scrapSale) {
          toast.error('Scrap sale not found');
          navigate('/scrap-sales');
          return;
        }

        const header = scrapSale.header || scrapSale;
        const details = scrapSale.details || [];

        // Set header data
        setGroupName(header.text || '');
        const totalValue = Array.isArray(header.total_sale_value) 
            ? header.total_sale_value[0] 
            : header.total_sale_value;
        setTotalScrapValue(totalValue || '');
        
        // Set dates if available
        if (header.sale_date) {
            const saleDateStr = typeof header.sale_date === 'string' 
                ? header.sale_date.split('T')[0] 
                : new Date(header.sale_date).toISOString().split('T')[0];
            setSaleDate(saleDateStr);
        } else {
            // Default to today if not set
            setSaleDate(new Date().toISOString().split('T')[0]);
        }
        
        if (header.collection_date) {
            const collectionDateStr = typeof header.collection_date === 'string' 
                ? header.collection_date.split('T')[0] 
                : new Date(header.collection_date).toISOString().split('T')[0];
            setCollectionDate(collectionDateStr);
        }
        
        // Set buyer details (email is not stored in database, so it's optional)
        setBuyerDetails({
          buyer_name: header.buyer_name || '',
          buyer_email: '', // Not stored in database - optional field
          buyer_contact: header.buyer_phone || '',
          company_name: header.buyer_company || ''
        });

        // Fetch asset types to map asset_type_name to asset_type_id
        let assetTypesMap = {};
        try {
          const assetTypesRes = await API.get('/asset-types', {
            params: { context: 'SCRAPSALES' }
          });
          const assetTypes = assetTypesRes.data?.asset_types || assetTypesRes.data?.rows || assetTypesRes.data || [];
          assetTypesMap = {};
          assetTypes.forEach(type => {
            if (type.text || type.asset_type_name) {
              assetTypesMap[type.text || type.asset_type_name] = type.asset_type_id;
            }
          });
        } catch (error) {
          console.error('Error fetching asset types:', error);
        }

        // Transform details to selected assets format
        const transformedSelectedAssets = details.map(detail => {
          const assetTypeId = detail.asset_type_id || assetTypesMap[detail.asset_type_name] || '';
          return {
            asd_id: detail.asd_id,
            asset_id: detail.asset_id,
            name: detail.asset_name || detail.text || '',
            description: `${detail.asset_type_name || ''} - ${detail.asset_name || ''}`,
            asset_type_id: assetTypeId,
            asset_type_name: detail.asset_type_name || '',
            serial_number: detail.serial_number || '',
            sale_value: detail.sale_value || 0
          };
        });

        setSelectedAssets(transformedSelectedAssets);
        
        // Set individual values from sale_value
        const values = {};
        transformedSelectedAssets.forEach(asset => {
          values[asset.asset_id] = asset.sale_value || '';
        });
        setIndividualValues(values);

        // Set asset type from first selected asset
        if (transformedSelectedAssets.length > 0) {
          const firstAsset = transformedSelectedAssets[0];
          setSelectedAssetType(firstAsset.asset_type_id || '');
        }

        // Fetch available assets (excluding already selected ones)
        const selectedAsdIds = transformedSelectedAssets.map(asset => asset.asd_id);
        const selectedAssetIds = transformedSelectedAssets.map(asset => asset.asset_id);
        
        // Fetch available scrap assets for the asset type
        if (transformedSelectedAssets.length > 0 && transformedSelectedAssets[0].asset_type_id) {
          try {
            const assetTypeRes = await API.get(`/scrap-assets-by-type/${transformedSelectedAssets[0].asset_type_id}`, {
              params: { context: 'SCRAPSALES' }
            });
            
            const allAvailableAssets = assetTypeRes.data?.scrap_assets || [];
            
            // Filter out already selected assets
            const availableOnlyAssets = allAvailableAssets.filter(asset => 
              !selectedAsdIds.includes(asset.asd_id) && 
              !selectedAssetIds.includes(asset.asset_id)
            );
            
            setAvailableAssets(availableOnlyAssets);
          } catch (error) {
            console.error('Error fetching available assets:', error);
            setAvailableAssets([]);
          }
        } else {
          setAvailableAssets([]);
        }

      } catch (error) {
        console.error('Error fetching scrap sale:', error);
        toast.error('Failed to load scrap sale data');
        navigate('/scrap-sales');
      } finally {
        setLoading(false);
      }
    };

    fetchScrapSaleData();
  }, [scrapId, navigate]);

  const filteredAvailableAssets = availableAssets.filter(asset => {
    const matchesSearch = (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                         (asset.asset_id?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesFilter = selectedAssetType === '' || asset.asset_type_id === selectedAssetType;
    return matchesSearch && matchesFilter;
  });

  const filteredSelectedAssets = selectedAssets.filter(asset => {
    return (asset.name?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.description?.toLowerCase() || '').includes(filterTerm.toLowerCase()) ||
           (asset.asset_id?.toLowerCase() || '').includes(filterTerm.toLowerCase());
  });

  // Filter asset types for dropdown search
  const filteredAssetTypes = mockAssetTypes.filter(type => 
    type.asset_type_name.toLowerCase().includes(dropdownSearchTerm.toLowerCase()) ||
    type.asset_type_code.toLowerCase().includes(dropdownSearchTerm.toLowerCase())
  );

  const handleSelectAsset = (asset) => {
    setSelectedAssets(prev => [...prev, asset]);
    setAvailableAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
    // Initialize individual value for new asset
    setIndividualValues(prev => ({
      ...prev,
      [asset.asset_id]: ''
    }));
  };

  const handleDeselectAsset = (asset) => {
    setAvailableAssets(prev => [...prev, asset]);
    setSelectedAssets(prev => prev.filter(a => a.asset_id !== asset.asset_id));
    // Remove individual value for deselected asset
    setIndividualValues(prev => {
      const newValues = { ...prev };
      delete newValues[asset.asset_id];
      return newValues;
    });
  };

  const handleSelectAll = () => {
    setSelectedAssets(prev => [...prev, ...filteredAvailableAssets]);
    setAvailableAssets(prev => prev.filter(asset => 
      !filteredAvailableAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
    // Initialize individual values for all selected assets
    const newValues = {};
    filteredAvailableAssets.forEach(asset => {
      newValues[asset.asset_id] = '';
    });
    setIndividualValues(prev => ({ ...prev, ...newValues }));
  };

  const handleDeselectAll = () => {
    setAvailableAssets(prev => [...prev, ...filteredSelectedAssets]);
    setSelectedAssets(prev => prev.filter(asset => 
      !filteredSelectedAssets.some(selected => selected.asset_id === asset.asset_id)
    ));
    // Remove individual values for all deselected assets
    setIndividualValues(prev => {
      const newValues = { ...prev };
      filteredSelectedAssets.forEach(asset => {
        delete newValues[asset.asset_id];
      });
      return newValues;
    });
  };

  const handleAssetTypeSelect = (assetType) => {
    setSelectedAssetType(assetType.asset_type_id);
    setIsDropdownOpen(false);
    setDropdownSearchTerm('');
  };

  const handleIndividualValueChange = (assetId, value) => {
    setIndividualValues(prev => ({
      ...prev,
      [assetId]: value
    }));
  };

  const handleBuyerDetailChange = (field, value) => {
    setBuyerDetails(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate total of individual values
  const totalIndividualValues = Object.values(individualValues).reduce((sum, value) => {
    return sum + (parseFloat(value) || 0);
  }, 0);

  // Validation function
  const validateScrapValues = () => {
    const hasTotalValue = totalScrapValue && parseFloat(totalScrapValue) > 0;
    const hasIndividualValues = Object.values(individualValues).some(value => value && parseFloat(value) > 0);
    
    if (!hasTotalValue && !hasIndividualValues) {
      toast.error('Please provide either total scrap value or individual asset values');
      return false;
    }
    
    if (hasTotalValue && hasIndividualValues) {
      const total = parseFloat(totalScrapValue);
      const individualTotal = totalIndividualValues;
      
      if (Math.abs(total - individualTotal) > 0.01) { // Allow for small floating point differences
        toast.error(`Total scrap value (${total}) does not match sum of individual values (${individualTotal})`);
        return false;
      }
    }
    
    return true;
  };

  const handleSave = async () => {
    if (selectedAssets.length === 0) {
      toast.error('Please select at least one asset');
      return;
    }

    if (!validateScrapValues()) {
      return;
    }

    if (!buyerDetails.buyer_name || !buyerDetails.buyer_contact) {
      toast.error('Please fill in buyer name and contact number');
      return;
    }

    setLoading(true);
    try {
      // Prepare scrap assets with sale values
      const scrapAssetsData = selectedAssets.map(asset => ({
        asd_id: asset.asd_id,
        sale_value: individualValues[asset.asset_id] || asset.sale_value || 0
      }));

      // Calculate total sale value
      const finalTotalValue = totalScrapValue || totalIndividualValues;

      // Call update API
      const response = await API.put(`/scrap-sales/${scrapId}`, {
        text: groupName,
        total_sale_value: finalTotalValue,
        buyer_name: buyerDetails.buyer_name,
        buyer_company: buyerDetails.company_name || null,
        buyer_phone: buyerDetails.buyer_contact,
        sale_date: saleDate || new Date().toISOString().split('T')[0], // Required field
        collection_date: collectionDate || null,
        invoice_no: null, // Can be added if needed
        po_no: null, // Can be added if needed
        scrapAssets: scrapAssetsData
      }, {
        params: { context: 'SCRAPSALES' }
      });

      if (response.data.success) {
        toast.success('Scrap sale updated successfully!');
        navigate('/scrap-sales');
      } else {
        throw new Error(response.data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Error updating scrap sale:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update scrap sale';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    navigate('/scrap-sales');
  };

  // Toggle dropdown
  const toggleDropdown = (docId, event) => {
    event.stopPropagation();
    if (activeDropdown === docId) {
      setActiveDropdown(null);
    } else {
      const rect = event.currentTarget.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        left: rect.left + window.scrollX
      });
      setActiveDropdown(docId);
    }
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    setActiveDropdown(null);
  };

  // Handle document actions
  const handleDocumentAction = async (doc, action) => {
    try {
      if (action === 'view') {
        const res = await API.get(`/scrap-sales-docs/${doc.ssdoc_id}/download?mode=view`, {
          params: { context: 'SCRAPSALES' }
        });
        window.open(res.data.url, '_blank');
      } else if (action === 'download') {
        const res = await API.get(`/scrap-sales-docs/${doc.ssdoc_id}/download?mode=download`, {
          params: { context: 'SCRAPSALES' }
        });
        window.open(res.data.url, '_blank');
      } else if (action === 'archive') {
        await API.put(`/scrap-sales-docs/${doc.ssdoc_id}/archive-status`, {
          is_archived: true,
          archived_path: doc.doc_path
        }, {
          params: { context: 'SCRAPSALES' }
        });
        toast.success('Document archived successfully');
        // Refresh documents
        const res = await API.get(`/scrap-sales-docs/${scrapId}`, {
          params: { context: 'SCRAPSALES' }
        });
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(d => !d.is_archived);
        const archived = allDocs.filter(d => d.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
      } else if (action === 'unarchive') {
        await API.put(`/scrap-sales-docs/${doc.ssdoc_id}/archive-status`, {
          is_archived: false,
          archived_path: null
        }, {
          params: { context: 'SCRAPSALES' }
        });
        toast.success('Document unarchived successfully');
        // Refresh documents
        const res = await API.get(`/scrap-sales-docs/${scrapId}`, {
          params: { context: 'SCRAPSALES' }
        });
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(d => !d.is_archived);
        const archived = allDocs.filter(d => d.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
      }
      setActiveDropdown(null);
    } catch (error) {
      console.error('Document action failed:', error);
      toast.error(`Failed to ${action} document`);
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
      if (selectedDocType && (selectedDocType.text.toLowerCase().includes('other') || selectedDocType.doc_type === 'OT') && !r.docTypeName?.trim()) {
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
          fd.append('dto_id', r.type);  // Send dto_id instead of doc_type
          fd.append('ssh_id', scrapId);  // Add scrap sale ID
          if (r.type && r.docTypeName?.trim()) {
            fd.append('doc_type_name', r.docTypeName);
          }
          
          await API.post(`/scrap-sales-docs/upload`, fd, { 
            headers: { 'Content-Type': 'multipart/form-data' },
            params: { context: 'SCRAPSALES' }
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
        const res = await API.get(`/scrap-sales-docs/${scrapId}`, {
          params: { context: 'SCRAPSALES' }
        });
        const allDocs = res.data?.documents || [];
        const active = allDocs.filter(doc => !doc.is_archived);
        const archived = allDocs.filter(doc => doc.is_archived);
        setDocs(active);
        setArchivedDocs(archived);
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

  const selectedAssetTypeName = mockAssetTypes.find(type => type.asset_type_id === selectedAssetType);
  const [docs, setDocs] = useState([]);
  const [archivedDocs, setArchivedDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploadRows, setUploadRows] = useState([]); // {id,type,docTypeName,file,previewUrl}
  const [isUploading, setIsUploading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      if (!scrapId) return;
      console.log('EditScrapSales - Fetching documents for scrapId:', scrapId);
      setDocsLoading(true);
      try {
        const res = await API.get(`/scrap-sales-docs/${scrapId}`, {
          params: { context: 'SCRAPSALES' }
        });
        console.log('EditScrapSales - Documents API response:', res.data);
        const allDocs = res.data?.documents || res.data?.data || [];
        
        // Separate active and archived documents
        const active = allDocs.filter(doc => !doc.is_archived);
        const archived = allDocs.filter(doc => doc.is_archived);
        
        setDocs(active);
        setArchivedDocs(archived);
      } catch (err) {
        console.warn('Failed to fetch scrap sales documents', err);
        setDocs([]);
        setArchivedDocs([]);
      } finally {
        setDocsLoading(false);
      }
    };
    fetchDocs();
  }, [scrapId]);

  // Fetch document types on component mount
  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.dropdown-portal')) {
        closeAllDropdowns();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const fetchDocumentTypes = async () => {
    try {
      console.log('Fetching document types for scrap sales...');
      const res = await API.get('/doc-type-objects/object-type/scrap sales', {
        params: { context: 'SCRAPSALES' }
      });
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E2F4B] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading scrap sale data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:text-gray-900 rounded-md hover:bg-gray-100"
            >
              <BackArrow size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t('scrapSales.editScrapSale')}</h1>
              <p className="text-sm text-gray-600">{t('scrapSales.updateScrapSaleDetails')}</p>
            </div>
          </div>
        </div>

        {/* Asset Type Selection */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.assetType')}</h2>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <label className="text-sm font-medium text-gray-700 min-w-[80px] sm:min-w-[100px]">
              {t('scrapSales.assetType')}:
            </label>
            <div className="relative flex-1">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-left bg-white flex items-center justify-between"
              >
                <span className={selectedAssetType ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedAssetTypeName ? `${selectedAssetTypeName.asset_type_code} - ${selectedAssetTypeName.asset_type_name}` : t('scrapSales.selectAssetType')}
                </span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="p-2">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={t('scrapSales.searchAssetTypes')}
                        value={dropdownSearchTerm}
                        onChange={(e) => setDropdownSearchTerm(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        autoFocus
                      />
                    </div>
                    
                    {/* Dropdown Options */}
                    <div className="max-h-48 overflow-y-auto">
                      {filteredAssetTypes.length > 0 ? (
                        filteredAssetTypes.map((type) => (
                          <button
                            key={type.asset_type_id}
                            onClick={() => handleAssetTypeSelect(type)}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-900">
                              {type.asset_type_code} - {type.asset_type_name}
                            </span>
                            {selectedAssetType === type.asset_type_id && (
                              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {t('scrapSales.noAssetTypesFound')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Asset Selection Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.assetSelection')}</h2>
          
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Available Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">{t('scrapSales.availableAssets')}</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={t('scrapSales.searchAssetsPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Available Assets Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.name')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.description')}
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.serialNumber')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredAvailableAssets.map((asset, index) => (
                      <tr 
                        key={asset.asset_id}
                        className={`hover:bg-gray-50 cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        onClick={() => handleSelectAsset(asset)}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.description}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.serial_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Controls */}
              <div className="lg:hidden flex justify-center gap-4 py-2 bg-gray-50 rounded-lg mt-2">
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title={t('scrapSales.addAllAssets')}
                >
                  {t('scrapSales.addAll')}
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed bg-white border border-gray-300 rounded"
                  title={t('scrapSales.removeAllAssets')}
                >
                  {t('scrapSales.removeAll')}
                </button>
              </div>
            </div>

            {/* Desktop Transfer Controls */}
            <div className="hidden lg:flex flex-col justify-center items-center gap-2 flex-shrink-0 px-2">
              {/* Transfer buttons in order: right single, right all, left single, left all */}
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => handleSelectAsset(filteredAvailableAssets[0])}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.addOneAsset')}
                >
                  <span className="text-lg font-bold">→</span>
                </button>
                <button
                  onClick={handleSelectAll}
                  disabled={filteredAvailableAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.addAllAssets')}
                >
                  <span className="text-lg font-bold">{'>>'}</span>
                </button>
                <button
                  onClick={() => handleDeselectAsset(filteredSelectedAssets[0])}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.removeOneAsset')}
                >
                  <span className="text-lg font-bold">←</span>
                </button>
                <button
                  onClick={handleDeselectAll}
                  disabled={filteredSelectedAssets.length === 0}
                  className="p-1 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('scrapSales.removeAllAssets')}
                >
                  <span className="text-lg font-bold">{'<<'}</span>
                </button>
              </div>
            </div>

            {/* Selected Assets */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-md font-medium text-gray-900">{t('scrapSales.selectedScrapAssets')}</h3>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder={t('scrapSales.searchSelectedAssetsPlaceholder')}
                      value={filterTerm}
                      onChange={(e) => setFilterTerm(e.target.value)}
                      className="pl-8 pr-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Assets Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Serial Number
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Value (₹)
                      </th>
                      <th className="px-3 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('scrapSales.action')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredSelectedAssets.map((asset, index) => (
                      <tr 
                        key={asset.asset_id}
                        className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      >
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.name}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">{asset.serial_number}</td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <input
                            type="number"
                            placeholder="0"
                            value={individualValues[asset.asset_id] || ''}
                            onChange={(e) => handleIndividualValueChange(asset.asset_id, e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-900">
                          <button
                            onClick={() => handleDeselectAsset(asset)}
                            className="text-red-600 hover:text-red-800"
                            title="Remove asset"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600">
                  {t('scrapSales.totalAssetsSelected')}: <span className="font-semibold text-gray-900">{selectedAssets.length}</span>
                </p>
                <p className="text-sm text-gray-600">
                  {t('scrapSales.totalIndividualValues')}: <span className="font-semibold text-gray-900">₹{totalIndividualValues.toFixed(2)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Scrap Value Configuration */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.scrapValueConfiguration')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.groupName')}</label>
              <input
                type="text"
                placeholder={t('scrapSales.groupNamePlaceholder')}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scrapSales.groupNameOptional')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.totalScrapValue')}</label>
              <input
                type="number"
                placeholder={t('scrapSales.enterTotalScrapValue')}
                value={totalScrapValue}
                onChange={(e) => setTotalScrapValue(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('scrapSales.totalScrapValueHelp')}
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">
              <p>{t('scrapSales.individualValuesTotal')}: ₹{totalIndividualValues.toFixed(2)}</p>
              {totalScrapValue && (
                <p className={Math.abs(parseFloat(totalScrapValue) - totalIndividualValues) > 0.01 ? 'text-red-600' : 'text-green-600'}>
                  Difference: ₹{(parseFloat(totalScrapValue) - totalIndividualValues).toFixed(2)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Buyer Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.buyerInformation')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.buyerNameRequired')}</label>
              <input
                type="text"
                placeholder={t('scrapSales.fullName')}
                value={buyerDetails.buyer_name}
                onChange={(e) => handleBuyerDetailChange('buyer_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.email')} <span className="text-gray-500 text-xs">(Optional)</span></label>
              <input
                type="email"
                placeholder={t('scrapSales.emailPlaceholder')}
                value={buyerDetails.buyer_email}
                onChange={(e) => handleBuyerDetailChange('buyer_email', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.contactNumberRequired')}</label>
              <input
                type="tel"
                placeholder={t('scrapSales.contactNumberPlaceholder')}
                value={buyerDetails.buyer_contact}
                onChange={(e) => handleBuyerDetailChange('buyer_contact', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('scrapSales.companyName')}</label>
              <input
                type="text"
                placeholder={t('scrapSales.companyNamePlaceholder')}
                value={buyerDetails.company_name}
                onChange={(e) => handleBuyerDetailChange('company_name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('scrapSales.documents')}</h2>
          <div className="text-sm text-gray-600 mb-3">{t('scrapSales.documentTypesLoadedFromSystem')}</div>
          
          {/* Active Documents */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-900 mb-3">{t('scrapSales.activeDocuments')}</h3>
            <div className="border rounded-lg overflow-hidden bg-white">
              {docsLoading ? (
                <div className="p-4 text-sm text-gray-500 text-center">{t('scrapSales.loadingDocuments')}</div>
              ) : docs.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">{t('scrapSales.noActiveDocumentsFound')}</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.type')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.fileName')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.status')}</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.actions')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {docs.map((doc) => (
                        <tr key={doc.ssdoc_id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">
                              {doc.doc_type_text || doc.doc_type || '-'}
                              {doc.doc_type_name && doc.doc_type === 'OT' && (
                                <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-900">{doc.file_name || 'document'}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {t('scrapSales.active')}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative">
                              <button
                                onClick={(e) => toggleDropdown(doc.ssdoc_id, e)}
                                className={`p-1 focus:outline-none ${activeDropdown === doc.ssdoc_id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Upload New Documents */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-md font-medium text-gray-900">{t('scrapSales.uploadNewDocuments')}</h3>
              <button 
                type="button" 
                className="px-4 py-2 bg-[#0E2F4B] text-white rounded text-sm flex items-center gap-2 hover:bg-[#1a4971] transition-colors"
                onClick={() => setUploadRows(prev => ([...prev, { id: generateUUID(), type:'', docTypeName:'', file:null, previewUrl:'' }]))}
              >
                <Plus size={16} />
                {t('scrapSales.addDocument')}
              </button>
            </div>
            
            <div className="space-y-3">
              {uploadRows.length === 0 && <div className="text-sm text-gray-500">{t('scrapSales.noNewFilesAdded')}</div>}
              {uploadRows.map(r => (
                <div key={r.id} className="grid grid-cols-12 gap-3 items-start bg-white border rounded p-3">
                  <div className="col-span-3">
                    <label className="block text-xs font-medium mb-1">{t('scrapSales.documentType')}</label>
                    <select 
                      className="w-full border rounded h-[38px] px-2 text-sm" 
                      value={r.type} 
                      onChange={e => setUploadRows(prev => prev.map(x => x.id===r.id?{...x,type:e.target.value}:x))}
                    >
                      <option value="">{t('scrapSales.selectType')}</option>
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
                    <label className="block text-xs font-medium mb-1">{t('scrapSales.fileMaxSize')}</label>
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
                            {r.file ? r.file.name : t('scrapSales.chooseFile')}
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
{t('scrapSales.remove')}
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
{t('scrapSales.uploadAllFiles')}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Archived Documents Section */}
          <div className="mt-6 border-t pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">{t('scrapSales.archivedDocuments')}</h3>
              <button
                type="button"
                onClick={() => setShowArchived(!showArchived)}
                className="px-4 py-2 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
              >
                {showArchived ? t('scrapSales.hideArchived') : t('scrapSales.showArchived')} ({archivedDocs.length})
              </button>
            </div>
            {showArchived && (
              <div className="border rounded-lg overflow-hidden bg-gray-50">
                {archivedDocs.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    {t('scrapSales.noArchivedDocumentsFound')}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.type')}</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.fileName')}</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.status')}</th>
                          <th className="px-4 py-3 text-left font-medium text-gray-900">{t('scrapSales.actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {archivedDocs.map((doc) => (
                          <tr key={doc.ssdoc_id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">
                                {doc.doc_type_text || doc.doc_type || '-'}
                                {doc.doc_type_name && doc.doc_type === 'OT' && (
                                  <span className="text-gray-500 ml-1">({doc.doc_type_name})</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-gray-900">{doc.file_name || 'document'}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                {t('scrapSales.archived')}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <button
                                  onClick={(e) => toggleDropdown(doc.ssdoc_id, e)}
                                  className={`p-1 focus:outline-none ${activeDropdown === doc.ssdoc_id ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                  </svg>
                                </button>
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
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            {t('scrapSales.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedAssets.length === 0}
            className="px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#143d65] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0E2F4B] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('scrapSales.updating')}
              </>
            ) : (
              <>
                <Save size={16} />
                {t('scrapSales.updateScrapSale')}
              </>
            )}
          </button>
        </div>

        {/* Dropdown Portal */}
        {activeDropdown && (() => {
          const doc = [...docs, ...archivedDocs].find(d => d.ssdoc_id === activeDropdown);
          if (!doc) return null;
          const isArchived = archivedDocs.some(d => d.ssdoc_id === activeDropdown);
          return createPortal(
            <div
              className="dropdown-portal fixed w-48 bg-white rounded-md shadow-xl z-[9999] border border-gray-200"
              style={{
                top: dropdownPosition.top,
                left: dropdownPosition.left
              }}
            >
              <div className="py-1">
                <button
                  onClick={() => handleDocumentAction(doc, 'view')}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('scrapSales.view')}
                </button>
                <button
                  onClick={() => handleDocumentAction(doc, 'download')}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <svg className="w-4 h-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {t('scrapSales.download')}
                </button>
                {isArchived ? (
                  <button
                    onClick={() => handleDocumentAction(doc, 'unarchive')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {t('scrapSales.unarchive')}
                  </button>
                ) : (
                  <button
                    onClick={() => handleDocumentAction(doc, 'archive')}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <svg className="w-4 h-4 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8l4 4m0 0l4-4m-4 4V3m0 0h4m-4 0H3" />
                    </svg>
                    {t('scrapSales.archive')}
                  </button>
                )}
              </div>
            </div>,
            document.body
          );
        })()}
      </div>
    </div>
  );
};

export default EditScrapSales; 