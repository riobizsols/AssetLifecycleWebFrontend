import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  ArrowLeft, 
  Eye,
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Settings,
  Clock,
  RefreshCw
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PrintPreviewModal from './PrintPreviewModal';
import SearchableDropdown from './ui/SearchableDropdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import API from '../lib/axios';
import { getOrgData } from '../templates/labelTemplates';
import { useAuthStore } from '../store/useAuthStore';

const BulkPrintLabelScreen = ({ 
  selectedAssets, 
  onBack, 
  printers = [],
  labelTemplates = {},
  assetTypeTemplateMapping = {},
  printSettings,
  setPrintSettings,
  showPreviewModal,
  setShowPreviewModal
}) => {
  const { user } = useAuthStore();
  const [orgData, setOrgData] = useState({
    name: 'Organization',
    logo: null,
    address: 'City, State',
    phone: '+1 (555) 123-4567',
    website: 'www.organization.com'
  });
  const [selectedPrinterProperties, setSelectedPrinterProperties] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printProgress, setPrintProgress] = useState({ current: 0, total: 0 });
  const [showStatusModal, setShowStatusModal] = useState(false);
  
  // Status options
  const statusOptions = [
    { id: 'New', name: 'New', color: 'bg-blue-100 text-blue-800' },
    { id: 'In-progress', name: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'Completed', name: 'Completed', color: 'bg-green-100 text-green-800' },
    { id: 'Cancelled', name: 'Cancelled', color: 'bg-red-100 text-red-800' }
  ];

  // Fetch organization data
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const orgId = user?.org_id || 'ORG001';
        const orgData = await getOrgData(orgId);
        setOrgData(orgData);
      } catch (error) {
        console.error('Error fetching organization data:', error);
      }
    };

    if (user?.org_id) {
      fetchOrgData();
    }
  }, [user?.org_id]);

  // Fetch printer properties when printer is selected
  const fetchPrinterProperties = async (printerId) => {
    try {
      const response = await API.get(`/assets/${printerId}`);
      if (response.data && response.data.properties) {
        setSelectedPrinterProperties(response.data.properties);
      } else {
        setSelectedPrinterProperties(null);
      }
    } catch (error) {
      console.error('Error fetching printer properties:', error);
      setSelectedPrinterProperties(null);
    }
  };

  const handlePrinterChange = (printerId) => {
    setPrintSettings(prev => ({ ...prev, printerId }));
    if (printerId) {
      fetchPrinterProperties(printerId);
    } else {
      setSelectedPrinterProperties(null);
    }
  };

  // Get available templates based on first asset's type
  const getAvailableTemplates = () => {
    if (selectedAssets.length === 0) return [];
    
    const assetType = selectedAssets[0].asset_type_name;
    const templates = [];
    
    const recommendedTemplateIds = assetTypeTemplateMapping[assetType] || [];
    
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
    
    return templates;
  };

  const handlePreview = () => {
    if (!printSettings.printerId || !printSettings.template) {
      toast.error('Please select printer name and template');
      return;
    }
    if (selectedAssets.length === 0) {
      toast.error('No assets selected');
      return;
    }
    setShowPreviewModal(true);
  };

  const generatePDFForAsset = async (asset, template) => {
    return new Promise(async (resolve, reject) => {
      try {
        // Create a temporary div for the label
        const labelDiv = document.createElement('div');
        labelDiv.style.position = 'absolute';
        labelDiv.style.left = '-9999px';
        labelDiv.style.top = '-9999px';
        labelDiv.style.width = `${template.dimensions.width}in`;
        labelDiv.style.height = `${template.dimensions.height}in`;
        labelDiv.style.border = '1px solid #000';
        labelDiv.style.backgroundColor = 'white';
        labelDiv.style.padding = '4px';
        labelDiv.style.fontFamily = 'Arial, sans-serif';
        labelDiv.style.zIndex = '9999';
        labelDiv.style.boxSizing = 'border-box';
        labelDiv.style.overflow = 'hidden';
        
        document.body.appendChild(labelDiv);

        // Create the label container
        const labelContainer = document.createElement('div');
        labelContainer.style.width = '100%';
        labelContainer.style.height = '100%';
        labelContainer.style.position = 'relative';
        labelContainer.style.display = 'flex';
        labelContainer.style.flexDirection = 'column';
        labelContainer.style.justifyContent = 'space-between';
        labelDiv.appendChild(labelContainer);

        // Organization Logo and Name (Top Section)
        const topSection = document.createElement('div');
        topSection.style.display = 'flex';
        topSection.style.alignItems = 'center';
        topSection.style.justifyContent = 'space-between';
        topSection.style.height = '20%';
        topSection.style.marginBottom = '2px';
        
        const logoCircle = document.createElement('div');
        logoCircle.style.width = '16px';
        logoCircle.style.height = '16px';
        logoCircle.style.borderRadius = '50%';
        logoCircle.style.backgroundColor = '#003366';
        logoCircle.style.color = 'white';
        logoCircle.style.display = 'flex';
        logoCircle.style.alignItems = 'center';
        logoCircle.style.justifyContent = 'center';
        logoCircle.style.fontSize = '8px';
        logoCircle.style.fontWeight = 'bold';
        logoCircle.style.flexShrink = '0';
        logoCircle.style.lineHeight = '1';
        logoCircle.style.textAlign = 'center';
        logoCircle.style.padding = '0';
        logoCircle.style.margin = '0';
        logoCircle.style.boxSizing = 'border-box';
        logoCircle.style.position = 'relative';
        logoCircle.style.fontFamily = 'Arial, sans-serif';
        logoCircle.style.overflow = 'hidden';
        
        const logoText = document.createElement('span');
        logoText.style.display = 'block';
        logoText.style.lineHeight = '1';
        logoText.style.textAlign = 'center';
        logoText.style.verticalAlign = 'middle';
        logoText.style.fontSize = '8px';
        logoText.style.fontWeight = 'bold';
        logoText.style.fontFamily = 'Arial, sans-serif';
        logoText.style.transform = 'translateY(-3px)';
        logoText.textContent = orgData.name.charAt(0).toUpperCase();
        logoCircle.appendChild(logoText);
        
        const orgName = document.createElement('div');
        orgName.style.fontSize = '6px';
        orgName.style.fontWeight = 'bold';
        orgName.style.color = '#003366';
        orgName.style.textAlign = 'right';
        orgName.style.flex = '1';
        orgName.style.marginLeft = '4px';
        orgName.textContent = orgData.name;
        
        topSection.appendChild(logoCircle);
        topSection.appendChild(orgName);
        labelContainer.appendChild(topSection);

        // Serial Number (Center Section)
        const centerSection = document.createElement('div');
        centerSection.style.flex = '1';
        centerSection.style.display = 'flex';
        centerSection.style.flexDirection = 'column';
        centerSection.style.alignItems = 'center';
        centerSection.style.justifyContent = 'center';
        centerSection.style.textAlign = 'center';
        
        const serialLabel = document.createElement('div');
        serialLabel.style.fontSize = '5px';
        serialLabel.style.color = '#666';
        serialLabel.style.marginBottom = '2px';
        serialLabel.style.fontWeight = 'bold';
        serialLabel.textContent = 'SERIAL NUMBER';

        const serialNumber = document.createElement('div');
        serialNumber.style.fontSize = '10px';
        serialNumber.style.fontWeight = 'bold';
        serialNumber.style.fontFamily = 'monospace';
        serialNumber.style.color = '#000';
        serialNumber.style.letterSpacing = '0.5px';
        serialNumber.textContent = asset.serial_number;
        
        centerSection.appendChild(serialLabel);
        centerSection.appendChild(serialNumber);
        labelContainer.appendChild(centerSection);

        // Barcode (Bottom Section)
        const bottomSection = document.createElement('div');
        bottomSection.style.height = '30%';
        bottomSection.style.display = 'flex';
        bottomSection.style.flexDirection = 'column';
        bottomSection.style.alignItems = 'center';
        bottomSection.style.justifyContent = 'center';
        
        const barcodeCanvas = document.createElement('canvas');
        barcodeCanvas.id = 'barcode-canvas';
        barcodeCanvas.style.maxWidth = '100%';
        barcodeCanvas.style.height = 'auto';
        barcodeCanvas.style.display = 'block';
        bottomSection.appendChild(barcodeCanvas);
        
        // Generate barcode
        try {
          JsBarcode(barcodeCanvas, asset.serial_number, {
            format: "CODE128",
            width: 1,
            height: 20,
            displayValue: false,
            margin: 0,
            background: '#ffffff',
            lineColor: '#000000'
          });
        } catch (error) {
          console.error('Barcode generation error:', error);
          const ctx = barcodeCanvas.getContext('2d');
          barcodeCanvas.width = 100;
          barcodeCanvas.height = 20;
          ctx.fillStyle = '#000';
          ctx.font = '8px monospace';
          ctx.fillText('BARCODE', 10, 15);
        }

        labelContainer.appendChild(bottomSection);

        // Wait for barcode to render
        await new Promise(resolve => setTimeout(resolve, 500));

        // Convert to canvas
        const canvas = await html2canvas(labelDiv, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: labelDiv.offsetWidth,
          height: labelDiv.offsetHeight
        });

        // Create PDF
        const pdf = new jsPDF({
          orientation: template.dimensions.width > template.dimensions.height ? 'landscape' : 'portrait',
          unit: 'in',
          format: [template.dimensions.width, template.dimensions.height]
        });

        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, template.dimensions.width, template.dimensions.height);
        
        // Clean up
        document.body.removeChild(labelDiv);

        resolve(pdf);
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleBulkPrint = async () => {
    if (!printSettings.printerId || !printSettings.template) {
      toast.error('Please select printer name and template');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('No assets selected');
      return;
    }

    try {
      setIsPrinting(true);
      setPrintProgress({ current: 0, total: selectedAssets.length });

      const selectedTemplate = getAvailableTemplates().find(t => t.id === printSettings.template);
      if (!selectedTemplate) {
        toast.error('Template not found');
        setIsPrinting(false);
        return;
      }

      const selectedPrinter = printers.find(p => String(p.id) === String(printSettings.printerId));
      if (!selectedPrinter) {
        toast.error('Printer not found');
        setIsPrinting(false);
        return;
      }

      // Generate PDFs for all selected assets
      const pdfs = [];
      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        setPrintProgress({ current: i + 1, total: selectedAssets.length });
        
        try {
          const pdf = await generatePDFForAsset(asset, selectedTemplate);
          pdfs.push({ pdf, asset });
        } catch (error) {
          console.error(`Error generating PDF for asset ${asset.asset_id}:`, error);
          toast.error(`Failed to generate PDF for ${asset.asset_name}`);
        }
      }

      // Download all PDFs or combine into one
      if (pdfs.length > 0) {
        // For now, download each PDF separately
        // In a production environment, you might want to combine them or send to printer
        pdfs.forEach(({ pdf, asset }) => {
          const fileName = `label_${asset.serial_number}_${selectedTemplate.id}.pdf`;
          pdf.save(fileName);
        });

        toast.success(`Generated ${pdfs.length} label PDF(s) successfully!`);
      }

      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error('Error in bulk print:', error);
      toast.error('Failed to generate PDFs');
      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
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

  const updateAssetStatus = async (serialNumber, status) => {
    try {
      // First, find the print queue item by serial number
      const queueResponse = await API.get(`/asset-serial-print/status/New`);
      const queueItems = queueResponse.data?.data || [];
      const queueItem = queueItems.find(item => item.serial_no === serialNumber);
      
      if (!queueItem) {
        // Try to find in all statuses if not found in New
        const allQueueResponse = await API.get(`/asset-serial-print`);
        const allQueueItems = allQueueResponse.data?.data || [];
        const foundItem = allQueueItems.find(item => item.serial_no === serialNumber);
        
        if (!foundItem) {
          console.warn(`Print queue item not found for serial number: ${serialNumber}`);
          return false;
        }
        
        // Update the status using the correct endpoint
        await API.put(`/asset-serial-print/${foundItem.psnq_id}/status`, {
          status
        });
        
        return true;
      }

      // Update the status using the correct endpoint
      await API.put(`/asset-serial-print/${queueItem.psnq_id}/status`, {
        status
      });
      
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      return false;
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    if (selectedAssets.length === 0) {
      toast.error('No assets selected');
      return;
    }

    try {
      let successCount = 0;
      let failCount = 0;

      for (const asset of selectedAssets) {
        const success = await updateAssetStatus(asset.serial_number, status);
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(`Status updated to ${status} for ${successCount} asset(s)`);
      }
      if (failCount > 0) {
        toast.error(`Failed to update status for ${failCount} asset(s)`);
      }

      setShowStatusModal(false);
    } catch (error) {
      console.error('Error in bulk status update:', error);
      toast.error('Failed to update statuses');
    }
  };

  const handleBulkDownload = async () => {
    if (!printSettings.template) {
      toast.error('Please select template');
      return;
    }

    if (selectedAssets.length === 0) {
      toast.error('No assets selected');
      return;
    }

    try {
      setIsPrinting(true);
      setPrintProgress({ current: 0, total: selectedAssets.length });

      const selectedTemplate = getAvailableTemplates().find(t => t.id === printSettings.template);
      if (!selectedTemplate) {
        toast.error('Template not found');
        setIsPrinting(false);
        return;
      }

      // Generate PDFs for all selected assets
      const pdfs = [];
      for (let i = 0; i < selectedAssets.length; i++) {
        const asset = selectedAssets[i];
        setPrintProgress({ current: i + 1, total: selectedAssets.length });
        
        try {
          const pdf = await generatePDFForAsset(asset, selectedTemplate);
          pdfs.push({ pdf, asset });
        } catch (error) {
          console.error(`Error generating PDF for asset ${asset.asset_id}:`, error);
        }
      }

      // Download all PDFs
      pdfs.forEach(({ pdf, asset }) => {
        const fileName = `label_${asset.serial_number}_${selectedTemplate.id}.pdf`;
        pdf.save(fileName);
      });

      toast.success(`Downloaded ${pdfs.length} label PDF(s) successfully!`);
      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error('Error in bulk download:', error);
      toast.error('Failed to generate PDFs');
      setIsPrinting(false);
      setPrintProgress({ current: 0, total: 0 });
    }
  };

  const availableTemplates = getAvailableTemplates();

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Back to Asset Selection"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bulk Print Serial Number Labels</h1>
              <p className="text-gray-600 mt-1">
                Printing labels for {selectedAssets.length} asset(s)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Print Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <span className="text-gray-600">Total Assets:</span>
            <span className="font-semibold ml-2">{selectedAssets.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Asset Type:</span>
            <span className="font-semibold ml-2">{selectedAssets[0]?.asset_type_name || 'N/A'}</span>
          </div>
          {isPrinting && (
            <div>
              <span className="text-gray-600">Progress:</span>
              <span className="font-semibold ml-2">
                {printProgress.current} / {printProgress.total}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Print Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Template Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Template Selection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={availableTemplates.map(template => ({
                  id: template.id,
                  text: template.text
                }))}
                value={printSettings.template}
                onChange={(value) => setPrintSettings(prev => ({ 
                  ...prev, 
                  template: value,
                  printerId: '' // Reset printer selection when template changes
                }))}
                placeholder="Select template..."
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Printer Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Printer Selection</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Printer Name <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={printers.map(printer => ({
                  id: printer.id.toString(),
                  text: `${printer.name} (${printer.id})`
                }))}
                value={printSettings.printerId}
                onChange={handlePrinterChange}
                placeholder="Select a printer..."
                className="w-full"
              />
              {printers.length === 0 && (
                <div className="mt-1 text-xs text-red-600">
                  No printers available
                </div>
              )}
            </div>
            
            {/* Printer Properties */}
            {selectedPrinterProperties && Object.keys(selectedPrinterProperties).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-md font-semibold mb-3 text-gray-700">Printer Properties</h4>
                <div className="space-y-2">
                  {Object.entries(selectedPrinterProperties).map(([key, value]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                      <span className="font-medium text-gray-900">{value || 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center gap-4 flex-wrap">
        <button
          onClick={() => setShowStatusModal(true)}
          disabled={selectedAssets.length === 0 || isPrinting}
          className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Settings className="w-5 h-5" />
          Update Status
        </button>
        <button
          onClick={handlePreview}
          disabled={!printSettings.printerId || !printSettings.template || isPrinting}
          className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Eye className="w-5 h-5" />
          Preview
        </button>
        <button
          onClick={handleBulkDownload}
          disabled={!printSettings.template || isPrinting}
          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download All PDFs
        </button>
        <button
          onClick={handleBulkPrint}
          disabled={!printSettings.printerId || !printSettings.template || isPrinting}
          className="px-8 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ backgroundColor: '#143d65' }}
          onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#0f2d4a')}
          onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#143d65')}
        >
          <Printer className="w-5 h-5" />
          {isPrinting ? `Printing... (${printProgress.current}/${printProgress.total})` : 'Print All Labels'}
        </button>
      </div>
      
      {/* Validation Status */}
      {(!printSettings.printerId || !printSettings.template) && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <AlertCircle className="w-4 h-4" />
            Please select printer name and template to proceed with printing
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Update Print Request Status</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Selected Assets: <span className="font-semibold">{selectedAssets.length}</span>
              </p>
              <p className="text-sm text-gray-600">
                This will update the status for all selected assets in the print queue.
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
                    onClick={() => handleBulkStatusUpdate(status.id)}
                    className="w-full text-left px-4 py-3 rounded-lg border-2 transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
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

      {/* Print Preview Modal */}
      <PrintPreviewModal
        show={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        selectedItems={selectedAssets} // Pass all selected assets for preview
        printSettings={printSettings}
        printers={printers}
        labelTemplates={labelTemplates}
        assetTypeTemplateMapping={assetTypeTemplateMapping}
      />
    </div>
  );
};

export default BulkPrintLabelScreen;

