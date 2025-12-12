import React, { useMemo, useState, useEffect, useRef } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import ReportLayout from "../../components/reportModels/ReportLayout";
import { useReportState } from "../../components/reportModels/useReportState";
import { REPORTS } from "../../components/reportModels/ReportConfig";
import { useAuditLog } from "../../hooks/useAuditLog";
import { REPORTS_APP_IDS } from "../../constants/reportsAuditEvents";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { Download, FileText, Image as ImageIcon, ChevronDown, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { PDFDocument } from "pdf-lib";

export default function QAAuditReport() {
  const { t } = useLanguage();
  const selectedReportId = "qa-audit-report";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);
  
  // Audit logging
  const { recordActionByNameWithFetch } = useAuditLog(REPORTS_APP_IDS.QA_AUDIT_REPORT);

  const [documents, setDocuments] = useState([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [filterOptions, setFilterOptions] = useState(null);

  const {
    quick,
    setQuick,
    advanced,
    setAdvanced,
    columns,
    setColumns,
    views,
    setViews,
    allRows,
    filteredRows,
    setQuickField,
    loading,
    error,
  } = useReportState(selectedReportId, report);

  // Fetch asset types and assets for filter dropdowns
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch asset types
        const assetTypesResponse = await API.get("/asset-types");
        const assetTypes = assetTypesResponse.data?.assetTypes || assetTypesResponse.data || [];
        
        // Fetch assets
        const assetsResponse = await API.get("/assets");
        const assets = assetsResponse.data?.assets || assetsResponse.data || [];
        
        const options = {
          assetTypes: assetTypes.map(at => ({
            asset_type_id: at.asset_type_id,
            text: at.text || at.asset_type_name
          })),
          assets: assets.map(asset => ({
            asset_id: asset.asset_id,
            asset_name: asset.text || asset.asset_name || asset.description,
            text: asset.text || asset.asset_name || asset.description
          }))
        };
        
        setFilterOptions(options);

        // Update report configuration with fetched data
        if (report) {
          const assetTypeField = report.quickFields.find(f => f.key === "assetType");
          if (assetTypeField) {
            assetTypeField.domain = assetTypes.map(at => ({
              value: at.asset_type_id,
              label: at.text || at.asset_type_name || at.asset_type_id
            }));
          }

          const assetsField = report.quickFields.find(f => f.key === "assets");
          if (assetsField) {
            assetsField.domain = assets.map(asset => ({
              value: asset.asset_id,
              label: `${asset.asset_id} - ${asset.text || asset.asset_name || asset.description || asset.asset_id}`
            }));
          }
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
        toast.error("Failed to load filter options");
      }
    };

    fetchFilterOptions();
  }, [report]);

  // Advanced filters are disabled for this report

  // Fetch maintenance documents when filters change
  useEffect(() => {
    const fetchDocuments = async () => {
      // All filters are optional - fetch whenever any filter changes
      const hasAssetTypeFilter = quick.assetType && Array.isArray(quick.assetType) && quick.assetType.length > 0;
      const hasAssetFilter = quick.assets && Array.isArray(quick.assets) && quick.assets.length > 0;
      const hasDateRange = quick.dateRange && quick.dateRange.length === 2;

      // Only fetch if at least one filter is applied
      if (!hasDateRange && !hasAssetTypeFilter && !hasAssetFilter) {
        setDocuments([]);
        return;
      }

      setLoadingDocuments(true);
      try {
        const filters = {
          fromDate: hasDateRange ? quick.dateRange[0] : null,
          toDate: hasDateRange ? quick.dateRange[1] : null,
          assetTypes: hasAssetTypeFilter ? quick.assetType : null,
          assets: hasAssetFilter ? quick.assets : null,
          advancedFilters: [] // Advanced filters disabled for this report
        };

        // Backend API endpoint: POST /api/qa-audit/certificates
        const response = await API.post("/qa-audit/certificates", filters);
        
        console.log("QA Audit Response:", response.data);
        
        // Handle different response structures
        const certificates = response.data?.data?.certificates || response.data?.certificates || [];
        
        // Filter only maintenance documents and exclude technical manuals and "others" doc type
        const maintenanceDocs = certificates.filter(doc => {
          // First check if it's a maintenance document
          const isMaintenance = doc.type === "maintenance" || doc.type === "maintenance_completion";
          if (!isMaintenance) return false;
          
          // Exclude technical manuals and "others" doc type
          const docType = (doc.doc_type || '').toLowerCase();
          const certificateType = (doc.certificate_type || '').toLowerCase();
          const docTypeText = (doc.doc_type_text || '').toLowerCase();
          
          // Check if it's a technical manual
          const isTechnicalManual = 
            docType === 'tm' ||
            certificateType.includes('technical manual') ||
            docTypeText.includes('technical manual');
          
          // Check if it's "others" doc type
          const isOthers = 
            docType === 'others' ||
            certificateType.includes('others') ||
            docTypeText.includes('others');
          
          // Return true if it's maintenance AND not a technical manual AND not "others"
          return !isTechnicalManual && !isOthers;
        });
        
        console.log("Maintenance Documents Found (excluding technical manuals and others):", maintenanceDocs.length);
        setDocuments(maintenanceDocs);
        
        if (maintenanceDocs.length === 0) {
          toast("No maintenance documents found for the selected filters", { icon: 'ℹ️' });
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        toast.error("Failed to fetch documents");
        setDocuments([]);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [quick.dateRange, quick.assets, quick.assetType]);

  // Convert image to PDF
  const convertImageToPdf = (imageDataUrl, fileName) => {
    return new Promise((resolve, reject) => {
      try {
        const img = new Image();
        
        img.onload = () => {
          try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const maxWidth = pdfWidth - (2 * margin);
            const maxHeight = pdfHeight - (2 * margin);
            
            // Calculate dimensions to fit image on page while maintaining aspect ratio
            // Convert pixel dimensions to mm (assuming 96 DPI: 1 inch = 25.4mm, 96 pixels = 25.4mm, so 1 pixel ≈ 0.264583mm)
            let imgWidthMM = img.width * 0.264583;
            let imgHeightMM = img.height * 0.264583;
            const imgAspectRatio = imgWidthMM / imgHeightMM;
            
            if (imgWidthMM > maxWidth || imgHeightMM > maxHeight) {
              if (imgAspectRatio > maxWidth / maxHeight) {
                imgWidthMM = maxWidth;
                imgHeightMM = imgWidthMM / imgAspectRatio;
        } else {
                imgHeightMM = maxHeight;
                imgWidthMM = imgHeightMM * imgAspectRatio;
              }
            }
            
            // Center image on page
            const x = (pdfWidth - imgWidthMM) / 2;
            const y = margin;
            
            // Determine image format from data URL
            const imageFormat = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
            
            // If image is taller than one page, split across multiple pages
            let remainingHeight = imgHeightMM;
            let currentY = y;
            
            while (remainingHeight > 0) {
              const heightToAdd = Math.min(remainingHeight, maxHeight);
              
              pdf.addImage(imageDataUrl, imageFormat, x, currentY, imgWidthMM, heightToAdd);
              
              remainingHeight -= heightToAdd;
              
              if (remainingHeight > 0) {
                pdf.addPage();
                currentY = margin;
              }
            }
            
            const pdfFileName = fileName.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '.pdf');
            pdf.save(pdfFileName);
            resolve(pdfFileName);
      } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageDataUrl;
      } catch (error) {
        reject(error);
      }
    });
  };

  // Convert text file to PDF
  const convertTextToPdf = (textContent, fileName) => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;
      
      // Set font
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      // Split text into lines that fit the page width
      const lines = pdf.splitTextToSize(textContent, maxWidth);
      
      lines.forEach((line) => {
        // Check if we need a new page
        if (yPosition + 7 > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        
        pdf.text(line, margin, yPosition);
        yPosition += 7; // Line height
      });
      
      const pdfFileName = fileName.replace(/\.(txt|TXT)$/, '.pdf');
      pdf.save(pdfFileName);
      return pdfFileName;
    } catch (error) {
      console.error('Error converting text to PDF:', error);
      throw error;
    }
  };

  // Convert XLSX to PDF
  const convertXlsxToPdf = async (base64Content, fileName) => {
    try {
      console.log('[convertXlsxToPdf] Starting conversion, base64Content type:', typeof base64Content, 'length:', base64Content?.length);
      
      if (!base64Content) {
        throw new Error('No base64 content provided');
      }
      
      // Handle both base64 strings and ArrayBuffer/Uint8Array
      let bytes;
      
      if (typeof base64Content === 'string') {
        // Check if it's a data URL (e.g., "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,...")
        let base64String = base64Content;
        if (base64Content.startsWith('data:')) {
          const commaIndex = base64Content.indexOf(',');
          if (commaIndex !== -1) {
            base64String = base64Content.substring(commaIndex + 1);
          }
        }
        
        // Remove any whitespace or newlines
        base64String = base64String.replace(/\s/g, '');
        
        try {
          // Convert base64 to binary string
          const binaryString = atob(base64String);
          bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
        } catch (atobError) {
          console.error('[convertXlsxToPdf] atob failed, trying alternative method:', atobError);
          // Try alternative: decode base64 manually
          const raw = window.atob ? window.atob(base64String) : Buffer.from(base64String, 'base64').toString('binary');
          const rawLength = raw.length;
          bytes = new Uint8Array(rawLength);
          for (let i = 0; i < rawLength; i++) {
            bytes[i] = raw.charCodeAt(i);
          }
        }
      } else if (base64Content instanceof ArrayBuffer) {
        bytes = new Uint8Array(base64Content);
      } else if (base64Content instanceof Uint8Array) {
        bytes = base64Content;
      } else {
        throw new Error('Unsupported content type for XLSX conversion');
      }
      
      console.log('[convertXlsxToPdf] Bytes array length:', bytes.length);
      
      // Parse Excel file
      const workbook = XLSX.read(bytes, { type: 'array' });
      console.log('[convertXlsxToPdf] Workbook parsed, sheets:', workbook.SheetNames);
      
      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for tables
      
      // Process each sheet
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        if (sheetIndex > 0) {
          pdf.addPage(); // Add new page for each sheet
        }
        
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON array
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        console.log(`[convertXlsxToPdf] Sheet "${sheetName}" has ${jsonData.length} rows`);
        
        if (jsonData.length === 0) {
          return; // Skip empty sheets
        }
        
        // First row is header
        const headers = jsonData[0].map(cell => String(cell || ''));
        const rows = jsonData.slice(1).map(row => row.map(cell => String(cell || '')));
        
        console.log(`[convertXlsxToPdf] Headers:`, headers, `Rows:`, rows.length);
        
        // Add sheet name as title
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(sheetName, 14, 15);
        
        // Add table using autoTable
        autoTable(pdf, {
          head: [headers],
          body: rows,
          startY: 25,
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
          margin: { top: 25 },
          pageBreak: 'auto',
        });
      });
      
      const pdfFileName = fileName.replace(/\.(xlsx|xls|XLSX|XLS)$/, '.pdf');
      console.log('[convertXlsxToPdf] Saving PDF as:', pdfFileName);
      pdf.save(pdfFileName);
      
      return pdfFileName;
    } catch (error) {
      console.error('[convertXlsxToPdf] Error converting XLSX to PDF:', error);
      console.error('[convertXlsxToPdf] Error stack:', error.stack);
      throw error;
    }
  };

  // Convert CSV to PDF
  const convertCsvToPdf = async (csvText, fileName) => {
    try {
      // Parse CSV
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        throw new Error('CSV file is empty');
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      
      // Parse data rows
      const rows = lines.slice(1).map(line => {
        // Handle quoted fields with commas
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            insideQuotes = !insideQuotes;
          } else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim()); // Add last value
        
        return values.map(v => v.replace(/^"|"$/g, ''));
      });

      // Create PDF
      const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation for tables
      
      // Add title
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text(fileName.replace('.csv', '').replace('.CSV', ''), 14, 15);

      // Add table using autoTable
      autoTable(pdf, {
        head: [headers],
        body: rows,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        margin: { top: 25 },
        pageBreak: 'auto',
      });

      // Download PDF
      const pdfFileName = fileName.replace(/\.(csv|CSV)$/, '.pdf');
      pdf.save(pdfFileName);
      
      return pdfFileName;
    } catch (error) {
      console.error('Error converting CSV to PDF:', error);
      throw error;
    }
  };

  // Download individual document using presigned URL - same approach as UpdateAssetModal
  const handleDownloadDocument = async (doc) => {
    try {
      setLoadingDocuments(true);
      
      // First, determine file extension from doc info
      const fileName = doc.file_name || `document-${doc.id}`;
      const fileExtension = fileName.split('.').pop()?.toLowerCase();
      
      // Convert all non-PDF files to PDF before downloading
      const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];
      
      if (fileExtension === 'pdf') {
        // PDF files: download directly - get presigned URL first
        const response = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
          params: { type: doc.type || 'maintenance', mode: 'download' }
        });
        
        if (!response.data?.url) {
          throw new Error('No download URL received');
        }
        
        window.open(response.data.url, '_blank');
        
        await recordActionByNameWithFetch("Download Maintenance Document", {
          documentId: doc.id,
          fileName: fileName
        });
        
        toast.success("Document download started");
      } else if (convertableExtensions.includes(fileExtension)) {
        try {
          // Request file content directly from backend (avoids CORS issues with presigned URLs)
          const contentResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
            params: { 
              type: doc.type || 'maintenance', 
              mode: 'download',
              content: 'true' // Request content instead of URL
            }
          });
          
          // Check if backend returned content directly or a URL to fetch from
          if (contentResponse.data?.useUrl && contentResponse.data?.url) {
            // Backend couldn't access file directly, returned a presigned URL instead
            // Fetch the content from the URL
            const urlFetch = await fetch(contentResponse.data.url);
            if (!urlFetch.ok) {
              throw new Error(`Failed to fetch file from URL: ${urlFetch.status}`);
            }
            
            let fileContent;
            if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
              // For images, convert blob to data URL
              const blob = await urlFetch.blob();
              const reader = new FileReader();
              fileContent = await new Promise((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              // For Excel files, get as arrayBuffer then convert to base64
              const blob = await urlFetch.blob();
              const arrayBuffer = await blob.arrayBuffer();
              const bytes = new Uint8Array(arrayBuffer);
              const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
              fileContent = btoa(binary);
            } else {
              // For text files, get as text
              fileContent = await urlFetch.text();
            }
            
            // Now convert to PDF
            let pdfFileName;
            console.log(`[Download] Converting ${fileExtension} with fileContent length:`, fileContent?.length);
            
            if (fileExtension === 'csv') {
              pdfFileName = await convertCsvToPdf(fileContent, fileName);
            } else if (fileExtension === 'txt') {
              pdfFileName = convertTextToPdf(fileContent, fileName);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              console.log('[Download] Calling convertXlsxToPdf...');
              pdfFileName = await convertXlsxToPdf(fileContent, fileName);
              console.log('[Download] Conversion complete, pdfFileName:', pdfFileName);
            } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
              pdfFileName = await convertImageToPdf(fileContent, fileName);
            }
            
            toast.success(`${fileExtension.toUpperCase()} converted to PDF and downloaded`);
            
            await recordActionByNameWithFetch("Download Maintenance Document", {
              documentId: doc.id,
              fileName: pdfFileName,
              originalFileName: fileName,
              converted: true,
              originalType: fileExtension
            });
          } else if (contentResponse.data?.content) {
            // Backend returned content directly
            let pdfFileName;
            
            if (fileExtension === 'csv') {
              // Convert CSV to PDF
              pdfFileName = await convertCsvToPdf(contentResponse.data.content, fileName);
            } else if (fileExtension === 'txt') {
              // Convert TXT to PDF
              pdfFileName = convertTextToPdf(contentResponse.data.content, fileName);
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              // Convert XLSX to PDF (content is base64)
              console.log('[Download] Converting XLSX from direct content, length:', contentResponse.data.content?.length);
              pdfFileName = await convertXlsxToPdf(contentResponse.data.content, fileName);
              console.log('[Download] XLSX conversion complete, pdfFileName:', pdfFileName);
            } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
              // Convert image to PDF
              pdfFileName = await convertImageToPdf(contentResponse.data.content, fileName);
            }
            
            toast.success(`${fileExtension.toUpperCase()} converted to PDF and downloaded`);
            
            await recordActionByNameWithFetch("Download Maintenance Document", {
              documentId: doc.id,
              fileName: pdfFileName,
              originalFileName: fileName,
              converted: true,
              originalType: fileExtension
            });
          } else {
            throw new Error(`No ${fileExtension} content or URL received from server`);
          }
        } catch (conversionError) {
          console.error(`Error converting ${fileExtension} to PDF:`, conversionError);
          // Fallback: download file as-is if conversion fails
          console.warn(`Falling back to direct ${fileExtension} download`);
          
          try {
            // Get presigned URL for fallback
            const fallbackResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
              params: { type: doc.type || 'maintenance', mode: 'download' }
            });
            
            if (fallbackResponse.data?.url) {
              window.open(fallbackResponse.data.url, '_blank');
            } else {
              throw new Error('Failed to get download URL for fallback');
            }
          } catch (fallbackError) {
            console.error('Fallback download also failed:', fallbackError);
            throw fallbackError;
          }
          
          await recordActionByNameWithFetch("Download Maintenance Document", {
            documentId: doc.id,
            fileName: fileName,
            conversionFailed: true,
            error: conversionError.message
          });
          
          toast.success("Document download started");
        }
      } else {
        // For other file types, download as-is
        window.open(response.data.url, '_blank');
        
        await recordActionByNameWithFetch("Download Maintenance Document", {
          documentId: doc.id,
          fileName: fileName
        });
        
        toast.success("Document download started");
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
      } finally {
      setLoadingDocuments(false);
    }
  };

  // Download all documents as a zip file
  const handleDownloadAllDocuments = async () => {
    if (documents.length === 0) {
      toast.error("No documents to download");
      return;
    }

    try {
      setLoadingDocuments(true);
      // Try to use JSZip if available, otherwise download individually
      let JSZipModule;
      try {
        JSZipModule = await import('jszip');
      } catch (importError) {
        console.log("JSZip not available, downloading documents individually");
        // Fallback to individual downloads
        let downloadedCount = 0;
        let failedCount = 0;

        for (const doc of documents) {
          try {
             // Get presigned URL
             const urlResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
               params: { type: doc.type || 'maintenance', mode: 'download' }
             });
             
             if (!urlResponse.data?.url) {
               throw new Error('No download URL received');
             }
             
             const fileName = urlResponse.data.fileName || doc.file_name || `document-${doc.id}`;
             const fileExtension = fileName.split('.').pop()?.toLowerCase();
             const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];

             // Convert all non-PDF files to PDF before downloading
             if (fileExtension === 'pdf') {
               window.open(urlResponse.data.url, '_blank');
             } else if (convertableExtensions.includes(fileExtension)) {
               try {
                 // Request file content directly from backend
                 const contentResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
                   params: { 
                     type: doc.type || 'maintenance', 
                     mode: 'download',
                     content: 'true'
                   }
                 });
                 
                 if (contentResponse.data?.content) {
                   if (fileExtension === 'csv') {
                     await convertCsvToPdf(contentResponse.data.content, fileName);
                   } else if (fileExtension === 'txt') {
                     convertTextToPdf(contentResponse.data.content, fileName);
                   } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                     await convertXlsxToPdf(contentResponse.data.content, fileName);
                   } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
                     await convertImageToPdf(contentResponse.data.content, fileName);
                   }
                 } else {
                   throw new Error(`No ${fileExtension} content received`);
                 }
               } catch (conversionError) {
                 console.error(`Error converting ${fileExtension} to PDF:`, conversionError);
                 // Fallback to direct download
                 window.open(urlResponse.data.url, '_blank');
               }
             } else {
               // For other file types, download as-is
               window.open(urlResponse.data.url, '_blank');
             }
            
            downloadedCount++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between downloads
          } catch (error) {
            console.error(`Error downloading document ${doc.id}:`, error);
            failedCount++;
          }
        }

        await recordActionByNameWithFetch("Download All Maintenance Documents", {
          count: downloadedCount,
          failed: failedCount,
          method: "individual"
        });

        toast.success(`Downloaded ${downloadedCount} document(s) individually${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
        return;
      }

      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      let downloadedCount = 0;
      let failedCount = 0;

       // Download each document and add to zip
       for (const doc of documents) {
         try {
                // Get presigned URL
                const urlResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
                  params: { type: doc.type || 'maintenance', mode: 'download' }
                });
                
                if (!urlResponse.data?.url) {
                  throw new Error('No download URL received');
                }
                
                const originalFileName = urlResponse.data.fileName || doc.file_name || `document-${doc.id}`;
                const fileExtension = originalFileName.split('.').pop()?.toLowerCase();
                const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];
                
                let arrayBuffer;
                let fileName = originalFileName;
                
                // Convert all non-PDF files to PDF before adding to zip
                if (fileExtension === 'pdf') {
                  // For PDF files, fetch and add directly
                  const fileResponse = await fetch(urlResponse.data.url);
                  if (!fileResponse.ok) {
                    throw new Error('Failed to fetch file');
                  }
                  arrayBuffer = await fileResponse.arrayBuffer();
                } else if (convertableExtensions.includes(fileExtension)) {
                  // Request file content from backend (avoids CORS issues)
                  const contentResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
                    params: { 
                      type: doc.type || 'maintenance', 
                      mode: 'download',
                      content: 'true'
                    }
                  });
                  
                  if (!contentResponse.data?.content) {
                    throw new Error(`No ${fileExtension} content received from server`);
                  }
                  
                  let tempPdf;
                  
                  if (fileExtension === 'csv') {
                    // Convert CSV to PDF
                    const csvText = contentResponse.data.content;
                    tempPdf = new jsPDF('l', 'mm', 'a4');
                    
                    const lines = csvText.split('\n').filter(line => line.trim());
                    if (lines.length > 0) {
                      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                      const rows = lines.slice(1).map(line => {
                        const values = [];
                        let currentValue = '';
                        let insideQuotes = false;
                        
                        for (let i = 0; i < line.length; i++) {
                          const char = line[i];
                          if (char === '"') {
                            insideQuotes = !insideQuotes;
                          } else if (char === ',' && !insideQuotes) {
                            values.push(currentValue.trim());
                            currentValue = '';
                          } else {
                            currentValue += char;
                          }
                        }
                        values.push(currentValue.trim());
                        return values.map(v => v.replace(/^"|"$/g, ''));
                      });

                      tempPdf.setFontSize(16);
                      tempPdf.setFont('helvetica', 'bold');
                      tempPdf.text(originalFileName.replace(/\.(csv|CSV)$/, ''), 14, 15);

                      autoTable(tempPdf, {
                        head: [headers],
                        body: rows,
                        startY: 25,
                        styles: { fontSize: 8, cellPadding: 2 },
                        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                        margin: { top: 25 },
                        pageBreak: 'auto',
                      });
                      
                      arrayBuffer = tempPdf.output('arraybuffer');
                      fileName = originalFileName.replace(/\.(csv|CSV)$/, '.pdf');
                    }
                  } else if (fileExtension === 'txt') {
                    // Convert TXT to PDF
                    tempPdf = new jsPDF('p', 'mm', 'a4');
                    const pageWidth = tempPdf.internal.pageSize.getWidth();
                    const margin = 15;
                    const maxWidth = pageWidth - (2 * margin);
                    let yPosition = margin;
                    
                    tempPdf.setFont('helvetica', 'normal');
                    tempPdf.setFontSize(10);
                    
                    const textContent = contentResponse.data.content;
                    const lines = tempPdf.splitTextToSize(textContent, maxWidth);
                    
                    lines.forEach((line) => {
                      if (yPosition + 7 > tempPdf.internal.pageSize.getHeight() - margin) {
                        tempPdf.addPage();
                        yPosition = margin;
                      }
                      tempPdf.text(line, margin, yPosition);
                      yPosition += 7;
                    });
                    
                    arrayBuffer = tempPdf.output('arraybuffer');
                    fileName = originalFileName.replace(/\.(txt|TXT)$/, '.pdf');
                  } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
                    // Convert image to PDF - need to load image first
                    const imageDataUrl = contentResponse.data.content;
                    const img = new Image();
                    
                    await new Promise((resolve, reject) => {
                      img.onload = () => {
                        try {
                          tempPdf = new jsPDF('p', 'mm', 'a4');
                          const pdfWidth = tempPdf.internal.pageSize.getWidth();
                          const pdfHeight = tempPdf.internal.pageSize.getHeight();
                          const margin = 10;
                          const maxWidth = pdfWidth - (2 * margin);
                          const maxHeight = pdfHeight - (2 * margin);
                          
                          let imgWidth = img.width;
                          let imgHeight = img.height;
                          const imgAspectRatio = imgWidth / imgHeight;
                          
                          if (imgWidth > maxWidth || imgHeight > maxHeight) {
                            if (imgAspectRatio > maxWidth / maxHeight) {
                              imgWidth = maxWidth;
                              imgHeight = imgWidth / imgAspectRatio;
                            } else {
                              imgHeight = maxHeight;
                              imgWidth = imgHeight * imgAspectRatio;
                            }
                          }
                          
                          const x = (pdfWidth - imgWidth) / 2;
                          const y = margin;
                          
                          const imgWidthPt = (imgWidth * 0.264583);
                          const imgHeightPt = (imgHeight * 0.264583);
                          const xPt = (x * 0.264583);
                          const yPt = (y * 0.264583);
                          
                          tempPdf.addImage(imageDataUrl, fileExtension === 'png' ? 'PNG' : 'JPEG', xPt, yPt, imgWidthPt, imgHeightPt);
                          
                          arrayBuffer = tempPdf.output('arraybuffer');
                          fileName = originalFileName.replace(/\.(jpg|jpeg|png|JPG|JPEG|PNG)$/, '.pdf');
                          resolve();
                        } catch (error) {
                          reject(error);
                        }
                      };
                      
                      img.onerror = () => {
                        reject(new Error('Failed to load image'));
                      };
                      
                      img.src = imageDataUrl;
                    });
                  }
                } else {
                  // For other file types, fetch and add as-is
                  const fileResponse = await fetch(urlResponse.data.url);
                  if (!fileResponse.ok) {
                    throw new Error('Failed to fetch file');
                  }
                  arrayBuffer = await fileResponse.arrayBuffer();
                }
                
                const folderName = doc.asset_id || 'documents';
                // JSZip handles ArrayBuffer directly
                zip.file(`${folderName}/${fileName}`, arrayBuffer, { binary: true });
          downloadedCount++;
        } catch (error) {
          console.error(`Error downloading document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (downloadedCount > 0) {
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = window.URL.createObjectURL(zipBlob);
          const link = document.createElement("a");
          link.href = url;
        link.setAttribute("download", `maintenance-documents-${new Date().toISOString().split('T')[0]}.zip`);
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

        await recordActionByNameWithFetch("Download All Maintenance Documents", {
          count: downloadedCount,
          failed: failedCount
      });
      
        toast.success(`Downloaded ${downloadedCount} document(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
      } else {
        toast.error("Failed to download any documents");
      }
    } catch (error) {
      console.error("Error downloading documents:", error);
      toast.error("Failed to download documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Download all documents as a single merged PDF
  const handleDownloadAllAsSinglePdf = async () => {
    if (documents.length === 0) {
      toast.error("No documents to download");
      return;
    }

    try {
      setLoadingDocuments(true);
      toast.loading(`Converting ${documents.length} document(s) to PDF...`);

      const mergedPdf = await PDFDocument.create();
      const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];
      let processedCount = 0;
      let failedCount = 0;

      for (const doc of documents) {
        try {
          const fileName = doc.file_name || `document-${doc.id}`;
          const fileExtension = fileName.split('.').pop()?.toLowerCase();

          // Get file content
          const contentResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
            params: { 
              type: doc.type || 'maintenance', 
              mode: 'download',
              content: 'true'
            }
          });

          if (!contentResponse.data?.content) {
            throw new Error(`No content received for ${fileName}`);
          }

          let pdfBytes;

          if (fileExtension === 'pdf') {
            // For existing PDFs, fetch and add directly
            const urlResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
              params: { type: doc.type || 'maintenance', mode: 'download' }
            });
            
            const fileResponse = await fetch(urlResponse.data.url);
            if (!fileResponse.ok) {
              throw new Error('Failed to fetch PDF');
            }
            pdfBytes = await fileResponse.arrayBuffer();
          } else if (convertableExtensions.includes(fileExtension)) {
            // Convert to PDF first, then get bytes
            const tempPdf = new jsPDF('p', 'mm', 'a4');
            
            if (fileExtension === 'csv') {
              // Convert CSV to PDF
              const csvText = contentResponse.data.content;
              const lines = csvText.split('\n').filter(line => line.trim());
              if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = lines.slice(1).map(line => {
                  const values = [];
                  let currentValue = '';
                  let insideQuotes = false;
                  
                  for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                      insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                      values.push(currentValue.trim());
                      currentValue = '';
                    } else {
                      currentValue += char;
                    }
                  }
                  values.push(currentValue.trim());
                  return values.map(v => v.replace(/^"|"$/g, ''));
                });

                tempPdf.setFontSize(16);
                tempPdf.setFont('helvetica', 'bold');
                tempPdf.text(fileName.replace(/\.(csv|CSV)$/, ''), 14, 15);

                autoTable(tempPdf, {
                  head: [headers],
                  body: rows,
                  startY: 25,
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 25 },
                  pageBreak: 'auto',
                });
              }
            } else if (fileExtension === 'txt') {
              // Convert TXT to PDF
              const pageWidth = tempPdf.internal.pageSize.getWidth();
              const margin = 15;
              const maxWidth = pageWidth - (2 * margin);
              let yPosition = margin;
              
              tempPdf.setFont('helvetica', 'normal');
              tempPdf.setFontSize(10);
              
              const textContent = contentResponse.data.content;
              const lines = tempPdf.splitTextToSize(textContent, maxWidth);
              
              lines.forEach((line) => {
                if (yPosition + 7 > tempPdf.internal.pageSize.getHeight() - margin) {
                  tempPdf.addPage();
                  yPosition = margin;
                }
                tempPdf.text(line, margin, yPosition);
                yPosition += 7;
              });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              // Convert XLSX to PDF
              const base64Content = contentResponse.data.content;
              const binaryString = atob(base64Content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const workbook = XLSX.read(bytes, { type: 'array' });
              
              workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                if (sheetIndex > 0) {
                  tempPdf.addPage();
                }
                
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) return;
                
                const headers = jsonData[0].map(cell => String(cell || ''));
                const rows = jsonData.slice(1).map(row => row.map(cell => String(cell || '')));
                
                tempPdf.setFontSize(16);
                tempPdf.setFont('helvetica', 'bold');
                tempPdf.text(sheetName, 14, 15);
                
                autoTable(tempPdf, {
                  head: [headers],
                  body: rows,
                  startY: 25,
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 25 },
                  pageBreak: 'auto',
                });
              });
            } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
              // Convert image to PDF
              const imageDataUrl = contentResponse.data.content;
              const img = new Image();
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  const pdfWidth = tempPdf.internal.pageSize.getWidth();
                  const pdfHeight = tempPdf.internal.pageSize.getHeight();
                  const margin = 10;
                  const maxWidth = pdfWidth - (2 * margin);
                  const maxHeight = pdfHeight - (2 * margin);
                  
                  let imgWidthMM = img.width * 0.264583;
                  let imgHeightMM = img.height * 0.264583;
                  const imgAspectRatio = imgWidthMM / imgHeightMM;
                  
                  if (imgWidthMM > maxWidth || imgHeightMM > maxHeight) {
                    if (imgAspectRatio > maxWidth / maxHeight) {
                      imgWidthMM = maxWidth;
                      imgHeightMM = imgWidthMM / imgAspectRatio;
                    } else {
                      imgHeightMM = maxHeight;
                      imgWidthMM = imgHeightMM * imgAspectRatio;
                    }
                  }
                  
                  const x = (pdfWidth - imgWidthMM) / 2;
                  const y = margin;
                  
                  const imageFormat = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                  tempPdf.addImage(imageDataUrl, imageFormat, x, y, imgWidthMM, imgHeightMM);
                  resolve();
                };
                img.onerror = reject;
                img.src = imageDataUrl;
              });
            }

            pdfBytes = tempPdf.output('arraybuffer');
          } else {
            // Skip unsupported file types
            console.warn(`Skipping unsupported file type: ${fileExtension}`);
            failedCount++;
            continue;
          }

          // Merge PDF into the combined document
          if (pdfBytes) {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => {
              mergedPdf.addPage(page);
            });
            processedCount++;
          }
    } catch (error) {
          console.error(`Error processing document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (processedCount > 0) {
        // Generate filename with date range
        let filename = 'QA_Audit_Report';
        if (quick.dateRange && quick.dateRange.length === 2 && quick.dateRange[0] && quick.dateRange[1]) {
          const fromDate = quick.dateRange[0];
          const toDate = quick.dateRange[1];
          // Format dates as YYYY-MM-DD
          const formatDate = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toISOString().split('T')[0];
          };
          const fromFormatted = formatDate(fromDate);
          const toFormatted = formatDate(toDate);
          if (fromFormatted && toFormatted) {
            filename += `_${fromFormatted}_to_${toFormatted}`;
          } else if (fromFormatted) {
            filename += `_${fromFormatted}`;
          }
        } else {
          // Fallback to current date if no date range
          filename += `_${new Date().toISOString().split('T')[0]}`;
        }
        filename += '.pdf';

        // Save merged PDF
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.dismiss();
        toast.success(`Merged ${processedCount} document(s) into single PDF${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);

        await recordActionByNameWithFetch("Download All Maintenance Documents as Single PDF", {
          count: processedCount,
          failed: failedCount
        });
      } else {
        toast.dismiss();
        toast.error("No documents could be processed");
      }
    } catch (error) {
      console.error("Error merging documents:", error);
      toast.dismiss();
      toast.error("Failed to merge documents");
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Audit logging handlers
  const handleGenerateReport = async () => {
    await recordActionByNameWithFetch(t('reports.auditActions.generateReport'), { 
      reportType: "QA / Audit Report",
      action: t('reports.auditActions.reportGenerated'),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  const handleExportReport = async (exportType = 'pdf') => {
    await recordActionByNameWithFetch(t('reports.auditActions.exportReport'), { 
      reportType: "QA / Audit Report",
      exportFormat: exportType,
      action: t('reports.auditActions.reportExported', { format: exportType.toUpperCase() }),
      filterCount: Object.keys(quick).filter(key => quick[key] && quick[key] !== '').length
    });
  };

  // Preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState({ current: 0, total: 0, currentFile: '' });

  // Handle preview - merge all documents into a single PDF and show in modal
  const handlePreviewReport = async () => {
    if (documents.length === 0) {
      toast.error("No documents to preview. Please apply filters to fetch documents.");
      return;
    }

    // Warn if too many documents (performance concern)
    if (documents.length > 50) {
      const proceed = window.confirm(
        `You are about to preview ${documents.length} documents. This may take a while. Do you want to continue?`
      );
      if (!proceed) return;
    }

    try {
      setLoadingPreview(true);
      setShowPreviewModal(true);
      setPreviewProgress({ current: 0, total: documents.length, currentFile: 'Initializing...' });
      
      const loadingToast = toast.loading(`Preparing ${documents.length} document(s) for preview...`);

      const mergedPdf = await PDFDocument.create();
      const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];
      let processedCount = 0;
      let failedCount = 0;

      // Process PDFs first (faster), then convert others
      const pdfDocs = documents.filter(doc => {
        const fileName = doc.file_name || `document-${doc.id}`;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        return fileExtension === 'pdf';
      });
      
      const nonPdfDocs = documents.filter(doc => {
        const fileName = doc.file_name || `document-${doc.id}`;
        const fileExtension = fileName.split('.').pop()?.toLowerCase();
        return fileExtension !== 'pdf';
      });

      // Process PDFs first
      for (const doc of pdfDocs) {
        try {
          const fileName = doc.file_name || `document-${doc.id}`;
          setPreviewProgress({ 
            current: processedCount + 1, 
            total: documents.length, 
            currentFile: fileName 
          });
          
          // Update toast with progress
          toast.loading(
            `Processing ${processedCount + 1}/${documents.length}: ${fileName.substring(0, 30)}...`,
            { id: loadingToast }
          );

          const urlResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
            params: { type: doc.type || 'maintenance', mode: 'download' }
          });
          
          const fileResponse = await fetch(urlResponse.data.url);
          if (!fileResponse.ok) {
            throw new Error('Failed to fetch PDF');
          }
          const pdfBytes = await fileResponse.arrayBuffer();

          if (pdfBytes) {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => {
              mergedPdf.addPage(page);
            });
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing PDF document ${doc.id}:`, error);
          failedCount++;
        }
      }

      // Then process non-PDF documents (slower conversion)
      for (const doc of nonPdfDocs) {
        try {
          const fileName = doc.file_name || `document-${doc.id}`;
          const fileExtension = fileName.split('.').pop()?.toLowerCase();
          
          setPreviewProgress({ 
            current: processedCount + 1, 
            total: documents.length, 
            currentFile: fileName 
          });
          
          // Update toast with progress
          toast.loading(
            `Converting ${processedCount + 1}/${documents.length}: ${fileName.substring(0, 30)}...`,
            { id: loadingToast }
          );

          // Get file content
          const contentResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
            params: { 
              type: doc.type || 'maintenance', 
              mode: 'download',
              content: 'true'
            }
          });

          if (!contentResponse.data?.content) {
            throw new Error(`No content received for ${fileName}`);
          }

          let pdfBytes;

          if (fileExtension === 'pdf') {
            // For existing PDFs, fetch and add directly
            const urlResponse = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
              params: { type: doc.type || 'maintenance', mode: 'download' }
            });
            
            const fileResponse = await fetch(urlResponse.data.url);
            if (!fileResponse.ok) {
              throw new Error('Failed to fetch PDF');
            }
            pdfBytes = await fileResponse.arrayBuffer();
          } else if (convertableExtensions.includes(fileExtension)) {
            // Convert to PDF first, then get bytes
            const tempPdf = new jsPDF('p', 'mm', 'a4');
            
            if (fileExtension === 'csv') {
              const csvText = contentResponse.data.content;
              const lines = csvText.split('\n').filter(line => line.trim());
              if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
                const rows = lines.slice(1).map(line => {
                  const values = [];
                  let currentValue = '';
                  let insideQuotes = false;
                  
                  for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    if (char === '"') {
                      insideQuotes = !insideQuotes;
                    } else if (char === ',' && !insideQuotes) {
                      values.push(currentValue.trim());
                      currentValue = '';
                    } else {
                      currentValue += char;
                    }
                  }
                  values.push(currentValue.trim());
                  return values.map(v => v.replace(/^"|"$/g, ''));
                });

                tempPdf.setFontSize(16);
                tempPdf.setFont('helvetica', 'bold');
                tempPdf.text(fileName.replace(/\.(csv|CSV)$/, ''), 14, 15);

                autoTable(tempPdf, {
                  head: [headers],
                  body: rows,
                  startY: 25,
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 25 },
                  pageBreak: 'auto',
                });
              }
            } else if (fileExtension === 'txt') {
              const pageWidth = tempPdf.internal.pageSize.getWidth();
              const margin = 15;
              const maxWidth = pageWidth - (2 * margin);
              let yPosition = margin;
              
              tempPdf.setFont('helvetica', 'normal');
              tempPdf.setFontSize(10);
              
              const textContent = contentResponse.data.content;
              const lines = tempPdf.splitTextToSize(textContent, maxWidth);
              
              lines.forEach((line) => {
                if (yPosition + 7 > tempPdf.internal.pageSize.getHeight() - margin) {
                  tempPdf.addPage();
                  yPosition = margin;
                }
                tempPdf.text(line, margin, yPosition);
                yPosition += 7;
              });
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
              const base64Content = contentResponse.data.content;
              const binaryString = atob(base64Content);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              const workbook = XLSX.read(bytes, { type: 'array' });
              
              workbook.SheetNames.forEach((sheetName, sheetIndex) => {
                if (sheetIndex > 0) {
                  tempPdf.addPage();
                }
                
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
                
                if (jsonData.length === 0) return;
                
                const headers = jsonData[0].map(cell => String(cell || ''));
                const rows = jsonData.slice(1).map(row => row.map(cell => String(cell || '')));
                
                tempPdf.setFontSize(16);
                tempPdf.setFont('helvetica', 'bold');
                tempPdf.text(sheetName, 14, 15);
                
                autoTable(tempPdf, {
                  head: [headers],
                  body: rows,
                  startY: 25,
                  styles: { fontSize: 8, cellPadding: 2 },
                  headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
                  margin: { top: 25 },
                  pageBreak: 'auto',
                });
              });
            } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
              const imageDataUrl = contentResponse.data.content;
              const img = new Image();
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  const pdfWidth = tempPdf.internal.pageSize.getWidth();
                  const pdfHeight = tempPdf.internal.pageSize.getHeight();
                  const margin = 10;
                  const maxWidth = pdfWidth - (2 * margin);
                  const maxHeight = pdfHeight - (2 * margin);
                  
                  let imgWidthMM = img.width * 0.264583;
                  let imgHeightMM = img.height * 0.264583;
                  const imgAspectRatio = imgWidthMM / imgHeightMM;
                  
                  if (imgWidthMM > maxWidth || imgHeightMM > maxHeight) {
                    if (imgAspectRatio > maxWidth / maxHeight) {
                      imgWidthMM = maxWidth;
                      imgHeightMM = imgWidthMM / imgAspectRatio;
                    } else {
                      imgHeightMM = maxHeight;
                      imgWidthMM = imgHeightMM * imgAspectRatio;
                    }
                  }
                  
                  const x = (pdfWidth - imgWidthMM) / 2;
                  const y = margin;
                  
                  const imageFormat = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                  tempPdf.addImage(imageDataUrl, imageFormat, x, y, imgWidthMM, imgHeightMM);
                  resolve();
                };
                img.onerror = reject;
                img.src = imageDataUrl;
              });
            }

            pdfBytes = tempPdf.output('arraybuffer');
          } else {
            console.warn(`Skipping unsupported file type: ${fileExtension}`);
            failedCount++;
            continue;
          }

          // Merge PDF into the combined document
          if (pdfBytes) {
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            pages.forEach((page) => {
              mergedPdf.addPage(page);
            });
            processedCount++;
          }
        } catch (error) {
          console.error(`Error processing document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (processedCount > 0) {
        // Create blob URL for preview
        setPreviewProgress({ 
          current: documents.length, 
          total: documents.length, 
          currentFile: 'Finalizing preview...' 
        });
        toast.loading('Finalizing preview...', { id: loadingToast });
        
        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
        setPreviewProgress({ current: documents.length, total: documents.length, currentFile: '' });
        toast.dismiss(loadingToast);
        toast.success(`Preview ready: ${processedCount} document(s)${failedCount > 0 ? ` (${failedCount} failed)` : ''}`);
      } else {
        toast.dismiss(loadingToast);
        toast.error("No documents could be processed for preview");
        setShowPreviewModal(false);
      }
    } catch (error) {
      console.error("Error preparing preview:", error);
      toast.dismiss();
      toast.error("Failed to prepare preview");
      setShowPreviewModal(false);
      setPreviewProgress({ current: 0, total: 0, currentFile: '' });
    } finally {
      setLoadingPreview(false);
    }
  };

  // Close preview modal and cleanup
  const handleClosePreview = () => {
    setShowPreviewModal(false);
    if (previewPdfUrl) {
      window.URL.revokeObjectURL(previewPdfUrl);
      setPreviewPdfUrl(null);
    }
    setPreviewProgress({ current: 0, total: 0, currentFile: '' });
  };

  // Download dropdown state
  const [downloadDropdownOpen, setDownloadDropdownOpen] = useState(false);
  const downloadDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (downloadDropdownRef.current && !downloadDropdownRef.current.contains(event.target)) {
        setDownloadDropdownOpen(false);
      }
    };

    if (downloadDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [downloadDropdownOpen]);

  return (
    <div className="space-y-4">
      {/* Document Download Actions */}
      {documents.length > 0 && (
        <div className="bg-white shadow-sm border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-semibold">Documents</div>
              <div className="text-sm text-slate-500">
                {documents.length} document(s) available
              </div>
            </div>
            <div className="relative" ref={downloadDropdownRef}>
            <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                disabled={loadingDocuments}
                className="flex items-center gap-2 px-4 py-2 bg-[#143d65] text-white rounded-lg hover:bg-[#0f2d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
                Download
                <ChevronDown className={`w-4 h-4 transition-transform ${downloadDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
              
              {downloadDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 z-50">
            <button
                    onClick={() => {
                      setDownloadDropdownOpen(false);
                      handleDownloadAllAsSinglePdf();
                    }}
                    disabled={loadingDocuments}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      setDownloadDropdownOpen(false);
                      handleDownloadAllDocuments();
                    }}
                    disabled={loadingDocuments}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border-t border-slate-200"
            >
              <Download className="w-4 h-4" />
                    Zip
            </button>
          </div>
              )}
            </div>
          </div>

          {/* Documents List */}
          <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
            {documents.map((doc, idx) => (
              <div
                key={doc.id || idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center gap-3 flex-1">
                  {doc.is_before_after ? (
                    <ImageIcon className="w-5 h-5 text-blue-600" />
                  ) : (
                    <FileText className="w-5 h-5 text-green-600" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {doc.asset_name || doc.asset_type_name || 'Asset Type Document'} {doc.asset_id && `(${doc.asset_id})`}
                      {doc.asset_type_name && !doc.asset_id && ` (${doc.asset_type_name})`}
                    </div>
                    <div className="text-sm text-slate-500">
                      {doc.file_name || `Document ${doc.id}`}
                      {` • ${doc.date ? new Date(doc.date).toLocaleDateString() : 'N/A'}`}
                      {doc.certificate_type && ` • ${doc.certificate_type}`}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadDocument(doc)}
                  disabled={loadingDocuments}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Section Only - No Table View */}
      <ReportLayout
        report={report}
        selectedReportId={selectedReportId}
        allRows={[]}
        filteredRows={[]}
        quick={quick}
        setQuick={setQuick}
        setQuickField={setQuickField}
        advanced={advanced}
        setAdvanced={setAdvanced}
        columns={columns}
        setColumns={setColumns}
        views={views}
        setViews={setViews}
        loading={loading || loadingDocuments}
        error={error}
        apiData={filterOptions ? { filterOptions } : undefined}
        onGenerateReport={handleGenerateReport}
        onExportReport={handleExportReport}
        hideTable={true}
        hideAdvancedFilters={true}
        hideGenerateReport={true}
        onPreviewReport={handlePreviewReport}
      />

      {/* Preview Modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90vw] h-[90vh] flex flex-col shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Document Preview</h2>
                <p className="text-sm text-slate-500">{documents.length} document(s) merged</p>
              </div>
              <button
                onClick={handleClosePreview}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* PDF Preview */}
            <div className="flex-1 overflow-hidden">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#143d65] mx-auto mb-4"></div>
                    <p className="text-slate-600 font-medium mb-2">Preparing preview...</p>
                    {previewProgress.total > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">
                          Processing {previewProgress.current} of {previewProgress.total} documents
                        </p>
                        <div className="w-64 bg-slate-200 rounded-full h-2 mx-auto">
                          <div 
                            className="bg-[#143d65] h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(previewProgress.current / previewProgress.total) * 100}%` }}
                          ></div>
                        </div>
                        {previewProgress.currentFile && (
                          <p className="text-xs text-slate-400 mt-2 truncate max-w-md">
                            {previewProgress.currentFile}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-0"
                  title="Document Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">No preview available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
