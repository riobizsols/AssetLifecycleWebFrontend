// Common constants and configurations for all reports
// Note: For asset-register report, these will be replaced with real data from API
// These are fallback values for other reports that don't have API integration yet
export const ASSET_CATEGORIES = [
  "Plant & Machinery",
  "IT Equipment",
  "Furniture",
  "Vehicles",
  "Tools",
  "Buildings",
];

export const LOCATIONS = [
  { id: "COI-HO", name: "Coimbatore • HO" },
  { id: "BLR-WH1", name: "Bengaluru • WH-1" },
  { id: "CHN-PL1", name: "Chennai • Plant-1" },
];

export const DEPARTMENTS = ["Production", "Finance", "IT", "Maintenance", "Admin"];
export const VENDORS = ["Acme Engg", "Prism Tech", "SparesKart", "GearWorks"];
export const USERS = ["Arun Kumar", "Divya T", "Shweta", "Rahul", "Sanjay"];

// Asset Status options
export const ASSET_STATUSES = ["In-Use", "Scrapped", "Scrap Sold", "Under Maintenance", "Idle", "Disposed"];

// Asset Usage History options
export const ASSET_USAGE_HISTORY = [
  "Production Line A", "Production Line B", "Office Use", "Warehouse Operations", 
  "Field Service", "Maintenance Workshop", "Quality Control", "Research & Development"
];

// Buyer options
export const BUYERS = [
  "Metal Scrap Co", "Recycling Corp", "Local Dealer", "Industrial Salvage", 
  "Scrap Metal Traders", "Recycling Partners", "Metal Recovery Inc"
];

// Report definitions with all possible columns
export const ALL_COLUMNS = {
  "asset-register": [
    "Asset ID", "Asset Name", "Department", "Assigned Employee", "Vendor", 
    "PO Number", "Invoice Number", "Category", "Location", "Purchase Date", 
    "Commissioned Date", "Current Status", "Cost", "Status"
  ],
  "asset-lifecycle": [
    "Asset ID", "Asset Name", "Category", "Location", "Department", "Vendor",
    "Purchase Date", "Commissioned Date", "Asset Usage History", "Current Status",
    "Scrap Date", "Scrap Location", "Scrapped By", "Buyer", "Sale Date", "Sale Amount"
  ],
  "asset-valuation": [
    "Asset Code", "Name", "Category", "Location", "Department", 
    "Asset Status", "Acquisition Date", "Current Value", "Original Cost", 
    "Accumulated Depreciation", "Net Book Value", "Depreciation Method", "Useful Life"
  ],
  "depreciation-schedule": ["Asset Code", "Name", "Book", "Method", "Depn for Period", "Accum Depn", "Net Book Value"],
  "maintenance-history": ["Work Order ID", "Asset ID", "Asset Name", "Maintenance Start Date", "Maintenance End Date", "Notes", "Vendor ID", "Vendor Name", "Work Order Status", "Maintenance Type", "Cost (₹)", "Downtime (h)"],
  "asset-workflow-history": ["Work Order ID", "Asset ID", "Asset Name", "Workflow Step", "Planned Schedule Date", "Actual Schedule Date", "Notes", "Vendor ID", "Vendor Name", "Workflow Status", "Step Status", "Assigned To", "Maintenance Type", "Asset Type", "Department", "Serial Number", "Asset Status", "Purchased On", "Purchased Cost", "Vendor Contact", "Vendor Email", "Vendor Phone", "Vendor Address", "User Name", "User Email", "Job Role", "Sequence", "History Count", "Latest Action", "Latest Action Date", "Latest Action By", "History ID", "Action By", "Action On", "Action", "History Notes", "Action By Email", "Step User", "Step User Email"],
  "usage-based-asset": ["Usage ID", "Asset ID", "Asset Name", "Serial Number", "Asset Type", "Department", "Branch", "Usage Counter", "Recorded By", "Recorded Date", "Employee Name", "Asset Description"],
  "breakdown-history": ["Breakdown ID", "Asset ID", "Asset Name", "Breakdown Date", "Description", "Reported By", "Vendor ID", "Vendor Name", "Work Order Status", "Breakdown Status", "Breakdown Reason", "Asset Type", "Department", "Branch", "Serial Number", "Asset Status", "Purchased On", "Purchased Cost", "Vendor Contact", "Vendor Email", "Vendor Phone", "Vendor Address", "Reported By Email", "Reported By Phone"],
  "warranty-amc-expiry": ["Asset", "Category", "Vendor", "Coverage", "Start", "End", "Days Left"],
  "spares-inventory": ["Part Code", "Description", "UoM", "On Hand", "Safety", "Reorder", "Non‑Moving (days)", "Preferred Vendor"],
  "vendor-performance": ["Vendor", "Jobs", "On‑time %", "Avg TAT (hrs)", "FTF %", "Defect %"],
};

