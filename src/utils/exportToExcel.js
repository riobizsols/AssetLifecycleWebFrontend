import * as XLSX from 'xlsx';

export const exportToExcel = (data, columns, filename) => {
  try {
    // Filter visible columns and map their labels
    const visibleColumns = columns.filter(col => col.visible);
    
    // Create worksheet data
    const worksheetData = [
      // Header row with visible column labels
      visibleColumns.map(col => col.label),
      // Data rows with only visible columns
      ...data.map(row => 
        visibleColumns.map(col => {
          const value = row[col.name];
          // Format specific column types
          if (col.name === 'created_on' || col.name === 'changed_on') {
            return value || ''; // Return empty string if null/undefined
          }
          if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
          }
          return value || ''; // Return empty string if null/undefined
        })
      )
    ];

    // Create worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Style the header row
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (!worksheet[cellRef]) continue;
      
      worksheet[cellRef].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "0E2F4B" } },
        alignment: { horizontal: "center", vertical: "center" }
      };
    }

    // Auto-size columns
    const colWidths = worksheetData[0].map((_, i) => ({
      wch: Math.max(
        15, // Minimum width
        ...worksheetData.map(row => {
          const cellValue = row[i];
          return cellValue ? String(cellValue).length + 2 : 10;
        })
      )
    }));
    worksheet['!cols'] = colWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asset Types");

    // Generate file name with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const fullFilename = `${filename}_${timestamp}.xlsx`;

    // Write file and trigger download
    XLSX.writeFile(workbook, fullFilename);

    return true;
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    return false;
  }
}; 