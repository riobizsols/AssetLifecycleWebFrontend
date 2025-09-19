import React, { useState, useEffect, useRef } from 'react';
import { 
  Printer, 
  Eye, 
  ArrowLeft, 
  Settings, 
  AlertCircle,
  Download,
  List,
  Edit,
  ChevronDown
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PrintPreviewModal from './PrintPreviewModal';
import SearchableDropdown from './ui/SearchableDropdown';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import API from '../lib/axios';
import { getOrgData } from '../templates/labelTemplates';
import { useAuthStore } from '../store/useAuthStore';

const PrintLabelScreen = ({ 
  selectedItem, 
  onBackToList, 
  onStatusUpdate, 
  onPreview, 
  onPrint,
  printers = [],
  labelTemplates = {},
  assetTypeTemplateMapping = {},
  printSettings,
  setPrintSettings,
  getRecommendedPrinter,
  getAvailableTemplates,
  getFilteredPrinters,
  getStatusBadgeColor,
  showPreviewModal,
  setShowPreviewModal
}) => {
  const { user } = useAuthStore();
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedPrinterProperties, setSelectedPrinterProperties] = useState(null);
  const [orgData, setOrgData] = useState({
    name: 'Organization',
    logo: null,
    address: 'City, State',
    phone: '+1 (555) 123-4567',
    website: 'www.organization.com'
  });
  const dropdownRef = useRef(null);
  
  const statusOptions = [
    { value: 'Completed', label: 'Completed', color: 'text-green-600' },
    { value: 'Cancelled', label: 'Cancelled', color: 'text-red-600' },
    { value: 'In-progress', label: 'In-progress', color: 'text-blue-600' }
  ];

  // Fetch organization data on component mount
  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const orgId = user?.org_id || 'ORG001'; // Use user's org_id or fallback
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowStatusDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTemplateChange = (e) => {
    setPrintSettings(prev => ({ 
      ...prev, 
      template: e.target.value,
      printerId: '' // Reset printer selection when template changes
    }));
  };

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


  const handleStatusChange = (status) => {
    console.log('Status changed to:', status);
    onStatusUpdate(selectedItem, status);
    setShowStatusDropdown(false);
    toast.success(`Status updated to ${status}`);
  };

  const generatePDF = async () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.template) {
      toast.error('Please select printer name and template');
      return;
    }

    try {
      toast.loading('Generating PDF...', { duration: 2000 });
      
      // Get selected template
      const templateData = getAvailableTemplates(selectedItem).find(t => t.id === printSettings.template);
      const template = templateData || { 
        format: 'barcode-enhanced', 
        dimensions: { width: 2, height: 1, unit: 'inch' },
        layout: {}
      };

      // Create a temporary div for the label with exact template dimensions
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
      
      // Logo circle with first letter
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
      
      // Create a span for the text to better control positioning
      const logoText = document.createElement('span');
      logoText.style.display = 'block';
      logoText.style.lineHeight = '1';
      logoText.style.textAlign = 'center';
      logoText.style.verticalAlign = 'middle';
      logoText.style.fontSize = '8px';
      logoText.style.fontWeight = 'bold';
      logoText.style.fontFamily = 'Arial, sans-serif';
      logoText.style.transform = 'translateY(-3px)'; // Fine-tune vertical position
      logoText.textContent = orgData.name.charAt(0).toUpperCase();
      
      logoCircle.appendChild(logoText);
      
      // Organization name
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
         serialNumber.textContent = selectedItem.serial_number;
      
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
      
      // Create barcode canvas
      const barcodeCanvas = document.createElement('canvas');
      barcodeCanvas.id = 'barcode-canvas';
      barcodeCanvas.style.maxWidth = '100%';
      barcodeCanvas.style.height = 'auto';
      barcodeCanvas.style.display = 'block';
      bottomSection.appendChild(barcodeCanvas);
      
      // Generate barcode
      try {
        JsBarcode(barcodeCanvas, selectedItem.serial_number, {
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
           // Fallback: create a simple text representation
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

      // Create PDF with exact label dimensions
      const pdf = new jsPDF({
        orientation: template.dimensions.width > template.dimensions.height ? 'landscape' : 'portrait',
        unit: 'in',
        format: [template.dimensions.width, template.dimensions.height]
      });

      // Add image to PDF
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, template.dimensions.width, template.dimensions.height);
      
      // Clean up
      document.body.removeChild(labelDiv);

      // Download PDF
      const fileName = `label_${selectedItem.serial_number}_${template.id}.pdf`;
      pdf.save(fileName);
      
      toast.success('PDF generated successfully!');
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Print Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button
               onClick={onBackToList}
               className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
               title="Back to List"
             >
               <ArrowLeft className="w-5 h-5 text-gray-600" />
             </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Print Serial Number Label</h1>
              <p className="text-gray-600 mt-1">Print label for {selectedItem.asset_name}</p>
            </div>
          </div>
           <div className="flex items-center gap-3">
             <div className="w-48">
               <SearchableDropdown
                 options={statusOptions.map(option => ({
                   id: option.value,
                   text: option.label
                 }))}
                 value=""
                 onChange={(value) => handleStatusChange(value)}
                 placeholder="Update Status"
                 className="w-full"
                 customButtonStyle={{
                   backgroundColor: '#143d65',
                   color: 'white',
                   border: 'none',
                   padding: '8px 16px',
                   borderRadius: '8px',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '8px',
                   cursor: 'pointer'
                 }}
                 customButtonContent={
                   <>
                     <Edit className="w-4 h-4" />
                     Update Status
                     <ChevronDown className="w-4 h-4" />
                   </>
                 }
               />
             </div>
           </div>
        </div>
      </div>

      {/* Print Page Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Asset Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Asset Details</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Serial Number:</span>
              <span className="font-mono font-medium">{selectedItem.serial_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Asset Type:</span>
              <span className="font-medium">{selectedItem.asset_type_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Asset Name:</span>
              <span className="font-medium">{selectedItem.asset_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}>
                {selectedItem.status}
              </span>
            </div>
          </div>
          
          {/* Asset Properties */}
          {selectedItem.properties && Object.keys(selectedItem.properties).length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <h4 className="text-md font-semibold mb-3 text-gray-700">Properties</h4>
              <div className="space-y-2">
                {Object.entries(selectedItem.properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</span>
                    <span className="font-medium text-gray-900">{value || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Printer Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Printer Selection</h3>
          <div className="space-y-4">

            {/* Template Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Template <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={getAvailableTemplates(selectedItem).map(template => ({
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

            {/* Printer Name Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Printer Name <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={getFilteredPrinters().map(printer => {
                  return {
                    id: printer.id.toString(),
                    text: `${printer.name} (${printer.id})`
                  };
                })}
                value={printSettings.printerId}
                onChange={handlePrinterChange}
                placeholder="Select a printer..."
                className="w-full"
              />
              {getFilteredPrinters().length === 0 ? (
                <div className="mt-1 text-xs text-red-600">
                  No printers available
                </div>
              ) : null}
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
      <div className="mt-6 flex justify-center gap-4">
         <button
           onClick={(e) => {
             console.log('🖱️ Button click event triggered');
             console.log('Button disabled state:', !printSettings.printerId || !printSettings.template);
             e.preventDefault();
             onPreview();
           }}
           disabled={!printSettings.printerId || !printSettings.template}
           className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
         >
           <Eye className="w-5 h-5" />
           Preview
         </button>
        <button
          onClick={generatePDF}
          disabled={!printSettings.printerId || !printSettings.template}
          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Generate PDF
        </button>
         <button
           onClick={(e) => {
             e.preventDefault();
             console.log('Print Label clicked for:', selectedItem);
             onPrint();
           }}
           disabled={!printSettings.printerId || !printSettings.template}
           className="px-8 py-3 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
           style={{ backgroundColor: '#143d65' }}
           onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#0f2d4a')}
           onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#143d65')}
         >
           <Printer className="w-5 h-5" />
           Print Label
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

      {/* Print Preview Modal */}
      <PrintPreviewModal
        show={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        selectedItem={selectedItem}
        printSettings={printSettings}
        printers={printers}
        labelTemplates={labelTemplates}
        assetTypeTemplateMapping={assetTypeTemplateMapping}
      />
    </div>
  );
};

export default PrintLabelScreen;

