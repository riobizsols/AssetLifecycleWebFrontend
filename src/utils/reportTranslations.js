import { useTranslation } from 'react-i18next';

/**
 * Utility function to get translated field labels
 * @param {string} key - The field key
 * @returns {string} - The translated label
 */
export const getTranslatedFieldLabel = (key) => {
  const { t } = useTranslation();
  
  const fieldLabelMap = {
    // Asset Lifecycle Report fields
    'purchaseDateRange': t('reports.fieldLabels.purchaseDate'),
    'commissionedDateRange': t('reports.fieldLabels.commissionedDate'),
    'assetUsageHistory': t('reports.fieldLabels.assetUsageHistory'),
    'currentStatus': t('reports.fieldLabels.currentStatus'),
    'assetId': t('reports.fieldLabels.assetId'),
    'assetName': t('reports.fieldLabels.assetName'),
    'category': t('reports.fieldLabels.category'),
    'location': t('reports.fieldLabels.location'),
    'department': t('reports.fieldLabels.department'),
    'vendor': t('reports.fieldLabels.vendor'),
    'scrapDateRange': t('reports.fieldLabels.scrapDate'),
    'scrapLocation': t('reports.fieldLabels.scrapLocation'),
    'scrappedBy': t('reports.fieldLabels.scrappedBy'),
    'buyer': t('reports.fieldLabels.buyer'),
    'saleDateRange': t('reports.fieldLabels.saleDate'),
    'saleAmount': t('reports.fieldLabels.saleAmount'),
    'assetStatus': t('reports.fieldLabels.assetStatus'),
    'includeScrapAssets': t('reports.fieldLabels.includeScrapAssets'),
    'currentValueRange': t('reports.fieldLabels.currentValueRange'),
    'assetCategoryType': t('reports.fieldLabels.assetCategoryType'),
    'acquisitionDateRange': t('reports.fieldLabels.acquisitionDate'),
    'assetCode': t('reports.fieldLabels.assetCode'),
    'originalCost': t('reports.fieldLabels.originalCost'),
    'accumulatedDepreciation': t('reports.fieldLabels.accumulatedDepreciation'),
    'netBookValue': t('reports.fieldLabels.netBookValue'),
    'depreciationMethod': t('reports.fieldLabels.depreciationMethod'),
    'usefulLife': t('reports.fieldLabels.usefulLife'),
    'employee': t('reports.fieldLabels.employee'),
    'poNumber': t('reports.fieldLabels.poNumber'),
    'invoiceNumber': t('reports.fieldLabels.invoiceNumber'),
    'maintenanceStartDateRange': t('reports.fieldLabels.maintenanceStartDateRange'),
    'maintenanceEndDateRange': t('reports.fieldLabels.maintenanceEndDateRange'),
    'notes': t('reports.fieldLabels.notes'),
    'vendorId': t('reports.fieldLabels.vendorId'),
    'workOrderId': t('reports.fieldLabels.workOrderId'),
    'plannedScheduleDateRange': t('reports.fieldLabels.plannedScheduleDateRange'),
    'actualScheduleDateRange': t('reports.fieldLabels.actualScheduleDateRange'),
    'breakdownDateRange': t('reports.fieldLabels.breakdownDateRange'),
    'reportedBy': t('reports.fieldLabels.reportedBy'),
  };
  
  return fieldLabelMap[key] || key;
};

/**
 * Get translated report name and description
 * @param {string} reportId - The report ID
 * @returns {object} - Object with translated name and description
 */
export const getTranslatedReportInfo = (reportId) => {
  const { t } = useTranslation();
  
  const reportInfoMap = {
    'asset-lifecycle': {
      name: t('reports.assetLifecycleReport.name'),
      description: t('reports.assetLifecycleReport.description')
    },
    'asset-register': {
      name: t('reports.assetRegisterReport.name'),
      description: t('reports.assetRegisterReport.description')
    },
    'maintenance-history': {
      name: t('reports.maintenanceHistoryReport.name'),
      description: t('reports.maintenanceHistoryReport.description')
    },
    'asset-workflow-history': {
      name: t('reports.assetWorkflowHistoryReport.name'),
      description: t('reports.assetWorkflowHistoryReport.description')
    },
    'breakdown-history': {
      name: t('reports.breakdownHistoryReport.name'),
      description: t('reports.breakdownHistoryReport.description')
    },
    'asset-valuation': {
      name: t('reports.assetValuationReport'),
      description: t('reports.assetValuationReport') // You may want to add a specific description
    }
  };
  
  return reportInfoMap[reportId] || { name: reportId, description: '' };
};

