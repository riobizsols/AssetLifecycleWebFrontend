import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Filter, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  MapPin,
  Settings,
  FileText,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import API from '../../lib/axios';
import ContentBox from '../../components/ContentBox';
import CustomTable from '../../components/CustomTable';
import PrintLabelScreen from '../../components/PrintLabelScreen';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { labelTemplates, assetTypeTemplateMapping } from '../../templates/labelTemplates';

const SerialNumberPrint = () => {
  const navigate = useNavigate();
  const { assetId } = useParams();
  
  // State management
  const [printQueue, setPrintQueue] = useState([]);
  const [filteredQueue, setFilteredQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'New', // Default to New status
    assetType: ''
  });

  // Printer and status options
  const [printers, setPrinters] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock printers data for local development
  // const mockPrinters = [
  //   {
  //     id: '1', // Ensure all IDs are strings for consistency
  //     printer_id: 'PRT001',
  //     name: 'Main Office Laser Printer',
  //     location: 'Main Office - Floor 1',
  //     ip_address: '192.168.1.100',
  //     status: 'Online',
  //     type: 'Laser',
  //     paper_size: 'A4',
  //     paper_type: 'Paper',
  //     paper_quality: 'High',
  //     description: 'High-quality laser printer for standard labels'
  //   },
  //   {
  //     id: '2',
  //     printer_id: 'PRT002',
  //     name: 'Warehouse Label Printer',
  //     location: 'Warehouse A - Storage',
  //     ip_address: '192.168.1.101',
  //     status: 'Online',
  //     type: 'Label',
  //     paper_size: '4x6',
  //     paper_type: 'Vinyl',
  //     paper_quality: 'High',
  //     description: 'Industrial label printer for vinyl labels'
  //   },
  //   {
  //     id: '3',
  //     printer_id: 'PRT003',
  //     name: 'Small Label Printer',
  //     location: 'Production Floor - Line 1',
  //     ip_address: '192.168.1.102',
  //     status: 'Online',
  //     type: 'Label',
  //     paper_size: '2x1',
  //     paper_type: 'Paper',
  //     paper_quality: 'High',
  //     description: 'Specialized printer for small labels'
  //   },
  //   {
  //     id: '4',
  //     printer_id: 'PRT004',
  //     name: 'Admin Office Printer',
  //     location: 'Admin Office - HR',
  //     ip_address: '192.168.1.103',
  //     status: 'Online',
  //     type: 'Multifunction',
  //     paper_size: 'A4',
  //     paper_type: 'Paper',
  //     paper_quality: 'Normal',
  //     description: 'Multifunction printer for various document types'
  //   },
  //   {
  //     id: '5',
  //     printer_id: 'PRT005',
  //     name: 'IT Department Printer',
  //     location: 'Admin Office - IT',
  //     ip_address: '192.168.1.104',
  //     status: 'Online',
  //     type: 'Laser',
  //     paper_size: 'A4',
  //     paper_type: 'Paper',
  //     paper_quality: 'High',
  //     description: 'IT department laser printer'
  //   }
  // ];


  // Print settings state
  const [printSettings, setPrintSettings] = useState({
    printerId: '',
    template: ''
  });

  // Data fetching functions
  const fetchPrintQueue = async (status = filters.status) => {
    try {
      setIsLoading(true);
      console.log('Fetching print queue with status:', status);
      
      // Use the new API endpoint with status parameter
      const response = await API.get(`/asset-serial-print/status/${status}`);
      
      if (response.data && response.data.success) {
        console.log('Print queue response:', response.data);
        
        // Transform the data to match the expected format
        const transformedData = response.data.data.map(item => ({
          psnq_id: item.psnq_id,
          serial_number: item.serial_no,
          status: item.status,
          reason: item.reason,
          created_by: item.created_by,
          created_at: item.created_on,
          org_id: item.org_id,
          // Asset details
          asset_id: item.asset_details?.asset_id,
          asset_name: item.asset_details?.asset_name,
          asset_serial_number: item.asset_details?.asset_serial_number,
          purchased_on: item.asset_details?.purchased_on,
          expiry_date: item.asset_details?.expiry_date,
          current_status: item.asset_details?.current_status,
          // Asset type details
          asset_type_id: item.asset_type_details?.asset_type_id,
          asset_type_name: item.asset_type_details?.asset_type_name,
          assignment_type: item.asset_type_details?.assignment_type,
          maint_required: item.asset_type_details?.maint_required,
          inspection_required: item.asset_type_details?.inspection_required,
          group_required: item.asset_type_details?.group_required,
          // Additional fields for compatibility
          asset_description: item.asset_details?.asset_name || '',
          estimated_cost: 0 // Default cost
        }));
        
        console.log('Transformed data:', transformedData);
        setPrintQueue(transformedData);
        setFilteredQueue(transformedData);
      } else {
        console.error('Failed to fetch print queue:', response.data);
        setPrintQueue([]);
        setFilteredQueue([]);
      }
    } catch (error) {
      console.error('Error fetching print queue:', error);
      toast.error('Failed to load print queue');
      setPrintQueue([]);
      setFilteredQueue([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPrinters = async () => {
    try {
      console.log('Fetching printers from assets using organization settings...');
      const res = await API.get('/assets/printers');
      console.log('API response:', res.data);
      const assets = res.data?.data || [];
      console.log('Assets from API:', assets);
      
      // Map assets to printer-like objects expected by UI
      const mapped = assets.map((asset, idx) => ({
        id: String(asset.asset_id || `printer_${idx + 1}`), // Ensure ID is always a string
        printer_id: asset.asset_id,
        name: asset.text || asset.description || `Printer ${idx + 1}`,
        location: asset.branch_id || 'Unknown',
        ip_address: 'N/A', // Not available in asset data
        status: asset.current_status || 'Online',
        type: 'Label', // Default type for printers
        paper_size: 'A4',
        paper_type: 'Paper',
        paper_quality: 'High',
        description: asset.description || '',
        serial_number: asset.serial_number,
        purchased_cost: asset.purchased_cost,
        warranty_period: asset.warranty_period
      }));
      
      setPrinters(mapped);
      console.log('Printers loaded from assets:', mapped.length, mapped);
    } catch (error) {
      console.error('Error loading printers from organization settings:', error);
      console.log('Setting empty printers array since mock is commented out');
      setPrinters([]); // Set empty array instead of mockPrinters
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPrintQueue();
    fetchPrinters();
  }, []);

  // Debug printers when they change
  useEffect(() => {
    console.log('Printers state changed:', printers);
  }, [printers]);

  // Debug printSettings when they change
  useEffect(() => {
    console.log('Print settings changed:', printSettings);
  }, [printSettings]);

  // Fetch data when status filter changes
  useEffect(() => {
    if (filters.status) {
      fetchPrintQueue(filters.status);
    }
  }, [filters.status]);

  const statusOptions = [
    { id: 'New', name: 'New', color: 'bg-blue-100 text-blue-800' },
    { id: 'In-progress', name: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'Completed', name: 'Completed', color: 'bg-green-100 text-green-800' },
    { id: 'Cancelled', name: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  // Table columns
  const columns = [
    { name: 'serial_number', label: 'Serial Number', visible: true },
    { name: 'asset_type_name', label: 'Asset Type', visible: true },
    { name: 'asset_name', label: 'Asset Name', visible: true },
    { name: 'asset_description', label: 'Description', visible: true },
    { name: 'reason', label: 'Reason', visible: true },
    { name: 'status', label: 'Status', visible: true },
    { name: 'created_at', label: 'Created Date', visible: true },
    { name: 'created_by', label: 'Created By', visible: false },
    { name: 'estimated_cost', label: 'Est. Cost', visible: false },
    { name: 'actions', label: 'Actions', visible: true }
  ];

  // Get unique asset types for dropdown
  const getAssetTypeOptions = () => {
    const uniqueAssetTypes = [...new Set(printQueue.map(item => item.asset_type_name).filter(Boolean))];
    const options = uniqueAssetTypes.map(type => ({
      id: type,
      text: type
    }));
    return [{ id: '', text: 'All Asset Types' }, ...options];
  };

  // Fetch print queue data
  useEffect(() => {
    fetchPrintQueue();
  }, []);

  // Apply filters when they change
  useEffect(() => {
    applyFilters();
  }, [filters, printQueue]);

  // Auto-select asset when assetId is provided in URL
  useEffect(() => {
    if (assetId && printQueue.length > 0) {
      const asset = printQueue.find(item => item.asset_id === assetId);
      if (asset) {
        console.log('Auto-selecting asset from URL:', asset);
        handleSelectItem(asset);
      } else {
        console.log('Asset not found with ID:', assetId);
        toast.error('Asset not found');
      }
    }
  }, [assetId, printQueue]);

 

  const applyFilters = () => {
    let filtered = [...printQueue];
    console.log('Applying filters. Original data:', printQueue.length, 'items');
    console.log('Current filters:', filters);

    // Note: Status filtering is now handled by the API call
    // We only apply client-side filters for other fields

    // Filter by asset type
    if (filters.assetType) {
      filtered = filtered.filter(item => 
        item.asset_type_name && item.asset_type_name.toLowerCase().includes(filters.assetType.toLowerCase())
      );
      console.log('After asset type filter:', filtered.length, 'items');
    }


    console.log('Final filtered data:', filtered.length, 'items');
    setFilteredQueue(filtered);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      if (key === 'columnFilters') {
        return { ...prev, columnFilters: value };
      } else if (key === 'fromDate' || key === 'toDate') {
        return { ...prev, [key]: value };
      } else {
        return { ...prev, [key]: value };
      }
    });
  };

  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    
    // Fetch asset properties
    try {
      // Pass context so logs go to SERIALNUMBERPRINT CSV
      const response = await API.get(`/assets/${item.asset_id}`, {
        params: { context: 'SERIALNUMBERPRINT' }
      });
      if (response.data && response.data.properties) {
        setSelectedItem(prev => ({
          ...prev,
          properties: response.data.properties
        }));
      }
    } catch (error) {
      console.error('Error fetching asset properties:', error);
      // Continue without properties if fetch fails
    }
    
    // Auto-select recommended template only (no printer selection)
    const recommendedTemplateIds = assetTypeTemplateMapping[item.asset_type_name] || ['standard-small'];
    const primaryTemplate = recommendedTemplateIds.length > 0 ? recommendedTemplateIds[0] : 'standard-small';
    
    // Set print settings with template only
    setPrintSettings({
      printerId: '',
      template: primaryTemplate
    });
    setShowPrintPage(true);
  };

  const handleStatusUpdate = async (item, status = null) => {
    if (status) {
      // Direct status update from PrintLabelScreen
      try {
        const success = await updateItemStatus(item.psnq_id, status);
        if (success) {
          // Update local state
          setPrintQueue(prev => 
            prev.map(queueItem => 
              queueItem.psnq_id === item.psnq_id ? { ...queueItem, status } : queueItem
            )
          );
          setFilteredQueue(prev => 
            prev.map(queueItem => 
              queueItem.psnq_id === item.psnq_id ? { ...queueItem, status } : queueItem
            )
          );
          // Update selectedItem if it's the same item
          if (selectedItem && selectedItem.psnq_id === item.psnq_id) {
            setSelectedItem(prev => ({ ...prev, status }));
          }
        }
      } catch (error) {
        console.error('Error updating status:', error);
      }
    } else {
      // Open modal for status selection
      setSelectedItem(item);
      setShowStatusModal(true);
    }
  };

  const handleBackToList = () => {
    setShowPrintPage(false);
    setSelectedItem(null);
    setPrintSettings({ printerId: '', template: '' });
  };

  const handlePreview = () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.template) {
      toast.error('Please select printer name and template');
      return;
    }
    setShowPreviewModal(true);
  };

  const handlePrint = async () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.template) {
      toast.error('Please select printer name and template');
      return;
    }

    try {
      // Get selected printer - ensure consistent string comparison
      const selectedPrinter = printers.find(p => String(p.id) === String(printSettings.printerId));
      if (!selectedPrinter) {
        console.error('Printer lookup failed:', {
          printSettingsPrinterId: printSettings.printerId,
          printSettingsPrinterIdType: typeof printSettings.printerId,
          availablePrinters: printers.map(p => ({ id: p.id, idType: typeof p.id, name: p.name }))
        });
        toast.error('Selected printer not found');
        return;
      }

      // Get selected template
      const selectedTemplate = getAvailableTemplates(selectedItem).find(t => t.id === printSettings.template);
      const template = selectedTemplate || { format: 'text-only', layout: {} };
      
      // Simulate print process
      toast.loading('Generating PDF and sending to printer...', { duration: 3000 });
      
      // Try to update status to Completed (continue even if this fails)
      const statusUpdated = await updateItemStatus(selectedItem.psnq_id, 'Completed');
      if (!statusUpdated) {
        console.warn('Status update failed, but continuing with print process');
      }
      
      // Generate PDF with asset-specific template
      await generatePDF(selectedItem, template, selectedPrinter);
      
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast.success(`Print job sent to ${selectedPrinter.name} successfully!`);
      handleBackToList();
      fetchPrintQueue();
    } catch (error) {
      console.error('Error printing:', error);
      toast.error('Failed to send print job');
    }
  };

  const generatePDF = async (asset, template, printer) => {
    // Determine label format based on printer type and asset template
    const getLabelFormat = (printerType, paperType) => {
      if (printerType === 'Label' && paperType === 'Vinyl') return 'Barcode';
      if (printerType === 'Industrial' && paperType === 'Metal') return 'QR Code';
      if ((printerType === 'Laser' || printerType === 'Inkjet') && paperType === 'Paper') return 'Text Only';
      return 'Barcode';
    };

    const labelFormat = getLabelFormat(printSettings.printerType, template.paperType);
    
    console.log('Generating PDF with template:', template.name || template.id || 'default');
    console.log('Label format:', labelFormat);
    console.log('Asset details:', {
      serialNumber: asset.serial_number,
      assetType: asset.asset_type_name,
      assetName: asset.asset_name
    });
    console.log('Print settings:', {
      printer: printer.name,
      location: printer.location,
      ipAddress: printer.ipAddress,
      printerType: printSettings.printerType,
      template: printSettings.template,
      labelSize: template.labelSize,
      paperType: template.paperType,
      paperQuality: template.paperQuality
    });

    // In a real implementation, this would:
    // 1. Generate real barcode using JsBarcode library (Code128 format)
    // 2. Generate real QR code using QRCode library
    // 3. Create PDF with the appropriate label format:
    //    - Barcode: Linear barcode + serial number below
    //    - QR Code: QR code + serial number below  
    //    - Text Only: Serial number + asset details
    // 4. Apply correct label size, paper type, and quality
    // 5. Send the PDF to the selected printer
    
    // For now, simulate the process
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const getRecommendedPrinter = (asset) => {
    console.log('getRecommendedPrinter called with asset:', asset);
    console.log('Available printers:', printers);
    
    // If no printers available, return null
    if (!printers || printers.length === 0) {
      console.log('No printers available');
      return null;
    }

    // Skip location matching since location column was removed
    let locationMatch = [];

    // Get recommended templates for this asset type
    const recommendedTemplateIds = assetTypeTemplateMapping[asset.asset_type_name] || ['standard-small'];
    const primaryTemplate = recommendedTemplateIds.length > 0 ? labelTemplates[recommendedTemplateIds[0]] : labelTemplates['standard-small'];
    
    // Get printers that match the primary template requirements
    let typeMatch = [];
    if (primaryTemplate && primaryTemplate.printerTypes) {
      typeMatch = printers.filter(printer => 
        primaryTemplate.printerTypes.includes(printer.type)
      );
    }

    // Return the best match
    if (locationMatch.length > 0) {
      return locationMatch[0];
    }
    if (typeMatch.length > 0) {
      return typeMatch[0];
    }
    return printers.find(p => p.status === 'Online') || printers[0] || null;
  };


  // Get available templates based on asset type
  const getAvailableTemplates = (asset) => {
    const assetType = asset.asset_type_name;
    const templates = [];
    
    // Get recommended templates for this asset type
    const recommendedTemplateIds = assetTypeTemplateMapping[assetType] || [];
    
    // Add recommended templates first
    recommendedTemplateIds.forEach(templateId => {
      if (labelTemplates[templateId]) {
        const template = labelTemplates[templateId];
        templates.push({
          id: template.id,
          text: `${template.name} (${template.dimensions.width}"×${template.dimensions.height}")`,
          name: template.name,
          dimensions: template.dimensions,
          paperType: template.paperType,
          paperQuality: template.paperQuality,
          printerTypes: template.printerTypes,
          format: template.format,
          description: template.description,
          layout: template.layout,
          isRecommended: true
        });
      }
    });
    
    // Add all other templates as additional options
    Object.values(labelTemplates).forEach(template => {
      if (!templates.find(t => t.id === template.id)) {
        templates.push({
          id: template.id,
          text: `${template.name} (${template.dimensions.width}"×${template.dimensions.height}")`,
          name: template.name,
          dimensions: template.dimensions,
          paperType: template.paperType,
          paperQuality: template.paperQuality,
          printerTypes: template.printerTypes,
          format: template.format,
          description: template.description,
          layout: template.layout,
          isRecommended: false
        });
      }
    });
    
    // Debug logging
    console.log('Available templates for', assetType, ':', templates);
    
    return templates;
  };

  // Get all available printers (no filtering)
  const getFilteredPrinters = () => {
    console.log('getFilteredPrinters called - returning all printers:', {
      totalPrinters: printers.length,
      printers: printers.map(p => ({ id: p.id, name: p.name, type: p.type }))
    });
    
    return printers;
  };

  // Generate preview content for the label
  const generatePreviewContent = () => {
    if (!selectedItem || !printSettings.printerId) return null;
    
    const selectedPrinter = printers.find(p => String(p.id) === String(printSettings.printerId));
    const selectedTemplate = getAvailableTemplates(selectedItem).find(t => t.id === printSettings.template);
    const template = selectedTemplate || { format: 'text-only', layout: {} };
    
    return {
      asset: selectedItem,
      printer: selectedPrinter,
      template: template,
      settings: printSettings
    };
  };

  const updateItemStatus = async (psnqId, status) => {
    try {
      await API.put(`/serial-numbers/print-queue/${psnqId}/status`, {
        status,
        orgId: 'ORG001'
      });
      
      // Update local state
      setPrintQueue(prev => 
        prev.map(item => 
          item.psnq_id === psnqId ? { ...item, status } : item
        )
      );
      
      toast.success(`Status updated to ${status}`);
      return true; // Success
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return false; // Failure
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'New': return <Clock className="w-4 h-4 text-blue-600" />;
      case 'In-progress': return <RefreshCw className="w-4 h-4 text-yellow-600" />;
      case 'Completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'Cancelled': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status) => {
    const statusOption = statusOptions.find(s => s.id === status);
    return statusOption ? statusOption.color : 'bg-gray-100 text-gray-800';
  };

  // Custom render functions
  const renderSerialNumber = (col, row) => {
    if (col.name === 'serial_number') {
      return (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          <span className="font-mono text-sm font-medium">{row.serial_number}</span>
        </div>
      );
    }
    return row[col.name];
  };

  const renderStatus = (col, row) => {
    if (col.name === 'status') {
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
            {row.status}
          </span>
        </div>
      );
    }
    return row[col.name];
  };


  const renderActions = (col, row) => {
    if (col.name === 'actions') {
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusUpdate(row)}
            className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 transition-colors"
            title="Update Status"
          >
            <Settings className="w-3 h-3" />
            Status
          </button>
        </div>
      );
    }
    return row[col.name];
  };

  const renderCreatedDate = (col, row) => {
    if (col.name === 'created_at') {
      return new Date(row.created_at).toLocaleDateString();
    }
    return row[col.name];
  };



  const renderEstimatedCost = (col, row) => {
    if (col.name === 'estimated_cost') {
      return `$${row.estimated_cost?.toLocaleString() || 'N/A'}`;
    }
    return row[col.name];
  };

  const renderCreatedBy = (col, row) => {
    if (col.name === 'created_by') {
      return (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {row.created_by?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm">{row.created_by}</span>
        </div>
      );
    }
    return row[col.name];
  };

  // Show print page if an item is selected
  if (showPrintPage && selectedItem) {
    return (
      <PrintLabelScreen
        selectedItem={selectedItem}
        onBackToList={handleBackToList}
        onStatusUpdate={handleStatusUpdate}
        onPreview={handlePreview}
        onPrint={handlePrint}
        printers={printers}
        labelTemplates={labelTemplates}
        assetTypeTemplateMapping={assetTypeTemplateMapping}
        printSettings={printSettings}
        setPrintSettings={setPrintSettings}
        getRecommendedPrinter={getRecommendedPrinter}
        getAvailableTemplates={getAvailableTemplates}
        getFilteredPrinters={getFilteredPrinters}
        getStatusBadgeColor={getStatusBadgeColor}
        showPreviewModal={showPreviewModal}
        setShowPreviewModal={setShowPreviewModal}
      />
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Serial Number Print</h1>
            <p className="text-gray-600 mt-1">Manage and print serial number labels for assets</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => fetchPrintQueue(filters.status)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <SearchableDropdown
                options={statusOptions.map(status => ({
                  id: status.id,
                  text: status.name
                }))}
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder="Select status..."
                className="w-full"
              />
            </div>

            {/* Asset Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asset Type
              </label>
              <SearchableDropdown
                options={getAssetTypeOptions()}
                value={filters.assetType}
                onChange={(value) => setFilters(prev => ({ ...prev, assetType: value }))}
                placeholder="Select asset type..."
                className="w-full"
              />
            </div>

          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="text-gray-600">Total Items:</span>
              <span className="font-semibold ml-1">{printQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Filtered:</span>
              <span className="font-semibold ml-1">{filteredQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">Selected:</span>
              <span className="font-semibold ml-1">{selectedItems.length}</span>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* ContentBox with CustomTable */}
      <ContentBox
        filters={columns}
        data={filteredQueue}
        selectedRows={selectedItems}
        setSelectedRows={setSelectedItems}
        showAddButton={false}
        showActions={false}
        showFilterButton={false}
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={filteredQueue}
            selectedRows={selectedItems}
            setSelectedRows={setSelectedItems}
            showActions={false}
            onRowClick={handleSelectItem}
            rowClassName="hover:bg-blue-50 cursor-pointer transition-colors"
            renderCell={(col, row) => {
              if (col.name === 'serial_number') return renderSerialNumber(col, row);
              if (col.name === 'status') return renderStatus(col, row);
              if (col.name === 'actions') return renderActions(col, row);
              if (col.name === 'created_at') return renderCreatedDate(col, row);
              if (col.name === 'estimated_cost') return renderEstimatedCost(col, row);
              if (col.name === 'created_by') return renderCreatedBy(col, row);
              return row[col.name];
            }}
          />
        )}
      </ContentBox>


      {/* Status Update Modal */}
      {showStatusModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Print Request Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Serial Number: {selectedItem.serial_number}</p>
              <p className="text-sm text-gray-600 mb-2">Asset: {selectedItem.asset_name}</p>
              <p className="text-sm text-gray-600">Current Status: 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}>
                  {selectedItem.status}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select New Status
              </label>
              <div className="space-y-2">
                {statusOptions.map(status => (
                  <button
                    key={status.id}
                    onClick={() => {
                      updateItemStatus(selectedItem.psnq_id, status.id);
                      setShowStatusModal(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-colors ${
                      selectedItem.status === status.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    disabled={selectedItem.status === status.id}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(status.id)}
                      <div>
                        <div className="font-medium">{status.name}</div>
                        <div className="text-xs text-gray-500">
                          {status.id === 'New' && 'New print request'}
                          {status.id === 'In-progress' && 'Currently being printed'}
                          {status.id === 'Completed' && 'Print job completed successfully'}
                          {status.id === 'Cancelled' && 'Print job cancelled'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Empty State */}
      {!isLoading && filteredQueue.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No print queue items found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Try adjusting your filters or check if there are items in the queue.
          </p>
        </div>
      )}

    </div>
  );
};

export default SerialNumberPrint;
