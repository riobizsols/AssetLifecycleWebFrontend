// @ts-check

/**
 * Quick + advanced fields for each Reports sidebar screen.
 * Labels match the English ReportLayout / extras UI.
 * matchColumn is the preview-table header used to verify filtered rows.
 */

/** @typedef {{ label: string, type: string, matchColumn?: string, skip?: boolean }} FilterField */

/** @type {Record<string, { quick: FilterField[], advanced: FilterField[] }>} */
export const LAYOUT_FILTERS = {
  ASSETLIFECYCLEREPORT: {
    quick: [
      { label: 'Purchase Date', type: 'daterange' },
      { label: 'Commissioned Date', type: 'daterange' },
      { label: 'Asset Usage History', type: 'multiselect', matchColumn: 'Asset Usage History' },
      { label: 'Current Status', type: 'multiselect', matchColumn: 'Current Status' },
    ],
    advanced: [
      { label: 'Asset ID', type: 'text', matchColumn: 'Asset ID' },
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Category', type: 'multiselect', matchColumn: 'Category' },
      { label: 'Location', type: 'multiselect', matchColumn: 'Location' },
      { label: 'Department', type: 'multiselect', matchColumn: 'Department' },
      { label: 'Vendor', type: 'multiselect', matchColumn: 'Vendor' },
      { label: 'Scrap Date', type: 'daterange' },
      { label: 'Scrap Location', type: 'multiselect' },
      { label: 'Scrapped By', type: 'multiselect' },
      { label: 'Buyer', type: 'multiselect' },
      { label: 'Sale Date', type: 'daterange' },
      { label: 'Sale Amount ≥ (₹)', type: 'number' },
    ],
  },
  ASSETREPORT: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Department', type: 'multiselect', matchColumn: 'Department' },
      { label: 'Employee', type: 'multiselect', matchColumn: 'Assigned Employee' },
      { label: 'Vendor', type: 'multiselect', matchColumn: 'Vendor' },
      { label: 'PO Number', type: 'text', matchColumn: 'PO Number' },
      { label: 'Invoice Number', type: 'text', matchColumn: 'Invoice Number' },
    ],
    advanced: [
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Category', type: 'multiselect', matchColumn: 'Category' },
      { label: 'Location', type: 'multiselect', matchColumn: 'Location' },
      { label: 'Purchase Date', type: 'daterange' },
      { label: 'Commissioned Date', type: 'daterange' },
      { label: 'Current Status', type: 'multiselect', matchColumn: 'Current Status' },
      { label: 'Cost ≥ (₹)', type: 'number' },
      { label: 'Status', type: 'multiselect', matchColumn: 'Status' },
    ],
  },
  QAAUDITREPORT: {
    quick: [
      { label: 'Date Range', type: 'daterange' },
      { label: 'Asset Type', type: 'multiselect' },
      { label: 'Assets', type: 'multiselect' },
    ],
    advanced: [],
  },
  ASSETVALUATION: {
    quick: [
      { label: 'Asset Status', type: 'multiselect', matchColumn: 'Asset Status' },
      { label: 'Include Scrap Assets', type: 'select' },
      { label: 'Current Value (₹)', type: 'number' },
      { label: 'Asset Category/Type', type: 'multiselect', matchColumn: 'Category' },
      { label: 'Location', type: 'multiselect', matchColumn: 'Location' },
      { label: 'Acquisition Date', type: 'daterange' },
    ],
    advanced: [
      { label: 'Asset Code', type: 'text', matchColumn: 'Asset Code' },
      { label: 'Asset Name', type: 'text', matchColumn: 'Name' },
      { label: 'Original Cost ≥ (₹)', type: 'number' },
      { label: 'Accumulated Depreciation ≥ (₹)', type: 'number' },
      { label: 'Net Book Value ≥ (₹)', type: 'number' },
      { label: 'Depreciation Method', type: 'select', matchColumn: 'Depreciation Method' },
      { label: 'Useful Life ≤ (years)', type: 'number' },
    ],
  },
  ASSETWORKFLOWHISTORY: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Planned Schedule Date', type: 'daterange' },
      { label: 'Actual Schedule Date', type: 'daterange' },
      { label: 'Vendor', type: 'searchable', matchColumn: 'Vendor Name' },
      { label: 'Work Order ID', type: 'searchable', matchColumn: 'Work Order ID' },
    ],
    advanced: [
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Vendor Name', type: 'multiselect', matchColumn: 'Vendor Name' },
      { label: 'Workflow Status', type: 'multiselect', matchColumn: 'Workflow Status' },
      { label: 'Step Status', type: 'multiselect', matchColumn: 'Step Status' },
      { label: 'Maintenance Type', type: 'multiselect', matchColumn: 'Maintenance Type' },
      { label: 'Assigned To', type: 'multiselect', matchColumn: 'Assigned To' },
      { label: 'Department', type: 'multiselect', matchColumn: 'Department' },
      { label: 'Notes', type: 'text' },
      { label: 'Serial Number', type: 'text', matchColumn: 'Serial Number' },
      { label: 'Asset Status', type: 'multiselect', matchColumn: 'Asset Status' },
      { label: 'Asset Type', type: 'multiselect', matchColumn: 'Asset Type' },
      { label: 'Purchased Cost ≥ (₹)', type: 'number' },
      { label: 'Workflow Created Date', type: 'daterange' },
    ],
  },
  BREAKDOWNHISTORY: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Breakdown Date', type: 'daterange' },
      { label: 'Reported By', type: 'searchable', matchColumn: 'Reported By' },
      { label: 'Vendor', type: 'searchable', matchColumn: 'Vendor Name' },
      { label: 'Work Order ID', type: 'searchable', matchColumn: 'Work Order ID' },
    ],
    advanced: [
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Vendor Name', type: 'multiselect', matchColumn: 'Vendor Name' },
      { label: 'Work Order Status', type: 'multiselect', matchColumn: 'Work Order Status' },
      { label: 'Breakdown Reason', type: 'multiselect', matchColumn: 'Breakdown Reason' },
      { label: 'Breakdown Status', type: 'multiselect', matchColumn: 'Breakdown Status' },
      { label: 'Description', type: 'text' },
      { label: 'Asset Type', type: 'multiselect', matchColumn: 'Asset Type' },
      { label: 'Department', type: 'multiselect', matchColumn: 'Department' },
      { label: 'Serial Number', type: 'text', matchColumn: 'Serial Number' },
      { label: 'Asset Status', type: 'multiselect', matchColumn: 'Asset Status' },
      { label: 'Branch', type: 'multiselect', matchColumn: 'Branch' },
      { label: 'Reported By Email', type: 'text' },
      { label: 'Vendor Email', type: 'text' },
    ],
  },
  SLAREPORT: {
    quick: [
      { label: 'Asset Type', type: 'multiselect', matchColumn: 'Asset Type' },
      { label: 'Vendors', type: 'multiselect', matchColumn: 'Vendor Name' },
      { label: 'SLA Description', type: 'multiselect', matchColumn: 'SLA Description' },
      { label: 'Date Range', type: 'daterange' },
    ],
    advanced: [],
  },
  MAINTENANCEHISTORY: {
    quick: [
      { label: 'Maintenance Start Date', type: 'daterange' },
      { label: 'Maintenance End Date', type: 'daterange' },
      { label: 'Notes', type: 'text' },
      { label: 'Vendor ID', type: 'searchable' },
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Work Order ID', type: 'searchable', matchColumn: 'Work Order ID' },
    ],
    advanced: [
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Vendor Name', type: 'multiselect', matchColumn: 'Vendor Name' },
      { label: 'Work Order Status', type: 'multiselect', matchColumn: 'Work Order Status' },
      { label: 'Maintenance Type', type: 'multiselect', matchColumn: 'Maintenance Type' },
      { label: 'Cost ≥ (₹)', type: 'number' },
      { label: 'Downtime ≥ (h)', type: 'number' },
    ],
  },
  USAGEBASEDASSETREPORT: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Date Range', type: 'daterange' },
      { label: 'Asset Type', type: 'multiselect', matchColumn: 'Asset Type' },
      { label: 'Department', type: 'multiselect', matchColumn: 'Department' },
      { label: 'Branch', type: 'multiselect', matchColumn: 'Branch' },
      { label: 'Recorded By', type: 'multiselect', matchColumn: 'Recorded By' },
    ],
    advanced: [
      { label: 'Asset Name', type: 'text', matchColumn: 'Asset Name' },
      { label: 'Serial Number', type: 'text', matchColumn: 'Serial Number' },
      { label: 'Usage Counter ≥', type: 'number' },
      { label: 'Usage Counter ≤', type: 'number' },
    ],
  },
  SPAREPARTSREPORT: {
    quick: [
      { label: 'Purchase Date', type: 'daterange' },
      { label: 'Category', type: 'multiselect', matchColumn: 'Category' },
      { label: 'Brand', type: 'multiselect', matchColumn: 'Brand' },
      { label: 'Current Status', type: 'multiselect', matchColumn: 'Status' },
    ],
    advanced: [
      { label: 'Part Number', type: 'multiselect', matchColumn: 'Part Number' },
      { label: 'Serial Number', type: 'text', matchColumn: 'Serial Number' },
      { label: 'Model', type: 'multiselect', matchColumn: 'Model' },
      { label: 'Lot ID', type: 'multiselect' },
      { label: 'Vendor', type: 'multiselect', matchColumn: 'Vendor' },
      { label: 'Invoice Number', type: 'text' },
      { label: 'Asset ID', type: 'multiselect', matchColumn: 'Asset ID' },
      { label: 'Issued Date', type: 'daterange' },
      { label: 'Unit Price', type: 'number' },
      { label: 'Below Safety Stock', type: 'select' },
      { label: 'UoM', type: 'multiselect', matchColumn: 'UoM' },
    ],
  },
  REOPENEDBREAKDOWNS: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
      { label: 'Asset Type', type: 'multiselect', matchColumn: 'Asset Type' },
      { label: 'Employee', type: 'multiselect' },
      { label: 'Department', type: 'multiselect' },
    ],
    advanced: [
      { label: 'Reopen Count (RO) ≥', type: 'number', matchColumn: 'Reopen Count (RO)' },
      { label: 'Last Reopened On', type: 'daterange' },
    ],
  },
  UTILITYREPORT: {
    quick: [
      { label: 'Utility', type: 'multiselect', matchColumn: 'Utility' },
      { label: 'Consumption metric', type: 'multiselect', matchColumn: 'Consumption metric' },
      { label: 'Date', type: 'daterange' },
      { label: 'Asset type', type: 'multiselect', matchColumn: 'Asset type' },
    ],
    advanced: [
      { label: 'Asset', type: 'multiselect', matchColumn: 'Asset' },
      { label: 'Frequency', type: 'multiselect', matchColumn: 'Frequency' },
      { label: 'Unit', type: 'multiselect', matchColumn: 'Unit' },
      { label: 'Reading', type: 'number' },
      { label: 'Quantity consumed', type: 'number' },
    ],
  },
  BREAKDOWN_REOPEN_DETAILS: {
    quick: [
      { label: 'Asset ID', type: 'searchable', matchColumn: 'Asset ID' },
    ],
    advanced: [],
  },
};

