import React, { useMemo, useState, useEffect, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaShareAlt } from "react-icons/fa";

const ASSET_CATEGORIES = [
  "Plant & Machinery",
  "IT Equipment",
  "Furniture",
  "Vehicles",
  "Tools",
  "Buildings",
];
const LOCATIONS = [
  { id: "COI-HO", name: "Coimbatore • HO" },
  { id: "BLR-WH1", name: "Bengaluru • WH-1" },
  { id: "CHN-PL1", name: "Chennai • Plant-1" },
];
const DEPARTMENTS = ["Production", "Finance", "IT", "Maintenance", "Admin"];
const VENDORS = ["Acme Engg", "Prism Tech", "SparesKart", "GearWorks"];
const USERS = ["Arun Kumar", "Divya T", "Shweta", "Rahul", "Sanjay"];

// ----- Report Catalog & Filter Field Schema -----
// field.type: select | multiselect | daterange | number | text | boolean | enum | entity
// field.operators (optional) to override defaults; field.domain for select options
const REPORTS = [
  {
    id: "asset-register",
    name: "Asset Register",
    description: "Master list with status, location, financials.",
    quickFields: [
      { key: "capitalizedDateRange", label: "Capitalized", type: "daterange", preset: "FY" },
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "status", label: "Status", type: "multiselect", domain: ["Active", "In Use", "Under Maintenance", "Disposed"] },
    ],
    fields: [
      { key: "assetCode", label: "Asset Code", type: "text" },
      { key: "department", label: "Department", type: "multiselect", domain: DEPARTMENTS },
      { key: "usefulLifeMonthsLeft", label: "Useful Life ≤ (months)", type: "number" },
      { key: "book", label: "Book", type: "select", domain: ["Company", "Tax", "IFRS"] },
      { key: "capexOpex", label: "Capex/Opex", type: "select", domain: ["Capex", "Opex"] },
      { key: "costGreaterThan", label: "Cost ≥ (₹)", type: "number" },
    ],
    defaultColumns: ["Asset Code", "Name", "Category", "Location", "Department", "Capitalized On", "Cost", "Status"],
  },
  {
    id: "depreciation-schedule",
    name: "Depreciation Schedule",
    description: "Period depreciation by book/method with totals.",
    quickFields: [
      { key: "period", label: "Period", type: "select", domain: ["Month", "Quarter", "FY"] },
      { key: "fiscalYear", label: "Fiscal Year", type: "select", domain: fyOptions() },
      { key: "book", label: "Book", type: "select", domain: ["Company", "Tax", "IFRS"] },
      { key: "method", label: "Method", type: "select", domain: ["SLM", "WDV"] },
    ],
    fields: [
      { key: "category", label: "Category", type: "multiselect", domain: ASSET_CATEGORIES },
      { key: "location", label: "Location", type: "multiselect", domain: LOCATIONS.map((l) => l.name) },
      { key: "includeDisposed", label: "Include Disposed", type: "boolean" },
    ],
    defaultColumns: ["Asset Code", "Name", "Book", "Method", "Depn for Period", "Accum Depn", "Net Book Value"],
  },
  {
    id: "maintenance-history",
    name: "Maintenance History",
    description: "All work orders and service jobs with costs/downtime.",
    quickFields: [
      { key: "dateRange", label: "Date", type: "daterange", preset: "LAST_90" },
      { key: "maintType", label: "Type", type: "multiselect", domain: ["Preventive", "Breakdown", "Calibration"] },
      { key: "woStatus", label: "WO Status", type: "multiselect", domain: ["Open", "In Progress", "Completed", "Cancelled"] },
    ],
    fields: [
      { key: "priority", label: "Priority", type: "select", domain: ["Low", "Medium", "High", "Critical"] },
      { key: "technician", label: "Technician", type: "multiselect", domain: USERS },
      { key: "vendor", label: "Vendor", type: "multiselect", domain: VENDORS },
      { key: "downtimeHoursGt", label: "Downtime ≥ (hrs)", type: "number" },
      { key: "costGt", label: "Cost ≥ (₹)", type: "number" },
    ],
    defaultColumns: ["WO #", "Asset", "Type", "Status", "Opened On", "Closed On", "Downtime (h)", "Cost (₹)"],
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
  },
];

