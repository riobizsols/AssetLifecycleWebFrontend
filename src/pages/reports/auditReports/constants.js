export const CURRENT_YEAR = new Date().getFullYear();

export const FIELD_GROUPS = [
  {
    id: 'asset',
    title: 'Asset information',
    fields: [
      { key: 'asset', label: 'Asset', defaultOn: true },
      { key: 'assetType', label: 'Asset type', defaultOn: true },
      { key: 'location', label: 'Location', defaultOn: true },
      { key: 'department', label: 'Department', defaultOn: false },
      { key: 'serialNumber', label: 'Serial number', defaultOn: true },
      { key: 'purchaseDate', label: 'Purchase date', defaultOn: true },
      { key: 'purchaseCost', label: 'Purchase cost', defaultOn: false },
      { key: 'status', label: 'Status', defaultOn: true },
      { key: 'purchaseVendor', label: 'Purchase vendor', defaultOn: false },
      { key: 'serviceVendor', label: 'Service vendor', defaultOn: false },
    ],
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    fields: [
      { key: 'maintDate', label: 'Maintenance date', defaultOn: true },
      { key: 'maintType', label: 'Maintenance type', defaultOn: true },
      { key: 'maintStatus', label: 'Status', defaultOn: true },
      { key: 'maintVendor', label: 'Technician / vendor', defaultOn: true },
      { key: 'maintWo', label: 'Work order', defaultOn: false },
      { key: 'maintNotes', label: 'Notes', defaultOn: false },
    ],
  },
  {
    id: 'breakdown',
    title: 'Breakdowns',
    fields: [
      { key: 'brDate', label: 'Breakdown date', defaultOn: true },
      { key: 'brIssue', label: 'Issue', defaultOn: true },
      { key: 'brReason', label: 'Reason', defaultOn: true },
      { key: 'brStatus', label: 'Status', defaultOn: true },
      { key: 'brReportedBy', label: 'Reported by', defaultOn: false },
    ],
  },
  {
    id: 'certifications',
    title: 'Certifications',
    fields: [
      { key: 'certType', label: 'Document type', defaultOn: true },
      { key: 'certPath', label: 'Document', defaultOn: true },
    ],
  },
  {
    id: 'financial',
    title: 'Financial',
    fields: [
      { key: 'invoice', label: 'Invoice number', defaultOn: true },
      { key: 'invoiceVendor', label: 'Invoice vendor', defaultOn: false },
      { key: 'po', label: 'Purchase order number', defaultOn: true },
      { key: 'poVendor', label: 'Purchase order vendor', defaultOn: false },
    ],
  },
  {
    id: 'coverage',
    title: 'AMC / CMC / Warranty',
    fields: [
      { key: 'coverageType', label: 'Coverage type', defaultOn: true },
      { key: 'coverageStatus', label: 'Status', defaultOn: true },
      { key: 'coverageVendor', label: 'Vendor', defaultOn: true },
      { key: 'coverageStart', label: 'Start', defaultOn: true },
      { key: 'coverageEnd', label: 'End / renewal due', defaultOn: true },
      { key: 'coverageDaysLeft', label: 'Days left', defaultOn: true },
      { key: 'coverageLastRenewal', label: 'Last renewal', defaultOn: false },
    ],
  },
];

export const ASSET_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'breakdowns', label: 'Breakdowns' },
  { id: 'certifications', label: 'Certifications' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'purchaseOrders', label: 'Purchase orders' },
  { id: 'amcCmcWarranty', label: 'AMC / CMC / Warranty Report' },
  { id: 'vendorRenewal', label: 'Vendor Renewal' },
];

export const PAGE_SIZE = 10;

export const API_SECTIONS = {
  assetDetails: true,
  maintenance: true,
  breakdown: true,
  certifications: true,
  invoices: true,
  purchaseOrders: true,
};

export function defaultFieldSelection() {
  const out = {};
  FIELD_GROUPS.forEach((g) => {
    g.fields.forEach((f) => {
      out[f.key] = f.defaultOn;
    });
  });
  return out;
}
