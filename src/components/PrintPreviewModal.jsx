import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Eye } from 'lucide-react';
import QRCode from 'react-qr-code';
import JsBarcode from 'jsbarcode';
import { getOrgData } from '../templates/labelTemplates';
import { useAuthStore } from '../store/useAuthStore';

const PrintPreviewModal = ({
  show,
  onClose,
  selectedItem, // For backward compatibility
  selectedItems, // New: array of assets for bulk preview
  printSettings,
  printers = [],
  labelTemplates = {},
  assetTypeTemplateMapping = {}
}) => {
  if (!show) return null;
  
  // Support both single item and multiple items
  const assetsToPreview = selectedItems && selectedItems.length > 0 
    ? selectedItems 
    : (selectedItem ? [selectedItem] : []);

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

  // Refs for barcode canvas - use object to store refs for multiple assets
  const barcodeRefs = useRef({});
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

  // Generate barcode for a specific asset
  const generateBarcode = (asset, index) => {
    const refKey = `barcode-${asset.asset_id || index}`;
    const barcodeRef = barcodeRefs.current[refKey];
    
    if (!barcodeRef || !asset?.serial_number) return;
    
    // Use setTimeout to ensure DOM is ready
    setTimeout(() => {
      try {
        // Clear previous barcode
        barcodeRef.innerHTML = '';

        // Create canvas element
        const canvas = document.createElement('canvas');
        barcodeRef.appendChild(canvas);

        // Get label dimensions to adjust barcode size
        const isSmallLabel = template.dimensions?.width <= 2 && template.dimensions?.height <= 1;

        // Generate Code128 barcode with proper settings for scanning
        JsBarcode(canvas, asset.serial_number, {
          format: "CODE128",
          width: isSmallLabel ? 2 : 3,
          height: isSmallLabel ? 40 : 60,
          displayValue: false,
          margin: isSmallLabel ? 8 : 12,
          background: "#ffffff",
          lineColor: "#000000",
          fontSize: 0,
          textAlign: "center",
          textPosition: "bottom",
          textMargin: 2
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
        barcodeRef.innerHTML = '<div class="text-red-500 text-xs">Barcode generation failed</div>';
      }
    }, 100);
  };

  // Generate barcodes when assets or template changes
  useEffect(() => {
    assetsToPreview.forEach((asset, index) => {
      generateBarcode(asset, index);
    });
  }, [assetsToPreview.length, template.dimensions?.width, template.dimensions?.height]);

  // Render label with organization data and barcode
  const renderLabelFormat = (asset, template, index) => {
    const refKey = `barcode-${asset.asset_id || index}`;
    return (
      <div
        className="relative w-full h-full p-3 flex flex-col justify-between" // Reduced padding from p-6 to p-3
      >
        {/* Organization Logo and Name (Top Section) */}
        <div className="flex items-center justify-between flex-shrink-0 mb-2"> {/* Reduced margin-bottom from mb-4 to mb-2 */}
          {/* Logo circle with first letter */}
          <div
            className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold" // Reduced from w-8 h-8 to w-6 h-6
            style={{
              fontSize: '12px', // Reduced from 16px to 12px
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
          <div className="text-xs font-bold text-blue-600 text-right flex-1 ml-2 leading-none"> {/* Reduced from text-sm to text-xs */}
            {orgData.name}
          </div>
        </div>

        {/* Serial Number (Center Section) */}
        <div className="text-center my-auto flex-1 flex flex-col justify-center mb-2"> {/* Reduced margin-bottom from mb-4 to mb-2 */}
          <div className="text-xs text-gray-500 font-bold leading-tight">SERIAL NUMBER</div> {/* Reduced from text-md to text-xs */}
          <div className="text-sm font-bold font-mono text-black tracking-wide leading-tight"> {/* Reduced from text-lg to text-sm */}
            {asset?.serial_number}
          </div>
        </div>

        {/* Barcode (Bottom Section) */}
        <div className="flex justify-center flex-shrink-0 pb-2"> {/* Added padding-bottom */}
          <div
            ref={(el) => {
              if (el) {
                barcodeRefs.current[refKey] = el;
                // Generate barcode when ref is set
                generateBarcode(asset, index);
              }
            }}
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

        {/* Label Preview - Show all selected assets */}
        <div className="flex justify-center">
          <div className="space-y-4 w-full">
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              Label Preview ({assetsToPreview.length} {assetsToPreview.length === 1 ? 'Label' : 'Labels'})
            </h3>
            <div className="text-sm text-gray-500 mb-4 text-center">
              Label Size: {template.dimensions?.width}"×{template.dimensions?.height}" |
              Paper: {template.paperType} | 
              Quality: {template.paperQuality} |
              Template: {template?.name || 'Default'} | Format: {getLabelFormat(template)}
            </div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[60vh] overflow-y-auto pb-6">
                {assetsToPreview.map((asset, index) => (
                  <div key={asset.asset_id || index} className="flex flex-col items-center pb-4">
                    <div className="text-xs text-gray-600 mb-2 text-center">
                      {asset.asset_name || `Asset ${index + 1}`}
                    </div>
                    <div
                      className="bg-white border border-gray-200 rounded-lg p-3 overflow-hidden shadow-sm"
                      style={{
                        maxWidth: getLabelMaxWidth(template),
                        aspectRatio: `${template.dimensions?.width} / ${template.dimensions?.height}` || '2 / 1',
                        minHeight: '150px',
                        minWidth: '200px',
                        width: '100%'
                      }}
                    >
                      {renderLabelFormat(asset, template, index)}
                    </div>
                    <div className="text-xs text-gray-500 mt-2 text-center">
                      SN: {asset.serial_number}
                    </div>
                  </div>
                ))}
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