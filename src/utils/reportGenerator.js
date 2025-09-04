import { useAuthStore } from '../store/useAuthStore';

/**
 * Generate a comprehensive report with header, filters, and results
 * @param {Object} params - Report generation parameters
 * @param {Object} params.report - Report configuration
 * @param {Array} params.filteredRows - Filtered data rows
 * @param {Object} params.quick - Quick filters applied
 * @param {Array} params.advanced - Advanced conditions applied
 * @param {Array} params.columns - Selected columns
 * @returns {Object} - Generated report data
 */
export const generateComprehensiveReport = ({ report, filteredRows, quick, advanced, columns }) => {
  const { user } = useAuthStore.getState();
  
  console.log('🔍 [generateComprehensiveReport] Input parameters:');
  console.log('  - Report:', report?.id, report?.name);
  console.log('  - Filtered rows:', filteredRows?.length, filteredRows?.slice(0, 2));
  console.log('  - Quick filters:', quick);
  console.log('  - Advanced conditions:', advanced);
  console.log('  - Columns:', columns);
  
  // Get current date and time
  const now = new Date();
  const generationDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Generate report header
  const reportHeader = {
    title: report.name,
    description: report.description,
    organization: {
      id: user?.org_id || 'N/A',
      name: 'Asset Lifecycle Management System' // You can fetch this from API if needed
    },
    generatedBy: {
      name: user?.full_name || 'Unknown User',
      email: user?.email || 'N/A',
      employeeId: user?.emp_int_id || 'N/A',
      role: user?.job_role_id || 'N/A'
    },
    generationInfo: {
      date: generationDate,
      timestamp: now.toISOString(),
      totalRecords: filteredRows.length,
      reportType: 'Asset Lifecycle Report'
    }
  };

  // Generate applied filters summary
  const appliedFilters = generateFiltersSummary(quick, advanced, report);

  // Generate results summary
  const resultsSummary = generateResultsSummary(filteredRows, report);

  // Generate detailed data
  const detailedData = generateDetailedData(filteredRows, columns || report.defaultColumns);

  return {
    header: reportHeader,
    filters: appliedFilters,
    summary: resultsSummary,
    data: detailedData,
    metadata: {
      generatedAt: now.toISOString(),
      version: '1.0',
      format: 'comprehensive'
    }
  };
};

/**
 * Generate filters summary
 */
