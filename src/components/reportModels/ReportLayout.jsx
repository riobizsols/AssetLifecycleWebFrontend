import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaShareAlt } from "react-icons/fa";
import { generateUUID } from '../../utils/uuid';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
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
import { useTranslatedReport, getTranslatedColumnHeader } from "../../utils/reportTranslations";
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
  exportService,
  onGenerateReport,
  onExportReport,
  hideTable = false,
  hideAdvancedFilters = false,
  hideGenerateReport = false,
  onPreviewReport
}) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const saveInputRef = useRef(null);
  const [generatedReport, setGeneratedReport] = useState(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [selectedAssetType, setSelectedAssetType] = useState(null);
  const [showAssetTypeModal, setShowAssetTypeModal] = useState(false);

  // Get translated report configuration
  const translatedReport = useTranslatedReport(report);
  
  // Auto-add property columns to visible columns when property filter is applied
  const cols = useMemo(() => {
    const baseCols = columns || translatedReport.defaultColumns;
    const propertyFilter = (advanced || []).find(r => r.field === 'property' && r.val && typeof r.val === 'object' && r.val.property);
    
    if (propertyFilter && propertyFilter.val.property) {
      const propertyColumn = `Property: ${propertyFilter.val.property}`;
      // Check if property column exists in allColumns and add it if not already in cols
      const allCols = translatedReport.allColumns || [];
      const hasPropertyColumn = allCols.includes(propertyColumn);
      
      if (hasPropertyColumn && !baseCols.includes(propertyColumn)) {
        // Auto-add the property column to visible columns
        return [...baseCols, propertyColumn];
      }
    }
    
    return baseCols;
  }, [columns, translatedReport.defaultColumns, translatedReport.allColumns, advanced]);
  
  // Update columns state when property filter is applied to persist the property column
  useEffect(() => {
    const propertyFilter = (advanced || []).find(r => r.field === 'property' && r.val && typeof r.val === 'object' && r.val.property);
    
    if (propertyFilter && propertyFilter.val.property) {
      const propertyColumn = `Property: ${propertyFilter.val.property}`;
      const allCols = translatedReport.allColumns || [];
      const hasPropertyColumn = allCols.includes(propertyColumn);
      const currentCols = columns || translatedReport.defaultColumns;
      
      if (hasPropertyColumn && !currentCols.includes(propertyColumn)) {
        // Update columns state to include the property column
        setColumns([...currentCols, propertyColumn]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advanced, translatedReport.allColumns]);

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

  // Calculate chart data grouped by asset type (Category) for asset valuation
  const chartDataByAssetType = useMemo(() => {
    if (selectedReportId !== "asset-valuation" || !filteredRows || filteredRows.length === 0) return [];
    
    // Group by Category (Asset Type) and sum values
    const grouped = {};
    
    filteredRows.forEach(row => {
      const category = row["Category"] || "Unknown";
      const currentValue = parseFloat(row["Current Value"] || 0);
      const netBookValue = parseFloat(row["Net Book Value"] || 0);
      
      if (!grouped[category]) {
        grouped[category] = {
          category: category,
          currentValue: 0,
          netBookValue: 0,
          count: 0
        };
      }
      
      grouped[category].currentValue += currentValue;
      grouped[category].netBookValue += netBookValue;
      grouped[category].count += 1;
    });
    
    // Convert to array and sort by current value descending
    return Object.values(grouped)
      .map(item => ({
        category: item.category,
        currentValue: parseFloat(item.currentValue.toFixed(2)),
        netBookValue: parseFloat(item.netBookValue.toFixed(2)),
        count: item.count
      }))
      .sort((a, b) => b.currentValue - a.currentValue);
  }, [filteredRows, selectedReportId]);

  // Filter assets by selected asset type for detail view
  const filteredAssetsByType = useMemo(() => {
    if (!selectedAssetType || !filteredRows || filteredRows.length === 0) return [];
    
    return filteredRows
      .filter(row => row["Category"] === selectedAssetType)
      .map(row => {
        // Get asset name - prioritize description (actual asset name), then Name, then Asset Code
        // The "Name" column from backend is a.text which might be asset type name, so we prioritize description
        let assetName = row["description"] || row["Name"] || row["Asset Code"] || "";
        
        // Additional check: if Name equals Category (asset type name), definitely use description or Asset Code
        if (assetName === row["Category"] || (!row["description"] && row["Name"] === row["Category"])) {
          assetName = row["description"] || row["Asset Code"] || "";
        }
        
        return {
          assetCode: row["Asset Code"] || "",
          name: assetName,
          category: row["Category"] || "",
          location: row["Location"] || "",
          assetStatus: row["Asset Status"] || "",
          acquisitionDate: row["Acquisition Date"] || "",
          currentValue: parseFloat(row["Current Value"] || 0),
          originalCost: parseFloat(row["Original Cost"] || 0),
          accumulatedDepreciation: parseFloat(row["Accumulated Depreciation"] || 0),
          netBookValue: parseFloat(row["Net Book Value"] || 0),
          depreciationMethod: row["Depreciation Method"] || "",
          usefulLife: row["Useful Life"] || 0
        };
      })
      .sort((a, b) => b.netBookValue - a.netBookValue);
  }, [selectedAssetType, filteredRows]);

  // Prepare chart data for assets in selected asset type (for detail modal)
  const assetDetailChartData = useMemo(() => {
    if (!filteredAssetsByType || filteredAssetsByType.length === 0) return [];
    
    return filteredAssetsByType.map(asset => ({
      name: asset.name.length > 20 ? asset.name.substring(0, 20) + "..." : asset.name,
      fullName: asset.name,
      assetCode: asset.assetCode,
      netBookValue: asset.netBookValue,
      currentValue: asset.currentValue
    }));
  }, [filteredAssetsByType]);

  // Handle chart bar click
  const handleChartBarClick = (data, index, e) => {
    if (data && data.category) {
      setSelectedAssetType(data.category);
      setShowAssetTypeModal(true);
    } else if (index !== undefined && chartDataByAssetType && chartDataByAssetType[index]) {
      const clickedData = chartDataByAssetType[index];
      if (clickedData && clickedData.category) {
        setSelectedAssetType(clickedData.category);
        setShowAssetTypeModal(true);
      }
    }
  };

  // Handle click on chart container (for grey areas)
  const handleChartContainerClick = (e, categoryIndex) => {
    // If clicking on the chart container (not on a bar), open modal for that category
    if (categoryIndex !== undefined && chartDataByAssetType && chartDataByAssetType[categoryIndex]) {
      const clickedData = chartDataByAssetType[categoryIndex];
      if (clickedData && clickedData.category) {
        setSelectedAssetType(clickedData.category);
        setShowAssetTypeModal(true);
      }
    }
  };

  // Saved views for this report
  const filteredViews = useMemo(() => {
    return (views || []).filter((v) => v.reportId === selectedReportId);
  }, [views, selectedReportId]);

  // Get filter options from API data or fallback to domain
  const getFilterOptions = (fieldKey) => {
    console.log('🔍 [ReportLayout] getFilterOptions called for:', fieldKey, 'apiData:', !!apiData?.filterOptions);
    if (!apiData?.filterOptions) return null;
    
    const filterOptions = apiData.filterOptions;
    switch (fieldKey) {
      case 'category':
        return filterOptions.categories || [];
      case 'location':
        return filterOptions.locations || [];
      case 'department': {
        // Prefer departments (asset-register style), then department_options (breakdown)
        const deptList = filterOptions.departments && Array.isArray(filterOptions.departments)
          ? filterOptions.departments
          : (filterOptions.department_options && Array.isArray(filterOptions.department_options) ? filterOptions.department_options : []);
        if (deptList.length > 0) {
          return deptList
            .filter(dept => dept && dept.dept_id)
            .map(dept => {
              const label = (dept.department_name && String(dept.department_name).trim()) || (dept.text && String(dept.text).trim()) || String(dept.dept_id || 'Unknown Department');
              return { value: dept.dept_id, label };
          
        console.warn('⚠️ [ReportLayout] No departments found in filterOptions');
          console.log(`🔍 [ReportLayout] Transformed ${transformed.length} departments for dropdown`);
          if (transformed.length > 0) {
            console.log(`🔍 [ReportLayout] Sample departments:`, transformed.slice(0, 3));
          }
          return transformed;
            });
        }
        return [];
      }
      case 'vendor':
        return filterOptions.vendors || [];
      case 'maintenanceType':
        return filterOptions.maintenance_type_options || [];
      case 'workOrderStatus':
        return filterOptions.status_options || [];
      case 'vendorId':
        return filterOptions.vendor_options || [];
      case 'assetId':
      case 'assets':
        // Transform assets to dropdown format: {value: asset_id, label: asset_id - asset_name}
        // Use description for asset name (not text which is asset type name)
        if (filterOptions.assets && Array.isArray(filterOptions.assets)) {
          return filterOptions.assets.map(asset => ({
            value: asset.asset_id,
            label: `${asset.asset_id} - ${asset.description || asset.asset_name || asset.asset_description || asset.asset_id || 'Unknown Asset'}`
          }));
        }
        return [];
      case 'assetType': {
        // Prefer assetTypes (asset-register style), then asset_type_options (breakdown)
        if (filterOptions.assetTypes && Array.isArray(filterOptions.assetTypes)) {
          return filterOptions.assetTypes.map(at => ({
            value: at.asset_type_id,
            label: at.text || at.asset_type_name || at.asset_type_id || 'Unknown Asset Type'
          }));
        }
        if (filterOptions.asset_type_options && Array.isArray(filterOptions.asset_type_options)) {
          return filterOptions.asset_type_options.map(at => ({
            value: at.asset_type_id,
            label: at.asset_type_name || at.text || at.asset_type_id || 'Unknown Asset Type'
          }));
        }
        return [];
      }
      case 'branch':
        // Transform branches to dropdown format: {value: branch_id, label: branch_name}
        if (filterOptions.branches && Array.isArray(filterOptions.branches)) {
          return filterOptions.branches.map(branch => ({
            value: branch.branch_id,
            label: branch.branch_name || branch.text || branch.branch_id || 'Unknown Branch'
          }));
        }
        return [];
      case 'createdBy':
        // Transform users to dropdown format: {value: user_id, label: user_name}
        if (filterOptions.users && Array.isArray(filterOptions.users)) {
          return filterOptions.users.map(user => ({
            value: user.user_id,
            label: user.user_name || user.full_name || user.user_id || 'Unknown User'
          }));
        }
        return [];
      case 'workOrderId':
        return filterOptions.work_order_options || [];
      case 'breakdownReason': {
        const raw = filterOptions.breakdown_reason_options || [];
        return Array.isArray(raw) ? raw.map((r) => ({ value: r.atbrrc_id ?? r.breakdown_reason, label: r.breakdown_reason ?? r.atbrrc_id ?? '' })) : [];
      }
      case 'reportedBy':
        return filterOptions.reported_by_options || [];
      case 'breakdownStatus': {
        const raw = filterOptions.breakdown_status_options || [];
        return Array.isArray(raw) ? raw.map((r) => ({ value: r.breakdown_status, label: r.breakdown_status ?? '' })) : [];
      }
      case 'workflowStatus':
        return filterOptions.workflow_status_options || [];
      case 'stepStatus':
        return filterOptions.step_status_options || [];
      case 'assignedTo':
        return filterOptions.user_options || [];
      case 'vendorName': {
        const vendorOpts = filterOptions.vendor_options || [];
        return Array.isArray(vendorOpts) ? vendorOpts.map(v => ({
          value: v.vendor_id,
          label: v.vendor_name ? `${v.vendor_id} - ${v.vendor_name}` : String(v.vendor_id ?? '')
        })) : [];
      }
      default:
        return null;
    }
  };

   const activeChips = useMemo(() => {
     const chips = [];
     translatedReport.quickFields.forEach((f) => {
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
                 chips.push({
                   type: 'quick',
                   fieldKey: f.key,
                   subFieldKey: subField.key,
                   label: `${subField.label}: ${subVal[0]} → ${subVal[1]}`,
                   removeAction: () => {
                     const currentValue = quick[f.key] || {};
                     const newValue = { ...currentValue, [subField.key]: "" };
                     setQuickField(f.key, newValue);
                   }
                 });
               } else if (Array.isArray(subVal)) {
                 chips.push({
                   type: 'quick',
                   fieldKey: f.key,
                   subFieldKey: subField.key,
                   label: `${subField.label}: ${subVal.join(", ")}`,
                   removeAction: () => {
                     const currentValue = quick[f.key] || {};
                     const newValue = { ...currentValue, [subField.key]: [] };
                     setQuickField(f.key, newValue);
                   }
                 });
               } else {
                 chips.push({
                   type: 'quick',
                   fieldKey: f.key,
                   subFieldKey: subField.key,
                   label: `${subField.label}: ${subVal}`,
                   removeAction: () => {
                     const currentValue = quick[f.key] || {};
                     const newValue = { ...currentValue, [subField.key]: "" };
                     setQuickField(f.key, newValue);
                   }
                 });
               }
             }
           });
         }
       } else if (f.type === "daterange") {
         chips.push({
           type: 'quick',
           fieldKey: f.key,
           label: `${f.label}: ${v[0]} → ${v[1]}`,
           removeAction: () => setQuickField(f.key, "")
         });
      } else if (Array.isArray(v)) {
        // Get labels for multiselect values
        const getLabel = (value) => {
          // If value is already a string/number, use it directly
          if (typeof value !== 'object' || value === null) {
            // Try to find the label from the field's domain
            const option = f.domain?.find(opt => {
              const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
              return optValue === value;
            });
            return option ? (typeof option === 'object' ? option.label : option) : String(value);
          }
          // If value is an object, use its label
          return value.label || value.value || String(value);
        };
        const displayValues = v.map(getLabel).join(", ");
        chips.push({
          type: 'quick',
          fieldKey: f.key,
          label: `${f.label}: ${displayValues}`,
          removeAction: () => setQuickField(f.key, [])
        });
       } else {
         chips.push({
           type: 'quick',
           fieldKey: f.key,
           label: `${f.label}: ${v}`,
           removeAction: () => setQuickField(f.key, "")
         });
       }
     });
     (advanced || []).forEach((r, idx) => {
       if (!r.field) return;
       const field = translatedReport.fields.find(f => f.key === r.field);
       const label = field ? field.label : r.field;
      
      // Handle property-value filter (object with property and value)
      let displayVal = "–";
      if (r.field === 'property' && r.val && typeof r.val === 'object' && r.val.property && r.val.value) {
        displayVal = `${r.val.property} = ${r.val.value}`;
      } else if (Array.isArray(r.val)) {
        displayVal = r.val.join(", ") || "–";
      } else if (r.val !== null && r.val !== undefined) {
        displayVal = String(r.val);
      }
      
       chips.push({
         type: 'advanced',
         index: idx,
        label: `${label} ${r.op} ${displayVal}`,
         removeAction: () => {
           const newAdvanced = advanced.filter((_, i) => i !== idx);
           setAdvanced(newAdvanced);
         }
       });
     });
     return chips;
   }, [quick, advanced, report, setQuickField, setAdvanced]);



  const clearAll = () => {
    setQuick({});
    setAdvanced([]);
  };

  const handlePreviewReport = async () => {
    try {
      const reportData = generateComprehensiveReport({
        report: translatedReport,
        filteredRows,
        quick,
        advanced,
        columns: cols
      });
      
      setGeneratedReport(reportData);
    } catch (error) {
      console.error('Error generating report preview:', error);
      showToast(t('reports.errorGeneratingReportPreview'), "error");
    }
  };

  const handleGenerateReport = async (format = 'pdf') => {
    setIsGeneratingReport(true);
    try {
      // Call audit logging handler if provided
      if (onGenerateReport) {
        await onGenerateReport();
      }

      // For asset-valuation report, use the comprehensive export functionality
      if (translatedReport.id === 'asset-valuation') {
        await handleAssetValuationExport(format);
        return;
      }

      // For other reports, use the existing PDF generation
      const reportData = generateComprehensiveReport({
        report: translatedReport,
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
      showToast(t('reports.errorGeneratingReport'), "error");
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
          // Note: Skip audit logging here since it's already handled in handleGenerateReport
          exportPDF(true); // Skip audit log for generate report flow
          return; // PDF export doesn't need blob download
          
        case 'excel':
          // Call audit logging handler for non-PDF exports
          if (onExportReport) {
            await onExportReport('excel');
          }
          blob = await assetValuationService.exportToExcel(apiFilters);
          filename = `Asset_Valuation_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
          mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          break;
        case 'csv':
          // Call audit logging handler for non-PDF exports
          if (onExportReport) {
            await onExportReport('csv');
          }
          blob = await assetValuationService.exportToCSV(apiFilters);
          filename = `Asset_Valuation_Report_${new Date().toISOString().slice(0, 10)}.csv`;
          mimeType = 'text/csv';
          break;
        case 'json':
          // Call audit logging handler for non-PDF exports
          if (onExportReport) {
            await onExportReport('json');
          }
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

      showToast(t('reports.reportExportedSuccessfully', { format: format.toUpperCase() }), "success");
      
    } catch (error) {
      console.error('Error exporting asset valuation report:', error);
      showToast(t('reports.errorExportingReport', { format: format.toUpperCase() }), "error");
    }
  };

  const closeReportDisplay = () => {
    setGeneratedReport(null);
  };

  const saveView = () => {
    if (!viewName.trim()) return;
    setViews([...views, { id: generateUUID(), name: viewName, reportId: translatedReport.id, quick, advanced, columns: cols }]);
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

  const exportCSV = async () => {
    // Call audit logging handler if provided
    if (onExportReport) {
      await onExportReport('csv');
    }

    let csvContent = [];
    
    // Add report header
    csvContent.push(`${translatedReport.name} Report`);
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
      csvContent.push(`Current Value After Depreciation,₹${totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })},${totals.totalCount} total assets`);
      csvContent.push(''); // Empty line for spacing
    }
    
    // Add table headers
    csvContent.push(cols.map(col => getTranslatedColumnHeader(col, t)).join(","));
    
    // Add table data
    filteredRows.forEach(row => {
      csvContent.push(cols.map(col => JSON.stringify(row[col] ?? "")).join(","));
    });
    
    const csv = csvContent.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${translatedReport.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async (skipAuditLog = false) => {
    // Call audit logging handler if provided (skip for generate report flow)
    if (onExportReport && !skipAuditLog) {
      await onExportReport('pdf');
    }

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
    doc.text(`${translatedReport.name} Report`, pageWidth / 2, yPosition, { align: "center" });
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
        ["Current Value After Depreciation", `₹${totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, `${totals.totalCount} total assets`]
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
    
    const tableColumn = cols.map(col => getTranslatedColumnHeader(col, t));
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
    doc.save(`${translatedReport.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const exportOptions = [
    { label: t('reports.exportAsCSV'), action: () => exportCSV() }, 
    { label: t('reports.exportAsPDF'), action: () => exportPDF(false) } // Don't skip audit log for explicit export
  ];

  // Mock users for sharing (this should come from props or context in real app)
  const USERS = ["Arun Kumar", "Divya T", "Shweta", "Rahul", "Sanjay"];

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{t('reports.title')}</h1>
            <p className="text-slate-500 text-sm">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2"> 
            {filteredViews.length > 0 && (
              <div className="relative" ref={savedRef}>
                <button onClick={() => setIsSavedOpen(!isSavedOpen)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                  {t('reports.savedViews')}
                </button>
                {isSavedOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-300 rounded-xl shadow-lg z-20">
                    <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                      {filteredViews.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-sm truncate" title={v.name}>{v.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { applyView(v); setIsSavedOpen(false); }} className="px-2 py-1 text-xs rounded-md bg-[#143d65] text-white">{t('reports.load')}</button>
                            <button onClick={() => { setShareTargetView(v); setIsShareOpen(true); }} title={t('reports.share')} className="px-2 py-1 text-xs rounded-md border border-slate-300"><FaShareAlt /></button>
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
                  placeholder={t('reports.viewName')}
                  className="w-40"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm"
                  disabled={!viewName.trim()}
                >
                  {t('reports.save')}
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSaving(true)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasFilters}
              >
                {t('reports.saveView')}
              </button>
            )}
            {!hideGenerateReport && <DropdownMenu label={t('reports.export')} options={exportOptions} />}
          </div>
        </div>
        
        {/* Total Value Display for Asset Valuation */}
        {totals && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-slate-900">{t('reports.assetValuationSummary')}</h3>
              <p className="text-sm text-slate-600">{t('reports.currentMarketValues')}</p>
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
                    <p className="text-sm font-medium text-green-800">{t('reports.inUseAssetsValue')}</p>
                    <p className="text-lg font-semibold text-green-900">₹{totals.inUse.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-green-600">{totals.inUseCount} {t('reports.activeAssets')}</p>
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
                    <p className="text-sm font-medium text-red-800">{t('reports.scrapAssetsValue')}</p>
                    <p className="text-lg font-semibold text-red-900">₹{totals.scrap.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-red-600">{totals.scrapCount} {t('reports.disposedAssets')}</p>
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
                    <p className="text-sm font-medium text-blue-800">{t('reports.totalPortfolioValue')}</p>
                    <p className="text-lg font-semibold text-blue-900">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-blue-600">{totals.totalCount} {t('reports.totalAssets')}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-800">{t('reports.currentValueAfterDepreciation')}</p>
                    <p className="text-lg font-semibold text-purple-900">₹{totals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-purple-600">{totals.totalCount} {t('reports.totalAssets')}</p>
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
              <span className="text-blue-700 font-medium">{t('reports.loadingData')}</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {(apiData?.error || error) && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="text-red-600">⚠️</div>
              <div>
                <span className="text-red-700 font-medium">{t('reports.errorLoadingData')}</span>
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
                  <div className="text-lg font-semibold">{translatedReport.name}</div>
                  <div className="text-sm text-slate-500">{translatedReport.description}</div>
                </div>
                <div>
                  {/* Schedule button hidden temporarily */}
                  {/* <button onClick={() => showToast(t('reports.scheduleWithCurrentFilters'))} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm whitespace-nowrap">
                    {t('reports.schedule')}
                  </button> */}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-12 gap-4">
                {translatedReport.quickFields.map((f) => (
                  <div key={f.key} className="col-span-12 md:col-span-6 xl:col-span-3">
                    <div className="text-xs font-medium text-slate-600 mb-1">{f.label}</div>
                    {f.type === "daterange" && <DateRange value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} preset={f.preset} />}
                    {f.type === "select" && <Select value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} options={getFilterOptions(f.key) || f.domain || []} />}
                    {f.type === "multiselect" && <DropdownMultiSelect values={quick[f.key] || []} onChange={(v) => setQuickField(f.key, v)} options={getFilterOptions(f.key) || f.domain || []} />}
                    {f.type === "searchable" && (() => {
                      // For searchable fields, use allAvailableAssets for options (not filtered data)
                      // This ensures dropdown always shows all available options
                      const options = f.domain || (getFilterOptions(f.key) || []);
                      
                      console.log(`🔍 [ReportLayout] ${f.key} options:`, options.length, options.slice(0, 3));
                      console.log(`🔍 [ReportLayout] ${f.key} field domain:`, f.domain?.length || 0, 'items');
                      
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
              {!hideAdvancedFilters && (
              <div className="mt-4">
                  <AdvancedBuilder fields={translatedReport.fields} value={advanced} onChange={setAdvanced} quickFilters={quick} getFilterOptions={getFilterOptions} />
              </div>
              )}
               {/* Active Chips */}
               <div className="mt-3">
                 <SectionTitle>{t('reports.activeFilters')}</SectionTitle>
                 <div className="flex flex-wrap gap-2">
                   {activeChips.length === 0 && <span className="text-sm text-slate-500">{t('reports.none')}</span>}
                   {activeChips.map((chip, idx) => (
                     <div key={idx} className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                       <span>{chip.label}</span>
                       <button
                         onClick={chip.removeAction}
                         className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 transition-colors"
                         title={t('reports.removeFilter')}
                       >
                         <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                         </svg>
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
               {/* Actions */}
               <div className="mt-4 flex items-center justify-end gap-2">
                 {hasFilters && (
                   <button onClick={clearAll} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm hover:bg-gray-50">
                     {t('reports.clear')}
                   </button>
                 )}
                 <button 
                   onClick={onPreviewReport || handlePreviewReport}
                   className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm hover:bg-gray-50"
                 >
                   {t('reports.preview')}
                 </button>
                
                {/* Generate Report Button - Hidden if hideGenerateReport prop is true */}
                {!hideGenerateReport && (
                  translatedReport.id === 'asset-valuation' ? (
                  <DropdownMenu
                    label={isGeneratingReport ? t('reports.generating') : t('reports.generateReport')}
                    options={[
                      {
                        label: t('reports.pdfReport'),
                        action: () => handleGenerateReport('pdf')
                      },
                      {
                        label: t('reports.excelReport'),
                        action: () => handleGenerateReport('excel')
                      },
                      {
                        label: t('reports.csvReport'),
                        action: () => handleGenerateReport('csv')
                      },
                      {
                        label: t('reports.jsonReport'),
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
                    {isGeneratingReport ? t('reports.generating') : t('reports.generateReport')}
                  </button>
                  )
                )}
              </div>
            </div>
            
            {/* Charts Section - Only for Asset Valuation */}
            {selectedReportId === "asset-valuation" && chartDataByAssetType.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Current Value by Asset Type Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('reports.currentValueByAssetType')}</h3>
                  <div 
                    className="h-80 cursor-pointer relative"
                    onClick={(e) => {
                      // Only handle click if it's on the chart background/grid area
                      // Find which category was clicked based on chart area
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      
                      // Account for chart margins (left: 20, right: 30)
                      const leftMargin = 20;
                      const rightMargin = 30;
                      const chartWidth = rect.width - leftMargin - rightMargin;
                      const adjustedX = clickX - leftMargin;
                      
                      if (adjustedX >= 0 && adjustedX <= chartWidth) {
                        const categoryCount = chartDataByAssetType.length;
                        const categoryIndex = Math.min(
                          Math.floor((adjustedX / chartWidth) * categoryCount),
                          categoryCount - 1
                        );
                        
                        if (categoryIndex >= 0 && categoryIndex < chartDataByAssetType.length) {
                          handleChartContainerClick(e, categoryIndex);
                        }
                      }
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%" style={{ cursor: 'pointer' }}>
                      <BarChart 
                        data={chartDataByAssetType} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        onClick={(data, index, e) => {
                          e.stopPropagation();
                          handleChartBarClick(data, index, e);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" onClick={(e) => e.stopPropagation()} />
                        <XAxis 
                          dataKey="category" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          tick={{ fontSize: 12 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const categoryIndex = chartDataByAssetType.findIndex((item, idx) => {
                              // Approximate which category was clicked based on position
                              return true;
                            });
                            if (categoryIndex >= 0) {
                              handleChartContainerClick(e, categoryIndex);
                            }
                          }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          labelStyle={{ color: '#1e293b' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="currentValue" 
                          fill="#3b82f6" 
                          name={t('reports.currentValue')}
                          radius={[4, 4, 0, 0]}
                          onClick={(data, index, e) => {
                            e.stopPropagation();
                            handleChartBarClick(data, index, e);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {chartDataByAssetType.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChartBarClick(entry, index, e);
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Value After Depreciation by Asset Type Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">{t('reports.valueAfterDepreciationByAssetType')}</h3>
                  <div 
                    className="h-80 cursor-pointer relative"
                    onClick={(e) => {
                      // Only handle click if it's on the chart background/grid area
                      // Find which category was clicked based on chart area
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      
                      // Account for chart margins (left: 20, right: 30)
                      const leftMargin = 20;
                      const rightMargin = 30;
                      const chartWidth = rect.width - leftMargin - rightMargin;
                      const adjustedX = clickX - leftMargin;
                      
                      if (adjustedX >= 0 && adjustedX <= chartWidth) {
                        const categoryCount = chartDataByAssetType.length;
                        const categoryIndex = Math.min(
                          Math.floor((adjustedX / chartWidth) * categoryCount),
                          categoryCount - 1
                        );
                        
                        if (categoryIndex >= 0 && categoryIndex < chartDataByAssetType.length) {
                          handleChartContainerClick(e, categoryIndex);
                        }
                      }
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%" style={{ cursor: 'pointer' }}>
                      <BarChart 
                        data={chartDataByAssetType} 
                        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        onClick={(data, index, e) => {
                          e.stopPropagation();
                          handleChartBarClick(data, index, e);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="category" 
                          angle={-45}
                          textAnchor="end"
                          height={100}
                          interval={0}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis 
                          tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          formatter={(value) => `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          labelStyle={{ color: '#1e293b' }}
                        />
                        <Legend />
                        <Bar 
                          dataKey="netBookValue" 
                          fill="#10b981" 
                          name={t('reports.valueAfterDepreciation')}
                          radius={[4, 4, 0, 0]}
                          onClick={(data, index, e) => {
                            e.stopPropagation();
                            handleChartBarClick(data, index, e);
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {chartDataByAssetType.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleChartBarClick(entry, index, e);
                              }}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
             )}
             
             {/* Asset Type Details Modal */}
             {showAssetTypeModal && selectedAssetType && (
               <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAssetTypeModal(false)}>
                 <div className="bg-white rounded-xl shadow-lg w-[95%] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                   {/* Modal Header */}
                   <div className="bg-[#143d65] text-white py-4 px-6 rounded-t-xl border-b-4 border-[#FFC107] flex items-center justify-between">
                     <h2 className="text-xl font-semibold">
                       {t('reports.assetsByAssetType')}: {selectedAssetType}
                     </h2>
                     <button
                       onClick={() => setShowAssetTypeModal(false)}
                       className="text-white hover:text-gray-200 text-2xl font-bold"
                       aria-label={t('reports.close')}
                     >
                       ×
                     </button>
                   </div>
                   
                   {/* Modal Content */}
                   <div className="flex-1 overflow-y-auto p-6">
                     {/* Summary Stats */}
                     <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                       <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                         <p className="text-sm font-medium text-blue-800">{t('reports.totalAssets')}</p>
                         <p className="text-2xl font-bold text-blue-900">{filteredAssetsByType.length}</p>
                       </div>
                       <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                         <p className="text-sm font-medium text-green-800">{t('reports.totalCurrentValue')}</p>
                         <p className="text-xl font-bold text-green-900">
                           ₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.currentValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </p>
                       </div>
                       <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                         <p className="text-sm font-medium text-purple-800">{t('reports.totalValueAfterDepreciation')}</p>
                         <p className="text-xl font-bold text-purple-900">
                           ₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.netBookValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                         </p>
                       </div>
                     </div>

                     {/* Chart for Current Value After Depreciation */}
                     {assetDetailChartData.length > 0 && (
                       <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
                         <h3 className="text-lg font-semibold text-slate-900 mb-4">
                           {t('reports.currentValueAfterDepreciationByAsset')}
                         </h3>
                         <div className="h-96">
                           <ResponsiveContainer width="100%" height="100%" style={{ cursor: 'pointer' }}>
                             <BarChart data={assetDetailChartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                               <XAxis 
                                 dataKey="name" 
                                 angle={-45}
                                 textAnchor="end"
                                 height={120}
                                 interval={0}
                                 tick={{ fontSize: 10 }}
                               />
                               <YAxis 
                                 tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
                                 tick={{ fontSize: 12 }}
                               />
                               <Tooltip 
                                 formatter={(value, name) => [
                                   `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                                   name === 'netBookValue' ? t('reports.valueAfterDepreciation') : t('reports.currentValue')
                                 ]}
                                 labelFormatter={(label) => {
                                   const asset = assetDetailChartData.find(a => a.name === label);
                                   return asset ? `${asset.assetCode} - ${asset.fullName}` : label;
                                 }}
                                 labelStyle={{ color: '#1e293b' }}
                               />
                               <Legend />
                               <Bar 
                                 dataKey="netBookValue" 
                                 fill="#10b981" 
                                 name={t('reports.valueAfterDepreciation')}
                                 radius={[4, 4, 0, 0]}
                               />
                             </BarChart>
                           </ResponsiveContainer>
                         </div>
                       </div>
                     )}
                     
                     {/* Assets Table */}
                     {filteredAssetsByType.length > 0 ? (
                       <div className="overflow-x-auto">
                         <table className="min-w-full text-sm border-collapse">
                           <thead className="bg-slate-50 sticky top-0">
                             <tr>
                               <th className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.assetCode')}</th>
                               <th className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.name')}</th>
                               <th className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.location')}</th>
                               <th className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.assetStatus')}</th>
                               <th className="text-right font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.currentValue')}</th>
                               <th className="text-right font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.originalCost')}</th>
                               <th className="text-right font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.accumulatedDepreciation')}</th>
                               <th className="text-right font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.valueAfterDepreciation')}</th>
                               <th className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200">{t('reports.depreciationMethod')}</th>
                             </tr>
                           </thead>
                           <tbody>
                             {filteredAssetsByType.map((asset, index) => (
                               <tr key={index} className="hover:bg-slate-50">
                                 <td className="px-3 py-2 border-b border-slate-100">{asset.assetCode}</td>
                                 <td className="px-3 py-2 border-b border-slate-100">{asset.name}</td>
                                 <td className="px-3 py-2 border-b border-slate-100">{asset.location}</td>
                                 <td className="px-3 py-2 border-b border-slate-100">
                                   <span className={`px-2 py-1 rounded text-xs ${
                                     asset.assetStatus === 'In-Use' 
                                       ? 'bg-green-100 text-green-800' 
                                       : 'bg-red-100 text-red-800'
                                   }`}>
                                     {asset.assetStatus}
                                   </span>
                                 </td>
                                 <td className="px-3 py-2 border-b border-slate-100 text-right">₹{asset.currentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="px-3 py-2 border-b border-slate-100 text-right">₹{asset.originalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="px-3 py-2 border-b border-slate-100 text-right">₹{asset.accumulatedDepreciation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="px-3 py-2 border-b border-slate-100 text-right font-semibold text-green-700">₹{asset.netBookValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="px-3 py-2 border-b border-slate-100">{asset.depreciationMethod}</td>
                               </tr>
                             ))}
                           </tbody>
                           <tfoot className="bg-slate-50">
                             <tr>
                               <td colSpan="4" className="px-3 py-2 border-t-2 border-slate-300 font-semibold text-slate-700">{t('reports.total')}</td>
                               <td className="px-3 py-2 border-t-2 border-slate-300 text-right font-semibold text-slate-700">₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.currentValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                               <td className="px-3 py-2 border-t-2 border-slate-300 text-right font-semibold text-slate-700">₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.originalCost, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                               <td className="px-3 py-2 border-t-2 border-slate-300 text-right font-semibold text-slate-700">₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.accumulatedDepreciation, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                               <td className="px-3 py-2 border-t-2 border-slate-300 text-right font-semibold text-green-700">₹{filteredAssetsByType.reduce((sum, asset) => sum + asset.netBookValue, 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                               <td className="px-3 py-2 border-t-2 border-slate-300"></td>
                             </tr>
                           </tfoot>
                         </table>
                       </div>
                     ) : (
                       <div className="text-center py-8 text-slate-500">
                         {t('reports.noAssetsFound')}
                       </div>
                     )}
                   </div>
                 </div>
               </div>
             )}
             
             {/* Preview Table - Hidden if hideTable prop is true */}
            {!hideTable && (
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">{t('reports.previewTable')} • {filteredRows.length} {t('reports.rows')}</div>
                {/* Column chooser (add/remove) */}
                <div className="flex items-center gap-2">
                  <SearchableSelect
                    onChange={(c) => setColumns([...cols, c])}
                    options={(() => {
                      // Handle both array and object formats for allColumns
                      const allCols = translatedReport.allColumns || [];
                      const colsArray = Array.isArray(allCols) 
                        ? allCols 
                        : Object.values(allCols).flat();
                      return colsArray.filter(c => !cols.includes(c)).map(col => ({
                        value: col,
                        label: getTranslatedColumnHeader(col, t)
                      }));
                    })()}
                    placeholder={t('reports.addColumn')}
                  />
                  <SearchableSelect
                    onChange={(c) => setColumns(cols.filter((col) => col !== c))}
                    options={cols.map(col => ({
                      value: col,
                      label: getTranslatedColumnHeader(col, t)
                    }))}
                    placeholder={t('reports.removeColumn')}
                  />
                  <button onClick={() => setColumns(translatedReport.defaultColumns)} className="text-sm px-3 py-1 rounded-lg bg-white border border-slate-300">
                    {t('reports.reset')}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto overflow-y-auto h-[calc(100%-48px)]">
                <table className="min-w-full text-sm" style={{ minWidth: '800px' }}>
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {cols.map((col) => {
                        // Determine alignment based on column type
                        const isNumeric = [
                          "Quality Certificates",
                          "Maintenance Certificates",
                          "Current Value",
                          "Original Cost",
                          "Accumulated Depreciation",
                          "Net Book Value",
                          "Purchase Cost",
                          "Sale Amount"
                        ].includes(col);
                        
                        const isDate = [
                          "Date",
                          "Certificate Date",
                          "Purchase Date",
                          "Commissioned Date",
                          "Scrap Date",
                          "Sale Date"
                        ].includes(col);
                        
                        const alignClass = isNumeric 
                          ? "text-right" 
                          : isDate 
                          ? "text-center" 
                          : "text-left";
                        
                        return (
                          <th key={col} className={`${alignClass} font-medium text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap`}>
                          <span className="inline-flex items-center gap-2">
                            {getTranslatedColumnHeader(col, t)}
                            <button
                              type="button"
                              title={t('reports.removeColumnTooltip')}
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
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-slate-50">
                        {cols.map((c) => {
                          // Determine alignment based on column type
                          const isNumeric = [
                            "Quality Certificates",
                            "Maintenance Certificates",
                            "Current Value",
                            "Original Cost",
                            "Accumulated Depreciation",
                            "Net Book Value",
                            "Purchase Cost",
                            "Sale Amount"
                          ].includes(c);
                          
                          const isDate = [
                            "Date",
                            "Certificate Date",
                            "Purchase Date",
                            "Commissioned Date",
                            "Scrap Date",
                            "Sale Date"
                          ].includes(c);
                          
                          const alignClass = isNumeric 
                            ? "text-right" 
                            : isDate 
                            ? "text-center" 
                            : "text-left";
                          
                          return (
                            <td key={c} className={`px-3 py-2 border-b border-slate-100 whitespace-nowrap ${alignClass}`}>
                            {String(r[c] ?? "")}
                          </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            )}
          </main>
        </div>
      </div>
      
      {/* Share Modal */}
      {isShareOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-[360px] p-4">
            <div className="text-lg font-semibold mb-2">{t('reports.shareView')}</div>
            <div className="text-sm text-slate-600 mb-3 truncate">{shareTargetView?.name}</div>
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-600 mb-1">{t('reports.selectUser')}</div>
              <Select value={shareUser} onChange={setShareUser} options={USERS} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsShareOpen(false)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">{t('reports.cancel')}</button>
              <button onClick={() => { /* integrate share */ setIsShareOpen(false); }} className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm" disabled={!shareUser.trim()}>{t('reports.share')}</button>
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
