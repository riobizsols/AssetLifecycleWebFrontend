import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Package,
  ClipboardList,
  AlertTriangle,
  Wrench,
  Clock,
  Eye,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  AdvancedBuilder,
  Input,
  SearchableSelect,
  SectionTitle,
} from '../components/reportModels/ReportComponents';
import API from '../lib/axios';
import { showBackendTextToast } from '../utils/errorTranslation';

const ADVANCED_FIELDS = [
  { key: 'part_code', label: 'Part code', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'category', label: 'Category', type: 'text' },
  { key: 'asset_name', label: 'Asset', type: 'text' },
  { key: 'serial_number', label: 'Serial number', type: 'text' },
  { key: 'fsn_class', label: 'FSN class', type: 'select', domain: ['Fast', 'Slow', 'Non-moving'] },
  { key: 'branch', label: 'Branch', type: 'text' },
  { key: 'on_hand', label: 'On hand', type: 'number' },
  { key: 'quantity_net', label: 'Quantity', type: 'number' },
];

const rowFieldValue = (row, key) => {
  if (key === 'description') return row.description ?? row.part_description ?? '';
  if (key === 'quantity_net') return row.quantity_net ?? row.quantity_issued ?? '';
  return row[key] ?? '';
};

const matchesCondition = (row, condition) => {
  const raw = rowFieldValue(row, condition.field);
  const target = condition.val == null ? '' : String(condition.val).trim();
  if (!condition.field || target === '') return true;
  const left = String(raw ?? '').toLowerCase();
  const right = target.toLowerCase();
  const leftNum = Number(raw);
  const rightNum = Number(target);
  switch (condition.op) {
    case 'contains':
      return left.includes(right);
    case 'starts with':
      return left.startsWith(right);
    case 'ends with':
      return left.endsWith(right);
    case '!=':
      return left !== right;
    case '>=':
      return Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum >= rightNum;
    case '<=':
      return Number.isFinite(leftNum) && Number.isFinite(rightNum) && leftNum <= rightNum;
    case '=':
    default:
      return left === right;
  }
};

const applyAdvancedConditions = (rows, conditions) => {
  const active = (conditions || []).filter(
    (c) => c.field && c.val != null && String(c.val).trim() !== '',
  );
  if (!active.length) return rows;
  return rows.filter((row) => active.every((c) => matchesCondition(row, c)));
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'slow', label: 'Slow & Non-moving' },
  { id: 'consumption', label: 'Spare Consumption' },
  { id: 'equipment', label: 'Equipment-wise' },
  { id: 'hold', label: 'Hold duration' },
];

const DATE_PERIOD_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'last_30', label: 'Last 30 days' },
  { value: 'last_90', label: 'Last 90 days' },
  { value: 'specific', label: 'Specific range' },
];

const isoDate = (d) => d.toISOString().slice(0, 10);

const rangeForPeriod = (period) => {
  if (period === 'last_30') {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { dateFrom: isoDate(from), dateTo: isoDate(to) };
  }
  if (period === 'last_90') {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 90);
    return { dateFrom: isoDate(from), dateTo: isoDate(to) };
  }
  return { dateFrom: '', dateTo: '' };
};

const THRESHOLD_OPTIONS = [
  { value: 90, label: '90 days' },
  { value: 180, label: '180 days' },
  { value: 365, label: '365 days' },
];

const fmtDate = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleDateString();
  } catch {
    return String(v);
  }
};

const fmtDateTime = (v) => {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return String(v);
  }
};

const fmtNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : '—';
};

const fmtHoldDuration = (hours, seconds) => {
  const secs = Number(seconds);
  if (Number.isFinite(secs) && secs >= 0) {
    if (secs < 3600) {
      const mins = Math.round(secs / 60);
      return `${mins} min`;
    }
    if (secs < 48 * 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.round((secs % 3600) / 60);
      return m ? `${h}h ${m}m` : `${h}h`;
    }
    const days = Math.floor(secs / 86400);
    const h = Math.round((secs % 86400) / 3600);
    return h ? `${days}d ${h}h` : `${days}d`;
  }
  const h = Number(hours);
  if (!Number.isFinite(h)) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  return `${h} h`;
};

const mapSlowRows = (rows) =>
  (rows || []).map((r) => ({
    ...r,
    last_consumption_date: fmtDate(r.last_consumption_date),
    last_receipt_date: fmtDate(r.last_receipt_date),
    days_since_last_consumption:
      r.days_since_last_consumption == null ? 'Never' : r.days_since_last_consumption,
  }));

