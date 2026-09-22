import { formatInr } from '../../pages/reports/consolidatedAssetRegister/utils';

/** Column catalog for Consolidated Asset Register (Asset register tab). */
export const CONSOLIDATED_REGISTER_COLUMNS = {
  default: [
    'Institution',
    'Campus',
    'Dept',
    'Asset ID',
    'Serial',
    'Type',
    'Status',
    'Acquisition (₹)',
    'Book (₹)',
  ],
  all: [
    'Institution',
    'Campus',
    'Dept',
    'Asset ID',
    'Serial',
    'Type',
    'Status',
    'Acquisition (₹)',
    'Book (₹)',
    'Org ID',
    'Branch ID',
  ],
};

export const CONSOLIDATED_ADVANCED_FIELDS = [
  { key: 'assetId', label: 'Asset ID', type: 'text' },
  { key: 'serial', label: 'Serial number', type: 'text' },
  { key: 'assetType', label: 'Asset type', type: 'multiselect', domain: [] },
  { key: 'status', label: 'Status', type: 'multiselect', domain: [] },
  { key: 'campus', label: 'Campus', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'acquisitionMin', label: 'Acquisition ≥ (₹)', type: 'number' },
  { key: 'bookMin', label: 'Book value ≥ (₹)', type: 'number' },
];

export const CONSOLIDATED_FIELD_ACCESSORS = {
  assetId: (r) => r.asset_id,
  serial: (r) => r.serial_number,
  assetType: (r) => r.asset_type,
  status: (r) => r.status,
  campus: (r) => r.campus,
  department: (r) => r.department,
  acquisitionMin: (r) => r.acquisition_value,
  bookMin: (r) => r.book_value,
};

export function getConsolidatedCellValue(row, column) {
  switch (column) {
    case 'Institution':
      return row.institution ?? '—';
    case 'Campus':
      return row.campus ?? '—';
    case 'Dept':
      return row.department ?? '—';
    case 'Asset ID':
      return row.asset_id ?? '—';
    case 'Serial':
      return row.serial_number ?? '—';
    case 'Type':
      return row.asset_type ?? '—';
    case 'Status':
      return row.status ?? '—';
    case 'Acquisition (₹)':
      return formatInr(row.acquisition_value);
    case 'Book (₹)':
      return formatInr(row.book_value);
    case 'Org ID':
      return row.org_id ?? '—';
    case 'Branch ID':
      return row.branch_id ?? '—';
    default:
      return '—';
  }
}

export function isNumericConsolidatedColumn(column) {
  return column === 'Acquisition (₹)' || column === 'Book (₹)';
}

/** Maintenance Status Report detail columns */
export const MAINTENANCE_STATUS_COLUMNS = {
  default: [
    'Asset ID',
    'Asset Name',
    'Asset Type',
    'Status',
    'Due Date',
    'Completed On',
    'Vendor',
  ],
  all: [
    'Asset ID',
    'Asset Name',
    'Serial',
    'Asset Type',
    'Status',
    'Due Date',
    'Completed On',
    'Vendor',
    'Work Order',
    'Branch',
    'Department',
  ],
};

export const MAINTENANCE_STATUS_ADVANCED_FIELDS = [
  { key: 'assetId', label: 'Asset ID', type: 'text' },
  { key: 'assetName', label: 'Asset name', type: 'text' },
  { key: 'status', label: 'Status', type: 'multiselect', domain: ['DUE', 'OVERDUE', 'COMPLETED', 'CANCELLED', 'WARRANTY_EXPIRY', 'ASSET_EXPIRY'] },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'assetType', label: 'Asset type', type: 'text' },
];

export const MAINTENANCE_STATUS_FIELD_ACCESSORS = {
  assetId: (r) => r.asset_id,
  assetName: (r) => r.asset_name || r.asset_description,
  status: (r) => r.compliance_status,
  vendor: (r) => r.vendor_name,
  assetType: (r) => r.asset_type_name || r.asset_type,
};

export function getMaintenanceStatusCellValue(row, column) {
  switch (column) {
    case 'Asset ID':
      return row.asset_id ?? '—';
    case 'Asset Name':
      return row.asset_name || row.asset_description || '—';
    case 'Serial':
      return row.serial_number ?? '—';
    case 'Asset Type':
      return row.asset_type_name || row.asset_type || '—';
    case 'Status':
      return row.compliance_status ? String(row.compliance_status).replace(/_/g, ' ') : '—';
    case 'Due Date':
      return row.act_maint_st_date || row.due_date
        ? String(row.act_maint_st_date || row.due_date).slice(0, 10)
        : '—';
    case 'Completed On':
      return row.act_main_end_date || row.completed_on
        ? String(row.act_main_end_date || row.completed_on).slice(0, 10)
        : '—';
    case 'Vendor':
      return row.vendor_name ?? '—';
    case 'Work Order':
      return row.wo_id || row.wfamsh_id || row.ams_id || '—';
    case 'Branch':
      return row.branch_name || row.branch_id || '—';
    case 'Department':
      return row.department_name || row.dept_id || '—';
    default:
      return '—';
  }
}

/** SLA & Vendor Performance — work-order detail columns */
export const SLA_DETAIL_COLUMNS = {
  default: [
    'Request',
    'Asset',
    'Type',
    'Vendor',
    'Created',
    'Completed',
    'Resolution',
    'Target',
    'SLA',
    'Delay',
    'Rating',
  ],
  all: [
    'Request',
    'Asset',
    'Type',
    'Vendor',
    'Created',
    'Completed',
    'Resolution',
    'Target',
    'SLA',
    'Delay',
    'Rating',
    'Branch',
    'Serial',
  ],
};

