import React, { useState, useEffect } from "react";
import {
  ChevronDown,
  Download,
  Filter,
  Plus,
  Trash2,
  Minus,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeleteConfirmModal from "./DeleteConfirmModal";
import { toast } from "react-hot-toast";

const ContentBox = ({
  title,
  filters = [], // This represents the available columns for filtering/display
  onFilterChange, // This function is called to apply filters to the parent data
  onSort,
  sortConfig = { sorts: [] }, // Add default value
  selectedRows = [],
  setSelectedRows = () => {},
  onDeleteSelected = () => {},
  data = [], // The actual data to be displayed and filtered
  onDownload,
  children,
  showAddButton = true, // <-- Add this line
  showActions = true, // <-- Add this line
}) => {
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [columnFilters, setColumnFilters] = useState([]);
  const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Effect to apply initial filter if 'search by column' is active on mount
  useEffect(() => {
    // If 'search' is already an active filter, ensure columnFilters is initialized with at least one filter
    const searchFilterActive = activeFilters.some((f) => f.type === "search");
    if (searchFilterActive && columnFilters.length === 0) {
      setColumnFilters([{ column: "", value: "" }]);
    }
  }, [activeFilters]); // Run when activeFilters change

  const handleColumnChange = (index, column) => {
    const updated = [...columnFilters];
    updated[index].column = column;
    updated[index].value = ""; // Reset value when column changes
    setColumnFilters(updated);

    const validFilters = updated.filter((f) => f.column && f.value);
    onFilterChange("columnFilters", validFilters);
  };

  const handleValueChange = (index, value) => {
    const updated = [...columnFilters];
    updated[index].value = value;
    setColumnFilters(updated);

    const validFilters = updated.filter((f) => f.column && f.value);
    onFilterChange("columnFilters", validFilters); // Pass valid filters to parent
  };

  const addColumnFilter = () => {
    setColumnFilters([...columnFilters, { column: "", value: "" }]);
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
    const validFilters = updated.filter((f) => f.column && f.value);
    onFilterChange("columnFilters", validFilters); // Update parent's filter state
  };

  const availableFilterTypes = ["date", "search"];
  const selectedTypes = activeFilters.map((f) => f.type);
  const nextAvailableFilters = availableFilterTypes.filter(
    (type) => !selectedTypes.includes(type)
  );

  const handleAddFilter = (type) => {
    const labelMap = {
      date: "Purchase Date",
      search: "Search by Column",
    };
    const newFilter = { type, label: labelMap[type] };
    setActiveFilters([...activeFilters, newFilter]);
    // If 'search by column' is added, initialize with one empty column filter
    if (type === "search" && columnFilters.length === 0) {
      setColumnFilters([{ column: "", value: "" }]);
    }
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

    if (removed.type === "date") {
      setDateRange({ from: "", to: "" });
      onFilterChange("fromDate", "");
      onFilterChange("toDate", "");
    }
  };

  const [visibleColumns, setVisibleColumns] = useState(
    filters.map((f, i) => ({
      ...f,
      visible: i < 7 || f.name === 'status', // Always show Status column
    }))
  );

  const toggleColumn = (name) => {
    const updated = visibleColumns.map((col) =>
      col.name === name ? { ...col, visible: !col.visible } : col
    );
    setVisibleColumns(updated);
  };

  const visibleFilters = filters.filter(
    (f) => visibleColumns.find((col) => col.name === f.name)?.visible
  );

  const isAllSelected =
    selectedRows.length > 0 && selectedRows.length === data.length;

  const toggleAll = (e) => {
    if (e.target.checked) {
      const allIds = data.map((item) => item.branch_id || item.user_id || item.id); // Support different ID fields
      setSelectedRows(allIds);
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
          <button
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <Filter size={18} />
          </button>

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
                    const columnOptions = filters.map((f) => (
                      <option key={f.name} value={f.name}>
                        {f.label}
                      </option>
                    ));

                    // Get unique values for the value dropdown based on selected column
                    const valueOptions = cf.column
                      ? [...new Set(data.map((item) => item[cf.column]))]
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

                        {/* Value dropdown, visible only if a column is selected */}
                        {cf.column && (
                          <select
                            className="border text-sm px-2 py-1"
                            value={cf.value}
                            onChange={(e) =>
                              handleValueChange(index, e.target.value)
                            }
                          >
                            <option value="">Select value</option>
                            {valueOptions.map((val, i) => (
                              <option key={i} value={val}>
                                {val}
                              </option>
                            ))}
                          </select>
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
                <div className="font-medium border-b pb-1 mb-1">Add Filter</div>
                {nextAvailableFilters.map((type) => (
                  <div
                    key={type}
                    className="hover:bg-gray-100 px-2 py-1 cursor-pointer"
                    onClick={() => {
                      handleAddFilter(type);
                      setFilterMenuOpen(false);
                    }}
                  >
                    {type === "search" && "Search by Column"}
                    {type === "date" && "Purchase Date"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          {showAddButton && (
            <button
              onClick={() => navigate("add")}
              className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
            >
              <Plus size={16} />
            </button>
          )}

          <button
            onClick={() => {
              if (selectedRows.length === 0) {
                toast.error("Please select items to delete");
                return;
              }
              setShowDeleteModal(true);
            }}
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
          >
            <Trash2 size={16} />
          </button>

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
          <thead>
            <tr className="bg-[#0E2F4B] text-white text-sm font-medium border-b-4 border-[#FFC107]">
              {visibleFilters.map((filter, index) => {
                // Safely access sortConfig
                const sortInfo = sortConfig?.sorts?.find(s => s.column === filter.name);
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
                        {index === 0 && (
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
                              {sortInfo.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          </div>
                        )}
                      </span>
                      
                      {/* Dropdown Trigger */}
                      <div 
                        className="flex items-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdown(openDropdown === index ? null : index);
                        }}
                      >
                        <ChevronDown
                          size={16}
                          className={`text-white ${!openDropdown ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'} transition-opacity duration-150`}
                        />
                      </div>
                    </div>

                    {openDropdown === index && (
                      <div 
                        className="z-50 absolute top-full left-0 mt-1 bg-white text-black shadow-lg border border-gray-300 w-48 text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="px-3 py-2 font-semibold border-b">
                          Sort
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold"
                          onClick={() => {
                            onSort(filter.name);
                            if (!sortInfo || sortInfo.direction === 'desc') {
                              onSort(filter.name); // Set to ascending
                            }
                            setOpenDropdown(null);
                          }}
                        >
                          Sort Ascending {sortInfo?.direction === 'asc' && '✓'}
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer font-semibold"
                          onClick={() => {
                            onSort(filter.name);
                            if (!sortInfo || sortInfo.direction === 'asc') {
                              onSort(filter.name); // Set to descending
                            }
                            setOpenDropdown(null);
                          }}
                        >
                          Sort Descending {sortInfo?.direction === 'desc' && '✓'}
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
                            Remove Sort
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
                            <span>Columns</span>
                            <ChevronRight size={16} />
                          </button>
                          {showColumnsDropdown && (
                            <div 
                              className="absolute left-full top-0 mt-0 ml-1 bg-white shadow-lg border border-gray-300 w-48 z-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {visibleColumns.map((col, i) => (
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
                          Add Filter
                        </div>
                      </div>
                    )}
                  </th>
                );
              })}
              {showActions && (
                <th className="px-4 py-3 text-center">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {typeof children === "function"
              ? children({ visibleColumns, showActions })
              : children}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const success = await onDeleteSelected();
          if (success) {
            setShowDeleteModal(false);
          }
        }}
        message={`Are you sure you want to delete ${selectedRows.length} selected item(s)?`}
      />
    </div>
  );
};

export default ContentBox;
