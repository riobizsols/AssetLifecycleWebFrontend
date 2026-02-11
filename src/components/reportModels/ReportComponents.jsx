import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import API from "../../lib/axios";

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

export function Select({ value, onChange, options, placeholder }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const defaultPlaceholder = placeholder || t('reports.filterOptions.select');

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
        <span className="truncate pr-2">{value || defaultPlaceholder}</span>
        <span className="text-slate-500">▼</span>
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-50 w-full mt-1 rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
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
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

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
    // For object options, extract the value; for string options, use directly
    const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
    
    // Check if value already exists (handle both object and primitive values)
    const existingIndex = values.findIndex(v => {
      const vValue = typeof v === 'object' && v !== null ? v.value : v;
      return vValue === optValue;
    });
    
    if (existingIndex >= 0) {
      // Remove the value
      onChange(values.filter((v, idx) => idx !== existingIndex));
    } else {
      // Add only the value, not the entire object
      onChange([...values, optValue]);
    }
    // Don't close dropdown or clear search after selection for multi-select
  };

  // Get display text for the input when closed
  const getDisplayText = () => {
    if (values.length === 0) return placeholder;
    return values.map(v => {
      // If value is an object, use label; otherwise find the label from options
      if (typeof v === 'object' && v !== null && v.label) {
        return v.label;
      }
      // Find the label from options for primitive values
      const option = safeOptions.find(opt => {
        const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
        return optValue === v;
      });
      return option ? (typeof option === 'object' ? option.label : option) : String(v || '');
    }).join(", ");
  };

  // Handle click on the container
  const handleContainerClick = () => {
    if (!isOpen) {
      setIsOpen(true);
      // Focus input after a small delay to ensure it's rendered
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  // Handle input focus
  const handleInputFocus = () => {
    setIsOpen(true);
  };

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm(""); // Clear search when closing
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Auto-focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Hybrid input/button - always visible */}
      <div
        onClick={handleContainerClick}
        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white focus-within:outline-none focus-within:ring-2 focus-within:ring-slate-400 flex items-center justify-between cursor-text"
      >
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className="flex-1 outline-none bg-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={handleInputFocus}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="truncate pr-2 flex-1 text-left">
            {getDisplayText()}
          </span>
        )}
        <span className="text-slate-500 ml-2 flex-shrink-0" onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
          if (!isOpen) {
            setTimeout(() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }, 0);
          }
        }}>
          ▼
        </span>
      </div>
      
      {/* Dropdown options - shown when open */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">{t('reports.filterOptions.noOptionsFound')}</div>
            ) : (
              filteredOptions.map((opt, index) => {
                const optValue = typeof opt === 'object' && opt !== null ? opt.value : opt;
                const optLabel = typeof opt === 'object' && opt !== null ? opt.label : opt;
                const isChecked = values.some(v => {
                  const vValue = typeof v === 'object' && v !== null ? v.value : v;
                  return vValue === optValue;
                });
                
                return (
                  <label 
                    key={optValue || index} 
                    className="flex items-center gap-2 text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input 
                      type="checkbox" 
                      checked={isChecked} 
                      onChange={() => toggle(opt)} 
                      className="cursor-pointer" 
                    />
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

  // Available preset options - can be customized based on preset prop
  const getPresetOptions = () => {
    // If preset is "COMMON", show common date presets including FY options
    if (preset === "COMMON") {
      return ["today", "yesterday", "last_week", "last_month", "current_fy", "last_fy", "custom"];
    }
    // Default options for other presets
    return ["current_fy", "last_fy", "custom"];
  };

  const presetOptions = getPresetOptions();

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
    } else if (preset === "COMMON") {
      // Default to custom mode for COMMON preset
      setMode("custom");
    }
  }, [preset]);

  // Format mode for display
  const formatModeLabel = (m) => {
    const labels = {
      "today": "Today",
      "yesterday": "Yesterday",
      "last_week": "Last Week",
      "last_month": "Last Month",
      "current_fy": "Current FY",
      "last_fy": "Last FY",
      "custom": "Custom"
    };
    return labels[m] || m;
  };

  const handleMode = (m) => {
    setMode(m);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    if (m === "today") {
      const todayStr = formatISO(today);
      onChange([todayStr, todayStr]);
    } else if (m === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      const yesterdayStr = formatISO(yesterday);
      onChange([yesterdayStr, yesterdayStr]);
    } else if (m === "last_week") {
      // Last week: 7 days ago to today
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(lastWeekStart.getDate() - 6); // 7 days including today
      onChange([formatISO(lastWeekStart), formatISO(today)]);
    } else if (m === "last_month") {
      // Last month: 30 days ago to today
      const lastMonthStart = new Date(today);
      lastMonthStart.setDate(lastMonthStart.getDate() - 29); // 30 days including today
      onChange([formatISO(lastMonthStart), formatISO(today)]);
    } else if (m === "current_fy") {
      onChange([formatISO(cfyStart), formatISO(cfyEnd)]);
    } else if (m === "last_fy") {
      const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      const start = new Date(fyStartYear, 3, 1);
      const end = new Date(fyStartYear + 1, 2, 31);
      onChange([formatISO(start), formatISO(end)]);
    } else {
      onChange(["", ""]);
    }
  };

  // Get display value for Select component
  const displayValue = formatModeLabel(mode);

  // Map label back to mode value
  const getModeFromLabel = (label) => {
    const labelToMode = {
      "Today": "today",
      "Yesterday": "yesterday",
      "Last Week": "last_week",
      "Last Month": "last_month",
      "Current FY": "current_fy",
      "Last FY": "last_fy",
      "Custom": "custom"
    };
    return labelToMode[label] || label.toLowerCase().replace(/\s+/g, '_');
  };

  return (
    <div className="space-y-2">
      <Select
        value={displayValue}
        onChange={(selectedLabel) => {
          const selectedMode = getModeFromLabel(selectedLabel);
          handleMode(selectedMode);
        }}
        options={presetOptions.map(opt => formatModeLabel(opt))}
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

export function SearchableSelect({ onChange, options, placeholder, value }) {
  const { t } = useLanguage();
  // Force rebuild - React error fix applied
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const [openUpward, setOpenUpward] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  
  const defaultPlaceholder = placeholder || t('reports.filterOptions.searchPlaceholder');

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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          buttonRef.current && !buttonRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Calculate dropdown position when opening
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const spaceBelow = viewportHeight - buttonRect.bottom;
      const spaceAbove = buttonRect.top;
      const dropdownHeight = 200; // Approximate max height (48px header + ~152px for options)
      
      // Open upward if there's not enough space below but enough space above
      if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
        setOpenUpward(true);
        // Position above the button - calculate exact height needed
        const actualDropdownHeight = Math.min(dropdownHeight, filteredOptions.length * 32 + 60); // Approximate per option + header
        setDropdownPosition({
          top: buttonRect.top + window.scrollY - actualDropdownHeight, // No margin to eliminate gap
          left: buttonRect.left + window.scrollX,
          width: buttonRect.width
        });
      } else {
        setOpenUpward(false);
        // Position below the button - no gap
        setDropdownPosition({
          top: buttonRect.bottom + window.scrollY, // No margin to eliminate gap
          left: buttonRect.left + window.scrollX,
          width: buttonRect.width
        });
      }
    }
  }, [isOpen, filteredOptions.length]);
  
  const handleSelect = (option) => {
    const selectedValue = typeof option === 'object' && option.value ? option.value : option;
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={buttonRef}
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
            return defaultPlaceholder;
          })()}
        </span>
        <span className="text-slate-500">▼</span>
      </button>
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] rounded-xl border border-slate-300 bg-white shadow-lg overflow-hidden"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          <div className="p-2 border-b border-slate-200">
            <input
              type="text"
              placeholder={t('reports.filterOptions.search')}
              className="w-full text-sm rounded-md border border-slate-300 px-2 py-1"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-2 space-y-1">
            {filteredOptions.length === 0 ? (
              <div className="text-sm text-slate-500 p-2">{t('reports.filterOptions.noOptionsFound')}</div>
            ) : (
              filteredOptions.map((opt, index) => (
                <div key={typeof opt === 'object' ? opt.value || index : opt || index} onClick={() => handleSelect(opt)} className="text-sm p-1 rounded-md hover:bg-slate-100 cursor-pointer">
                  {typeof opt === 'object' && opt.label ? opt.label : String(opt || '')}
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
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
  propertyValue: ["="],
};

export function AdvancedBuilder({ fields, value, onChange, quickFilters = {} }) {
  const { t } = useLanguage();
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
        <SectionTitle>{t('reports.advancedConditions.title')}</SectionTitle>
        <button onClick={add} className="text-sm px-3 py-1 rounded-lg bg-[#143d65] text-white">
          + {t('reports.advancedConditions.addButton')}
        </button>
      </div>
      {rows?.length === 0 && <div className="text-sm text-slate-500">{t('reports.advancedConditions.noConditions')}</div>}
      <div className="space-y-3">
        {rows?.map((r, i) => {
          const field = fieldByKey(r.field);
          if (!field) return null;
          const ops = OP_MAP[field.type] || ["="];
          const isPropertyValue = field.type === "propertyValue";
          
          // For propertyValue, always use "=" operator and ensure it's set
          if (isPropertyValue && r.op !== "=") {
            update(i, { op: "=" });
          }
          
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
              {!isPropertyValue && (
                <div className="col-span-3">
                  <Select value={r.op} onChange={(v) => update(i, { op: v })} options={ops} />
                </div>
              )}
              <div className={isPropertyValue ? "col-span-8" : "col-span-5"}>
                <AdvValueInput field={field} cur={r.val} onChange={(v) => update(i, { val: v })} quickFilters={quickFilters} />
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

export function PropertyValueFilter({ value, onChange, assetId = null }) {
  const [properties, setProperties] = useState([]);
  const [propertyValues, setPropertyValues] = useState([]);
  const [loadingValues, setLoadingValues] = useState(false);
  const selectedProperty = value?.property || null;
  const selectedValue = value?.value || null;

  // Fetch properties - if assetId is provided, fetch only properties for that asset
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        let response;
        if (assetId) {
          // Fetch properties for specific asset
          response = await API.get(`/asset-register/asset-properties/${encodeURIComponent(assetId)}`);
          if (response.data && response.data.success) {
            const props = response.data.data.map(p => ({
              propId: p.prop_id,
              property: p.property
            }));
            setProperties(props);
            // Clear selected property and value when assetId changes and property is not available
            if (selectedProperty && !props.find(p => p.property === selectedProperty)) {
              onChange({ property: null, value: null });
            }
          }
        } else {
          // Fetch all properties from tblProps
          response = await API.get('/properties');
          if (response.data && response.data.success) {
            const props = response.data.data.map(p => ({
              propId: p.prop_id,
              property: p.property
            }));
            console.log('✅ Mapped all properties:', props);
            setProperties(props);
          } else {
            console.warn('⚠️ No properties found');
            setProperties([]);
          }
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    };
    fetchProperties();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  // Fetch values for selected property - if assetId is provided, fetch only values for that asset
  useEffect(() => {
    const fetchPropertyValues = async () => {
      if (!selectedProperty) {
        setPropertyValues([]);
        return;
      }

      setLoadingValues(true);
      try {
        let url = `/asset-register/property-values/${encodeURIComponent(selectedProperty)}`;
        if (assetId) {
          url += `?assetId=${encodeURIComponent(assetId)}`;
        }
        console.log('🔍 Fetching property values for:', selectedProperty, assetId ? `(asset: ${assetId})` : '');
        // Get distinct values for this property from tblAssetPropValues
        const response = await API.get(url);
        console.log('📦 Property values response:', response.data);
        if (response.data && response.data.success) {
          const values = response.data.data || [];
          console.log('✅ Property values:', values);
          setPropertyValues(values);
        } else {
          console.warn('⚠️ No property values found');
          setPropertyValues([]);
        }
      } catch (error) {
        console.error('❌ Error fetching property values:', error);
        console.error('❌ Error details:', error.response?.data || error.message);
        setPropertyValues([]);
      } finally {
        setLoadingValues(false);
      }
    };

    fetchPropertyValues();
  }, [selectedProperty, assetId]);

  const handlePropertyChange = (propertyName) => {
    const selectedProp = properties.find(p => p.property === propertyName);
    if (selectedProp) {
      onChange({ property: selectedProp.property, value: null });
    }
  };

  const handleValueChange = (val) => {
    onChange({ property: selectedProperty, value: val });
  };

  return (
    <div className="grid grid-cols-2 gap-2">
      <Select
        value={selectedProperty || ""}
        onChange={handlePropertyChange}
        options={properties.map(p => p.property || p.property_name || p)}
        placeholder={properties.length === 0 ? "No properties available" : "Select Property"}
      />
      <Select
        value={selectedValue || ""}
        onChange={handleValueChange}
        options={propertyValues}
        placeholder={loadingValues ? "Loading..." : selectedProperty ? "Select Value" : "Select property first"}
        disabled={!selectedProperty || loadingValues}
      />
    </div>
  );
}

export function AdvValueInput({ field, cur, onChange, quickFilters = {} }) {
  if (field.type === "number") return <Input type="number" value={cur} onChange={onChange} />;
  if (field.type === "text") return <Input value={cur} onChange={onChange} placeholder="Enter text" />;
  if (field.type === "boolean") return <Select value={cur} onChange={onChange} options={["true", "false"]} />;
  if (field.type === "select") return <Select value={cur} onChange={onChange} options={field.domain || []} />;
  if (field.type === "multiselect") return <SafeDropdownMultiSelect values={cur || []} onChange={onChange} options={field.domain || []} />;
  if (field.type === "daterange") return <DateRange value={cur || ["", ""]} onChange={onChange} />;
  if (field.type === "propertyValue") return <PropertyValueFilter value={cur} onChange={onChange} assetId={quickFilters.assetId} />;
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
  // Use local date formatting to avoid timezone issues
  // Get year, month, day in local timezone
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