const ALL_COLUMNS = {
  "asset-register": ["Asset Code", "Name", "Category", "Location", "Department", "Capitalized On", "Cost", "Status"],
  "depreciation-schedule": ["Asset Code", "Name", "Book", "Method", "Depn for Period", "Accum Depn", "Net Book Value"],
  "maintenance-history": ["WO #", "Asset", "Type", "Status", "Opened On", "Closed On", "Downtime (h)", "Cost (₹)"],
  "warranty-amc-expiry": ["Asset", "Category", "Vendor", "Coverage", "Start", "End", "Days Left"],
  "spares-inventory": ["Part Code", "Description", "UoM", "On Hand", "Safety", "Reorder", "Non‑Moving (days)", "Preferred Vendor"],
  "vendor-performance": ["Vendor", "Jobs", "On‑time %", "Avg TAT (hrs)", "FTF %", "Defect %"],
};

function fyOptions() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${year}-${String(year + 1).slice(-2)}`, `${year - 1}-${String(year).slice(-2)}`, `${year - 2}-${String(year - 1).slice(-2)}`];
}

function formatISO(d) {
  return d.toISOString().slice(0, 10);
}

function getCurrentFYBounds(base = new Date()) {
  const fyStartYear = base.getMonth() >= 3 ? base.getFullYear() : base.getFullYear() - 1;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyStartYear + 1, 2, 31);
  return [start, end];
}

// Dummy function for toast notification
function showToast(message) {
  console.log("Toast:", message);
  alert("Toast: " + message);
}

const SectionTitle = ({ children }) => <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">{children}</div>;

const Chip = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 text-sm px-2 py-1 bg-slate-100 border border-slate-200 rounded-full mr-2 mb-2">
    <span className="truncate max-w-[180px]" title={label}>
      {label}
    </span>
    {onRemove && (
      <button onClick={onRemove} className="text-slate-500 hover:text-slate-700">
        ×
      </button>
    )}
  </span>
);

function Input({ value, onChange, placeholder, type = "text", min, className = "", onKeyDown = () => {} }) {
  return (
    <input
      type={type}
      min={min}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 ${className}`}
      onKeyDown={onKeyDown}
    />
  );
}

