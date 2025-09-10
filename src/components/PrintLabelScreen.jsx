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

const PrintLabelScreen = ({ 
  selectedItem, 
  onBackToList, 
  onStatusUpdate, 
  onPreview, 
  onPrint,
  printers = [],
  assetTemplates = {},
  printSettings,
  setPrintSettings,
  getRecommendedPrinter,
  getAvailablePrinterTypes,
  getAvailableDimensions,
  getFilteredPrinters,
  getStatusBadgeColor,
  showPreviewModal,
  setShowPreviewModal
}) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef(null);
  
  const statusOptions = [
    { value: 'Completed', label: 'Completed', color: 'text-green-600' },
    { value: 'Cancelled', label: 'Cancelled', color: 'text-red-600' },
    { value: 'In-progress', label: 'In-progress', color: 'text-blue-600' }
  ];

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
  const handlePrinterTypeChange = (e) => {
    setPrintSettings(prev => ({ 
      ...prev, 
      printerType: e.target.value,
      printerId: '', // Reset printer selection when type changes
      dimension: '' // Reset dimension when type changes
    }));
  };

  const handleDimensionChange = (e) => {
    setPrintSettings(prev => ({ 
      ...prev, 
      dimension: e.target.value,
      printerId: '' // Reset printer selection when dimension changes
    }));
  };

  const handlePrinterIdChange = (e) => {
    setPrintSettings(prev => ({ ...prev, printerId: e.target.value }));
  };

  const handleStatusChange = (status) => {
    console.log('Status changed to:', status);
    onStatusUpdate(selectedItem, status);
    setShowStatusDropdown(false);
    toast.success(`Status updated to ${status}`);
  };

  const generatePDF = async () => {
    if (!selectedItem || !printSettings.printerId || !printSettings.printerType || !printSettings.dimension) {
      toast.error('Please select printer name, type, and dimension');
      return;
    }

    try {
      toast.loading('Generating PDF...', { duration: 2000 });
      
       // Create a temporary div to render the label
       const labelDiv = document.createElement('div');
       labelDiv.style.position = 'fixed';
       labelDiv.style.left = '-9999px';
       labelDiv.style.top = '0';
       labelDiv.style.width = '280px';
       labelDiv.style.height = 'auto';
       labelDiv.style.backgroundColor = 'white';
       labelDiv.style.padding = '20px';
       labelDiv.style.border = '1px solid #e5e7eb';
       labelDiv.style.borderRadius = '4px';
       labelDiv.style.fontFamily = 'Arial, sans-serif';
       labelDiv.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
       labelDiv.style.overflow = 'hidden';
       labelDiv.style.zIndex = '9999';
      
      document.body.appendChild(labelDiv);

      // Determine label format
      const getLabelFormat = (printerType, paperType) => {
        if (printerType === 'Label' && paperType === 'Vinyl') return 'Barcode';
        if (printerType === 'Industrial' && paperType === 'Metal') return 'QR Code';
        if ((printerType === 'Laser' || printerType === 'Inkjet') && paperType === 'Paper') return 'Text Only';
        return 'Barcode';
      };

      const template = assetTemplates[selectedItem.asset_type_name] || assetTemplates['Laptop'];
      const format = getLabelFormat(printSettings.printerType, template.paperType);

       // Generate the label content
       if (format === 'Barcode') {
         // Create the complete label structure
         const labelContainer = document.createElement('div');
         labelContainer.style.textAlign = 'center';
         labelContainer.style.fontFamily = 'Arial, sans-serif';
         labelDiv.appendChild(labelContainer);

         // Add "SERIAL NUMBER" title
         const titleDiv = document.createElement('div');
         titleDiv.style.fontSize = '14px';
         titleDiv.style.color = '#666';
         titleDiv.style.marginBottom = '8px';
         titleDiv.textContent = 'SERIAL NUMBER';
         labelContainer.appendChild(titleDiv);

         // Add serial number
         const serialDiv = document.createElement('div');
         serialDiv.style.fontSize = '18px';
         serialDiv.style.fontWeight = 'bold';
         serialDiv.style.fontFamily = 'monospace';
         serialDiv.style.marginBottom = '10px';
         serialDiv.textContent = selectedItem.serial_number;
         labelContainer.appendChild(serialDiv);

         // Create barcode container
         const barcodeContainer = document.createElement('div');
         barcodeContainer.style.border = '1px solid #e5e7eb';
         barcodeContainer.style.borderRadius = '3px';
         barcodeContainer.style.padding = '10px';
         barcodeContainer.style.marginBottom = '8px';
         barcodeContainer.style.backgroundColor = 'white';
         barcodeContainer.style.overflow = 'hidden';
         barcodeContainer.style.maxWidth = '100%';
         labelContainer.appendChild(barcodeContainer);

         // Create barcode using JsBarcode
         const canvas = document.createElement('canvas');
         canvas.style.maxWidth = '100%';
         canvas.style.height = 'auto';
         canvas.style.display = 'block';
         canvas.style.margin = '0 auto';
         barcodeContainer.appendChild(canvas);
         
         // Import JsBarcode dynamically
         const JsBarcode = (await import('jsbarcode')).default;
         
         try {
           JsBarcode(canvas, selectedItem.serial_number, {
             format: "CODE128",
             width: 2,
             height: 50,
             displayValue: false,
             margin: 5,
             background: "#ffffff",
             lineColor: "#000000",
             valid: function(valid) {
               console.log('Barcode valid:', valid);
               if (valid) {
                 console.log('Barcode rendered successfully');
               }
             }
           });
         } catch (error) {
           console.error('Barcode generation error:', error);
           // Fallback: create a simple text representation
           canvas.getContext('2d').fillText('BARCODE: ' + selectedItem.serial_number, 10, 30);
         }

         // Add scan instruction
         const scanDiv = document.createElement('div');
         scanDiv.style.fontSize = '12px';
         scanDiv.style.color = '#666';
         scanDiv.textContent = 'Scan with any barcode scanner app';
         labelContainer.appendChild(scanDiv);

      } else if (format === 'QR Code') {
        // Create the complete label structure
        const labelContainer = document.createElement('div');
        labelContainer.style.textAlign = 'center';
        labelContainer.style.fontFamily = 'Arial, sans-serif';
        labelDiv.appendChild(labelContainer);

        // Add "SERIAL NUMBER" title
        const titleDiv = document.createElement('div');
        titleDiv.style.fontSize = '14px';
        titleDiv.style.color = '#666';
        titleDiv.style.marginBottom = '8px';
        titleDiv.textContent = 'SERIAL NUMBER';
        labelContainer.appendChild(titleDiv);

        // Add serial number
        const serialDiv = document.createElement('div');
        serialDiv.style.fontSize = '18px';
        serialDiv.style.fontWeight = 'bold';
        serialDiv.style.fontFamily = 'monospace';
        serialDiv.style.marginBottom = '10px';
        serialDiv.textContent = selectedItem.serial_number;
        labelContainer.appendChild(serialDiv);

         // Create QR code container
         const qrContainer = document.createElement('div');
         qrContainer.style.border = '1px solid #e5e7eb';
         qrContainer.style.borderRadius = '3px';
         qrContainer.style.padding = '10px';
         qrContainer.style.marginBottom = '8px';
         qrContainer.style.backgroundColor = 'white';
         qrContainer.style.overflow = 'hidden';
         qrContainer.style.maxWidth = '100%';
         qrContainer.style.textAlign = 'center';
         labelContainer.appendChild(qrContainer);

         // Create QR code
         const QRCode = (await import('react-qr-code')).default;
         const React = (await import('react')).default;
         const ReactDOM = (await import('react-dom/client')).default;
         
         const qrDiv = document.createElement('div');
         qrDiv.style.maxWidth = '100%';
         qrDiv.style.overflow = 'hidden';
         qrContainer.appendChild(qrDiv);
         
         try {
           const root = ReactDOM.createRoot(qrDiv);
           root.render(React.createElement(QRCode, {
             value: selectedItem.serial_number,
             size: 80,
             style: { height: "auto", maxWidth: "100%", width: "100%" }
           }));
         } catch (error) {
           console.error('QR code generation error:', error);
           // Fallback: create a simple text representation
           qrDiv.innerHTML = `<div style="text-align: center; padding: 20px; border: 1px solid #ccc;">QR: ${selectedItem.serial_number}</div>`;
         }

        // Add scan instruction
        const scanDiv = document.createElement('div');
        scanDiv.style.fontSize = '12px';
        scanDiv.style.color = '#666';
        scanDiv.textContent = 'Scan with any QR code scanner app';
        labelContainer.appendChild(scanDiv);

      } else {
        // Text only format
        const labelContainer = document.createElement('div');
        labelContainer.style.textAlign = 'center';
        labelContainer.style.fontFamily = 'Arial, sans-serif';
        labelDiv.appendChild(labelContainer);

        // Add "SERIAL NUMBER" title
        const titleDiv = document.createElement('div');
        titleDiv.style.fontSize = '14px';
        titleDiv.style.color = '#666';
        titleDiv.style.marginBottom = '8px';
        titleDiv.textContent = 'SERIAL NUMBER';
        labelContainer.appendChild(titleDiv);

        // Add serial number
        const serialDiv = document.createElement('div');
        serialDiv.style.fontSize = '18px';
        serialDiv.style.fontWeight = 'bold';
        serialDiv.style.fontFamily = 'monospace';
        serialDiv.style.marginBottom = '10px';
        serialDiv.textContent = selectedItem.serial_number;
        labelContainer.appendChild(serialDiv);

        // Add asset details
        const detailsDiv = document.createElement('div');
        detailsDiv.style.fontSize = '12px';
        detailsDiv.style.color = '#666';
        detailsDiv.style.lineHeight = '1.4';
        detailsDiv.innerHTML = `
          <div style="margin-bottom: 3px;">${selectedItem.asset_type_name}</div>
          <div style="margin-bottom: 3px;">${selectedItem.asset_name}</div>
          <div>${selectedItem.asset_location}</div>
        `;
        labelContainer.appendChild(detailsDiv);
      }

       // Wait for rendering - longer wait for barcode/QR code generation
       await new Promise(resolve => setTimeout(resolve, 2000));

       // Force a reflow to ensure all content is rendered
       labelDiv.offsetHeight;

       // Debug: Check if content is visible
       console.log('Label div content:', labelDiv.innerHTML);
       console.log('Label div dimensions:', labelDiv.offsetWidth, 'x', labelDiv.offsetHeight);

       // Convert to canvas
       const canvas = await html2canvas(labelDiv, {
         backgroundColor: '#ffffff',
         scale: 1,
         useCORS: true,
         allowTaint: true,
         logging: true,
         width: labelDiv.offsetWidth,
         height: labelDiv.offsetHeight
       });

      // Debug: Check canvas
      console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
      console.log('Canvas data URL length:', canvas.toDataURL('image/png').length);

      // Create PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: printSettings.dimension.includes('A') ? 'portrait' : 'landscape',
        unit: 'mm',
        format: printSettings.dimension.includes('A') ? printSettings.dimension : 'a4'
      });

       // Calculate dimensions
       const imgWidth = canvas.width;
       const imgHeight = canvas.height;
       const pdfWidth = pdf.internal.pageSize.getWidth();
       const pdfHeight = pdf.internal.pageSize.getHeight();
       
       // Calculate scaling to fit the page nicely
       const maxWidth = pdfWidth - 20; // 10mm margin on each side
       const maxHeight = pdfHeight - 20; // 10mm margin on top and bottom
       
       let scale = 1;
       if (imgWidth > maxWidth) {
         scale = Math.min(scale, maxWidth / imgWidth);
       }
       if (imgHeight > maxHeight) {
         scale = Math.min(scale, maxHeight / imgHeight);
       }
       
       // Ensure minimum readable size
       scale = Math.max(scale, 0.5);
       
       const scaledWidth = imgWidth * scale;
       const scaledHeight = imgHeight * scale;
       
       // Center the image
       const x = (pdfWidth - scaledWidth) / 2;
       const y = (pdfHeight - scaledHeight) / 2;

       pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);
      
      // Clean up
      document.body.removeChild(labelDiv);

      // Download PDF
      const fileName = `label_${selectedItem.serial_number}_${format.toLowerCase().replace(' ', '_')}.pdf`;
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
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{selectedItem.asset_location}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Department:</span>
              <span className="font-medium">{selectedItem.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Priority:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedItem.priority === 'Low' ? 'bg-gray-100 text-gray-800' :
                selectedItem.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                selectedItem.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {selectedItem.priority}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(selectedItem.status)}`}>
                {selectedItem.status}
              </span>
            </div>
          </div>
        </div>

        {/* Printer Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Printer Selection</h3>
          <div className="space-y-4">
            {/* Printer Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Printer Type <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={getAvailablePrinterTypes(selectedItem).map(type => ({
                  id: type,
                  text: type
                }))}
                value={printSettings.printerType}
                onChange={(value) => setPrintSettings(prev => ({ 
                  ...prev, 
                  printerType: value,
                  printerId: '', // Reset printer selection when type changes
                  dimension: '' // Reset dimension when type changes
                }))}
                placeholder="Select printer type..."
                className="w-full"
              />
              {printSettings.printerType && (
                <div className="mt-1 text-xs text-gray-600">
                  {(() => {
                    const template = assetTemplates[selectedItem.asset_type_name] || assetTemplates['Laptop'];
                    const isRecommended = (
                      (template.paperType === 'Vinyl' && printSettings.printerType === 'Label') ||
                      (template.paperType === 'Paper' && ['Laser', 'Inkjet'].includes(printSettings.printerType)) ||
                      (template.paperType === 'Metal' && printSettings.printerType === 'Industrial')
                    );
                    return isRecommended ? (
                      <span className="text-green-600">✅ Recommended type for {template.paperType} labels</span>
                    ) : (
                      <span className="text-yellow-600">⚠️ May not be optimal for {template.paperType} labels</span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Dimension Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dimension <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={getAvailableDimensions(selectedItem).map(dimension => ({
                  id: dimension,
                  text: dimension
                }))}
                value={printSettings.dimension}
                onChange={(value) => setPrintSettings(prev => ({ 
                  ...prev, 
                  dimension: value,
                  printerId: '' // Reset printer selection when dimension changes
                }))}
                placeholder="Select dimension..."
                className="w-full"
              />
              {printSettings.dimension && (
                <div className="mt-1 text-xs text-gray-600">
                  {(() => {
                    const template = assetTemplates[selectedItem.asset_type_name] || assetTemplates['Laptop'];
                    const isRecommended = template.labelSize === printSettings.dimension;
                    return isRecommended ? (
                      <span className="text-green-600">✅ Recommended size for this asset type</span>
                    ) : (
                      <span className="text-yellow-600">⚠️ Using custom size instead of recommended {template.labelSize}</span>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Printer Name Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Printer Name <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={getFilteredPrinters().map(printer => {
                  const isRecommended = getRecommendedPrinter(selectedItem).id === printer.id;
                  return {
                    id: printer.id.toString(),
                    text: `${isRecommended ? '⭐ ' : ''}${printer.name} - ${printer.location} (${printer.ipAddress}) - ${printer.status}`
                  };
                })}
                value={printSettings.printerId}
                onChange={(value) => setPrintSettings(prev => ({ ...prev, printerId: value }))}
                placeholder="Select a printer..."
                className="w-full"
                disabled={!printSettings.printerType || !printSettings.dimension}
              />
              {!printSettings.printerType || !printSettings.dimension ? (
                <div className="mt-1 text-xs text-gray-500">
                  Please select printer type and dimension first
                </div>
              ) : getFilteredPrinters().length === 0 ? (
                <div className="mt-1 text-xs text-red-600">
                  No printers available with selected type and dimension
                </div>
              ) : printSettings.printerId ? (
                <div className="mt-1 text-xs text-gray-600">
                  {(() => {
                    const selectedPrinter = printers.find(p => p.id === parseInt(printSettings.printerId));
                    const isRecommended = getRecommendedPrinter(selectedItem).id === selectedPrinter?.id;
                    return isRecommended ? (
                      <span className="text-green-600">⭐ Recommended printer for this asset type and location</span>
                    ) : (
                      <span className="text-yellow-600">⚠️ This printer may not be optimal for this asset type</span>
                    );
                  })()}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex justify-center gap-4">
         <button
           onClick={(e) => {
             console.log('🖱️ Button click event triggered');
             console.log('Button disabled state:', !printSettings.printerId || !printSettings.printerType || !printSettings.dimension);
             e.preventDefault();
             onPreview();
           }}
           disabled={!printSettings.printerId || !printSettings.printerType || !printSettings.dimension}
           className="px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
         >
           <Eye className="w-5 h-5" />
           Preview
         </button>
        <button
          onClick={generatePDF}
          disabled={!printSettings.printerId || !printSettings.printerType || !printSettings.dimension}
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
           disabled={!printSettings.printerId || !printSettings.printerType || !printSettings.dimension}
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
      {(!printSettings.printerId || !printSettings.printerType || !printSettings.dimension) && (
        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
            <AlertCircle className="w-4 h-4" />
            Please select printer name, type, and dimension to proceed with printing
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
        assetTemplates={assetTemplates}
      />
    </div>
  );
};

export default PrintLabelScreen;
