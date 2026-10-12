import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import ContentBox from "../ContentBox";
import CustomTable from "../CustomTable";
import SearchableDropdown from "../ui/SearchableDropdown";
import { filterData } from "../../utils/filterData";
import { applyListFilterChange } from "../../utils/listFilterState";
import OpcModal, { Field, inputClass } from "./OpcModal";

const columns = [
  { label: "Rule ID", name: "cbm_id", visible: true },
  { label: "Asset", name: "asset_display", visible: true },
  { label: "Component", name: "comp_name", visible: true },
  { label: "Tag", name: "tag_full_path", visible: true },
  { label: "Data Type", name: "data_type", visible: true },
  { label: "Condition", name: "condition", visible: true },
  { label: "Action", name: "action_display", visible: true },
  { label: "Last Value", name: "last_value_display", visible: true },
  { label: "Last Triggered", name: "last_triggered_display", visible: true },
];

const NUMERIC_TYPES = ["SHORT", "LONG", "REAL4", "REAL8"];

const DEFAULT_OPERATORS = {
  NUMERIC: [
    { value: ">", label: "Greater than", values: 1 },
    { value: ">=", label: "Greater than or equal", values: 1 },
    { value: "<", label: "Less than", values: 1 },
    { value: "<=", label: "Less than or equal", values: 1 },
    { value: "=", label: "Equal to", values: 1 },
    { value: "!=", label: "Not equal to", values: 1 },
    { value: "BETWEEN", label: "Between", values: 2 },
    { value: "OUTSIDE", label: "Outside range", values: 2 },
  ],
  BOOLEAN: [
    { value: "IS_TRUE", label: "Is true", values: 0 },
    { value: "IS_FALSE", label: "Is false", values: 0 },
  ],
  STRING: [
    { value: "EQUALS", label: "Equals", values: 1 },
    { value: "NOT_EQUALS", label: "Not equals", values: 1 },
    { value: "CONTAINS", label: "Contains", values: 1 },
  ],
};

const DEFAULT_ACTIONS = [
  { value: "MAINT", label: "CBM Maintenance" },
  { value: "INSP", label: "Inspection" },
];

const operatorFamily = (dataType) => {
  const dt = String(dataType || "").toUpperCase();
  if (NUMERIC_TYPES.includes(dt)) return "NUMERIC";
  if (dt === "BOOLEAN") return "BOOLEAN";
  return "STRING";
};

const emptyForm = { ct_id: "", operator: "", value1: "", value2: "", action_type: "MAINT" };

const errorText = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