// Field to column mapping for filtering
export const FIELD_TO_COLUMN_MAP = {
  "asset-register": {
    assetId: "Asset ID",
    assetName: "Asset Name",
    department: "Department",
    employee: "Assigned Employee",
    vendor: "Vendor",
    poNumber: "PO Number",
    invoiceNumber: "Invoice Number",
    category: "Category",
    location: "Location",
    purchaseDateRange: "Purchase Date",
    commissionedDateRange: "Commissioned Date",
    currentStatus: "Current Status",
    cost: "Cost",
    status: "Status"
  },
  "asset-lifecycle": {
    assetId: "Asset ID",
    assetName: "Asset Name",
    category: "Category",
    location: "Location",
    department: "Department",
    vendor: "Vendor",
    purchaseDateRange: "Purchase Date",
    commissionedDateRange: "Commissioned Date",
    assetUsageHistory: "Asset Usage History",
    currentStatus: "Current Status",
    scrapDateRange: "Scrap Date",
    scrapLocation: "Scrap Location",
    scrappedBy: "Scrapped By",
    buyer: "Buyer",
    saleDateRange: "Sale Date",
    saleAmount: "Sale Amount"
  },
  "asset-valuation": {
    assetStatus: "Asset Status",
    includeScrapAssets: "Include Scrap Assets",
    currentValueRange: "Current Value",
    totalValue: "Total Value",
    category: "Category",
    location: "Location",
    department: "Department",
    acquisitionDateRange: "Acquisition Date",
    assetCode: "Asset Code",
    name: "Name",
    originalCost: "Original Cost",
    accumulatedDepreciation: "Accumulated Depreciation",
    netBookValue: "Net Book Value",
    depreciationMethod: "Depreciation Method",
    usefulLife: "Useful Life"
  },
  "maintenance-history": {
    maintenanceStartDateRange: "Maintenance Start Date",
    maintenanceEndDateRange: "Maintenance End Date",
    notes: "Notes",
    vendorId: "Vendor ID",
    assetId: "Asset ID",
    workOrderId: "Work Order ID",
    assetName: "Asset Name",
    vendorName: "Vendor Name",
    workOrderStatus: "Work Order Status",
    maintenanceType: "Maintenance Type",
    cost: "Cost (₹)",
    downtime: "Downtime (h)"
  },
  "breakdown-history": {
    breakdownDateRange: "Breakdown Date",
    reportedBy: "Reported By",
    vendorId: "Vendor ID",
    assetId: "Asset ID",
    workOrderId: "Work Order ID",
    assetName: "Asset Name",
    vendorName: "Vendor Name",
    workOrderStatus: "Work Order Status",
    breakdownReason: "Breakdown Reason",
    breakdownStatus: "Breakdown Status",
    description: "Description",
    assetType: "Asset Type",
    department: "Department",
    serialNumber: "Serial Number",
    assetStatus: "Asset Status",
    branch: "Branch",
    reportedByEmail: "Reported By Email",
    vendorEmail: "Vendor Email"
  },
  "asset-workflow-history": {
    assetId: "Asset ID",
    plannedScheduleDateRange: "Planned Schedule Date",
    actualScheduleDateRange: "Actual Schedule Date",
    vendorId: "Vendor ID",
    workOrderId: "Work Order ID",
    assetName: "Asset Name",
    vendorName: "Vendor Name",
    workflowStatus: "Workflow Status",
    stepStatus: "Step Status",
    maintenanceType: "Maintenance Type",
    assignedTo: "Assigned To",
    department: "Department",
    notes: "Notes",
    serialNumber: "Serial Number",
    assetStatus: "Asset Status",
    assetType: "Asset Type",
    purchasedCost: "Purchased Cost",
    workflowCreatedDateRange: "Workflow Created Date"
  },
  "usage-based-asset": {
    assetId: "Asset ID",
    assetName: "Asset Name",
    serialNumber: "Serial Number",
    assetType: "Asset Type",
    department: "Department",
    branch: "Branch",
    dateRange: "Recorded Date",
    createdBy: "Recorded By",
    usageCounterMin: "Usage Counter",
    usageCounterMax: "Usage Counter",
  },
};

