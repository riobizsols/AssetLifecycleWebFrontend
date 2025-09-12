import React, { useEffect, useRef } from 'react';
import { X, Printer, Eye } from 'lucide-react';
import QRCode from 'react-qr-code';
import JsBarcode from 'jsbarcode';

const PrintPreviewModal = ({ 
  show, 
  onClose, 
  selectedItem, 
  printSettings, 
  printers = [], 
  labelTemplates = {},
  assetTypeTemplateMapping = {}
}) => {
  if (!show) return null;

  const selectedPrinter = printers.find(p => p.id === parseInt(printSettings.printerId));
  
  // Get selected template or fallback to default
  const getSelectedTemplate = () => {
    if (!printSettings.template) return null;
    return Object.values(labelTemplates).find(t => t.id === printSettings.template);
  };
  
  const template = getSelectedTemplate() || { format: 'text-only', dimensions: { width: 3, height: 1.5 } };

  // Determine label format based on template format
  const getLabelFormat = (template) => {
    if (!template || !template.format) return 'text-only';
    
    // Map template format to display format
    switch (template.format) {
      case 'barcode-only':
      case 'text-with-barcode':
        return 'Barcode';
      case 'text-with-qr':
        return 'QR Code';
      case 'text-only':
        return 'Text Only';
      default:
        return 'Text Only';
    }
  };

  // Get max width based on template dimensions
  const getLabelMaxWidth = (template) => {
    if (!template || !template.dimensions) return '300px';
    
    const { width, height } = template.dimensions;
    // Convert inches to pixels (assuming 96 DPI)
    const widthPx = Math.round(width * 96);
    const heightPx = Math.round(height * 96);
    
    // Use the larger dimension for max width, but cap at reasonable limits
    const maxWidth = Math.max(widthPx, heightPx);
    return `${Math.min(maxWidth, 600)}px`;
  };

  // Refs for barcode canvas
  const barcodeRef = useRef(null);

  // Generate real barcode when component mounts or serial number changes
  useEffect(() => {
    if (barcodeRef.current && selectedItem?.serial_number) {
      try {
        // Clear previous barcode
        barcodeRef.current.innerHTML = '';
        
        // Create canvas element
        const canvas = document.createElement('canvas');
        barcodeRef.current.appendChild(canvas);
        
        // Get label dimensions to adjust barcode size
        const isSmallLabel = template.dimensions?.width <= 2 && template.dimensions?.height <= 1;
        
        // Generate Code128 barcode with proper settings for scanning
        console.log('🔍 Generating barcode for:', selectedItem.serial_number);
        console.log('🔍 Canvas dimensions:', canvas.width, 'x', canvas.height);
        
        JsBarcode(canvas, selectedItem.serial_number, {
          format: "CODE128",
          width: isSmallLabel ? 2 : 3, // Increased width for better scanning
          height: isSmallLabel ? 40 : 60, // Increased height for better scanning
          displayValue: false,
          margin: isSmallLabel ? 8 : 12, // Increased margin
          background: "#ffffff",
          lineColor: "#000000",
          fontSize: 0, // No text display
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2,
          // Additional settings for better scanning
          valid: function(valid) {
            if (!valid) {
              console.warn('❌ Invalid barcode data:', selectedItem.serial_number);
            } else {
              console.log('✅ Barcode generated successfully for:', selectedItem.serial_number);
              console.log('✅ Canvas final dimensions:', canvas.width, 'x', canvas.height);
            }
          }
        });
        
        // Ensure canvas fits within container and has proper dimensions
        canvas.style.maxWidth = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.style.margin = '0 auto';
        
        // Set minimum dimensions for scannability
        const minWidth = isSmallLabel ? 120 : 180;
        if (canvas.width < minWidth) {
          canvas.style.minWidth = `${minWidth}px`;
        }
        
      } catch (error) {
        console.error('Error generating barcode:', error);
        // Fallback: show error message
        barcodeRef.current.innerHTML = '<div class="text-red-500 text-xs">Barcode generation failed</div>';
      }
    }
  }, [selectedItem?.serial_number, template.dimensions]);

  // Render different label formats
  const renderLabelFormat = (selectedItem, template) => {
    const format = getLabelFormat(template);
    
    switch (format) {
      case 'Barcode':
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SERIAL NUMBER</div>
            <div className="font-mono text-lg font-bold text-gray-900 mb-3">
              {selectedItem?.serial_number}
            </div>
            
            {/* Real Barcode */}
            <div className="mb-2">
              <div className="flex justify-center items-center bg-white border border-gray-300 rounded p-2">
                <div 
                  ref={barcodeRef} 
                  className="barcode-container"
                  style={{ 
                    maxWidth: '100%', 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    minHeight: '60px'
                  }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1 text-center">
                Scan with any barcode scanner app
              </div>
            </div>
          </div>
        );

      case 'QR Code':
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SERIAL NUMBER</div>
            <div className="font-mono text-lg font-bold text-gray-900 mb-3">
              {selectedItem?.serial_number}
            </div>
            
            {/* Real QR Code */}
            <div className="mb-2">
              <div className="flex justify-center items-center bg-white border border-gray-300 rounded p-2 overflow-hidden">
                <QRCode
                  value={selectedItem?.serial_number || ''}
                  size={template.dimensions?.width <= 2 ? 50 : 80}
                  style={{ 
                    height: "auto", 
                    maxWidth: "100%", 
                    width: "100%",
                    maxHeight: "80px"
                  }}
                  viewBox={`0 0 ${template.dimensions?.width <= 2 ? 50 : 80} ${template.dimensions?.width <= 2 ? 50 : 80}`}
                />
              </div>
            </div>
          </div>
        );

      case 'barcode-enhanced':
        // Get template dimensions for proper sizing
        const template = getSelectedTemplate();
        const width = template?.dimensions?.width || 2;
        const height = template?.dimensions?.height || 1;
        
        // Calculate aspect ratio for responsive sizing
        const aspectRatio = width / height;
        const maxWidth = 200;
        const maxHeight = 100;
        
        let previewWidth = maxWidth;
        let previewHeight = maxHeight;
        
        if (aspectRatio > maxWidth / maxHeight) {
          previewHeight = maxWidth / aspectRatio;
        } else {
          previewWidth = maxHeight * aspectRatio;
        }
        
        return (
          <div 
            className="relative p-1 mx-auto"
            style={{ 
              width: `${previewWidth}px`, 
              height: `${previewHeight}px`,
              minWidth: '120px',
              minHeight: '60px'
            }}
          >
            {/* Company Logo - Top Left */}
            <div className="absolute top-1 left-1 w-4 h-3 flex items-center justify-center bg-blue-100 rounded text-xs font-bold text-blue-800">
              LOGO
            </div>
            
            {/* Company Name - Top Right */}
            <div className="absolute top-1 right-1 text-xs font-bold text-gray-800">
              AssetLife
            </div>
            
            {/* Serial Number - Center */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
              <div className="text-xs text-gray-500 mb-1">SERIAL NUMBER</div>
              <div className="font-mono text-sm font-bold text-gray-900">
                {selectedItem?.serial_number}
              </div>
            </div>
            
            {/* Barcode - Bottom */}
            <div className="absolute bottom-1 left-1 right-1 text-center">
              <div className="text-xs text-gray-500 mb-1">BARCODE</div>
              <div className="font-mono text-xs bg-black text-white px-1 py-0.5 rounded">
                ||| ||| ||| ||| ||| ||| ||| |||
              </div>
            </div>
          </div>
        );

      case 'Text Only':
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SERIAL NUMBER</div>
            <div className="font-mono text-lg font-bold text-gray-900 mb-2">
              {selectedItem?.serial_number}
            </div>
            <div className="text-xs text-gray-600 mb-1">{selectedItem?.asset_type_name}</div>
            <div className="text-xs text-gray-600 mb-1">{selectedItem?.asset_name}</div>
          </div>
        );

      default:
        return (
          <div className="text-center">
            <div className="text-xs text-gray-500 mb-1">SERIAL NUMBER</div>
            <div className="font-mono text-lg font-bold text-gray-900">
              {selectedItem?.serial_number}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Print Preview</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Label Preview Only */}
        <div className="flex justify-center">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 text-center">Label Preview</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-2">
                Label Size: {template.dimensions?.width}"×{template.dimensions?.height}" | 
                Paper: {template.paperType} | 
                Quality: {template.paperQuality}
              </div>
              <div 
                className="bg-white border border-gray-200 rounded p-4 mx-auto overflow-hidden" 
                style={{ 
                  maxWidth: getLabelMaxWidth(template),
                  width: '100%'
                }}
              >
                {renderLabelFormat(selectedItem, template)}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Template: {template?.name || 'Default'} | Format: {getLabelFormat(template)}
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end items-center mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintPreviewModal;
