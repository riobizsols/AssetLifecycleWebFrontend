import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  FaChevronDown,
  FaChevronRight,
  FaTimes,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import SearchableDropdown from "../ui/SearchableDropdown";

const DEFAULT_ACCESS_LEVEL = "D";
const DEFAULT_MOB_DESK = "D";

const createId = () =>
  `nav-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const buildAppHierarchy = (navigation, availableAppIds) => {
  const navById = Object.fromEntries(
    navigation.map((n) => [n.job_role_nav_id || n.id, n]),
  );

  const groupKey = (group) =>
    group.app_id || group.job_role_nav_id || group.id || group.label;

  const groups = navigation
    .filter((n) => n.is_group && !n.parent_id)
    .map((g) => ({
      app_id: groupKey(g),
      label: g.label || g.app_id || "Group",
    }));

  const appToApplication = {};

  navigation.forEach((n) => {
    if (!n.app_id || n.is_group) return;
    if (n.parent_id && navById[n.parent_id]) {
      const parent = navById[n.parent_id];
      appToApplication[n.app_id] = groupKey(parent);
    } else if (!n.parent_id) {
      appToApplication[n.app_id] = n.app_id;
    }
  });

  availableAppIds.forEach((app) => {
    if (!appToApplication[app.app_id]) {
      appToApplication[app.app_id] = "__OTHER__";
    }
  });

  const applicationOptions = [
    ...groups,
    { app_id: "__OTHER__", label: "Other" },
  ];

  return { applicationOptions, appToApplication };
};

const LinkAppModal = ({
  show,
  onClose,
  onAssign,
  availableAppIds,
  applicationOptions,
  appToApplication,
  initialApplication,
  initialAppId,
}) => {
  const [application, setApplication] = useState("");
  const [appId, setAppId] = useState("");

  useEffect(() => {
    if (show) {
      setApplication(initialApplication || "");
      setAppId(initialAppId || "");
    }
  }, [show, initialApplication, initialAppId]);

  const filteredAppIds = useMemo(() => {
    if (!application) return availableAppIds;
    if (application === "__OTHER__") {
      return availableAppIds.filter(
        (app) => appToApplication[app.app_id] === "__OTHER__",
      );
    }
    return availableAppIds.filter(
      (app) => appToApplication[app.app_id] === application,
    );
  }, [application, availableAppIds, appToApplication]);

  useEffect(() => {
    if (appId && !filteredAppIds.some((a) => a.app_id === appId)) {
      setAppId("");
    }
  }, [application, filteredAppIds, appId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white w-[480px] rounded shadow-lg">
        <div className="bg-[#003b6f] text-white font-semibold px-6 py-3 flex justify-between items-center rounded-t">
          <span>Link Application</span>
          <button
            type="button"
            onClick={onClose}
            className="text-yellow-400 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="h-[3px] bg-[#ffc107]" />
        <div className="px-6 py-6 space-y-5 overflow-visible">
          <div className="relative w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application
            </label>
            <SearchableDropdown
              className="w-full"
              options={applicationOptions.map((app) => ({
                id: app.app_id,
                text: app.label,
              }))}
              value={application}
              onChange={setApplication}
              placeholder="Select Application"
              searchPlaceholder="Search applications..."
              valueKey="id"
              displayKey="text"
            />
          </div>
          <div className="relative w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              App ID
            </label>
            <SearchableDropdown
              className="w-full"
              options={filteredAppIds.map((app) => ({
                id: app.app_id,
                text: `${app.app_id} - ${app.label}`,
              }))}
              value={appId}
              onChange={setAppId}
              placeholder="Select App ID"
              searchPlaceholder="Search app IDs..."
              valueKey="id"
              displayKey="text"
              disabled={!application}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 pb-6">
          <button
            type="button"
            className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-sm font-medium py-1.5 px-5 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-[#0E2F4B] hover:bg-[#1a3f5f] text-white text-sm font-medium py-1.5 px-5 rounded disabled:opacity-50"
            disabled={!application || !appId}
            onClick={() => onAssign({ applicationId: application, appId })}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
};

const InlineNameInput = ({
  value,
  onSave,
  onCancel,
  inputRef,
  className = "",
  placeholder = "",
}) => {
  const savedRef = useRef(false);

  const commit = (val) => {
    if (savedRef.current) return;
    savedRef.current = true;
    onSave(val);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={value}
      placeholder={placeholder}
      className={`flex-1 min-w-0 px-2 py-1 border border-[#0E2F4B] rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B] text-sm text-gray-900 bg-white placeholder:text-gray-400 ${className}`}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit(e.target.value);
        } else if (e.key === "Escape") {
          e.preventDefault();
          savedRef.current = true;
          onCancel();
        }
      }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
};