// Report definitions
export const REPORTS = [
  {
    id: "asset-register",
    name: "Asset Register",
    description: "Detailed view of assets based on specific criteria with comprehensive asset information.",
    quickFields: [
      { key: "assetId", label: "Asset ID", type: "searchable", domain: [], placeholder: "Search Asset ID..." },
      { key: "department", label: "Department", type: "multiselect", domain: DEPARTMENTS },
      { key: "employee", label: "Employee", type: "multiselect", domain: USERS },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
      { key: "poNumber", label: "PO Number", type: "text", placeholder: "Enter PO Number" },
      { key: "invoiceNumber", label: "Invoice Number", type: "text", placeholder: "Enter Invoice Number" },
    ],
    fields: [
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "purchaseDateRange", label: "Purchase Date", type: "daterange" },
      { key: "commissionedDateRange", label: "Commissioned Date", type: "daterange" },
      { key: "currentStatus", label: "Current Status", type: "multiselect", domain: ASSET_STATUSES },
      { key: "cost", label: "Cost ≥ (₹)", type: "number" },
      { key: "status", label: "Status", type: "multiselect", domain: ["Active", "In Use", "Under Maintenance", "Disposed"] },
    ],
    defaultColumns: [
      "Asset ID", "Asset Name", "Department", "Assigned Employee", "Vendor", 
      "PO Number", "Invoice Number", "Category", "Location", "Purchase Date", 
      "Commissioned Date", "Current Status", "Cost", "Status"
    ],
    allColumns: ALL_COLUMNS["asset-register"] || [],
  },
  {
    id: "asset-lifecycle",
    name: "Asset Lifecycle Report",
    description: "Complete view of an asset's history and current status including purchase, commissioning, usage, and disposal information.",
    quickFields: [
      { key: "purchaseDateRange", label: "Purchase Date", type: "daterange" },
      { key: "commissionedDateRange", label: "Commissioned Date", type: "daterange" },
      { key: "assetUsageHistory", label: "Asset Usage History", type: "multiselect", domain: ASSET_USAGE_HISTORY },
      { key: "currentStatus", label: "Current Status", type: "multiselect", domain: ["In-Use", "Scrapped", "Scrap Sold"] },
    ],
    fields: [
      { key: "assetId", label: "Asset ID", type: "text" },
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "department", label: "Department", type: "multiselect", domain: DEPARTMENTS },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
      { key: "scrapDateRange", label: "Scrap Date", type: "daterange" },
      { key: "scrapLocation", label: "Scrap Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "scrappedBy", label: "Scrapped By", type: "multiselect", domain: USERS },
      { key: "buyer", label: "Buyer", type: "multiselect", domain: BUYERS },
      { key: "saleDateRange", label: "Sale Date", type: "daterange" },
      { key: "saleAmount", label: "Sale Amount ≥ (₹)", type: "number" },
    ],
    defaultColumns: [
      "Asset ID", "Asset Name", "Category", "Location", "Department", "Vendor",
      "Purchase Date", "Commissioned Date", "Asset Usage History", "Current Status",
      "Scrap Date", "Scrap Location", "Scrapped By", "Buyer", "Sale Date", "Sale Amount"
    ],
    allColumns: ALL_COLUMNS["asset-lifecycle"] || [],
  },
  {
    id: "asset-valuation",
    name: "Asset Valuation",
    description: "Comprehensive view of asset values including current values, depreciation, and totals for in-use and scrap assets.",
    quickFields: [
      { key: "assetStatus", label: "Asset Status", type: "multiselect", domain: ["In-Use", "Scrap"] },
      { key: "includeScrapAssets", label: "Include Scrap Assets", type: "select", domain: ["Yes", "No"], defaultValue: "No" },
      { key: "currentValueRange", label: "Current Value (₹)", type: "number", placeholder: "Enter minimum value" },
      { key: "category", label: "Asset Category/Type", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      // { key: "department", label: "Department", type: "multiselect", domain: DEPARTMENTS }, // disabled - no department data
      { key: "acquisitionDateRange", label: "Acquisition Date", type: "daterange" },
    ],
    fields: [
      { key: "assetCode", label: "Asset Code", type: "text" },
      { key: "name", label: "Asset Name", type: "text" },
      { key: "originalCost", label: "Original Cost ≥ (₹)", type: "number" },
      { key: "accumulatedDepreciation", label: "Accumulated Depreciation ≥ (₹)", type: "number" },
      { key: "netBookValue", label: "Net Book Value ≥ (₹)", type: "number" },
      { key: "depreciationMethod", label: "Depreciation Method", type: "select", domain: ["SLM", "WDV", "Units of Production"] },
      { key: "usefulLife", label: "Useful Life ≤ (years)", type: "number" },
    ],
    defaultColumns: [
      "Asset Code", "Name", "Category", "Location", 
      "Asset Status", "Acquisition Date", "Current Value", "Original Cost", 
      "Accumulated Depreciation", "Net Book Value", "Depreciation Method", "Useful Life"
    ],
    allColumns: ALL_COLUMNS["asset-valuation"] || [],
    exportFormats: ["pdf", "json"], // Special export formats for Asset Valuation
  },
  {
    id: "depreciation-schedule",
    name: "Depreciation Schedule",
    description: "Period depreciation by book/method with totals.",
    quickFields: [
      { key: "period", label: "Period", type: "select", domain: ["Month", "Quarter", "FY"] },
      { key: "fiscalYear", label: "Fiscal Year", type: "select", domain: ["2024-25", "2023-24", "2022-23"] },
      { key: "book", label: "Book", type: "select", domain: ["Company", "Tax", "IFRS"] },
      { key: "method", label: "Method", type: "select", domain: ["SLM", "WDV"] },
    ],
    fields: [
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "includeDisposed", label: "Include Disposed", type: "boolean" },
    ],
    defaultColumns: ["Asset Code", "Name", "Book", "Method", "Depn for Period", "Accum Depn", "Net Book Value"],
    allColumns: ALL_COLUMNS["depreciation-schedule"] || [],
  },
  {
    id: "maintenance-history",
    name: "Maintenance History",
    description: "Complete maintenance record of assets with detailed work order information.",
    quickFields: [
      { key: "maintenanceStartDateRange", label: "Maintenance Start Date", type: "daterange" },
      { key: "maintenanceEndDateRange", label: "Maintenance End Date", type: "daterange" },
      { key: "notes", label: "Notes", type: "text", placeholder: "Search within notes text" },
      { key: "vendorId", label: "Vendor ID", type: "searchable", domain: VENDORS.map(vendor => ({ value: vendor, label: `${vendor} - VND-${VENDORS.indexOf(vendor) + 100}` })), placeholder: "Search Vendor..." },
      { key: "assetId", label: "Asset ID", type: "searchable", domain: [], placeholder: "Search Asset ID..." },
      { key: "workOrderId", label: "Work Order ID", type: "searchable", domain: [], placeholder: "Search Work Order ID..." },
    ],
    fields: [
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "vendorName", label: "Vendor Name", type: "multiselect", domain: VENDORS },
      { key: "workOrderStatus", label: "Work Order Status", type: "multiselect", domain: ["Open", "In Progress", "Completed", "Cancelled", "On Hold"] },
      { key: "maintenanceType", label: "Maintenance Type", type: "multiselect", domain: ["Preventive", "Breakdown", "Calibration", "Emergency", "Scheduled"] },
      { key: "cost", label: "Cost ≥ (₹)", type: "number" },
      { key: "downtime", label: "Downtime ≥ (h)", type: "number" },
    ],
    defaultColumns: ["Work Order ID", "Asset ID", "Asset Name", "Maintenance Start Date", "Maintenance End Date", "Notes", "Vendor ID", "Vendor Name", "Work Order Status", "Maintenance Type", "Cost (₹)", "Downtime (h)"],
    allColumns: ALL_COLUMNS["maintenance-history"] || [],
  },
  {
    id: "breakdown-history",
    name: "Breakdown History",
    description: "Complete record of all breakdown events associated with assets.",
    quickFields: [
      { key: "assetId", label: "Asset ID", type: "searchable", domain: [], placeholder: "Search Asset ID..." },
      { key: "breakdownDateRange", label: "Breakdown Date", type: "daterange" },
      { key: "reportedBy", label: "Reported By", type: "searchable", domain: [], placeholder: "Search Employee..." },
      { key: "vendorId", label: "Vendor", type: "searchable", domain: [], placeholder: "Search Vendor..." },
      { key: "workOrderId", label: "Work Order ID", type: "searchable", domain: [], placeholder: "Search Work Order ID..." },
    ],
    fields: [
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "vendorName", label: "Vendor Name", type: "multiselect", domain: [] },
      { key: "workOrderStatus", label: "Work Order Status", type: "multiselect", domain: [] },
      { key: "breakdownReason", label: "Breakdown Reason", type: "multiselect", domain: [] },
      { key: "breakdownStatus", label: "Breakdown Status", type: "multiselect", domain: [] },
      { key: "description", label: "Description", type: "text" },
      { key: "assetType", label: "Asset Type", type: "multiselect", domain: [] },
      { key: "department", label: "Department", type: "multiselect", domain: [] },
      { key: "serialNumber", label: "Serial Number", type: "text" },
      { key: "assetStatus", label: "Asset Status", type: "multiselect", domain: [] },
      { key: "branch", label: "Branch", type: "multiselect", domain: [] },
      { key: "reportedByEmail", label: "Reported By Email", type: "text" },
      { key: "vendorEmail", label: "Vendor Email", type: "text" },
    ],
    defaultColumns: ["Breakdown ID", "Asset ID", "Asset Name", "Breakdown Date", "Description", "Reported By", "Vendor ID", "Vendor Name", "Breakdown Status", "Breakdown Reason", "Asset Type", "Department", "Branch", "Serial Number", "Asset Status"],
    allColumns: ALL_COLUMNS["breakdown-history"] || [],
  },
  {
    id: "asset-workflow-history",
    name: "Asset Workflow History",
    description: "Complete workflow and maintenance history for assets with step-by-step tracking.",
    quickFields: [
      { key: "assetId", label: "Asset ID", type: "searchable", domain: [], placeholder: "Search Asset ID..." },
      { key: "plannedScheduleDateRange", label: "Planned Schedule Date", type: "daterange" },
      { key: "actualScheduleDateRange", label: "Actual Schedule Date", type: "daterange" },
      { key: "vendorId", label: "Vendor", type: "searchable", domain: [], placeholder: "Search Vendor..." },
      { key: "workOrderId", label: "Work Order ID", type: "searchable", domain: [], placeholder: "Search Work Order ID..." },
    ],
    fields: [
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "vendorName", label: "Vendor Name", type: "multiselect", domain: [] },
      { key: "workflowStatus", label: "Workflow Status", type: "multiselect", domain: [] },
      { key: "stepStatus", label: "Step Status", type: "multiselect", domain: [] },
      { key: "maintenanceType", label: "Maintenance Type", type: "multiselect", domain: [] },
      { key: "assignedTo", label: "Assigned To", type: "multiselect", domain: [] },
      { key: "department", label: "Department", type: "multiselect", domain: [] },
      { key: "notes", label: "Notes", type: "text" },
      { key: "serialNumber", label: "Serial Number", type: "text" },
      { key: "assetStatus", label: "Asset Status", type: "multiselect", domain: [] },
      { key: "assetType", label: "Asset Type", type: "multiselect", domain: [] },
      { key: "purchasedCost", label: "Purchased Cost ≥ (₹)", type: "number" },
      { key: "workflowCreatedDateRange", label: "Workflow Created Date", type: "daterange" },
    ],
    defaultColumns: ["Work Order ID", "Asset ID", "Asset Name", "Workflow Step", "Planned Schedule Date", "Actual Schedule Date", "Notes", "Vendor ID", "Vendor Name", "Workflow Status", "Step Status", "Assigned To", "Maintenance Type", "Asset Type", "Department", "Serial Number", "Asset Status"],
    allColumns: ALL_COLUMNS["asset-workflow-history"] || [],
  },
  {
    id: "usage-based-asset",
    name: "Usage-Based Asset Report",
    description: "Complete record of asset usage with usage counter values, dates, and recorded by information.",
    quickFields: [
      { key: "assetId", label: "Asset ID", type: "searchable", domain: [], placeholder: "Search Asset ID..." },
      { key: "dateRange", label: "Date Range", type: "daterange", preset: "COMMON" },
      { key: "assetType", label: "Asset Type", type: "multiselect", domain: [] },
      { key: "department", label: "Department", type: "multiselect", domain: [] },
      { key: "branch", label: "Branch", type: "multiselect", domain: [] },
      { key: "createdBy", label: "Recorded By", type: "multiselect", domain: [] },
    ],
    fields: [
      { key: "assetName", label: "Asset Name", type: "text" },
      { key: "serialNumber", label: "Serial Number", type: "text" },
      { key: "usageCounterMin", label: "Usage Counter ≥", type: "number", placeholder: "Enter minimum usage" },
      { key: "usageCounterMax", label: "Usage Counter ≤", type: "number", placeholder: "Enter maximum usage" },
    ],
    defaultColumns: ["Usage ID", "Asset ID", "Asset Name", "Serial Number", "Asset Type", "Department", "Branch", "Usage Counter", "Recorded By", "Recorded Date", "Employee Name"],
    allColumns: ALL_COLUMNS["usage-based-asset"] || [],
  },
  {
    id: "warranty-amc-expiry",
    name: "Warranty/AMC Expiry",
    description: "Assets with warranty/AMC coverage and upcoming expiries.",
    quickFields: [
      { key: "expiresInDays", label: "Expires in (days)", type: "number", placeholder: 30 },
      { key: "coverage", label: "Coverage", type: "select", domain: ["Warranty", "AMC"] },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
    ],
    fields: [
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "includeExpired", label: "Include Expired", type: "boolean" },
    ],
    defaultColumns: ["Asset", "Category", "Vendor", "Coverage", "Start", "End", "Days Left"],
    allColumns: ALL_COLUMNS["warranty-amc-expiry"] || [],
  },
  {
    id: "spares-inventory",
    name: "Spares Inventory",
    description: "Stock with safety levels, non-moving items, vendors.",
    quickFields: [
      { key: "warehouse", label: "Warehouse", type: "select", domain: LOCATIONS.map((l) => l.name) },
      { key: "belowSafety", label: "Below Safety Stock", type: "boolean" },
      { key: "nonMovingDays", label: "Non‑Moving ≥ (days)", type: "number", placeholder: 60 },
    ],
    fields: [
      { key: "abcClass", label: "ABC Class", type: "select", domain: ["A", "B", "C"] },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
    ],
    defaultColumns: ["Part Code", "Description", "UoM", "On Hand", "Safety", "Reorder", "Non‑Moving (days)", "Preferred Vendor"],
    allColumns: ALL_COLUMNS["spares-inventory"] || [],
  },
  {
    id: "vendor-performance",
    name: "Vendor Performance",
    description: "SLA metrics: on‑time %, TAT, first‑time‑fix, defect rate.",
    quickFields: [
      { key: "dateRange", label: "Period", type: "daterange", preset: "LAST_180" },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
    ],
    fields: [
      { key: "metric", label: "Metric", type: "select", domain: ["On‑time %", "Avg TAT (hrs)", "FTF %", "Defect %"] },
      { key: "minThreshold", label: "Threshold ≥", type: "number" },
    ],
    defaultColumns: ["Vendor", "Jobs", "On‑time %", "Avg TAT (hrs)", "FTF %", "Defect %"],
    allColumns: ALL_COLUMNS["vendor-performance"] || [],
  },
];