const mapConsumptionRows = (rows) =>
  (rows || []).map((r) => ({
    ...r,
    posting_datetime: r.posting_datetime ? new Date(r.posting_datetime).toLocaleString() : '—',
  }));

const mapEquipmentRows = (rows) =>
  (rows || []).map((r) => ({
    ...r,
    issue_date: fmtDate(r.issue_date),
    previous_replacement_date: fmtDate(r.previous_replacement_date),
    days_since_prior_replacement:
      r.days_since_prior_replacement == null ? '—' : r.days_since_prior_replacement,
  }));

const mapHoldRows = (rows) =>
  (rows || []).map((r) => ({
    ...r,
    handed_out_at: fmtDateTime(r.handed_out_at),
    finished_at: fmtDateTime(r.finished_at),
    hold_display: fmtHoldDuration(r.hold_hours, r.hold_seconds),
  }));

const FsnBadge = ({ value }) => {
  const cls =
    value === 'Fast' || value === 'Fast use'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : value === 'Slow' || value === 'Same day'
        ? 'bg-amber-50 text-amber-800 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {value || '—'}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, hint, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="text-left rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-300 hover:shadow transition w-full"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
        <Icon size={18} />
      </div>
    </div>
  </button>
);

const DetailField = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] uppercase tracking-wide text-slate-500">{label}</dt>
    <dd className="mt-0.5 text-sm text-slate-900 break-words">{children ?? '—'}</dd>
  </div>
);

