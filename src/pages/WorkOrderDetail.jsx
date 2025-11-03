import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import API from "../lib/axios";
import StatusBadge from "../components/StatusBadge";
import { Card } from "../components/ui/card";
import toast from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";
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
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
      // Always fetch fresh data from API to ensure all fields (including location) are present
      // Navigation state might be stale or missing new fields
      const woResponse = await API.get(`/work-orders/${id}`);
      let workOrderData = woResponse.data?.data;
      
      if (!workOrderData) {
        toast.error(t('workorderManagement.workOrderNotFound'));
        navigate("/workorder-management");
        return;
      }
      
      // Align fields to new API shape
      const aligned = {
        ...workOrderData,
        final_approver_name: workOrderData.final_approver_name,
        approval_date: Array.isArray(workOrderData.approval_date) ? workOrderData.approval_date[0] : workOrderData.approval_date,
        recent_activities: Array.isArray(workOrderData.recent_activities) ? workOrderData.recent_activities : [],
      };
      console.log('Work Order Data:', workOrderData);
      console.log('Asset Location:', workOrderData.asset?.location);
      setWorkOrder(aligned);

      // Set asset details from the work order response
      if (workOrderData.asset) {
        setAssetDetails(workOrderData.asset);
      }

      // Set checklist from the work order response
      if (workOrderData.asset_type?.checklist_items) {
        setChecklist(workOrderData.asset_type.checklist_items);
      }

      // Use backend-provided recent_activities for history
      setMaintenanceHistory(aligned.recent_activities || []);

    } catch (error) {
      console.error("Error fetching work order details:", error);
      toast.error(t('workorderManagement.failedToFetchWorkOrderDetails'));
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
      pdf.save(`WorkOrder_${workOrder?.ams_id || id}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success(t('workorderManagement.pdfExportedSuccessfully'));
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error(t('workorderManagement.failedToExportPDF') + `: ${error.message}`);
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
          <p>{t('workorderManagement.workOrderNotFound')}</p>
          <button 
            onClick={() => navigate("/workorder-management")}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            {t('workorderManagement.backToWorkOrders')}
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
            {t('workorderManagement.workOrders')}
          </span>
          <span>/</span>
          <span className="text-gray-900 font-bold">{workOrder.ams_id}</span>
        </div>
      </nav>

      {/* Header with work order title and actions */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {workOrder.maintenance_type_name || `Work Order ${workOrder.ams_id}`}
            </h1>
            <StatusBadge status={workOrder.status} className="print:hidden" />
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              {workOrder.maintenance_type_name || t('workorderManagement.maintenance')}
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.ams_id}</span>
            </span>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            <PrinterIcon className="w-4 h-4" />
            {t('workorderManagement.print')}
          </button>
          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 bg-[#0E2F4B] text-white rounded-md disabled:opacity-50"
          >
            <DocumentTextIcon className="w-4 h-4" />
            {isExporting ? t('workorderManagement.exporting') : t('workorderManagement.exportPDF')}
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
            {t('workorderManagement.overview')}
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
            {t('workorderManagement.vendor')}
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
            {t('workorderManagement.checklist')}
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
            {t('workorderManagement.history')}
          </button>
        </nav>
      </div>

      {/* Export PDF Only - All Tabs Content (Hidden from Screen) */}
      <div ref={exportRef} className="hidden">
        {/* PDF Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {workOrder.maintenance_type_name || `Work Order ${workOrder.ams_id}`}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              {workOrder.maintenance_type_name || t('workorderManagement.maintenance')}
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.ams_id}</span>
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
              <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.assetInformation')}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetID')}</label>
                  <p className="text-gray-900">{workOrder.asset_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.serialNumber')}</label>
                  <p className="text-gray-900">{assetDetails?.serial_number || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetType')}</label>
                  <p className="text-gray-900">{assetDetails?.asset_type_name || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.location')}</label>
                  <p className="text-gray-900">{assetDetails?.location || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceDate')}</label>
                  <p className="text-gray-900">{workOrder.created_at ? new Date(workOrder.created_at).toLocaleDateString() : t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.currentCondition')}</label>
                  <p className="text-gray-900">{assetDetails?.condition || t('workorderManagement.notAvailable')}</p>
                </div>
              </div>
            </div>

            {/* {t('workorderManagement.additionalIssues')} */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.additionalIssues')}</h3>
              <div className="border p-3 rounded">
                <p className="text-gray-600 text-sm">Document any additional issues found during maintenance that require rectification...</p>
              </div>
            </div>

            {/* {t('workorderManagement.approvalInformation')} */}
            {workOrder.wfamsh_id && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.approvalInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.finalApproverName')}</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceSupervisor')}</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.approvalDate')}</label>
                    <p className="text-gray-900">_____________________</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Vendor Section */}
          <section className="page-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.vendorInformation')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.vendorName')}</label>
                <p className="text-gray-900">{assetDetails?.vendor_name || t('workorderManagement.notAssigned')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
                <p className="text-gray-900">{workOrder.atbrrc_id || t('workorderManagement.notAvailable')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SLA</label>
                <p className="text-gray-900">4h response, NBD restore</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Information</label>
                <p className="text-gray-900">{assetDetails?.vendor_contact || t('workorderManagement.notAvailable')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.email')}</label>
                <p className="text-gray-900">{assetDetails?.vendor_email || t('workorderManagement.notAvailable')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <p className="text-gray-900">{assetDetails?.vendor_address || t('workorderManagement.notAvailable')}</p>
              </div>
            </div>
          </section>

          {/* Checklist Section */}
          <section className="page-break">
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.maintenanceChecklist')}</h2>
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
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">{t('workorderManagement.required')}</span>
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
            <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.previous5MaintenanceRecords')}</h2>
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
                          <h3 className="font-medium text-sm">{record.maint_type_name || t('workorderManagement.maintenanceActivity')}</h3>
                          <p className="text-xs text-gray-500">
                            {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : t('workorderManagement.notAvailable')}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{record.status}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                      <div>
                        <span className="text-gray-500">{t('workorderManagement.vendorLabel')}</span> {record.vendor_name || t('workorderManagement.notAvailable')}
                      </div>
                      <div>
                        <span className="text-gray-500">{t('workorderManagement.maintenanceIDLabel')}</span> {record.ams_id || t('workorderManagement.notAvailable')}
                      </div>
                      {record.act_maint_end_date && (
                        <div>
                          <span className="text-gray-500">{t('workorderManagement.completed')}:</span> {new Date(record.act_maint_end_date).toLocaleDateString()}
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
            {workOrder.maintenance_type_name || `Work Order ${workOrder.ams_id}`}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <span className="flex items-center gap-1">
              <WrenchIcon className="w-4 h-4" />
              {workOrder.maintenance_type_name || t('workorderManagement.maintenance')}
            </span>
            <span className="flex items-center gap-1">
              <DocumentTextIcon className="w-4 h-4" />
              <span className="font-bold">{workOrder.ams_id}</span>
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
                <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.assetInformation')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetID')}</label>
                    <p className="text-gray-900">{workOrder.asset?.asset_id || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.serialNumber')}</label>
                    <p className="text-gray-900">{workOrder.asset?.serial_number || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetType')}</label>
                    <p className="text-gray-900">{workOrder.asset_type?.asset_type_name || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.location')}</label>
                    <p className="text-gray-900">{workOrder.asset?.location || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceDate')}</label>
                    <p className="text-gray-900">{workOrder.act_maint_st_date ? new Date(workOrder.act_maint_st_date).toLocaleDateString() : t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.currentCondition')}</label>
                    <p className="text-gray-900">{workOrder.asset?.condition || t('workorderManagement.notAvailable')}</p>
                  </div>
                </div>
              </div>

              {/* {t('workorderManagement.additionalIssues')} */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.additionalIssues')}</h3>
                <div className="border p-3 rounded">
                  <p className="text-gray-600 text-sm">Document any additional issues found during maintenance that require rectification...</p>
                </div>
              </div>

              {/* {t('workorderManagement.approvalInformation')} */}
              {workOrder.wfamsh_id && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">{t('workorderManagement.approvalInformation')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.finalApproverName')}</label>
                      <p className="text-gray-900">_____________________</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceSupervisor')}</label>
                      <p className="text-gray-900">_____________________</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.approvalDate')}</label>
                      <p className="text-gray-900">_____________________</p>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === 'vendor' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.vendorInformation')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.vendorName')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.vendor_name || t('workorderManagement.notAssigned')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.contactPerson')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.contact_person || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.email')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.email || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.phone')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.phone || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceType')}</label>
                  <p className="text-gray-900">{workOrder.maintenance_type_name || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.status')}</label>
                  <p className="text-gray-900">{workOrder.status || t('workorderManagement.notAvailable')}</p>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'checklist' && (
            <section>
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.maintenanceChecklist')}</h2>
              {checklist.length > 0 ? (
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 border rounded">
                      <div className="w-4 h-4 border border-gray-400 rounded mt-1"></div>
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {item.text || item.task_description || item.description || `Task ${index + 1}`}
                        </div>
                        {item.is_mandatory && (
                          <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">{t('workorderManagement.required')}</span>
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
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">{t('workorderManagement.previous5MaintenanceRecords')}</h2>
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
                            <h3 className="font-medium text-sm">{record.status || 'Activity'}</h3>
                            <p className="text-xs text-gray-500">
                              {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : t('workorderManagement.notAvailable')}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{record.status}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">{t('workorderManagement.notes')}:</span> {record.notes || t('workorderManagement.notAvailable')}
                        </div>
                        <div>
                          <span className="text-gray-500">{t('workorderManagement.workOrderID')}:</span> {record.wo_id || record.ams_id || t('workorderManagement.notAvailable')}
                        </div>
                        {record.act_main_end_date && (
                          <div>
                            <span className="text-gray-500">{t('workorderManagement.completed')}:</span> {new Date(record.act_main_end_date).toLocaleDateString()}
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
                <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.assetInformation')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetID')}</label>
                    <p className="text-gray-900">{workOrder.asset?.asset_id || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.serialNumber')}</label>
                    <p className="text-gray-900">{workOrder.asset?.serial_number || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.assetType')}</label>
                    <p className="text-gray-900">{workOrder.asset_type?.asset_type_name || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.location')}</label>
                    <p className="text-gray-900">{workOrder.asset?.location || t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceDate')}</label>
                    <p className="text-gray-900">{workOrder.act_maint_st_date ? new Date(workOrder.act_maint_st_date).toLocaleDateString() : t('workorderManagement.notAvailable')}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.currentCondition')}</label>
                    <p className="text-gray-900">{workOrder.asset?.condition || t('workorderManagement.notAvailable')}</p>
                  </div>
                </div>
              </Card>

              {/* {t('workorderManagement.additionalIssues')} */}
              <Card className="p-6">
                <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.additionalIssues')}</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('workorderManagement.additionalIssues')} Identified</label>
                  <div className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900 min-h-[96px] whitespace-pre-line">
                    {workOrder.notes || t('workorderManagement.notAvailable')}
                  </div>
                </div>
              </Card>

              {/* Approval Section */}
              {workOrder.wfamsh_id && (
                <Card className="p-6">
                  <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.approvalInformation')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.finalApproverName')}</label>
                      <p className="text-gray-900">{workOrder.final_approver_name || t('workorderManagement.notAvailable')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceSupervisor')}</label>
                      <p className="text-gray-900">{workOrder.technician_name || t('workorderManagement.notAvailable')}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.approvalDate')}</label>
                      <p className="text-gray-900">{workOrder.approval_date ? new Date(workOrder.approval_date).toLocaleDateString('en-GB').replaceAll('/', '-') : t('workorderManagement.notAvailable')}</p>
                    </div>
                  </div>
                </Card>
              )}


            </>
          )}

          {/* Vendor Tab Content */}
          {activeTab === 'vendor' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.vendorInformation')}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.vendorName')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.vendor_name || t('workorderManagement.notAssigned')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.contactPerson')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.contact_person || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.email')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.email || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.phone')}</label>
                  <p className="text-gray-900">{workOrder.vendor?.phone || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.maintenanceType')}</label>
                  <p className="text-gray-900">{workOrder.maintenance_type_name || t('workorderManagement.notAvailable')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('workorderManagement.status')}</label>
                  <p className="text-gray-900">{workOrder.status || t('workorderManagement.notAvailable')}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Checklist Tab Content */}
          {activeTab === 'checklist' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.maintenanceChecklist')}</h2>
              {checklist.length > 0 ? (
                <div className="space-y-3">
                  {checklist.map((item, index) => (
                    <div key={index} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="text-sm text-gray-900">
                        {item.text || item.task_description || item.description || `Task ${index + 1}`}
                      </div>
                      {item.is_mandatory && (
                        <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded mt-2 inline-block">{t('workorderManagement.required')}</span>
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
              <h2 className="text-lg font-semibold mb-4">{t('workorderManagement.previous5MaintenanceRecords')}</h2>
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
                            <h3 className="font-medium text-sm">{record.maint_type_name || t('workorderManagement.maintenanceActivity')}</h3>
                            <p className="text-xs text-gray-500">
                              {record.act_maint_st_date ? new Date(record.act_maint_st_date).toLocaleDateString() : t('workorderManagement.notAvailable')}
                            </p>
                          </div>
                        </div>
                        <StatusBadge status={record.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm mt-3">
                        <div>
                          <span className="text-gray-500">{t('workorderManagement.vendorLabel')}</span> {workOrder.vendor?.vendor_name || t('workorderManagement.notAvailable')}
                        </div>
                        <div>
                          <span className="text-gray-500">{t('workorderManagement.maintenanceIDLabel')}</span> {record.ams_id || t('workorderManagement.notAvailable')}
                        </div>
                        {record.act_maint_end_date && (
                          <div>
                            <span className="text-gray-500">{t('workorderManagement.completed')}:</span> {new Date(record.act_maint_end_date).toLocaleDateString()}
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