/**
 * Get translated placeholder text
 * @param {string} key - The placeholder key
 * @returns {string} - The translated placeholder
 */
export const getTranslatedPlaceholder = (key) => {
  const { t } = useTranslation();
  
  const placeholderMap = {
    'searchAssetId': t('reports.placeholders.searchAssetId'),
    'enterMinimumValue': t('reports.placeholders.enterMinimumValue'),
    'searchVendor': t('reports.placeholders.searchVendor'),
    'searchEmployee': t('reports.placeholders.searchEmployee'),
    'searchWorkOrderId': t('reports.placeholders.searchWorkOrderId'),
    'enterPONumber': t('reports.placeholders.enterPONumber'),
    'enterInvoiceNumber': t('reports.placeholders.enterInvoiceNumber'),
    'searchWithinNotes': t('reports.placeholders.searchWithinNotes'),
  };
  
  return placeholderMap[key] || t('reports.filterOptions.searchPlaceholder');
};

/**
 * Get translated column header
 * @param {string} columnName - The column name
 * @param {function} t - Translation function from useTranslation hook
 * @returns {string} - The translated column header
 */
export const getTranslatedColumnHeader = (columnName, t = null) => {
  // If t is not provided, return the column name as-is (for cases where hook can't be used)
  if (!t) {
    return columnName;
  }
  
  const columnHeaderMap = {
    'Asset ID': t('reports.columnHeaders.assetId'),
    'Asset Name': t('reports.columnHeaders.assetName'),
    'Asset Code': t('reports.columnHeaders.assetCode'),
    'Name': t('reports.columnHeaders.assetName'),
    'Category': t('reports.columnHeaders.category'),
    'Location': t('reports.columnHeaders.location'),
    'Department': t('reports.columnHeaders.department'),
    'Vendor': t('reports.columnHeaders.vendor'),
    'Purchase Date': t('reports.columnHeaders.purchaseDate'),
    'Commissioned Date': t('reports.columnHeaders.commissionedDate'),
    'Asset Usage History': t('reports.columnHeaders.assetUsageHistory'),
    'Current Status': t('reports.columnHeaders.currentStatus'),
    'Scrap Date': t('reports.columnHeaders.scrapDate'),
    'Scrap Location': t('reports.columnHeaders.scrapLocation'),
    'Scrapped By': t('reports.columnHeaders.scrappedBy'),
    'Buyer': t('reports.columnHeaders.buyer'),
    'Sale Date': t('reports.columnHeaders.saleDate'),
    'Sale Amount': t('reports.columnHeaders.saleAmount'),
    'Asset Status': t('reports.columnHeaders.assetStatus'),
    'Acquisition Date': t('reports.columnHeaders.acquisitionDate'),
    'Current Value': t('reports.columnHeaders.currentValue'),
    'Original Cost': t('reports.columnHeaders.originalCost'),
    'Accumulated Depreciation': t('reports.columnHeaders.accumulatedDepreciation'),
    'Net Book Value': t('reports.columnHeaders.netBookValue'),
    'Depreciation Method': t('reports.columnHeaders.depreciationMethod'),
    'Useful Life': t('reports.columnHeaders.usefulLife'),
    'Assigned Employee': t('reports.columnHeaders.assignedEmployee'),
    'Cost': t('reports.columnHeaders.cost'),
    'Work Order ID': t('reports.columnHeaders.workOrderId'),
    'Maintenance Start Date': t('reports.columnHeaders.maintenanceStartDate'),
    'Maintenance End Date': t('reports.columnHeaders.maintenanceEndDate'),
    'Notes': t('reports.fieldLabels.notes'),
    'Vendor ID': t('reports.fieldLabels.vendorId'),
    'Vendor Name': t('reports.columnHeaders.vendorName'),
    'Work Order Status': t('reports.columnHeaders.workOrderStatus'),
    'Maintenance Type': t('reports.columnHeaders.maintenanceType'),
    'Cost (₹)': t('reports.columnHeaders.cost'),
    'Downtime (h)': t('reports.columnHeaders.downtime'),
    'Workflow Step': t('reports.columnHeaders.workflowStep'),
    'Planned Schedule Date': t('reports.columnHeaders.plannedScheduleDate'),
    'Actual Schedule Date': t('reports.columnHeaders.actualScheduleDate'),
    'Workflow Status': t('reports.columnHeaders.workflowStatus'),
    'Step Status': t('reports.columnHeaders.stepStatus'),
    'Assigned To': t('reports.columnHeaders.assignedTo'),
    'Asset Type': t('reports.columnHeaders.assetType'),
    'Serial Number': t('reports.columnHeaders.serialNumber'),
    'Breakdown ID': t('reports.columnHeaders.breakdownId'),
    'Breakdown Date': t('reports.columnHeaders.breakdownDate'),
    'Description': t('reports.columnHeaders.description'),
    'Reported By': t('reports.columnHeaders.reportedBy'),
    'Breakdown Status': t('reports.columnHeaders.breakdownStatus'),
    'Breakdown Reason': t('reports.columnHeaders.breakdownReason'),
    'Branch': t('reports.columnHeaders.branch'),
    'Usage ID': t('reports.columnHeaders.usageId'),
    'Usage Counter': t('reports.columnHeaders.usageCounter'),
    'Recorded By': t('reports.columnHeaders.recordedBy'),
    'Recorded Date': t('reports.columnHeaders.recordedDate'),
    'Employee Name': t('reports.columnHeaders.employeeName'),
    'Asset Description': t('reports.columnHeaders.assetDescription'),
  };
  
  // If translation is missing, the t() function might return the key itself
  // Check if it's still a key (starts with 'reports.') and return a human-readable fallback
  const translated = columnHeaderMap[columnName];
  
  // If translation returns the key (not found), provide fallbacks
  if (translated && typeof translated === 'string' && translated.startsWith('reports.columnHeaders.')) {
    // Translation key not found, use a human-readable fallback based on the key
    const fallbackMap = {
      'reports.columnHeaders.usageId': 'Usage ID',
      'reports.columnHeaders.usageCounter': 'Usage Counter',
      'reports.columnHeaders.recordedBy': 'Recorded By',
      'reports.columnHeaders.recordedDate': 'Recorded Date',
      'reports.columnHeaders.employeeName': 'Employee Name',
      'reports.columnHeaders.assetDescription': 'Asset Description',
      'reports.columnHeaders.department': 'Department',
      'reports.columnHeaders.branch': 'Branch',
      'reports.columnHeaders.assetType': 'Asset Type',
      'reports.columnHeaders.serialNumber': 'Serial Number',
    };
    return fallbackMap[translated] || columnName;
  }
  
  return translated || columnName;
};

/**
 * Hook to get translated report configuration
 * @param {object} report - The report configuration object
 * @returns {object} - The report with translated labels
 */
export const useTranslatedReport = (report) => {
  const { t } = useTranslation();
  
  if (!report) return report;
  
  // Get translated report info
  const translatedInfo = getTranslatedReportInfo(report.id);
  
  // Translate quick fields
  const translatedQuickFields = report.quickFields?.map(field => ({
    ...field,
    label: getTranslatedFieldLabel(field.key),
    placeholder: field.placeholder ? getTranslatedPlaceholder(field.placeholder) : undefined
  })) || [];
  
  // Translate regular fields
  const translatedFields = report.fields?.map(field => ({
    ...field,
    label: getTranslatedFieldLabel(field.key),
    placeholder: field.placeholder ? getTranslatedPlaceholder(field.placeholder) : undefined
  })) || [];
  
  return {
    ...report,
    name: translatedInfo.name || report.name,
    description: translatedInfo.description || report.description,
    quickFields: translatedQuickFields,
    fields: translatedFields
  };
};
