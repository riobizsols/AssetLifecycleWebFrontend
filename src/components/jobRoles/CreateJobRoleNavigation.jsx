import { showBackendTextToast } from '../../utils/errorTranslation';
import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import API from "../../lib/axios";
import { toast } from "react-hot-toast";
import { FaSave, FaSearch } from "react-icons/fa";
import { useAuthStore } from "../../store/useAuthStore";
import SearchableDropdown from "../ui/SearchableDropdown";
import { useAdminSettings } from "../../contexts/AdminSettingsContext";
import NavigationTreeBuilder, {
  DEFAULT_ACCESS_LEVEL,
  DEFAULT_MOB_DESK,
} from "./NavigationTreeBuilder";

const CreateJobRoleNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { navId } = useParams();
  const editingNav = location.state?.navigation || null;
  const { user } = useAuthStore();

  // Check if we're in admin settings mode - handle case where context might not- be available
  let isAdminSettingsMode = false;
  try {
    const adminSettings = useAdminSettings();
    isAdminSettingsMode = adminSettings?.isAdminSettingsMode || false;
  } catch (error) {
    // Context not available, check URL path instead
    isAdminSettingsMode = location.pathname.startsWith("/adminsettings");
  }

  // Helper function to get the correct back route
  const getBackRoute = () => {
    return isAdminSettingsMode
      ? "/adminsettings/configuration/job-roles"
      : "/master-data/job-roles";
  };

  /** Restore header breadcrumb on Job Roles list after create/edit */
  const getBackState = () => {
    if (isAdminSettingsMode) {
      return {
        activeTab: "navigation",
        adminFrom:
          location.state?.parentAdminFrom ?? location.state?.adminFrom,
      };
    }
    return { activeTab: "navigation" };
  };

  // Check if we're in edit mode or create mode
  const isEditMode = !!(editingNav || navId);
  const isCreateMode = !isEditMode;

  // For edit mode - single entry
  const [formData, setFormData] = useState({
    job_role_nav_id: editingNav?.job_role_nav_id || "",
    job_role_id: editingNav?.job_role_id || "",
    parent_id: editingNav?.parent_id || "",
    app_id: editingNav?.app_id || "",
    label: editingNav?.label || "",
    sequence: editingNav?.sequence || 1,
    access_level: editingNav?.access_level || "D",
    is_group: editingNav?.is_group || false,
    mob_desk: editingNav?.mob_desk || "D",
    org_id: editingNav?.org_id || user?.org_id || "",
    int_status:
      editingNav?.int_status !== undefined ? editingNav.int_status : 1,
  });

  // For create mode - tree-based navigation builder
  const [selectedJobRole, setSelectedJobRole] = useState("");
  const [navigationGroups, setNavigationGroups] = useState([]);
  const [referenceNavigation, setReferenceNavigation] = useState([]);

  const [availableRoles, setAvailableRoles] = useState([]);
  const [availableAppIds, setAvailableAppIds] = useState([]);
  const [availableParentIds, setAvailableParentIds] = useState([]);

  // Searchable dropdown states - for create mode (Job Role selector)
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");
  const roleDropdownRef = useRef(null);

  useEffect(() => {
    fetchAvailableRoles();
    fetchAvailableAppIds();
    fetchAvailableParentIds();
  }, []);

  useEffect(() => {
    // If navId is in URL, fetch the navigation data
    if (navId && !editingNav) {
      fetchNavigationById(navId);
    }
  }, [navId, editingNav]);

  const fetchNavigationById = async (navId) => {
    try {
      const response = await API.get("/job-role-navigation");
      const navigation = response.data.navigation || [];
      const nav = navigation.find((n) => n.job_role_nav_id === navId);

      if (nav) {
        setFormData({
          job_role_nav_id: nav.job_role_nav_id,
          job_role_id: nav.job_role_id,
          parent_id: nav.parent_id || "",
          app_id: nav.app_id,
          label: nav.label || "",
          sequence: nav.sequence || 1,
          access_level: nav.access_level || "D",
          is_group: nav.is_group || false,
          mob_desk:
            nav.mob_desk === "Desktop"
              ? "D"
              : nav.mob_desk === "Mobile"
                ? "M"
                : nav.mob_desk || "D",
          org_id: nav.org_id || user?.org_id || "",
          int_status: nav.int_status !== undefined ? nav.int_status : 1,
        });
      }
    } catch (error) {
      console.error("Error fetching navigation:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_NAVIGATION_DATA_7C1458BE', fallbackText: 'Failed to load navigation data', type: 'error' });
    }
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        roleDropdownRef.current &&
        !roleDropdownRef.current.contains(event.target)
      ) {
        setRoleDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchAvailableRoles = async () => {
    try {
      const response = await API.get("/job-roles");
      setAvailableRoles(response.data.roles || []);
    } catch (error) {
      console.error("Error fetching roles:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_JOB_ROLES_20AF53B2', fallbackText: 'Failed to fetch job roles', type: 'error' });
    }
  };

  const fetchAvailableAppIds = async () => {
    try {
      const response = await API.get("/job-roles/available-app-ids");
      setAvailableAppIds(response.data.appIds || []);
    } catch (error) {
      console.error("Error fetching app IDs:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_FETCH_APP_IDS_66815AAF', fallbackText: 'Failed to fetch app IDs', type: 'error' });
    }
  };

  const fetchAvailableParentIds = async () => {
    try {
      const response = await API.get("/job-role-navigation");
      const navigation = response.data.navigation || [];
      setAvailableParentIds(navigation);
      const jr001Nav = navigation.filter((n) => n.job_role_id === "JR001");
      setReferenceNavigation(jr001Nav.length > 0 ? jr001Nav : navigation);
    } catch (error) {
      console.error("Error fetching parent IDs:", error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ============ CREATE MODE - TREE BUILDER HANDLERS ============

  const buildGroupsFromNavigation = (navigation, jobRoleId) => {
    const roleNav = navigation.filter((n) => n.job_role_id === jobRoleId);
    return roleNav
      .filter((n) => n.is_group && !n.parent_id)
      .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
      .map((g) => ({
        id: g.job_role_nav_id,
        navId: g.job_role_nav_id,
        name: g.label || "",
        sequence: g.sequence,
        items: roleNav
          .filter((n) => n.parent_id === g.job_role_nav_id)
          .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
          .map((i) => ({
            id: i.job_role_nav_id,
            navId: i.job_role_nav_id,
            name: i.label || "",
            appId: i.app_id,
            sequence: i.sequence,
          })),
      }));
  };

  const getNextSequence = (groups) => {
    let max = 0;
    groups.forEach((g) => {
      max = Math.max(max, g.sequence || 0);
      (g.items || []).forEach((i) => {
        max = Math.max(max, i.sequence || 0);
      });
    });
    return max + 1;
  };

  const loadNavigationForRole = async (jobRoleId) => {
    try {
      const response = await API.get("/job-role-navigation");
      setNavigationGroups(
        buildGroupsFromNavigation(response.data.navigation || [], jobRoleId),
      );
    } catch (error) {
      console.error("Error loading navigation:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_LOAD_NAVIGATION_DATA_7C1458BE', fallbackText: 'Failed to load navigation for this role', type: 'error' });
      setNavigationGroups([]);
    }
  };

  const handleJobRoleSelect = (jobRoleId) => {
    setSelectedJobRole(jobRoleId);
    loadNavigationForRole(jobRoleId);
  };

  const createGroupEntry = async (name, currentGroups = navigationGroups) => {
    const response = await API.post("/job-role-navigation", {
      job_role_id: selectedJobRole,
      app_id: null,
      label: name.trim(),
      parent_id: null,
      sequence: getNextSequence(currentGroups),
      access_level: DEFAULT_ACCESS_LEVEL,
      mob_desk: DEFAULT_MOB_DESK,
      is_group: true,
    });
    return response.data.navigation;
  };

  const updateGroupEntry = async (navId, name) => {
    await API.put(`/job-role-navigation/${navId}`, {
      label: name.trim(),
      is_group: true,
    });
  };

  const deleteGroupEntry = async (group) => {
    const ids = [
      ...(group.items || []).map((i) => i.navId).filter(Boolean),
      group.navId,
    ].filter(Boolean);
    if (ids.length > 0) {
      await API.delete("/job-role-navigation", { data: { ids } });
    }
  };

  const createSubMenuEntry = async (groupNavId, name, appId, currentGroups = navigationGroups) => {
    const response = await API.post("/job-role-navigation", {
      job_role_id: selectedJobRole,
      app_id: appId,
      label: name.trim(),
      parent_id: groupNavId,
      sequence: getNextSequence(currentGroups),
      access_level: DEFAULT_ACCESS_LEVEL,
      mob_desk: DEFAULT_MOB_DESK,
      is_group: false,
    });
    return response.data.navigation;
  };

  const updateSubMenuEntry = async (navId, { name, appId }) => {
    await API.put(`/job-role-navigation/${navId}`, {
      label: name.trim(),
      app_id: appId,
      is_group: false,
    });
  };

  const deleteSubMenuEntry = async (navId) => {
    if (navId) {
      await API.delete("/job-role-navigation", { data: { ids: [navId] } });
    }
  };

  // ============ EDIT MODE - SINGLE ENTRY HANDLER ============

  const handleSave = async () => {
    try {
      if (!formData.job_role_id || !formData.app_id) {
        showBackendTextToast({ toast, tmdId: 'TMD_JOB_ROLE_AND_APP_ID_ARE_REQUIRED_3EFBA701', fallbackText: 'Job Role and App ID are required', type: 'error' });
        return;
      }

      const navIdToUpdate = navId || formData.job_role_nav_id;
      if (!navIdToUpdate) {
        showBackendTextToast({ toast, tmdId: 'TMD_NAVIGATION_ID_IS_REQUIRED_FOR_UPDATES_791C17F1', fallbackText: 'Navigation ID is required for updates', type: 'error' });
        return;
      }

      await API.put(`/job-role-navigation/${navIdToUpdate}`, {
        ...formData,
        int_status: formData.int_status ? 1 : 0,
      });
      showBackendTextToast({ toast, tmdId: 'TMD_NAVIGATION_UPDATED_SUCCESSFULLY_3E75DCA8', fallbackText: 'Navigation updated successfully', type: 'success' });
      navigate(getBackRoute(), { state: getBackState() });
    } catch (error) {
      console.error("Error saving navigation:", error);
      showBackendTextToast({ toast, tmdId: 'TMD_FAILED_TO_SAVE_NAVIGATION_2F25C877', fallbackText: 'Failed to save navigation', type: 'error' });
    }
  };

  // Filter function for Job Role dropdown in create mode
  const filteredRoles = availableRoles.filter(
    (role) =>
      role.job_role_id.toLowerCase().includes(roleSearch.toLowerCase()) ||
      role.text.toLowerCase().includes(roleSearch.toLowerCase()),
  );

  // ============ RENDER ============

  // Edit Mode - Single Entry Form
  if (isEditMode) {
    return (
      <div className="p-6 w-full">
        {/* Header */}
        <div className="mb-6 bg-white rounded-lg shadow-sm p-6 w-full">
          <h1 className="text-2xl font-bold text-gray-900">
            Update Role Navigation
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Configure navigation access for job roles
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Navigation ID */}
            {(editingNav || navId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Navigation ID
                </label>
                <input
                  type="text"
                  name="job_role_nav_id"
                  value={formData.job_role_nav_id}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-generated identifier (cannot be changed)
                </p>
              </div>
            )}

            {/* Job Role - Searchable Dropdown */}
            <div ref={roleDropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Role <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <div
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer bg-white flex items-center justify-between"
                >
                  <span
                    className={
                      formData.job_role_id ? "text-gray-900" : "text-gray-400"
                    }
                  >
                    {formData.job_role_id
                      ? `${availableRoles.find((r) => r.job_role_id === formData.job_role_id)?.text || ""} (${formData.job_role_id})`
                      : "Select Job Role"}
                  </span>
                  <FaSearch className="text-gray-400" />
                </div>
                {roleDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                    <div className="p-2 border-b">
                      <input
                        type="text"
                        placeholder="Search job role..."
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {filteredRoles.length > 0 ? (
                        filteredRoles.map((role) => (
                          <div
                            key={role.job_role_id}
                            onClick={() => {
                              setFormData((prev) => ({
                                ...prev,
                                job_role_id: role.job_role_id,
                              }));
                              setRoleDropdownOpen(false);
                              setRoleSearch("");
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                          >
                            <div className="font-medium">{role.text}</div>
                          </div>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-gray-500">
                          No roles found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select the job role for this navigation item
              </p>
            </div>

            {/* App ID - Searchable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App ID <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                options={availableAppIds.map((app) => ({
                  id: app.app_id,
                  text: `${app.app_id} - ${app.label}`,
                }))}
                value={formData.app_id}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, app_id: value }))
                }
                placeholder="Select App ID"
                searchPlaceholder="Search app ID..."
                valueKey="id"
                displayKey="text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select the app ID/screen for navigation
              </p>
            </div>

            {/* Parent Navigation - Searchable Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Navigation (Optional)
              </label>
              <SearchableDropdown
                options={[
                  { id: "", text: "None (Top Level Menu)" },
                  ...availableParentIds.map((parent) => ({
                    id: parent.job_role_nav_id,
                    text: `${parent.label || parent.app_id} (${parent.job_role_nav_id})`,
                  })),
                ]}
                value={formData.parent_id || ""}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, parent_id: value || "" }))
                }
                placeholder="None (Top Level Menu)"
                searchPlaceholder="Search parent navigation..."
                valueKey="id"
                displayKey="text"
              />
              <p className="text-xs text-gray-500 mt-1">
                Select parent menu if this is a submenu item
              </p>
            </div>

            {/* Display Label */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Label
              </label>
              <input
                type="text"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                placeholder="e.g., Dashboard"
              />
              <p className="text-xs text-gray-500 mt-1">
                Custom label to display in menu (optional)
              </p>
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Display Order <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="sequence"
                value={formData.sequence}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              />
              <p className="text-xs text-gray-500 mt-1">
                Order in which this item appears in menu
              </p>
            </div>

            {/* Access Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Level <span className="text-red-500">*</span>
              </label>
              <select
                name="access_level"
                value={formData.access_level}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="D">Display Only (View Access)</option>
                <option value="A">Full Access (Edit/Manage)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                D = View only, A = Full edit access
              </p>
            </div>

            {/* Screen Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screen Type <span className="text-red-500">*</span>
              </label>
              <select
                name="mob_desk"
                value={formData.mob_desk}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
              >
                <option value="D">Desktop Only</option>
                <option value="M">Mobile Only</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Which screen type can access this item
              </p>
            </div>

            {/* Organization ID */}
            {(editingNav || navId) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Organization ID
                </label>
                <input
                  type="text"
                  name="org_id"
                  value={formData.org_id}
                  disabled={true}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Organization identifier (cannot be changed)
                </p>
              </div>
            )}

            {/* Is Group */}
            <div className="md:col-span-2">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="is_group"
                  checked={formData.is_group}
                  onChange={handleInputChange}
                  className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Is Parent Menu Group
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-8">
                Check this if this item is a parent menu that contains submenu
                items
              </p>
            </div>

            {/* Status Toggle */}
            {(editingNav || navId) && (
              <div className="md:col-span-2">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="int_status"
                    checked={formData.int_status === 1}
                    onChange={(e) => {
                      setFormData((prev) => ({
                        ...prev,
                        int_status: e.target.checked ? 1 : 0,
                      }));
                    }}
                    className="mr-3 h-5 w-5 text-[#0E2F4B] focus:ring-[#0E2F4B] border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Active Status
                  </span>
                </label>
                <p className="text-xs text-gray-500 mt-1 ml-8">
                  {formData.int_status === 1
                    ? "Navigation entry is active"
                    : "Navigation entry is inactive"}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
            <button
              onClick={() => navigate(getBackRoute(), { state: getBackState() })}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-[#0E2F4B] text-white rounded-md hover:bg-[#1a3f5f] transition-colors"
            >
              <FaSave /> Update Navigation
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Create Mode - Tree builder
  return (
    <div className="p-6 w-full">
      {/* Job Role Selector */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 w-full">
        <div ref={roleDropdownRef} className="max-w-md">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Job Role <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div
              onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer bg-white flex items-center justify-between"
            >
              <span
                className={selectedJobRole ? "text-gray-900" : "text-gray-400"}
              >
                {selectedJobRole
                  ? `${availableRoles.find((r) => r.job_role_id === selectedJobRole)?.text || ""} (${selectedJobRole})`
                  : "Select Job Role"}
              </span>
              <FaSearch className="text-gray-400" />
            </div>
            {roleDropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b">
                  <input
                    type="text"
                    placeholder="Search job role..."
                    value={roleSearch}
                    onChange={(e) => setRoleSearch(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E2F4B]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <div
                        key={role.job_role_id}
                        onClick={() => {
                          handleJobRoleSelect(role.job_role_id);
                          setRoleDropdownOpen(false);
                          setRoleSearch("");
                        }}
                        className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      >
                        <div className="font-medium">{role.text}</div>
                      </div>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-gray-500">
                      No roles found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Select the job role for all navigation entries
          </p>
        </div>
      </div>

      {/* Navigation Tree Builder */}
      {selectedJobRole && (
        <div className="bg-white rounded-lg shadow-md p-6 w-full">
          <NavigationTreeBuilder
            groups={navigationGroups}
            onGroupsChange={setNavigationGroups}
            availableAppIds={availableAppIds}
            referenceNavigation={referenceNavigation}
            onCreateGroup={createGroupEntry}
            onUpdateGroup={updateGroupEntry}
            onDeleteGroup={deleteGroupEntry}
            onCreateSubMenu={createSubMenuEntry}
            onUpdateSubMenu={updateSubMenuEntry}
            onDeleteSubMenu={deleteSubMenuEntry}
            onDone={() => navigate(getBackRoute(), { state: getBackState() })}
          />
        </div>
      )}
    </div>
  );
};

export default CreateJobRoleNavigation;