const CbmRulesTab = ({ canEdit }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({ columnFilters: [], fromDate: "", toDate: "" });

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [compTags, setCompTags] = useState([]);
  const [operators, setOperators] = useState(DEFAULT_OPERATORS);
  const [actions, setActions] = useState(DEFAULT_ACTIONS);

  const actionLabel = (value) => actions.find((a) => a.value === value)?.label || value;

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
      const res = await API.get("/opc/cbm");
      setRows(
        (res.data?.data || []).map((r) => ({
          ...r,
          asset_display: `${r.asset_id} - ${r.asset_name || ""}`,
          action_display: actionLabel(r.action_type),
          last_value_display:
            r.last_value == null ? "" : `${r.last_value}${r.unit ? ` ${r.unit}` : ""}${r.is_met ? " (met)" : ""}`,
          last_triggered_display: r.last_triggered_on
            ? `${new Date(r.last_triggered_on).toLocaleString()}${r.last_trigger_ref ? ` - ${r.last_trigger_ref}` : ""}`
            : "",
        })),
      );
    } catch (err) {
      toast.error(errorText(err, "Failed to load rules"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const openModal = async (row = null) => {
    setEditing(row);
    setForm(
      row
        ? {
            ct_id: row.ct_id,
            operator: row.operator || "",
            value1: row.value1 ?? "",
            value2: row.value2 ?? "",
            action_type: row.action_type || "MAINT",
          }
        : emptyForm,
    );
    setShowModal(true);
    try {
      const [tagRes, lookupRes] = await Promise.all([API.get("/opc/comp-tags"), API.get("/opc/lookups")]);
      setCompTags(tagRes.data?.data || []);
      if (lookupRes.data?.data?.operators) setOperators(lookupRes.data.data.operators);
      if (lookupRes.data?.data?.action_types) setActions(lookupRes.data.data.action_types);
    } catch (err) {
      toast.error(errorText(err, "Failed to load form data"));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
  };

  const tagOptions = useMemo(
    () =>
      compTags.map((t) => ({
        id: t.ct_id,
        text: `${t.asset_id} - ${t.asset_name || ""} / ${t.comp_name} / ${t.tag_full_path} (${t.data_type || "?"}${t.unit ? `, ${t.unit}` : ""})`,
      })),
    [compTags],
  );

  const selectedTag = compTags.find((t) => t.ct_id === form.ct_id);
  const family = operatorFamily(selectedTag?.data_type);
  const operatorOptions = selectedTag ? operators[family] || [] : [];
  const selectedOperator = operatorOptions.find((o) => o.value === form.operator);
  const valueCount = selectedOperator?.values ?? 0;
  const valueInputType = family === "NUMERIC" ? "number" : "text";

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleTagChange = (value) => {
    const next = compTags.find((t) => t.ct_id === value);
    setForm((prev) => {
      const keepOperator = next && operatorFamily(next.data_type) === family;
      return {
        ...prev,
        ct_id: value || "",
        operator: keepOperator ? prev.operator : "",
        value1: keepOperator ? prev.value1 : "",
        value2: keepOperator ? prev.value2 : "",
      };
    });
  };

  const handleSave = async () => {
    if (!form.ct_id) return toast.error("Mapped tag is required");
    if (!form.operator) return toast.error("Condition is required");
    if (valueCount >= 1 && String(form.value1).trim() === "") return toast.error("Value is required");
    if (valueCount === 2 && String(form.value2).trim() === "") return toast.error("Second value is required");
    if (!form.action_type) return toast.error("Action is required");

    const payload = {
      ct_id: form.ct_id,
      operator: form.operator,
      value1: valueCount >= 1 ? form.value1 : null,
      value2: valueCount === 2 ? form.value2 : null,
      action_type: form.action_type,
    };

    setSaving(true);
    try {
      if (editing) {
        await API.put(`/opc/cbm/${editing.cbm_id}`, payload);
        toast.success("Rule updated");
      } else {
        await API.post("/opc/cbm", payload);
        toast.success("Rule created");
      }
      closeModal();
      fetchRows();
    } catch (err) {
      toast.error(errorText(err, "Failed to save rule"));
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
        await API.delete(`/opc/cbm/${id}`);
      } catch (err) {
        failed.push(`${id}: ${errorText(err, "failed")}`);
      }
    }
    setSelectedRows([]);
    fetchRows();
    if (failed.length) {
      toast.error(failed.join("\n"));
      return false;
    }
    toast.success(`${ids.length} rule(s) deleted`);
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
        addButtonTitle="Add Condition Rule"
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(rows, filterValues, visibleColumns);
          const colSpan = visibleColumns.filter((c) => c.visible).length + (canEdit ? 1 : 0);
          if (loading || !filtered.length) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16 text-gray-600">
                  {loading ? "Loading..." : "No condition rules found"}
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
              rowKey="cbm_id"
              showActions={canEdit}
            />
          );
        }}
      </ContentBox>

      {showModal && (
        <OpcModal
          title={editing ? `Edit Condition Rule ${editing.cbm_id}` : "Add Condition Rule"}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        >
          <Field
            label="Mapped Tag"
            required
            hint={!tagOptions.length ? "Map tags to components in Master Data > Components first" : null}
          >
            <SearchableDropdown
              options={tagOptions}
              value={form.ct_id}
              onChange={handleTagChange}
              placeholder="Select asset / component / tag"
              searchPlaceholder="Search tag..."
            />
          </Field>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field
              label="Condition"
              required
              hint={selectedTag ? `Operators for ${selectedTag.data_type || "STRING"} tags` : null}
            >
              <select
                value={form.operator}
                onChange={(e) => setField("operator", e.target.value)}
                className={inputClass}
                disabled={!selectedTag}
              >
                <option value="">{selectedTag ? "Select condition" : "Select a tag first"}</option>
                {operatorOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </Field>
            {valueCount >= 1 && (
              <Field label={valueCount === 2 ? "From" : "Value"} required>
                <input
                  type={valueInputType}
                  value={form.value1}
                  onChange={(e) => setField("value1", e.target.value)}
                  className={inputClass}
                  placeholder={selectedTag?.unit || ""}
                />
              </Field>
            )}
            {valueCount === 2 && (
              <Field label="To" required>
                <input
                  type={valueInputType}
                  value={form.value2}
                  onChange={(e) => setField("value2", e.target.value)}
                  className={inputClass}
                  placeholder={selectedTag?.unit || ""}
                />
              </Field>
            )}
          </div>

          <Field
            label="When triggered"
            required
            hint={
              form.action_type === "INSP"
                ? "The asset type needs an inspection checklist and frequency for the inspection to be created."
                : "Creates a CBM Maintenance work order for the asset. Skipped while one is already open."
            }
          >
            <div className="flex flex-wrap gap-6 pt-1">
              {actions.map((a) => (
                <label key={a.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="action_type"
                    value={a.value}
                    checked={form.action_type === a.value}
                    onChange={() => setField("action_type", a.value)}
                  />
                  {a.value === "MAINT" ? "Run CBM Maintenance" : "Run Inspection"}
                </label>
              ))}
            </div>
          </Field>
        </OpcModal>
      )}
    </>
  );
};

export default CbmRulesTab;
