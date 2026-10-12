import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import ContentBox from "../ContentBox";
import CustomTable from "../CustomTable";
import SearchableDropdown from "../ui/SearchableDropdown";
import { filterData } from "../../utils/filterData";
import { applyListFilterChange } from "../../utils/listFilterState";
import OpcModal, { Field, inputClass } from "./OpcModal";

const columns = [
  { label: "Comp ID", name: "comp_id", visible: true },
  { label: "Asset ID", name: "asset_id", visible: true },
  { label: "Asset", name: "asset_name", visible: true },
  { label: "Component Name", name: "comp_name", visible: true },
  { label: "Created On", name: "created_on_display", visible: true },
];

const emptyForm = { asset_id: "", comp_name: "" };

const errorText = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

const ComponentsTab = ({ canEdit, onChanged }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({ columnFilters: [], fromDate: "", toDate: "" });
  const [assets, setAssets] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleFilterChange = (columnName, value) =>
    setFilterValues((prev) => applyListFilterChange(prev, columnName, value));

  const filters = columns.map((col) => ({
    label: col.label,
    name: col.name,
    options: [],
    onChange: (value) => handleFilterChange(col.name, value),
  }));

  const fetchRows = async () => {
    setLoading(true);
    try {
      const res = await API.get("/opc/components");
      setRows(
        (res.data?.data || []).map((r) => ({
          ...r,
          created_on_display: r.created_on ? new Date(r.created_on).toLocaleDateString() : "",
        })),
      );
    } catch (err) {
      toast.error(errorText(err, "Failed to load components"));
    } finally {
      setLoading(false);
    }
  };

  const fetchAssets = async () => {
    try {
      const res = await API.get("/opc/assets");
      setAssets(
        (res.data?.data || []).map((a) => ({
          id: a.asset_id,
          text: `${a.asset_id} - ${a.asset_name || ""}${a.serial_number ? ` (${a.serial_number})` : ""}`,
        })),
      );
    } catch (err) {
      toast.error(errorText(err, "Failed to load assets"));
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openModal = (row = null) => {
    setEditing(row);
    setForm(row ? { asset_id: row.asset_id, comp_name: row.comp_name } : emptyForm);
    setShowModal(true);
    if (!assets.length) fetchAssets();
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const handleSave = async () => {
    if (!form.asset_id) return toast.error("Select an asset");
    if (!form.comp_name.trim()) return toast.error("Enter a component name");
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/opc/components/${editing.comp_id}`, form);
        toast.success("Component updated");
      } else {
        await API.post("/opc/components", form);
        toast.success("Component created");
      }
      closeModal();
      fetchRows();
      onChanged?.();
    } catch (err) {
      toast.error(errorText(err, "Failed to save component"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedRows.length) return false;
    const ids = [...selectedRows];
    const failed = [];
    for (const id of ids) {
      try {
        await API.delete(`/opc/components/${id}`);
      } catch (err) {
        failed.push(`${id}: ${errorText(err, "failed")}`);
      }
    }
    setSelectedRows([]);
    fetchRows();
    onChanged?.();
    if (failed.length) {
      toast.error(failed.join("\n"));
      return false;
    }
    toast.success(`${ids.length} component(s) deleted`);
    return true;
  };

  return (
    <>
      <ContentBox
        filters={filters}
        onFilterChange={handleFilterChange}
        onDeleteSelected={canEdit ? handleDeleteSelected : null}
        data={rows}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        showAddButton={canEdit}
        onAdd={() => openModal()}
        addButtonTitle="Add Component"
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(rows, filterValues, visibleColumns);
          const colSpan = visibleColumns.filter((c) => c.visible).length + (canEdit ? 1 : 0);
          if (loading || !filtered.length) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16 text-gray-600">
                  {loading ? "Loading..." : "No components found"}
                </td>
              </tr>
            );
          }
          return (
            <CustomTable
              columns={visibleColumns}
              visibleColumns={visibleColumns}
              data={filtered}
              selectedRows={selectedRows}
              setSelectedRows={setSelectedRows}
              onEdit={canEdit ? openModal : null}
              rowKey="comp_id"
              showActions={canEdit}
            />
          );
        }}
      </ContentBox>

      {showModal && (
        <OpcModal
          title={editing ? `Edit Component ${editing.comp_id}` : "Add Component"}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        >
          <Field label="Asset" required>
            <SearchableDropdown
              options={assets}
              value={form.asset_id}
              onChange={(value) => setForm((prev) => ({ ...prev, asset_id: value || "" }))}
              placeholder="Select asset"
              searchPlaceholder="Search asset..."
            />
          </Field>
          <Field label="Component Name" required>
            <input
              type="text"
              value={form.comp_name}
              maxLength={100}
              onChange={(e) => setForm((prev) => ({ ...prev, comp_name: e.target.value }))}
              className={inputClass}
              placeholder="e.g. Spindle, Motor, Belt"
            />
          </Field>
        </OpcModal>
      )}
    </>
  );
};

export default ComponentsTab;
