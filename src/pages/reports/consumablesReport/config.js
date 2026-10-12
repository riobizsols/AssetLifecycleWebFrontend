import { STOCK_STATUS } from '../../../components/consumables/stockStatus';

export const STATUS_LABELS = {
  OK: STOCK_STATUS.OK?.label || 'In stock',
  LOW_STOCK: STOCK_STATUS.LOW_STOCK?.label || 'Low stock',
  REORDER: STOCK_STATUS.REORDER?.label || 'Reorder',
  OUT_OF_STOCK: STOCK_STATUS.OUT_OF_STOCK?.label || 'Out of stock',
};

export const TXN_LABELS = {
  OPENING: 'Opening stock',
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Adjustment',
  ISSUE: 'Allocation',
  ISSUE_EDIT: 'Allocation edit',
  ISSUE_REVERSAL: 'Allocation reversal',
};

export const TXN_TONES = {
  OPENING: 'bg-sky-50 text-sky-700 ring-sky-200',
  RESTOCK: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  ADJUSTMENT: 'bg-amber-50 text-amber-700 ring-amber-200',
  ISSUE: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  ISSUE_EDIT: 'bg-violet-50 text-violet-700 ring-violet-200',
  ISSUE_REVERSAL: 'bg-rose-50 text-rose-700 ring-rose-200',
};

const n = (v) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export const formatQty = (v) =>
  n(v).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const formatSignedQty = (v) => {
  const x = n(v);
  return `${x > 0 ? '+' : ''}${formatQty(x)}`;
};

export const formatDate = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (v) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const brandLabel = (r) => (r.brand && String(r.brand).trim()) || 'Unbranded';

/**
 * Column definition:
 *   label   — header + identifier used by the column picker
 *   value   — raw value used for sorting, advanced filters and Excel
 *   display — formatted text for table / preview / PDF (defaults to value)
 *   numeric — right-aligned
 *   kind    — optional cell renderer hint ('status' | 'txn')
 */
const STOCK_COLUMNS = [
  { label: 'Stock ID', value: (r) => r.cinven_id },
  { label: 'Consumable', value: (r) => r.consumable, maxWidth: 220 },
  { label: 'Consumable ID', value: (r) => r.consum_id },
  { label: 'Brand', value: brandLabel },
  { label: 'Branch', value: (r) => r.branch_name || r.branch_id || '', maxWidth: 180 },
  { label: 'UOM', value: (r) => r.uom_name || '' },
  { label: 'On hand', value: (r) => n(r.quantity), display: (r) => formatQty(r.quantity), numeric: true },
  { label: 'Min stock', value: (r) => n(r.min_stock), display: (r) => formatQty(r.min_stock), numeric: true },
  { label: 'Reorder level', value: (r) => n(r.reorder_level), display: (r) => formatQty(r.reorder_level), numeric: true },
  {
    label: 'Status',
    value: (r) => STATUS_LABELS[r.stock_status] || r.stock_status,
    kind: 'status',
  },
  { label: 'Received (period)', value: (r) => n(r.received_qty), display: (r) => formatQty(r.received_qty), numeric: true },
  { label: 'Allocated (period)', value: (r) => n(r.allocated_qty), display: (r) => formatQty(r.allocated_qty), numeric: true },
  { label: 'Adjusted (period)', value: (r) => n(r.adjusted_qty), display: (r) => formatSignedQty(r.adjusted_qty), numeric: true },
  { label: 'Allocations (period)', value: (r) => n(r.allocation_count), numeric: true },
  { label: 'Last restocked', value: (r) => r.last_restocked_on || '', display: (r) => formatDate(r.last_restocked_on), sortDate: true },
  { label: 'Last allocated', value: (r) => r.last_allocated_on || '', display: (r) => formatDate(r.last_allocated_on), sortDate: true },
  { label: 'Stocked since', value: (r) => r.created_on || '', display: (r) => formatDate(r.created_on), sortDate: true },
];