const PartDetailModal = ({ open, onClose, part, holdRows, consumptionRows, equipmentRows }) => {
  if (!open || !part) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close detail"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-xl flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-[#0E2F4B] px-5 py-4 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/70">Spare part detail</p>
            <h2 className="text-lg font-semibold">
              {part.part_code} · {part.description || part.part_description || '—'}
            </h2>
            <p className="text-sm text-white/80 mt-0.5">
              Click outside or Close to return to the list
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-5">
          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Stock & movement</h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DetailField label="Part code">{part.part_code}</DetailField>
              <DetailField label="Description">{part.description || part.part_description}</DetailField>
              <DetailField label="Category">{part.category}</DetailField>
              <DetailField label="UOM">{part.uom}</DetailField>
              <DetailField label="On hand">{fmtNum(part.on_hand ?? part.available)}</DetailField>
              <DetailField label="Last receipt">{fmtDate(part.last_receipt_date)}</DetailField>
              <DetailField label="Last consumption">{fmtDate(part.last_consumption_date)}</DetailField>
              <DetailField label="Days idle">
                {part.days_since_last_consumption == null
                  ? 'Never'
                  : part.days_since_last_consumption}
              </DetailField>
              <DetailField label="FSN class">
                <FsnBadge value={part.fsn_class} />
              </DetailField>
              <DetailField label="Age bucket">{part.age_bucket}</DetailField>
              <DetailField label="Dead stock">
                {part.dead_stock_flag ? 'Yes' : 'No'}
              </DetailField>
              <DetailField label="Suggested action">{part.suggested_action || '—'}</DetailField>
              <DetailField label="Issues in analysis period">
                {fmtNum(part.issues_in_analysis_period)}
              </DetailField>
            </dl>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Hold duration by person ({holdRows.length})
            </h3>
            <p className="text-xs text-slate-500 mb-2">
              Same product can show different holders — e.g. Person A ~1 hour vs Person B ~1 day.
            </p>
            {holdRows.length === 0 ? (
              <p className="text-sm text-slate-500">No hold records for this part.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Holder</th>
                      <th className="px-3 py-2">Handed out</th>
                      <th className="px-3 py-2">Finished</th>
                      <th className="px-3 py-2">Hold time</th>
                      <th className="px-3 py-2">Speed</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Issue #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdRows.map((r) => (
                      <tr key={r.issue_number} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-medium">{r.holder}</td>
                        <td className="px-3 py-2">{fmtDateTime(r.handed_out_at)}</td>
                        <td className="px-3 py-2">{fmtDateTime(r.finished_at)}</td>
                        <td className="px-3 py-2">
                          {fmtHoldDuration(r.hold_hours, r.hold_seconds)}
                        </td>
                        <td className="px-3 py-2">
                          <FsnBadge value={r.speed_class} />
                        </td>
                        <td className="px-3 py-2">{r.hold_status}</td>
                        <td className="px-3 py-2">{r.issue_number}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Consumption history ({consumptionRows.length})
            </h3>
            {consumptionRows.length === 0 ? (
              <p className="text-sm text-slate-500">No consumption issues for this part.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Issue #</th>
                      <th className="px-3 py-2">Posted</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Serial #</th>
                      <th className="px-3 py-2">Work order</th>
                      <th className="px-3 py-2">Branch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consumptionRows.map((r) => (
                      <tr key={r.issue_number} className="border-t border-slate-100">
                        <td className="px-3 py-2">{r.issue_number}</td>
                        <td className="px-3 py-2">{fmtDateTime(r.posting_datetime)}</td>
                        <td className="px-3 py-2">{fmtNum(r.quantity_net)}</td>
                        <td className="px-3 py-2">{r.asset_name || '—'}</td>
                        <td className="px-3 py-2">{r.serial_number || '—'}</td>
                        <td className="px-3 py-2">{r.work_order || '—'}</td>
                        <td className="px-3 py-2">{r.branch || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-800 mb-2">
              Equipment replacements ({equipmentRows.length})
            </h3>
            {equipmentRows.length === 0 ? (
              <p className="text-sm text-slate-500">No equipment-wise rows for this part.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Asset</th>
                      <th className="px-3 py-2">Serial #</th>
                      <th className="px-3 py-2">Issue date</th>
                      <th className="px-3 py-2">Qty</th>
                      <th className="px-3 py-2">Prior replacement</th>
                      <th className="px-3 py-2">Days since prior</th>
                      <th className="px-3 py-2">Cumulative</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentRows.map((r, idx) => (
                      <tr key={`${r.issue_number}-${idx}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{r.asset_name || '—'}</td>
                        <td className="px-3 py-2">{r.serial_number || '—'}</td>
                        <td className="px-3 py-2">{fmtDate(r.issue_date)}</td>
                        <td className="px-3 py-2">{fmtNum(r.quantity_issued)}</td>
                        <td className="px-3 py-2">{fmtDate(r.previous_replacement_date)}</td>
                        <td className="px-3 py-2">
                          {r.days_since_prior_replacement == null
                            ? '—'
                            : r.days_since_prior_replacement}
                        </td>
                        <td className="px-3 py-2">{fmtNum(r.cumulative_replacements)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default function SparePartManagement() {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [thresholdDays, setThresholdDays] = useState(180);
  const [datePeriod, setDatePeriod] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [summary, setSummary] = useState(null);
  const [slowData, setSlowData] = useState({ rows: [], summary: null, thresholdDays: 180 });
  const [consumption, setConsumption] = useState({ rows: [], summary: null });
  const [equipment, setEquipment] = useState({ rows: [], summary: null });
  const [holdData, setHoldData] = useState({ rows: [], summary: null });
  const [fsnFilter, setFsnFilter] = useState('all');
  const [selectedPartCode, setSelectedPartCode] = useState(null);
  const [poNumber, setPoNumber] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [advanced, setAdvanced] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [cols, setCols] = useState([]);

  const needsIdleFilter = reportType === 'slow' || reportType === 'overview';
  const needsDateFilter =
    reportType === 'consumption' ||
    reportType === 'equipment' ||
    reportType === 'hold' ||
    reportType === 'overview';

  const canView = Boolean(reportType) &&
    (datePeriod !== 'specific' || (dateFrom && dateTo));

  const resolvedDates = useMemo(() => {
    if (datePeriod === 'specific') return { dateFrom, dateTo };
    return rangeForPeriod(datePeriod);
  }, [datePeriod, dateFrom, dateTo]);

  const loadAll = useCallback(async () => {
    if (!reportType) {
      toast.error('Select a report type first');
      return;
    }
    if (datePeriod === 'specific' && (!dateFrom || !dateTo)) {
      toast.error('Select From and To dates');
      return;
    }

    setLoading(true);
    try {
      const params = {};
      if (resolvedDates.dateFrom) params.date_from = resolvedDates.dateFrom;
      if (resolvedDates.dateTo) params.date_to = resolvedDates.dateTo;
      if (poNumber.trim()) params.po_number = poNumber.trim();
      if (invoiceNumber.trim()) params.invoice_number = invoiceNumber.trim();

      const [sumRes, slowRes, consRes, eqRes, holdRes] = await Promise.all([
        API.get('/spare-parts/management/summary'),
        API.get('/spare-parts/management/slow-non-moving', {
          params: { threshold_days: thresholdDays, ...params },
        }),
        API.get('/spare-parts/management/consumption', { params }),
        API.get('/spare-parts/management/equipment-wise', { params }),
        API.get('/spare-parts/management/hold-duration', { params }),
      ]);

      const nextSlow = slowRes.data?.data || { rows: [], summary: null, thresholdDays };
      const nextConsumption = consRes.data?.data || { rows: [], summary: null };
      const nextEquipment = eqRes.data?.data || { rows: [], summary: null };
      const nextHold = holdRes.data?.data || { rows: [], summary: null };
      setSummary(sumRes.data?.data || null);
      setSlowData(nextSlow);
      setConsumption(nextConsumption);
      setEquipment(nextEquipment);
      setHoldData(nextHold);
      setActiveTab(reportType);
      setHasViewed(true);
      setSelectedPartCode(null);
      return {
        slow: mapSlowRows(nextSlow.rows),
        consumption: mapConsumptionRows(nextConsumption.rows),
        equipment: mapEquipmentRows(nextEquipment.rows),
        hold: mapHoldRows(nextHold.rows),
      };
    } catch (err) {
      showBackendTextToast({
        toast,
        fallbackText: 'Failed to load spare part management data',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [reportType, thresholdDays, datePeriod, dateFrom, dateTo, resolvedDates, poNumber, invoiceNumber]);

  const slowColumns = useMemo(
    () => [
      { label: 'Part code', name: 'part_code', visible: true },
      { label: 'Description', name: 'description', visible: true },
      { label: 'Category', name: 'category', visible: true },
      { label: 'UOM', name: 'uom', visible: true },
      { label: 'On hand', name: 'on_hand', visible: true },
      { label: 'Last consumption', name: 'last_consumption_date', visible: true },
      { label: 'Days idle', name: 'days_since_last_consumption', visible: true },
      { label: 'FSN class', name: 'fsn_class', visible: true },
      { label: 'Age bucket', name: 'age_bucket', visible: true },
      { label: 'Suggested action', name: 'suggested_action', visible: true },
    ],
    [],
  );

  const consumptionColumns = useMemo(
    () => [
      { label: 'Issue #', name: 'issue_number', visible: true },
      { label: 'Posted', name: 'posting_datetime', visible: true },
      { label: 'Part code', name: 'part_code', visible: true },
      { label: 'Description', name: 'part_description', visible: true },
      { label: 'Qty', name: 'quantity_net', visible: true },
      { label: 'Asset', name: 'asset_name', visible: true },
      { label: 'Serial #', name: 'serial_number', visible: true },
      { label: 'Maintenance type', name: 'maintenance_type', visible: true },
      { label: 'Work order', name: 'work_order', visible: true },
      { label: 'Branch', name: 'branch', visible: true },
    ],
    [],
  );

  const equipmentColumns = useMemo(
    () => [
      { label: 'Asset', name: 'asset_name', visible: true },
      { label: 'Serial #', name: 'serial_number', visible: true },
      { label: 'Asset type', name: 'asset_type', visible: true },
      { label: 'Part code', name: 'part_code', visible: true },
      { label: 'Part description', name: 'part_description', visible: true },
      { label: 'Issue date', name: 'issue_date', visible: true },
      { label: 'Qty', name: 'quantity_issued', visible: true },
      { label: 'Prior replacement', name: 'previous_replacement_date', visible: true },
      { label: 'Days since prior', name: 'days_since_prior_replacement', visible: true },
      { label: 'Cumulative replacements', name: 'cumulative_replacements', visible: true },
      { label: 'Work order', name: 'work_order', visible: true },
    ],
    [],
  );

  const holdColumns = useMemo(
    () => [
      { label: 'Holder', name: 'holder', visible: true },
      { label: 'Part code', name: 'part_code', visible: true },
      { label: 'Description', name: 'part_description', visible: true },
      { label: 'Qty', name: 'quantity_issued', visible: true },
      { label: 'Handed out', name: 'handed_out_at', visible: true },
      { label: 'Finished / now', name: 'finished_at', visible: true },
      { label: 'Hold time', name: 'hold_display', visible: true },
      { label: 'Speed', name: 'speed_class', visible: true },
      { label: 'Status', name: 'hold_status', visible: true },
      { label: 'Asset', name: 'asset_name', visible: true },
      { label: 'Issue #', name: 'issue_number', visible: true },
    ],
    [],
  );

  const slowRows = useMemo(() => {
    let rows = mapSlowRows(slowData.rows);
    if (fsnFilter !== 'all') {
      rows = rows.filter((r) => r.fsn_class === fsnFilter);
    }
    return rows;
  }, [slowData.rows, fsnFilter]);

  const consumptionRows = useMemo(
    () => mapConsumptionRows(consumption.rows),
    [consumption.rows],
  );

  const equipmentRows = useMemo(
    () => mapEquipmentRows(equipment.rows),
    [equipment.rows],
  );

  const holdRows = useMemo(() => mapHoldRows(holdData.rows), [holdData.rows]);

  const activeColumns =
    activeTab === 'slow'
      ? slowColumns
      : activeTab === 'consumption'
        ? consumptionColumns
        : activeTab === 'equipment'
          ? equipmentColumns
          : activeTab === 'hold'
            ? holdColumns
            : [];

  useEffect(() => {
    setCols(activeColumns.map((c) => c.name));
  }, [activeTab, activeColumns]);

  const previewColumns = useMemo(() => {
    const byName = Object.fromEntries(activeColumns.map((c) => [c.name, c]));
    return cols.map((name) => byName[name]).filter(Boolean);
  }, [activeColumns, cols]);

  const addableColumns = useMemo(
    () =>
      activeColumns
        .filter((c) => !cols.includes(c.name))
        .map((c) => ({ value: c.name, label: c.label })),
    [activeColumns, cols],
  );

  const removableColumns = useMemo(
    () => previewColumns.map((c) => ({ value: c.name, label: c.label })),
    [previewColumns],
  );

  const activeRows =
    activeTab === 'slow'
      ? slowRows
      : activeTab === 'consumption'
        ? consumptionRows
        : activeTab === 'equipment'
          ? equipmentRows
          : activeTab === 'hold'
            ? holdRows
            : [];

  const scopedRows = useMemo(
    () => applyAdvancedConditions(activeRows, advanced),
    [activeRows, advanced],
  );

  const activeChips = useMemo(() => {
    const chips = [];
    if (poNumber.trim()) {
      chips.push({
        label: `PO Number: ${poNumber.trim()}`,
        remove: () => setPoNumber(''),
      });
    }
    if (invoiceNumber.trim()) {
      chips.push({
        label: `Invoice Number: ${invoiceNumber.trim()}`,
        remove: () => setInvoiceNumber(''),
      });
    }
    (advanced || []).forEach((row, index) => {
      if (row.val == null || String(row.val).trim() === '') return;
      const field = ADVANCED_FIELDS.find((f) => f.key === row.field);
      chips.push({
        label: `${field?.label || row.field} ${row.op || '='} ${row.val}`,
        remove: () => setAdvanced((prev) => prev.filter((_, i) => i !== index)),
      });
    });
    return chips;
  }, [poNumber, invoiceNumber, advanced]);

  const cellTextForPdf = (colName, row) => {
    if (
      colName === 'on_hand' ||
      colName === 'quantity_net' ||
      colName === 'quantity_issued'
    ) {
      return fmtNum(row[colName]);
    }
    const v = row[colName];
    if (v == null || v === '') return '—';
    return String(v);
  };

  const buildAndDownloadPdf = ({ tabId, tabLabel, columns, rows, filtersText }) => {
    if (!columns.length) {
      toast.error('No columns to export');
      return false;
    }
    if (!rows.length) {
      toast.error('No rows to export. Preview the report first.');
      return false;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const margin = 36;
    const generatedAt = new Date().toLocaleString();

    doc.setFillColor(14, 47, 75);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), 48, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.text('Spare part consumption report', margin, 22);
    doc.setFontSize(10);
    doc.text(tabLabel, margin, 38);

    doc.setTextColor(80, 80, 80);
    doc.setFontSize(9);
    doc.text(`Generated: ${generatedAt}`, margin, 64);
    doc.text(`Rows: ${rows.length}`, margin + 220, 64);
    const filterLine = filtersText || 'Filters: None';
    const wrapped = doc.splitTextToSize(filterLine, doc.internal.pageSize.getWidth() - margin * 2);
    doc.text(wrapped, margin, 78);

    autoTable(doc, {
      startY: 78 + wrapped.length * 12 + 8,
      head: [columns.map((c) => c.label)],
      body: rows.map((row) => columns.map((c) => cellTextForPdf(c.name, row))),
      styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak', valign: 'middle' },
      headStyles: {
        fillColor: [14, 47, 75],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 8,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => {
        const pageCount = doc.internal.getNumberOfPages();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(120);
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 16,
          { align: 'right' },
        );
      },
    });

    const safeName = String(tabLabel || tabId || 'report')
      .replace(/[^\w\-]+/g, '_')
      .replace(/_+/g, '_');
    doc.save(`Spare_Part_Report_${safeName}_${new Date().toISOString().slice(0, 10)}.pdf`);
    return true;
  };

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      // Prefer what is already on screen (matches Preview table).
      if (hasViewed && activeTab === 'overview') {
        // Overview has no detail grid — export Slow & Non-moving as the detail PDF.
        let rows = mapSlowRows(slowData.rows);
        if (fsnFilter !== 'all') {
          rows = rows.filter((r) => r.fsn_class === fsnFilter);
        }
        rows = applyAdvancedConditions(rows, advanced);
        const ok = buildAndDownloadPdf({
          tabId: 'slow',
          tabLabel: 'Overview / Slow & Non-moving',
          columns: slowColumns,
          rows,
          filtersText: activeChips.length
            ? `Filters: ${activeChips.map((c) => c.label).join('  ·  ')}`
            : 'Filters: None',
        });
        if (ok) toast.success('PDF report downloaded');
        return;
      }

      if (hasViewed && activeTab !== 'overview' && previewColumns.length) {
        const tabLabel =
          TABS.find((t) => t.id === activeTab)?.label || 'Spare part consumption report';
        const filtersText = [
          ...activeChips.map((c) => c.label),
          activeTab === 'slow' && fsnFilter !== 'all' ? `FSN: ${fsnFilter}` : null,
        ]
          .filter(Boolean)
          .join('  ·  ');
        const ok = buildAndDownloadPdf({
          tabId: activeTab,
          tabLabel,
          columns: previewColumns,
          rows: scopedRows,
          filtersText: filtersText ? `Filters: ${filtersText}` : 'Filters: None',
        });
        if (ok) toast.success('PDF report downloaded');
        return;
      }

      if (!reportType) {
        toast.error('Select a report type first');
        return;
      }

      const loaded = await loadAll();
      if (!loaded) return;

      const tab = reportType === 'overview' ? 'slow' : reportType;
      const columns =
        tab === 'slow'
          ? slowColumns
          : tab === 'consumption'
            ? consumptionColumns
            : tab === 'equipment'
              ? equipmentColumns
              : holdColumns;
      let source = loaded[tab] || [];
      if (tab === 'slow' && fsnFilter !== 'all') {
        source = source.filter((r) => r.fsn_class === fsnFilter);
      }
      const rows = applyAdvancedConditions(source, advanced);
      const colNames =
        tab === activeTab && cols.length ? cols : columns.map((c) => c.name);
      const visible = colNames
        .map((name) => columns.find((c) => c.name === name))
        .filter(Boolean);
      const tabLabel =
        TABS.find((t) => t.id === reportType)?.label ||
        TABS.find((t) => t.id === tab)?.label ||
        'Spare part consumption report';
      const filtersText = activeChips.length
        ? `Filters: ${activeChips.map((c) => c.label).join('  ·  ')}`
        : 'Filters: None';

      const ok = buildAndDownloadPdf({
        tabId: tab,
        tabLabel,
        columns: visible,
        rows,
        filtersText,
      });
      if (ok) toast.success('PDF report downloaded');
    } catch (err) {
      console.error('[SparePartReport] PDF generate failed:', err);
      toast.error('Failed to generate PDF report');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const rowKey =
    activeTab === 'slow'
      ? 'part_code'
      : 'issue_number';

  const renderCellValue = (col, row) => {
    if (col.name === 'fsn_class' || col.name === 'speed_class') {
      return <FsnBadge value={row[col.name]} />;
    }
    if (
      col.name === 'on_hand' ||
      col.name === 'quantity_net' ||
      col.name === 'quantity_issued'
    ) {
      return fmtNum(row[col.name]);
    }
    const v = row[col.name];
    return v == null || v === '' ? '—' : String(v);
  };

  const selectedPart = useMemo(() => {
    if (!selectedPartCode) return null;
    return (
      (slowData.rows || []).find((r) => r.part_code === selectedPartCode) ||
      (holdData.rows || []).find((r) => r.part_code === selectedPartCode) ||
      (consumption.rows || []).find((r) => r.part_code === selectedPartCode) ||
      null
    );
  }, [selectedPartCode, slowData.rows, holdData.rows, consumption.rows]);

  const detailHoldRows = useMemo(
    () => (holdData.rows || []).filter((r) => r.part_code === selectedPartCode),
    [holdData.rows, selectedPartCode],
  );

  const detailConsumptionRows = useMemo(
    () => (consumption.rows || []).filter((r) => r.part_code === selectedPartCode),
    [consumption.rows, selectedPartCode],
  );

  const detailEquipmentRows = useMemo(
    () => (equipment.rows || []).filter((r) => r.part_code === selectedPartCode),
    [equipment.rows, selectedPartCode],
  );

  const openPartDetail = (row) => {
    const code = row?.part_code;
    if (!code) return;
    setSelectedPartCode(code);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Report type</label>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                  value={reportType}
                  onChange={(e) => {
                    const next = e.target.value;
                    setReportType(next);
                    setHasViewed(false);
                    setSelectedPartCode(null);
                    setDatePeriod('all');
                    setDateFrom('');
                    setDateTo('');
                    setThresholdDays(180);
                  }}
                >
                  <option value="">Select report type</option>
                  {TABS.map((tab) => (
                    <option key={tab.id} value={tab.id}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>

              {needsIdleFilter && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Idle threshold
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={thresholdDays}
                    onChange={(e) => {
                      setThresholdDays(Number(e.target.value));
                      setHasViewed(false);
                    }}
                  >
                    {THRESHOLD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500">
                    Used to class Fast / Slow / Non-moving stock.
                  </p>
                </div>
              )}

              {needsDateFilter && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Issue / consumption period
                  </label>
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={datePeriod}
                    onChange={(e) => {
                      setDatePeriod(e.target.value);
                      setHasViewed(false);
                      if (e.target.value !== 'specific') {
                        setDateFrom('');
                        setDateTo('');
                      }
                    }}
                  >
                    {DATE_PERIOD_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {needsDateFilter && datePeriod === 'specific' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">From</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setHasViewed(false);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">To</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#143d65]/40"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setHasViewed(false);
                    }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">PO Number</div>
                <Input
                  value={poNumber}
                  onChange={setPoNumber}
                  placeholder="Search..."
                />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-600 mb-1">Invoice Number</div>
                <Input
                  value={invoiceNumber}
                  onChange={setInvoiceNumber}
                  placeholder="Search..."
                />
              </div>
            </div>

            <AdvancedBuilder
              fields={ADVANCED_FIELDS}
              value={advanced}
              onChange={setAdvanced}
            />

            <div>
              <SectionTitle>Active Filters</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {activeChips.length === 0 && (
                  <span className="text-sm text-slate-500">None</span>
                )}
                {activeChips.map((chip) => (
                  <div
                    key={chip.label}
                    className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                  >
                    <span>{chip.label}</span>
                    <button
                      type="button"
                      onClick={chip.remove}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-1 transition-colors"
                      title="Remove filter"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {activeChips.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPoNumber('');
                    setInvoiceNumber('');
                    setAdvanced([]);
                  }}
                  className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm hover:bg-gray-50"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                disabled={!canView || loading}
                onClick={loadAll}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
                Preview
              </button>
              <button
                type="button"
                disabled={(!canView && !hasViewed) || loading || isGeneratingReport}
                onClick={handleGenerateReport}
                className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#1e5a8a]"
              >
                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
              </button>
            </div>
          </div>
        </section>

        {!hasViewed && !loading && (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-8 py-16 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-800">No report yet</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              Select a report type, set filters, then click Preview or Generate Report.
            </p>
          </section>
        )}

        {loading && !hasViewed && (
          <section className="rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center">
            <Loader2 className="w-8 h-8 text-slate-400 mx-auto mb-3 animate-spin" />
            <p className="text-sm text-slate-500">Loading report…</p>
          </section>
        )}

        {hasViewed && (
          <>
            <div className="flex flex-wrap gap-1 border-b border-slate-200">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition ${
                    activeTab === tab.id
                      ? 'border-amber-400 text-slate-900'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
        <div className="space-y-4">
          {loading && !summary ? (
            <div className="text-center py-16 text-slate-500">Loading…</div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                <StatCard
                  icon={Package}
                  label="On-hand units"
                  value={fmtNum(summary?.on_hand_units)}
                  hint="Unused stock units"
                  onClick={() => navigate('/master-data/spare-parts')}
                />
                <StatCard
                  icon={Wrench}
                  label="Issued (30 days)"
                  value={fmtNum(summary?.issued_last_30_days)}
                  hint={`${fmtNum(summary?.issue_txn_last_30_days)} transactions`}
                  onClick={() => setActiveTab('consumption')}
                />
                <StatCard
                  icon={ClipboardList}
                  label="Pending approvals"
                  value={fmtNum(summary?.pending_approvals)}
                  hint="RQ / IS status"
                  onClick={() => navigate('/spare-part-approval')}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Non-moving / dead"
                  value={fmtNum(slowData.summary?.nonMoving)}
                  hint={`${fmtNum(slowData.summary?.deadStock)} dead stock · ${thresholdDays}d`}
                  onClick={() => setActiveTab('slow')}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-800">FSN snapshot</h3>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex justify-between">
                      <span>Fast</span>
                      <span className="font-medium text-emerald-700">
                        {fmtNum(slowData.summary?.fast)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Slow</span>
                      <span className="font-medium text-amber-700">
                        {fmtNum(slowData.summary?.slow)}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span>Non-moving</span>
                      <span className="font-medium text-rose-700">
                        {fmtNum(slowData.summary?.nonMoving)}
                      </span>
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Consumption period</h3>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {fmtNum(consumption.summary?.qty)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {fmtNum(consumption.summary?.txn)} issue lines
                    {dateFrom || dateTo
                      ? ` · ${dateFrom || '…'} → ${dateTo || '…'}`
                      : ' · all dates'}
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm text-sky-700 hover:underline"
                    onClick={() => setActiveTab('consumption')}
                  >
                    View consumption →
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Equipment usage</h3>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {fmtNum(equipment.summary?.assets)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    assets · {fmtNum(equipment.summary?.lines)} part lines · qty{' '}
                    {fmtNum(equipment.summary?.qty)}
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm text-sky-700 hover:underline"
                    onClick={() => setActiveTab('equipment')}
                  >
                    View equipment-wise →
                  </button>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    <Clock size={14} /> Hold duration (people)
                  </h3>
                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {fmtNum(holdData.summary?.avg_hold_hours)}
                    <span className="text-sm font-normal text-slate-500"> hrs avg</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {fmtNum(holdData.summary?.fastUse)} fast use ·{' '}
                    {fmtNum(holdData.summary?.longHold)} long hold ·{' '}
                    {fmtNum(holdData.summary?.inHand)} still in hand
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm text-sky-700 hover:underline"
                    onClick={() => setActiveTab('hold')}
                  >
                    Compare A vs B holders →
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/spare-part-list')}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Spare Part List
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/spare-part-issue')}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Spare Part Issue
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/master-data/spare-part')}
                  className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
                >
                  Spare Part Master
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab !== 'overview' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative min-h-[200px]">
          {loading && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
              aria-busy="true"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#143d65]" />
                <span className="text-sm text-slate-600">Loading…</span>
              </div>
            </div>
          )}
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-600">
              Preview • {scopedRows.length} rows
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeTab === 'slow' && (
                <select
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm bg-white"
                  value={fsnFilter}
                  onChange={(e) => setFsnFilter(e.target.value)}
                  title="FSN filter"
                >
                  <option value="all">All FSN</option>
                  <option value="Fast">Fast</option>
                  <option value="Slow">Slow</option>
                  <option value="Non-moving">Non-moving</option>
                </select>
              )}
              <div className="w-44">
                <SearchableSelect
                  onChange={(c) => {
                    if (!c || cols.includes(c)) return;
                    setCols([...cols, c]);
                  }}
                  options={addableColumns}
                  placeholder="Add column…"
                />
              </div>
              <div className="w-44">
                <SearchableSelect
                  onChange={(c) => {
                    if (!c) return;
                    setCols(cols.filter((col) => col !== c));
                  }}
                  options={removableColumns}
                  placeholder="Remove column…"
                />
              </div>
              <button
                type="button"
                onClick={() => setCols(activeColumns.map((c) => c.name))}
                className="text-sm px-3 py-1 rounded-lg bg-white border border-slate-300"
              >
                Reset
              </button>
              <button
                type="button"
                disabled={isGeneratingReport || scopedRows.length === 0}
                onClick={handleGenerateReport}
                className="text-sm px-3 py-1.5 rounded-lg bg-[#143d65] text-white disabled:opacity-50 hover:bg-[#1e5a8a]"
              >
                {isGeneratingReport ? 'Generating…' : 'Download PDF'}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
            <table className="min-w-full text-sm" style={{ minWidth: '800px' }}>
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {previewColumns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap"
                    >
                      <span className="inline-flex items-center gap-2">
                        {col.label}
                        <button
                          type="button"
                          title="Remove column"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCols((prev) => prev.filter((c) => c !== col.name));
                          }}
                          className="text-slate-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scopedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={Math.max(previewColumns.length, 1)}
                      className="text-center py-16 text-slate-500"
                    >
                      No data found
                    </td>
                  </tr>
                ) : (
                  scopedRows.map((row, idx) => (
                    <tr
                      key={row[rowKey] != null ? `${row[rowKey]}-${idx}` : idx}
                      className="odd:bg-white even:bg-slate-50 cursor-pointer hover:bg-slate-100"
                      onClick={() => openPartDetail(row)}
                    >
                      {previewColumns.map((col) => (
                        <td
                          key={col.name}
                          className="px-3 py-2 border-b border-slate-100 whitespace-nowrap"
                        >
                          {renderCellValue(col, row)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <PartDetailModal
        open={Boolean(selectedPartCode)}
        onClose={() => setSelectedPartCode(null)}
        part={selectedPart}
        holdRows={detailHoldRows}
        consumptionRows={detailConsumptionRows}
        equipmentRows={detailEquipmentRows}
      />
          </>
        )}
      </div>
    </div>
  );
}
