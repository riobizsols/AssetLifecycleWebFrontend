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
  { label: "CT ID", name: "ct_id", visible: true },
  { label: "Asset", name: "asset_display", visible: true },
  { label: "Component", name: "comp_name", visible: true },
  { label: "Server", name: "server_name", visible: true },
  { label: "OPC Tag Path", name: "tag_full_path", visible: true },
  { label: "Tag Name", name: "tag_name", visible: true },
  { label: "Data Type", name: "data_type", visible: true },
  { label: "Unit", name: "unit", visible: true },
  { label: "Tag Type", name: "tag_type", visible: true },
];

const DEFAULT_DATA_TYPES = ["SHORT", "LONG", "REAL4", "REAL8", "BOOLEAN", "STRING"];
const DEFAULT_TAG_TYPES = ["Counter", "Measurement", "Status"];

const emptyForm = {
  asset_id: "",
  comp_id: "",
  server_id: "",
  tag_full_path: "",
  tag_name: "",
  data_type: "",
  unit: "",
  tag_type: "",
};

const errorText = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

const lastSegment = (path) => String(path || "").split(/[./\\]/).filter(Boolean).pop() || "";

const ComponentTagMappingTab = ({ canEdit, refreshKey }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [filterValues, setFilterValues] = useState({ columnFilters: [], fromDate: "", toDate: "" });

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState([]);
  const [components, setComponents] = useState([]);
  const [servers, setServers] = useState([]);
  const [browsed, setBrowsed] = useState({ tags: [], uploaded_at: null });
  const [browsedLoading, setBrowsedLoading] = useState(false);
  const [existingTags, setExistingTags] = useState([]);
  const [lookups, setLookups] = useState({ data_types: DEFAULT_DATA_TYPES, tag_types: DEFAULT_TAG_TYPES });

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
      const res = await API.get("/opc/comp-tags");
      setRows(
        (res.data?.data || []).map((r) => ({
          ...r,
          asset_display: `${r.asset_id} - ${r.asset_name || ""}`,
        })),
      );
    } catch (err) {
      toast.error(errorText(err, "Failed to load mappings"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRows();
  }, [refreshKey]);

  const loadBrowsedTags = async (serverId) => {
    if (!serverId) {
      setBrowsed({ tags: [], uploaded_at: null });
      return;
    }
    setBrowsedLoading(true);
    try {
      const res = await API.get(`/opc/servers/${serverId}/browsed-tags`);
      setBrowsed(res.data?.data || { tags: [], uploaded_at: null });
    } catch (err) {
      toast.error(errorText(err, "Failed to load OPC tags"));
    } finally {
      setBrowsedLoading(false);
    }
  };

  const openModal = async () => {
    setForm(emptyForm);
    setShowModal(true);
    try {
      const [assetRes, compRes, serverRes, tagRes, lookupRes] = await Promise.all([
        API.get("/opc/components/assets"),
        API.get("/opc/components"),
        API.get("/opc/servers"),
        API.get("/opc/tags"),
        API.get("/opc/lookups"),
      ]);
      setAssets(
        (assetRes.data?.data || []).map((a) => ({
          id: a.asset_id,
          text: `${a.asset_id} - ${a.asset_name || ""} (${a.component_count})`,
        })),
      );
      setComponents(compRes.data?.data || []);
      setExistingTags(tagRes.data?.data || []);
      if (lookupRes.data?.data) setLookups(lookupRes.data.data);

      const serverList = serverRes.data?.data || [];
      setServers(serverList.map((s) => ({ id: s.server_id, text: `${s.server_id} - ${s.server_name}` })));
      const defaultServer = serverList[0]?.server_id || "";
      setForm((prev) => ({ ...prev, server_id: defaultServer }));
      loadBrowsedTags(defaultServer);
    } catch (err) {
      toast.error(errorText(err, "Failed to load form data"));
    }
  };

  const componentOptions = useMemo(
    () =>
      components
        .filter((c) => c.asset_id === form.asset_id)
        .map((c) => ({ id: c.comp_id, text: `${c.comp_id} - ${c.comp_name}` })),
    [components, form.asset_id],
  );

  const tagOptions = useMemo(
    () =>
      (browsed.tags || []).map((t) => ({
        id: t.item_id,
        text: t.mapped ? `${t.item_id} (mapped)` : t.item_id,
        mapped: t.mapped,
        data_type: t.data_type,
      })),
    [browsed.tags],
  );

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleAssetChange = (value) =>
    setForm((prev) => ({ ...prev, asset_id: value || "", comp_id: "" }));

  const handleServerChange = (value) => {
    setForm((prev) => ({ ...prev, server_id: value || "", tag_full_path: "" }));
    loadBrowsedTags(value);
  };

  const handleTagChange = (value) => {
    const option = tagOptions.find((t) => t.id === value);
    if (option?.mapped) {
      toast.error(`${value} is already mapped on this server`);
      return;
    }
    const tagName = lastSegment(value);
    const known = existingTags.find((t) => t.tag_name.toLowerCase() === tagName.toLowerCase());
    setForm((prev) => ({
      ...prev,
      tag_full_path: value || "",
      tag_name: tagName,
      data_type: option?.data_type || known?.data_type || prev.data_type,
      unit: known?.unit ?? prev.unit,
      tag_type: known?.tag_type || prev.tag_type,
    }));
  };

  const handleSave = async () => {
    const missing = [
      ["asset_id", "Asset"],
      ["comp_id", "Component"],
      ["server_id", "Server"],
      ["tag_full_path", "OPC Tag"],
      ["tag_name", "Tag Name"],
      ["data_type", "Data Type"],
      ["tag_type", "Tag Type"],
    ].find(([key]) => !String(form[key] || "").trim());
    if (missing) return toast.error(`${missing[1]} is required`);

    setSaving(true);
    try {
      await API.post("/opc/comp-tags", form);
      toast.success("Tag mapped to component");
      setShowModal(false);
      fetchRows();
    } catch (err) {
      toast.error(errorText(err, "Failed to save mapping"));
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
        await API.delete(`/opc/comp-tags/${id}`);
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
    toast.success(`${ids.length} mapping(s) deleted`);
    return true;
  };

  const noTagsHint = !browsedLoading && form.server_id && !tagOptions.length;

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
        onAdd={openModal}
        addButtonTitle="Add Tag Mapping"
        showActions={false}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(rows, filterValues, visibleColumns);
          const colSpan = visibleColumns.filter((c) => c.visible).length;
          if (loading || !filtered.length) {
            return (
              <tr>
                <td colSpan={colSpan} className="text-center py-16 text-gray-600">
                  {loading ? "Loading..." : "No tag mappings found"}
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
              rowKey="ct_id"
              showActions={false}
            />
          );
        }}
      </ContentBox>

      {showModal && (
        <OpcModal title="Add Component Tag Mapping" onClose={() => setShowModal(false)} onSave={handleSave} saving={saving}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Asset" required hint={!assets.length ? "Add components in the Components tab first" : null}>
              <SearchableDropdown
                options={assets}
                value={form.asset_id}
                onChange={handleAssetChange}
                placeholder="Select asset"
                searchPlaceholder="Search asset..."
              />
            </Field>
            <Field label="Component" required>
              <SearchableDropdown
                options={componentOptions}
                value={form.comp_id}
                onChange={(value) => setField("comp_id", value || "")}
                placeholder={form.asset_id ? "Select component" : "Select an asset first"}
                searchPlaceholder="Search component..."
                disabled={!form.asset_id}
              />
            </Field>
            <Field label="Server" required>
              <SearchableDropdown
                options={servers}
                value={form.server_id}
                onChange={handleServerChange}
                placeholder="Select server"
                searchPlaceholder="Search server..."
              />
            </Field>
            <Field
              label="OPC Tag"
              required
              hint={
                noTagsHint
                  ? "No tags uploaded yet - start the collector"
                  : browsed.uploaded_at
                    ? `Tag list uploaded ${new Date(browsed.uploaded_at).toLocaleString()}`
                    : null
              }
            >
              <SearchableDropdown
                options={tagOptions}
                value={form.tag_full_path}
                onChange={handleTagChange}
                placeholder={browsedLoading ? "Loading tags..." : "Select OPC tag"}
                searchPlaceholder="Search tag..."
                disabled={!form.server_id || browsedLoading}
              />
            </Field>
            <Field label="Tag Name" required>
              <input
                type="text"
                value={form.tag_name}
                maxLength={100}
                onChange={(e) => setField("tag_name", e.target.value)}
                className={inputClass}
                placeholder="e.g. SPINDLE_TEMP"
              />
            </Field>
            <Field label="Data Type" required>
              <select
                value={form.data_type}
                onChange={(e) => setField("data_type", e.target.value)}
                className={inputClass}
              >
                <option value="">Select data type</option>
                {lookups.data_types.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>
            <Field label="Unit">
              <input
                type="text"
                value={form.unit}
                maxLength={20}
                onChange={(e) => setField("unit", e.target.value)}
                className={inputClass}
                placeholder="e.g. hours, °C, mm/s"
              />
            </Field>
            <Field label="Tag Type" required>
              <select
                value={form.tag_type}
                onChange={(e) => setField("tag_type", e.target.value)}
                className={inputClass}
              >
                <option value="">Select tag type</option>
                {lookups.tag_types.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>
          </div>
        </OpcModal>
      )}
    </>
  );
};

export default ComponentTagMappingTab;
