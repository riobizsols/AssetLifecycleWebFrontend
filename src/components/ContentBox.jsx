import React, { useState } from "react";
import {
  ChevronDown,
  Download,
  Filter,
  Plus,
  Trash2,
  Minus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ContentBox = ({
  title,
  filters = [],
  onFilterChange,
  onSort,
  sortConfig,
  selectedRows = [],
  setSelectedRows = () => {},
  onDeleteSelected,
  data = [],
  children,
}) => {
  const navigate = useNavigate();

  const [openDropdown, setOpenDropdown] = useState(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [dateRange, setDateRange] = useState({ from: "", to: "" });

  const availableFilterTypes = ["sortAsc", "sortDesc", "date", "search"];
  const selectedTypes = activeFilters.map((f) => f.type);

  const nextAvailableFilters = availableFilterTypes.filter((type) => {
    if (type === "sortAsc" && selectedTypes.includes("sortDesc")) return false;
    if (type === "sortDesc" && selectedTypes.includes("sortAsc")) return false;
    return !selectedTypes.includes(type);
  });

  const handleAddFilter = (type) => {
    const labelMap = {
      sortAsc: "Sort Ascending",
      sortDesc: "Sort Descending",
      date: "Purchase Date",
      search: "Search by Name",
    };
    const newFilter = { type, label: labelMap[type] };

    if (!selectedTypes.includes(type)) {
      setActiveFilters([...activeFilters, newFilter]);

      if (type === "sortAsc") onSort("text", "asc");
      if (type === "sortDesc") onSort("text", "desc");
    }
  };

  const handleRemoveFilter = (index) => {
    const removed = activeFilters[index];
    const updated = [...activeFilters];
    updated.splice(index, 1);
    setActiveFilters(updated);

    if (removed.type === "sortAsc" || removed.type === "sortDesc") {
      onSort(null, null);
    }

    if (removed.type === "search") setSearchKeyword("");
    if (removed.type === "date") setDateRange({ from: "", to: "" });
  };

  const [visibleColumns, setVisibleColumns] = useState(
    filters.map((f, i) => ({ ...f, visible: i < 7 }))
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
      const allIds = data.map((item) => item.user_id); // assumes user_id is the key
      setSelectedRows(allIds);
    } else {
      setSelectedRows([]);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border mt-4">
      {/* Title */}
      {title && (
        <div className="bg-[#0E2F4B] text-white px-4 py-2 border-b-4 border-[#FFC107]">
          <h2 className="text-base font-semibold">{title}</h2>
        </div>
      )}

      {/* Top Control Bar */}
      <div className="flex flex-col gap-2 p-2 bg-gray-100 border-b">

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
            onClick={() => setFilterMenuOpen(!filterMenuOpen)}
          >
            <Filter size={18} />
          </button>

          {activeFilters.map((filter, idx) => (
            <div key={idx} className="flex items-center border px-2 py-1 rounded bg-gray-50">
              <button
                onClick={() => handleRemoveFilter(idx)}
                className="bg-[#0E2F4B] text-[#FFC107] px-1 h-full"
              >
                <Minus size={14} />
              </button>

              <div className="mx-2">
                {filter.type === "search" ? (
                  <input
                    type="text"
                    value={searchKeyword}
                    onChange={(e) => {
                      setSearchKeyword(e.target.value);
                      onFilterChange("text", e.target.value);
                    }}
                    className="border px-2 py-1 text-sm"
                    placeholder="Search..."
                  />
                ) : filter.type === "date" ? (
                  <div className="flex items-center gap-2">
                    <span>{filter.label}</span>
                    <input
                      type="date"
                      className="border px-1"
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
                      onChange={(e) => {
                        const updated = { ...dateRange, to: e.target.value };
                        setDateRange(updated);
                        onFilterChange("toDate", updated.to);
                      }}
                    />
                  </div>
                ) : (
                  <span>{filter.label}</span>
                )}
              </div>

              <button
                className="bg-[#0E2F4B] text-[#FFC107] px-1 h-full ml-2"
                onClick={() => setFilterMenuOpen(true)}
              >
                <Plus size={14} />
              </button>
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
                    {type === "search" && "Search by Name"}
                    {type === "sortAsc" && "Sort Ascending"}
                    {type === "sortDesc" && "Sort Descending"}
                    {type === "date" && "Purchase Date"}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => navigate("add")}
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
          >
            <Plus size={16} />
          </button>

          <button
            onClick={onDeleteSelected}
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
          >
            <Trash2 size={16} />
          </button>

          <button
            // onClick={onDownload}
            className="flex items-center justify-center text-[#FFC107] border border-gray-300 rounded px-2 py-1 hover:bg-gray-100 bg-[#0E2F4B]"
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[500px] min-h-[400px] overflow-y-auto">
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr className="bg-[#0E2F4B] text-white text-sm font-medium border-b-4 border-[#FFC107]">
              {visibleFilters.map((filter, index) => {
                const isSortedAsc =
                  sortConfig?.column === filter.name &&
                  sortConfig.direction === "asc";
                const isSortedDesc =
                  sortConfig?.column === filter.name &&
                  sortConfig.direction === "desc";

                return (
                  <th key={index} className="px-4 py-3 relative text-left group">
                    <div
                      className="flex items-center justify-between gap-2 cursor-pointer"
                      onClick={() =>
                        setOpenDropdown(openDropdown === index ? null : index)
                      }
                    >
                      <span className="flex items-center gap-2">
                        {index === 0 && (
                          <input
                            type="checkbox"
                            className="accent-yellow-400"
                            checked={isAllSelected}
                            onChange={toggleAll}
                          />
                        )}
                        {filter.label}
                      </span>
                      {isSortedAsc && <span className="text-yellow-400 text-xs">↑</span>}
                      {isSortedDesc && <span className="text-yellow-400 text-xs">↓</span>}
                      {!isSortedAsc && !isSortedDesc && (
                        <ChevronDown
                          size={16}
                          className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                        />
                      )}
                    </div>

                    {openDropdown === index && (
                      <div className="z-50 absolute top-full left-0 mt-1 bg-white text-black shadow-lg border border-gray-300 w-48 text-sm">
                        <div className="px-3 py-2 font-semibold border-b">Sort</div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            onSort(filter.name, "asc");
                            setOpenDropdown(null);
                          }}
                        >
                          Sort Ascending
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            onSort(filter.name, "desc");
                            setOpenDropdown(null);
                          }}
                        >
                          Sort Descending
                        </div>
                        <div
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => {
                            onSort(null, null);
                            setOpenDropdown(null);
                          }}
                        >
                          Undo Sorting
                        </div>

                        <div className="px-3 py-2 font-semibold border-t">Columns</div>
                        {visibleColumns.map((col, i) => (
                          <label
                            key={i}
                            className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={col.visible}
                              onChange={() => toggleColumn(col.name)}
                              className="mr-2"
                            />
                            {col.label}
                          </label>
                        ))}
                      </div>
                    )}
                  </th>
                );
              })}
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>

          <tbody>
            {typeof children === "function"
              ? children({ visibleColumns })
              : children}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ContentBox;
  