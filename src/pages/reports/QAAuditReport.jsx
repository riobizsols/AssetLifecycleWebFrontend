import { showBackendTextToast } from '../../utils/errorTranslation';
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
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTOLOADFILTEROPTIONS_499D390E', fallbackText: t("reports.qaAuditReport.failedToLoadFilterOptions"), type: 'error' });
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
          toast(t("reports.qaAuditReport.noMaintenanceDocumentsFound"), { icon: 'ℹ️' });
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTOFETCHDOCUMENTS_2E0EBC70', fallbackText: t("reports.qaAuditReport.failedToFetchDocuments"), type: 'error' });
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

  // Always stream via API — MinIO host is often unreachable from the browser
  // (presigned URLs point at MINIO_END_POINT which times out in the client).
  const getCertificateDownloadInfo = async (doc, { mode = 'download' } = {}) => {
    const response = await API.get(`/qa-audit/certificates/${doc.id}/download`, {
      params: {
        type: doc.type || 'maintenance',
        mode,
        stream: 'true',
      },
      timeout: 120000,
      responseType: 'blob',
    });

    const contentType = String(response.headers?.['content-type'] || '');
    const fallbackName = doc.file_name || `document-${doc.id}`;

    // Error JSON returned as a Blob
    if (contentType.includes('application/json')) {
      const text = await (response.data instanceof Blob
        ? response.data.text()
        : Promise.resolve(String(response.data)));
      let payload = {};
      try {
        payload = JSON.parse(text);
      } catch {
        payload = { message: text };
      }
      throw new Error(payload.message || payload.error || 'Download failed');
    }

    const blob = response.data instanceof Blob
      ? response.data
      : new Blob([response.data]);

    // Empty/error-looking blobs
    if (!blob.size) {
      throw new Error('Empty file received from server');
    }

    const objectUrl = window.URL.createObjectURL(blob);
    return {
      url: objectUrl,
      fileName: fallbackName,
      blob,
      revokeUrl: true,
    };
  };

  // File bytes always come from API stream (localhost backend → MinIO)
  const fetchCertificateBlob = async (doc, { mode = 'download' } = {}) => {
    const info = await getCertificateDownloadInfo(doc, { mode });
    const fileExtension = info.fileName.split('.').pop()?.toLowerCase() || '';
    return {
      url: info.url,
      fileName: info.fileName,
      fileExtension,
      blob: info.blob,
      revokeUrl: info.revokeUrl,
    };
  };

  const blobToText = (blob) => blob.text();

  const blobToBase64 = async (blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const blobToDataUrl = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const triggerBrowserDownload = (url, fileName) => {
    // Same pattern as ReportLayout exports — no new tab / MinIO redirect
    const link = document.createElement('a');
    link.href = url;
    if (fileName) link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Download individual document using presigned URL - same approach as UpdateAssetModal
  const handleDownloadDocument = async (doc) => {
    let revokeUrl = false;
    let urlToRevoke = null;
    try {
      setLoadingDocuments(true);

      const fetched = await fetchCertificateBlob(doc);
      const { url, fileName, fileExtension, blob } = fetched;
      revokeUrl = fetched.revokeUrl;
      urlToRevoke = url;
      const convertableExtensions = ['csv', 'txt', 'xlsx', 'xls', 'jpg', 'jpeg', 'png'];

      if (fileExtension === 'pdf' || !convertableExtensions.includes(fileExtension)) {
        triggerBrowserDownload(url, fileName);

        await recordActionByNameWithFetch("Download Maintenance Document", {
          documentId: doc.id,
          fileName: fileName
        });

        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_DOCUMENTDOWNLOADSTARTED_3C70953C', fallbackText: t("reports.qaAuditReport.documentDownloadStarted"), type: 'success' });
        return;
      }

      try {
        let pdfFileName;
        if (fileExtension === 'csv') {
          pdfFileName = await convertCsvToPdf(await blobToText(blob), fileName);
        } else if (fileExtension === 'txt') {
          pdfFileName = convertTextToPdf(await blobToText(blob), fileName);
        } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
          pdfFileName = await convertXlsxToPdf(await blobToBase64(blob), fileName);
        } else if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
          pdfFileName = await convertImageToPdf(await blobToDataUrl(blob), fileName);
        }

        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_CONVERTEDTOPDFANDDOWNLOAD_44017A21', fallbackText: t("reports.qaAuditReport.convertedToPdfAndDownloaded", { format: fileExtension.toUpperCase() }), type: 'success' });

        await recordActionByNameWithFetch("Download Maintenance Document", {
          documentId: doc.id,
          fileName: pdfFileName,
          originalFileName: fileName,
          converted: true,
          originalType: fileExtension
        });
      } catch (conversionError) {
        console.error(`Error converting ${fileExtension} to PDF:`, conversionError);
        triggerBrowserDownload(url, fileName);

        await recordActionByNameWithFetch("Download Maintenance Document", {
          documentId: doc.id,
          fileName: fileName,
          conversionFailed: true,
          error: conversionError.message
        });

        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_DOCUMENTDOWNLOADSTARTED_3C70953C', fallbackText: t("reports.qaAuditReport.documentDownloadStarted"), type: 'success' });
      }
    } catch (error) {
      console.error("Error downloading document:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTODOWNLOADDOCUMENT_628EF84B', fallbackText: t("reports.qaAuditReport.failedToDownloadDocument"), type: 'error' });
    } finally {
      if (revokeUrl && urlToRevoke) {
        setTimeout(() => window.URL.revokeObjectURL(urlToRevoke), 30_000);
      }
      setLoadingDocuments(false);
    }
  };

  // Download all documents as a zip file (fetch bytes from MinIO URLs, not API content proxy)
  const handleDownloadAllDocuments = async () => {
    if (documents.length === 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_NODOCUMENTSTODOWNLOAD_2F61CE80', fallbackText: t("reports.qaAuditReport.noDocumentsToDownload"), type: 'error' });
      return;
    }

    try {
      setLoadingDocuments(true);
      let JSZipModule;
      try {
        JSZipModule = await import('jszip');
      } catch (importError) {
        console.log(t("reports.qaAuditReport.jsZipNotAvailable"));
        let downloadedCount = 0;
        let failedCount = 0;
        for (const doc of documents) {
          try {
            const { url, fileName } = await getCertificateDownloadInfo(doc);
            triggerBrowserDownload(url, fileName);
            downloadedCount++;
            await new Promise((resolve) => setTimeout(resolve, 400));
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
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_DOWNLOADEDINDIVIDUALLY_45C3D367', fallbackText: t("reports.qaAuditReport.downloadedIndividually", { count: downloadedCount, failed: failedCount > 0 ? t("reports.qaAuditReport.failedCountSuffix", { count: failedCount }) : '' }), type: 'success' });
        return;
      }

      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      let downloadedCount = 0;
      let failedCount = 0;
      const usedNames = new Set();

      for (const doc of documents) {
        try {
          const { fileName, blob } = await fetchCertificateBlob(doc);
          let uniqueName = fileName;
          let i = 1;
          while (usedNames.has(uniqueName)) {
            const parts = fileName.split('.');
            const ext = parts.length > 1 ? parts.pop() : '';
            uniqueName = `${parts.join('.')}_${i}${ext ? `.${ext}` : ''}`;
            i += 1;
          }
          usedNames.add(uniqueName);
          zip.file(uniqueName, await blob.arrayBuffer());
          downloadedCount++;
        } catch (error) {
          console.error(`Error downloading document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (downloadedCount > 0) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(zipBlob);
        link.setAttribute("download", `maintenance-documents-${new Date().toISOString().split('T')[0]}.zip`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        await recordActionByNameWithFetch("Download All Maintenance Documents", {
          count: downloadedCount,
          failed: failedCount
        });
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_DOWNLOADEDCOUNT_40485552', fallbackText: t("reports.qaAuditReport.downloadedCount", { count: downloadedCount, failed: failedCount > 0 ? t("reports.qaAuditReport.failedCountSuffix", { count: failedCount }) : '' }), type: 'success' });
      } else {
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTODOWNLOADANY_57380B12', fallbackText: t("reports.qaAuditReport.failedToDownloadAny"), type: 'error' });
      }
    } catch (error) {
      console.error("Error downloading documents:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTODOWNLOADDOCUMENTS_10AFEF5E', fallbackText: t("reports.qaAuditReport.failedToDownloadDocuments"), type: 'error' });
    } finally {
      setLoadingDocuments(false);
    }
  };

  // Convert a downloaded blob into PDF bytes for merge/preview (no API content proxy)
  const convertBlobToPdfBytes = async (blob, fileName, fileExtension) => {
    if (fileExtension === 'pdf') {
      return await blob.arrayBuffer();
    }

    if (fileExtension === 'csv') {
      const csvText = await blobToText(blob);
      const tempPdf = new jsPDF('l', 'mm', 'a4');
      const lines = csvText.split('\n').filter((line) => line.trim());
      if (!lines.length) throw new Error('CSV file is empty');
      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
      const rows = lines.slice(1).map((line) => {
        const values = [];
        let currentValue = '';
        let insideQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') insideQuotes = !insideQuotes;
          else if (char === ',' && !insideQuotes) {
            values.push(currentValue.trim());
            currentValue = '';
          } else currentValue += char;
        }
        values.push(currentValue.trim());
        return values.map((v) => v.replace(/^"|"$/g, ''));
      });
      tempPdf.setFontSize(16);
      tempPdf.setFont('helvetica', 'bold');
      tempPdf.text(fileName.replace(/\.(csv|CSV)$/i, ''), 14, 15);
      autoTable(tempPdf, {
        head: [headers],
        body: rows,
        startY: 25,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
        margin: { top: 25 },
        pageBreak: 'auto',
      });
      return tempPdf.output('arraybuffer');
    }

    if (fileExtension === 'txt') {
      const textContent = await blobToText(blob);
      const tempPdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = tempPdf.internal.pageSize.getWidth();
      const margin = 15;
      const maxWidth = pageWidth - (2 * margin);
      let yPosition = margin;
      tempPdf.setFont('helvetica', 'normal');
      tempPdf.setFontSize(10);
      const splitText = tempPdf.splitTextToSize(textContent, maxWidth);
      for (const line of splitText) {
        if (yPosition > tempPdf.internal.pageSize.getHeight() - margin) {
          tempPdf.addPage();
          yPosition = margin;
        }
        tempPdf.text(line, margin, yPosition);
        yPosition += 5;
      }
      return tempPdf.output('arraybuffer');
    }

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const base64Content = await blobToBase64(blob);
      const binaryString = atob(base64Content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
      const workbook = XLSX.read(bytes, { type: 'array' });
      const tempPdf = new jsPDF('l', 'mm', 'a4');
      workbook.SheetNames.forEach((sheetName, sheetIndex) => {
        if (sheetIndex > 0) tempPdf.addPage();
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        if (!jsonData.length) return;
        const headers = jsonData[0].map((cell) => String(cell || ''));
        const rows = jsonData.slice(1).map((row) => row.map((cell) => String(cell || '')));
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
      return tempPdf.output('arraybuffer');
    }

    if (fileExtension === 'jpg' || fileExtension === 'jpeg' || fileExtension === 'png') {
      const dataUrl = await blobToDataUrl(blob);
      const tempPdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = tempPdf.internal.pageSize.getWidth();
      const pageHeight = tempPdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgProps = tempPdf.getImageProperties(dataUrl);
      const ratio = Math.min(
        (pageWidth - 2 * margin) / imgProps.width,
        (pageHeight - 2 * margin) / imgProps.height,
      );
      const imgWidth = imgProps.width * ratio;
      const imgHeight = imgProps.height * ratio;
      tempPdf.addImage(
        dataUrl,
        fileExtension === 'png' ? 'PNG' : 'JPEG',
        (pageWidth - imgWidth) / 2,
        margin,
        imgWidth,
        imgHeight,
      );
      return tempPdf.output('arraybuffer');
    }

    throw new Error(`Unsupported file type for PDF merge: ${fileExtension || 'unknown'}`);
  };

  // Download all documents as a single merged PDF (bytes from MinIO, conversion in browser)
  const handleDownloadAllAsSinglePdf = async () => {
    if (documents.length === 0) {
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_NODOCUMENTSTODOWNLOAD_2F61CE80', fallbackText: t("reports.qaAuditReport.noDocumentsToDownload"), type: 'error' });
      return;
    }

    try {
      setLoadingDocuments(true);
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_CONVERTINGTOPDF_09F69F12', fallbackText: t("reports.qaAuditReport.convertingToPdf", { count: documents.length }), type: 'loading' });

      const mergedPdf = await PDFDocument.create();
      let processedCount = 0;
      let failedCount = 0;

      for (const doc of documents) {
        try {
          const { fileName, fileExtension, blob } = await fetchCertificateBlob(doc);
          const pdfBytes = await convertBlobToPdfBytes(blob, fileName, fileExtension);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
          processedCount++;
        } catch (error) {
          console.error(`Error processing document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (processedCount > 0) {
        let filename = 'QA_Audit_Documents';
        if (quick?.dateRange?.[0] && quick?.dateRange?.[1]) {
          const fromFormatted = new Date(quick.dateRange[0]).toISOString().split('T')[0];
          const toFormatted = new Date(quick.dateRange[1]).toISOString().split('T')[0];
          filename += fromFormatted === toFormatted
            ? `_${fromFormatted}`
            : `_${fromFormatted}_to_${toFormatted}`;
        } else {
          filename += `_${new Date().toISOString().split('T')[0]}`;
        }
        filename += '.pdf';

        const mergedPdfBytes = await mergedPdf.save();
        const outBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(outBlob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        toast.dismiss();
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_MERGEDINTOSINGLEPDF_696DCD3C', fallbackText: t("reports.qaAuditReport.mergedIntoSinglePdf", { count: processedCount, failed: failedCount > 0 ? t("reports.qaAuditReport.failedCountSuffix", { count: failedCount }) : '' }), type: 'success' });
        await recordActionByNameWithFetch("Download All Maintenance Documents as Single PDF", {
          count: processedCount,
          failed: failedCount
        });
      } else {
        toast.dismiss();
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_NODOCUMENTSPROCESSED_0BAE75AF', fallbackText: t("reports.qaAuditReport.noDocumentsProcessed"), type: 'error' });
      }
    } catch (error) {
      console.error("Error merging documents:", error);
      toast.dismiss();
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTOMERGEDOCUMENTS_6654F3D2', fallbackText: t("reports.qaAuditReport.failedToMergeDocuments"), type: 'error' });
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
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_NODOCUMENTSTOPREVIEW_40878430', fallbackText: t("reports.qaAuditReport.noDocumentsToPreview"), type: 'error' });
      return;
    }

    if (documents.length > 50) {
      const proceed = window.confirm(
        t("reports.qaAuditReport.previewManyConfirm", { count: documents.length })
      );
      if (!proceed) return;
    }

    try {
      setLoadingPreview(true);
      setShowPreviewModal(true);
      setPreviewProgress({ current: 0, total: documents.length, currentFile: t("reports.qaAuditReport.initializing") });
      const loadingToast = showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_PREPARINGFORPREVIEW_5DFB2097', fallbackText: t("reports.qaAuditReport.preparingForPreview", { count: documents.length }), type: 'loading' });

      const mergedPdf = await PDFDocument.create();
      let processedCount = 0;
      let failedCount = 0;

      for (let idx = 0; idx < documents.length; idx++) {
        const doc = documents[idx];
        try {
          const { fileName, fileExtension, blob } = await fetchCertificateBlob(doc);
          setPreviewProgress({
            current: idx + 1,
            total: documents.length,
            currentFile: fileName,
          });
          showBackendTextToast({
            toast,
            tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_PROCESSINGPROGRESS_33D33FE6',
            fallbackText: t("reports.qaAuditReport.processingProgress", {
              current: idx + 1,
              total: documents.length,
              fileName: fileName.substring(0, 30),
            }),
            type: 'loading',
          });

          const pdfBytes = await convertBlobToPdfBytes(blob, fileName, fileExtension);
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
          pages.forEach((page) => mergedPdf.addPage(page));
          processedCount++;
        } catch (error) {
          console.error(`Error processing preview document ${doc.id}:`, error);
          failedCount++;
        }
      }

      if (processedCount > 0) {
        setPreviewProgress({
          current: documents.length,
          total: documents.length,
          currentFile: t("reports.qaAuditReport.finalizingPreview")
        });
        showBackendTextToast({
          toast,
          tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FINALIZINGPREVIEW_5501E70D',
          fallbackText: t("reports.qaAuditReport.finalizingPreview"),
          type: 'loading',
        });

        const mergedPdfBytes = await mergedPdf.save();
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        setPreviewPdfUrl(url);
        setPreviewProgress({ current: documents.length, total: documents.length, currentFile: '' });
        toast.dismiss(loadingToast);
        toast.success(
          t("reports.qaAuditReport.previewReady", {
            count: processedCount,
            failed: failedCount > 0 ? t("reports.qaAuditReport.failedCountSuffix", { count: failedCount }) : '',
          }),
        );
      } else {
        toast.dismiss(loadingToast);
        showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_NODOCUMENTSPROCESSEDFORPR_6FEDE010', fallbackText: t("reports.qaAuditReport.noDocumentsProcessedForPreview"), type: 'error' });
      }
    } catch (error) {
      console.error("Error preparing preview:", error);
      toast.dismiss();
      showBackendTextToast({ toast, tmdId: 'TMD_I18N_REPORTS_QAAUDITREPORT_FAILEDTOPREPAREPREVIEW_2DA910CD', fallbackText: t("reports.qaAuditReport.failedToPreparePreview"), type: 'error' });
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
              <div className="text-lg font-semibold">{t("reports.qaAuditReport.documents")}</div>
              <div className="text-sm text-slate-500">
                {t("reports.qaAuditReport.documentsAvailable", { count: documents.length })}
              </div>
            </div>
            <div className="relative" ref={downloadDropdownRef}>
            <button
                onClick={() => setDownloadDropdownOpen(!downloadDropdownOpen)}
                disabled={loadingDocuments}
                className="flex items-center gap-2 px-4 py-2 bg-[#143d65] text-white rounded-lg hover:bg-[#0f2d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-4 h-4" />
                {t("reports.qaAuditReport.download")}
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
                    {t("reports.qaAuditReport.pdf")}
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
                    {t("reports.qaAuditReport.zip")}
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
                      {doc.asset_name || doc.asset_type_name || t("reports.qaAuditReport.assetTypeDocument")} {doc.asset_id && `(${doc.asset_id})`}
                      {doc.asset_type_name && !doc.asset_id && ` (${doc.asset_type_name})`}
                    </div>
                    <div className="text-sm text-slate-500">
                      {doc.file_name || t("reports.qaAuditReport.documentId", { id: doc.id })}
                      {` • ${doc.date ? new Date(doc.date).toLocaleDateString() : t("reports.qaAuditReport.notAvailable")}`}
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
                  {t("reports.qaAuditReport.download")}
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
                <h2 className="text-xl font-semibold text-slate-900">{t("reports.qaAuditReport.documentPreview")}</h2>
                <p className="text-sm text-slate-500">{t("reports.qaAuditReport.documentsMerged", { count: documents.length })}</p>
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
                    <p className="text-slate-600 font-medium mb-2">{t("reports.qaAuditReport.preparingPreview")}</p>
                    {previewProgress.total > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm text-slate-500">
                          {t("reports.qaAuditReport.processingOfTotal", { current: previewProgress.current, total: previewProgress.total })}
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
                  title={t("reports.qaAuditReport.documentPreview")}
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-slate-500">{t("reports.qaAuditReport.noPreviewAvailable")}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
