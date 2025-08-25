import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import API from "../lib/axios";
import StatusBadge from "../components/StatusBadge";
import { Card } from "../components/ui/card";
import toast from "react-hot-toast";
import { 
  UserGroupIcon, 
  DocumentTextIcon, 
  WrenchIcon,
  PrinterIcon,
  ClipboardDocumentListIcon,
  CalendarIcon,
  WrenchScrewdriverIcon,
  BuildingOffice2Icon
} from "@heroicons/react/24/outline";

const WorkOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const exportRef = useRef();
  
  const [workOrder, setWorkOrder] = useState(null);
  const [assetDetails, setAssetDetails] = useState(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchWorkOrderDetails();
  }, [id]);

  const fetchWorkOrderDetails = async () => {
    setIsLoading(true);
    try {
      // Fetch work order details
      const woResponse = await API.get(`/reportbreakdown/reports`);
      const workOrderData = woResponse.data?.data?.find(wo => wo.abr_id === id);
      
      if (!workOrderData) {
        toast.error("Work order not found");
        navigate("/workorder-management");
        return;
      }
      
      setWorkOrder(workOrderData);

      // Fetch asset details
      if (workOrderData.asset_id) {
        try {
          const assetResponse = await API.get(`/assets/${workOrderData.asset_id}`);
          setAssetDetails(assetResponse.data?.data || assetResponse.data);
        } catch (err) {
          console.warn("Could not fetch asset details:", err);
        }
      }

      // Fetch maintenance history for the asset
      if (workOrderData.asset_id) {
        try {
          const historyResponse = await API.get(`/maintenance-schedules/asset/${workOrderData.asset_id}`);
          setMaintenanceHistory(historyResponse.data?.data?.slice(0, 5) || []);
        } catch (err) {
          console.warn("Could not fetch maintenance history:", err);
        }
      }

      // Fetch checklist if available
      if (workOrderData.asset_id) {
        try {
          const checklistResponse = await API.get(`/checklist/${workOrderData.asset_id}`);
          setChecklist(checklistResponse.data?.data || []);
        } catch (err) {
          console.warn("Could not fetch checklist:", err);
        }
      }

    } catch (error) {
      console.error("Error fetching work order details:", error);
      toast.error("Failed to fetch work order details");
      navigate("/workorder-management");
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = exportRef.current;
      
      if (!element) {
        throw new Error("Export element not found");
      }

      // Temporarily make the element visible for capture
      const originalStyle = element.style.display;
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '210mm'; // A4 width
      element.style.background = 'white';

      // Wait a bit for the element to render
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: element.scrollWidth,
        height: element.scrollHeight
      });

      // Restore original styling
      element.style.display = originalStyle;
      element.style.position = '';
      element.style.left = '';
      element.style.top = '';
      element.style.width = '';
      element.style.background = '';
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // Convert canvas dimensions to mm (assuming 96 DPI)
      const imgWidthMM = (canvas.width * 25.4) / (96 * 1.5); // 25.4mm per inch, scale factor 1.5
      const imgHeightMM = (canvas.height * 25.4) / (96 * 1.5);
      
      // Calculate scaling to fit page with margins
      const margin = 10; // 10mm margin
      const availableWidth = pdfWidth - (2 * margin);
      const availableHeight = pdfHeight - (2 * margin);
      
      const scaleX = availableWidth / imgWidthMM;
      const scaleY = availableHeight / imgHeightMM;
      const scale = Math.min(scaleX, scaleY, 1); // Don't scale up
      
      const finalWidth = imgWidthMM * scale;
      const finalHeight = imgHeightMM * scale;
      
      // Center the image
      const x = (pdfWidth - finalWidth) / 2;
      const y = margin;

      // Validate coordinates
      if (isNaN(x) || isNaN(y) || isNaN(finalWidth) || isNaN(finalHeight) || 
          x < 0 || y < 0 || finalWidth <= 0 || finalHeight <= 0) {
        throw new Error(`Invalid coordinates: x=${x}, y=${y}, width=${finalWidth}, height=${finalHeight}`);
      }

      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.save(`WorkOrder_${workOrder?.abr_id || id}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("PDF exported successfully");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error(`Failed to export PDF: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  if (!workOrder) {
    return (
      <div className="p-4">
        <div className="text-center">
          <p>Work order not found</p>
          <button 
            onClick={() => navigate("/workorder-management")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Work Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        @media print {
          /* Hide all sidebar elements */
          aside, nav:not(.print-nav), .sidebar, [data-sidebar], .print\\:hidden {
            display: none !important;
          }
          /* Ensure main content takes full width */
          main, .main-content {
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
          }
          /* Clean page layout */
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          /* Page breaks */
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>
      <div className="p-6 bg-gray-50 min-h-screen print:p-5 print:bg-white print:m-0">
      {/* Breadcrumb */}
      <nav className="mb-4 text-sm text-gray-600 print:hidden">
        <div className="flex items-center gap-3">
          <WrenchScrewdriverIcon className="h-4 w-4" />
          <span className="cursor-pointer hover:text-blue-600" onClick={() => navigate("/workorder-management")}>
            Work Orders
          </span>
          <span>/</span>
          <span className="text-gray-900 font-bold">{workOrder.abr_id}</span>
        </div>
      </nav>

      {/* Header with work order title and actions */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {workOrder.description || `Work Order ${workOrder.abr_id}`}
            </h1>
            <StatusBadge status={workOrder.status} className="print:hidden" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              Breakdown Maintenance
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.abr_id}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <PrinterIcon className="w-4 h-4" />
            Print
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-[#0E2F4B] text-white rounded-md disabled:opacity-50"
          >
            <DocumentTextIcon className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 mb-6 print:hidden">
        <nav className="flex space-x-8">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <DocumentTextIcon className="w-5 h-5 inline mr-2" />
            Overview
          </button>

          <button 
            onClick={() => setActiveTab('vendor')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vendor' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BuildingOffice2Icon className="w-5 h-5 inline mr-2" />
            Vendor
          </button>
                    <button
            onClick={() => setActiveTab('checklist')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'checklist'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClipboardDocumentListIcon className="w-5 h-5 inline mr-2" />
            Checklist
          </button>
          <button 
            onClick={() => setActiveTab('activity')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            History
          </button>
        </nav>
      </div>

      {/* Export PDF Only - All Tabs Content (Hidden from Screen) */}
      <div ref={exportRef} className="hidden">
        {/* PDF Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {workOrder.description || `Work Order ${workOrder.abr_id}`}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              Breakdown Maintenance
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.abr_id}</span>
            </span>
          </div>
        </div>


        {/* All Sections for PDF Export */}
        <div className="space-y-8">
          {/* Overview Section */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Overview</h2>
            
            {/* Asset Details */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Asset Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                  <p className="text-gray-900">{workOrder.asset_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <p className="text-gray-900">{assetDetails?.serial_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                  <p className="text-gray-900">{assetDetails?.asset_type_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <p className="text-gray-900">{assetDetails?.branch_name || assetDetails?.department_name || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Date</label>
                  <p className="text-gray-900">{workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Condition</label>
                  <p className="text-gray-900">{assetDetails?.condition || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Additional Issues */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Additional Issues</h3>
              <div className="border p-3 rounded">
                <p className="text-gray-600 text-sm">Document any additional issues found during maintenance that require rectification...</p>
              </div>
            </div>

            {/* Approval Information */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">Approval Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Final Approver's Name</label>
                  <p className="text-gray-900">_____________________</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Supervisor</label>
                  <p className="text-gray-900">_____________________</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
                  <p className="text-gray-900">_____________________</p>
                </div>
              </div>
            </div>
          </section>

          {/* Vendor Section */}
          <section className="page-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Vendor Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <p className="text-gray-900">{assetDetails?.vendor_name || 'Not Assigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
                <p className="text-gray-900">{workOrder.atbrrc_id || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                <p className="text-gray-900">4h response, NBD restore</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                <p className="text-gray-900">{assetDetails?.vendor_contact || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{assetDetails?.vendor_email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{assetDetails?.vendor_address || 'N/A'}</p>
              </div>
            </div>
          </section>

          {/* Checklist Section */}
          <section className="page-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Maintenance Checklist</h2>
            {checklist.length > 0 ? (
              <div className="space-y-3">
                {checklist.map((item, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-900">
                        {item.task_description || item.description || `Task ${index + 1}`}
                      </div>
                      {item.is_mandatory && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">Required</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                  <div className="text-sm text-gray-900">Visual inspection of asset condition</div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                  <div className="text-sm text-gray-900">Check for any visible damage or wear</div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                  <div className="text-sm text-gray-900">Verify asset functionality</div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                  <div className="text-sm text-gray-900">Clean and maintain as per manufacturer guidelines</div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded">
                  <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                  <div className="text-sm text-gray-900">Document any issues found</div>
                </div>
              </div>
            )}
          </section>

          {/* Activity/History Section */}
          <section className="page-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Previous 5 Maintenance Records</h2>
            {maintenanceHistory.length > 0 ? (
              <div className="space-y-4">
                {maintenanceHistory.map((record, index) => (
                  <div key={index} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <WrenchIcon className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{record.maint_type_name || 'Maintenance Activity'}</h3>
                          <p className="text-xs text-gray-500">
                            {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{record.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-500">Vendor:</span> {record.vendor_name || 'N/A'}
                      </div>
                      <div>
                        <span className="text-gray-500">Maintenance ID:</span> {record.ams_id || 'N/A'}
                      </div>
                      {record.act_maint_end_date && (
                        <div>
                          <span className="text-gray-500">Completed:</span> {new Date(record.act_maint_end_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <WrenchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-2">No previous maintenance records found</p>
                <p className="text-sm text-gray-500">This asset has no maintenance history to display.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Print Only - Current Tab Content */}
      <div ref={printRef} className="hidden print:block">
        {/* Print Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {workOrder.description || `Work Order ${workOrder.abr_id}`}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              Breakdown Maintenance
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.abr_id}</span>
            </span>
          </div>
        </div>

        {/* Current Tab Content for Print */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Overview</h2>
              
              {/* Asset Details */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Asset Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                    <p className="text-gray-900">{workOrder.asset_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <p className="text-gray-900">{assetDetails?.serial_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                    <p className="text-gray-900">{assetDetails?.asset_type_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{assetDetails?.branch_name || assetDetails?.department_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Date</label>
                    <p className="text-gray-900">{workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Condition</label>
                    <p className="text-gray-900">{assetDetails?.condition || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Additional Issues */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Additional Issues</h3>
                <div className="border p-3 rounded">
                  <p className="text-gray-600 text-sm">Document any additional issues found during maintenance that require rectification...</p>
                </div>
              </div>

              {/* Approval Information */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Approval Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Approver's Name</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Supervisor</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'vendor' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Vendor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <p className="text-gray-900">{assetDetails?.vendor_name || 'Not Assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
                  <p className="text-gray-900">{workOrder.atbrrc_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                  <p className="text-gray-900">4h response, NBD restore</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                  <p className="text-gray-900">{assetDetails?.vendor_contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{assetDetails?.vendor_email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{assetDetails?.vendor_address || 'N/A'}</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'checklist' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Maintenance Checklist</h2>
              {checklist.length > 0 ? (
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded">
                      <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {item.task_description || item.description || `Task ${index + 1}`}
                        </div>
                        {item.is_mandatory && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">Required</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="text-sm text-gray-900">Visual inspection of asset condition</div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="text-sm text-gray-900">Check for any visible damage or wear</div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="text-sm text-gray-900">Verify asset functionality</div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="text-sm text-gray-900">Clean and maintain as per manufacturer guidelines</div>
                  </div>
                  <div className="flex items-start gap-3 p-3 border rounded">
                    <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                    <div className="text-sm text-gray-900">Document any issues found</div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'activity' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">Previous 5 Maintenance Records</h2>
              {maintenanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {maintenanceHistory.map((record, index) => (
                    <div key={index} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <WrenchIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{record.maint_type_name || 'Maintenance Activity'}</h3>
                            <p className="text-xs text-gray-500">
                              {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{record.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Vendor:</span> {record.vendor_name || 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-500">Maintenance ID:</span> {record.ams_id || 'N/A'}
                        </div>
                        {record.act_maint_end_date && (
                          <div>
                            <span className="text-gray-500">Completed:</span> {new Date(record.act_maint_end_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <WrenchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No previous maintenance records found</p>
                  <p className="text-sm text-gray-500">This asset has no maintenance history to display.</p>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Screen Content (visible only on screen) */}
      <div className="print:hidden space-y-6">
          {/* Overview Tab Content */}
          {activeTab === 'overview' && (
            <>

              {/* Asset Details */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Asset Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset ID</label>
                    <p className="text-gray-900">{workOrder.asset_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                    <p className="text-gray-900">{assetDetails?.serial_number || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type</label>
                    <p className="text-gray-900">{assetDetails?.asset_type_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{assetDetails?.branch_name || assetDetails?.department_name || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Date</label>
                    <p className="text-gray-900">{workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Condition</label>
                    <p className="text-gray-900">{assetDetails?.condition || 'N/A'}</p>
                  </div>
                </div>
              </Card>

              {/* Additional Issues */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Additional Issues</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Issues Identified</label>
                  <textarea 
                    className="w-full p-3 border border-gray-300 rounded-md resize-none"
                    rows="4"
                    placeholder="Document any additional issues found during maintenance that require rectification..."
                  ></textarea>
                </div>
              </Card>

              {/* Approval Section */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">Approval Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Final Approver's Name</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter final approver's name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Supervisor</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter maintenance supervisor's name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
                    <input 
                      type="date" 
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </Card>


            </>
          )}

          {/* Vendor Tab Content */}
          {activeTab === 'vendor' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Vendor Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                  <p className="text-gray-900">{assetDetails?.vendor_name || 'Not Assigned'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
                  <p className="text-gray-900">{workOrder.atbrrc_id || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                  <p className="text-gray-900">4h response, NBD restore</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                  <p className="text-gray-900">{assetDetails?.vendor_contact || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{assetDetails?.vendor_email || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{assetDetails?.vendor_address || 'N/A'}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Checklist Tab Content */}
          {activeTab === 'checklist' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Maintenance Checklist</h2>
              {checklist.length > 0 ? (
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="text-sm text-gray-900">
                        {item.task_description || item.description || `Task ${index + 1}`}
                      </div>
                      {item.is_mandatory && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">Required</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Visual inspection of asset condition</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Check for any visible damage or wear</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Verify asset functionality</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Clean and maintain as per manufacturer guidelines</div>
                  </div>
                  <div className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Document any issues found</div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Activity Tab Content */}
          {activeTab === 'activity' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">Previous 5 Maintenance Records</h2>
              {maintenanceHistory.length > 0 ? (
                <div className="space-y-4">
                  {maintenanceHistory.map((record, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <WrenchIcon className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-sm">{record.maint_type_name || 'Maintenance Activity'}</h3>
                            <p className="text-xs text-gray-500">
                              {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">Vendor:</span> {record.vendor_name || 'N/A'}
                        </div>
                        <div>
                          <span className="text-gray-500">Maintenance ID:</span> {record.ams_id || 'N/A'}
                        </div>
                        {record.act_maint_end_date && (
                          <div>
                            <span className="text-gray-500">Completed:</span> {new Date(record.act_maint_end_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <WrenchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">No previous maintenance records found</p>
                  <p className="text-sm text-gray-500">This asset has no maintenance history to display.</p>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </>
  );
};

export default WorkOrderDetail;