// Filtering logic
export function filterRows(allRows, reportId, quickFilters, advancedFilters) {
  const reportDef = REPORTS.find(r => r.id === reportId);
  if (!reportDef) return allRows;

  return allRows.filter(row => {
    // Apply quick filters
    for (const key in quickFilters) {
      const val = quickFilters[key];
      if (!val || (Array.isArray(val) && val.length === 0)) continue;
      const field = reportDef.quickFields.find(f => f.key === key);
      if (!field) continue;
      
      // Handle grouped fields
      if (field.type === 'group') {
        // Apply sub-fields if any are set
        let hasSubFilters = false;
        for (const subField of field.subFields) {
          const subVal = val[subField.key]; // FIXED: Access from grouped field's value object
          if (subVal && (Array.isArray(subVal) ? subVal.length > 0 : subVal !== "")) {
            hasSubFilters = true;
            const colName = FIELD_TO_COLUMN_MAP[reportId]?.[subField.key] || subField.key;
            if (!applyFilter(row, colName, subVal, subField)) return false;
          }
        }
        // If no sub-filters are set, skip this group
        if (!hasSubFilters) continue;
      } else {
        const colName = FIELD_TO_COLUMN_MAP[reportId]?.[key] || key;
        if (!applyFilter(row, colName, val, field)) return false;
      }
    }

    // Apply advanced filters
    for (const filter of advancedFilters) {
      if (!filter.field || !filter.op || filter.val === null || filter.val === undefined) continue;
      if (Array.isArray(filter.val) && filter.val.length === 0) continue;
      if (typeof filter.val === 'string' && filter.val.trim() === '') continue;
      if (Array.isArray(filter.val) && filter.val.every(v => v === null || v === undefined || (typeof v === 'string' && v.trim() === ''))) continue;
      const field = reportDef.fields.find(f => f.key === filter.field);
      if (!field) continue;
      const colName = FIELD_TO_COLUMN_MAP[reportId]?.[filter.field];
      if (!colName) continue;

      const rowValue = row[colName];
      const filterValue = filter.val;

      // Handle operators for different field types
      if (field.type === "text") {
        const rowText = String(rowValue || "").toLowerCase();
        const filterText = String(filterValue || "").toLowerCase();
        if (filter.op === "contains" && !rowText.includes(filterText)) return false;
        if (filter.op === "starts with" && !rowText.startsWith(filterText)) return false;
        if (filter.op === "ends with" && !rowText.endsWith(filterText)) return false;
        if (filter.op === "=" && rowText !== filterText) return false;
        if (filter.op === "!=" && rowText === filterText) return false;
      } else if (field.type === "number") {
        const rowNum = Number(rowValue);
        const filterNum = Number(filterValue);
        if (filter.op === ">=" && rowNum < filterNum) return false;
        if (filter.op === "<=" && rowNum > filterNum) return false;
        if (filter.op === "=" && rowNum !== filterNum) return false;
        if (filter.op === "!=" && rowNum === filterNum) return false;
      } else if (field.type === "multiselect") {
        if (filter.op === "has any" && !filterValue.some(v => String(rowValue).includes(v))) return false;
        if (filter.op === "has all" && !filterValue.every(v => String(rowValue).includes(v))) return false;
      } else if (field.type === "daterange") {
        const rowDate = new Date(rowValue);
        const start = new Date(filterValue[0]);
        const end = new Date(filterValue[1]);
        if (filter.op === "in range" && (rowDate < start || rowDate > end)) return false;
        if (filter.op === "before" && rowDate >= start) return false;
        if (filter.op === "after" && rowDate <= start) return false;
      }
    }
    return true;
  });
}

