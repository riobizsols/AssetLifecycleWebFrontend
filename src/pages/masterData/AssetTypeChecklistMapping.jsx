import React, { useState, useEffect } from "react";
import { 
  Plus, Edit2, Trash2, Save, X, Search, 
  ChevronRight, AlertCircle, Trash, ListFilter,
  CheckCircle2, Info
} from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import DeleteConfirmModal from "../../components/DeleteConfirmModal";

const AssetTypeChecklistMapping = () => {
  // Column definitions for mapping summary table
  const columns = [
    { label: "Asset Type", name: "asset_type_name", visible: true },
    { label: "Asset Name (Specific)", name: "asset_name", visible: true },
    { label: "Total Questions", name: "total_questions", visible: true },
  ];

  // Main view state
  const [mappingSummaries, setMappingSummaries] = useState([]);
  const [isLoadingMain, setIsLoadingMain] = useState(false);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Selection & Deletion state
  const [selectedRows, setSelectedRows] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Dropdown data
  const [assetTypes, setAssetTypes] = useState([]);
  const [assets, setAssets] = useState([]);
  const [allChecklists, setAllChecklists] = useState([]);
  
  // Selection state (for individual mapping)
  const [selectedAssetTypeId, setSelectedAssetTypeId] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  
  // Mapping rows in modal
  const [mappingRows, setMappingRows] = useState([]);

  useEffect(() => {
    fetchMappingSummaries();
    fetchAssetTypes();
    fetchAllChecklists();
  }, []);

  const fetchMappingSummaries = async () => {
    setIsLoadingMain(true);
    try {
      const response = await API.get("/asset-type-checklist-mapping/all");
      const dataWithKeys = (response.data?.data || []).map(m => ({
          ...m,
          // Generate a unique key for the UI (at_id + asset_id)
          rowId: m.asset_id ? `${m.at_id}_${m.asset_id}` : m.at_id
      }));
      setMappingSummaries(dataWithKeys);
    } catch (error) {
      console.error("Error fetching mapping summaries:", error);
      toast.error("Failed to load mappings");
    } finally {
      setIsLoadingMain(false);
    }
  };

  const fetchAssetTypes = async () => {
    try {
      const response = await API.get("/asset-types");
      setAssetTypes(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error fetching asset types:", error);
      setAssetTypes([]);
    }
  };

  const fetchAllChecklists = async () => {
    try {
      const response = await API.get("/inspection-checklists");
      setAllChecklists(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (error) {
      console.error("Error fetching checklists:", error);
      setAllChecklists([]);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return false;
    
    // Instead of using our own modal here, we perform the deletion 
    // because ContentBox already shows its own confirmation modal.
    setIsDeleting(true);
    let successCount = 0;
    try {
      // Loop and delete each group
      for (const rowId of selectedRows) {
        const row = mappingSummaries.find(m => m.rowId === rowId);
        if (row) {
          const params = { assetTypeId: row.at_id };
          if (row.asset_id) params.assetId = row.asset_id;
          
          await API.delete("/asset-type-checklist-mapping", { params });
          successCount++;
        }
      }
      
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} mapping group(s)`);
        fetchMappingSummaries();
        setSelectedRows([]);
        return true; // Return true to signal ContentBox to close its modal
      }
      return false;
    } catch (error) {
      console.error("Error deleting mapping groups:", error);
      toast.error("Failed to delete some mappings");
      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchAssetsByAssetType = async (assetTypeId) => {
    if (!assetTypeId) {
      setAssets([]);
      return;
    }
    try {
      const response = await API.get(`/assets/type/${assetTypeId}`);
      // Fixed: response.data is the full object from backend which has a data property
      const data = response.data?.data;
      setAssets(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching assets:", error);
      setAssets([]);
    }
  };

  const handleAssetTypeChange = (assetTypeId) => {
    setSelectedAssetTypeId(assetTypeId);
    setSelectedAssetId("");
    setMappingRows([]); // Reset mapping rows to an empty table on selection
    fetchAssetsByAssetType(assetTypeId);
  };

  const openAddModal = () => {
    setIsEditing(false);
    setSelectedAssetTypeId("");
    setSelectedAssetId("");
    setAssets([]);
    setMappingRows([]); // Changed: Start with NO rows for a truly "empty table" feel
    setShowModal(true);
  };

  const openEditModal = async (mapping) => {
    setIsEditing(true);
    setModalLoading(true);
    setShowModal(true);
    
    try {
      setSelectedAssetTypeId(mapping.at_id);
      await fetchAssetsByAssetType(mapping.at_id);
      setSelectedAssetId(mapping.asset_id || "");
      
      const response = await API.get(`/asset-type-checklist-mapping/${mapping.at_id}${mapping.asset_id ? '?assetId=' + mapping.asset_id : ''}`);
      const mappedItems = Array.isArray(response.data?.data) ? response.data.data : [];
      
      // Load response types for each mapped item
      const detailedRows = mappedItems.map(item => {
        const fullChecklist = Array.isArray(allChecklists) ? allChecklists.find(c => c.ic_id === item.insp_check_id) : null;
        return {
          ...item,
          response_type: fullChecklist?.response_type || (fullChecklist?.irtd_id?.includes('QN') ? 'QN' : 'QL'),
          trigger_maintenance: !!item.trigger_maintenance
        };
      });
      
      setMappingRows(detailedRows);
    } catch (error) {
      console.error("Error loading mapping details:", error);
      toast.error("Failed to load mapping details");
    } finally {
      setModalLoading(false);
    }
  };

  const handleAddRow = () => {
    setMappingRows(prev => [...prev, { 
      insp_check_id: "", 
      response_type: "-", 
      min_range: "", 
      max_range: "", 
      expected_value: "", 
      trigger_maintenance: false 
    }]);
  };

  const handleRemoveRow = (index) => {
    const newRows = [...mappingRows];
    newRows.splice(index, 1);
    setMappingRows(newRows);
  };

  const handleQuestionChange = (index, questionId) => {
    const newRows = [...mappingRows];
    
    if (!questionId) {
      newRows[index] = { 
        ...newRows[index], 
        insp_check_id: "", 
        response_type: "-", 
        min_range: "", 
        max_range: "", 
        expected_value: "", 
        trigger_maintenance: false
      };
      setMappingRows(newRows);
      return;
    }

    // Optimization: Find in already fetched allChecklists
    const defaults = Array.isArray(allChecklists) ? allChecklists.find(c => c.ic_id === questionId) : null;
    
    if (defaults) {
        newRows[index] = {
            ...newRows[index],
            insp_check_id: questionId,
            response_type: defaults.response_type || "-",
            min_range: defaults.min_range || "",
            max_range: defaults.max_range || "",
            expected_value: defaults.expected_value || "",
            trigger_maintenance: !!defaults.trigger_maintenance
        };
        setMappingRows(newRows);
    } else {
        // Fallback to API if not found (unlikely but safe)
        fetchQuestionDefaults(index, questionId);
    }
  };

  const fetchQuestionDefaults = async (index, questionId) => {
    const newRows = [...mappingRows];
    newRows[index] = { ...newRows[index], insp_check_id: questionId, is_loading_defaults: true };
    setMappingRows([...newRows]);

    try {
      const response = await API.get(`/inspection-checklists/${questionId}`);
      const defaults = response.data?.data;
      
      if (response.data?.success && defaults) {
        const updatedRows = [...mappingRows];
        updatedRows[index] = {
          ...updatedRows[index],
          insp_check_id: questionId,
          response_type: defaults.response_type || "-",
          min_range: defaults.min_range || "",
          max_range: defaults.max_range || "",
          expected_value: defaults.expected_value || "",
          trigger_maintenance: !!defaults.trigger_maintenance,
          is_loading_defaults: false
        };
        setMappingRows(updatedRows);
      }
    } catch (error) {
      console.error("Error fetching question defaults:", error);
      const updatedRows = [...mappingRows];
      updatedRows[index].is_loading_defaults = false;
      setMappingRows(updatedRows);
    }
  };

  const handleRowChange = (index, field, value) => {
    const newRows = [...mappingRows];
    newRows[index] = { ...newRows[index], [field]: value };
    setMappingRows(newRows);
  };

  const handleSaveMapping = async () => {
    if (!selectedAssetTypeId) {
      toast.error("Asset Type is mandatory");
      return;
    }

    const validRows = mappingRows.filter(row => row.insp_check_id);
    if (validRows.length === 0) {
      toast.error("Please add at least one question mapping");
      return;
    }

    setSaving(true);
    try {
      await API.post("/asset-type-checklist-mapping", {
        assetTypeId: selectedAssetTypeId,
        assetId: selectedAssetId,
        overrideData: validRows
      });
      toast.success("Mapping saved successfully");
      setShowModal(false);
      fetchMappingSummaries();
    } catch (error) {
      console.error("Error saving mapping:", error);
      toast.error("Failed to save mapping");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <ContentBox 
        onAdd={openAddModal}
        filters={columns}
        onSort={() => {}}
        sortConfig={{ sorts: [] }}
        data={mappingSummaries}
        showActions={true}
        showAddButton={true}
        showHeaderCheckbox={true}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        onDeleteSelected={handleDelete}
        rowKey="rowId"
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={isLoadingMain ? [] : mappingSummaries}
            onEdit={openEditModal}
            rowKey="rowId"
            showActions={showActions}
            showCheckbox={true}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            renderCell={(col, row) => {
              if (col.name === "asset_type_name") {
                return (
                    <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{row.asset_type_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{row.at_id}</span>
                    </div>
                );
              }
              if (col.name === "asset_name") {
                return row.asset_name ? (
                    <div className="flex flex-col">
                        <span className="text-gray-900">{row.asset_name}</span>
                        <span className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">{row.asset_id}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 italic">All Assets of this Type</span>
                  );
              }
              if (col.name === "total_questions") {
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200 shadow-sm">
                      {row.total_questions} Questions
                    </span>
                );
              }
              return row[col.name];
            }}
          />
        )}
      </ContentBox>

      {/* Modal Section */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50 overflow-y-auto pt-10 pb-10">
          <div className="bg-white rounded shadow-lg w-full max-w-6xl max-h-[95vh] flex flex-col mx-4">
            {/* Modal Header */}
            <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
              <span className="text-lg font-semibold tracking-tight">
                {isEditing ? "Edit Mapping" : "Create New Mapping"}
              </span>
              <button
                onClick={() => setShowModal(false)}
                className="text-yellow-400 hover:text-yellow-300 transition-colors"
                aria-label="Close"
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Divider */}
            <div className="h-[3px] bg-[#ffc107]" />

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/20">
              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-gray-400 font-medium">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent shadow-sm"></div>
                  <span className="text-lg tracking-tight">Fetching mapping data...</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-5 rounded border shadow-sm">
                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Asset Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 transition-all text-sm font-medium"
                        value={selectedAssetTypeId}
                        onChange={(e) => handleAssetTypeChange(e.target.value)}
                        disabled={isEditing}
                      >
                        <option value="">-- Select Asset Type --</option>
                        {Array.isArray(assetTypes) && assetTypes.map(at => (
                          <option key={at.asset_type_id} value={at.asset_type_id}>
                            {at.text} ({at.asset_type_id})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium text-gray-700">
                        Specific Asset (Optional)
                      </label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500 transition-all text-sm font-medium"
                        value={selectedAssetId}
                        onChange={(e) => setSelectedAssetId(e.target.value)}
                        disabled={!selectedAssetTypeId || isEditing}
                      >
                        <option value="">-- All Assets of this type --</option>
                        {Array.isArray(assets) && assets.map(a => (
                          <option key={a.asset_id} value={a.asset_id}>
                            {a.text} ({a.asset_id})
                          </option>
                        ))}
                      </select>
                      {!selectedAssetTypeId && (
                        <p className="text-xs text-amber-600 flex items-center gap-1 font-normal">
                          <AlertCircle size={10} /> Select Asset Type first
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mapping Rows Table - only show when asset type is selected */}
                  {selectedAssetTypeId && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b pb-2">
                        <h3 className="text-md font-semibold text-gray-900 flex items-center gap-2">
                          Inspection Checklist Mapping
                          <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[11px] font-semibold border border-blue-100">
                            {mappingRows.length} {mappingRows.length === 1 ? 'Question' : 'Questions'}
                          </span>
                        </h3>
                        <button
                          type="button"
                          onClick= {handleAddRow}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-[#FFC107] text-[#003b6f] rounded hover:bg-[#e0a800] transition shadow-sm font-semibold uppercase tracking-wide"
                        >
                          <Plus size={14} /> Add Row
                        </button>
                      </div>

                      <div className="border border-gray-200 rounded bg-white overflow-hidden shadow-sm">
                        <table className="min-w-full text-left border-collapse">
                          <thead className="bg-[#003b6f] text-white">
                            <tr>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-1/3">Select Question</th>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Min</th>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-24">Max</th>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider w-36">Expected Val</th>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-center w-24">Maint Trigger</th>
                              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-center w-16">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {mappingRows.length === 0 ? (
                              <tr>
                                <td colSpan="6" className="p-16 text-center text-gray-400 italic font-medium bg-gray-50/30">
                                   No questions mapped. Use the "Add Question Row" button above to begin selection.
                                </td>
                              </tr>
                            ) : (
                              mappingRows.map((row, index) => (
                                <tr key={index} className="hover:bg-blue-50/30 group transition-colors">
                                  <td className="p-2.5">
                                    <select
                                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:ring-1 focus:ring-blue-500 outline-none"
                                      value={row.insp_check_id}
                                      onChange={(e) => handleQuestionChange(index, e.target.value)}
                                    >
                                      <option value="">-- Choose Inspection Question --</option>
                                      {Array.isArray(allChecklists) && allChecklists.map(c => (
                                        <option key={c.ic_id} value={c.ic_id}>
                                          {c.inspection_question}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:border-blue-500 outline-none"
                                      value={row.min_range || ""}
                                      onChange={(e) => handleRowChange(index, "min_range", e.target.value)}
                                      disabled={row.response_type === 'QL'}
                                      placeholder="---"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="number"
                                      step="any"
                                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white disabled:bg-gray-50 disabled:text-gray-400 focus:border-blue-500 outline-none"
                                      value={row.max_range || ""}
                                      onChange={(e) => handleRowChange(index, "max_range", e.target.value)}
                                      disabled={row.response_type === 'QL'}
                                      placeholder="---"
                                    />
                                  </td>
                                  <td className="p-2.5">
                                    <input
                                      type="text"
                                      className="w-full px-3 py-2 border border-gray-200 rounded text-sm bg-white focus:border-blue-500 outline-none"
                                      value={row.expected_value || ""}
                                      onChange={(e) => handleRowChange(index, "expected_value", e.target.value)}
                                      placeholder="Expected..."
                                    />
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600 border-gray-300"
                                      checked={!!row.trigger_maintenance}
                                      onChange={(e) => handleRowChange(index, "trigger_maintenance", e.target.checked)}
                                    />
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      onClick={() => handleRemoveRow(index)}
                                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                                      title="Remove Row"
                                    >
                                      <Trash size={16} />
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between rounded-b">
              <div className="flex items-center gap-2 text-gray-500 text-xs font-normal">
                <Info size={14} className="text-blue-500" />
                <span>Configuration changes apply to mapped groups only</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium rounded transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMapping}
                  disabled={saving || modalLoading}
                  className="flex items-center gap-2 px-8 py-2 bg-[#FFC107] hover:bg-[#e0a800] text-[#003b6f] text-sm font-semibold rounded shadow shadow-yellow-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                    <div className="animate-spin h-3.5 w-3.5 border-2 border-[#003b6f]/30 border-t-[#003b6f] rounded-full"></div>
                    Saving Changes...
                    </>
                  ) : (
                    <><Save size={18} /> Update Mapping</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetTypeChecklistMapping;