function Select({ value, onChange, options, placeholder = "Select" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center justify-between"
      >
        <span className="truncate pr-2">{value || placeholder}</span>
        <span className="text-slate-500">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {options.map((opt) => (
              <div
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className="text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DropdownMultiSelect({ values = [], onChange, options, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const filteredOptions = useMemo(
    () => options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase())),
    [options, searchTerm]
  );

  const toggle = (opt) => {
    const set = new Set(values);
    set.has(opt) ? set.delete(opt) : set.add(opt);
    onChange([...set]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center justify-between"
      >
        <span className="truncate pr-2">{values.length > 0 ? values.join(", ") : placeholder}</span>
        <span className="text-slate-500">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search..."
              className="w-full text-sm rounded-md border border-slate-300 px-2 py-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">No matches found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                  <input type="checkbox" checked={values?.includes(opt)} onChange={() => toggle(opt)} className="cursor-pointer" />
                  <span className="truncate" title={opt}>
                    {opt}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateRange({ value, onChange, preset }) {
  const [mode, setMode] = useState("custom");
  const [from, to] = value || ["", ""];
  const now = new Date();
  const [cfyStart, cfyEnd] = useMemo(() => getCurrentFYBounds(now), []);

  useEffect(() => {
    if (value && value[0]) return;
    if (preset === "FY") {
      setMode("current_fy");
      onChange([formatISO(cfyStart), formatISO(cfyEnd)]);
    } else if (preset === "LAST_90") {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      onChange([formatISO(start), formatISO(now)]);
      setMode("custom");
    } else if (preset === "LAST_180") {
      const start = new Date(now);
      start.setDate(now.getDate() - 180);
      onChange([formatISO(start), formatISO(now)]);
      setMode("custom");
    }
  }, [preset]);

  const handleMode = (m) => {
    setMode(m);
    if (m === "current_fy") onChange([formatISO(cfyStart), formatISO(cfyEnd)]);
    else if (m === "last_fy") {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      onChange([formatISO(start), formatISO(end)]);
    } else onChange(["", ""]);
  };

  return (
    <div className="space-y-2">
      <Select
        value={mode}
        onChange={handleMode}
        options={["current_fy", "last_fy", "custom"]}
        placeholder="Select Date Range"
      />
      {mode === "custom" && (
        <div className="flex gap-2 items-center">
          <input
            type="date"
            value={from}
            onChange={(e) => onChange([e.target.value, to])}
            className="rounded-xl border border-slate-300 px-2 py-1 text-sm w-1/2"
          />
          <span className="text-slate-400">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onChange([from, e.target.value])}
            className="rounded-xl border border-slate-300 px-2 py-1 text-sm w-1/2"
          />
        </div>
      )}
    </div>
  );
}

function SearchableSelect({ onChange, options, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  const filteredOptions = useMemo(() => options.filter((opt) => opt.toLowerCase().includes(searchTerm.toLowerCase())), [options, searchTerm]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  
  const handleSelect = (option) => {
    onChange(option);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-left bg-white focus:outline-none focus:ring-2 focus:ring-slate-400 flex items-center justify-between"
      >
        <span className="truncate pr-2">{placeholder}</span>
        <span className="text-slate-500">▼</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder="Search..."
              className="w-full text-sm rounded-md border border-slate-300 px-2 py-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">No matches found.</div>
            ) : (
              filteredOptions.map((opt) => (
                <div key={opt} onClick={() => handleSelect(opt)} className="text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const OP_MAP = {
  text: ["contains", "starts with", "ends with", "=", "!="],
  number: [">=", "<=", "=", "!="],
  select: ["=", "!="],
  multiselect: ["has any", "has all", "has none"],
  boolean: ["is"],
  daterange: ["in range", "before", "after"],
};

function AdvancedBuilder({ fields, value, onChange }) {
  const rows = value || [];
  const add = () => {
    const defaultField = fields[0];
    if (!defaultField) return; // Prevent crash if no fields exist
    onChange([...(rows || []), { field: defaultField.key, op: OP_MAP[defaultField.type]?.[0] || "=", val: null }]);
  };
  const update = (i, patch) => {
    const copy = rows.slice();
    copy[i] = { ...copy[i], ...patch };
    onChange(copy);
  };
  const remove = (i) => onChange(rows.filter((_, idx) => idx !== i));

  const fieldByKey = (k) => fields.find((f) => f.key === k);

  return (
    <div className="border border-slate-200 rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <SectionTitle>Advanced Conditions</SectionTitle>
        <button onClick={add} className="text-sm px-3 py-1 rounded-lg bg-[#143d65] text-white">
          + Add
        </button>
      </div>
      {rows?.length === 0 && <div className="text-sm text-slate-500">No advanced conditions yet.</div>}
      <div className="space-y-3">
        {rows?.map((r, i) => {
          const field = fieldByKey(r.field);
          if (!field) return null; // Prevent crash if field is undefined
          const ops = OP_MAP[field.type] || ["="];
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Select value={field.label} onChange={(v) => {
                  const newField = fieldByKey(v);
                  if (newField) {
                    update(i, { field: newField.key, op: OP_MAP[newField.type]?.[0] || "=", val: null });
                  }
                }} options={fields.map((f) => f.label)} />
              </div>
              <div className="col-span-3">
                <Select value={r.op} onChange={(v) => update(i, { op: v })} options={ops} />
              </div>
              <div className="col-span-5">
                <AdvValueInput field={field} cur={r.val} onChange={(v) => update(i, { val: v })} />
              </div>
              <div className="col-span-1 text-right">
                <button onClick={() => remove(i)} className="text-slate-500 hover:text-red-600">
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AdvValueInput({ field, cur, onChange }) {
  if (field.type === "number") return <Input type="number" value={cur} onChange={onChange} />;
  if (field.type === "text") return <Input value={cur} onChange={onChange} placeholder="Enter text" />;
  if (field.type === "boolean") return <Select value={cur} onChange={onChange} options={["true", "false"]} />;
  if (field.type === "select") return <Select value={cur} onChange={onChange} options={field.domain || []} />;
  if (field.type === "multiselect") return <DropdownMultiSelect values={cur || []} onChange={onChange} options={field.domain || []} />;
  if (field.type === "daterange") return <DateRange value={cur || ["", ""]} onChange={onChange} />;
  return <Input value={cur} onChange={onChange} />;
}

// --- FILTERING LOGIC ---
const FIELD_TO_COLUMN_MAP = {
  "asset-register": {
    capitalizedDateRange: "Capitalized On",
    category: "Category",
    location: "Location",
    status: "Status",
    assetCode: "Asset Code",
    department: "Department",
    costGreaterThan: "Cost"
  },
  "maintenance-history": {
    dateRange: "Opened On",
    maintType: "Type",
    woStatus: "Status",
    priority: "Priority",
    technician: "Technician",
    vendor: "Vendor",
    downtimeHoursGt: "Downtime (h)",
    costGt: "Cost (₹)"
  },
};

function filterRows(allRows, reportId, quickFilters, advancedFilters) {
  const reportDef = REPORTS.find(r => r.id === reportId);
  if (!reportDef) return allRows;

  return allRows.filter(row => {
    // Apply quick filters
    for (const key in quickFilters) {
      const val = quickFilters[key];
      if (!val || (Array.isArray(val) && val.length === 0)) continue;
      const field = reportDef.quickFields.find(f => f.key === key);
      if (!field) continue; // Check if field exists
      const colName = FIELD_TO_COLUMN_MAP[reportId]?.[key] || key;
      
      if (field.type === 'daterange') {
        const rowDate = new Date(row[colName]);
        const start = new Date(val[0]);
        const end = new Date(val[1]);
        if (rowDate < start || rowDate > end) return false;
      } else if (field.type === 'multiselect') {
        if (!val.includes(row[colName])) return false;
      } else if (field.type === 'number') {
        if (val > row[colName]) return false;
      } else if (field.type === 'text') {
        if (!row[colName].toLowerCase().includes(val.toLowerCase())) return false;
      } else if (field.type === 'select') {
        if (row[colName] !== val) return false;
      }
    }

    // Apply advanced filters
    for (const filter of advancedFilters) {
      if (!filter.field || !filter.op || filter.val === null) continue;
      const field = reportDef.fields.find(f => f.key === filter.field);
      if (!field) continue; // Check if field exists
      const colName = FIELD_TO_COLUMN_MAP[reportId]?.[filter.field];
      if (!colName) continue;

      const rowValue = row[colName];
      const filterValue = filter.val;

      // Handle operators for different field types
      if (field.type === "text") {
        const rowText = String(rowValue).toLowerCase();
        const filterText = String(filterValue).toLowerCase();
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
        if (filter.op === "has any" && !filterValue.some(v => rowValue.includes(v))) return false;
        if (filter.op === "has all" && !filterValue.every(v => rowValue.includes(v))) return false;
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

// --- COMPONENT START ---
export default function AssetReport() {
  const selectedReportId = "depreciation-schedule";
  const report = useMemo(() => REPORTS.find((r) => r.id === selectedReportId), []);

  const [quick, setQuick] = useState({});
  const setQuickField = (k, v) => setQuick((prev) => ({ ...prev, [k]: v }));

  const [advanced, setAdvanced] = useState([]);

  const [columns, setColumns] = useState(null);
  const cols = columns || report.defaultColumns;

  const [views, setViews] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");
  const saveInputRef = useRef(null);

  const allRows = useMemo(() => fakeRows(selectedReportId, 30), [selectedReportId]);
  const filteredRows = useMemo(() => filterRows(allRows, selectedReportId, quick, advanced), [allRows, selectedReportId, quick, advanced]);

  const hasFilters = useMemo(() => {
    const quickHasFilters = Object.values(quick).some((v) => (Array.isArray(v) ? v.length > 0 : !!v));
    const advancedHasFilters = advanced.length > 0;
    return quickHasFilters || advancedHasFilters;
  }, [quick, advanced]);

  const filteredViews = useMemo(() => {
    return (views || []).filter((v) => v.reportId === selectedReportId);
  }, [views, selectedReportId]);

  const activeChips = useMemo(() => {
    const chips = [];
    report.quickFields.forEach((f) => {
      const v = quick[f.key];
      if (!v || (Array.isArray(v) && v.length === 0)) return;
      if (f.type === "daterange") chips.push(`${f.label}: ${v?.[0]} → ${v?.[1]}`);
      else if (Array.isArray(v)) chips.push(`${f.label}: ${v.join(", ")}`);
      else chips.push(`${f.label}: ${v}`);
    });
    (advanced || []).forEach((r, idx) => {
      if (!r.field) return;
      const field = report.fields.find(f => f.key === r.field);
      const label = field ? field.label : r.field;
      const val = Array.isArray(r.val) ? r.val.join(", ") || "–" : r.val ?? "–";
      chips.push(`${label} ${r.op} ${val}`);
    });
    return chips;
  }, [quick, advanced, report]);

  const clearAll = () => {
    const defaultQuick = {};
    report.quickFields.forEach(f => {
      if (f.preset) {
        if (f.preset === 'FY') {
          const [s, e] = getCurrentFYBounds();
          defaultQuick[f.key] = [formatISO(s), formatISO(e)];
        } else if (f.preset === 'LAST_90') {
          const s = new Date();
          s.setDate(s.getDate() - 90);
          defaultQuick[f.key] = [formatISO(s), formatISO(new Date())];
        } else if (f.preset === 'LAST_180') {
          const s = new Date();
          s.setDate(s.getDate() - 180);
          defaultQuick[f.key] = [formatISO(s), formatISO(new Date())];
        }
      }
    });
    setQuick(defaultQuick);
    setAdvanced([]);
  };

  const saveView = () => {
    if (!viewName.trim()) return;
    setViews([...views, { id: crypto.randomUUID(), name: viewName, reportId: report.id, quick, advanced, columns: cols }]);
    setIsSaving(false);
    setViewName("");
  };

  useEffect(() => {
    if (isSaving) {
      const handleClickOutside = (event) => {
        if (saveInputRef.current && !saveInputRef.current.contains(event.target)) {
          setIsSaving(false);
          setViewName("");
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSaving]);

  const applyView = (v) => {
    if (!v) return;
    setQuick(v.quick || {});
    setAdvanced(v.advanced || []);
    setColumns(v.columns || null);
  };

  // Saved views dropdown + share modal state
  const [isSavedOpen, setIsSavedOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTargetView, setShareTargetView] = useState(null);
  const [shareUser, setShareUser] = useState("");
  const savedRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (savedRef.current && !savedRef.current.contains(e.target)) setIsSavedOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const exportCSV = () => {
    const csv = [cols.join(",")].concat(filteredRows.map((r) => cols.map((c) => JSON.stringify(r[c] ?? "")).join(","))).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${report.name.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "pt", "a4");
    doc.setFontSize(16);
    doc.text(`${report.name} Report`, 40, 40);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 40, 60);
    const tableColumn = cols;
    const tableRows = filteredRows.map((r) => cols.map((c) => r[c] ?? ""));
    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 80,
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [41, 128, 185] },
    });
    doc.save(`${report.name.replace(/\s+/g, "_")}.pdf`);
  };

  const exportOptions = [{ label: "Export as CSV", action: exportCSV }, { label: "Export as PDF", action: exportPDF }];

  const availableColumns = useMemo(() => {
    return Object.values(ALL_COLUMNS).flat().filter(c => !cols.includes(c));
  }, [cols]);

  return (
    <div className="min-h-screen bg-slate-50 p-5">
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
            <p className="text-slate-500 text-sm">Build, filter, preview, export & schedule your ALM reports.</p>
          </div>
          <div className="flex items-center gap-2"> 
            {filteredViews.length > 0 && (
              <div className="relative" ref={savedRef}>
                <button onClick={() => setIsSavedOpen(!isSavedOpen)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                  Saved views
                </button>
                {isSavedOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-300 rounded-xl shadow-lg z-20">
                    <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                      {filteredViews.map((v) => (
                        <div key={v.id} className="flex items-center justify-between gap-2 border border-slate-200 rounded-lg px-2 py-1">
                          <span className="text-sm truncate" title={v.name}>{v.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => { applyView(v); setIsSavedOpen(false); }} className="px-2 py-1 text-xs rounded-md bg-[#143d65] text-white">Load</button>
                            <button onClick={() => { setShareTargetView(v); setIsShareOpen(true); }} title="Share" className="px-2 py-1 text-xs rounded-md border border-slate-300"><FaShareAlt /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {isSaving ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveView();
                }}
                ref={saveInputRef}
              >
                <Input
                  value={viewName}
                  onChange={setViewName}
                  placeholder="View name"
                  className="w-40"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm"
                  disabled={!viewName.trim()}
                >
                  Save
                </button>
              </form>
            ) : (
              <button
                onClick={() => setIsSaving(true)}
                className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!hasFilters}
              >
                Save View
              </button>
            )}
            {hasFilters && (
              <button onClick={clearAll} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                Clear
              </button>
            )}
            <DropdownMenu label="Export" options={exportOptions} />
          </div>
        </div>
        {/* Layout */}
        <div className="grid grid-cols-12 gap-5">
          {/* Right: Filters + Preview (full width) */}
          <main className={`col-span-12 flex flex-col`}>
            {/* Quick Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">{report.name}</div>
                  <div className="text-sm text-slate-500">{report.description}</div>
                </div>
                <div>
                  <button onClick={() => showToast("In-app, a schedule with current filters would be configured.")} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm whitespace-nowrap">
                    Schedule…
                  </button>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-12 gap-4">
                {report.quickFields.map((f) => (
                  <div key={f.key} className="col-span-12 md:col-span-6 xl:col-span-3">
                    <div className="text-xs font-medium text-slate-600 mb-1">{f.label}</div>
                    {f.type === "daterange" && <DateRange value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} preset={f.preset} />}
                    {f.type === "select" && <Select value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} options={f.domain || []} />}
                    {f.type === "multiselect" && <DropdownMultiSelect values={quick[f.key] || []} onChange={(v) => setQuickField(f.key, v)} options={f.domain || []} />}
                    {f.type === "number" && <Input type="number" value={quick[f.key]} onChange={(v) => setQuickField(f.key, v)} placeholder={f.placeholder} />}
                  </div>
                ))}
              </div>

              {/* Advanced */}
              <div className="mt-4">
                <AdvancedBuilder fields={report.fields} value={advanced} onChange={setAdvanced} />
              </div>
              {/* Active Chips */}
              <div className="mt-3">
                <SectionTitle>Active Filters</SectionTitle>
                <div className="flex flex-wrap">
                  {activeChips.length === 0 && <span className="text-sm text-slate-500">None</span>}
                  {activeChips.map((c, idx) => (
                    <Chip key={idx} label={c} />
                  ))}
                </div>
              </div>
              {/* Actions */}
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => {}} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">
                  Preview
                </button>
                <button onClick={() => {}} className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm">
                  Generate Report
                </button>
              </div>
            </div>
            {/* Preview Table */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-3 border-b border-slate-200 flex items-center justify-between">
                <div className="text-sm text-slate-600">Preview • {filteredRows.length} rows</div>
                {/* Column chooser (add/remove) */}
                <div className="flex items-center gap-2">
                  <SearchableSelect
                    onChange={(c) => setColumns([...cols, c])}
                    options={Object.values(ALL_COLUMNS).flat().filter(c => !cols.includes(c))}
                    placeholder="Add column…"
                  />
                  <SearchableSelect
                    onChange={(c) => setColumns(cols.filter((col) => col !== c))}
                    options={cols}
                    placeholder="Remove column…"
                  />
                  <button onClick={() => setColumns(report.defaultColumns)} className="text-sm px-3 py-1 rounded-lg bg-white border border-slate-300">
                    Reset
                  </button>
                </div>
              </div>
              <div className="overflow-auto h-[calc(100%-48px)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      {cols.map((col) => (
                        <th key={col} className="text-left font-medium text-slate-600 px-3 py-2 border-b border-slate-200 whitespace-nowrap">
                          <span className="inline-flex items-center gap-2">
                            {col}
                            <button
                              type="button"
                              title="Remove column"
                              onClick={(e) => {
                                e.stopPropagation();
                                setColumns((prev) => (prev || cols).filter((c) => c !== col));
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
                    {filteredRows.map((r, idx) => (
                      <tr key={idx} className="odd:bg-white even:bg-slate-50">
                        {cols.map((c) => (
                          <td key={c} className="px-3 py-2 border-b border-slate-100 whitespace-nowrap">
                            {String(r[c] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </main>
        </div>
      </div>
      {isShareOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 w-[360px] p-4">
            <div className="text-lg font-semibold mb-2">Share View</div>
            <div className="text-sm text-slate-600 mb-3 truncate">{shareTargetView?.name}</div>
            <div className="mb-3">
              <div className="text-xs font-medium text-slate-600 mb-1">Select user</div>
              <Select value={shareUser} onChange={setShareUser} options={USERS} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsShareOpen(false)} className="px-3 py-2 rounded-xl bg-white border border-slate-300 text-sm">Cancel</button>
              <button onClick={() => { /* integrate share */ setIsShareOpen(false); }} className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm" disabled={!shareUser.trim()}>Share</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DropdownMenu = ({ label, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="px-3 py-2 rounded-xl bg-[#143d65] text-white text-sm flex items-center gap-2">
        <span>{label}</span>
        <span className="text-xs">▼</span>
      </button>
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-slate-300 rounded-xl shadow-lg z-20">
          <ul className="py-1">
            {options.map((option, index) => (
              <li key={index}>
                <button
                  onClick={() => {
                    option.action();
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

function fakeRows(reportId, n = 8) {
  const r = [];
  for (let i = 0; i < n; i++) {
    if (reportId === "asset-register") {
      r.push({
        "Asset Code": `AST-${1000 + i}`,
        Name: ["Lathe", "CNC Mill", "Laptop", "UPS", "Forklift"][i % 5],
        Category: ASSET_CATEGORIES[i % ASSET_CATEGORIES.length],
        Location: LOCATIONS[i % LOCATIONS.length].name,
        Department: DEPARTMENTS[i % DEPARTMENTS.length],
        "Capitalized On": dateOffset(-200 + i * 7),
        Cost: 50000 + i * 2500,
        Status: ["Active", "In Use", "Under Maintenance", "Disposed"][i % 4],
      });
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
      r.push({
        "WO #": `WO-${2200 + i}`,
        Asset: ["Lathe", "CNC Mill", "Laptop", "UPS", "Forklift"][i % 5],
        Type: ["Preventive", "Breakdown", "Calibration"][i % 3],
        Status: ["Open", "In Progress", "Completed"][i % 3],
        "Opened On": dateOffset(-30 - i * 3),
        "Closed On": dateOffset(-28 - i * 3),
        "Downtime (h)": (i % 5) * 2,
        "Cost (₹)": 1200 + i * 200,
      });
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

(function runSelfTests() {
  try {
    const fys = fyOptions();
    console.assert(Array.isArray(fys) && fys.length === 3 && fys.every((s) => /\d{4}-\d{2}/.test(s)), "fyOptions() sanity");
    const base = new Date("2025-08-15T12:00:00");
    const [cs, ce] = getCurrentFYBounds(base);
    console.assert(cs.getMonth() === 3 && cs.getDate() === 1, "Current FY start is Apr 1");
    console.assert(ce.getMonth() === 2 && ce.getDate() === 31, "Current FY end is Mar 31");
    const today = new Date();
    const yIso = dateOffset(-1);
    const y = new Date(yIso);
    console.assert(today - y > 0, "dateOffset(-1) should be before today");
    console.log("%cALM ReportBuilder self-tests passed", "color: #16a34a");
  } catch (err) {
    console.warn("ALM ReportBuilder self-tests failed:", err);
  }
})();