import React, { useEffect, useState, useMemo } from "react";
import { Edit2, Trash2, Filter, Plus, Minus } from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import { filterData } from "../../utils/filterData";

const InspectionChecklists = () => {
  const [checklists, setChecklists] = useState([]);
  const [responseTypes, setResponseTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterOpen, setFilterOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState([{ column: "", value: "" }]);
  const [selectedRows, setSelectedRows] = useState([]);

  // Form fields
  const [inspectionQuestion, setInspectionQuestion] = useState("");
  const [responseTypeId, setResponseTypeId] = useState("");
  const [expectedValue, setExpectedValue] = useState("");
  const [minRange, setMinRange] = useState("");
  const [maxRange, setMaxRange] = useState("");
  const [triggerMaintenance, setTriggerMaintenance] = useState(false);

  // Edit fields
  const [editingId, setEditingId] = useState(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editResponseTypeId, setEditResponseTypeId] = useState("");
  const [editExpectedValue, setEditExpectedValue] = useState("");
  const [editMinRange, setEditMinRange] = useState("");
  const [editMaxRange, setEditMaxRange] = useState("");
  const [editTriggerMaintenance, setEditTriggerMaintenance] = useState(false);

  // Helper to check if response type is Quantitative
  const isQuantitative = (id) => {
    if (!id) return false;
    const type = responseTypes.find(t => t.irtd_id === id);
    // Checking both ID and Name for "QN"
    return type?.name?.toUpperCase().includes("QN") || id.toUpperCase().includes("QN");
  };

  const fetchChecklists = async () => {
    setIsLoading(true);
    try {
      const response = await API.get("/inspection-checklists");
      const data = response.data?.data || [];
      setChecklists(data);
    } catch (error) {
      console.error("Failed to fetch checklists:", error);
      toast.error("Failed to load inspection checklists");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResponseTypes = async () => {
    try {
      const response = await API.get("/inspection-checklists/response-types");
      const data = response.data?.data || [];
      setResponseTypes(data);
    } catch (error) {
      console.error("Failed to fetch response types:", error);
      toast.error("Failed to load response types");
    }
  };

  useEffect(() => {
    fetchChecklists();
    fetchResponseTypes();
  }, []);

  const clearForm = () => {
    setInspectionQuestion("");
    setResponseTypeId("");
    setExpectedValue("");
    setMinRange("");
    setMaxRange("");
    setTriggerMaintenance(false);
  };

  const handleSave = async () => {
    if (!inspectionQuestion.trim()) {
      toast.error("Please enter inspection question");
      return;
    }

    if (!responseTypeId) {
      toast.error("Please select response type");
      return;
    }

    if (isQuantitative(responseTypeId)) {
      if (!minRange) {
        toast.error("Min Range is mandatory for Quantitative response types");
        return;
      }
      if (!maxRange) {
        toast.error("Max Range is mandatory for Quantitative response types");
        return;
      }
    }

    setIsCreating(true);
    try {
      await API.post("/inspection-checklists", {
        inspection_question: inspectionQuestion,
        irtd_id: responseTypeId,
        expected_value: expectedValue || null,
        min_range: minRange || null,
        max_range: maxRange || null,
        trigger_maintenance: triggerMaintenance
      });

      toast.success("Inspection checklist created successfully");
      clearForm();
      await fetchChecklists();
    } catch (error) {
      console.error("Failed to create checklist:", error);
      toast.error(error.response?.data?.message || "Failed to create checklist");
    } finally {
      setIsCreating(false);
    }
  };

  const startEdit = (checklist) => {
    setEditingId(checklist.ic_id);
    setEditQuestion(checklist.inspection_question);
    setEditResponseTypeId(checklist.irtd_id);
    setEditExpectedValue(checklist.expected_value || "");
    setEditMinRange(checklist.min_range || "");
    setEditMaxRange(checklist.max_range || "");
    setEditTriggerMaintenance(checklist.trigger_maintenance || false);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleUpdate = async () => {
    if (!editQuestion.trim()) {
      toast.error("Please enter inspection question");
      return;
    }

    if (!editResponseTypeId) {
      toast.error("Please select response type");
      return;
    }

    if (isQuantitative(editResponseTypeId)) {
      if (!editMinRange) {
        toast.error("Min Range is mandatory for Quantitative response types");
        return;
      }
      if (!editMaxRange) {
        toast.error("Max Range is mandatory for Quantitative response types");
        return;
      }
    }

    setIsUpdating(true);
    try {
      await API.put(`/inspection-checklists/${editingId}`, {
        inspection_question: editQuestion,
        irtd_id: editResponseTypeId,
        expected_value: editExpectedValue || null,
        min_range: editMinRange || null,
        max_range: editMaxRange || null,
        trigger_maintenance: editTriggerMaintenance
      });

      toast.success("Inspection checklist updated successfully");
      cancelEdit();
      await fetchChecklists();
    } catch (error) {
      console.error("Failed to update checklist:", error);
      toast.error(error.response?.data?.message || "Failed to update checklist");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Delete this inspection checklist?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await API.delete(`/inspection-checklists/${id}`);
      toast.success("Inspection checklist deleted successfully");
      await fetchChecklists();
    } catch (error) {
      console.error("Failed to delete checklist:", error);
      toast.error(error.response?.data?.message || "Failed to delete checklist");
    } finally {
      setIsDeleting(false);
    }
  };

  const updateColumnFilter = (index, key, value) => {
    setColumnFilters((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [key]: value } : item))
    );
  };

  const addColumnFilter = () => {
    setColumnFilters((prev) => [...prev, { column: "", value: "" }]);
  };

  const removeColumnFilter = (index) => {
    setColumnFilters((prev) => prev.filter((_, idx) => idx !== index));
  };

  const clearColumnFilters = () => {
    setColumnFilters([{ column: "", value: "" }]);
  };

  const filterColumns = [
    { label: "Inspection Question", value: "inspection_question" },
    { label: "Response Type", value: "res_type_name" },
    { label: "Expected Value", value: "expected_value" },
    { label: "Trigger Maintenance", value: "trigger_maintenance" }
  ];

  const filteredChecklists = useMemo(() => {
    return filterData(checklists, { columnFilters }, []);
  }, [checklists, columnFilters]);

  const selectableRowIds = useMemo(() => {
    return filteredChecklists
      .map((checklist) => checklist.ic_id)
      .filter((id) => id !== null && id !== undefined);
  }, [filteredChecklists]);

  const isAllSelected = selectableRowIds.length > 0 && selectableRowIds.every((id) => selectedRows.includes(id));

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Inspection Checklists</h1>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Inspection Checklist</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Question *</label>
              <input
                type="text"
                value={inspectionQuestion}
                onChange={(e) => setInspectionQuestion(e.target.value)}
                placeholder="Enter inspection question"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Response Type *</label>
              <select
                value={responseTypeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setResponseTypeId(val);
                  // Clear ranges if not quantitative
                  if (!isQuantitative(val)) {
                    setMinRange("");
                    setMaxRange("");
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
              >
                <option value="">Select response type</option>
                {responseTypes.map((type) => (
                  <option key={type.irtd_id} value={type.irtd_id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expected Value</label>
              <input
                type="text"
                value={expectedValue}
                onChange={(e) => setExpectedValue(e.target.value)}
                placeholder="Enter expected value"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Range {isQuantitative(responseTypeId) && "*"}</label>
              <input
                type="number"
                value={minRange}
                onChange={(e) => setMinRange(e.target.value)}
                placeholder={isQuantitative(responseTypeId) ? "Enter minimum range" : "N/A"}
                disabled={!isQuantitative(responseTypeId)}
                className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 ${!isQuantitative(responseTypeId) ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Range {isQuantitative(responseTypeId) && "*"}</label>
              <input
                type="number"
                value={maxRange}
                onChange={(e) => setMaxRange(e.target.value)}
                placeholder={isQuantitative(responseTypeId) ? "Enter maximum range" : "N/A"}
                disabled={!isQuantitative(responseTypeId)}
                className={`w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]/40 ${!isQuantitative(responseTypeId) ? "bg-gray-100 cursor-not-allowed" : ""}`}
              />
            </div>

            <div className="flex items-end">
              <label className={`flex items-center gap-2 mb-2 p-2 rounded cursor-pointer transition-colors ${triggerMaintenance ? 'bg-red-50' : 'bg-gray-50'}`}>
                <input
                  type="checkbox"
                  checked={triggerMaintenance}
                  onChange={(e) => setTriggerMaintenance(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                />
                <span className={`text-sm font-semibold ${triggerMaintenance ? 'text-red-700' : 'text-gray-700'}`}>
                  Trigger Maintenance Automatic
                </span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <button
              onClick={clearForm}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 text-sm font-medium"
            >
              Clear
            </button>
            <button
              onClick={handleSave}
              disabled={isCreating}
              className="px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#12395c] transition disabled:opacity-60 text-sm font-medium"
            >
              {isCreating ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Table Header with Filter */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Inspection Checklists List</h2>
            <button
              onClick={() => setFilterOpen((prev) => !prev)}
              className="flex items-center justify-center text-white bg-[#0E2F4B] rounded px-3 py-2 hover:bg-[#12395c]"
              title="Filter"
            >
              <Filter size={18} />
            </button>
          </div>

          {filterOpen && (
            <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {columnFilters.map((filter, index) => (
                    <div key={index} className="flex items-center gap-2 border px-2 py-1 rounded bg-white">
                      {columnFilters.length > 1 && (
                        <button
                          onClick={() => removeColumnFilter(index)}
                          className="bg-gray-200 text-gray-700 px-1 rounded-full"
                          title="Remove filter"
                        >
                          <Minus size={12} />
                        </button>
                      )}
                      <select
                        className="border text-sm px-2 py-1"
                        value={filter.column}
                        onChange={(e) => updateColumnFilter(index, "column", e.target.value)}
                      >
                        <option value="">Select column</option>
                        {filterColumns.map((col) => (
                          <option key={col.value} value={col.value}>
                            {col.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        className="border text-sm px-2 py-1"
                        placeholder="Search value"
                        value={filter.value}
                        onChange={(e) => updateColumnFilter(index, "value", e.target.value)}
                      />
                      {index === columnFilters.length - 1 && (
                        <button
                          onClick={addColumnFilter}
                          className="bg-[#0E2F4B] text-[#FFC107] px-1 rounded"
                          title="Add filter"
                        >
                          <Plus size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={clearColumnFilters}
                  className="text-sm px-3 py-1 rounded border border-gray-300 hover:bg-gray-100"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {isLoading ? (
            <div className="text-sm text-gray-500">Loading checklists...</div>
          ) : filteredChecklists.length === 0 ? (
            <div className="text-sm text-gray-500">No inspection checklists found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200 text-sm">
                <thead className="sticky top-0 z-10 bg-[#0E2F4B] border-b-4 border-[#FFC107]">
                  <tr className="text-white text-sm font-medium">
                    <th className="px-4 py-3 text-left w-10">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRows(selectableRowIds);
                          } else {
                            setSelectedRows([]);
                          }
                        }}
                        className="accent-yellow-400"
                      />
                    </th>
                    <th className="px-4 py-3 text-left">Question</th>
                    <th className="px-4 py-3 text-left">Response Type</th>
                    <th className="px-4 py-3 text-left">Expected Value</th>
                    <th className="px-4 py-3 text-left">Min Range</th>
                    <th className="px-4 py-3 text-left">Max Range</th>
                    <th className="px-4 py-3 text-center">Trigger Maint.</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredChecklists.map((checklist, index) => (
                    <tr
                      key={checklist.ic_id}
                      className={`border-t ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                    >
                      <td className="px-4 py-3 text-gray-900">
                        <input
                          type="checkbox"
                          disabled={!checklist.ic_id}
                          checked={checklist.ic_id ? selectedRows.includes(checklist.ic_id) : false}
                          onChange={() => {
                            if (!checklist.ic_id) return;
                            setSelectedRows((prev) =>
                              prev.includes(checklist.ic_id)
                                ? prev.filter((id) => id !== checklist.ic_id)
                                : [...prev, checklist.ic_id]
                            );
                          }}
                          className="accent-yellow-400"
                        />
                      </td>
                      {editingId === checklist.ic_id ? (
                        <>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editQuestion}
                              onChange={(e) => setEditQuestion(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-[#0E2F4B]/40 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={editResponseTypeId}
                              onChange={(e) => {
                                const val = e.target.value;
                                setEditResponseTypeId(val);
                                if (!isQuantitative(val)) {
                                  setEditMinRange("");
                                  setEditMaxRange("");
                                }
                              }}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-[#0E2F4B]/40 focus:outline-none"
                            >
                              <option value="">Select type</option>
                              {responseTypes.map((type) => (
                                <option key={type.irtd_id} value={type.irtd_id}>
                                  {type.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              value={editExpectedValue}
                              onChange={(e) => setEditExpectedValue(e.target.value)}
                              className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:ring-[#0E2F4B]/40 focus:outline-none"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editMinRange}
                              onChange={(e) => setEditMinRange(e.target.value)}
                              disabled={!isQuantitative(editResponseTypeId)}
                              placeholder={isQuantitative(editResponseTypeId) ? "" : "N/A"}
                              className={`w-full rounded-md border border-gray-300 px-2 py-1 text-sm ${!isQuantitative(editResponseTypeId) ? "bg-gray-100 cursor-not-allowed" : "focus:ring-[#0E2F4B]/40 focus:outline-none"}`}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={editMaxRange}
                              onChange={(e) => setEditMaxRange(e.target.value)}
                              disabled={!isQuantitative(editResponseTypeId)}
                              placeholder={isQuantitative(editResponseTypeId) ? "" : "N/A"}
                              className={`w-full rounded-md border border-gray-300 px-2 py-1 text-sm ${!isQuantitative(editResponseTypeId) ? "bg-gray-100 cursor-not-allowed" : "focus:ring-[#0E2F4B]/40 focus:outline-none"}`}
                            />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={editTriggerMaintenance}
                              onChange={(e) => setEditTriggerMaintenance(e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-[#0E2F4B] focus:ring-[#0E2F4B]"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-60"
                              >
                                {isUpdating ? "Saving..." : "Save"}
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-gray-900">{checklist.inspection_question}</td>
                          <td className="px-4 py-3 text-gray-700">{checklist.res_type_name}</td>
                          <td className="px-4 py-3 text-gray-700">{checklist.expected_value || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{checklist.min_range || "-"}</td>
                          <td className="px-4 py-3 text-gray-700">{checklist.max_range || "-"}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              checklist.trigger_maintenance 
                                ? "bg-red-100 text-red-800" 
                                : "bg-green-100 text-green-800"
                            }`}>
                              {checklist.trigger_maintenance ? "On" : "Off"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 items-center">
                              <button
                                onClick={() => startEdit(checklist)}
                                className="p-1 text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
                                title="Edit"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                onClick={() => handleDelete(checklist.ic_id)}
                                disabled={isDeleting}
                                className="p-1 text-red-700 bg-red-50 rounded hover:bg-red-100 disabled:opacity-60"
                                title="Delete"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InspectionChecklists;
