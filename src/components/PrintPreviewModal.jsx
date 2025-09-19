import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Eye } from 'lucide-react';
import QRCode from 'react-qr-code';
import JsBarcode from 'jsbarcode';
import { getOrgData } from '../templates/labelTemplates';
import { useAuthStore } from '../store/useAuthStore';

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
  const { user } = useAuthStore();
  const [orgData, setOrgData] = useState({
    name: 'Organization',
    logo: null,
    address: 'City, State',
    phone: '+1 (555) 123-4567',
    website: 'www.organization.com'
  });

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
          valid: function (valid) {
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

  // Render label with organization data and barcode
  const renderLabelFormat = (selectedItem, template) => {
    return (
      <div
        className="relative w-full h-full p-6 flex flex-col justify-between" // Main label container with padding and flex column
      >
        {/* Organization Logo and Name (Top Section) */}
        <div className="flex items-center justify-between flex-shrink-0 mb-4"> {/* Added margin-bottom for gap */}
          {/* Logo circle with first letter */}
          <div
            className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold"
            style={{
              fontSize: '16px',
              lineHeight: '1',
              fontFamily: 'Arial, sans-serif',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              verticalAlign: 'middle',
              transform: 'translateY(-2px)'
            }}
          >
            {orgData.name.charAt(0).toUpperCase()}
          </div>

          {/* Organization name */}
          <div className="text-sm font-bold text-blue-600 text-right flex-1 ml-2 leading-none">
            {orgData.name}
          </div>
        </div>

        {/* Serial Number (Center Section) */}
        <div className="text-center my-auto flex-1 flex flex-col justify-center mb-4"> {/* Added margin-bottom for gap */}
          <div className="text-md text-gray-500 font-bold leading-tight">SERIAL NUMBER</div>
          <div className="text-lg font-bold font-mono text-black tracking-wide leading-tight">
            {selectedItem?.serial_number}
          </div>
        </div>

        {/* Barcode (Bottom Section) */}
        <div className="flex justify-center flex-shrink-0">
          <div
            ref={barcodeRef}
            className="barcode-container w-full"
          />
        </div>
      </div>
    );
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
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50 flex justify-center items-center">
              <div className="text-center w-full">
                <div className="text-sm text-gray-500 mb-2">
                  Label Size: {template.dimensions?.width}"×{template.dimensions?.height}" |
                  Paper: {template.paperType} |
                  Quality: {template.paperQuality}
                </div>
                <div
                  className="bg-white border border-gray-200 rounded-lg p-6 mx-auto overflow-hidden" // Increased padding from p-4 to p-6
                  style={{
                    maxWidth: getLabelMaxWidth(template),
                    aspectRatio: `${template.dimensions?.width} / ${template.dimensions?.height}` || '2 / 1',
                    minHeight: '240px', // Increased minimum height from 180px to 240px
                    minWidth: '480px' // Increased minimum width from 360px to 480px
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