const MOVEMENT_COLUMNS = [
  { label: 'Date & time', value: (r) => r.created_on || '', display: (r) => formatDateTime(r.created_on), sortDate: true },
  { label: 'Type', value: (r) => TXN_LABELS[r.txn_type] || r.txn_type, kind: 'txn' },
  { label: 'Consumable', value: (r) => r.consumable, maxWidth: 220 },
  { label: 'Consumable ID', value: (r) => r.consum_id },
  { label: 'Stock ID', value: (r) => r.cinven_id },
  { label: 'Brand', value: brandLabel },
  { label: 'Branch', value: (r) => r.branch_name || r.branch_id || '', maxWidth: 180 },
  { label: 'UOM', value: (r) => r.uom_name || '' },
  { label: 'Qty change', value: (r) => n(r.qty_change), display: (r) => formatSignedQty(r.qty_change), numeric: true, kind: 'signed' },
  { label: 'Qty before', value: (r) => n(r.qty_before), display: (r) => formatQty(r.qty_before), numeric: true },
  { label: 'Qty after', value: (r) => n(r.qty_after), display: (r) => formatQty(r.qty_after), numeric: true },
  { label: 'Department', value: (r) => r.dept_name || r.dept_id || '', maxWidth: 180 },
  { label: 'Allocation ID', value: (r) => r.cusage_id || '' },
  { label: 'Reference', value: (r) => r.reference || '', maxWidth: 160 },
  { label: 'Remarks', value: (r) => r.remarks || '', maxWidth: 220 },
  { label: 'Done by', value: (r) => r.created_by_name || r.created_by || '' },
];

const ALLOCATION_COLUMNS = [
  { label: 'Date', value: (r) => r.created_on || '', display: (r) => formatDateTime(r.created_on), sortDate: true },
  { label: 'Allocation ID', value: (r) => r.cusage_id },
  { label: 'Consumable', value: (r) => r.consumable, maxWidth: 220 },
  { label: 'Consumable ID', value: (r) => r.consum_id },
  { label: 'Stock ID', value: (r) => r.cinven_id },
  { label: 'Brand', value: brandLabel },
  { label: 'Department', value: (r) => r.dept_name || r.dept_id || '', maxWidth: 200 },
  { label: 'Branch', value: (r) => r.branch_name || r.branch_id || '', maxWidth: 180 },
  { label: 'Allocated qty', value: (r) => n(r.allocated_qty), display: (r) => formatQty(r.allocated_qty), numeric: true },
  { label: 'UOM', value: (r) => r.uom_name || '' },
  { label: 'Balance after', value: (r) => n(r.balance), display: (r) => formatQty(r.balance), numeric: true },
  { label: 'Allocated by', value: (r) => r.created_by_name || r.created_by || '' },
  { label: 'Last changed', value: (r) => r.changed_on || '', display: (r) => formatDate(r.changed_on), sortDate: true },
];

const pick = (cols, labels) => labels.filter((l) => cols.some((c) => c.label === l));

