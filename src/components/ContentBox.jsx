import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Download,
  Filter,
  Plus,
  Trash2,
  Minus,
  ChevronRight,
  RefreshCw,
  Search,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { toast } from "react-hot-toast";
import { useLanguage } from "../contexts/LanguageContext";

// Hide internal/database IDs from all UI tables by default.
// IDs are still present in data for row keys and API calls, but not displayed or selectable.
const isIdColumnName = (name) => {
  const n = String(name || "").toLowerCase().trim();
  if (!n) return false;
  if (n === "id") return true;
  if (n.endsWith("_id")) return true;
  if (n === "org_id") return true;
  if (n.endsWith("_uuid") || n === "uuid") return true;
  // Common workflow IDs still end with _id, but keep explicit for clarity.
  if (n === "wfamsh_id" || n === "wfamsd_id" || n === "wfscrap_h_id") return true;
  return false;
};

const ContentBox = ({
  title,
  filters = [], // This represents the available columns for filtering/display
  onFilterChange, // This function is called to apply filters to the parent data
  onSort,
  sortConfig = { sorts: [] }, // Add default value
  rowKey = "id",
  selectedRows = [],
  setSelectedRows = () => {},
  onDeleteSelected = () => {},
  data = [], // The actual data to be displayed and filtered
  // Row identifier used for select-all and bulk actions
  rowKey = "id",
  // Optional: provide IDs for "select all" (useful when the table is filtered/sorted in the page)
  getSelectAllIds,
  onDownload,
  onRefresh, // Add onRefresh prop
  children,
  showAddButton = true, // <-- Add this line
  showDeleteButton = true, // Add this line
  showActions = true, // <-- Add this line
  showHeaderCheckbox = true, // Add this line
  showFilterButton = true, // Add this line
  onAdd, // Add onAdd prop
  customHeaderActions, // Custom header actions
  isReadOnly = false, // Add isReadOnly prop
}) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [columnFilters, setColumnFilters] = useState([]);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchableDropdownOpen, setSearchableDropdownOpen] = useState({});
  const [searchableDropdownSearch, setSearchableDropdownSearch] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef({});

  // Handle refresh with animation
  const handleRefresh = async () => {
    if (isRefreshing || !onRefresh) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      // Keep animation for a minimum duration for better UX
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
    }
  };

  // Effect to apply initial filter if 'search by column' is active on mount
  useEffect(() => {
    // If 'search' is already an active filter, ensure columnFilters is initialized with at least one filter
    const searchFilterActive = activeFilters.some((f) => f.type === "search");
    if (searchFilterActive && columnFilters.length === 0) {
      setColumnFilters([{ column: "", value: [] }]);
    }
  }, [activeFilters]); // Run when activeFilters change

  // Handle click outside to close searchable dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(searchableDropdownOpen).forEach(index => {
        if (searchableDropdownOpen[index] && 
            dropdownRef.current[index] && 
            !dropdownRef.current[index].contains(event.target)) {
          setSearchableDropdownOpen(prev => ({
            ...prev,
            [index]: false
          }));
          setSearchableDropdownSearch(prev => ({
            ...prev,
            [index]: ""
          }));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchableDropdownOpen]);

  const handleColumnChange = (index, column) => {
    const updated = [...columnFilters];
    updated[index].column = column;
    updated[index].value = []; // Reset value to empty array when column changes
    setColumnFilters(updated);

    const validFilters = updated.filter((f) => f.column && f.value && f.value.length > 0);
    onFilterChange("columnFilters", validFilters);
  };

  const handleValueChange = (index, value) => {
    const updated = [...columnFilters];
    // Ensure value is always an array
    if (!Array.isArray(value)) {
      updated[index].value = value ? [value] : [];
    } else {
      updated[index].value = value;
    }
    setColumnFilters(updated);

    const validFilters = updated.filter((f) => f.column && f.value && f.value.length > 0);
    onFilterChange("columnFilters", validFilters); // Pass valid filters to parent
  };

  const addColumnFilter = () => {
    setColumnFilters([...columnFilters, { column: "", value: [] }]);
  };

  const removeColumnFilter = (index) => {
    const updated = columnFilters.filter((_, i) => i !== index);
    setColumnFilters(updated);
    // If all column filters are removed, also remove the 'search' type from activeFilters
    if (
      updated.length === 0 &&
      activeFilters.some((f) => f.type === "search")
    ) {
      setActiveFilters((prev) => prev.filter((f) => f.type !== "search"));
    }
    const validFilters = updated.filter((f) => f.column && f.value && f.value.length > 0);
    onFilterChange("columnFilters", validFilters); // Update parent's filter state
  };

  // Helper functions for searchable dropdown
  const toggleSearchableDropdown = (index) => {
    setSearchableDropdownOpen(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSearchableDropdownSearch = (index, searchTerm) => {
    setSearchableDropdownSearch(prev => ({
      ...prev,
      [index]: searchTerm
    }));
  };

  const toggleValueSelection = (index, value) => {
    const currentFilter = columnFilters[index];
    const currentValues = Array.isArray(currentFilter.value) ? currentFilter.value : (currentFilter.value ? [currentFilter.value] : []);
    
    // Toggle value in array
    let newValues;
    if (currentValues.includes(value)) {
      // Remove value if already selected
      newValues = currentValues.filter(v => v !== value);
    } else {
      // Add value if not selected
      newValues = [...currentValues, value];
    }
    
    handleValueChange(index, newValues);
  };

  const removeSelectedValue = (index, valueToRemove) => {
    const currentFilter = columnFilters[index];
    const currentValues = Array.isArray(currentFilter.value) ? currentFilter.value : (currentFilter.value ? [currentFilter.value] : []);
    const newValues = currentValues.filter(v => v !== valueToRemove);
    handleValueChange(index, newValues);
  };

  const availableFilterTypes = ["date", "search", "simpleSearch"];
  const selectedTypes = activeFilters.map((f) => f.type);
  const nextAvailableFilters = availableFilterTypes.filter(
    (type) => !selectedTypes.includes(type)
  );

  const handleAddFilter = (type) => {
    const labelMap = {
      date: t('assets.expiryDate'),
      search: t('common.searchByColumn'),
    };
    const newFilter = { type, label: labelMap[type] };
    setActiveFilters([...activeFilters, newFilter]);
    // If 'search by column' is added, initialize with one empty column filter
    if (type === "search" && columnFilters.length === 0) {
      setColumnFilters([{ column: "", value: [] }]);
    }
    setFilterMenuOpen(false);
  };

  const handleRemoveFilter = (index) => {
    const removed = activeFilters[index];
    const updated = [...activeFilters];
    updated.splice(index, 1);
    setActiveFilters(updated);

    if (removed.type === "search") {
      setColumnFilters([]); // Clear all column filters
      onFilterChange("columnFilters", []); // Notify parent to clear column filters
    }
    
    if (removed.type === "simpleSearch") {
      setSearchTerm(""); // Clear search term
      onFilterChange("search", ""); // Notify parent to clear search
    }

    if (removed.type === "date") {
      setDateRange({ from: "", to: "" });
      onFilterChange("fromDate", "");
      onFilterChange("toDate", "");
    }
  };

  const [visibleColumns, setVisibleColumns] = useState(
    filters.map((f, i) => ({
      ...f,
      // Preserve existing visible property if set (e.g., from column access control)
      // If visible is explicitly false (NONE access), always keep it false
      // Otherwise, use default visibility logic
      visible: isIdColumnName(f.name)
        ? false
        : (f.visible === false
          ? false
          : (f.visible !== undefined ? f.visible : (i < 7 || f.name === "status" || f.name === "int_status"))), // Always show Status column
    }))
  );

  // Sync visibleColumns when incoming filters change
  useEffect(() => {
    setVisibleColumns(prevVisibleColumns => {
      // Create a map of previous visibility for user-toggled columns
      const prevVisibilityMap = new Map(prevVisibleColumns.map(col => [col.name, col.visible]));
      
      return filters.map((f, i) => {
        // Never allow ID columns to be visible in UI
        if (isIdColumnName(f.name)) {
          return { ...f, visible: false };
        }

        // If filter has visible=false (from column access NONE), always keep it false
        if (f.visible === false) {
          return { ...f, visible: false };
        }
        
        // If filter has visible=true (from column access), use it
        if (f.visible === true) {
          // Preserve user's manual toggle if they changed it (unless it was forced to false)
          const prevVisible = prevVisibilityMap.get(f.name);
          return { ...f, visible: prevVisible === false ? false : true };
        }
        
        // Otherwise, preserve previous visibility or use default
        const prevVisible = prevVisibilityMap.get(f.name);
        return {
        ...f,
          visible: prevVisible !== undefined ? prevVisible : (i < 7 || f.name === "status" || f.name === "int_status"),
        };
      });
    });
  }, [filters]);

  const toggleColumn = (name) => {
    // Never allow toggling ID columns to visible
    if (isIdColumnName(name)) return;

    // Find the original filter to check if it has forced visibility (from column access)
    const originalFilter = filters.find(f => f.name === name);
    // If the original filter has visible=false (NONE access), don't allow toggling
    if (originalFilter && originalFilter.visible === false) {
      return; // Don't allow toggling columns with NONE access
    }
    
    const updated = visibleColumns.map((col) =>
      col.name === name ? { ...col, visible: !col.visible } : col
    );
    setVisibleColumns(updated);
  };

  // Create visibleFilters in the same order as visibleColumns to ensure column alignment
  // Use columns directly since filters are derived from columns - this ensures perfect alignment
  const visibleFilters = visibleColumns
    .filter((col) => col.visible)
    .map((col) => {
      // Find matching filter to preserve filter-specific properties (onChange, options, etc.)
      const filter = filters.find((f) => f.name === col.name);
      // Merge column properties with filter properties, prioritizing column label/name
      return filter 
        ? { ...filter, label: col.label || filter.label, name: col.name || filter.name }
        : { label: col.label, name: col.name, options: [], onChange: () => {} };
    });

  const getRowId = (item) => {
    if (!item || typeof item !== "object") return undefined;
    if (rowKey && item[rowKey] !== undefined && item[rowKey] !== null) return item[rowKey];
    // Backwards-compatible fallbacks for older pages that don't pass rowKey
    return item.branch_id ?? item.user_id ?? item.id;
  };

  const dataIdSet = new Set(
    (Array.isArray(data) ? data : [])
      .map(getRowId)
      .filter((v) => v !== undefined && v !== null)
  );
  const selectedIdSet = new Set(Array.isArray(selectedRows) ? selectedRows : []);

  const isAllSelected =
    dataIdSet.size > 0 && Array.from(dataIdSet).every((id) => selectedIdSet.has(id));

  const toggleAll = (e) => {
    if (e.target.checked) {
      setSelectedRows(Array.from(dataIdSet));
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border mt-4">
      {title && (
        <div className="bg-[#0E2F4B] text-white px-4 py-2 border-b-4 border-[#FFC107]">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-2 p-2 bg-gray-100 border-b">
        <div className="flex flex-wrap items-center gap-2">

          {showFilterButton && (
            <button
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
              onClick={() => setFilterMenuOpen(!filterMenuOpen)}
            >
              <Filter size={18} />
            </button>
          )}

          {activeFilters.map((filter, idx) => (
            <div
              key={idx}
              className="flex items-center border px-2 py-1 rounded bg-gray-50"
            >
              <button
                onClick={() => handleRemoveFilter(idx)}
                className="bg-[#0E2F4B] text-[#FFC107] px-1 h-full"
              >
                <Minus size={14} />
              </button>

              {filter.type === "search" && (
                <div className="flex flex-wrap items-center gap-2 ml-2">
                  {columnFilters.map((cf, index) => {
                    // Get options for the column dropdown
                    const columnOptions = filters
                      .filter((f) => !isIdColumnName(f.name))
                      .map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ));

                    // Get unique values for the value dropdown based on selected column
                    const valueOptions = cf.column
                      ? [
                          ...new Set(
                            data.map((item) => {
                              const value = item[cf.column];
                              // Handle object values (like days_until_expiry: {days: 5})
                              if (
                                value &&
                                typeof value === "object" &&
                                value.days !== undefined
                              ) {
                                return `${value.days} days`;
                              }
                              // Handle other object values by converting to string
                              if (value && typeof value === "object") {
                                return JSON.stringify(value);
                              }
                              // Handle null/undefined values
                              if (value === null || value === undefined) {
                                return "N/A";
                              }
                              // Return string values as-is
                              return String(value);
                            })
                          ),
                        ]
                      : [];

                    return (
                      <div key={index} className="flex items-center gap-2">
                        {/* Minus button for individual column filter */}
                        {columnFilters.length > 1 && (
                          <button
                            onClick={() => removeColumnFilter(index)}
                            className="bg-gray-300 text-gray-700 px-1 rounded-full"
                            title="Remove this column filter"
                          >
                            <Minus size={12} />
                          </button>
                        )}
                        <select
                          className="border text-sm px-2 py-1"
                          value={cf.column}
                          onChange={(e) =>
                            handleColumnChange(index, e.target.value)
                          }
                        >
                          <option value="">Select column</option>
                          {columnOptions}
                        </select>

                        {/* Searchable Value dropdown, visible only if a column is selected */}
                        {cf.column && (
                          <div className="relative" ref={el => dropdownRef.current[index] = el}>
                            <button
                              type="button"
                              className="border text-sm px-2 py-1 bg-white min-w-[200px] text-left flex items-center justify-between"
                              onClick={() => toggleSearchableDropdown(index)}
                            >
                              <span className={Array.isArray(cf.value) && cf.value.length > 0 ? "" : "text-gray-500"}>
                                {Array.isArray(cf.value) && cf.value.length > 0 
                                  ? `${cf.value.length} selected` 
                                  : "Select values"}
                              </span>
                              <ChevronDown size={14} />
                            </button>
                            
                            {searchableDropdownOpen[index] && (
                              <div className="absolute z-50 mt-1 bg-white border rounded shadow-lg min-w-[200px] max-h-60 overflow-hidden">
                                <div className="p-2 border-b">
                                  <input
                                    type="text"
                                    placeholder="Search..."
                                    value={searchableDropdownSearch[index] || ""}
                                    onChange={(e) => handleSearchableDropdownSearch(index, e.target.value)}
                                    className="w-full px-2 py-1 border text-sm focus:outline-none focus:ring-1 focus:ring-[#FFC107]"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                                <div className="max-h-48 overflow-y-auto">
                                  {valueOptions
                                    .filter(val => 
                                      !searchableDropdownSearch[index] || 
                                      val.toLowerCase().includes(searchableDropdownSearch[index].toLowerCase())
                                    )
                                    .map((val, i) => {
                                      const isSelected = Array.isArray(cf.value) && cf.value.includes(val);
                                      return (
                                        <div
                                          key={i}
                                          className="px-2 py-1 text-sm hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                          onClick={() => toggleValueSelection(index, val)}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              toggleValueSelection(index, val);
                                            }}
                                            className="accent-[#0E2F4B] cursor-pointer"
                                          />
                                          <span className={isSelected ? "font-medium" : ""}>{val}</span>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Plus button, visible only for the last column filter */}
                        {index === columnFilters.length - 1 && (
                          <button
                            onClick={addColumnFilter}
                            className="text-[#FFC107] bg-[#0E2F4B] px-1"
                            title="Add another column filter"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {filter.type === "simpleSearch" && (
                <div className="flex items-center gap-2 ml-2">
                  <span>{filter.label}</span>
                  <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employees..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        onFilterChange && onFilterChange('search', e.target.value);
                      }}
                      className="border border-gray-300 rounded pl-7 pr-6 py-1 text-sm w-40 focus:outline-none focus:ring-1 focus:ring-[#FFC107] focus:border-transparent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => {
                          setSearchTerm("");
                          onFilterChange && onFilterChange('search', "");
                        }}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm leading-none"
                        title="Clear search"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              )}

              {filter.type === "date" && (
                <div className="flex items-center gap-2 ml-2">
                  <span>{filter.label}</span>
                  <input
                    type="date"
                    className="border px-1"
                    value={dateRange.from} // Controlled component
                    onChange={(e) => {
                      const updated = { ...dateRange, from: e.target.value };
                      setDateRange(updated);
                      onFilterChange("fromDate", updated.from);
                    }}
                  />
                  <span>to</span>
                  <input
                    type="date"
                    className="border px-1"
                    value={dateRange.to} // Controlled component
                    onChange={(e) => {
                      const updated = { ...dateRange, to: e.target.value };
                      setDateRange(updated);
                      onFilterChange("toDate", updated.to);
                    }}
                  />
                </div>
              )}
            </div>
          ))}

          {filterMenuOpen && nextAvailableFilters.length > 0 && (
            <div className="relative">
              <div className="absolute z-50 mt-1 bg-white border text-sm w-60 p-2 shadow-lg left-0">
                <div className="font-medium border-b pb-1 mb-1">{t('common.addFilter')}</div>
                {nextAvailableFilters.map((type) => (
                  <div
                    key={type}
                    className="hover:bg-gray-100 px-2 py-1 cursor-pointer"
                    onClick={() => {
                      handleAddFilter(type);
                      setFilterMenuOpen(false);
                    }}
                  >
                    {type === "search" && t('common.searchByColumn')}
                    {type === "date" && t('assets.expiryDate')}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          {showAddButton && (
            <button
              onClick={onAdd || (() => navigate("add"))}
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
            >
              <Plus size={16} />
            </button>
          )}

          {customHeaderActions && (
            <div className="flex gap-2">
              {customHeaderActions}
            </div>
          )}

          {showActions && showDeleteButton && (
            <button
              onClick={() => {
                if (selectedRows.length === 0) {
                  toast.error(t('common.pleaseSelectItemsToDelete'));
                  return;
                }
                setShowDeleteModal(true);
              }}
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-2 hover:bg-gray-100 bg-[#0E2F4B]"
            >
              <Trash2 size={16} />
            </button>
          )}

          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B] group relative disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <RefreshCw 
                size={16} 
                className={`transition-transform duration-300 ${isRefreshing ? 'animate-spin' : ''}`}
              />
            </button>
          )}

          {onDownload && (
            <button
              onClick={onDownload}
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
            >
              <Download size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[500px] min-h-[400px] overflow-y-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
            <tr className="text-white text-sm font-medium">
              {visibleFilters.map((filter, index) => {
                // Safely access sortConfig
                const sortInfo = sortConfig?.sorts?.find(
                  (s) => s.column === filter.name
                );
                const isSorted = !!sortInfo;

                return (
                  <th
                    key={index}
                    className="px-4 py-3 relative text-left group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="flex items-center gap-2 cursor-pointer flex-grow"
                        onClick={() => onSort(filter.name)}
                      >
                        {index === 0 && showActions && showHeaderCheckbox && !isReadOnly && (
                          <input
                            type="checkbox"
                            className="accent-yellow-400"
                            checked={isAllSelected}
                            onChange={toggleAll}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        {filter.label}

                        {/* Sort Indicator */}
                        {sortInfo && (
                          <div className="flex items-center ml-2">
                            <span className="text-[#FFC107] text-xs font-bold mr-1">
                              {sortInfo.order}
                            </span>
                            <span className="text-[#FFC107]">
                              {sortInfo.direction === "asc" ? "↑" : "↓"}
                            </span>
                          </div>
                        )}
                      </span>

                      {/* Dropdown Trigger */}
                      <div
                        className="flex items-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(
                            openDropdown === index ? null : index
                          );
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className={`text-white ${
                            !openDropdown
                              ? "opacity-0 group-hover:opacity-100"
                              : "opacity-100"
                          } transition-opacity duration-150`}
                        />
                      </div>
                    </div>

                    {openDropdown === index && (
                      <div
                        className="z-50 absolute top-full left-0 mt-1 bg-white text-black shadow-lg border border-gray-300 w-48 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 font-semibold border-b">
                          {t('common.sort')}
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold"
                          onClick={() => {
                            onSort(filter.name);
                            if (!sortInfo || sortInfo.direction === "desc") {
                              onSort(filter.name); // Set to ascending
                            }
                            setOpenDropdown(null);
                          }}
                        >
                          {t('common.sortAscending')} {sortInfo?.direction === "asc" && "✓"}
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold"
                          onClick={() => {
                            onSort(filter.name);
                            if (!sortInfo || sortInfo.direction === "asc") {
                              onSort(filter.name); // Set to descending
                            }
                            setOpenDropdown(null);
                          }}
                        >
                          {t('common.sortDescending')}{" "}
                          {sortInfo?.direction === "desc" && "✓"}
                        </div>
                        {sortInfo && (
                          <div
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold border-t"
                            onClick={() => {
                              onSort(filter.name);
                              onSort(filter.name); // Remove sort
                              setOpenDropdown(null);
                            }}
                          >
                            {t('common.removeSort')}
                          </div>
                        )}
                        <div className="relative border-t">
                          <button
                            className="flex items-center justify-between w-full px-3 py-2 font-semibold hover:bg-gray-100 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowColumnsDropdown(!showColumnsDropdown);
                            }}
                          >
                            <span>{t('common.columns')}</span>
                            <ChevronRight size={16} />
                          </button>
                          {showColumnsDropdown && (
                            <div
                              className="fixed bg-white shadow-lg border border-gray-300 w-48 z-50 max-h-[300px] overflow-y-auto"
                              style={{
                                top: "0px",
                                left: "0px",
                              }}
                              ref={(el) => {
                                if (el) {
                                  // Position the dropdown next to the button
                                  const button =
                                    el.parentElement?.querySelector("button");
                                  if (button) {
                                    const rect = button.getBoundingClientRect();
                                    el.style.top = `${rect.top}px`;
                                    el.style.left = `${rect.right + 4}px`; // 4px gap

                                    // Adjust vertical position if dropdown would go off screen
                                    const dropdownRect =
                                      el.getBoundingClientRect();
                                    if (
                                      dropdownRect.bottom > window.innerHeight
                                    ) {
                                      const topOffset =
                                        dropdownRect.bottom -
                                        window.innerHeight;
                                      el.style.top = `${
                                        rect.top - topOffset
                                      }px`;
                                    }
                                  }
                                }
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.nativeEvent.stopImmediatePropagation();
                              }}
                              onWheel={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                const element = e.currentTarget;
                                const scrollSpeed = 30; // Adjust scroll speed
                                const atTop = element.scrollTop === 0;
                                const atBottom =
                                  element.scrollTop + element.clientHeight ===
                                  element.scrollHeight;

                                // Only scroll if we're not at the limits or we're scrolling away from them
                                if (!atTop || (atTop && e.deltaY > 0)) {
                                  if (!atBottom || (atBottom && e.deltaY < 0)) {
                                    element.scrollTop +=
                                      e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
                                  }
                                }
                              }}
                              onMouseEnter={(e) => {
                                // Prevent scrolling of parent elements while hovering
                                document.body.style.overflow = "hidden";
                              }}
                              onMouseLeave={(e) => {
                                // Restore scrolling when leaving dropdown
                                document.body.style.overflow = "";
                              }}
                            >
                              {visibleColumns
                                .filter((col) => !isIdColumnName(col.name))
                                .map((col, i) => (
                                <label
                                  key={i}
                                  className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={col.visible}
                                    onChange={(e) => {
                                      toggleColumn(col.name);
                                    }}
                                    className="mr-2"
                                  />
                                  {col.label}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold">
                          {t('common.addFilter')}
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
              {showActions && (
                <th className="px-4 py-3 text-center">{t('common.actions')}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {typeof children === "function"
              ? children({ visibleColumns, showActions: showActions && !isReadOnly })
              : children}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      {showActions && (
        <DeleteConfirmModal
          show={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={async () => {
            const success = await onDeleteSelected();
            if (success) {
              setShowDeleteModal(false);
            }
          }}
          message={t('assets.areYouSureDelete', { count: selectedRows.length })}
        />
      )}
    </div>
  );
};

export default ContentBox;
