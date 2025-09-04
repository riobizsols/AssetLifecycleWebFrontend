import React, { useState, useEffect, useRef, useMemo } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaShareAlt } from "react-icons/fa";
import {
  SectionTitle,
  Chip,
  Input,
  Select,
  DropdownMultiSelect,
  DateRange,
  SearchableSelect,
  AdvancedBuilder,
  DropdownMenu,
  GroupedField,
  formatISO,
  getCurrentFYBounds,
  showToast
} from "./ReportComponents";
import { generateComprehensiveReport } from "../../utils/reportGenerator";
import ReportDisplay from "./ReportDisplay";

export default function ReportLayout({ 
  report, 
  selectedReportId, 
  allRows, 
  allAvailableAssets,
  filteredRows, 
  quick, 
  setQuick, 
  setQuickField,
  advanced, 
  setAdvanced, 
  columns, 
  setColumns, 
  views, 
  setViews,
  loading,
  error,
  apiData,
  exportService
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const saveInputRef = useRef(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const cols = columns || report.defaultColumns;

  const hasFilters = useMemo(() => {
    const quickHasFilters = Object.values(quick).some((v) => (Array.isArray(v) ? v.length > 0 : !!v));
    const advancedHasFilters = advanced.length > 0;
    return quickHasFilters || advancedHasFilters;
  }, [quick, advanced]);

  // Calculate totals for asset valuation
  const totals = useMemo(() => {
    if (selectedReportId !== "asset-valuation") return null;
    
    // Use API summary data if available, otherwise calculate from filtered rows
    if (apiData?.summary) {
      return {
        inUse: apiData.summary.inUse?.total_current_value || 0,
        scrap: apiData.summary.scrap?.total_current_value || 0,
        total: apiData.summary.overall?.total_current_value || 0,
        inUseCount: apiData.summary.inUse?.asset_count || 0,
        scrapCount: apiData.summary.scrap?.asset_count || 0,
        totalCount: apiData.summary.overall?.asset_count || 0
      };
    }
    
    // Fallback to calculating from filtered rows
    const inUseAssets = filteredRows.filter(row => row["Asset Status"] === "In-Use");
    const scrapAssets = filteredRows.filter(row => row["Asset Status"] === "Scrap");
    
    const inUseTotal = inUseAssets.reduce((sum, row) => sum + parseFloat(row["Current Value"] || 0), 0);
    const scrapTotal = scrapAssets.reduce((sum, row) => sum + parseFloat(row["Current Value"] || 0), 0);
    const grandTotal = inUseTotal + scrapTotal;
    
    return {
      inUse: inUseTotal,
      scrap: scrapTotal,
      total: grandTotal,
      inUseCount: inUseAssets.length,
      scrapCount: scrapAssets.length,
      totalCount: filteredRows.length
    };
  }, [filteredRows, selectedReportId, apiData?.summary]);

  // Saved views for this report
  const filteredViews = useMemo(() => {
    return (views || []).filter((v) => v.reportId === selectedReportId);
  }, [views, selectedReportId]);

  // Get filter options from API data or fallback to domain
  const getFilterOptions = (fieldKey) => {
    if (!apiData?.filterOptions) return null;
    
    const filterOptions = apiData.filterOptions;
    switch (fieldKey) {
      case 'category':
        return filterOptions.categories || [];
      case 'location':
        return filterOptions.locations || [];
      case 'department':
        return filterOptions.departments || [];
      case 'vendor':
        return filterOptions.vendors || [];
      default:
        return null;
    }
  };

  const activeChips = useMemo(() => {
    const chips = [];
    report.quickFields.forEach((f) => {
      const v = quick[f.key];
      if (!v || (Array.isArray(v) && v.length === 0)) return;
      
      // Handle grouped fields
      if (f.type === "group") {
        // Check if any sub-fields have values
        const hasSubValues = f.subFields.some(subField => {
          const subVal = v[subField.key];
          return subVal && (Array.isArray(subVal) ? subVal.length > 0 : subVal !== "");
        });
        
        if (hasSubValues) {
          // Show individual sub-field chips instead of the group
          f.subFields.forEach(subField => {
            const subVal = v[subField.key];
            if (subVal && (Array.isArray(subVal) ? subVal.length > 0 : subVal !== "")) {
              if (subField.type === "daterange") {
                chips.push(`${subField.label}: ${subVal[0]} → ${subVal[1]}`);
              } else if (Array.isArray(subVal)) {
                chips.push(`${subField.label}: ${subVal.join(", ")}`);
              } else {
                chips.push(`${subField.label}: ${subVal}`);
              }
            }
          });
        }
      } else if (f.type === "daterange") {
        chips.push(`${f.label}: ${v[0]} → ${v[1]}`);
      } else if (Array.isArray(v)) {
        chips.push(`${f.label}: ${v.join(", ")}`);
      } else {
        chips.push(`${f.label}: ${v}`);
      }
    });
    (advanced || []).forEach((r, idx) => {
      if (!r.field) return;
      const field = report.fields.find(f => f.key === r.field);
      const label = field ? field.label : r.field;
      const val = Array.isArray(r.val) ? r.val.join(", ") || "–" : r.val ?? "–";
      chips.push(`${label} ${r.op} ${val}`);
    });
    return chips;
  }, [quick, advanced, report]);



  const clearAll = () => {
    setQuick({});
    setAdvanced([]);
  };

  const handlePreviewReport = async () => {
    try {
      const reportData = generateComprehensiveReport({
        report,
        filteredRows,
        quick,
        advanced,
        columns: cols
      });
      
      setGeneratedReport(reportData);
    } catch (error) {
      console.error('Error generating report preview:', error);
      showToast("Error generating report preview. Please try again.", "error");
    }
  };

  const handleGenerateReport = async (format = 'pdf') => {
    setIsGeneratingReport(true);
    try {
      // For asset-valuation report, use the comprehensive export functionality
      if (report.id === 'asset-valuation') {
        await handleAssetValuationExport(format);
        return;
      }

      // For other reports, use the existing PDF generation
      const reportData = generateComprehensiveReport({
        report,
        filteredRows,
        quick,
        advanced,
        columns: cols
      });
      
      console.log('🔍 [handleGenerateReport] Generated report data:', reportData);
      
      // Directly export to PDF
      const { exportReportToPDF } = await import('../../utils/reportGenerator');
      
      // Call PDF export without showing toast
      exportReportToPDF(reportData);
      
    } catch (error) {
      console.error('Error generating report:', error);
      showToast("Error generating report. Please try again.", "error");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleAssetValuationExport = async (format) => {
    try {
      // Import the asset valuation service
      const { assetValuationService } = await import('../../services/assetValuationService');
      
      // Prepare filters for the API call
      const apiFilters = {
        assetStatus: quick.assetStatus && quick.assetStatus.length > 0 ? quick.assetStatus[0] : null,
        includeScrapAssets: quick.includeScrapAssets === 'Yes',
        currentValueMin: quick.currentValueRange || null,
        category: quick.category || null,
        location: quick.location || null,
        acquisitionDateFrom: quick.acquisitionDateRange?.[0] || null,
        acquisitionDateTo: quick.acquisitionDateRange?.[1] || null,
        page: 1,
        limit: 10000
      };

      let blob;
      let filename;
      let mimeType;

      switch (format) {
        case 'pdf':
          // For PDF, use the same comprehensive logic as Export PDF
          exportPDF();
          return; // PDF export doesn't need blob download
          
        case 'excel':
          blob = await assetValuationService.exportToExcel(apiFilters);
          filename = `Asset_Valuation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'csv':
          blob = await assetValuationService.exportToCSV(apiFilters);
          filename = `Asset_Valuation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          blob = await assetValuationService.exportToJSON(apiFilters);
          filename = `Asset_Valuation_Report_${new Date().toISOString().slice(0, 10)}.json`;
          mimeType = 'application/json';
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast(`Asset Valuation report exported successfully as ${format.toUpperCase()}!`, "success");
      
    } catch (error) {
      console.error('Error exporting asset valuation report:', error);
      showToast(`Error exporting ${format.toUpperCase()} report. Please try again.`, "error");
    }
  };

  const closeReportDisplay = () => {
    setGeneratedReport(null);
  };

  const saveView = () => {
    if (!viewName.trim()) return;
    setViews([...views, { id: crypto.randomUUID(), name: viewName, reportId: report.id, quick, advanced, columns: cols }]);
    setIsSaving(false);
    setViewName("");
  };

  useEffect(() => {
    if (isSaving) {
      const handleClickOutside = (event) => {
        if (saveInputRef.current && !saveInputRef.current.contains(event.target)) {
          setIsSaving(false);
          setViewName("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSaving]);

  // Load a saved view
  const applyView = (v) => {
    if (!v) return;
    setQuick(v.quick || {});
    setAdvanced(v.advanced || []);
    setColumns(v.columns || null);
  };

  // Saved views dropdown + share modal state
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetView, setShareTargetView] = useState(null);
  const [shareUser, setShareUser] = useState("");
  const savedRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (savedRef.current && !savedRef.current.contains(e.target)) setIsSavedOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportCSV = () => {
    let csvContent = [];
    
    // Add report header
    csvContent.push(`${report.name} Report`);
    csvContent.push(`Generated on: ${new Date().toLocaleString()}`);
    csvContent.push(''); // Empty line for spacing
    
    // Add Asset Valuation Summary for asset-valuation report
    if (totals) {
      csvContent.push('ASSET VALUATION SUMMARY');
      csvContent.push('Current market values based on applied filters');
      csvContent.push(''); // Empty line for spacing
      
      // Add summary data
      csvContent.push('Metric,Value,Count');
      csvContent.push(`In-Use Assets Value,₹${totals.inUse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${totals.inUseCount} active assets`);
      csvContent.push(`Scrap Assets Value,₹${totals.scrap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${totals.scrapCount} disposed assets`);
      csvContent.push(`Total Portfolio Value,₹${totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${totals.totalCount} total assets`);
      csvContent.push(`Average Asset Value,₹${totals.totalCount > 0 ? (totals.total / totals.totalCount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'},per asset`);
      csvContent.push(''); // Empty line for spacing
    }
    
    // Add table headers
    csvContent.push(cols.join(","));
    
    // Add table data
    filteredRows.forEach(row => {
      csvContent.push(cols.map(col => JSON.stringify(row[col] ?? "")).join(","));
    });
    
    const csv = csvContent.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;
    let yPosition = margin;
    
    // Set up fonts and styles
    doc.setFont("helvetica");
    
    // Report Header
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(`${report.name} Report`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 30;
    
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 40;
    
    // Asset Valuation Summary Section
    if (totals) {
      // Summary Section Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("ASSET VALUATION SUMMARY", margin, yPosition);
      yPosition += 25;
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Current market values based on applied filters", margin, yPosition);
      yPosition += 30;
      
      // Summary Table
      const summaryData = [
        ["Metric", "Value", "Count"],
        ["In-Use Assets Value", `₹${totals.inUse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${totals.inUseCount} active assets`],
        ["Scrap Assets Value", `₹${totals.scrap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${totals.scrapCount} disposed assets`],
        ["Total Portfolio Value", `₹${totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${totals.totalCount} total assets`],
        ["Average Asset Value", `₹${totals.totalCount > 0 ? (totals.total / totals.totalCount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}`, "per asset"]
      ];
      
      autoTable(doc, {
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: yPosition,
        styles: { 
          fontSize: 10, 
          cellPadding: 6,
          lineColor: [200, 200, 200],
          lineWidth: 0.1
        },
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 80 },
          1: { cellWidth: 100, halign: 'right' },
          2: { cellWidth: 80, halign: 'center' }
        },
        margin: { left: margin, right: margin }
      });
      
      yPosition = doc.lastAutoTable.finalY + 30;
    }
    
    // Main Data Table
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("DETAILED ASSET DATA", margin, yPosition);
    yPosition += 25;
    
    const tableColumn = cols;
    const tableRows = filteredRows.map((r) => cols.map((c) => r[c] ?? ""));
    
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: yPosition,
      styles: { 
        fontSize: 8, 
        cellPadding: 4,
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [41, 128, 185],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      columnStyles: {
        // Right-align numeric columns
        'Current Value': { halign: 'right' },
        'Original Cost': { halign: 'right' },
        'Accumulated Depreciation': { halign: 'right' },
        'Net Book Value': { halign: 'right' },
        'Useful Life': { halign: 'center' }
      },
      margin: { left: margin, right: margin },
      didDrawPage: function (data) {
        // Add page numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(10);
          doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: "right" });
        }
      }
    });
    
    // Save the PDF
    doc.save(`${report.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportOptions = [{ label: "Export as CSV", action: exportCSV }, { label: "Export as PDF", action: exportPDF }];

  // Mock users for sharing (this should come from props or context in real app)
  const USERS = ["Arun Kumar", "Divya T", "Shweta", "Rahul", "Sanjay"];

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-slate-500 text-sm">Build, filter, preview, export & schedule your ALM reports.</p>
          </div>
          <div className="flex items-center gap-2"> 
            {filteredViews.length > 0 && (
              <div className="relative" ref={savedRef}>
                <button onClick={() => setIsSavedOpen(!isSavedOpen)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                  Saved views
                </button>
                {isSavedOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-300 rounded-xl shadow-lg z-20">
                    <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                      {filteredViews.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-sm truncate" title={v.name}>{v.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { applyView(v); setIsSavedOpen(false); }} className="px-2 py-1 text-xs rounded-md bg-[#143d65] text-white">Load</button>
                            <button onClick={() => { setShareTargetView(v); setIsShareOpen(true); }} title="Share" className="px-2 py-1 text-xs rounded-md border border-slate-300"><FaShareAlt /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {isSaving ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveView();
                }}
                ref={saveInputRef}
              >
                <Input
                  value={viewName}
                  onChange={setViewName}
                  placeholder="View name"
                  className="w-40"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm"
                  disabled={!viewName.trim()}
                >
                  Save
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSaving(true)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasFilters}
              >
                Save View
              </button>
            )}
            {hasFilters && (
              <button onClick={clearAll} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                Clear
              </button>
            )}
            <DropdownMenu label="Export" options={exportOptions} />
          </div>
        </div>
        
        {/* Total Value Display for Asset Valuation */}
        {totals && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-slate-900">Asset Valuation Summary</h3>
              <p className="text-sm text-slate-600">Current market values based on applied filters</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">In-Use Assets Value</p>
                    <p className="text-lg font-semibold text-green-900">₹{totals.inUse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-green-600">{totals.inUseCount} active assets</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">Scrap Assets Value</p>
                    <p className="text-lg font-semibold text-red-900">₹{totals.scrap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-red-600">{totals.scrapCount} disposed assets</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Total Portfolio Value</p>
                    <p className="text-lg font-semibold text-blue-900">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-blue-600">{totals.totalCount} total assets</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">Average Asset Value</p>
                    <p className="text-lg font-semibold text-gray-900">₹{totals.totalCount > 0 ? (totals.total / totals.totalCount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}</p>
                    <p className="text-xs text-gray-600">per asset</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {(apiData?.loading || loading) && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-blue-700 font-medium">Loading asset valuation data...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {(apiData?.error || error) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-red-600">⚠️</div>
              <div>
                <span className="text-red-700 font-medium">Error loading data:</span>
                <p className="text-red-600 text-sm mt-1">{apiData?.error || error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Layout */}
        <div className="grid grid-cols-12 gap-5">
          {/* Right: Filters + Preview (full width) */}
          <main className={`col-span-12 flex flex-col`}>
            {/* Quick Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{report.name}</div>
                  <div className="text-sm text-slate-500">{report.description}</div>
                </div>
                <div>
                  <button onClick={() => showToast("In-app, a schedule with current filters would be configured.")} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm whitespace-nowrap">
                    Schedule…
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-12 gap-4">
                {report.quickFields.map((f) => (
                  <div key={f.key} className="col-span-12 md:col-span-6 xl:col-span-3">
                    <div className="text-xs font-medium text-slate-600 mb-1">{f.label}</div>
                    {f.type === "daterange" && <DateRange value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} preset={f.preset} />}
                    {f.type === "select" && <Select value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} options={getFilterOptions(f.key) || f.domain || []} />}
                    {f.type === "multiselect" && <DropdownMultiSelect values={quick[f.key] || []} onChange={(v) => setQuickField(f.key, v)} options={getFilterOptions(f.key) || f.domain || []} />}
                    {f.type === "searchable" && (() => {
                      // For searchable fields, use allAvailableAssets for options (not filtered data)
                      // This ensures dropdown always shows all available options
                      const options = f.key === "assetId" ? (allAvailableAssets || allRows).map(row => ({
                        value: row["Asset ID"],
                        label: `${row["Asset ID"]} - ${row["Asset Name"]}`
                      })) : f.key === "workOrderId" ? (allAvailableAssets || allRows).map(row => ({
                        value: row["Work Order ID"],
                        label: row["Work Order ID"]
                      })) : (getFilterOptions(f.key) || f.domain || []);
                      
                      console.log(`🔍 [ReportLayout] ${f.key} options:`, options.length, options.slice(0, 3));
                      
                      return (
                        <SearchableSelect 
                          value={quick[f.key]} 
                          onChange={(v) => setQuickField(f.key, v)} 
                          options={options} 
                          placeholder={f.placeholder || "Search..."} 
                        />
                      );
                    })()}
                    {f.type === "number" && <Input type="number" value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} placeholder={f.placeholder} />}
                    {f.type === "text" && <Input value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} placeholder={f.placeholder} />}
                    {f.type === "group" && (
                      <GroupedField
                        field={f}
                        value={quick[f.key]}
                        onChange={(v) => setQuickField(f.key, v)}
                        onSubFieldChange={(subKey, subValue) => {
                          const currentValue = quick[f.key] || {};
                          const newValue = { ...currentValue, [subKey]: subValue };
                          setQuickField(f.key, newValue);
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Advanced */}
              <div className="mt-4">
                <AdvancedBuilder fields={report.fields} value={advanced} onChange={setAdvanced} />
              </div>
              {/* Active Chips */}
              <div className="mt-3">
                <SectionTitle>Active Filters</SectionTitle>
                <div className="flex flex-wrap">
                  {activeChips.length === 0 && <span className="text-sm text-slate-500">None</span>}
                  {activeChips.map((c, idx) => (
                    <Chip key={idx} label={c} />
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button 
                  onClick={handlePreviewReport}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm hover:bg-gray-50"
                >
                  Preview
                </button>
                
                {/* Generate Report Button - Show dropdown for asset-valuation */}
                {report.id === 'asset-valuation' ? (
                  <DropdownMenu
                    label={isGeneratingReport ? 'Generating...' : 'Generate Report'}
                    options={[
                      {
                        label: 'PDF Report',
                        action: () => handleGenerateReport('pdf')
                      },
                      {
                        label: 'Excel Report',
                        action: () => handleGenerateReport('excel')
                      },
                      {
                        label: 'CSV Report',
                        action: () => handleGenerateReport('csv')
                      },
                      {
                        label: 'JSON Report',
                        action: () => handleGenerateReport('json')
                      }
                    ]}
                  />
                ) : (
                  <button 
                    onClick={() => handleGenerateReport('pdf')}
                    disabled={isGeneratingReport}
                    className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1e5a8a]"
                  >
                    {isGeneratingReport ? 'Generating...' : 'Generate Report'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Preview Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">Preview • {filteredRows.length} rows</div>
                {/* Column chooser (add/remove) */}
                <div className="flex items-center gap-2">
                  <SearchableSelect
                    onChange={(c) => setColumns([...cols, c])}
                    options={Object.values(report.allColumns || {}).flat().filter(c => !cols.includes(c))}
                    placeholder="Add column…"
                  />
                  <SearchableSelect
                    onChange={(c) => setColumns(cols.filter((col) => col !== c))}
                    options={cols}
                    placeholder="Remove column…"
                  />
                  <button onClick={() => setColumns(report.defaultColumns)} className="text-sm px-3 py-1 rounded-lg bg-white border border-slate-300">
                    Reset
                  </button>
                </div>
              </div>
              <div className="overflow-auto h-[calc(100%-48px)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {cols.map((col) => (
                        <th key={col} className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            {col}
                            <button
                              type="button"
                              title="Remove column"
                              onClick={(e) => {
                                e.stopPropagation();
                                setColumns((prev) => (prev || cols).filter((c) => c !== col));
                              }}
                              className="text-slate-400 hover:text-red-600"
                            >
                              ×
                            </button>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-slate-50">
                        {cols.map((c) => (
                          <td key={c} className="px-3 py-2 border-b border-slate-100 whitespace-nowrap">
                            {String(r[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
      
      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-[360px] p-4">
            <div className="text-lg font-semibold mb-2">Share View</div>
            <div className="text-sm text-slate-600 mb-3 truncate">{shareTargetView?.name}</div>
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-600 mb-1">Select user</div>
              <Select value={shareUser} onChange={setShareUser} options={USERS} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsShareOpen(false)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">Cancel</button>
              <button onClick={() => { /* integrate share */ setIsShareOpen(false); }} className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm" disabled={!shareUser.trim()}>Share</button>
            </div>
          </div>
        </div>
      )}

      {/* Report Display Modal */}
      {generatedReport && (
        <ReportDisplay 
          reportData={generatedReport} 
          onClose={closeReportDisplay} 
        />
      )}
    </div>
  );
}