const NavigationTreeBuilder = ({
  groups,
  onGroupsChange,
  availableAppIds,
  referenceNavigation = [],
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onCreateSubMenu,
  onUpdateSubMenu,
  onDeleteSubMenu,
  onDone,
}) => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [editingNode, setEditingNode] = useState(null);
  const [linkAppModal, setLinkAppModal] = useState(false);
  const editInputRef = useRef(null);

  const { applicationOptions, appToApplication } = useMemo(
    () => buildAppHierarchy(referenceNavigation, availableAppIds),
    [referenceNavigation, availableAppIds],
  );

  useEffect(() => {
    if (editingNode && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNode]);

  const updateGroups = useCallback(
    (updater) => {
      onGroupsChange(typeof updater === "function" ? updater(groups) : updater);
    },
    [groups, onGroupsChange],
  );

  const selectNode = (type, groupId, itemId = null) => {
    setSelectedNode({ type, groupId, itemId });
  };

  const isSelected = (type, groupId, itemId = null) =>
    selectedNode?.type === type &&
    selectedNode?.groupId === groupId &&
    selectedNode?.itemId === itemId;

  const toggleExpand = (groupId) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const validateGroupName = (name, excludeGroupId = null) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Group name cannot be empty");
      return false;
    }
    return true;
  };

  const validateItemName = (name, groupId, excludeItemId = null) => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Navigation name cannot be empty");
      return false;
    }
    const group = groups.find((g) => g.id === groupId);
    const duplicate = group?.items.some(
      (item) =>
        item.id !== excludeItemId &&
        item.name.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      toast.error("Duplicate navigation name in this group");
      return false;
    }
    return true;
  };

  const handleAddGroup = () => {
    const newGroupId = createId();
    updateGroups((prev) => [
      ...prev,
      { id: newGroupId, name: "", items: [], isEditing: true },
    ]);
    setExpandedGroups((prev) => new Set([...prev, newGroupId]));
    setEditingNode({ type: "group", groupId: newGroupId, itemId: null });
    selectNode("group", newGroupId);
  };

  const saveGroupName = async (groupId, rawName, isNew = false) => {
    const name = rawName.trim();
    if (!name) {
      updateGroups((prev) => prev.filter((g) => g.id !== groupId));
      setEditingNode(null);
      setSelectedNode(null);
      return;
    }
    if (!validateGroupName(name, groupId)) {
      if (isNew) {
        updateGroups((prev) => prev.filter((g) => g.id !== groupId));
      }
      setEditingNode(null);
      return;
    }

    const group = groups.find((g) => g.id === groupId);
    updateGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, name, isEditing: false } : g,
      ),
    );
    setEditingNode(null);
    selectNode("group", groupId);

    try {
      if (isNew || !group?.navId) {
        const snapshot = groups.map((g) =>
          g.id === groupId ? { ...g, name, isEditing: false } : g,
        );
        const created = await onCreateGroup(name, snapshot);
        const navId = created?.job_role_nav_id;
        updateGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  navId,
                  name,
                  isEditing: false,
                  sequence: created?.sequence ?? g.sequence,
                }
              : g,
          ),
        );
        toast.success("Group created");
      } else {
        await onUpdateGroup(group.navId, name);
        toast.success("Group updated");
      }
    } catch (error) {
      console.error("Error saving group:", error);
      toast.error(error.response?.data?.message || "Failed to save group");
      if (isNew) {
        updateGroups((prev) => prev.filter((g) => g.id !== groupId));
      }
    }
  };

  const handleAddNavigation = () => {
    if (!selectedNode || selectedNode.type !== "group") {
      toast.error("Please select a group first");
      return;
    }
    const groupId = selectedNode.groupId;
    const newItemId = createId();
    updateGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: [...g.items, { id: newItemId, name: "", isEditing: true }],
            }
          : g,
      ),
    );
    setExpandedGroups((prev) => new Set([...prev, groupId]));
    setEditingNode({ type: "item", groupId, itemId: newItemId });
    selectNode("item", groupId, newItemId);
  };

  const saveItemName = async (groupId, itemId, rawName, isNew = false) => {
    const name = rawName.trim();
    if (!name) {
      updateGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
            : g,
        ),
      );
      setEditingNode(null);
      return;
    }
    if (!validateItemName(name, groupId, itemId)) {
      if (isNew) {
        updateGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
              : g,
          ),
        );
      }
      setEditingNode(null);
      return;
    }

    const group = groups.find((g) => g.id === groupId);
    const existingItem = group?.items.find((i) => i.id === itemId);

    updateGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              items: g.items.map((i) =>
                i.id === itemId ? { ...i, name, isEditing: false } : i,
              ),
            }
          : g,
      ),
    );
    setEditingNode(null);
    selectNode("item", groupId, itemId);

    if (existingItem?.navId) {
      try {
        await onUpdateSubMenu(existingItem.navId, {
          name,
          appId: existingItem.appId,
        });
        toast.success("SubMenu updated");
      } catch (error) {
        console.error("Error updating submenu:", error);
        toast.error(error.response?.data?.message || "Failed to update submenu");
      }
      return;
    }

    if (!group?.navId) {
      toast.error("Save the group first before adding submenus");
      return;
    }

    setLinkAppModal(true);
  };

  const handleLinkApp = () => {
    if (!selectedNode || selectedNode.type !== "item") {
      toast.error("Please select a navigation item");
      return;
    }
    setLinkAppModal(true);
  };

  const handleAssignApp = async ({ applicationId, appId }) => {
    const { groupId, itemId } = selectedNode;
    const group = groups.find((g) => g.id === groupId);
    const item = group?.items.find((i) => i.id === itemId);

    if (!group?.navId || !item?.name?.trim()) {
      toast.error("SubMenu name and parent group are required");
      return;
    }

    try {
      if (!item.navId) {
        const snapshot = groups.map((g) =>
          g.id === groupId
            ? {
                ...g,
                items: g.items.map((i) =>
                  i.id === itemId ? { ...i, name, applicationId, appId } : i,
                ),
              }
            : g,
        );
        const created = await onCreateSubMenu(
          group.navId,
          item.name,
          appId,
          snapshot,
        );
        const navId = created?.job_role_nav_id;
        updateGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  items: g.items.map((i) =>
                    i.id === itemId
                      ? {
                          ...i,
                          navId,
                          applicationId,
                          appId,
                          sequence: created?.sequence ?? i.sequence,
                        }
                      : i,
                  ),
                }
              : g,
          ),
        );
        toast.success("SubMenu created");
      } else {
        await onUpdateSubMenu(item.navId, { name: item.name, appId });
        updateGroups((prev) =>
          prev.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  items: g.items.map((i) =>
                    i.id === itemId ? { ...i, applicationId, appId } : i,
                  ),
                }
              : g,
          ),
        );
        toast.success("Application linked");
      }
      setLinkAppModal(false);
    } catch (error) {
      console.error("Error saving submenu:", error);
      toast.error(error.response?.data?.message || "Failed to save submenu");
    }
  };

  const deleteGroup = async (groupId, e) => {
    e.stopPropagation();
    const group = groups.find((g) => g.id === groupId);
    try {
      if (group?.navId) {
        await onDeleteGroup(group);
      }
      updateGroups((prev) => prev.filter((g) => g.id !== groupId));
      if (selectedNode?.groupId === groupId) setSelectedNode(null);
      toast.success("Group removed");
    } catch (error) {
      console.error("Error deleting group:", error);
      toast.error(error.response?.data?.message || "Failed to delete group");
    }
  };

  const deleteItem = async (groupId, itemId, e) => {
    e.stopPropagation();
    const group = groups.find((g) => g.id === groupId);
    const item = group?.items.find((i) => i.id === itemId);
    try {
      if (item?.navId) {
        await onDeleteSubMenu(item.navId);
      }
      updateGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.filter((i) => i.id !== itemId) }
            : g,
        ),
      );
      if (
        selectedNode?.groupId === groupId &&
        selectedNode?.itemId === itemId
      ) {
        setSelectedNode(null);
      }
      toast.success("SubMenu removed");
    } catch (error) {
      console.error("Error deleting submenu:", error);
      toast.error(error.response?.data?.message || "Failed to delete submenu");
    }
  };

  const startRename = (type, groupId, itemId = null) => {
    setEditingNode({ type, groupId, itemId });
  };

  const selectedItem =
    selectedNode?.type === "item"
      ? groups
          .find((g) => g.id === selectedNode.groupId)
          ?.items.find((i) => i.id === selectedNode.itemId)
      : null;

  const isEmpty = groups.length === 0;

  return (
    <>
      <div className="border border-gray-200 rounded-lg min-h-[280px] bg-gray-50 p-4">
        {isEmpty && !editingNode ? (
          <p className="text-sm text-gray-500 text-center py-12">
            No navigation structure yet. Click &quot;Add Child&quot; to start
            building.
          </p>
        ) : (
          <ul className="space-y-1">
            {groups.map((group) => {
              const isGroupSelected = isSelected("group", group.id);
              const isExpanded = expandedGroups.has(group.id);
              const isGroupEditing =
                editingNode?.type === "group" &&
                editingNode.groupId === group.id;

              return (
                <li key={group.id}>
                  <div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group ${
                      isGroupSelected
                        ? "bg-[#0E2F4B] text-white"
                        : "hover:bg-gray-200 text-gray-900"
                    }`}
                    onClick={() => selectNode("group", group.id)}
                    onDoubleClick={() => startRename("group", group.id)}
                  >
                    <button
                      type="button"
                      className={`p-0.5 ${isGroupSelected ? "text-white" : "text-gray-500"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(group.id);
                      }}
                    >
                      {isExpanded ? (
                        <FaChevronDown size={12} />
                      ) : (
                        <FaChevronRight size={12} />
                      )}
                    </button>
                    {isGroupEditing ? (
                      <InlineNameInput
                        inputRef={editInputRef}
                        value={group.name}
                        placeholder="Group name"
                        onSave={(val) =>
                          saveGroupName(group.id, val, group.isEditing)
                        }
                        onCancel={() => {
                          if (group.isEditing && !group.name) {
                            deleteGroup(group.id, { stopPropagation: () => {} });
                          }
                          setEditingNode(null);
                        }}
                        className="bg-white"
                      />
                    ) : (
                      <span
                        className={`flex-1 min-w-0 text-sm font-medium truncate ${
                          isGroupSelected ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {group.name}
                      </span>
                    )}
                    <button
                      type="button"
                      className={`opacity-0 group-hover:opacity-100 p-1 rounded ${
                        isGroupSelected
                          ? "hover:bg-white/20 text-white"
                          : "hover:bg-red-100 text-red-600"
                      }`}
                      onClick={(e) => deleteGroup(group.id, e)}
                      title="Remove group"
                    >
                      <FaTimes size={12} />
                    </button>
                  </div>

                  {isExpanded && (
                    <ul className="ml-8 mt-1 space-y-1">
                      {group.items.map((item) => {
                        const isItemSelected = isSelected(
                          "item",
                          group.id,
                          item.id,
                        );
                        const isItemEditing =
                          editingNode?.type === "item" &&
                          editingNode.groupId === group.id &&
                          editingNode.itemId === item.id;

                        return (
                          <li key={item.id}>
                            <div
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer group ${
                                isItemSelected
                                  ? "bg-green-100 border border-green-400 text-gray-900"
                                  : "hover:bg-gray-200 text-gray-800"
                              }`}
                              onClick={() =>
                                selectNode("item", group.id, item.id)
                              }
                              onDoubleClick={() =>
                                startRename("item", group.id, item.id)
                              }
                            >
                              {isItemEditing ? (
                                <InlineNameInput
                                  inputRef={editInputRef}
                                  value={item.name}
                                  placeholder="SubMenu name"
                                  onSave={(val) =>
                                    saveItemName(
                                      group.id,
                                      item.id,
                                      val,
                                      item.isEditing,
                                    )
                                  }
                                  onCancel={() => {
                                    if (item.isEditing && !item.name) {
                                      deleteItem(group.id, item.id, {
                                        stopPropagation: () => {},
                                      });
                                    }
                                    setEditingNode(null);
                                  }}
                                />
                              ) : (
                                <span className="flex-1 min-w-0 text-sm truncate text-gray-900">
                                  {item.name}
                                  {item.appId && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({item.appId})
                                    </span>
                                  )}
                                </span>
                              )}
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 text-red-600"
                                onClick={(e) =>
                                  deleteItem(group.id, item.id, e)
                                }
                                title="Remove navigation item"
                              >
                                <FaTimes size={12} />
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 mt-4">
        <button
          type="button"
          onClick={handleAddGroup}
          className="px-4 py-2 border border-[#0E2F4B] text-[#0E2F4B] rounded-md hover:bg-[#0E2F4B] hover:text-white transition-colors text-sm font-medium"
        >
          Add Child
        </button>
        <button
          type="button"
          onClick={handleAddNavigation}
          className="px-4 py-2 border border-[#0E2F4B] text-[#0E2F4B] rounded-md hover:bg-[#0E2F4B] hover:text-white transition-colors text-sm font-medium"
        >
          Add Sibling
        </button>
        <button
          type="button"
          onClick={handleLinkApp}
          className="px-4 py-2 border border-[#0E2F4B] text-[#0E2F4B] rounded-md hover:bg-[#0E2F4B] hover:text-white transition-colors text-sm font-medium"
        >
          Link App ID
        </button>
        {onDone && (
          <button
            type="button"
            onClick={onDone}
            className="ml-auto px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Done
          </button>
        )}
      </div>

      <LinkAppModal
        show={linkAppModal}
        onClose={() => setLinkAppModal(false)}
        onAssign={handleAssignApp}
        availableAppIds={availableAppIds}
        applicationOptions={applicationOptions}
        appToApplication={appToApplication}
        initialApplication={selectedItem?.applicationId || ""}
        initialAppId={selectedItem?.appId || ""}
      />
    </>
  );
};

export {
  NavigationTreeBuilder,
  DEFAULT_ACCESS_LEVEL,
  DEFAULT_MOB_DESK,
};

export default NavigationTreeBuilder;