// Helper function to apply individual filters
function applyFilter(row, colName, val, field) {
  if (field.type === 'daterange') {
    const rowDate = new Date(row[colName]);
    const start = new Date(val[0]);
    const end = new Date(val[1]);
    if (rowDate < start || rowDate > end) return false;
  } else if (field.type === 'multiselect') {
    if (!val.includes(String(row[colName]))) return false;
  } else if (field.type === 'number') {
    if (val > row[colName]) return false;
  } else if (field.type === 'text') {
    if (!row[colName].toLowerCase().includes(val.toLowerCase())) return false;
  } else if (field.type === 'select') {
    // Special handling for includeScrapAssets filter
    if (colName === "Include Scrap Assets") {
      if (val === "No" && row["Asset Status"] === "Scrap") return false;
      if (val === "Yes") return true; // Show all assets
    } else {
      if (row[colName] !== val) return false;
    }
  } else if (field.type === 'searchable') {
    if (row[colName] !== val) return false;
  }
  return true;
}

// Mock data generation
export function fakeRows(reportId, n = 8) {
  const r = [];
  for (let i = 0; i < n; i++) {
    if (reportId === "asset-register") {
      r.push({
        "Asset ID": `AST-${1000 + i}`,
        "Asset Name": ["Lathe Machine", "CNC Mill", "Laptop Dell", "UPS System", "Forklift"][i % 5],
        "Department": DEPARTMENTS[i % DEPARTMENTS.length],
        "Assigned Employee": USERS[i % USERS.length],
        "Vendor": VENDORS[i % VENDORS.length],
        "PO Number": `PO-${2024}${String(i + 1).padStart(3, '0')}`,
        "Invoice Number": `INV-${2024}${String(i + 1).padStart(4, '0')}`,
        "Category": ASSET_CATEGORIES[i % ASSET_CATEGORIES.length],
        "Location": LOCATIONS[i % LOCATIONS.length].name,
        "Purchase Date": dateOffset(-300 + i * 7),
        "Commissioned Date": dateOffset(-280 + i * 7),
        "Current Status": ASSET_STATUSES[i % ASSET_STATUSES.length],
        "Cost": 50000 + i * 2500,
        "Status": ["Active", "In Use", "Under Maintenance", "Disposed"][i % 4],
      });
    } else if (reportId === "asset-lifecycle") {
      const isScrapped = i % 3 === 0;
      const isScrapSold = i % 5 === 0;
      const currentStatus = isScrapSold ? "Scrap Sold" : isScrapped ? "Scrapped" : "In-Use";
      
      r.push({
        "Asset ID": `AST-${1000 + i}`,
        "Asset Name": ["Lathe Machine", "CNC Mill", "Laptop Dell", "UPS System", "Forklift"][i % 5],
        "Category": ASSET_CATEGORIES[i % ASSET_CATEGORIES.length],
        "Location": LOCATIONS[i % LOCATIONS.length].name,
        "Department": DEPARTMENTS[i % DEPARTMENTS.length],
        "Vendor": VENDORS[i % VENDORS.length],
        "Purchase Date": dateOffset(-300 + i * 7),
        "Commissioned Date": dateOffset(-280 + i * 7),
        "Asset Usage History": ASSET_USAGE_HISTORY[i % ASSET_USAGE_HISTORY.length],
        "Current Status": currentStatus,
        "Scrap Date": isScrapped || isScrapSold ? dateOffset(-30 + i * 2) : "",
        "Scrap Location": (isScrapped || isScrapSold) ? LOCATIONS[i % LOCATIONS.length].name : "",
        "Scrapped By": (isScrapped || isScrapSold) ? USERS[i % USERS.length] : "",
        "Buyer": isScrapSold ? BUYERS[i % BUYERS.length] : "",
        "Sale Date": isScrapSold ? dateOffset(-15 + i) : "",
        "Sale Amount": isScrapSold ? (5000 + i * 500) : "",
      });
    } else if (reportId === "asset-valuation") {
      // No mock data for asset-valuation - use API data only
      return [];
    } else if (reportId === "depreciation-schedule") {
      r.push({
        "Asset Code": `AST-${1000 + i}`,
        Name: ["Lathe", "CNC Mill", "Laptop", "UPS", "Forklift"][i % 5],
        Book: ["Company", "Tax", "IFRS"][i % 3],
        Method: ["SLM", "WDV"][i % 2],
        "Depn for Period": (3500 + i * 120).toFixed(2),
        "Accum Depn": (120000 + i * 5000).toFixed(2),
        "Net Book Value": (450000 - i * 9000).toFixed(2),
      });
    } else if (reportId === "maintenance-history") {
      const assetNames = ["Lathe Machine", "CNC Mill", "Laptop Dell", "UPS System", "Forklift", "Conveyor Belt", "Compressor", "Generator"];
      const maintenanceTypes = ["Preventive", "Breakdown", "Calibration", "Emergency", "Scheduled"];
      const workOrderStatuses = ["Open", "In Progress", "Completed", "Cancelled", "On Hold"];
      const notes = [
        "Regular preventive maintenance completed",
        "Emergency breakdown repair - motor replacement",
        "Calibration check and adjustment",
        "Scheduled maintenance - oil change and filter replacement",
        "Emergency repair - hydraulic system failure",
        "Preventive maintenance - belt replacement",
        "Calibration and testing completed",
        "Emergency breakdown - electrical fault"
      ];
      
      r.push({
        "Work Order ID": `WO-${2200 + i}`,
        "Asset ID": `AST-${1000 + i}`,
        "Asset Name": assetNames[i % assetNames.length],
        "Maintenance Start Date": dateOffset(-30 - i * 3),
        "Maintenance End Date": dateOffset(-28 - i * 3),
        "Notes": notes[i % notes.length],
        "Vendor ID": `VND-${100 + i}`,
        "Vendor Name": VENDORS[i % VENDORS.length],
        "Work Order Status": workOrderStatuses[i % workOrderStatuses.length],
        "Maintenance Type": maintenanceTypes[i % maintenanceTypes.length],
        "Cost (₹)": 1200 + i * 200,
        "Downtime (h)": (i % 5) * 2,
             });
     } else if (reportId === "asset-workflow-history") {
       const assetNames = ["Lathe Machine", "CNC Mill", "Laptop Dell", "UPS System", "Forklift", "Conveyor Belt", "Compressor", "Generator"];
       const workflowSteps = ["Request Initiated", "Approval Pending", "Vendor Assignment", "Work In Progress", "Quality Check", "Completed"];
       const workOrderStatuses = ["Open", "In Progress", "Completed", "Cancelled", "On Hold"];
       const workflowStatuses = ["Pending", "In Progress", "Completed", "On Hold", "Cancelled"];
       const priorities = ["Low", "Medium", "High", "Critical"];
       const notes = [
         "Workflow initiated for preventive maintenance",
         "Emergency workflow - equipment breakdown",
         "Scheduled workflow - routine inspection",
         "Workflow for calibration and testing",
         "Emergency repair workflow - hydraulic failure",
         "Preventive maintenance workflow - belt replacement",
         "Workflow for electrical system upgrade",
         "Emergency workflow - motor replacement"
       ];
       
       r.push({
         "Work Order ID": `WO-${2300 + i}`,
         "Asset ID": `AST-${1000 + i}`,
         "Asset Name": assetNames[i % assetNames.length],
         "Workflow Step": workflowSteps[i % workflowSteps.length],
         "Maintenance Start Date": dateOffset(-25 - i * 2),
         "Maintenance End Date": dateOffset(-23 - i * 2),
         "Notes": notes[i % notes.length],
         "Vendor ID": `VND-${100 + i}`,
         "Vendor Name": VENDORS[i % VENDORS.length],
         "Work Order Status": workOrderStatuses[i % workOrderStatuses.length],
         "Workflow Status": workflowStatuses[i % workflowStatuses.length],
         "Assigned To": USERS[i % USERS.length],
         "Priority": priorities[i % priorities.length],
         "Cost (₹)": 1500 + i * 300,
               });
      } else if (reportId === "breakdown-history") {
        // No fake data generation for breakdown history - use real API data only
        // This ensures only real data from the database is displayed
      } else if (reportId === "warranty-amc-expiry") {
      r.push({
        Asset: ["Laptop", "UPS", "Forklift", "Router"][i % 4],
        Category: ASSET_CATEGORIES[i % ASSET_CATEGORIES.length],
        Vendor: VENDORS[i % VENDORS.length],
        Coverage: ["Warranty", "AMC"][i % 2],
        Start: dateOffset(-300 + i * 10),
        End: dateOffset(10 + i * 5),
        "Days Left": 10 + i * 5,
      });
    } else if (reportId === "spares-inventory") {
      r.push({
        "Part Code": `PRT-${4000 + i}`,
        Description: ["Bearing 6205", "V-Belt A42", "Hydraulic Oil", "Coolant", "M6 Bolt"][i % 5],
        UoM: ["pcs", "pcs", "L", "L", "pcs"][i % 5],
        "On Hand": 10 + i,
        Safety: 15,
        Reorder: 20,
        "Non‑Moving (days)": (i % 6) * 30,
        "Preferred Vendor": VENDORS[i % VENDORS.length],
      });
    } else if (reportId === "vendor-performance") {
      r.push({
        Vendor: VENDORS[i % VENDORS.length],
        Jobs: 10 + i,
        "On‑time %": (85 + (i % 10)).toFixed(1),
        "Avg TAT (hrs)": (24 + i).toFixed(1),
        "FTF %": (70 + (i % 10)).toFixed(1),
        "Defect %": (2 + (i % 5)).toFixed(1),
      });
    }
  }
  return r;
}

function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
