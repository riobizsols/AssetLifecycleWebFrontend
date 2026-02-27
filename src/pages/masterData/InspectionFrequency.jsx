import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Edit2, Trash2, Save, X, Search, 
  Trash, ListFilter, Info, ChevronDown
} from "lucide-react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import ContentBox from "../../components/ContentBox";
import CustomTable from "../../components/CustomTable";
import { useLanguage } from "../../contexts/LanguageContext";

const InspectionFrequency = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  
  const columns = [
    { label: "Asset Type", name: "asset_type_name", visible: true },
    { label: "Asset Name", name: "asset_name", visible: true },
    { label: "Frequency", name: "freq_display", visible: true },
    { label: "Maintained By", name: "maintained_by", visible: true },
    { label: "Description", name: "text", visible: true },
  ];

  const [frequencies, setFrequencies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Form state
  const [mappings, setMappings] = useState([]);
  const [selectedMappingId, setSelectedMappingId] = useState("");
  const [freq, setFreq] = useState("");
  const [uom, setUom] = useState("");
  const [description, setDescription] = useState("");
  const [maintainedBy, setMaintainedBy] = useState("In-House");
  const [isRecurring, setIsRecurring] = useState(true);
  const [uomOptions, setUomOptions] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [techLoading, setTechLoading] = useState(false);

  useEffect(() => {
    fetchFrequencies();
    fetchMappings();
    fetchUOM();
  }, []);

  // Close modal on Esc key
  useEffect(() => {
    if (!showModal) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showModal]);

  const fetchFrequencies = async () => {
    setIsLoading(true);
    try {
      const response = await API.get("/inspection-frequencies");
      const data = response.data?.data || [];
      const dataWithKeys = (Array.isArray(data) ? data : []).map(f => ({
        ...f,
        id: f.aatif_id,
        asset_name: f.asset_name || "All Assets",
        freq_display: f.is_recurring ? `${f.freq || ''} ${f.uom || ''}`.trim() || 'N/A' : "On Demand"
      }));
      setFrequencies(dataWithKeys);
    } catch (error) {
      console.error("Error fetching frequencies:", error);
      toast.error("Failed to load inspection frequencies");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMappings = async () => {
    try {
      const response = await API.get("/asset-type-checklist-mapping/all");
      const data = response.data?.data || [];
      const dataWithKeys = (Array.isArray(data) ? data : []).map(m => ({
          ...m,
          rowId: m.asset_id ? `${m.at_id}_${m.asset_id}` : m.at_id
      }));
      setMappings(dataWithKeys);
    } catch (error) {
      console.error("Error fetching mappings:", error);
    }
  };

  const fetchUOM = async () => {
    try {
      const res = await API.get("/uom");
      const data = res.data?.data || res.data || [];
      setUomOptions((Array.isArray(data) ? data : []).map(u => ({
        id: u.UOM_id || u.uom_id,
        text: u.UOM || u.uom || u.text
      })));
    } catch (error) {
      console.error("Error fetching UOM:", error);
    }
  };

  const openAddModal = () => {
    // Navigate to the full-page create form
    navigate('/master-data/inspection-frequency/create');
  };

  const openEditModal = (freqData) => {
    if (!freqData) return;
    setIsEditing(true);
    setCurrentId(freqData.aatif_id);
    setSelectedMappingId(freqData.aatic_id);
    setFreq(freqData.freq || "");
    setUom(freqData.uom || "");
    setDescription(freqData.text || "");
    // Normalize maintained_by from DB ('inhouse' / 'vendor') to UI values
    const normalizedMaint = (freqData.maintained_by || "").toLowerCase();
    const displayMaint =
      normalizedMaint === "vendor" ? "Vendor" : "In-House";
    setMaintainedBy(displayMaint);
    setIsRecurring(freqData.is_recurring !== false);
    setSelectedTechnician(freqData.emp_int_id || "");
    setTechnicians([]);

    // If In-House, pre-load certified technicians for this asset type
    if (displayMaint === "In-House" && (freqData.asset_type_id || freqData.at_id)) {
      fetchCertifiedTechniciansForAssetType(
        freqData.asset_type_id || freqData.at_id,
        freqData.emp_int_id || ""
      );
    }

    setShowModal(true);
  };

  const fetchCertifiedTechniciansForAssetType = async (assetTypeId, existingEmpId = "") => {
    if (!assetTypeId) {
      setTechnicians([]);
      return;
    }
    try {
      setTechLoading(true);
      const resp = await API.get(`/inspection-approval/technicians/${assetTypeId}`);
      const techs = resp.data?.data || [];
      const mapped = techs.map(t => ({
        emp_int_id: t.emp_int_id || t.employee_id,
        name: t.name || t.full_name || t.employee_id
      }));
      setTechnicians(mapped);
      if (existingEmpId) {
        setSelectedTechnician(existingEmpId);
      }
    } catch (err) {
      console.error("Failed to fetch certified technicians:", err);
      setTechnicians([]);
    } finally {
      setTechLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedMappingId) {
      toast.error("Please select a mapping (Asset Type)");
      return;
    }

    setSaving(true);
    try {
      let aatic_id = selectedMappingId;
      
      if (!isEditing) {
        const mapping = mappings.find(m => m.rowId === selectedMappingId);
        if (mapping) {
          const res = await API.get(`/asset-type-checklist-mapping/${mapping.at_id}${mapping.asset_id ? '?assetId=' + mapping.asset_id : ''}`);
          const detailedItems = res.data?.data || [];
          if (detailedItems.length > 0) {
            aatic_id = detailedItems[0].aatic_id;
          } else {
            toast.error("No checklist items found for this mapping. Please create a checklist mapping first.");
            setSaving(false);
            return;
          }
        }
      }

      const payload = {
        aatic_id: aatic_id,
        freq: isRecurring ? parseInt(freq) : null,
        uom: isRecurring ? uom : null,
        text: description,
        maintained_by: maintainedBy,
        is_recurring: isRecurring,
        emp_int_id: maintainedBy === "In-House" ? (selectedTechnician || null) : null
      };

      if (isEditing) {
        await API.put(`/inspection-frequencies/${currentId}`, payload);
        toast.success("Inspection frequency updated");
      } else {
        await API.post("/inspection-frequencies", payload);
        toast.success("Inspection frequency created");
      }
      setShowModal(false);
      fetchFrequencies();
    } catch (error) {
      console.error("Error saving frequency:", error);
      toast.error("Failed to save frequency");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) return false;
    
    let successCount = 0;
    try {
      for (const id of selectedRows) {
        await API.delete(`/inspection-frequencies/${id}`);
        successCount++;
      }
      if (successCount > 0) {
        toast.success(`Deleted ${successCount} items`);
        fetchFrequencies();
        setSelectedRows([]);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Failed to delete some items");
      return false;
    }
  };

  return (
    <div className="p-4">
      <ContentBox
        onAdd={openAddModal}
        filters={columns}
        data={frequencies}
        showAddButton={true}
        showDeleteButton={true}
        onDeleteSelected={handleDelete}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        rowKey="id"
      >
        {({ visibleColumns, showActions }) => (
          <CustomTable
            visibleColumns={visibleColumns}
            data={isLoading ? [] : frequencies}
            selectedRows={selectedRows}
            setSelectedRows={setSelectedRows}
            onEdit={openEditModal}
            rowKey="id"
            showActions={showActions}
          />
        )}
      </ContentBox>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="bg-[#003b6f] text-white px-6 py-4 flex justify-between items-center border-b-4 border-[#ffc107] flex-shrink-0">
              <h3 className="text-xl font-bold">
                {isEditing ? "Edit Inspection Frequency" : "Add Inspection Frequency"}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-white hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} id="inspectionFrequencyForm" className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-2 gap-6">
                {isEditing ? (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Asset Type
                    </label>
                    <input
                      type="text"
                      value={frequencies.find(f => f.aatif_id === currentId)?.asset_type_name || ""}
                      disabled
                      className="w-full px-3 py-2 border rounded bg-gray-100 text-gray-600 cursor-not-allowed"
                      readOnly
                    />
                  </div>
                ) : (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Asset Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedMappingId}
                      onChange={(e) => setSelectedMappingId(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#003b6f]"
                      required
                    >
                      <option value="">-- Select Mapping --</option>
                      {mappings.map(m => (
                        <option key={m.rowId} value={m.rowId}>
                          {m.asset_type_name} {m.asset_name ? `(${m.asset_name})` : "(All Assets)"}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Frequency Mode <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-col gap-3">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="freqMode"
                        checked={isRecurring}
                        onChange={() => {
                          setIsRecurring(true);
                        }}
                        className="mt-1 w-4 h-4 text-[#003b6f] accent-[#003b6f]"
                      />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-gray-800">Recurring</span>
                        <span className="text-xs text-blue-600">Recurring requires frequency and UOM</span>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="freqMode"
                        checked={!isRecurring}
                        onChange={() => {
                          setIsRecurring(false);
                          setFreq("");
                          setUom("");
                        }}
                        className="w-4 h-4 text-[#003b6f] accent-[#003b6f]"
                      />
                      <span className="text-sm font-semibold text-gray-800">On Demand</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Frequency
                  </label>
                  <input
                    type="number"
                    value={freq}
                    onChange={(e) => setFreq(e.target.value)}
                    placeholder={!isRecurring ? "N/A" : "e.g. 30"}
                    disabled={!isRecurring}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#003b6f] disabled:bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Unit of Measure (UOM)
                  </label>
                  <select
                    value={uom}
                    onChange={(e) => setUom(e.target.value)}
                    disabled={!isRecurring}
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#003b6f] disabled:bg-gray-50"
                  >
                    <option value="">-- Select UOM --</option>
                    {uomOptions.map(opt => (
                      <option key={opt.id} value={opt.text}>{opt.text}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Self / Vendor Managed <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-6">
                    {["In-House", "Vendor"].map((type) => (
                      <label key={type} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="maintainedBy"
                          value={type}
                          checked={maintainedBy === type}
                          onChange={(e) => setMaintainedBy(e.target.value)}
                          className="w-4 h-4 text-[#003b6f] accent-[#003b6f]"
                        />
                        <span className="text-sm font-medium">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {maintainedBy === "In-House" && (
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Technician (In-House)
                    </label>
                    <select
                      value={selectedTechnician}
                      onChange={(e) => setSelectedTechnician(e.target.value)}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#003b6f]"
                    >
                      <option value="">-- Select Technician --</option>
                      {technicians.map((t) => (
                        <option key={t.emp_int_id} value={t.emp_int_id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    {techLoading && (
                      <p className="mt-1 text-xs text-gray-500">Loading technicians...</p>
                    )}
                  </div>
                )}

                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Text
                  </label>
                  <textarea
                    rows="2"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter description..."
                    className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-[#003b6f]"
                  />
                </div>
              </div>
            </form>

            <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t flex-shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2 border rounded hover:bg-gray-100 flex items-center gap-2 transition-colors text-sm font-medium"
              >
                <X size={18} /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                form="inspectionFrequencyForm"
                className="px-6 py-2 bg-[#003b6f] text-white rounded hover:bg-[#002b52] flex items-center gap-2 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Saving..." : <><Save size={18} /> Save Frequency</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InspectionFrequency;

