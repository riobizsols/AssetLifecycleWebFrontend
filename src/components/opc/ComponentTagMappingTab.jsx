import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import API from "../../lib/axios";
import ContentBox from "../ContentBox";
import CustomTable from "../CustomTable";
import SearchableDropdown from "../ui/SearchableDropdown";
import { filterData } from "../../utils/filterData";
import { applyListFilterChange } from "../../utils/listFilterState";
import { FolderTree } from "lucide-react";
import OpcModal, { Field, inputClass } from "./OpcModal";
import OpcTagBrowser from "./OpcTagBrowser";

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
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState([]);
  const [components, setComponents] = useState([]);
  const [servers, setServers] = useState([]);
  const [browseMeta, setBrowseMeta] = useState({ total_tags: 0, uploaded_at: null });
  const [browseMetaLoading, setBrowseMetaLoading] = useState(false);
  const [showBrowser, setShowBrowser] = useState(false);
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

  const loadBrowseMeta = async (serverId) => {
    if (!serverId) {
      setBrowseMeta({ total_tags: 0, uploaded_at: null });
      return;
    }
    setBrowseMetaLoading(true);
    try {
      const res = await API.get(`/opc/servers/${serverId}/browse`, { params: { limit: 0 } });
      const data = res.data?.data || {};
      setBrowseMeta({ total_tags: data.total_tags || 0, uploaded_at: data.uploaded_at || null });
    } catch (err) {
      toast.error(errorText(err, "Failed to load OPC tags"));
    } finally {
      setBrowseMetaLoading(false);
    }
  };

  const openModal = async (row = null) => {
    setEditing(row);
    setForm(
      row
        ? {
            asset_id: row.asset_id || "",
            comp_id: row.comp_id || "",
            server_id: row.server_id || "",
            tag_full_path: row.tag_full_path || "",
            tag_name: row.tag_name || "",
            data_type: row.data_type || "",
            unit: row.unit || "",
            tag_type: row.tag_type || "",
          }
        : emptyForm,
    );
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
      const serverId = row?.server_id || serverList[0]?.server_id || "";
      setForm((prev) => ({ ...prev, server_id: serverId }));
      loadBrowseMeta(serverId);
    } catch (err) {
      toast.error(errorText(err, "Failed to load form data"));
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setShowBrowser(false);
    setEditing(null);
  };

  const componentOptions = useMemo(
    () =>
      components
        .filter((c) => c.asset_id === form.asset_id)
        .map((c) => ({ id: c.comp_id, text: `${c.comp_id} - ${c.comp_name}` })),
    [components, form.asset_id],
  );

  const setField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleAssetChange = (value) =>
    setForm((prev) => ({ ...prev, asset_id: value || "", comp_id: "" }));

  const handleServerChange = (value) => {
    setForm((prev) => ({ ...prev, server_id: value || "", tag_full_path: "" }));
    loadBrowseMeta(value);
  };

  const handleTagSelect = (tag) => {
    const tagName = lastSegment(tag.item_id);
    const known = existingTags.find((t) => t.tag_name.toLowerCase() === tagName.toLowerCase());
    setForm((prev) => ({
      ...prev,
      tag_full_path: tag.item_id,
      tag_name: tagName,
      data_type: tag.data_type || known?.data_type || prev.data_type,
      unit: known?.unit ?? prev.unit,
      tag_type: known?.tag_type || prev.tag_type,
    }));
    setShowBrowser(false);
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
      if (editing) {
        await API.put(`/opc/comp-tags/${editing.ct_id}`, form);
        toast.success("Mapping updated");
      } else {
        await API.post("/opc/comp-tags", form);
        toast.success("Tag mapped to component");
      }
      closeModal();
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

  const noTagsHint = !browseMetaLoading && form.server_id && !browseMeta.total_tags;
  const serverLabel = servers.find((s) => s.id === form.server_id)?.text || form.server_id;

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
        addButtonTitle="Add Tag Mapping"
        showActions={canEdit}
      >
        {({ visibleColumns }) => {
          const filtered = filterData(rows, filterValues, visibleColumns);
          const colSpan = visibleColumns.filter((c) => c.visible).length + (canEdit ? 1 : 0);
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
              onEdit={canEdit ? openModal : null}
              rowKey="ct_id"
              showActions={canEdit}
            />
          );
        }}
      </ContentBox>

      {showModal && (
        <OpcModal
          title={editing ? `Edit Component Tag Mapping ${editing.ct_id}` : "Add Component Tag Mapping"}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
        >
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
                  : browseMeta.uploaded_at
                    ? `${browseMeta.total_tags.toLocaleString()} tags, list uploaded ${new Date(browseMeta.uploaded_at).toLocaleString()}`
                    : null
              }
            >
              <button
                type="button"
                onClick={() => setShowBrowser(true)}
                disabled={!form.server_id}
                className={`${inputClass} flex items-center justify-between text-left bg-white disabled:cursor-not-allowed`}
                title={form.tag_full_path || undefined}
              >
                <span className={`truncate ${form.tag_full_path ? "text-gray-900" : "text-gray-500"}`}>
                  {form.tag_full_path || "Browse OPC tags..."}
                </span>
                <FolderTree size={16} className="text-gray-500 shrink-0 ml-2" />
              </button>
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

      {showModal && showBrowser && form.server_id && (
        <OpcTagBrowser
          serverId={form.server_id}
          serverName={serverLabel}
          initialItemId={form.tag_full_path}
          onSelect={handleTagSelect}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </>
  );
};

export default ComponentTagMappingTab;
