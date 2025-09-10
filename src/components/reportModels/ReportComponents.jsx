import React, { useState, useEffect, useRef, useMemo } from "react";

// Common UI Components
export const SectionTitle = ({ children }) => (
  <div className="text-sm font-semibold text-slate-600 uppercase tracking-wider mb-2">
    {children}
  </div>
);

export const Chip = ({ label, onRemove }) => (
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

export function Input({ value, onChange, placeholder, type = "text", min, className = "", onKeyDown = () => {} }) {
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

export function Select({ value, onChange, options, placeholder = "Select" }) {
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

// Error boundary wrapper for DropdownMultiSelect - Updated to fix React errors
function SafeDropdownMultiSelect({ values = [], onChange, options, placeholder = "Select..." }) {
  try {
    return <DropdownMultiSelectInner values={values} onChange={onChange} options={options} placeholder={placeholder} />;
  } catch (error) {
    console.error('🔍 [SafeDropdownMultiSelect] Error in DropdownMultiSelect:', error);
    return (
      <div className="w-full rounded-xl border border-red-300 px-3 py-2 text-sm text-red-600 bg-red-50">
        Error loading dropdown: {error.message}
      </div>
    );
  }
}

function DropdownMultiSelectInner({ values = [], onChange, options, placeholder = "Select..." }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Ensure options is always an array and safe
  const safeOptions = useMemo(() => {
    try {
      if (!Array.isArray(options)) return [];
      return options.filter(opt => opt !== null && opt !== undefined);
    } catch (error) {
      console.error('🔍 [DropdownMultiSelect] Error processing options:', error);
      return [];
    }
  }, [options]);

  // Debug logging
  console.log('🔍 [DropdownMultiSelect] Options received:', options);
  console.log('🔍 [DropdownMultiSelect] Safe options length:', safeOptions.length);
  if (safeOptions.length > 0) {
    console.log('🔍 [DropdownMultiSelect] First option:', safeOptions[0]);
    console.log('🔍 [DropdownMultiSelect] First option type:', typeof safeOptions[0]);
  }

  // Ultra-safe filter function
  const filteredOptions = useMemo(() => {
    try {
      if (!Array.isArray(safeOptions) || safeOptions.length === 0) return [];
      
      const searchText = String(searchTerm || '').toLowerCase();
      
      return safeOptions.filter((opt) => {
        try {
          // Handle null/undefined
          if (opt === null || opt === undefined) {
            return false;
          }
          
          // Handle objects with value and label
          if (typeof opt === 'object' && opt !== null) {
            if (opt.value !== undefined && opt.label !== undefined) {
              const valueStr = String(opt.value || '');
              const labelStr = String(opt.label || '');
              return valueStr.toLowerCase().includes(searchText) || labelStr.toLowerCase().includes(searchText);
            }
            // Handle other object types
            const objStr = String(opt);
            return objStr.toLowerCase().includes(searchText);
          }
          
          // Handle strings
          if (typeof opt === 'string') {
            return opt.toLowerCase().includes(searchText);
          }
          
          // Handle numbers and other types
          const optStr = String(opt);
          return optStr.toLowerCase().includes(searchText);
        } catch (error) {
          console.error('🔍 [DropdownMultiSelect] Error filtering option:', opt, error);
          return false;
        }
      });
    } catch (error) {
      console.error('🔍 [DropdownMultiSelect] Error in filteredOptions:', error);
      return [];
    }
  }, [safeOptions, searchTerm]);

  const toggle = (opt) => {
    const set = new Set(values);
    // For object options, compare by value; for string options, compare directly
    const optValue = typeof opt === 'object' ? opt.value : opt;
    const existingValue = values.find(v => (typeof v === 'object' ? v.value : v) === optValue);
    
    if (existingValue) {
      onChange(values.filter(v => (typeof v === 'object' ? v.value : v) !== optValue));
    } else {
      onChange([...values, opt]);
    }
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
        <span className="truncate pr-2">
          {values.length > 0 ? values.map(v => typeof v === 'object' ? v.label : String(v || '')).join(", ") : placeholder}
        </span>
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
              filteredOptions.map((opt, index) => {
                const optValue = typeof opt === 'object' ? opt.value : opt;
                const optLabel = typeof opt === 'object' ? opt.label : opt;
                const isChecked = values.some(v => (typeof v === 'object' ? v.value : v) === optValue);
                
                return (
                  <label key={optValue || index} className="flex items-center gap-2 text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(opt)} className="cursor-pointer" />
                    <span className="truncate" title={String(optLabel || '')}>
                      {String(optLabel || '')}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export the safe wrapper
export { SafeDropdownMultiSelect as DropdownMultiSelect };

export function DateRange({ value, onChange, preset }) {
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
        <div className="grid grid-cols-3 gap-2 items-center">
          <input
            type="date"
            value={from}
            onChange={(e) => onChange([e.target.value, to])}
            className="rounded-xl border border-slate-300 px-2 py-1 text-sm"
          />
          <span className="text-slate-400 text-center">→</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onChange([from, e.target.value])}
            className="rounded-xl border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}

export function GroupedField({ field, value, onChange, onSubFieldChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
    setIsExpanded(option === "Yes");
    
    // Only set the value if "Yes" is selected, otherwise clear it
    if (option === "Yes") {
      // Keep existing sub-field values if any
      onChange(value || {});
    } else {
      // Clear all values when "No" or placeholder is selected
      onChange(null);
    }
  };

  const handleSubFieldChange = (subFieldKey, subValue) => {
    onSubFieldChange(subFieldKey, subValue);
  };

  // Determine what to display in the dropdown
  const getDisplayValue = () => {
    if (selectedOption === "Yes") return "Yes";
    if (selectedOption === "No") return "No";
    return ""; // Show placeholder when nothing is selected
  };

  return (
    <div className="space-y-3">
      {/* Main dropdown */}
      <Select
        value={getDisplayValue()}
        onChange={handleOptionSelect}
        options={["Yes", "No"]}
        placeholder={"Select " + field.label}
      />
      
      {/* Sub-fields that appear when option is selected */}
      {isExpanded && selectedOption === "Yes" && (
        <div className="ml-4 space-y-3 border-l-2 border-slate-200 pl-4">
          {field.subFields.map((subField) => (
            <div key={subField.key} className="space-y-2">
              <label className="text-sm font-medium text-slate-700">
                {subField.label}
              </label>
              {subField.type === "daterange" && (
                <DateRange 
                  value={value?.[subField.key] || ["", ""]} 
                  onChange={(val) => handleSubFieldChange(subField.key, val)} 
                />
              )}
              {subField.type === "multiselect" && (
                <SafeDropdownMultiSelect
                  values={value?.[subField.key] || []}
                  onChange={(val) => handleSubFieldChange(subField.key, val)}
                  options={subField.domain || []}
                  placeholder={`Select ${subField.label}`}
                />
              )}
              {subField.type === "number" && (
                <Input
                  type="number"
                  value={value?.[subField.key] || ""}
                  onChange={(val) => handleSubFieldChange(subField.key, val)}
                  placeholder={`Enter ${subField.label}`}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SearchableSelect({ onChange, options, placeholder = "Select...", value }) {
  // Force rebuild - React error fix applied
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  // Debug logging
  console.log('🔍 [SearchableSelect] Options received:', options);
  console.log('🔍 [SearchableSelect] Options type:', typeof options);
  console.log('🔍 [SearchableSelect] Options length:', Array.isArray(options) ? options.length : 'not array');
  if (Array.isArray(options) && options.length > 0) {
    console.log('🔍 [SearchableSelect] First option:', options[0]);
    console.log('🔍 [SearchableSelect] First option type:', typeof options[0]);
  }

  const filteredOptions = useMemo(() => {
    return (Array.isArray(options) ? options : []).filter((opt) => {
      const searchText = searchTerm.toLowerCase();
      
      // Handle different option types safely
      if (opt === null || opt === undefined) {
        return false;
      }
      
      if (typeof opt === 'object' && opt.value !== undefined && opt.label !== undefined) {
        // Object with value and label
        const valueStr = String(opt.value || '');
        const labelStr = String(opt.label || '');
        return valueStr.toLowerCase().includes(searchText) || labelStr.toLowerCase().includes(searchText);
      }
      
      if (typeof opt === 'string') {
        return opt.toLowerCase().includes(searchText);
      }
      
      // Fallback for other types
      const optStr = String(opt || '');
      return optStr.toLowerCase().includes(searchText);
    });
  }, [options, searchTerm]);

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
    const selectedValue = typeof option === 'object' && option.value ? option.value : option;
    onChange(selectedValue);
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
        <span className="truncate pr-2">
          {(() => {
            if (value) {
              const option = options.find(opt => 
                (typeof opt === 'object' && opt.value === value) || opt === value
              );
              return typeof option === 'object' && option.label ? option.label : String(value || '');
            }
            return placeholder;
          })()}
        </span>
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
              filteredOptions.map((opt, index) => (
                <div key={typeof opt === 'object' ? opt.value || index : opt || index} onClick={() => handleSelect(opt)} className="text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                  {typeof opt === 'object' && opt.label ? opt.label : String(opt || '')}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export const OP_MAP = {
  text: ["contains", "starts with", "ends with", "=", "!="],
  number: [">=", "<=", "=", "!="],
  select: ["=", "!="],
  multiselect: ["has any", "has all", "has none"],
  boolean: ["is"],
  daterange: ["in range", "before", "after"],
};

export function AdvancedBuilder({ fields, value, onChange }) {
  const rows = value || [];
  const add = () => {
    const defaultField = fields[0];
    if (!defaultField) return;
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
          if (!field) return null;
          const ops = OP_MAP[field.type] || ["="];
          return (
            <div key={i} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-3">
                <Select 
                  value={field.label} 
                  onChange={(v) => {
                    const newField = fields.find(f => f.label === v);
                    if (newField) {
                      update(i, { field: newField.key, op: OP_MAP[newField.type]?.[0] || "=", val: null });
                    }
                  }} 
                  options={fields.map((f) => f.label)} 
                />
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

export function AdvValueInput({ field, cur, onChange }) {
  if (field.type === "number") return <Input type="number" value={cur} onChange={onChange} />;
  if (field.type === "text") return <Input value={cur} onChange={onChange} placeholder="Enter text" />;
  if (field.type === "boolean") return <Select value={cur} onChange={onChange} options={["true", "false"]} />;
  if (field.type === "select") return <Select value={cur} onChange={onChange} options={field.domain || []} />;
  if (field.type === "multiselect") return <SafeDropdownMultiSelect values={cur || []} onChange={onChange} options={field.domain || []} />;
  if (field.type === "daterange") return <DateRange value={cur || ["", ""]} onChange={onChange} />;
  return <Input value={cur} onChange={onChange} />;
}

export const DropdownMenu = ({ label, options }) => {
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

// Utility functions
export function formatISO(d) {
  return d.toISOString().slice(0, 10);
}

export function getCurrentFYBounds(base = new Date()) {
  const fyStartYear = base.getMonth() >= 3 ? base.getFullYear() : base.getFullYear() - 1;
  const start = new Date(fyStartYear, 3, 1);
  const end = new Date(fyStartYear + 1, 2, 31);
  return [start, end];
}

export function fyOptions() {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return [`${year}-${String(year + 1).slice(-2)}`, `${year - 1}-${String(year).slice(-2)}`, `${year - 2}-${String(year - 1).slice(-2)}`];
}

export function dateOffset(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// Dummy function for toast notification
export function showToast(message) {
  console.log("Toast:", message);
  alert("Toast: " + message);
}