const generateFiltersSummary = (quick, advanced, report) => {
  const quickFilters = [];
  const advancedConditions = [];

  console.log('🔍 [generateFiltersSummary] Quick filters:', quick);
  console.log('🔍 [generateFiltersSummary] Advanced conditions:', advanced);
  console.log('🔍 [generateFiltersSummary] Report quickFields:', report.quickFields);

  // Process quick filters
  Object.entries(quick).forEach(([key, value]) => {
    if (value && (Array.isArray(value) ? value.length > 0 : value !== '')) {
      const field = report.quickFields.find(f => f.key === key);
      if (field) {
        let displayValue = value;
        
        if (field.type === 'daterange' && Array.isArray(value)) {
          displayValue = `${value[0]} to ${value[1]}`;
        } else if (field.type === 'multiselect' && Array.isArray(value)) {
          displayValue = value.join(', ');
        } else if (field.type === 'select' && typeof value === 'string') {
          displayValue = value;
        }
        
        quickFilters.push({
          field: field.label,
          key: field.key,
          value: displayValue,
          type: field.type
        });
        
        console.log(`✅ [generateFiltersSummary] Added quick filter: ${field.label} = ${displayValue}`);
      } else {
        console.log(`❌ [generateFiltersSummary] Field not found for key: ${key}`);
      }
    }
  });

  // Process advanced conditions
  advanced.forEach((condition, index) => {
    // Skip conditions with empty or invalid values
    if (condition.val === null || condition.val === undefined) return;
    if (Array.isArray(condition.val) && condition.val.length === 0) return;
    if (typeof condition.val === 'string' && condition.val.trim() === '') return;
    if (Array.isArray(condition.val) && condition.val.every(v => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) return;
    
    const field = report.fields.find(f => f.key === condition.field);
    if (field) {
      let displayValue = condition.val;
      
      // Handle different value types for display
      if (Array.isArray(condition.val)) {
        if (condition.op === 'in range' && condition.val.length === 2) {
          displayValue = `${condition.val[0]} to ${condition.val[1]}`;
        } else {
          displayValue = condition.val.join(', ');
        }
      }
      
      advancedConditions.push({
        id: index + 1,
        field: field.label,
        key: condition.field,
        operator: condition.op,
        value: displayValue,
        originalValue: condition.val,
        type: field.type
      });
      
      console.log(`✅ [generateFiltersSummary] Added advanced condition: ${field.label} ${condition.op} ${displayValue}`);
    } else {
      console.log(`❌ [generateFiltersSummary] Field not found for advanced condition: ${condition.field}`);
    }
  });

  const result = {
    quickFilters,
    advancedConditions,
    totalFilters: quickFilters.length + advancedConditions.length,
    hasFilters: quickFilters.length > 0 || advancedConditions.length > 0
  };

  console.log('📊 [generateFiltersSummary] Final result:', result);
  return result;
};

/**
 * Generate results summary with statistics
 */
const generateResultsSummary = (filteredRows, report) => {
  if (!filteredRows || filteredRows.length === 0) {
    return {
      totalRecords: 0,
      statistics: {},
      message: 'No records found matching the applied filters.'
    };
  }

  const statistics = {};

  // Calculate statistics based on report type
  if (report.id === 'asset-register') {
    statistics.totalAssets = filteredRows.length;
    
    // Count by status
    const statusCounts = {};
    filteredRows.forEach(row => {
      const status = row['Current Status'] || 'Unknown';
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    statistics.statusBreakdown = statusCounts;

    // Count by department
    const deptCounts = {};
    filteredRows.forEach(row => {
      const dept = row['Department'] || 'Unknown';
      deptCounts[dept] = (deptCounts[dept] || 0) + 1;
    });
    statistics.departmentBreakdown = deptCounts;

    // Calculate total value if available
    const totalValue = filteredRows.reduce((sum, row) => {
      const value = parseFloat(row['Current Value'] || row['Purchase Price'] || 0);
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    statistics.totalValue = totalValue;
    statistics.averageValue = totalValue / filteredRows.length;

  } else if (report.id === 'asset-valuation') {
    statistics.totalAssets = filteredRows.length;
    
    // Calculate valuation statistics
    const inUseValue = filteredRows
      .filter(row => row['Asset Status'] === 'In Use')
      .reduce((sum, row) => sum + (parseFloat(row['Current Value'] || 0) || 0), 0);
    
    const scrapValue = filteredRows
      .filter(row => row['Asset Status'] === 'Scrap')
      .reduce((sum, row) => sum + (parseFloat(row['Current Value'] || 0) || 0), 0);
    
    const totalValue = filteredRows.reduce((sum, row) => {
      return sum + (parseFloat(row['Current Value'] || 0) || 0);
    }, 0);

    statistics.valuationBreakdown = {
      inUse: inUseValue,
      scrap: scrapValue,
      total: totalValue,
      average: totalValue / filteredRows.length
    };
  }

  return {
    totalRecords: filteredRows.length,
    statistics,
    generatedAt: new Date().toISOString()
  };
};

/**
 * Generate detailed data section
 */
const generateDetailedData = (filteredRows, columns) => {
  console.log('🔍 [generateDetailedData] Filtered rows:', filteredRows.length, filteredRows.slice(0, 2));
  console.log('🔍 [generateDetailedData] Columns:', columns);

  if (!filteredRows || filteredRows.length === 0) {
    console.log('❌ [generateDetailedData] No filtered rows available');
    return {
      headers: [],
      rows: [],
      message: 'No data available'
    };
  }

  // Handle both string array (defaultColumns) and object array (custom columns)
  const headers = columns.map(col => {
    if (typeof col === 'string') {
      // Handle string array format (defaultColumns)
      return {
        key: col,
        label: col,
        type: 'text'
      };
    } else {
      // Handle object format
      return {
        key: col.key,
        label: col.label,
        type: col.type || 'text'
      };
    }
  });

  console.log('📊 [generateDetailedData] Processed headers:', headers);

  // Format rows data
  const rows = filteredRows.map((row, index) => {
    const formattedRow = { id: index + 1 };
    
    headers.forEach(header => {
      let value = row[header.key] || '';
      
      // Format based on column type
      if (header.type === 'currency' && value) {
        value = `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
      } else if (header.type === 'date' && value) {
        value = new Date(value).toLocaleDateString('en-US');
      } else if (header.type === 'number' && value) {
        value = parseFloat(value).toLocaleString('en-US');
      }
      
      formattedRow[header.key] = value;
    });
    
    return formattedRow;
  });

  console.log('📊 [generateDetailedData] Processed rows:', rows.length, rows.slice(0, 2));

  return {
    headers,
    rows,
    totalRows: rows.length
  };
};

/**
 * Select important columns for PDF export
 */
const selectImportantColumns = (allHeaders, reportData) => {
  console.log('🔍 [selectImportantColumns] Input:', { allHeaders: allHeaders.length, reportData });
  
  const { report } = reportData;
  
  // Check if report exists
  if (!report || !report.id) {
    console.log('❌ [selectImportantColumns] No report or report.id found, using first 6 columns');
    return allHeaders.slice(0, 6);
  }
  
  console.log('📊 [selectImportantColumns] Report ID:', report.id);
  
  // Define priority columns based on report type
  const priorityColumns = {
    'asset-register': [
      'Asset ID', 'Asset Name', 'Department', 'Assigned Employee', 
      'Current Status', 'Cost', 'Purchase Date'
    ],
    'asset-valuation': [
      'Asset Code', 'Name', 'Asset Status', 'Current Value', 
      'Original Cost', 'Net Book Value', 'Department'
    ],
    'maintenance-history': [
      'Work Order ID', 'Asset ID', 'Asset Name', 'Maintenance Start Date', 
      'Vendor Name', 'Work Order Status', 'Cost (₹)'
    ],
    'asset-workflow-history': [
      'Work Order ID', 'Asset ID', 'Asset Name', 'Workflow Step', 
      'Work Order Status', 'Assigned To', 'Priority'
    ],
    'breakdown-history': [
      'Work Order ID', 'Asset ID', 'Asset Name', 'Breakdown Date', 
      'Reported By', 'Priority', 'Resolution Time (h)'
    ]
  };
  
  // Get priority columns for this report type
  const reportPriority = priorityColumns[report.id] || [];
  console.log('📊 [selectImportantColumns] Priority columns for', report.id, ':', reportPriority);
  
  // Filter headers to include only priority columns
  const importantHeaders = allHeaders.filter(header => 
    reportPriority.includes(header.label)
  );
  
  console.log('📊 [selectImportantColumns] Important headers found:', importantHeaders.length);
  
  // If no priority columns found, take first 6 columns
  if (importantHeaders.length === 0) {
    console.log('⚠️ [selectImportantColumns] No priority columns found, using first 6 columns');
    return allHeaders.slice(0, 6);
  }
  
  // Limit to maximum 7 columns for better PDF layout
  const result = importantHeaders.slice(0, 7);
  console.log('✅ [selectImportantColumns] Final result:', result.length, 'columns');
  return result;
};

/**
 * Calculate optimal column widths for PDF table
 */
const calculateColumnWidths = (columns, rows) => {
  const columnStyles = {};
  const totalWidth = 170; // Available width in mm
  const minWidth = 15; // Minimum column width
  const maxWidth = 40; // Maximum column width
  
  // Calculate content-based widths
  const contentWidths = columns.map((col, index) => {
    const headerLength = col.label.length;
    const maxContentLength = Math.max(
      headerLength,
      ...rows.map(row => String(row[index] || '').length)
    );
    
    // Base width on content length, with some padding
    return Math.max(minWidth, Math.min(maxWidth, maxContentLength * 1.5));
  });
  
  // Normalize widths to fit total width
  const totalContentWidth = contentWidths.reduce((sum, width) => sum + width, 0);
  const scaleFactor = totalWidth / totalContentWidth;
  
  columns.forEach((col, index) => {
    const adjustedWidth = Math.max(minWidth, contentWidths[index] * scaleFactor);
    columnStyles[index] = { cellWidth: adjustedWidth };
  });
  
  return columnStyles;
};

/**
 * Export report to PDF using jsPDF
 */
export const exportReportToPDF = (reportData) => {
  console.log('🔍 [exportReportToPDF] Starting PDF export with data:', reportData);
  
  // Dynamic import of jsPDF to avoid bundle size issues
  import('jspdf').then(({ default: jsPDF }) => {
    import('jspdf-autotable').then(({ default: autoTable }) => {
      try {
        const { header, filters, summary, data } = reportData;
        
        console.log('📊 [exportReportToPDF] Report data structure:', {
          header: !!header,
          filters: !!filters,
          summary: !!summary,
          data: !!data,
          dataRows: data?.rows?.length || 0
        });
      
      // Create new PDF document
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;
      
      // Helper function to add text with word wrap
      const addText = (text, x, y, maxWidth = pageWidth - 40) => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + (lines.length * 7);
      };
      
      // Helper function to add a new page if needed
      const checkNewPage = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          yPosition = 20;
        }
      };
      
      // Header Section
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      yPosition = addText(header.title, 20, yPosition);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      yPosition = addText(header.description, 20, yPosition + 5);
      
      // Report Info
      yPosition += 10;
      doc.setFontSize(10);
      yPosition = addText(`Organization ID: ${header.organization.id}`, 20, yPosition);
      yPosition = addText(`Generated By: ${header.generatedBy.name} (${header.generatedBy.email})`, 20, yPosition);
      yPosition = addText(`Generated On: ${header.generationInfo.date}`, 20, yPosition);
      yPosition = addText(`Total Records: ${header.generationInfo.totalRecords}`, 20, yPosition);
      
      // Summary Section
      checkNewPage(30);
      yPosition += 15;
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      yPosition = addText('SUMMARY', 20, yPosition);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      yPosition = addText(`Total Records: ${summary.totalRecords}`, 20, yPosition + 5);
      
      if (summary.statistics.totalValue) {
        yPosition = addText(`Total Value: $${summary.statistics.totalValue.toLocaleString()}`, 20, yPosition);
      }
      if (summary.statistics.averageValue) {
        yPosition = addText(`Average Value: $${summary.statistics.averageValue.toLocaleString()}`, 20, yPosition);
      }
      
      // Status Breakdown
      if (summary.statistics.statusBreakdown) {
        checkNewPage(30);
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        yPosition = addText('Status Breakdown', 20, yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        Object.entries(summary.statistics.statusBreakdown).forEach(([status, count]) => {
          yPosition = addText(`${status}: ${count}`, 30, yPosition);
        });
      }
      
      // Department Breakdown
      if (summary.statistics.departmentBreakdown) {
        checkNewPage(30);
        yPosition += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        yPosition = addText('Department Breakdown', 20, yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        Object.entries(summary.statistics.departmentBreakdown).forEach(([dept, count]) => {
          yPosition = addText(`${dept}: ${count}`, 30, yPosition);
        });
      }
      
      // Applied Filters Section
      if (filters.hasFilters) {
        checkNewPage(40);
        yPosition += 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        yPosition = addText('APPLIED FILTERS', 20, yPosition);
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        // Quick Filters
        if (filters.quickFilters.length > 0) {
          yPosition += 5;
          doc.setFont('helvetica', 'bold');
          yPosition = addText('Quick Filters:', 20, yPosition);
          doc.setFont('helvetica', 'normal');
          
          filters.quickFilters.forEach(filter => {
            yPosition = addText(`• ${filter.field}: ${filter.value}`, 30, yPosition);
          });
        }
        
        // Advanced Conditions
        if (filters.advancedConditions.length > 0) {
          yPosition += 5;
          doc.setFont('helvetica', 'bold');
          yPosition = addText('Advanced Conditions:', 20, yPosition);
          doc.setFont('helvetica', 'normal');
          
          filters.advancedConditions.forEach(condition => {
            let displayValue = condition.value;
            
            // Handle different value types
            if (Array.isArray(condition.value)) {
              if (condition.operator === 'in range' && condition.value.length === 2) {
                displayValue = `${condition.value[0]} to ${condition.value[1]}`;
              } else {
                displayValue = condition.value.join(', ');
              }
            }
            
            yPosition = addText(`• ${condition.field} ${condition.operator} ${displayValue}`, 30, yPosition);
          });
        }
      }
      
      // Detailed Data Section
      if (data.rows && data.rows.length > 0) {
        checkNewPage(50);
        yPosition += 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        yPosition = addText('DETAILED DATA', 20, yPosition);
        
        // Select only important columns for PDF
        const importantColumns = selectImportantColumns(data.headers, reportData);
        
        // Prepare table data with only important columns
        const tableHeaders = importantColumns.map(h => h.label);
        const tableRows = data.rows.map(row => 
          importantColumns.map(header => String(row[header.key] || ''))
        );
        
        // Calculate column widths based on content
        const columnWidths = calculateColumnWidths(importantColumns, tableRows);
        
        // Add table
        autoTable(doc, {
          head: [tableHeaders],
          body: tableRows,
          startY: yPosition + 10,
          columnStyles: columnWidths,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
            halign: 'left',
          },
          headStyles: {
            fillColor: [20, 61, 101], // Dark blue header
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 9,
          },
          alternateRowStyles: {
            fillColor: [245, 245, 245],
          },
          margin: { left: 20, right: 20 },
        });
      }
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(
          `Page ${i} of ${pageCount} | Generated on ${header.generationInfo.date}`,
          pageWidth - 60,
          doc.internal.pageSize.getHeight() - 10
        );
      }
      
        // Save the PDF
        const fileName = `asset-report-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        console.log('✅ [exportReportToPDF] PDF saved successfully:', fileName);
        
      } catch (error) {
        console.error('❌ [exportReportToPDF] Error generating PDF:', error);
        // Fallback to JSON export
        const dataStr = JSON.stringify(reportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `asset-report-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  }).catch(error => {
    console.error('❌ [exportReportToPDF] Error loading PDF libraries:', error);
    // Fallback to JSON export
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `asset-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
};

/**
 * Export report to CSV
 */
export const exportReportToCSV = (reportData) => {
  const { data } = reportData;
  
  if (!data.rows || data.rows.length === 0) {
    console.log('No data to export to CSV');
    return;
  }

  // Create CSV headers
  const headers = data.headers.map(h => h.label).join(',');
  
  // Create CSV rows
  const csvRows = data.rows.map(row => {
    return data.headers.map(header => {
      const value = row[header.key] || '';
      // Escape commas and quotes in CSV
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(',');
  });

  // Combine headers and rows
  const csvContent = [headers, ...csvRows].join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `asset-report-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
