import { showBackendTextToast } from '../../utils/errorTranslation';
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
import { useLanguage } from '../../contexts/LanguageContext';
import { useRevalidateOnFocus } from '../../hooks/useRevalidateOnFocus';
import { useSerialNumberPrintStore } from '../../store/useSerialNumberPrintStore';

const SerialNumberPrint = () => {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const { t } = useLanguage();
  
  // State management
  const queueByStatus = useSerialNumberPrintStore((s) => s.queueByStatus);
  const printers = useSerialNumberPrintStore((s) => s.printers);
  const queueLoading = useSerialNumberPrintStore((s) => s.queueLoading);
  const fetchPrintQueueStore = useSerialNumberPrintStore((s) => s.fetchPrintQueue);
  const fetchPrintersStore = useSerialNumberPrintStore((s) => s.fetchPrinters);
  const invalidateSerialPrintCache = useSerialNumberPrintStore((s) => s.invalidateSerialPrintCache);

  const [filters, setFilters] = useState({
    status: 'New',
    assetType: '',
  });

  const printQueue = queueByStatus[filters.status] || [];
  const [filteredQueue, setFilteredQueue] = useState([]);
  const isLoading = queueLoading && printQueue.length === 0;
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showPrintPage, setShowPrintPage] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  // Printer options loaded via store
  const [loading, setLoading] = useState(false);

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

  const loadPrintQueue = async (status = filters.status) => {
    try {
      await fetchPrintQueueStore(status, { revalidate: true });
    } catch (error) {
      console.error('Error fetching print queue:', error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_SERIALNUMBERPRINT_FAILEDTOLOADPRINTQUEUE_10B9F0DC', fallbackText: 'Failed to load print queue', type: 'error' });
    }
  };

  const loadPrinters = async () => {
    try {
      await fetchPrintersStore({ revalidate: true });
    } catch (error) {
      console.error('Error loading printers from organization settings:', error);
    }
  };

  useEffect(() => {
    loadPrintQueue(filters.status);
    loadPrinters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (filters.status) {
      loadPrintQueue(filters.status);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status]);

  useRevalidateOnFocus(() => {
    loadPrintQueue(filters.status);
    loadPrinters();
  });

  const statusOptions = [
    { id: 'New', name: t('serialNumberPrint.new'), color: 'bg-blue-100 text-blue-800' },
    { id: 'In-progress', name: t('serialNumberPrint.inProgress'), color: 'bg-yellow-100 text-yellow-800' },
    { id: 'Completed', name: t('serialNumberPrint.completed'), color: 'bg-green-100 text-green-800' },
    { id: 'Cancelled', name: t('serialNumberPrint.cancelled'), color: 'bg-red-100 text-red-800' }
  ];

  // Table columns
  const columns = [
    { name: 'serial_number', label: t('serialNumberPrint.serialNumber'), visible: true },
    { name: 'asset_type_name', label: t('serialNumberPrint.assetType'), visible: true },
    { name: 'asset_name', label: t('serialNumberPrint.assetName'), visible: true },
    { name: 'reason', label: t('serialNumberPrint.reason'), visible: true },
    { name: 'status', label: t('serialNumberPrint.status'), visible: true },
    { name: 'created_at', label: t('serialNumberPrint.createdDate'), visible: true },
    { name: 'created_by', label: t('serialNumberPrint.createdBy'), visible: false },
    { name: 'estimated_cost', label: t('serialNumberPrint.estimatedCost'), visible: false },
    { name: 'actions', label: t('serialNumberPrint.actions'), visible: true }
  ];

  // Get unique asset types for dropdown
  const getAssetTypeOptions = () => {
    const uniqueAssetTypes = [...new Set(printQueue.map(item => item.asset_type_name).filter(Boolean))];
    const options = uniqueAssetTypes.map(type => ({
      id: type,
      text: type
    }));
    return [{ id: '', text: t('serialNumberPrint.allAssetTypes') }, ...options];
  };

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
        showBackendTextToast({ toast, tmdId: 'TMD_ASSET_NOT_FOUND_6AE286A5', fallbackText: 'Asset not found', type: 'error' });
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
          setFilteredQueue((prev) =>
            prev.map((queueItem) =>
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
      showBackendTextToast({ toast, tmdId: 'TMD_PLEASE_SELECT_PRINTER_NAME_AND_TEMPLATE_75509CC4', fallbackText: 'Please select printer name and template', type: 'error' });
      return;
    }
    setShowPreviewModal(true);
  };

  const handlePrint = async () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.template) {
      showBackendTextToast({ toast, tmdId: 'TMD_PLEASE_SELECT_PRINTER_NAME_AND_TEMPLATE_75509CC4', fallbackText: 'Please select printer name and template', type: 'error' });
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
        showBackendTextToast({ toast, tmdId: 'TMD_SELECTED_PRINTER_NOT_FOUND_14C1BEB6', fallbackText: 'Selected printer not found', type: 'error' });
        return;
      }

      // Get selected template
      const selectedTemplate = getAvailableTemplates(selectedItem).find(t => t.id === printSettings.template);
      const template = selectedTemplate || { format: 'text-only', layout: {} };
      
      // Simulate print process
      showBackendTextToast({
        toast,
        tmdId: 'TMD_GENERATING_PDF_AND_SENDING_TO_PRINTER_1A6CC35F',
        fallbackText: 'Generating PDF and sending to printer...',
        type: 'loading',
        toastOptions: { duration: 3000 },
      });
      
      // Try to update status to Completed (continue even if this fails)
      const statusUpdated = await updateItemStatus(selectedItem.psnq_id, 'Completed');
      if (!statusUpdated) {
        console.warn('Status update failed, but continuing with print process');
      }
      
      // Generate PDF with asset-specific template
      await generatePDF(selectedItem, template, selectedPrinter);
      
      // Simulate print delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showBackendTextToast({
        toast,
        tmdId: 'TMD_PRINT_JOB_SENT_SUCCESSFULLY_2FF611CD',
        fallbackText: 'Print job sent to {{printerName}} successfully!',
        type: 'success',
        values: { printerName: selectedPrinter.name },
      });
      handleBackToList();
      invalidateSerialPrintCache();
      loadPrintQueue(filters.status);
    } catch (error) {
      console.error('Error printing:', error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_SEND_PRINT_JOB_7524BF8C', fallbackText: 'Failed to send print job', type: 'error' });
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

      invalidateSerialPrintCache();
      loadPrintQueue(filters.status);
      
      showBackendTextToast({
        toast,
        tmdId: 'TMD_STATUS_UPDATED_TO_VALUE_777D8607',
        fallbackText: 'Status updated to {{status}}',
        type: 'success',
        values: { status },
      });
      return true; // Success
    } catch (error) {
      console.error('Error updating status:', error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_UPDATE_STATUS_3AD66FA7', fallbackText: 'Failed to update status', type: 'error' });
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
      const translatedStatus = statusOptions.find((status) => status.id === row.status)?.name || row.status;
      return (
        <div className="flex items-center gap-2">
          {getStatusIcon(row.status)}
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(row.status)}`}>
            {translatedStatus}
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
            title={t('serialNumberPrint.updateStatus')}
          >
            <Settings className="w-3 h-3" />
            {t('serialNumberPrint.status')}
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

  const selectedItemStatusName = selectedItem
    ? statusOptions.find((status) => status.id === selectedItem.status)?.name || selectedItem.status
    : '';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t('serialNumberPrint.title')}</h1>
            <p className="text-gray-600 mt-1">{t('serialNumberPrint.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              {t('serialNumberPrint.filters')}
            </button>
            <button
              onClick={() => loadPrintQueue(filters.status)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              {t('serialNumberPrint.refresh')}
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
                {t('serialNumberPrint.status')}
              </label>
              <SearchableDropdown
                options={statusOptions.map(status => ({
                  id: status.id,
                  text: status.name
                }))}
                value={filters.status}
                onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                placeholder={t('serialNumberPrint.selectStatus')}
                className="w-full"
              />
            </div>

            {/* Asset Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('serialNumberPrint.assetType')}
              </label>
              <SearchableDropdown
                options={getAssetTypeOptions()}
                value={filters.assetType}
                onChange={(value) => setFilters(prev => ({ ...prev, assetType: value }))}
                placeholder={t('serialNumberPrint.selectAssetType')}
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
              <span className="text-gray-600">{t('serialNumberPrint.totalItems')}:</span>
              <span className="font-semibold ml-1">{printQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">{t('serialNumberPrint.filtered')}:</span>
              <span className="font-semibold ml-1">{filteredQueue.length}</span>
            </div>
            <div className="text-sm">
              <span className="text-gray-600">{t('serialNumberPrint.selected')}:</span>
              <span className="font-semibold ml-1">{selectedItems.length}</span>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('serialNumberPrint.loading')}</span>
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
            <h3 className="text-lg font-semibold mb-4">{t('serialNumberPrint.updatePrintRequestStatus')}</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">{t('serialNumberPrint.serialNumber')}: {selectedItem.serial_number}</p>
              <p className="text-sm text-gray-600 mb-2">{t('serialNumberPrint.assetName')}: {selectedItem.asset_name}</p>
              <p className="text-sm text-gray-600">{t('serialNumberPrint.status')}: 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}>
                  {selectedItemStatusName}
                </span>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('serialNumberPrint.selectNewStatus')}
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
                          {status.id === 'New' && t('serialNumberPrint.newPrintRequest')}
                          {status.id === 'In-progress' && t('serialNumberPrint.currentlyBeingPrinted')}
                          {status.id === 'Completed' && t('serialNumberPrint.printJobCompletedSuccessfully')}
                          {status.id === 'Cancelled' && t('serialNumberPrint.printJobCancelled')}
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
                {t('serialNumberPrint.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Empty State */}
      {!isLoading && filteredQueue.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {t('serialNumberPrint.noPrintQueueItemsFound')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t('serialNumberPrint.tryAdjustingFilters')}
          </p>
        </div>
      )}

    </div>
  );
};

export default SerialNumberPrint;