export const SLA_ADVANCED_FIELDS = [
  { key: 'assetId', label: 'Asset ID', type: 'text' },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'assetType', label: 'Asset type', type: 'text' },
  { key: 'slaStatus', label: 'SLA status', type: 'multiselect', domain: ['within_sla', 'breached', 'open', 'no_sla'] },
];

export const SLA_FIELD_ACCESSORS = {
  assetId: (r) => r.asset_id,
  vendor: (r) => r.vendor_name,
  assetType: (r) => r.asset_type_name || r.asset_type,
  slaStatus: (r) => r.sla_status,
};

export function getSlaDetailCellValue(row, column) {
  const fmtDt = (v) =>
    v ? String(v).slice(0, 16).replace('T', ' ') : '—';
  switch (column) {
    case 'Request':
      return row.request_id || row.wfamsh_id || row.ams_id || '—';
    case 'Asset':
      return row.asset_id || row.asset_name || '—';
    case 'Type':
      return row.asset_type_name || row.asset_type || '—';
    case 'Vendor':
      return row.vendor_name || '—';
    case 'Created':
      return fmtDt(row.request_start || row.created_on || row.created_at);
    case 'Completed':
      return fmtDt(row.completed_at || row.completed_on || row.act_main_end_date);
    case 'Resolution':
      return row.resolution_label ?? (row.resolution_hours != null ? `${row.resolution_hours}h` : '—');
    case 'Target':
      return row.resolution_target_label ?? (row.sla_target_hours != null ? `${row.sla_target_hours}h` : '—');
    case 'SLA':
      return row.sla_status || '—';
    case 'Delay':
      return row.delay_label ?? (row.delay_hours != null ? `${row.delay_hours}h` : '—');
    case 'Rating':
      return row.sla_rating != null ? row.sla_rating : row.rating ?? '—';
    case 'Branch':
      return row.branch_name || row.branch_id || '—';
    case 'Serial':
      return row.serial_number || '—';
    default:
      return '—';
  }
}

/** Workforce report work-order columns */
export const WORKFORCE_COLUMNS = {
  default: [
    'Work order',
    'Asset',
    'Technician',
    'Scheduled',
    'Completed',
    'Status',
    'Institution',
  ],
  all: [
    'Work order',
    'Asset',
    'Serial',
    'Technician',
    'Scheduled',
    'Completed',
    'Status',
    'Institution',
    'Asset type',
  ],
};

export const WORKFORCE_ADVANCED_FIELDS = [
  { key: 'assetId', label: 'Asset ID', type: 'text' },
  { key: 'technician', label: 'Technician', type: 'text' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'branch', label: 'Institution', type: 'text' },
];

export const WORKFORCE_FIELD_ACCESSORS = {
  assetId: (r) => r.asset_id,
  technician: (r) => r.technician_name,
  status: (r) => r.status,
  branch: (r) => r.branch_name,
};

export function getWorkforceCellValue(row, column) {
  const fmt = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return String(v);
    }
  };
  switch (column) {
    case 'Work order':
      return row.ams_id || row.wfamsh_id || '—';
    case 'Asset':
      return row.asset_name || row.asset_id || '—';
    case 'Serial':
      return row.serial_number || '—';
    case 'Technician':
      return row.technician_name || '—';
    case 'Scheduled':
      return fmt(row.act_maint_st_date);
    case 'Completed':
      return fmt(row.act_main_end_date);
    case 'Status':
      return row.status || '—';
    case 'Institution':
      return row.branch_name || '—';
    case 'Asset type':
      return row.asset_type_name || row.asset_type || '—';
    default:
      return '—';
  }
}

/** Audit Reports — selected assets list */
export const AUDIT_REPORT_COLUMNS = {
  default: [
    'Asset',
    'Serial',
    'Asset type',
    'Branch',
    'Department',
    'Status',
    'Invoice',
    'Certification',
    'Last maintenance',
  ],
  all: [
    'Asset',
    'Serial',
    'Description',
    'Asset type',
    'Branch',
    'Department',
    'Status',
    'Invoice',
    'Certification',
    'Last maintenance',
  ],
};

export const AUDIT_REPORT_ADVANCED_FIELDS = [
  { key: 'assetId', label: 'Asset ID', type: 'text' },
  { key: 'serial', label: 'Serial number', type: 'text' },
  { key: 'assetType', label: 'Asset type', type: 'text' },
  { key: 'branch', label: 'Branch', type: 'text' },
  { key: 'department', label: 'Department', type: 'text' },
  { key: 'status', label: 'Status', type: 'multiselect', domain: [] },
];

export const AUDIT_REPORT_FIELD_ACCESSORS = {
  assetId: (r) => r.asset_id,
  serial: (r) => r.serial_number,
  assetType: (r) => r.asset_type_name || r.asset_type,
  branch: (r) => r.branch_name,
  department: (r) => r.department_name,
  status: (r) => r.asset_status,
};

export function getAuditReportCellValue(row, column) {
  const fmt = (v) => {
    if (!v) return '—';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleDateString(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return String(v);
    }
  };
  switch (column) {
    case 'Asset':
      return row.asset_id || '—';
    case 'Serial':
      return row.serial_number || '—';
    case 'Description':
      return row.asset_description || '—';
    case 'Asset type':
      return row.asset_type_name || row.asset_type || '—';
    case 'Branch':
      return row.branch_name || '—';
    case 'Department':
      return row.department_name || '—';
    case 'Status':
      return row.asset_status || '—';
    case 'Invoice':
      return row.invoice_id || '—';
    case 'Certification':
      return row.certification_summary || '—';
    case 'Last maintenance':
      return fmt(row.last_maintenance);
    default:
      return '—';
  }
}
