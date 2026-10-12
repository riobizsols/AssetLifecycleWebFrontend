import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Search, Server, Tag } from "lucide-react";
import { FaTimes } from "react-icons/fa";
import API from "../../lib/axios";

const PAGE_SIZE = 200;

const errorText = (err, fallback) => err.response?.data?.error || err.response?.data?.message || fallback;

/**
 * Explorer-style picker for OPC tags: folders load one level at a time, the right pane
 * lists the tags in the selected folder, and search scans the whole server.
 */
const OpcTagBrowser = ({ serverId, serverName, initialItemId, onSelect, onClose }) => {
  const [levels, setLevels] = useState({});
  const [expanded, setExpanded] = useState(() => new Set([""]));
  const [currentPath, setCurrentPath] = useState("");
  const [selected, setSelected] = useState(null);
  const [meta, setMeta] = useState({ uploaded_at: null, total_tags: 0 });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(null);
  const [searching, setSearching] = useState(false);

  const loadLevel = useCallback(
    async (path, offset = 0) => {
      setLevels((prev) => ({ ...prev, [path]: { ...(prev[path] || {}), loading: true } }));
      try {
        const res = await API.get(`/opc/servers/${serverId}/browse`, {
          params: { path, offset, limit: PAGE_SIZE },
        });
        const data = res.data?.data;
        setMeta({ uploaded_at: data.uploaded_at, total_tags: data.total_tags });
        setLevels((prev) => {
          const old = prev[path];
          const items = offset > 0 && old?.leaves ? [...old.leaves.items, ...data.leaves.items] : data.leaves.items;
          return { ...prev, [path]: { folders: data.folders, leaves: { ...data.leaves, items }, loading: false } };
        });
      } catch (err) {
        setLevels((prev) => ({ ...prev, [path]: { ...(prev[path] || {}), loading: false } }));
        toast.error(errorText(err, "Failed to load OPC folder"));
      }
    },
    [serverId],
  );

  useEffect(() => {
    loadLevel("");
  }, [loadLevel]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSearch(null);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await API.get(`/opc/servers/${serverId}/browse/search`, { params: { q } });
        setSearch(res.data?.data || { total: 0, items: [] });
      } catch (err) {
        toast.error(errorText(err, "Search failed"));
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, serverId]);

  const toggleFolder = (path) => {
    const opening = !expanded.has(path);
    if (opening && !levels[path]) loadLevel(path);
    setExpanded((prev) => {
      const next = new Set(prev);
      if (opening) next.add(path);
      else next.delete(path);
      return next;
    });
  };

  const openFolder = (path) => {
    setCurrentPath(path);
    setQuery("");
    if (!levels[path]) loadLevel(path);
    setExpanded((prev) => new Set(prev).add(path));
  };

  const confirm = (tag = selected) => {
    if (!tag) return;
    if (tag.mapped && tag.item_id !== initialItemId) {
      toast.error(`${tag.item_id} is already mapped on this server`);
      return;
    }
    onSelect(tag);
  };

  const renderFolder = (folder, depth) => {
    const isOpen = expanded.has(folder.path);
    const level = levels[folder.path];
    const isCurrent = currentPath === folder.path && !search;
    return (
      <div key={folder.path}>
        <div
          className={`flex items-center gap-1 py-1 pr-2 rounded cursor-pointer select-none ${
            isCurrent ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"
          }`}
          style={{ paddingLeft: depth * 16 + 4 }}
          onClick={() => openFolder(folder.path)}
        >
          <button
            type="button"
            className="p-0.5 text-gray-500 hover:text-gray-800"
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(folder.path);
            }}
          >
            {folder.folder_count > 0 ? (
              isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />
            ) : (
              <span className="inline-block w-[14px]" />
            )}
          </button>
          {isOpen ? (
            <FolderOpen size={16} className="text-amber-500 shrink-0" />
          ) : (
            <Folder size={16} className="text-amber-500 shrink-0" />
          )}
          <span className="text-sm truncate">{folder.name}</span>
          <span className="ml-auto text-xs text-gray-400 pl-2">{folder.tag_count.toLocaleString()}</span>
        </div>
        {isOpen && level?.loading && !level.folders && (
          <div className="text-xs text-gray-400 py-1" style={{ paddingLeft: (depth + 1) * 16 + 24 }}>
            Loading...
          </div>
        )}
        {isOpen && level?.folders?.map((child) => renderFolder(child, depth + 1))}
      </div>
    );
  };

  const root = levels[""];
  const current = levels[currentPath];
  const rows = search ? search.items : current?.leaves?.items || [];
  const totalRows = search ? search.total : current?.leaves?.total || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
        <div className="bg-[#0E2F4B] text-white px-6 py-4 flex justify-between items-center rounded-t-lg shrink-0">
          <div>
            <h2 className="text-xl font-bold">Select OPC Tag</h2>
            <p className="text-xs text-gray-300 mt-0.5">
              {meta.total_tags.toLocaleString()} tags
              {meta.uploaded_at ? ` · list uploaded ${new Date(meta.uploaded_at).toLocaleString()}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-white hover:text-gray-200">
            <FaTimes size={22} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all tags by item ID (min 2 characters)..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          <div className="w-1/3 border-r border-gray-200 overflow-auto p-2">
            <div
              className={`flex items-center gap-2 py-1 px-1 rounded cursor-pointer ${
                currentPath === "" && !search ? "bg-blue-100 text-blue-900" : "hover:bg-gray-100"
              }`}
              onClick={() => openFolder("")}
            >
              <Server size={16} className="text-[#0E2F4B] shrink-0" />
              <span className="text-sm font-medium truncate">{serverName || serverId}</span>
            </div>
            {root?.loading && !root.folders && <div className="text-xs text-gray-400 py-2 pl-6">Loading...</div>}
            {root?.folders?.map((f) => renderFolder(f, 1))}
            {root && !root.loading && !meta.total_tags && (
              <p className="text-xs text-gray-500 p-3">No tags uploaded yet - start the collector.</p>
            )}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100 shrink-0 truncate">
              {search
                ? `${search.total.toLocaleString()} match(es) for "${query.trim()}"${search.total > search.items.length ? ` - showing first ${search.items.length}` : ""}`
                : `${serverName || serverId}${currentPath ? ` / ${currentPath}` : ""} - ${totalRows.toLocaleString()} tag(s)`}
            </div>
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr className="text-left text-gray-600">
                    <th className="px-4 py-2 font-medium">Name</th>
                    <th className="px-4 py-2 font-medium">Item ID</th>
                    <th className="px-4 py-2 font-medium">Data Type</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((t) => {
                    const isSelected = selected?.item_id === t.item_id;
                    const blocked = t.mapped && t.item_id !== initialItemId;
                    return (
                      <tr
                        key={t.item_id}
                        className={`border-t border-gray-100 cursor-pointer ${
                          isSelected ? "bg-blue-100" : blocked ? "text-gray-400" : "hover:bg-gray-50"
                        }`}
                        onClick={() => setSelected(t)}
                        onDoubleClick={() => confirm(t)}
                      >
                        <td className="px-4 py-1.5">
                          <span className="flex items-center gap-2">
                            <Tag size={14} className="text-blue-500 shrink-0" />
                            {t.name}
                          </span>
                        </td>
                        <td className="px-4 py-1.5 text-gray-600 break-all">{t.item_id}</td>
                        <td className="px-4 py-1.5">{t.data_type || "-"}</td>
                        <td className="px-4 py-1.5">{t.mapped ? "Mapped" : ""}</td>
                      </tr>
                    );
                  })}
                  {!rows.length && (
                    <tr>
                      <td colSpan={4} className="text-center text-gray-500 py-12">
                        {searching || current?.loading
                          ? "Loading..."
                          : search
                            ? "No tags match"
                            : "No tags in this folder - pick a subfolder on the left"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {!search && current?.leaves && current.leaves.items.length < current.leaves.total && (
                <div className="p-3 text-center">
                  <button
                    type="button"
                    disabled={current.loading}
                    onClick={() => loadLevel(currentPath, current.leaves.items.length)}
                    className="px-4 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    {current.loading
                      ? "Loading..."
                      : `Load more (${(current.leaves.total - current.leaves.items.length).toLocaleString()} remaining)`}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-3 flex items-center gap-3 rounded-b-lg shrink-0">
          <div className="text-sm text-gray-700 truncate flex-1">
            {selected ? (
              <>
                Selected: <span className="font-medium">{selected.item_id}</span>
                {selected.data_type ? ` (${selected.data_type})` : ""}
              </>
            ) : (
              <span className="text-gray-400">Select a tag (double-click to choose)</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selected}
            onClick={() => confirm()}
            className="px-4 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Select
          </button>
        </div>
      </div>
    </div>
  );
};

export default OpcTagBrowser;