/** @type {Record<string, { labels: string[], apply?: string, advanced?: boolean, nativeSelects?: string[] }>} */
export const EXTRAS_FILTERS = {
  AUDITREPORT: {
    labels: ['Audit type', 'Period', 'Asset type'],
    apply: 'View report',
    advanced: true,
  },
  CONSOLIDATEDASSETREPORT: {
    labels: ['Institution', 'Campus', 'Department'],
    apply: 'Apply',
    advanced: true,
  },
  SLAVENDORPERFORMANCE: {
    labels: ['Period', 'Vendor', 'Asset type'],
    apply: 'Apply',
    advanced: true,
  },
  WORKFORCEREPORT: {
    labels: ['Period'],
    advanced: true,
  },
  MAINTENANCESTATUSREPORT: {
    labels: ['Period', 'Asset types'],
    apply: 'View',
  },
  PURCHASEREQUIREMENTREPORT: {
    labels: ['Branch', 'Category / part'],
    nativeSelects: ['Focus', 'Planning horizon'],
    apply: 'Apply',
    advanced: true,
  },
  OUTOFSTOCKREPORT: {
    labels: ['Branch', 'Category / part'],
    nativeSelects: ['Focus', 'Planning horizon'],
    apply: 'Apply',
  },
  SPAREPARTMGMT: {
    labels: ['Report type', 'FSN class'],
    nativeSelects: ['Report type'],
    advanced: true,
  },
  CONSUMABLESREPORT: {
    labels: [],
    advanced: true,
  },
};

export const MAX_OPTIONS_PER_FIELD = 8;
export const DATE_PRESETS = ['Current FY', 'Last FY', 'Last Month', 'Last Week', 'Today'];