export const DATASETS = {
  stock: {
    id: 'stock',
    label: 'Stock register',
    title: 'Stock register',
    subtitle: 'Current stock per consumable and brand, with activity in the selected period',
    rowsKey: 'stock',
    rowKey: (r) => r.cinven_id,
    columns: STOCK_COLUMNS,
    defaultColumns: pick(STOCK_COLUMNS, [
      'Consumable',
      'Brand',
      'Branch',
      'On hand',
      'Min stock',
      'Reorder level',
      'Status',
      'Received (period)',
      'Allocated (period)',
      'Last restocked',
    ]),
    searchLabels: ['Consumable', 'Consumable ID', 'Stock ID', 'Brand', 'Branch'],
    defaultSort: { label: 'Consumable', dir: 'asc' },
    advancedFields: [
      { key: 'Consumable', label: 'Consumable', type: 'text' },
      { key: 'Brand', label: 'Brand', type: 'select' },
      { key: 'UOM', label: 'UOM', type: 'select' },
      { key: 'Status', label: 'Status', type: 'select', domain: Object.values(STATUS_LABELS) },
      { key: 'On hand', label: 'On hand', type: 'number' },
      { key: 'Min stock', label: 'Min stock', type: 'number' },
      { key: 'Reorder level', label: 'Reorder level', type: 'number' },
      { key: 'Received (period)', label: 'Received (period)', type: 'number' },
      { key: 'Allocated (period)', label: 'Allocated (period)', type: 'number' },
      { key: 'Allocations (period)', label: 'Allocations (period)', type: 'number' },
    ],
  },
  movements: {
    id: 'movements',
    label: 'Stock movements',
    title: 'Stock movements',
    subtitle: 'Every restock, allocation and adjustment in the selected period',
    rowsKey: 'movements',
    rowKey: (r) => r.log_id,
    columns: MOVEMENT_COLUMNS,
    defaultColumns: pick(MOVEMENT_COLUMNS, [
      'Date & time',
      'Type',
      'Consumable',
      'Brand',
      'Branch',
      'Qty change',
      'Qty before',
      'Qty after',
      'Department',
      'Reference',
      'Done by',
    ]),
    searchLabels: ['Consumable', 'Brand', 'Branch', 'Department', 'Reference', 'Remarks', 'Done by'],
    defaultSort: { label: 'Date & time', dir: 'desc' },
    advancedFields: [
      { key: 'Type', label: 'Type', type: 'select', domain: Object.values(TXN_LABELS) },
      { key: 'Consumable', label: 'Consumable', type: 'text' },
      { key: 'Brand', label: 'Brand', type: 'select' },
      { key: 'Department', label: 'Department', type: 'select' },
      { key: 'Qty change', label: 'Qty change', type: 'number' },
      { key: 'Qty after', label: 'Qty after', type: 'number' },
      { key: 'Reference', label: 'Reference', type: 'text' },
      { key: 'Remarks', label: 'Remarks', type: 'text' },
      { key: 'Done by', label: 'Done by', type: 'select' },
    ],
  },
  allocations: {
    id: 'allocations',
    label: 'Department allocations',
    title: 'Department allocations',
    subtitle: 'Consumables issued to departments in the selected period',
    rowsKey: 'allocations',
    rowKey: (r) => r.cusage_id,
    columns: ALLOCATION_COLUMNS,
    defaultColumns: pick(ALLOCATION_COLUMNS, [
      'Date',
      'Allocation ID',
      'Consumable',
      'Brand',
      'Department',
      'Branch',
      'Allocated qty',
      'UOM',
      'Balance after',
      'Allocated by',
    ]),
    searchLabels: ['Allocation ID', 'Consumable', 'Brand', 'Department', 'Branch', 'Allocated by'],
    defaultSort: { label: 'Date', dir: 'desc' },
    advancedFields: [
      { key: 'Consumable', label: 'Consumable', type: 'text' },
      { key: 'Brand', label: 'Brand', type: 'select' },
      { key: 'Department', label: 'Department', type: 'select' },
      { key: 'UOM', label: 'UOM', type: 'select' },
      { key: 'Allocated qty', label: 'Allocated qty', type: 'number' },
      { key: 'Balance after', label: 'Balance after', type: 'number' },
      { key: 'Allocated by', label: 'Allocated by', type: 'select' },
    ],
  },
};

export const DATASET_LIST = [DATASETS.stock, DATASETS.movements, DATASETS.allocations];

export const columnByLabel = (dataset, label) => dataset.columns.find((c) => c.label === label);

export const cellText = (col, row) => {
  if (!col) return '';
  const v = col.display ? col.display(row) : col.value(row);
  return v == null ? '' : String(v);
};

export const accessorsFor = (dataset) =>
  Object.fromEntries(dataset.columns.map((c) => [c.label, c.value]));

export const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: 'month', label: 'This month' },
  { id: 'fy', label: 'This FY' },
  { id: '365d', label: 'Last 12 months', days: 365 },
];

const iso = (d) => {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
};

export function presetRange(id) {
  const today = new Date();
  const preset = DATE_PRESETS.find((p) => p.id === id);
  if (!preset) return null;
  if (preset.days) {
    const from = new Date(today);
    from.setDate(from.getDate() - (preset.days - 1));
    return { from: iso(from), to: iso(today) };
  }
  if (id === 'month') {
    return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
  }
  const fyStartYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return { from: iso(new Date(fyStartYear, 3, 1)), to: iso(today) };
}

export const emptyFilters = () => ({
  ...presetRange('30d'),
  preset: '30d',
  branchIds: [],
  consumIds: [],
  brands: [],
  deptIds: [],
  statuses: [],
  txnTypes: [],
});
